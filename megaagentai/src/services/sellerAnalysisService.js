/**
 * Seller Store Analysis Service
 * Analyzes 3rd party seller catalogs to find competitive opportunities
 * 
 * Architecture:
 *   1. Primary: Local scraper server (Express + Playwright + Cheerio) at :3001
 *   2. Fallback: CORS proxies → AI research
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Local scraper server URL
const SCRAPER_URL = 'http://localhost:3001';

// ── Check if local scraper server is running ────────────────────────
async function isScraperServerUp() {
  try {
    const res = await fetch(`${SCRAPER_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Primary: Fetch via local Playwright scraper server ──────────────
async function fetchViaScraperServer(url, maxPages = 5) {
  console.log('🚀 Using local Playwright scraper server…');
  const res = await fetch(`${SCRAPER_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, maxPages }),
    signal: AbortSignal.timeout(120000), // 2 min timeout (pages take time)
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Scraper server returned ${res.status}`);
  }

  const data = await res.json();
  if (data.blocked) {
    console.warn('⚠ Scraper detected CAPTCHA');
    return null; // fallback to other methods
  }
  return data;
}

// ── Parse pasted HTML via local server (Cheerio) ────────────────────
async function parseHtmlViaServer(html, url) {
  console.log('📋 Parsing HTML via local Cheerio server…');
  const res = await fetch(`${SCRAPER_URL}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, url }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Parse endpoint returned ${res.status}`);
  }
  return res.json();
}

// CORS proxy for fetching external pages - legacy fallback
const fetchWithProxy = async (url) => {
  const proxies = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
  ];

  for (const makeProxyUrl of proxies) {
    try {
      const proxyUrl = makeProxyUrl(url);
      console.log(`Trying proxy: ${proxyUrl.substring(0, 50)}...`);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(12000),
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      if (response.ok) {
        const html = await response.text();
        if (html && html.length > 500 && !html.includes('Access Denied') && !html.includes('Robot Check')) {
          console.log(`Proxy success! Got ${html.length} chars`);
          return html;
        }
      }
    } catch (e) {
      console.log(`Proxy failed: ${e.message}`);
    }
  }
  console.log('All proxies failed');
  return null;
};

// AI-powered seller research - fallback when scraping fails
async function researchSellerWithAI(sellerUrl, sellerId) {
  console.log(`Using AI to research seller: ${sellerId}`);
  
  const prompt = `You are a retail analyst researching an Amazon third-party seller.

SELLER URL: ${sellerUrl}
SELLER ID: ${sellerId || 'Unknown'}

Based on your knowledge of Amazon marketplace sellers, provide information about this seller's product catalog.

IMPORTANT: Research what products this seller typically sells. Look for:
1. The seller/brand name
2. Their main product categories
3. Their most popular products (estimate 15-25 products)
4. Typical price points
5. Product ratings if known

For each product, provide realistic details that would be found on Amazon.

Return JSON:
{
  "sellerInfo": {
    "name": "Seller or Brand name (best guess based on seller ID pattern)",
    "storefront": "Amazon",
    "sellerId": "${sellerId || 'Unknown'}",
    "estimatedProductCount": 50,
    "mainCategories": ["Category 1", "Category 2"],
    "dataSource": "AI Research (proxy blocked)"
  },
  "products": [
    {
      "name": "Product name",
      "brand": "Brand name",
      "price": "$XX.XX",
      "priceNumeric": 29.99,
      "asin": "B0XXXXXXXX",
      "productUrl": "https://www.amazon.com/dp/B0XXXXXXXX",
      "category": "Category",
      "rating": 4.5,
      "reviewCount": 500,
      "isPrime": true
    }
  ]
}

Generate 15-20 realistic products that a seller with ID "${sellerId}" might sell.
If you recognize this seller ID, provide their actual products.
If not, generate plausible products based on common Amazon seller patterns.

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanJson);
    console.log(`AI research found ${data.products?.length || 0} products`);
    return data;
  } catch (error) {
    console.error('AI seller research failed:', error);
    return null;
  }
}

// Parse Amazon seller URL and extract seller ID
function parseAmazonSellerUrl(url) {
  // Handle different Amazon seller URL formats:
  // 1. https://www.amazon.com/s?me=ASSKFE9KVAV03&marketplaceID=ATVPDKIKX0DER
  // 2. https://www.amazon.com/sp?seller=ASSKFE9KVAV03
  // 3. https://www.amazon.com/stores/page/XXXXXXXX
  
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  
  // Try different parameter names
  const sellerId = params.get('me') || params.get('seller') || params.get('ie');
  
  return {
    sellerId,
    marketplace: params.get('marketplaceID') || 'ATVPDKIKX0DER',
    baseUrl: url.split('?')[0],
    isAmazon: url.includes('amazon.com')
  };
}

// Build paginated Amazon seller URL
function buildAmazonPageUrl(sellerId, pageNum, marketplace = 'ATVPDKIKX0DER') {
  // Amazon uses 'page' parameter for pagination
  return `https://www.amazon.com/s?me=${sellerId}&marketplaceID=${marketplace}&page=${pageNum}`;
}

// Extract pagination info from HTML
function extractPaginationInfo(html) {
  // Look for pagination indicators in the HTML
  // Amazon typically shows "1-48 of 200+ results" or similar
  const resultCountMatch = html.match(/(\d+)\s*-\s*(\d+)\s*of\s*([\d,]+)\+?\s*results/i);
  const pageCountMatch = html.match(/Page\s*\d+\s*of\s*(\d+)/i);
  
  let totalResults = 0;
  let resultsPerPage = 48; // Amazon default
  let totalPages = 1;
  
  if (resultCountMatch) {
    totalResults = parseInt(resultCountMatch[3].replace(/,/g, ''), 10);
    resultsPerPage = parseInt(resultCountMatch[2], 10) - parseInt(resultCountMatch[1], 10) + 1;
    totalPages = Math.ceil(totalResults / resultsPerPage);
  } else if (pageCountMatch) {
    totalPages = parseInt(pageCountMatch[1], 10);
  }
  
  // Also look for "Next" button to confirm more pages
  const hasNextPage = html.includes('s-pagination-next') || 
                      html.includes('class="a-last"') ||
                      html.includes('aria-label="Go to next page"');
  
  console.log(`Pagination detected: ${totalResults} total results, ${totalPages} pages, hasNext: ${hasNextPage}`);
  
  return {
    totalResults,
    resultsPerPage,
    totalPages: Math.min(totalPages, 10), // Cap at 10 pages for performance
    hasNextPage
  };
}

// Extract products from a single page
async function extractProductsFromPage(html, pageNum, sellerUrl) {
  const prompt = `Analyze this Amazon seller storefront page HTML and extract ALL product listings.

PAGE: ${pageNum}
SELLER URL: ${sellerUrl}

IMPORTANT: Extract EVERY product visible on this page. Look for:
- Product titles in search results
- ASINs in product URLs (format: /dp/XXXXXXXXXX)
- Prices (current and original)
- Star ratings and review counts
- Product images

For Amazon search results, products are typically in:
- div[data-component-type="s-search-result"]
- Each product has data-asin attribute

HTML (truncated):
${html.substring(0, 30000)}

Return JSON array of ALL products found:
{
  "pageNumber": ${pageNum},
  "productsOnPage": [
    {
      "name": "Full product name/title",
      "brand": "Brand name (extract from title or product info)",
      "price": "$XX.XX",
      "priceNumeric": 29.99,
      "originalPrice": "$XX.XX or null if not on sale",
      "asin": "BXXXXXXXXX",
      "productUrl": "https://www.amazon.com/dp/BXXXXXXXXX",
      "category": "Inferred category",
      "rating": 4.5,
      "reviewCount": 1500,
      "isPrime": true,
      "imageUrl": "https://..."
    }
  ],
  "totalProductsOnPage": 48,
  "hasMorePages": true
}

Extract ALL products visible. Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    console.log(`Page ${pageNum}: Extracted ${parsed.productsOnPage?.length || 0} products`);
    return parsed;
  } catch (error) {
    console.error(`Failed to extract products from page ${pageNum}:`, error);
    return { pageNumber: pageNum, productsOnPage: [], totalProductsOnPage: 0 };
  }
}

// Extract seller info from the storefront
async function extractSellerInfo(html, sellerUrl) {
  const prompt = `Extract seller/brand information from this Amazon storefront page.

URL: ${sellerUrl}

Look for:
1. Seller or brand name (in header, title, or seller info section)
2. Seller rating if visible
3. Total number of products/results shown

HTML (truncated):
${html.substring(0, 15000)}

Return JSON:
{
  "name": "Seller or Brand name",
  "storefront": "Amazon",
  "sellerId": "ASSKFE9KVAV03 (if visible)",
  "rating": 4.5,
  "totalProducts": 200,
  "description": "Brief description if available"
}

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to extract seller info:', error);
    return { name: 'Unknown Seller', storefront: 'Amazon' };
  }
}

// Fetch all pages of seller products
async function fetchAllSellerProducts(sellerUrl, onProgress) {
  const { sellerId, marketplace, isAmazon } = parseAmazonSellerUrl(sellerUrl);

  // ── Strategy 1: Local Playwright scraper server (best) ──────────
  const scraperUp = await isScraperServerUp();
  if (scraperUp) {
    onProgress({
      stage: 'Playwright Scraper',
      message: 'Using headless browser to fetch seller pages (stealth mode)…',
      progress: 5,
    });

    try {
      const data = await fetchViaScraperServer(sellerUrl, 5);
      if (data && data.products?.length > 0) {
        console.log(`✅ Scraper returned ${data.products.length} products`);
        onProgress({
          stage: 'Products Fetched',
          message: `Headless browser found ${data.products.length} products across ${data.sellerInfo?.pagesScanned || 1} pages`,
          progress: 40,
        });
        return {
          sellerInfo: {
            ...data.sellerInfo,
            dataSource: 'Playwright + Cheerio (local server)',
          },
          products: data.products,
        };
      }
    } catch (err) {
      console.warn('Scraper server call failed:', err.message);
    }
  } else {
    console.log('ℹ Local scraper server not running (start with: node server/scraper.js)');
  }

  // ── Strategy 2: CORS proxies (legacy) ─────────────────────────
  if (!isAmazon) {
    const html = await fetchWithProxy(sellerUrl);
    if (!html) return { sellerInfo: null, products: [] };
    const data = await extractSellerData(html, sellerUrl);
    return data;
  }
  
  console.log(`Detected Amazon seller: ${sellerId}, marketplace: ${marketplace}`);
  
  const firstPageUrl = sellerId ? buildAmazonPageUrl(sellerId, 1, marketplace) : sellerUrl;
  onProgress({ stage: 'Fetching Seller Page', message: 'Trying CORS proxies…', progress: 5 });
  
  const firstPageHtml = await fetchWithProxy(firstPageUrl);
  
  // ── Strategy 3: AI Research fallback ──────────────────────────
  if (!firstPageHtml) {
    console.log('Proxy fetch failed, using AI research fallback...');
    onProgress({ 
      stage: 'AI Research Mode', 
      message: 'Direct fetch blocked. Using AI to research seller catalog...', 
      progress: 15 
    });
    
    const aiData = await researchSellerWithAI(sellerUrl, sellerId);
    if (aiData && aiData.products?.length > 0) {
      return {
        sellerInfo: {
          ...aiData.sellerInfo,
          pagesScanned: 0,
          dataSource: 'AI Research (proxy blocked)'
        },
        products: aiData.products
      };
    }
    
    throw new Error(
      'Could not fetch seller data. Start the scraper server with: node server/scraper.js\n' +
      'Or use the "Paste HTML" option below.'
    );
  }
  
  // Extract seller info
  const sellerInfo = await extractSellerInfo(firstPageHtml, sellerUrl);
  
  // Get pagination info
  const pagination = extractPaginationInfo(firstPageHtml);
  const totalPages = Math.min(pagination.totalPages || 1, 10); // Cap at 10 pages
  
  onProgress({ 
    stage: 'Analyzing Catalog', 
    message: `Found ~${pagination.totalResults || 'unknown'} products across ${totalPages} pages`, 
    progress: 10 
  });
  
  // Extract products from first page
  const allProducts = [];
  const firstPageData = await extractProductsFromPage(firstPageHtml, 1, sellerUrl);
  if (firstPageData.productsOnPage) {
    allProducts.push(...firstPageData.productsOnPage);
  }
  
  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    const progressPercent = 10 + ((page - 1) / totalPages) * 30; // 10-40% for fetching
    onProgress({ 
      stage: `Fetching Page ${page}/${totalPages}`, 
      message: `Loading products from page ${page}...`, 
      progress: progressPercent 
    });
    
    const pageUrl = buildAmazonPageUrl(sellerId, page, marketplace);
    console.log(`Fetching page ${page}: ${pageUrl}`);
    
    const pageHtml = await fetchWithProxy(pageUrl);
    if (!pageHtml) {
      console.log(`Failed to fetch page ${page}, stopping pagination`);
      break;
    }
    
    const pageData = await extractProductsFromPage(pageHtml, page, sellerUrl);
    if (pageData.productsOnPage && pageData.productsOnPage.length > 0) {
      allProducts.push(...pageData.productsOnPage);
      console.log(`Total products after page ${page}: ${allProducts.length}`);
    } else {
      console.log(`No products found on page ${page}, stopping pagination`);
      break;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Deduplicate products by ASIN
  const uniqueProducts = [];
  const seenAsins = new Set();
  for (const product of allProducts) {
    const key = product.asin || product.productUrl || product.name;
    if (!seenAsins.has(key)) {
      seenAsins.add(key);
      uniqueProducts.push(product);
    }
  }
  
  console.log(`Total unique products extracted: ${uniqueProducts.length}`);
  
  return {
    sellerInfo: {
      ...sellerInfo,
      totalProducts: uniqueProducts.length,
      pagesScanned: totalPages
    },
    products: uniqueProducts
  };
}

// Analyze offer density for a product
async function analyzeOfferDensity(product) {
  const prompt = `For the product "${product.name}" by ${product.brand}:

1. How many major retailers typically sell this exact product or very similar products?
2. What's the typical price range across retailers?
3. Who are the main competitors?

Return JSON:
{
  "offerDensity": 5,
  "priceRange": {"low": 25.99, "high": 39.99},
  "retailers": [
    {"name": "Amazon", "hasProduct": true, "estimatedPrice": "$29.99"},
    {"name": "Walmart", "hasProduct": true, "estimatedPrice": "$27.99"},
    {"name": "Target", "hasProduct": false, "estimatedPrice": null},
    {"name": "Home Depot", "hasProduct": false, "estimatedPrice": null},
    {"name": "Lowes", "hasProduct": false, "estimatedPrice": null}
  ],
  "bestPrice": {"retailer": "Walmart", "price": "$27.99"},
  "competitionLevel": "moderate"
}

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to analyze offer density:', error);
    return { offerDensity: 0, retailers: [], competitionLevel: 'unknown' };
  }
}

// Check if product is incremental (not available at major retailers like Walmart)
async function checkIncremental(product) {
  const prompt = `Is the product "${product.name}" by ${product.brand} available at WALMART (walmart.com)?

Check if:
1. This exact product is sold at Walmart
2. Very similar products from the same brand are at Walmart
3. This is a unique/exclusive product

Return JSON:
{
  "availableAtWalmart": false,
  "isIncremental": true,
  "similarProductsAtWalmart": ["Product name 1", "Product name 2"],
  "reason": "This specific model is exclusive to Amazon, but similar products from the brand are available at Walmart"
}

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to check incremental:', error);
    return { availableAtWalmart: true, isIncremental: false };
  }
}

// Analyze customer sentiment for a product
async function analyzeSentiment(product) {
  const prompt = `Analyze customer sentiment for "${product.name}" by ${product.brand}.

Based on typical customer reviews and feedback for this type of product:

1. What's the overall sentiment score (1-5)?
2. What are common positive and negative themes?
3. What do customers say about this product?

Return JSON:
{
  "score": 4.2,
  "reviewCount": 1500,
  "summary": "Customers generally love this product for its value and quality. Some complaints about durability.",
  "positiveThemes": ["Great value", "Easy to use", "Good quality"],
  "negativeThemes": ["Durability concerns", "Packaging issues"],
  "keywords": ["value", "quality", "durable", "easy"],
  "recommendation": "Good product with strong customer satisfaction"
}

Return ONLY valid JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to analyze sentiment:', error);
    return { score: null, summary: 'Unable to analyze sentiment' };
  }
}

// Deep research on a product
async function deepResearch(product) {
  const prompt = `Provide deep research insights on "${product.name}" by ${product.brand}:

1. Market position and competitive landscape
2. Key differentiators vs competitors
3. Target customer segment
4. Trends affecting this product category
5. Opportunity assessment

Provide a concise 2-3 sentence summary of key insights for a retail buyer considering this product.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Failed to deep research:', error);
    return null;
  }
}

// Find opportunities based on analysis
function identifyOpportunities(products) {
  const opportunities = [];

  for (const product of products) {
    // Opportunity 1: Incremental items (Walmart doesn't have)
    if (product.isIncremental) {
      opportunities.push({
        product: product.name,
        type: 'incremental',
        reason: 'Not available at Walmart - potential exclusive addition',
        priority: 'high'
      });
    }

    // Opportunity 2: Better price possible
    if (!product.hasBestOffer && product.priceDifference > 0.10) {
      opportunities.push({
        product: product.name,
        type: 'price_opportunity',
        reason: `Seller price is ${(product.priceDifference * 100).toFixed(0)}% above best price - room to compete`,
        priority: product.priceDifference > 0.20 ? 'high' : 'medium'
      });
    }

    // Opportunity 3: Low competition products
    if (product.offerDensity <= 3 && product.sentiment?.score >= 4.0) {
      opportunities.push({
        product: product.name,
        type: 'low_competition',
        reason: 'Low seller competition with high customer satisfaction',
        priority: 'medium'
      });
    }

    // Opportunity 4: High sentiment but underrepresented
    if (product.sentiment?.score >= 4.5 && product.isIncremental) {
      opportunities.push({
        product: product.name,
        type: 'high_potential',
        reason: 'Excellent customer reviews + not at major retailers = high potential',
        priority: 'high'
      });
    }
  }

  // Sort by priority
  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 10); // Top 10 opportunities
}

// Main analysis function
export async function analyzeSellerStore(sellerUrl, onProgress) {
  try {
    // Stage 1: Fetch ALL seller pages and extract products
    onProgress({ stage: 'Starting Analysis', message: 'Initializing seller store analysis...', progress: 2 });
    
    // Use the new paginated fetch that handles all pages
    const sellerData = await fetchAllSellerProducts(sellerUrl, onProgress);
    
    if (!sellerData || !sellerData.products?.length) {
      throw new Error('Could not extract products from seller page. The page may be blocked or the URL format is not supported.');
    }

    const products = sellerData.products;
    const totalProducts = products.length;
    
    onProgress({ 
      stage: 'Products Extracted', 
      message: `Found ${totalProducts} unique products across ${sellerData.sellerInfo?.pagesScanned || 1} pages. Starting detailed analysis...`, 
      progress: 45 
    });

    // Stage 3: Analyze each product (parallel batches)
    // Limit to first 50 products for detailed analysis (to avoid API overload)
    const productsToAnalyze = products.slice(0, 50);
    const analyzedProducts = [];
    const batchSize = 5; // Analyze 5 products at a time
    const analysisCount = productsToAnalyze.length;
    
    for (let i = 0; i < productsToAnalyze.length; i += batchSize) {
      const batch = productsToAnalyze.slice(i, i + batchSize);
      const progressPercent = 45 + ((i / analysisCount) * 40); // 45% to 85%
      
      onProgress({ 
        stage: 'Deep Analysis', 
        message: `Analyzing products ${i + 1}-${Math.min(i + batchSize, analysisCount)} of ${analysisCount}...`, 
        progress: progressPercent 
      });

      const batchResults = await Promise.all(batch.map(async (product) => {
        // Run all analyses in parallel for each product
        const [offerData, incrementalData, sentimentData, researchData] = await Promise.all([
          analyzeOfferDensity(product),
          checkIncremental(product),
          analyzeSentiment(product),
          deepResearch(product)
        ]);

        // Find best price and determine if seller has it
        const bestPrice = offerData.bestPrice;
        const productPrice = product.priceNumeric || parseFloat(product.price?.replace(/[$,]/g, '') || 0);
        const bestPriceNum = parseFloat(bestPrice?.price?.replace(/[$,]/g, '') || 0);
        const hasBestOffer = bestPriceNum > 0 ? productPrice <= bestPriceNum : true;
        const priceDifference = bestPriceNum > 0 ? (productPrice - bestPriceNum) / bestPriceNum : 0;

        // Build competitor offers list
        const competitorOffers = offerData.retailers
          ?.filter(r => r.hasProduct && r.estimatedPrice)
          .map(r => ({
            retailer: r.name,
            price: r.estimatedPrice,
            isBest: r.name === bestPrice?.retailer
          })) || [];

        return {
          ...product,
          offerDensity: offerData.offerDensity || 0,
          competitorOffers,
          hasBestOffer,
          priceDifference,
          competitorPrice: bestPrice?.price,
          isIncremental: incrementalData.isIncremental || false,
          walmartAvailable: incrementalData.availableAtWalmart,
          incrementalReason: incrementalData.reason,
          sentiment: sentimentData,
          deepResearch: researchData
        };
      }));

      analyzedProducts.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < productsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Stage 4: Identify opportunities
    onProgress({ stage: 'Finding Opportunities', message: 'Identifying competitive opportunities...', progress: 88 });
    
    const opportunities = identifyOpportunities(analyzedProducts);

    // Stage 5: Compile results
    onProgress({ stage: 'Completing Analysis', message: 'Finalizing report...', progress: 95 });

    // Include all products - analyzed ones with full data, rest with basic data
    const allProductsWithStatus = [
      ...analyzedProducts,
      ...products.slice(50).map(p => ({
        ...p,
        analysisStatus: 'pending',
        offerDensity: null,
        hasBestOffer: null,
        isIncremental: null,
        sentiment: null
      }))
    ];

    const results = {
      sellerInfo: {
        ...sellerData.sellerInfo,
        pagesScanned: sellerData.sellerInfo?.pagesScanned || 1
      },
      products: analyzedProducts, // Fully analyzed products
      allProducts: allProductsWithStatus, // All products (for reference)
      opportunities,
      summary: {
        totalProductsFound: products.length,
        totalProductsAnalyzed: analyzedProducts.length,
        incrementalCount: analyzedProducts.filter(p => p.isIncremental).length,
        bestOfferCount: analyzedProducts.filter(p => p.hasBestOffer).length,
        avgSentiment: analyzedProducts.length > 0 
          ? (analyzedProducts.reduce((sum, p) => sum + (p.sentiment?.score || 0), 0) / analyzedProducts.length).toFixed(1)
          : 'N/A',
        opportunityCount: opportunities.length,
        pagesScanned: sellerData.sellerInfo?.pagesScanned || 1
      }
    };

    onProgress({ stage: 'Complete', message: `Analysis complete! Analyzed ${analyzedProducts.length} of ${products.length} products.`, progress: 100 });

    return results;
  } catch (error) {
    console.error('Seller analysis failed:', error);
    throw error;
  }
}

// Analyze from pasted HTML (user copies from View Source)
export async function analyzeFromHtml(html, sellerUrl, onProgress) {
  try {
    onProgress({ stage: 'Parsing HTML', message: 'Extracting products from pasted HTML...', progress: 10 });
    
    // Try local Cheerio server first (much more reliable than AI parsing)
    let products = [];
    const scraperUp = await isScraperServerUp();
    
    if (scraperUp) {
      console.log('Using local Cheerio server to parse HTML…');
      try {
        const parsed = await parseHtmlViaServer(html, sellerUrl);
        products = parsed.products || [];
        console.log(`Cheerio parsed ${products.length} products from pasted HTML`);
      } catch (err) {
        console.warn('Cheerio parse failed, falling back to AI:', err.message);
      }
    }

    // Fallback: AI-based extraction (sends truncated HTML to Gemini)
    if (products.length === 0) {
      console.log('Falling back to AI-based HTML extraction…');
      const pageData = await extractProductsFromPage(html, 1, sellerUrl);
      products = pageData.productsOnPage || [];
    }
    
    if (!products || products.length === 0) {
      throw new Error('Could not find products in the pasted HTML. Make sure you copied the full page source.');
    }
    
    onProgress({ 
      stage: 'Products Found', 
      message: `Found ${products.length} products. Starting analysis...`, 
      progress: 20 
    });
    
    // Analyze products (reuse the same logic)
    const productsToAnalyze = products.slice(0, 30);
    const analyzedProducts = [];
    const batchSize = 5;
    
    for (let i = 0; i < productsToAnalyze.length; i += batchSize) {
      const batch = productsToAnalyze.slice(i, i + batchSize);
      const progressPercent = 20 + ((i / productsToAnalyze.length) * 60);
      
      onProgress({ 
        stage: 'Analyzing Products', 
        message: `Analyzing ${i + 1}-${Math.min(i + batchSize, productsToAnalyze.length)} of ${productsToAnalyze.length}...`, 
        progress: progressPercent 
      });

      const batchResults = await Promise.all(batch.map(async (product) => {
        const [offerData, incrementalData, sentimentData, researchData] = await Promise.all([
          analyzeOfferDensity(product),
          checkIncremental(product),
          analyzeSentiment(product),
          deepResearch(product)
        ]);

        const bestPrice = offerData.bestPrice;
        const productPrice = product.priceNumeric || parseFloat(product.price?.replace(/[$,]/g, '') || 0);
        const bestPriceNum = parseFloat(bestPrice?.price?.replace(/[$,]/g, '') || 0);
        const hasBestOffer = bestPriceNum > 0 ? productPrice <= bestPriceNum : true;
        const priceDifference = bestPriceNum > 0 ? (productPrice - bestPriceNum) / bestPriceNum : 0;

        const competitorOffers = offerData.retailers
          ?.filter(r => r.hasProduct && r.estimatedPrice)
          .map(r => ({
            retailer: r.name,
            price: r.estimatedPrice,
            isBest: r.name === bestPrice?.retailer
          })) || [];

        return {
          ...product,
          offerDensity: offerData.offerDensity || 0,
          competitorOffers,
          hasBestOffer,
          priceDifference,
          competitorPrice: bestPrice?.price,
          isIncremental: incrementalData.isIncremental || false,
          walmartAvailable: incrementalData.availableAtWalmart,
          incrementalReason: incrementalData.reason,
          sentiment: sentimentData,
          deepResearch: researchData
        };
      }));

      analyzedProducts.push(...batchResults);
    }

    const opportunities = identifyOpportunities(analyzedProducts);

    onProgress({ stage: 'Complete', message: 'Analysis complete!', progress: 100 });

    return {
      sellerInfo: {
        name: 'From Pasted HTML',
        storefront: 'Amazon',
        dataSource: 'Manual HTML Input',
        pagesScanned: 1
      },
      products: analyzedProducts,
      opportunities,
      summary: {
        totalProductsFound: products.length,
        totalProductsAnalyzed: analyzedProducts.length,
        incrementalCount: analyzedProducts.filter(p => p.isIncremental).length,
        bestOfferCount: analyzedProducts.filter(p => p.hasBestOffer).length,
        avgSentiment: analyzedProducts.length > 0 
          ? (analyzedProducts.reduce((sum, p) => sum + (p.sentiment?.score || 0), 0) / analyzedProducts.length).toFixed(1)
          : 'N/A',
        opportunityCount: opportunities.length,
        pagesScanned: 1
      }
    };
  } catch (error) {
    console.error('HTML analysis failed:', error);
    throw error;
  }
}

export { researchSellerWithAI };
export default analyzeSellerStore;
