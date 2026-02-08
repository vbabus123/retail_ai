/**
 * Local Scraper Server - Express + Playwright + Cheerio
 * Fetches Amazon seller pages using a stealth headless browser,
 * parses products with Cheerio (DOM-based, not AI), and serves
 * structured JSON to the frontend.
 *
 * Usage:  node server/scraper.js
 * API:    POST http://localhost:3001/api/scrape   { url }
 *         POST http://localhost:3001/api/parse    { html, url }
 */

import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3001;

// ── Stealth helpers ─────────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min = 2000, max = 5000) {
  return sleep(min + Math.random() * (max - min));
}

// ── Playwright browser pool ─────────────────────────────────────────
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('🚀 Launching stealth Chromium…');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

async function fetchPageWithPlaywright(url, retries = 3) {
  const b = await getBrowser();
  const context = await b.newContext({
    userAgent: randomUA(),
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // Add common headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  });

  // Stealth: override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Chrome runtime
    window.chrome = { runtime: {} };
    // Permissions
    const origQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions);
    if (origQuery) {
      window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : origQuery(params);
    }
  });

  const page = await context.newPage();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  ↳ Attempt ${attempt}/${retries}: ${url.substring(0, 80)}…`);

      // Random delay before request (looks human)
      if (attempt > 1) await randomDelay(3000, 8000);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait a bit for JS-rendered content
      await sleep(2000 + Math.random() * 2000);

      // Scroll down slowly like a human to trigger lazy-loading
      await autoScroll(page);

      // Wait for product cards to appear
      await page.waitForSelector('[data-component-type="s-search-result"], .s-result-item, .sg-col-inner', {
        timeout: 10000,
      }).catch(() => console.log('  ⚠ Product selector not found, continuing…'));

      const html = await page.content();

      // Check if we got blocked
      if (html.includes('Robot Check') || html.includes('captcha') || html.includes('Type the characters')) {
        console.log(`  ⚠ CAPTCHA detected on attempt ${attempt}`);
        if (attempt < retries) {
          await randomDelay(5000, 15000); // Longer wait after CAPTCHA
          continue;
        }
        await context.close();
        return { html, blocked: true };
      }

      await context.close();
      return { html, blocked: false };
    } catch (err) {
      console.error(`  ✗ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        await context.close();
        throw err;
      }
    }
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300 + Math.random() * 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150 + Math.random() * 200);
      // Safety timeout
      setTimeout(() => { clearInterval(timer); resolve(); }, 8000);
    });
  });
}

// ── Cheerio-based Amazon parser ──────────────────────────────────────
function parseAmazonProducts(html, pageUrl) {
  const $ = cheerio.load(html);
  const products = [];

  // Strategy 1: Standard search results (most common)
  $('[data-component-type="s-search-result"]').each((_, el) => {
    const $el = $(el);
    const asin = $el.attr('data-asin');
    if (!asin || asin.length < 5) return; // Skip sponsored placeholders

    const product = extractProductFromCard($, $el, asin);
    if (product && product.name) products.push(product);
  });

  // Strategy 2: Fallback – .s-result-item without the data-component-type
  if (products.length === 0) {
    $('.s-result-item[data-asin]').each((_, el) => {
      const $el = $(el);
      const asin = $el.attr('data-asin');
      if (!asin || asin.length < 5) return;

      const product = extractProductFromCard($, $el, asin);
      if (product && product.name) products.push(product);
    });
  }

  // Strategy 3: Generic product grid (brand stores, etc.)
  if (products.length === 0) {
    $('[class*="ProductCard"], [class*="product-card"], .a-section .a-link-normal[href*="/dp/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || $el.find('a[href*="/dp/"]').attr('href') || '';
      const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
      const asin = asinMatch ? asinMatch[1] : null;

      const product = extractProductFromCard($, $el, asin);
      if (product && product.name) products.push(product);
    });
  }

  // Strategy 4: Extract from any link with /dp/ pattern
  if (products.length === 0) {
    const seenAsins = new Set();
    $('a[href*="/dp/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
      if (!asinMatch) return;
      const asin = asinMatch[1];
      if (seenAsins.has(asin)) return;
      seenAsins.add(asin);

      // Walk up to a reasonable parent container
      let $card = $(el).closest('[data-asin], .s-result-item, .sg-col-inner, .a-section');
      if (!$card.length) $card = $(el).parent().parent();

      const product = extractProductFromCard($, $card, asin);
      if (product && product.name) products.push(product);
    });
  }

  // Extract pagination
  const pagination = extractPaginationFromCheerio($);

  // Extract seller info
  const sellerInfo = extractSellerInfoFromCheerio($, pageUrl);

  console.log(`  ✓ Cheerio parsed ${products.length} products`);
  return { products, pagination, sellerInfo };
}

