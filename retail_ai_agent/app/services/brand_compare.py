from __future__ import annotations

import re
from collections import Counter
from typing import Any, Dict, List, Set, Tuple
from urllib.parse import parse_qsl, quote_plus, urlencode, urljoin, urlparse, urlunparse
from collections import defaultdict

import httpx
from bs4 import BeautifulSoup
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

from app.models import (
    AmazonTopBrandsResponse,
    AmazonTopSellersResponse,
    BrandDiffResponse,
    BrandSetInput,
    BrandSourceType,
    Marketplace,
)
from app.services.store import store


_NOISE_BRAND_TOKENS = {
    "go",
    "skip",
    "shop",
    "learn",
    "more",
    "see",
    "visit",
    "buy",
    "now",
    "best",
    "sale",
    "deal",
    "deals",
    "new",
    "free",
    "prime",
    "amazon",
    "walmart",
}


def _normalize_brand(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9&\-\s]", "", value).strip()
    if not cleaned:
        return ""
    words = cleaned.split()
    stop_words = {"by", "for", "with", "the", "and", "new", "pack", "set"}
    first = words[0]
    if first.lower() in stop_words and len(words) > 1:
        first = words[1]

    first_lower = first.lower()
    if first_lower in _NOISE_BRAND_TOKENS:
        return ""
    if first_lower.startswith("truncated"):
        return ""
    if re.fullmatch(r"\d+", first_lower):
        return ""
    if len(first_lower) <= 1:
        return ""

    if first_lower == "hp":
        return "HP"
    if first_lower == "lg":
        return "LG"
    if first_lower == "3m":
        return "3M"

    return first.title()


