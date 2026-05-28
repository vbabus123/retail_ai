from __future__ import annotations

import re
from collections import Counter
from typing import List, Set, Tuple
from urllib.parse import quote_plus

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


async def scrape_storefront_brands(store_url: str, max_brands: int) -> Tuple[List[str], str | None]:
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
            await page.goto(store_url, wait_until="domcontentloaded", timeout=35000)
            await page.wait_for_timeout(2500)

            html = await page.content()
            if "captcha" in html.lower() or "robot check" in html.lower() or "automated access" in html.lower():
                warning = "Storefront bot protection detected. Brand extraction may be limited."

            soup = BeautifulSoup(html, "html.parser")

            title_selectors = [
                "h2 a span",
                "h3 a span",
                "[data-component-type='s-search-result'] h2 span",
                ".s-result-item h2 span",
                ".product-title",
                ".product-name",
                "a[title]",
            ]
            for selector in title_selectors:
                for node in soup.select(selector):
                    text = (node.get_text() or "").strip()
                    if not text and node.has_attr("title"):
                        text = str(node.get("title", "")).strip()
                    if not text:
                        continue
                    brand = _normalize_brand(text)
                    if brand and len(brand) > 1:
                        collected.append(brand)

            await context.close()
            await browser.close()
    except PlaywrightTimeoutError:
        warning = "Storefront scraping timed out."
    except Exception:
        warning = "Storefront scraping failed for this URL."

    ranked = [brand for brand, _ in Counter(collected).most_common(max_brands)]
    return ranked, warning


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