function extractProductFromCard($, $el, asin) {
  // Title: various Amazon selectors
  const titleSelectors = [
    'h2 a span',
    'h2 span',
    '.a-text-normal',
    '.a-size-medium.a-color-base',
    '.a-size-base-plus.a-color-base',
    '[data-cy="title-recipe"] span',
    '.a-link-normal .a-text-normal',
    'img[alt]', // fallback to image alt text
  ];

  let name = '';
  for (const sel of titleSelectors) {
    const found = $el.find(sel).first().text().trim();
    if (found && found.length > 5) { name = found; break; }
  }
  // Image alt fallback
  if (!name) {
    const alt = $el.find('img.s-image, img[data-image-latency]').attr('alt');
    if (alt) name = alt.trim();
  }
  if (!name) return null;

  // Price
  const wholePrice = $el.find('.a-price .a-price-whole').first().text().replace(/[,.]/g, '').trim();
  const fractionPrice = $el.find('.a-price .a-price-fraction').first().text().trim();
  let price = null;
  let priceNumeric = null;
  if (wholePrice) {
    priceNumeric = parseFloat(`${wholePrice}.${fractionPrice || '00'}`);
    price = `$${priceNumeric.toFixed(2)}`;
  }
  // Fallback price from text
  if (!price) {
    const priceText = $el.find('.a-price, .a-color-price, [data-cy="price-recipe"]').first().text();
    const match = priceText.match(/\$?([\d,]+\.?\d*)/);
    if (match) {
      priceNumeric = parseFloat(match[1].replace(/,/g, ''));
      price = `$${priceNumeric.toFixed(2)}`;
    }
  }

  // Original price (strikethrough)
  let originalPrice = null;
  const origText = $el.find('.a-price.a-text-price .a-offscreen, .a-price[data-a-strike] .a-offscreen').first().text();
  if (origText) {
    const match = origText.match(/\$?([\d,]+\.?\d*)/);
    if (match) originalPrice = `$${parseFloat(match[1].replace(/,/g, '')).toFixed(2)}`;
  }

  // Rating
  let rating = null;
  const ratingText = $el.find('.a-icon-star-small .a-icon-alt, .a-icon-star .a-icon-alt, [aria-label*="out of 5"]').first().text() ||
                     $el.find('[aria-label*="out of 5"]').first().attr('aria-label') || '';
  const ratingMatch = ratingText.match(/([\d.]+)\s*out of\s*5/);
  if (ratingMatch) rating = parseFloat(ratingMatch[1]);

  // Review count
  let reviewCount = null;
  const reviewText = $el.find('.a-size-small .a-link-normal .a-size-base, [aria-label*="ratings"], .s-underline-text').first().text();
  const reviewMatch = reviewText.match(/([\d,]+)/);
  if (reviewMatch) reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''), 10);

  // Prime
  const isPrime = $el.find('.a-icon-prime, [aria-label="Amazon Prime"], .s-prime').length > 0;

  // Image URL
  const imageUrl = $el.find('img.s-image, img[data-image-latency]').attr('src') || null;

  // Product URL
  const productLink = $el.find('h2 a, a.a-link-normal[href*="/dp/"]').attr('href') || '';
  const productUrl = productLink.startsWith('http')
    ? productLink
    : productLink ? `https://www.amazon.com${productLink}` : (asin ? `https://www.amazon.com/dp/${asin}` : '');

  // Brand (try badge or below-title text)
  const brand = $el.find('.a-row .a-size-base:first-child, [data-cy="reviews-block"] + .a-row .a-size-base').first().text().trim()
    || inferBrand(name);

  return {
    name: name.substring(0, 200), // cap length
    brand,
    price,
    priceNumeric,
    originalPrice,
    asin,
    productUrl,
    category: '', // will be inferred later by AI
    rating,
    reviewCount,
    isPrime,
    imageUrl,
  };
}

function inferBrand(name) {
  // Take first word(s) as brand guess
  const parts = name.split(/\s+/);
  return parts.length > 0 ? parts[0] : 'Unknown';
}

function extractPaginationFromCheerio($) {
  const resultText = $('[data-component-type="s-result-info-bar"]').text() ||
                     $('#s-result-count, .s-breadcrumb, .rush-component').text();
  const countMatch = resultText.match(/(\d+)\s*-\s*(\d+)\s*of\s*([\d,]+)\+?\s*results/i);

  let totalResults = 0, totalPages = 1, hasNextPage = false;

  if (countMatch) {
    totalResults = parseInt(countMatch[3].replace(/,/g, ''), 10);
    const perPage = parseInt(countMatch[2], 10);
    totalPages = Math.ceil(totalResults / perPage);
  }

  hasNextPage = $('.s-pagination-next:not(.s-pagination-disabled)').length > 0 ||
                $('a.s-pagination-next').length > 0;

  return { totalResults, totalPages: Math.min(totalPages, 20), hasNextPage };
}