def _extract_brand_candidates_from_html(html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    title_nodes = soup.select("div[data-component-type='s-search-result'] h2 a span")
    if not title_nodes:
        title_nodes = soup.select("h2 a span")

    brands: List[str] = []
    for title_node in title_nodes:
        title = title_node.text.strip() if title_node.text else ""
        if not title:
            continue
        brand = _normalize_brand(title)
        if brand and len(brand) > 1:
            brands.append(brand)
    return brands


def _extract_best_sellers_brands_from_html(html: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    selectors = [
        "#zg-ordered-list li span div a div",
        "#zg-ordered-list li a.a-link-normal div",
        "#zg-ordered-list li h2",
        "#zg-ordered-list li h3",
        "#zg-ordered-list li a span",
        "ol#zg-ordered-list li a span",
    ]
    candidates: List[str] = []
    for selector in selectors:
        for node in soup.select(selector):
            text = (node.get_text() or "").strip()
            if text:
                candidates.append(text)

    brands: List[str] = []
    for text in candidates:
        brand = _normalize_brand(text)
        if brand:
            brands.append(brand)
    return brands


def _build_paginated_storefront_url(store_url: str, page_num: int) -> str:
    if page_num <= 1:
        return store_url
    parsed = urlparse(store_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["page"] = str(page_num)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _is_storefront_error_page(page_title: str, html_lower: str) -> bool:
    return "sorry! something went wrong" in page_title or "sorry! something went wrong" in html_lower


def _extract_product_rating_and_reviews(node) -> Tuple[float, int]:
    rating = 0.0
    reviews = 0
    try:
        # Amazon storefront cards commonly place the rating text on the star link
        # or the nested .a-icon-alt span rather than on a plain span[aria-label].
        rating_elem = node.select_one("a[aria-label*='out of 5 stars']")
        if not rating_elem:
            rating_elem = node.select_one(".a-icon-alt")
        if not rating_elem:
            rating_elem = node.select_one("span[aria-label*='out of']")
        if rating_elem:
            label = rating_elem.get("aria-label", "") or (rating_elem.get_text() or "").strip()
            match = re.search(r"(\d+(?:\.\d+)?)\s*out\s*of\s*5", label, re.IGNORECASE)
            if match:
                try:
                    rating = float(match.group(1))
                except (ValueError, IndexError):
                    rating = 0.0

        # Review count is exposed on a separate ratings-count link, not the star link.
        review_elem = None
        for link in node.select("a[aria-label]"):
            aria = (link.get("aria-label") or "").strip().lower()
            if aria.endswith(" rating") or aria.endswith(" ratings"):
                review_elem = link
                break

        if review_elem:
            text = (review_elem.get("aria-label", "") or review_elem.get_text() or "").strip()
            try:
                normalized = text.replace(",", "")
                match = re.search(r"(\d+(?:\.\d+)?)\s*K", normalized, re.IGNORECASE)
                if match:
                    reviews = int(float(match.group(1)) * 1000)
                else:
                    match = re.search(r"(\d+)", normalized)
                    if match:
                        reviews = int(match.group(1))
            except (ValueError, AttributeError):
                reviews = 0
    except Exception:
        pass
    return rating, reviews


async def scrape_seller_top_brands(
    store_url: str,
    *,
    max_brands: int,
    max_pages: int,
) -> Tuple[List[Dict[str, Any]], int, int, str | None, List[Dict[str, Any]]]:
    brand_metrics: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "ratings": [], "reviews": 0, "prices": [], "bought": [], "top_demand_product": None, "max_bought": 0}
    )
    brand_audit_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    seen_product_keys: Set[str] = set()
    total_products = 0
    warning = None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await context.new_page()
            next_page_url = store_url

            for page_num in range(1, max_pages + 1):
                if page_num == 1:
                    page_url = store_url
                elif next_page_url:
                    page_url = next_page_url
                else:
                    page_url = _build_paginated_storefront_url(store_url, page_num)

                await page.goto(page_url, wait_until="domcontentloaded", timeout=35000)
                await page.wait_for_timeout(2500)

                html = await page.content()
                html_lower = html.lower()
                page_title = (await page.title()).lower()

                if "captcha" in html_lower or "robot check" in html_lower or "automated access" in html_lower:
                    warning = "Bot protection detected. Brand metrics may be incomplete."
                    break

                if _is_storefront_error_page(page_title, html_lower):
                    await page.reload(wait_until="domcontentloaded", timeout=35000)
                    await page.wait_for_timeout(2500)
                    html = await page.content()
                    html_lower = html.lower()
                    page_title = (await page.title()).lower()

                if _is_storefront_error_page(page_title, html_lower):
                    if page_num == 1:
                        warning = "Storefront unavailable for metrics extraction."
                    break

                soup = BeautifulSoup(html, "html.parser")
                
                # Try multiple selectors for product nodes to handle different page layouts
                product_nodes = soup.select("div[data-component-type='s-search-result']")
                if not product_nodes:
                    product_nodes = soup.select(".s-result-item")
                if not product_nodes:
                    product_nodes = soup.select("[data-asin]")
                
                # Multiple title selectors to try within each product node
                title_selectors = [
                    "[data-cy='title-recipe']",
                    "[data-cy='title-recipe'] a",
                    "h2 a span",
                    "h3 a span",
                    "span.a-size-base-plus",
                    "span[data-a-color='base']",
                    "a.a-link-normal span",
                    "a[href*='/dp/'] span",
                ]

                for node in product_nodes:
                    title = None
                    # Try multiple selectors to find the product title
                    for selector in title_selectors:
                        title_elem = node.select_one(selector)
                        if title_elem:
                            title = (title_elem.get_text() or "").strip()
                            if title and not title.lower().startswith("truncated"):
                                break
                    
                    if not title:
                        continue

                    product_key = re.sub(r"\s+", " ", title).strip().casefold()
                    if product_key in seen_product_keys:
                        continue
                    seen_product_keys.add(product_key)

                    brand = _normalize_brand(title)
                    if not brand or len(brand) <= 1:
                        continue

                    rating, reviews = _extract_product_rating_and_reviews(node)
                    asin = (node.get("data-asin") or "").strip() or None

                    # Extract price
                    price: float | None = None
                    price_elem = node.select_one(".a-price .a-offscreen")
                    if price_elem:
                        try:
                            price = float(re.sub(r"[^\d.]", "", price_elem.get_text()))
                        except (ValueError, TypeError):
                            price = None

                    # Extract bought-in-past-month demand signal
                    bought_in_month: int | None = None
                    for span in node.select("span"):
                        txt = (span.get_text() or "").strip()
                        if "bought" in txt.lower() and "month" in txt.lower():
                            m = re.search(r"([\d,.]+)\s*K?\+?\s*bought", txt, re.IGNORECASE)
                            if m:
                                raw = m.group(1).replace(",", "")
                                try:
                                    bought_in_month = int(float(raw) * 1000) if "K" in txt.upper() and "." in raw else int(float(raw))
                                except (ValueError, TypeError):
                                    bought_in_month = None
                            break

                    brand_metrics[brand]["count"] += 1
                    if rating > 0:
                        brand_metrics[brand]["ratings"].append(rating)
                    brand_metrics[brand]["reviews"] += reviews
                    if price is not None:
                        brand_metrics[brand]["prices"].append(price)
                    if bought_in_month is not None:
                        brand_metrics[brand]["bought"].append(bought_in_month)
                        if bought_in_month > brand_metrics[brand]["max_bought"]:
                            brand_metrics[brand]["max_bought"] = bought_in_month
                            brand_metrics[brand]["top_demand_product"] = title

                    brand_audit_map[brand].append(
                        {
                            "title": title,
                            "rating": round(rating, 2),
                            "reviews": reviews,
                            "price": price,
                            "bought_in_past_month": bought_in_month,
                            "page_number": page_num,
                            "page_url": page_url,
                            "asin": asin,
                        }
                    )
                    total_products += 1

                next_link = soup.select_one("a.s-pagination-next[href]:not(.s-pagination-disabled)")
                if next_link and next_link.has_attr("href"):
                    next_page_url = urljoin("https://www.amazon.com", str(next_link.get("href")))
                else:
                    next_page_url = None

                if not next_page_url and page_num < max_pages:
                    break

            await context.close()
            await browser.close()
    except PlaywrightTimeoutError:
        warning = "Timeout during brand metrics extraction."
    except Exception:
        warning = "Error during brand metrics extraction."

    result = []
    for brand, metrics in brand_metrics.items():
        avg_rating = sum(metrics["ratings"]) / len(metrics["ratings"]) if metrics["ratings"] else 0.0
        avg_reviews = metrics["reviews"] / metrics["count"] if metrics["count"] > 0 else 0
        avg_price = sum(metrics["prices"]) / len(metrics["prices"]) if metrics["prices"] else None
        total_bought = sum(metrics["bought"])
        max_bought = metrics["max_bought"]
        # engagement_score = quality x review depth
        engagement = avg_rating * (avg_reviews / 100.0 + 1)
        # demand_score = purchase velocity signal (bought in past month across brand products)
        demand = total_bought / 1000.0
        result.append(
            {
                "brand": brand,
                "product_count": metrics["count"],
                "avg_rating": round(avg_rating, 2),
                "total_reviews": metrics["reviews"],
                "avg_reviews_per_product": round(avg_reviews, 2),
                "avg_price": round(avg_price, 2) if avg_price is not None else None,
                "top_demand_product": metrics["top_demand_product"],
                "max_bought_in_month": max_bought if max_bought > 0 else None,
                "engagement_score": round(engagement, 2),
                "demand_score": round(demand, 2),
            }
        )

    result.sort(key=lambda x: x["engagement_score"], reverse=True)
    for idx, item in enumerate(result, 1):
        item["rank"] = idx
    top_brands = result[:max_brands]
    unique_brands = len(brand_metrics)

    selected_brand_names = {item["brand"] for item in top_brands}
    brand_audit: List[Dict[str, Any]] = []
    for brand in selected_brand_names:
        products = sorted(brand_audit_map.get(brand, []), key=lambda item: item["reviews"], reverse=True)
        brand_audit.append(
            {
                "brand": brand,
                "product_count": len(products),
                "total_reviews": sum(item["reviews"] for item in products),
                "products": products,
            }
        )
    brand_audit.sort(key=lambda item: item["total_reviews"], reverse=True)

    return top_brands, total_products, unique_brands, warning, brand_audit


async def scrape_storefront_brands(store_url: str, max_brands: int) -> Tuple[List[str], str | None]:
    brands, _, warning, _ = await scrape_storefront_catalog(
        store_url=store_url,
        max_brands=max_brands,
        max_products=max(50, max_brands * 3),
        max_pages=1,
    )
    return brands, warning


async def scrape_storefront_catalog(
    store_url: str,
    *,
    max_brands: int,
    max_products: int,
    max_pages: int,
) -> Tuple[List[str], List[str], str | None, Dict[str, Any]]:
    collected: List[str] = []
    products: List[str] = []
    seen_product_keys: Set[str] = set()
    seen_brand_keys: Set[str] = set()
    visited_urls: List[str] = []
    page_stats: List[Dict[str, int | str]] = []
    stopped_at_page = None
    stop_reason = None
    warning = None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await context.new_page()
            next_page_url = store_url
            title_selectors = [
                "h2 a span",
                "h3 a span",
                "[data-component-type='s-search-result'] h2 span",
                ".s-result-item h2 span",
                ".product-title",
                ".product-name",
                "a[title]",
            ]

            for page_num in range(1, max_pages + 1):
                if page_num == 1:
                    page_url = store_url
                elif next_page_url:
                    page_url = next_page_url
                else:
                    page_url = _build_paginated_storefront_url(store_url, page_num)
                visited_urls.append(page_url)
                await page.goto(page_url, wait_until="domcontentloaded", timeout=35000)
                await page.wait_for_timeout(2500)

                html = await page.content()
                html_lower = html.lower()
                page_title = (await page.title()).lower()
                if "captcha" in html_lower or "robot check" in html_lower or "automated access" in html_lower:
                    warning = "Storefront bot protection detected. Brand extraction may be limited."
                    stopped_at_page = page_num
                    stop_reason = "bot_protection"
                    break

                # Retry once on transient Amazon error pages before failing pagination.
                if _is_storefront_error_page(page_title, html_lower):
                    await page.reload(wait_until="domcontentloaded", timeout=35000)
                    await page.wait_for_timeout(2500)
                    html = await page.content()
                    html_lower = html.lower()
                    page_title = (await page.title()).lower()

                # Fallback to deterministic page=N URL if tokenized next URL failed.
                if _is_storefront_error_page(page_title, html_lower) and page_num > 1:
                    fallback_url = _build_paginated_storefront_url(store_url, page_num)
                    if fallback_url != page_url:
                        page_url = fallback_url
                        visited_urls[-1] = page_url
                        await page.goto(page_url, wait_until="domcontentloaded", timeout=35000)
                        await page.wait_for_timeout(2500)
                        html = await page.content()
                        html_lower = html.lower()
                        page_title = (await page.title()).lower()

                if _is_storefront_error_page(page_title, html_lower):
                    warning = "Storefront pagination hit an Amazon error page. Results may be partial."
                    stopped_at_page = page_num
                    stop_reason = "page_error"
                    break

                soup = BeautifulSoup(html, "html.parser")
                page_new_products = 0
                page_new_brands = 0

                for selector in title_selectors:
                    for node in soup.select(selector):
                        text = (node.get_text() or "").strip()
                        if not text and node.has_attr("title"):
                            text = str(node.get("title", "")).strip()
                        if not text:
                            continue
                        if text.lower().startswith("truncated-title"):
                            continue
                        product_key = re.sub(r"\s+", " ", text).strip().casefold()
                        if product_key in seen_product_keys:
                            continue
                        seen_product_keys.add(product_key)
                        products.append(text)
                        page_new_products += 1

                        brand = _normalize_brand(text)
                        if brand and len(brand) > 1:
                            brand_key = brand.casefold()
                            if brand_key not in seen_brand_keys:
                                seen_brand_keys.add(brand_key)
                                page_new_brands += 1
                            collected.append(brand)

                page_stats.append(
                    {
                        "page_number": page_num,
                        "page_url": page_url,
                        "new_products_added": page_new_products,
                        "new_brands_added": page_new_brands,
                    }
                )

                next_link = soup.select_one("a.s-pagination-next[href]:not(.s-pagination-disabled)")
                if next_link and next_link.has_attr("href"):
                    next_page_url = urljoin("https://www.amazon.com", str(next_link.get("href")))
                else:
                    next_page_url = None

                # Stop early when pagination does not add new products.
                if page_new_products == 0:
                    stopped_at_page = page_num
                    stop_reason = "no_new_products"
                    break
                if next_page_url is None and page_num < max_pages:
                    stopped_at_page = page_num
                    stop_reason = "no_next_page"
                    break

            await context.close()
            await browser.close()
    except PlaywrightTimeoutError:
        warning = "Storefront scraping timed out."
        stop_reason = "timeout"
    except Exception:
        warning = "Storefront scraping failed for this URL."
        stop_reason = "scrape_error"

    ranked = [brand for brand, _ in Counter(collected).most_common(max_brands)]
    deduped_products = list(dict.fromkeys(products))[:max_products]
    if stop_reason is None and visited_urls:
        stopped_at_page = len(visited_urls)
        stop_reason = "max_pages_reached"

    metadata = {
        "visited_urls": visited_urls,
        "page_stats": page_stats,
        "stopped_at_page": stopped_at_page,
        "stop_reason": stop_reason,
    }
    return ranked, deduped_products, warning, metadata


async def scrape_amazon_top_brands(
    category: str,
    *,
    max_brands: int,
    pages: int,
    country_domain: str,
) -> AmazonTopBrandsResponse:
    source_urls: List[str] = []
    collected: List[str] = []
    warning = None

    playwright_failed = False
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await context.new_page()

            for page_num in range(1, pages + 1):
                url = f"https://www.amazon.{country_domain}/s?k={quote_plus(category)}&page={page_num}"
                source_urls.append(url)
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_timeout(2000)
                    html = await page.content()
                    current_url = page.url.lower()
                    page_title = (await page.title()).lower()

                    if (
                        "captcha" in html.lower()
                        or "robot check" in html.lower()
                        or "automated access" in html.lower()
                        or "validatecaptcha" in current_url
                        or "robot check" in page_title
                    ):
                        warning = "Amazon bot protection detected (captcha/challenge page). Scraping may be limited even with Playwright."
                        continue

                    page_brands = _extract_brand_candidates_from_html(html)
                    if not page_brands:
                        title_elements = await page.query_selector_all("h2 a span")
                        for element in title_elements:
                            text = (await element.inner_text()).strip()
                            brand = _normalize_brand(text)
                            if brand and len(brand) > 1:
                                collected.append(brand)
                    else:
                        collected.extend(page_brands)
                except PlaywrightTimeoutError:
                    warning = "Playwright timed out on one or more Amazon pages. Results may be incomplete."
                except Exception:
                    warning = "Playwright scraping failed for one or more pages. Results may be incomplete."

            await context.close()
            await browser.close()
    except Exception:
        playwright_failed = True
        warning = "Playwright setup/browser failed. Falling back to HTTP scraping."

    if playwright_failed:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        }
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            for page_num in range(1, pages + 1):
                url = f"https://www.amazon.{country_domain}/s?k={quote_plus(category)}&page={page_num}"
                if url not in source_urls:
                    source_urls.append(url)
                try:
                    response = await client.get(url, headers=headers)
                    if response.status_code != 200:
                        continue
                    html = response.text
                    if "captcha" in html.lower() or "robot check" in html.lower() or "automated access" in html.lower():
                        continue
                    collected.extend(_extract_brand_candidates_from_html(html))
                except Exception:
                    continue

    ranked = [brand for brand, _ in Counter(collected).most_common(max_brands)]

    if not ranked:
        warning = warning or "No brands extracted from Amazon page structure."

    return AmazonTopBrandsResponse(
        category=category,
        brands=ranked,
        scraped_count=len(ranked),
        pages=pages,
        source_urls=source_urls,
        warning=warning,
    )


async def scrape_amazon_best_sellers_brands(
    category: str,
    *,
    best_sellers_url: str,
    max_brands: int,
) -> AmazonTopSellersResponse:
    collected: List[str] = []
    warning = None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/126.0.0.0 Safari/537.36"
                ),
                locale="en-US",
            )
            page = await context.new_page()
            await page.goto(best_sellers_url, wait_until="domcontentloaded", timeout=35000)
            await page.wait_for_timeout(2500)

            html = await page.content()
            if "captcha" in html.lower() or "robot check" in html.lower() or "automated access" in html.lower():
                warning = "Amazon bot protection detected on Best Sellers page."

            collected.extend(_extract_best_sellers_brands_from_html(html))

            if not collected:
                title_elements = await page.query_selector_all("#zg-ordered-list li a span, h2 a span")
                for element in title_elements:
                    text = (await element.inner_text()).strip()
                    brand = _normalize_brand(text)
                    if brand:
                        collected.append(brand)

            await context.close()
            await browser.close()
    except PlaywrightTimeoutError:
        warning = "Playwright timed out while loading Amazon Best Sellers page."
    except Exception:
        warning = "Failed to scrape Amazon Best Sellers page."

    ranked = [brand for brand, _ in Counter(collected).most_common(max_brands)]
    if not ranked and not warning:
        warning = "No brands extracted from Amazon Best Sellers page structure."

    return AmazonTopSellersResponse(
        category=category,
        brands=ranked,
        scraped_count=len(ranked),
        source_url=best_sellers_url,
        warning=warning,
    )