function extractSellerInfoFromCheerio($, pageUrl) {
  const title = $('title').text().trim();
  const sellerNameMatch = title.match(/^(.+?)(?:\s*[-–|:]|\s*Amazon)/i);
  const sellerName = sellerNameMatch ? sellerNameMatch[1].trim() : title.split('-')[0].trim();

  return {
    name: sellerName || 'Amazon Seller',
    storefront: 'Amazon',
    url: pageUrl,
  };
}

// ── Parse seller URL ─────────────────────────────────────────────────
function parseSellerUrl(url) {
  const u = new URL(url);
  const params = new URLSearchParams(u.search);
  const sellerId = params.get('me') || params.get('seller') || null;
  const marketplace = params.get('marketplaceID') || 'ATVPDKIKX0DER';
  return { sellerId, marketplace };
}

function buildPageUrl(sellerId, page, marketplace) {
  return `https://www.amazon.com/s?me=${sellerId}&marketplaceID=${marketplace}&page=${page}`;
}

// ── API Endpoints ────────────────────────────────────────────────────

/**
 * POST /api/scrape
 * Body: { url, maxPages? }
 * Fetches seller pages with Playwright, parses with Cheerio, returns products.
 */
app.post('/api/scrape', async (req, res) => {
  const { url, maxPages = 5 } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  console.log(`\n🔍 Scraping: ${url}`);
  const { sellerId, marketplace } = parseSellerUrl(url);

  try {
    // Fetch first page
    const firstUrl = sellerId ? buildPageUrl(sellerId, 1, marketplace) : url;
    console.log(`📄 Fetching page 1: ${firstUrl}`);

    const { html, blocked } = await fetchPageWithPlaywright(firstUrl);
    if (blocked) {
      return res.json({
        error: 'Amazon CAPTCHA detected. Retrying with longer delays…',
        blocked: true,
        html: html.substring(0, 1000), // send a snippet for debugging
      });
    }

    const firstPage = parseAmazonProducts(html, firstUrl);
    const allProducts = [...firstPage.products];
    const pagesScanned = [1];

    const totalPages = Math.min(firstPage.pagination.totalPages || 1, maxPages);

    // Fetch additional pages
    if (sellerId && totalPages > 1) {
      for (let p = 2; p <= totalPages; p++) {
        console.log(`\n📄 Fetching page ${p}/${totalPages}…`);
        
        // Human-like delay between pages (3-8 seconds)
        await randomDelay(3000, 8000);

        const pageUrl = buildPageUrl(sellerId, p, marketplace);
        try {
          const pageResult = await fetchPageWithPlaywright(pageUrl, 2);
          if (pageResult.blocked) {
            console.log(`⚠ Blocked on page ${p}, stopping pagination`);
            break;
          }

          const pageData = parseAmazonProducts(pageResult.html, pageUrl);
          if (pageData.products.length === 0) {
            console.log(`  No products on page ${p}, stopping`);
            break;
          }

          allProducts.push(...pageData.products);
          pagesScanned.push(p);
          console.log(`  Running total: ${allProducts.length} products`);
        } catch (err) {
          console.error(`  Failed page ${p}: ${err.message}`);
          break;
        }
      }
    }

    // Deduplicate by ASIN
    const seen = new Set();
    const unique = allProducts.filter(p => {
      const key = p.asin || p.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`\n✅ Done! ${unique.length} unique products from ${pagesScanned.length} pages`);

    res.json({
      sellerInfo: {
        ...firstPage.sellerInfo,
        sellerId,
        pagesScanned: pagesScanned.length,
        totalPagesAvailable: totalPages,
      },
      products: unique,
      pagination: firstPage.pagination,
    });
  } catch (err) {
    console.error('Scrape failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/parse
 * Body: { html, url? }
 * Parses pasted HTML with Cheerio (no Playwright needed).
 */
app.post('/api/parse', async (req, res) => {
  const { html, url } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });

  console.log(`\n📋 Parsing pasted HTML (${(html.length / 1024).toFixed(1)} KB)…`);
  try {
    const result = parseAmazonProducts(html, url || 'https://www.amazon.com');
    console.log(`✅ Parsed ${result.products.length} products from pasted HTML`);
    res.json({
      sellerInfo: {
        ...result.sellerInfo,
        dataSource: 'Pasted HTML (Cheerio parsed)',
        pagesScanned: 1,
      },
      products: result.products,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error('Parse failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', browser: browser?.isConnected() ? 'connected' : 'idle' });
});

// ── Start server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🟢 Scraper server running on http://localhost:${PORT}`);
  console.log(`   POST /api/scrape  { url, maxPages? }`);
  console.log(`   POST /api/parse   { html, url? }`);
  console.log(`   GET  /api/health\n`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down…');
  if (browser) await browser.close();
  process.exit(0);
});