async def resolve_brand_set(source: BrandSetInput) -> Tuple[Set[str], List[str]]:
    warnings: List[str] = []

    if source.source_type == BrandSourceType.seller:
        if not source.seller_id:
            raise ValueError("seller_id is required when source_type=seller")
        items = [
            item
            for item in store.items_by_seller(source.seller_id)
            if item.category.lower() == source.category.lower()
        ]
        uploaded_brands = {item.brand.strip().title() for item in items if item.brand.strip()}
        if uploaded_brands:
            return uploaded_brands, warnings

        if source.seller_store_url:
            scraped_brands, scrape_warning = await scrape_storefront_brands(source.seller_store_url, source.max_brands)
            if scrape_warning:
                warnings.append(scrape_warning)
            if scraped_brands:
                warnings.append("No uploaded assortments found; used seller storefront scraping fallback.")
            else:
                warnings.append("No uploaded assortments found and storefront scraping returned no brands.")
            return set(scraped_brands), warnings

        warnings.append("No uploaded assortments found for seller source and no seller_store_url provided for scraping.")
        return set(), warnings

    if source.source_type == BrandSourceType.marketplace:
        if not source.marketplace:
            raise ValueError("marketplace is required when source_type=marketplace")
        items = [
            item
            for item in store.all_items()
            if item.category.lower() == source.category.lower() and item.marketplace == source.marketplace
        ]
        return {item.brand.strip().title() for item in items if item.brand.strip()}, warnings

    if source.source_type == BrandSourceType.amazon_scrape:
        scraped = await scrape_amazon_top_brands(
            source.category,
            max_brands=source.max_brands,
            pages=source.pages,
            country_domain=source.country_domain,
        )
        if scraped.warning:
            warnings.append(scraped.warning)

        scraped_brands = set(scraped.brands)
        if scraped_brands:
            return scraped_brands, warnings

        fallback_items = [
            item
            for item in store.all_items()
            if item.category.lower() == source.category.lower() and item.marketplace.value == "amazon"
        ]
        fallback_brands = {item.brand.strip().title() for item in fallback_items if item.brand.strip()}
        if fallback_brands:
            warnings.append("Falling back to uploaded Amazon assortment brands because scraping returned no brands.")
        return fallback_brands, warnings

    return set(), warnings


async def compare_brand_sets(left: BrandSetInput, right: BrandSetInput) -> BrandDiffResponse:
    if left.category.lower() != right.category.lower():
        raise ValueError("Both sources must use the same category for comparison")

    left_brands, left_warnings = await resolve_brand_set(left)
    right_brands, right_warnings = await resolve_brand_set(right)

    common = sorted(list(left_brands.intersection(right_brands)))
    missing_in_left = sorted(list(right_brands - left_brands))
    missing_in_right = sorted(list(left_brands - right_brands))

    return BrandDiffResponse(
        category=left.category,
        left_source=f"{left.source_type.value}",
        right_source=f"{right.source_type.value}",
        left_brands=sorted(list(left_brands)),
        right_brands=sorted(list(right_brands)),
        common_brands=common,
        missing_in_left=missing_in_left,
        missing_in_right=missing_in_right,
        warnings=left_warnings + right_warnings,
    )


async def compare_seller_brand_diff(
    category: str,
    seller_a: str,
    seller_b: str,
    *,
    seller_a_store_url: str | None = None,
    seller_b_store_url: str | None = None,
    max_brands: int = 20,
) -> BrandDiffResponse:
    left = BrandSetInput(
        source_type=BrandSourceType.seller,
        category=category,
        seller_id=seller_a,
        seller_store_url=seller_a_store_url,
        max_brands=max_brands,
    )
    right = BrandSetInput(
        source_type=BrandSourceType.seller,
        category=category,
        seller_id=seller_b,
        seller_store_url=seller_b_store_url,
        max_brands=max_brands,
    )
    return await compare_brand_sets(left, right)


async def compare_retailer_brand_diff(category: str, retailer_a: Marketplace, retailer_b: Marketplace) -> BrandDiffResponse:
    left = BrandSetInput(source_type=BrandSourceType.marketplace, category=category, marketplace=retailer_a)
    right = BrandSetInput(source_type=BrandSourceType.marketplace, category=category, marketplace=retailer_b)
    return await compare_brand_sets(left, right)
