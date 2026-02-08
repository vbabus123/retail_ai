import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

console.log("🔑 Gemini API Key loaded:", API_KEY ? `${API_KEY.substring(0, 10)}...` : "❌ NOT SET");

if (!API_KEY) {
  console.error("❌ VITE_GEMINI_API_KEY is not set in .env file!");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Use Gemini 2.0 Flash (stable, widely available)
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

// Model with Google Search grounding for real-time research
const groundedModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json"
  },
  tools: [{
    googleSearch: {}
  }]
});

// Helper to call grounded model with Google Search
async function callGroundedGemini(prompt) {
  try {
    const result = await groundedModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract grounding metadata if available
    let groundingMetadata = null;
    if (response.candidates?.[0]?.groundingMetadata) {
      groundingMetadata = response.candidates[0].groundingMetadata;
    }
    
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    parsed._groundingSources = groundingMetadata?.groundingChunks?.map(chunk => ({
      url: chunk.web?.uri,
      title: chunk.web?.title
    })).filter(s => s.url) || [];
    
    return parsed;
  } catch (error) {
    console.error("Grounded search error:", error);
    // Fallback to regular model
    return await callGemini(prompt);
  }
}

// Gemini Embedding Model for semantic similarity
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Helper to call Gemini and parse JSON response
async function callGemini(prompt) {
  try {
    console.log("📡 Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("✅ Gemini response received, length:", text.length);
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    return parsed;
  } catch (error) {
    console.error("❌ Gemini API error:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

// Generate embedding for product text
async function generateEmbedding(text) {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding error:", error);
    return null;
  }
}

// Cosine similarity between two embedding vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Normalize product attributes for comparison
function normalizeAttribute(value) {
  if (!value) return "";
  return value.toString().toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(\d+)\s*(oz|ounce|ounces)/gi, "$1oz")
    .replace(/(\d+)\s*(lb|lbs|pound|pounds)/gi, "$1lb")
    .replace(/(\d+)\s*(ml|milliliter|milliliters)/gi, "$1ml")
    .replace(/(\d+)\s*(l|liter|liters)/gi, "$1l")
    .replace(/(\d+)\s*(g|gram|grams)/gi, "$1g")
    .replace(/(\d+)\s*(kg|kilogram|kilograms)/gi, "$1kg")
    .replace(/(\d+)\s*(in|inch|inches|")/gi, "$1in")
    .replace(/(\d+)\s*(ft|foot|feet|')/gi, "$1ft")
    .replace(/(\d+)\s*(cc|cubic centimeters)/gi, "$1cc")
    .replace(/(\d+)\s*(w|watt|watts)/gi, "$1w")
    .replace(/(\d+)\s*(v|volt|volts)/gi, "$1v")
    .replace(/(\d+)\s*(ct|count|pk|pack)/gi, "$1ct")
    .trim();
}

// Parse and normalize price from various formats
// Handles: "Now $89.99", "$89.99", "89.99", "$1,299.99", etc.
function parsePrice(priceInput) {
  if (priceInput === null || priceInput === undefined) return null;
  
  // If already a number, return it
  if (typeof priceInput === 'number' && !isNaN(priceInput)) {
    return priceInput;
  }
  
  // Convert to string for processing
  let priceStr = String(priceInput).trim();
  
  // Handle "Now $XX.XX" pattern - extract the price after "Now"
  const nowMatch = priceStr.match(/now\s*\$?\s*([\d,]+\.?\d*)/i);
  if (nowMatch) {
    const price = parseFloat(nowMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) {
      console.log(`Parsed "Now" price: ${priceStr} -> $${price}`);
      return price;
    }
  }
  
  // Handle "Was $XX.XX" - we want to SKIP this and look for current price
  // This shouldn't be the main price, but log it for debugging
  if (priceStr.match(/was\s*\$?\s*([\d,]+\.?\d*)/i)) {
    console.log(`Warning: "Was" price detected, this might be old price: ${priceStr}`);
  }
  
  // Handle standard "$XX.XX" or "$X,XXX.XX" format
  const dollarMatch = priceStr.match(/\$\s*([\d,]+\.?\d*)/);
  if (dollarMatch) {
    const price = parseFloat(dollarMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) {
      console.log(`Parsed dollar price: ${priceStr} -> $${price}`);
      return price;
    }
  }
  
  // Handle plain number "89.99" or "1,299.99"
  const numMatch = priceStr.match(/([\d,]+\.?\d*)/);
  if (numMatch) {
    const price = parseFloat(numMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) {
      console.log(`Parsed numeric price: ${priceStr} -> $${price}`);
      return price;
    }
  }
  
  console.log(`Could not parse price: ${priceStr}`);
  return null;
}

// Format price as currency string
function formatPrice(price) {
  const numPrice = parsePrice(price);
  if (numPrice === null) return 'N/A';
  return `$${numPrice.toFixed(2)}`;
}

// Create standardized product signature for embedding
function createProductSignature(product) {
  const parts = [
    product.brand,
    product.productName,
    product.model,
    product.keySpecs?.dimension1,
    product.keySpecs?.dimension2,
    product.keySpecs?.powerType,
    product.keySpecs?.engineSize,
    product.keySpecs?.capacity,
    product.category
  ].filter(Boolean).map(normalizeAttribute);
  return parts.join(" ");
}

// Fetch and extract detailed specs from a product page
async function extractProductSpecs(url, retailer) {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(12000)
    });
    
    if (!response.ok) return null;
    const html = await response.text();
    
    // Extract specs section from HTML using Gemini
    const specsPrompt = `Extract ALL product specifications from this ${retailer} product page HTML.

HTML SECTIONS TO LOOK FOR:
1. WALMART:
   - "Specs" section with details like Horsepower, Engine make, Weight, Brand, Height, etc.
   - "Product details" under "About this item"
   - Product title and description
   
2. AMAZON:
   - Technical Details table (Brand, Power Source, Material, Color, Style, Weight, Dimensions)
   - "About this item" bullet points
   - Product title
   - Price (look for current/sale price)

3. PRICE EXTRACTION (IMPORTANT):
   - Look for "Now $XX.XX" - this is the CURRENT SELLING PRICE
   - Look for "Was $XX.XX" or strikethrough prices - this is the ORIGINAL/LIST PRICE
   - Look for "You save $XX.XX" or "Save $XX" - this is the DISCOUNT AMOUNT
   - The CURRENT PRICE is what matters - NOT the "was" price
   - Examples: "Now $89.99" means current price is $89.99
   - If you see "$89.99 $133.99" - the first/lower price is usually the current price

4. GENERAL:
   - Any specification tables
   - Product features lists
   - Technical specifications

HTML CONTENT (truncated):
${html.substring(0, 15000)}

Return JSON:
{
  "productTitle": "full product name from page",
  "brand": "brand name",
  "price": "CURRENT selling price as number (e.g., 89.99) - NOT the 'was' or 'list' price",
  "priceFormatted": "formatted current price (e.g., $89.99)",
  "originalPrice": "original/was price if on sale (e.g., 133.99), null if not on sale",
  "savings": "discount amount if shown (e.g., 44.00), null if not on sale",
  "priceNote": "e.g., 'On sale', 'Clearance', 'Rollback', null if regular price",
  "specs": {
    "powerSource": "gas/electric/battery/manual",
    "engineSize": "e.g., 144cc, 3.4 HP",
    "cuttingWidth": "e.g., 18 in, 21 in",
    "weight": "e.g., 38 lb, 43.4 lbs",
    "dimensions": "e.g., 27.2D x 22.2W x 14.2H",
    "material": "e.g., Metal, Plastic",
    "color": "e.g., Blue, Red",
    "cuttingPositions": "e.g., 3, 5-position",
    "selfPropelled": "yes/no",
    "bagIncluded": "yes/no",
    "otherSpecs": {}
  },
  "aboutThisItem": ["bullet point 1", "bullet point 2"],
  "productDescription": "short product description",
  "availabilityStatus": "In Stock/Out of Stock/Limited"
}

Only return valid JSON.`;

    const specs = await callGemini(specsPrompt);
    return specs;
  } catch (error) {
    console.log("Spec extraction error:", error.message);
    return null;
  }
}

// Compare two products using semantic similarity
async function compareProductsSemantically(sourceProduct, targetProduct) {
  // Create text representations
  const sourceText = [
    sourceProduct.brand,
    sourceProduct.productTitle || sourceProduct.productName,
    sourceProduct.specs?.powerSource,
    sourceProduct.specs?.engineSize,
    sourceProduct.specs?.cuttingWidth,
    sourceProduct.specs?.weight,
    ...(sourceProduct.aboutThisItem || [])
  ].filter(Boolean).join(" ");
  
  const targetText = [
    targetProduct.brand,
    targetProduct.productTitle || targetProduct.productName,
    targetProduct.specs?.powerSource,
    targetProduct.specs?.engineSize,
    targetProduct.specs?.cuttingWidth,
    targetProduct.specs?.weight,
    ...(targetProduct.aboutThisItem || [])
  ].filter(Boolean).join(" ");
  
  // Generate embeddings and compare
  const [sourceEmb, targetEmb] = await Promise.all([
    generateEmbedding(sourceText),
    generateEmbedding(targetText)
  ]);
  
  const similarity = cosineSimilarity(sourceEmb, targetEmb);
  
  // Also do spec-by-spec comparison
  const specMatch = {
    brandMatch: sourceProduct.brand?.toLowerCase() === targetProduct.brand?.toLowerCase(),
    powerMatch: sourceProduct.specs?.powerSource === targetProduct.specs?.powerSource,
    sizeMatch: normalizeAttribute(sourceProduct.specs?.cuttingWidth) === normalizeAttribute(targetProduct.specs?.cuttingWidth),
    engineMatch: normalizeAttribute(sourceProduct.specs?.engineSize) === normalizeAttribute(targetProduct.specs?.engineSize),
  };
  
  const matchScore = (specMatch.brandMatch ? 25 : 0) + 
                     (specMatch.powerMatch ? 25 : 0) + 
                     (specMatch.sizeMatch ? 25 : 0) + 
                     (specMatch.engineMatch ? 25 : 0);
  
  return {
    semanticSimilarity: similarity,
    specMatchScore: matchScore,
    specDetails: specMatch,
    overallScore: (similarity * 50) + (matchScore * 0.5)
  };
}

// Sanitize URLs to remove UPC codes and ensure proper search format
function sanitizeProductUrl(url, product, retailer) {
  if (!url) return generateProductUrl(product, retailer);
  
  // Check if URL contains likely UPC/GTIN (10-14 digit number)
  const upcPattern = /[?&=+](\d{10,14})(?:[&\s+]|$)/g;
  const hasUpc = upcPattern.test(url);
  
  if (hasUpc) {
    // URL contains UPC, regenerate with product name
    return generateProductUrl(product, retailer);
  }
  
  return url;
}

// Smart HTML section extraction - find price-relevant sections
function extractPriceRelevantHtml(html, retailer) {
  // Remove script, style, and other non-content tags to reduce noise
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '');

  const sections = [];
  
  // 1. Look for JSON-LD structured data (most reliable for prices)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    sections.push('JSON-LD DATA:\n' + jsonLdMatch.slice(0, 2).join('\n'));
  }
  
  // 2. Look for price-related elements by class/id patterns
  const pricePatterns = [
    // Amazon patterns
    /class="[^"]*a-price[^"]*"[^>]*>[\s\S]{0,500}/gi,
    /class="[^"]*price[^"]*"[^>]*>[\s\S]{0,300}/gi,
    /id="[^"]*price[^"]*"[^>]*>[\s\S]{0,300}/gi,
    /data-csa-c-price[^>]*>[\s\S]{0,200}/gi,
    // Walmart patterns
    /itemprop="price"[^>]*[\s\S]{0,200}/gi,
    /class="[^"]*prod-price[^"]*"[^>]*>[\s\S]{0,300}/gi,
    // Generic patterns
    /\$\d{1,4}\.\d{2}[\s\S]{0,100}/g,
  ];
  
  for (const pattern of pricePatterns) {
    const matches = cleanHtml.match(pattern);
    if (matches) {
      sections.push(matches.slice(0, 5).join('\n'));
    }
  }
  
  // 3. Look for product title/name sections to verify we have the right product
  const titlePatterns = [
    /<h1[^>]*>[\s\S]{0,500}<\/h1>/gi,
    /id="productTitle"[^>]*>[\s\S]{0,300}/gi,
    /class="[^"]*product-title[^"]*"[^>]*>[\s\S]{0,300}/gi,
    /<title>[\s\S]{0,200}<\/title>/gi,
  ];
  
  for (const pattern of titlePatterns) {
    const matches = cleanHtml.match(pattern);
    if (matches) {
      sections.push('PRODUCT TITLE:\n' + matches[0]);
      break;
    }
  }
  
  // Combine sections, limit to reasonable size
  const combined = sections.join('\n---\n').substring(0, 6000);
  
  return combined || cleanHtml.substring(0, 5000);
}

// Use Gemini for intelligent entity extraction from HTML
async function extractPriceWithAI(html, retailer, productName, expectedSpecs = {}) {
  try {
    // Extract price-relevant sections from HTML
    const relevantHtml = extractPriceRelevantHtml(html, retailer);
    
    const extractPrompt = `You are an expert at extracting product pricing data from retailer HTML.

TASK: Extract the current selling price for this product from the ${retailer} webpage HTML.

TARGET PRODUCT: "${productName}"
Expected specs: ${JSON.stringify(expectedSpecs)}

EXTRACTION RULES:
1. Find the MAIN product price (current selling price, not "was" price, not "list" price)
2. Verify this is the correct product by matching the product title/name
3. Look for these patterns in order of reliability:
   
   WALMART patterns (IMPORTANT):
   - "Now $XX.XX" - this IS the current price
   - "Was $XX.XX" with strikethrough - this is the OLD price, IGNORE for current price
   - "You save $XX" - indicates a sale, current price is BEFORE this text
   - itemprop="price" content="XXX.XX"
   - "currentPrice": XXX.XX in JSON
   - class="price-characteristic" content="XXX"
   - JSON-LD structured data with {"price": XXX}
   
   AMAZON patterns:
   - <span class="a-offscreen">$XXX.XX</span> (most reliable)
   - data-csa-c-price-to-pay="XXX.XX"
   - class="a-price-whole">XXX</span> + class="a-price-fraction">XX
   - JSON-LD: "price": XXX.XX or "lowPrice": XXX.XX
   
   HOME DEPOT / LOWES patterns:
   - class="price__dollars" or similar
   - data-price="XXX.XX"

4. The price should be reasonable for the product category (lawn mowers: $150-$800)

HTML CONTENT:
${relevantHtml}

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "productFound": "exact product name found in HTML",
  "priceFound": 209.00,
  "priceType": "current_price / sale_price / regular_price",
  "confidence": "high / medium / low",
  "extractedFrom": "element or pattern that contained the price",
  "matchQuality": "exact_match / partial_match / uncertain"
}

If price cannot be found: {"productFound": null, "priceFound": null, "confidence": "none"}`;

    const result = await model.generateContent(extractPrompt);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    
    if (parsed.priceFound && parsed.priceFound >= 1 && parsed.priceFound <= 15000) {
      console.log(`AI extracted ${retailer}: $${parsed.priceFound} (${parsed.confidence}, ${parsed.matchQuality}, from: ${parsed.extractedFrom})`);
      return {
        price: parsed.priceFound,
        confidence: parsed.confidence,
        matchQuality: parsed.matchQuality,
        productFound: parsed.productFound
      };
    }
    return null;
  } catch (error) {
    console.log(`AI price extraction failed for ${retailer}:`, error.message);
    return null;
  }
}

// Fetch real price from a retailer webpage using a CORS proxy
async function fetchRealPrice(url, retailer, productName = '') {
  if (!url) return null;
  
  try {
    // Try multiple CORS proxies in order
    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    ];
    
    let html = null;
    
    for (const makeProxyUrl of proxies) {
      try {
        const proxyUrl = makeProxyUrl(url);
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(8000)
        });
        
        if (response.ok) {
          html = await response.text();
          if (html && html.length > 1000) {
            console.log(`Fetched ${retailer} page via proxy (${html.length} chars)`);
            break;
          }
        }
      } catch (e) {
        console.log(`Proxy failed for ${retailer}, trying next...`);
      }
    }
    
    if (!html || html.length < 1000) {
      console.log(`Could not fetch ${retailer} page`);
      return null;
    }
    
    // First try quick regex extraction for common patterns
    let price = null;
    
    // ===== STEP 1: Extract JSON-LD structured data (most reliable) =====
    // Look for <script type="application/ld+json"> tags and parse them
    const jsonLdScripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    if (jsonLdScripts && jsonLdScripts.length > 0) {
      for (const script of jsonLdScripts) {
        try {
          // Extract JSON content from script tag
          const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (jsonMatch && jsonMatch[1]) {
            const jsonContent = jsonMatch[1].trim();
            const data = JSON.parse(jsonContent);
            
            // Handle array of objects or single object
            const items = Array.isArray(data) ? data : [data];
            
            for (const item of items) {
              // Check for Offer type with price (Walmart pattern)
              // Example: {"@type":"Offer","priceCurrency":"USD","price":209.99,...}
              if (item['@type'] === 'Offer' && item.price) {
                price = parseFloat(item.price);
                if (price >= 1 && price <= 15000) {
                  console.log(`JSON-LD Offer extracted price: $${price} (${item.priceCurrency || 'USD'})`);
                  return { 
                    price, 
                    confidence: 'high', 
                    matchQuality: 'json_ld_offer',
                    currency: item.priceCurrency || 'USD',
                    availability: item.availability
                  };
                }
              }
              
              // Check for Product type with offers
              // Example: {"@type":"Product","offers":{"@type":"Offer","price":209.99}}
              if (item['@type'] === 'Product' && item.offers) {
                const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const offer of offers) {
                  if (offer.price) {
                    price = parseFloat(offer.price);
                    if (price >= 1 && price <= 15000) {
                      console.log(`JSON-LD Product.offers extracted price: $${price}`);
                      return { 
                        price, 
                        confidence: 'high', 
                        matchQuality: 'json_ld_product_offer',
                        productName: item.name,
                        currency: offer.priceCurrency || 'USD'
                      };
                    }
                  }
                  // Check for lowPrice/highPrice (aggregate offers)
                  if (offer.lowPrice) {
                    price = parseFloat(offer.lowPrice);
                    if (price >= 1 && price <= 15000) {
                      console.log(`JSON-LD lowPrice extracted: $${price}`);
                      return { 
                        price, 
                        confidence: 'high', 
                        matchQuality: 'json_ld_low_price',
                        highPrice: offer.highPrice,
                        currency: offer.priceCurrency || 'USD'
                      };
                    }
                  }
                }
              }
              
              // Check for ProductGroup with offers (Walmart variant products)
              if (item['@type'] === 'ProductGroup' && item.offers) {
                const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
                for (const offer of offers) {
                  if (offer.price) {
                    price = parseFloat(offer.price);
                    if (price >= 1 && price <= 15000) {
                      console.log(`JSON-LD ProductGroup.offers extracted price: $${price}`);
                      return { 
                        price, 
                        confidence: 'high', 
                        matchQuality: 'json_ld_product_group',
                        productName: item.name,
                        currency: offer.priceCurrency || 'USD'
                      };
                    }
                  }
                }
              }
            }
          }
        } catch (parseError) {
          // JSON parsing failed, continue to next script
          console.log('JSON-LD parse error, trying next...');
        }
      }
    }
    
    // ===== STEP 2: Regex patterns as fallback =====
    
    // Amazon quick patterns
    if (url.includes('amazon.com')) {
      const quickPatterns = [
        /<span class="a-offscreen">\$(\d+\.?\d*)<\/span>/i,
        /data-csa-c-price-to-pay="(\d+\.?\d*)"/i,
        /class="a-price-whole">(\d+).*?class="a-price-fraction">(\d{2})/is,
      ];
      for (const pattern of quickPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = match[2] ? parseFloat(`${match[1]}.${match[2]}`) : parseFloat(match[1]);
          if (price >= 1 && price <= 15000) {
            console.log(`Quick regex extracted Amazon price: $${price}`);
            return { price, confidence: 'high', matchQuality: 'regex_match' };
          }
        }
      }
    }
    
    // Walmart quick patterns  
    if (url.includes('walmart.com')) {
      const quickPatterns = [
        // JSON-LD Offer pattern: {"@type":"Offer",...,"price":209.99,...}
        /"@type"\s*:\s*"Offer"[^}]*"price"\s*:\s*(\d+\.?\d*)/i,
        // Alternative: price comes before type
        /"price"\s*:\s*(\d+\.?\d*)[^}]*"@type"\s*:\s*"Offer"/i,
        // Standard patterns
        /itemprop="price"[^>]*content="(\d+\.?\d*)"/i,
        /"currentPrice"\s*:\s*(\d+\.?\d*)/i,
        /data-price="(\d+\.?\d*)"/i,
        /"priceInfo"[^}]*"currentPrice"[^}]*"price"\s*:\s*(\d+\.?\d*)/i,
        // Schema.org price pattern
        /"priceCurrency"\s*:\s*"USD"\s*,\s*"price"\s*:\s*(\d+\.?\d*)/i,
        /"price"\s*:\s*(\d+\.?\d*)\s*,\s*"priceCurrency"\s*:\s*"USD"/i,
      ];
      for (const pattern of quickPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = parseFloat(match[1]);
          if (price >= 1 && price <= 15000) {
            console.log(`Quick regex extracted Walmart price: $${price}`);
            return { price, confidence: 'high', matchQuality: 'regex_match' };
          }
        }
      }
    }
    
    // Home Depot quick patterns
    if (url.includes('homedepot.com')) {
      const quickPatterns = [
        /"price":\s*(\d+\.?\d*)/i,
        /class="[^"]*price[^"]*"[^>]*>\s*\$(\d+\.?\d*)/i,
      ];
      for (const pattern of quickPatterns) {
        const match = html.match(pattern);
        if (match) {
          price = parseFloat(match[1]);
          if (price >= 1 && price <= 15000) {
            console.log(`Quick regex extracted Home Depot price: $${price}`);
            return { price, confidence: 'high', matchQuality: 'regex_match' };
          }
        }
      }
    }
    
    // Fallback to AI extraction if regex fails
    console.log(`Regex failed for ${retailer}, using AI entity extraction...`);
    return await extractPriceWithAI(html, retailer, productName);
    
  } catch (error) {
    console.log(`Error fetching ${retailer} price:`, error.message);
    return null;
  }
}

// Fetch prices for all competitor matches in parallel
async function enrichWithRealPrices(competitorData, onProgress) {
  if (!competitorData?.competitorGraph) return competitorData;
  
  const allMatches = [
    ...(competitorData.competitorGraph.exactMatches || []),
    ...(competitorData.competitorGraph.similarMatches || []),
    ...(competitorData.competitorGraph.closeSubstitutes || [])
  ].filter(m => m.url);
  
  if (allMatches.length === 0) return competitorData;
  
  onProgress({ 
    stage: "fetching_prices", 
    message: `Fetching live prices from ${allMatches.length} retailer pages...`, 
    progress: 38 
  });
  
  // Fetch prices in parallel (limit to 8 to get more coverage including substitutes)
  const pricePromises = allMatches.slice(0, 8).map(async (match) => {
    const priceResult = await fetchRealPrice(match.url, match.retailer, match.productName || match.product);
    return { match, priceResult };
  });
  
  const results = await Promise.allSettled(pricePromises);
  
  // Update matches with real prices
  let pricesFound = 0;
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.priceResult) {
      const { match, priceResult } = result.value;
      
      // Handle both old (number) and new (object) formats
      const price = typeof priceResult === 'object' ? priceResult.price : priceResult;
      const confidence = typeof priceResult === 'object' ? priceResult.confidence : 'high';
      const matchQuality = typeof priceResult === 'object' ? priceResult.matchQuality : 'unknown';
      const productFound = typeof priceResult === 'object' ? priceResult.productFound : null;
      
      if (price && price >= 1 && price <= 15000) {
        match.estimatedPrice = match.price; // Keep original as estimate
        match.price = `$${price.toFixed(2)}`;
        match.priceVerified = true;
        match.priceConfidence = confidence;
        match.priceMatchQuality = matchQuality;
        match.priceSource = "Live retailer page";
        if (productFound) {
          match.verifiedProductName = productFound;
        }
        pricesFound++;
      }
    }
  });
  
  onProgress({ 
    stage: "prices_fetched", 
    message: `Verified ${pricesFound} live prices from retailers`, 
    progress: 39 
  });
  
  console.log(`Enriched ${pricesFound} of ${allMatches.length} matches with real prices`);
  return competitorData;
}

// Generate proper search URL using product name and attributes
function generateProductUrl(product, retailer) {
  const productInfo = product || {};
  const searchTerms = [
    productInfo.brand,
    productInfo.model || productInfo.productName?.split(" ").slice(0, 5).join(" "),
    productInfo.keySpecs?.dimension1,
    productInfo.keySpecs?.powerType
  ].filter(Boolean).join(" ");
  
  const encoded = encodeURIComponent(searchTerms).replace(/%20/g, "+");
  const retailerLower = (retailer || "amazon").toLowerCase();
  
  const urlTemplates = {
    amazon: `https://www.amazon.com/s?k=${encoded}`,
    walmart: `https://www.walmart.com/search?q=${encoded}`,
    target: `https://www.target.com/s?searchTerm=${encoded}`,
    "home depot": `https://www.homedepot.com/s/${encodeURIComponent(searchTerms)}`,
    homedepot: `https://www.homedepot.com/s/${encodeURIComponent(searchTerms)}`,
    lowes: `https://www.lowes.com/search?searchTerm=${encoded}`,
    "best buy": `https://www.bestbuy.com/site/searchpage.jsp?st=${encoded}`,
    bestbuy: `https://www.bestbuy.com/site/searchpage.jsp?st=${encoded}`,
    costco: `https://www.costco.com/CatalogSearch?keyword=${encoded}`,
    "sam's club": `https://www.samsclub.com/s/${encoded}`,
    samsclub: `https://www.samsclub.com/s/${encoded}`
  };
  
  return urlTemplates[retailerLower] || urlTemplates.amazon;
}

// Enhanced Product Intelligence Analysis
export async function analyzeProductEnhanced(url, onProgress) {
  
  // Stage 1: Parse URL & Extract UPC/GTIN + Attributes
  onProgress({ stage: "parsing", message: "Extracting UPC/GTIN and product attributes...", progress: 5 });

  const parsePrompt = `Analyze this product URL and extract detailed product information: ${url}

CRITICAL: Extract UPC/GTIN/EAN barcode if visible in the URL or if you know it for this product.
The UPC/GTIN is the gold standard for exact product matching across retailers.

Return JSON:
{
  "retailer": "Amazon/Walmart/BestBuy/Target/HomeDepot/Lowes/other",
  "productName": "full product name",
  "brand": "brand name",
  "model": "model number if found",
  "sku": "retailer SKU if found",
  "upc": "12-digit UPC barcode if known (e.g., 012345678901)",
  "gtin": "14-digit GTIN if known",
  "ean": "13-digit EAN if known (European)",
  "mpn": "Manufacturer Part Number if known",
  "category": "product category",
  "subcategory": "specific subcategory",
  "keySpecs": {
    "dimension1": "primary dimension with unit (e.g., 18in cutting blade)",
    "dimension2": "secondary dimension with unit (e.g., 19in cutting deck)",
    "powerType": "gas/electric/battery/manual/corded/cordless",
    "engineSize": "e.g., 144cc, 500W, 20V, etc.",
    "capacity": "with unit (e.g., 64GB, 5.0 cu ft, 12oz)",
    "weight": "with unit if relevant",
    "color": "if specified",
    "material": "if relevant",
    "otherSpec": "any other key differentiating spec"
  },
  "normalizedSpecs": {
    "sizeValue": "numeric size value only (e.g., 18)",
    "sizeUnit": "unit (e.g., in, ft, mm)",
    "powerValue": "numeric power value (e.g., 144, 500)",
    "powerUnit": "unit (e.g., cc, W, V)",
    "capacityValue": "numeric capacity",
    "capacityUnit": "unit"
  },
  "priceClues": "any price info visible",
  "productUrl": "${url}"
}

Only return valid JSON.`;

  let product;
  try {
    console.log("🔍 Parsing product URL:", url);
    product = await callGemini(parsePrompt);
    console.log("✅ Product parsed:", product.productName, "by", product.brand);
  } catch (parseError) {
    console.error("❌ Product parsing failed:", parseError.message);
    // Try to extract basic info from URL
    const urlParts = url.split("/");
    const lastPart = urlParts.pop() || urlParts.pop() || "product";
    const productNameFromUrl = lastPart
      .replace(/-/g, " ")
      .replace(/\d{5,}/g, "") // Remove long numbers (product IDs)
      .trim();
    
    product = { 
      retailer: url.includes("walmart") ? "Walmart" : 
                url.includes("amazon") ? "Amazon" : 
                url.includes("homedepot") ? "Home Depot" : 
                url.includes("lowes") ? "Lowes" : 
                url.includes("target") ? "Target" : 
                url.includes("bestbuy") ? "Best Buy" : "Unknown",
      productName: productNameFromUrl || "Unknown Product", 
      brand: "Unknown", 
      category: "Retail", 
      productUrl: url 
    };
    console.log("⚠️ Using fallback product info:", product);
  }

  onProgress({ 
    stage: "parsed", 
    message: `Identified: ${product.productName}${product.upc ? ` (UPC: ${product.upc})` : ''}`, 
    progress: 10,
    data: product 
  });

  // Stage 1.5: Extract detailed specs from source product page
  onProgress({ stage: "extracting_specs", message: "Extracting detailed specs from product page...", progress: 12 });
  
  let detailedSpecs = null;
  try {
    detailedSpecs = await extractProductSpecs(url, product.retailer);
    if (detailedSpecs) {
      // Merge detailed specs into product object
      product.detailedSpecs = detailedSpecs.specs;
      product.aboutThisItem = detailedSpecs.aboutThisItem;
      // Parse the price properly - handles "Now $89.99", "$89.99", etc.
      product.extractedPrice = parsePrice(detailedSpecs.price);
      product.extractedPriceFormatted = formatPrice(detailedSpecs.price);
      product.originalPrice = parsePrice(detailedSpecs.originalPrice);
      product.savings = parsePrice(detailedSpecs.savings);
      product.priceNote = detailedSpecs.priceNote;
      product.productDescription = detailedSpecs.productDescription;
      console.log("Extracted detailed specs:", JSON.stringify(detailedSpecs.specs));
      console.log(`Extracted price: ${product.extractedPriceFormatted} (was: ${detailedSpecs.originalPrice || 'N/A'}, savings: ${detailedSpecs.savings || 'N/A'})`);
    }
  } catch (specError) {
    console.log("Detailed spec extraction skipped:", specError.message);
  }

  // Stage 2: Generate embedding for source product
  onProgress({ stage: "embedding", message: "Generating product embedding for semantic matching...", progress: 15 });
  
  const productSignature = createProductSignature(product);
  const sourceEmbedding = await generateEmbedding(productSignature);

  // Stage 3: Find Competitor Listings with UPC/GTIN Priority
  onProgress({ stage: "competitors", message: "Searching retailers by UPC/GTIN and attributes...", progress: 20 });

  // Build specs string for matching
  const specsString = product.keySpecs ? 
    Object.entries(product.keySpecs).filter(([k,v]) => v).map(([k,v]) => `${k}: ${v}`).join(", ") : 
    "specs not specified";

  const competitorPrompt = `For the product "${product.productName}" by ${product.brand} (Model: ${product.model || 'N/A'}) in category ${product.category}:

SOURCE PRODUCT DETAILS:
- Retailer: ${product.retailer}
- Current Price: ${product.extractedPriceFormatted || product.price || 'Not available'}
- Original Price: ${product.originalPrice ? formatPrice(product.originalPrice) : 'N/A (not on sale)'}
- Savings: ${product.savings ? formatPrice(product.savings) : 'N/A'}
- Price Note: ${product.priceNote || 'Regular price'}

SOURCE PRODUCT IDENTIFIERS:
- UPC/Barcode: ${product.upc || 'Not available'}
- GTIN: ${product.gtin || 'Not available'}  
- MPN: ${product.mpn || 'Not available'}
- Model: ${product.model || 'Not available'}
- Brand: ${product.brand}
- Key Specs: ${specsString}

MATCHING HIERARCHY (in priority order):

1. **UPC/GTIN EXACT MATCH** (Gold Standard - 100% confidence)
   - If UPC ${product.upc || 'is known'}, find the EXACT same UPC at other retailers
   - Same UPC = identical product, guaranteed
   - Check: Walmart, Amazon, Target, Home Depot, Lowes, Best Buy

2. **MPN + Brand EXACT MATCH** (95% confidence)
   - Same manufacturer part number AND same brand
   - Example: Same "LSPG-L1" model from SENIX at different stores

3. **Attribute-Based MATCH** (80-90% confidence)
   - Same brand + Same size + Same power type + Similar specs
   - Normalize units: 18in = 18", 144cc ≈ 140cc (within 10%)

4. **Semantic Similar Products** (60-80% confidence)
   - Different brand but very similar specs for price comparison
   - Must match: power type (gas/electric), approximate size, category

⚠️ PRICING RULES - USE MSRP/TYPICAL RETAIL PRICES:
- Use the product's MSRP (Manufacturer Suggested Retail Price) when known
- Use typical retail prices based on product category and specs
- For lawn mowers: 18" gas push mowers typically $199-$299 range
- Prices should be realistic for the product category
- If unsure, use a typical market price for that product type
- DO NOT make up random low prices - use realistic market pricing

⚠️ CRITICAL URL RULES - DO NOT USE UPC/GTIN IN SEARCH URLS!
Retailers do NOT support searching by UPC code in their search bars.

CORRECT URL FORMAT (use product name + specs):
- Amazon: https://www.amazon.com/s?k=SENIX+18+inch+144cc+gas+push+lawn+mower
- Walmart: https://www.walmart.com/search?q=SENIX+LSPG-L1+18+inch+gas+mower
- Home Depot: https://www.homedepot.com/s/SENIX%20gas%20lawn%20mower
- Lowes: https://www.lowes.com/search?searchTerm=SENIX+gas+push+mower
- Target: https://www.target.com/s?searchTerm=SENIX+lawn+mower
- Best Buy: https://www.bestbuy.com/site/searchpage.jsp?st=product+name

WRONG (never do this):
- ❌ amazon.com/s?k=810053120194
- ❌ walmart.com/search?q=810053120194
- ❌ Including UPC/GTIN numbers in any search URL

Return JSON:
{
  "matchMethod": "UPC_MATCH / MPN_MATCH / ATTRIBUTE_MATCH / SEMANTIC_MATCH / NO_EXACT_MATCH",
  "sourceProduct": {
    "name": "${product.productName}",
    "brand": "${product.brand}",
    "upc": "${product.upc || 'unknown'}",
    "normalizedSpecs": "18in gas 144cc push mower"
  },
  "competitorGraph": {
    "exactMatches": [
      {
        "retailer": "Amazon/Walmart/Target/HomeDepot/Lowes/BestBuy (MUST be DIFFERENT from ${product.retailer})",
        "productName": "exact product name at this retailer",
        "brand": "Brand name",
        "model": "Model number if known",
        "matchType": "UPC_MATCH / MPN_MATCH / ATTRIBUTE_MATCH",
        "matchConfidence": 100,
        "upcMatched": "matching UPC if verified",
        "price": "$XXX.XX (use MSRP or typical retail price for this product)",
        "searchTerms": "BRAND MODEL SIZE SPECS (words to search, e.g., 'Craftsman M105 21 inch gas mower')",
        "availability": "In Stock/Out of Stock",
        "promoActive": true,
        "promoDetails": "specific promo",
        "evidenceSource": "UPC lookup / Product page"
      }
    ],
    "similarMatches": [
      {
        "product": "Same brand, different variant AT COMPETITOR RETAILER",
        "brand": "${product.brand}",
        "model": "Model number",
        "retailer": "MUST be DIFFERENT retailer from ${product.retailer} - Amazon/Walmart/Target/HomeDepot/Lowes",
        "matchType": "SAME_BRAND_VARIANT",
        "matchConfidence": 85,
        "price": "$XXX.XX",
        "differentiator": "What's different: 21in vs 18in, 170cc vs 144cc",
        "searchTerms": "BRAND MODEL SIZE SPECS (words to search)",
        "normalizedSpecs": "21in gas 170cc push mower"
      }
    ],
    "closeSubstitutes": [
      {
        "product": "Competing product with similar specs AT COMPETITOR RETAILER",
        "brand": "Craftsman/Troy-Bilt/Husqvarna/etc (DIFFERENT brand from ${product.brand})",
        "model": "Model number like M105, TB130, etc.",
        "retailer": "MUST be DIFFERENT retailer from ${product.retailer} - Amazon/Walmart/Target/HomeDepot/Lowes",
        "matchType": "SIMILAR_CATEGORY",
        "matchConfidence": 75,
        "price": "$XXX.XX",
        "specsMatch": "Same: gas, push mower, similar size",
        "specsDiffer": "Different: brand, slightly different cc/size",
        "searchTerms": "BRAND MODEL SIZE cc SPECS (e.g., 'Troy-Bilt TB130 21 inch 140cc gas mower')",
        "normalizedSpecs": "18in gas 140cc push mower",
        "whyCompetitor": "Direct competitor - same category, similar specs, available at other retailers",
        "threatLevel": "High/Medium/Low"
      }
    ]
  },
  "categoryPromotions": {
    "activeDeals": [
      {
        "retailer": "Home Depot / Lowes / Amazon / etc",
        "brand": "Brand running the promotion",
        "product": "Specific product on sale",
        "originalPrice": "$XXX.XX",
        "salePrice": "$XXX.XX",
        "discount": "XX% off or $XX off",
        "promoType": "Clearance / Seasonal Sale / Bundle Deal / Rollback / Lightning Deal",
        "validUntil": "End date if known",
        "url": "https://retailer.com/search?q=product+name",
        "threatToSource": "High/Medium/Low - how much this threatens the source product"
      }
    ],
    "upcomingPromos": [
      {
        "event": "Memorial Day Sale / Black Friday / Spring Sale / etc",
        "expectedDate": "When it typically happens",
        "expectedDiscounts": "Typical discount range for this category",
        "retailersParticipating": ["Home Depot", "Lowes", "Amazon"]
      }
    ],
    "bundleDeals": [
      {
        "retailer": "Retailer name",
        "bundle": "Lawn mower + trimmer bundle",
        "totalValue": "$XXX if bought separately",
        "bundlePrice": "$XXX as bundle",
        "savings": "$XX saved",
        "url": "link to bundle"
      }
    ]
  },
  "matchingSummary": {
    "exactMatchesFound": true/false,
    "matchMethod": "Found via UPC / Found via MPN / Found via attributes / No exact match",
    "bestAlternative": "If no exact, name closest match with similarity score",
    "priceComparisonReady": true/false
  },
  "pricePosition": {
    "sourceProduct": {
      "name": "${product.productName}",
      "retailer": "${product.retailer}",
      "price": "${product.extractedPriceFormatted || product.price || '$XX.XX'}",
      "originalPrice": "${product.originalPrice ? formatPrice(product.originalPrice) : 'null'}",
      "onSale": ${product.priceNote ? 'true' : 'false'}
    },
    "referenceProduct": {
      "name": "Lowest priced similar product used for comparison",
      "retailer": "Retailer where this product is sold",
      "price": "$XXX.XX",
      "searchTerms": "Search terms to find this product"
    },
    "calculation": {
      "step1": "Source product price: ${product.extractedPriceFormatted || '$XX.XX'} at ${product.retailer}",
      "step2": "Reference product price: $XXX.XX (lowest similar product at [retailer])",
      "step3": "Price Index Formula: (Source Price / Reference Price) × 100",
      "step4": "Calculation: ($XX.XX / $XX.XX) × 100 = XXX",
      "step5": "Result: Price Index = XXX (XX% above/below reference)"
    },
    "priceIndex": 107,
    "percentageDifference": "+7%",
    "interpretation": "7% above lowest price for similar product",
    "recommendation": "Consider price adjustment or highlight value-adds to justify premium"
  }
}

RETAILERS TO CHECK: Walmart, Amazon, Target, Home Depot, Lowes, Best Buy, Costco, Sam's Club

⚠️ CRITICAL REMINDERS:
1. Generate URLs using PRODUCT NAME and SPECS only - NEVER include UPC/GTIN codes in URLs!
2. SOURCE RETAILER IS: ${product.retailer}
3. For ALL competitor products (exactMatches, similarMatches, closeSubstitutes):
   - MUST be at DIFFERENT retailers from ${product.retailer}
   - If source is Walmart → show products at Amazon, Home Depot, Lowes, Target, etc.
   - If source is Amazon → show products at Walmart, Home Depot, Lowes, Target, etc.
   - NEVER show products from ${product.retailer} in the competitor lists
4. For closeSubstitutes, find competing products that:
   - Are in the same category (e.g., gas push lawn mower)
   - Have similar specifications (size, power type, features)
   - Are from different brands (competitive products)
   - Are available at competitor retailers (NOT ${product.retailer})
5. Include at least 3-5 closeSubstitutes from major competitor retailers
4. Include "retailer" field in ALL matches

Only return valid JSON.`;

  let competitorData;
  try {
    competitorData = await callGemini(competitorPrompt);
  } catch {
    competitorData = { competitorGraph: { exactMatches: [], similarMatches: [], closeSubstitutes: [] }, matchMethod: "ERROR" };
  }

  // Stage 4: Verify matches with embeddings (in-memory comparison)
  onProgress({ stage: "verifying", message: "Verifying matches with semantic embeddings...", progress: 30 });

  if (sourceEmbedding && competitorData?.competitorGraph) {
    // Generate embeddings for competitors and calculate similarity
    const allMatches = [
      ...(competitorData.competitorGraph.exactMatches || []),
      ...(competitorData.competitorGraph.similarMatches || []),
      ...(competitorData.competitorGraph.closeSubstitutes || [])
    ];

    for (const match of allMatches) {
      // Sanitize URLs to remove any UPC codes and ensure proper format
      const matchProduct = {
        brand: match.brand || product.brand,
        productName: match.productName || match.product,
        model: match.model,
        keySpecs: {
          dimension1: match.normalizedSpecs?.split(" ")[0],
          powerType: match.normalizedSpecs?.includes("gas") ? "gas" : match.normalizedSpecs?.includes("electric") ? "electric" : null
        }
      };
      match.url = sanitizeProductUrl(match.url, matchProduct, match.retailer);
      
      const matchSignature = [
        match.brand || match.retailer,
        match.productName || match.product,
        match.normalizedSpecs
      ].filter(Boolean).join(" ");
      
      const matchEmbedding = await generateEmbedding(matchSignature);
      if (matchEmbedding) {
        match.embeddingSimilarity = Math.round(cosineSimilarity(sourceEmbedding, matchEmbedding) * 100);
        // Adjust confidence based on embedding similarity
        if (match.matchConfidence && match.embeddingSimilarity) {
          match.adjustedConfidence = Math.round((match.matchConfidence + match.embeddingSimilarity) / 2);
        }
      }
    }

    // Sort by adjusted confidence/similarity
    if (competitorData.competitorGraph.closeSubstitutes) {
      competitorData.competitorGraph.closeSubstitutes.sort((a, b) => 
        (b.adjustedConfidence || b.embeddingSimilarity || 0) - (a.adjustedConfidence || a.embeddingSimilarity || 0)
      );
    }
  }

  onProgress({ 
    stage: "competitors_done", 
    message: `Match method: ${competitorData.matchMethod || 'Attribute-based'}`, 
    progress: 35,
    data: competitorData 
  });

  // Stage 2.5: Fetch real prices from retailer pages
  try {
    competitorData = await enrichWithRealPrices(competitorData, onProgress);
  } catch (priceError) {
    console.log("Price enrichment failed, using AI estimates:", priceError.message);
  }

  // Stage 3: Competitor Signals Engine
  onProgress({ stage: "signals", message: "Analyzing competitor signals...", progress: 40 });

  // Build competitor names from previous step for context
  const competitorNames = competitorData?.competitorGraph?.closeSubstitutes?.map(c => `${c.brand} ${c.product}`.trim()).join(", ") || "top competitors";

  const signalsPrompt = `For "${product.productName}" by ${product.brand} and its REAL competitors (${competitorNames}), analyze merchant-critical signals.

IMPORTANT: Use REAL competitor brand and product names - NOT "Competitor A" or generic placeholders.
Reference the actual brands competing in this market segment.

Return JSON:
{
  "competitorSignals": [
    {
      "competitor": "REAL Brand Name + Product (e.g., 'Samsung Galaxy S24 Ultra', 'LG InstaView Refrigerator', 'Dyson V15 Detect')",
      "competitorUrl": "https://www.amazon.com/s?k=BRAND+MODEL+NAME (use SEARCH URL format like /s?k=, NOT fake /dp/ URLs)",
      "signals": {
        "priceChangeFrequency": {
          "value": "3 changes/month",
          "trend": "increasing",
          "lastChange": "Price dropped $30 on Jan 15",
          "merchantImpact": "High promo aggression",
          "evidenceSource": "Price tracking via CamelCamelCamel / Keepa / retailer history"
        },
        "promoMechanics": {
          "activePromos": ["15% off with code SAVE15", "Free 2-year warranty", "Bundle with accessories"],
          "hiddenTactics": "MSRP increased $50 last month before running 20% off promo",
          "bundleOffers": "Includes $89 accessory kit free",
          "promoEndDate": "Ends Jan 31",
          "evidenceSource": "Retailer product page / promotional emails"
        },
        "reviewVelocity": {
          "reviewsPerWeek": 45,
          "totalReviews": 2847,
          "trend": "up 20% vs last month",
          "demandSignal": "Strong demand growth indicates market momentum",
          "evidenceSource": "Amazon review count tracking"
        },
        "ratingTrend": {
          "current": 4.2,
          "previousMonth": 4.3,
          "trend": "-0.1 last 30 days",
          "qualitySignal": "Recent complaints about build quality",
          "topComplaint": "Battery life not meeting expectations",
          "evidenceSource": "Review sentiment analysis"
        },
        "contentCompleteness": {
          "score": 85,
          "missing": ["360-degree view", "Comparison chart", "Installation video"],
          "conversionImpact": "Medium - missing content may reduce conversion 5-10%",
          "evidenceSource": "Product page audit"
        },
        "availability": {
          "status": "In Stock",
          "stockLevel": "Ships within 24 hours",
          "stockSignal": "Stable inventory",
          "shareLeakageRisk": "Low",
          "evidenceSource": "Retailer stock status"
        }
      }
    }
  ],
  "topThreats": [
    {
      "threat": "REAL competitor name running aggressive promotion",
      "competitor": "Brand + Product name",
      "threatType": "Price/Promo/Quality/Availability",
      "urgency": "High/Medium/Low",
      "action": "Specific action to take",
      "evidenceUrl": "URL or source reference"
    }
  ],
  "signalsSummary": "Key competitive dynamics summary with real brand names"
}

Only return valid JSON with REAL brand names.`;

  let signalsData;
  try {
    signalsData = await callGemini(signalsPrompt);
  } catch {
    signalsData = { competitorSignals: [], topThreats: [], signalsSummary: "Analysis unavailable" };
  }

  onProgress({ 
    stage: "signals_done", 
    message: "Competitor signals analyzed", 
    progress: 50,
    data: signalsData 
  });

  // Stage 4: Aspect-Level Sentiment Analysis (Merchant-Friendly)
  onProgress({ stage: "sentiment", message: "Analyzing aspect-level sentiment with root causes...", progress: 60 });

  const sentimentPrompt = `For "${product.productName}", provide MERCHANT-FRIENDLY aspect-level sentiment analysis.

Focus on actionable insights, not generic sentiment. Return JSON:
{
  "aspectSentiment": {
    "topPros": [
      {"aspect": "specific feature", "sentiment": "positive", "percentMentions": 45, "customerQuote": "example quote", "evidenceCount": 234}
    ],
    "topCons": [
      {"aspect": "specific issue", "sentiment": "negative", "percentMentions": 18, "trend": "up 18% WoW", "rootCause": "likely root cause", "pdpFix": "recommended PDP clarification"}
    ]
  },
  "returnRiskPrediction": {
    "riskLevel": "Medium",
    "topDrivers": [
      {"driver": "Noise complaints", "contribution": 35, "pattern": "Up 18% WoW", "likelyCause": "Installation & expectation gap", "fix": "Add noise level specs to PDP"}
    ],
    "estimatedReturnRate": "8-12%",
    "reducibleReturns": "40% could be prevented with PDP fixes"
  },
  "merchantActions": [
    {"priority": "High", "action": "Add installation noise expectations to PDP", "expectedImpact": "Reduce noise complaints 25%", "effort": "Low"},
    {"priority": "Medium", "action": "Bundle with anti-vibration pads", "expectedImpact": "Reduce returns 15%", "effort": "Medium"}
  ],
  "sentimentTrend": {
    "overall": 4.2,
    "trend": "stable",
    "weekOverWeek": "+0.1"
  }
}

Only return valid JSON.`;

  let sentimentData;
  try {
    sentimentData = await callGemini(sentimentPrompt);
  } catch {
    sentimentData = { aspectSentiment: { topPros: [], topCons: [] }, returnRiskPrediction: {}, merchantActions: [] };
  }

  onProgress({ 
    stage: "sentiment_done", 
    message: "Aspect sentiment analyzed", 
    progress: 70,
    data: sentimentData 
  });

  // Stage 5: Opportunity Index Calculation
  onProgress({ stage: "opportunity", message: "Calculating Opportunity Index...", progress: 80 });

  // Get real competitor names for context
  const realCompetitors = competitorData?.competitorGraph?.closeSubstitutes?.slice(0, 3).map(c => c.brand || c.product) || [];

  const opportunityPrompt = `Calculate the Opportunity Index for "${product.productName}" by ${product.brand}.

Use REAL competitor brand names from the ${product.category} market - NOT generic "Competitor A/B/C".
Reference actual competing brands like: ${realCompetitors.join(", ") || "major brands in this category"}.

Formula components:
- Demand Pressure (search trends, review velocity)
- Competitor Advantage (price gaps, promo intensity)
- Promo Gap (opportunity to run promos)
- Sentiment Risk (negative trend exposure)
- Retailer Strength (content quality, availability)

Return JSON:
{
  "opportunityIndex": {
    "score": 72,
    "grade": "B+",
    "components": {
      "demandPressure": {"score": 78, "insight": "Strong search demand, reviews growing 15% MoM"},
      "competitorAdvantage": {"score": 65, "insight": "REAL_BRAND_1 and REAL_BRAND_2 have 8-12% price advantage"},
      "promoGap": {"score": 80, "insight": "No active promos while REAL_BRAND is running 15% off"},
      "sentimentRisk": {"score": 70, "insight": "Noise complaints up 18% - similar to REAL_BRAND issue last quarter"},
      "retailerStrength": {"score": 68, "insight": "Missing comparison chart that REAL_BRAND has"}
    },
    "trend": "up 5 points WoW"
  },
  "weeklyDigest": {
    "topSKUsLosingShare": [
      {
        "sku": "${product.model || product.productName}",
        "issue": "Price 8% above REAL_COMPETITOR_BRAND",
        "shareLoss": "-2.3%",
        "evidenceSource": "Market share tracking"
      }
    ],
    "topCompetitorThreats": [
      {
        "competitor": "REAL Brand Name + Product",
        "competitorUrl": "realistic product URL",
        "threat": "Aggressive bundle promotion - free accessories worth $89",
        "urgency": "High",
        "evidenceSource": "Competitor product page"
      }
    ],
    "marginOpportunities": [
      {
        "opportunity": "Match REAL_COMPETITOR's shipping fee of $49 (currently offering free)",
        "potentialMargin": "+3%",
        "risk": "Low",
        "evidenceSource": "Competitor shipping policy comparison"
      }
    ]
  },
  "alerts": [
    {
      "type": "price_drop",
      "competitor": "REAL Brand + Product name",
      "message": "REAL_COMPETITOR dropped price 12% to $XXX",
      "previousPrice": "$XXX",
      "newPrice": "$XXX",
      "detected": "2 hours ago",
      "action": "Review pricing strategy",
      "evidenceUrl": "realistic URL to competitor product"
    },
    {
      "type": "rating_spike",
      "competitor": "REAL Brand + Product name",
      "message": "REAL_COMPETITOR rating jumped from 4.1 to 4.4 stars",
      "detected": "1 day ago",
      "action": "Analyze their recent product improvements",
      "evidenceUrl": "realistic URL"
    },
    {
      "type": "oos_detection",
      "competitor": "REAL Brand + Product name",
      "message": "REAL_COMPETITOR out of stock at Amazon",
      "detected": "4 hours ago",
      "action": "Run targeted ads to capture their traffic",
      "evidenceUrl": "realistic URL"
    }
  ]
}

Replace all REAL_BRAND, REAL_COMPETITOR placeholders with actual brand names for the ${product.category} category.
Only return valid JSON.`;

  let opportunityData;
  try {
    opportunityData = await callGemini(opportunityPrompt);
  } catch {
    opportunityData = { opportunityIndex: { score: 0, components: {} }, weeklyDigest: {}, alerts: [] };
  }

  onProgress({ 
    stage: "opportunity_done", 
    message: `Opportunity Index: ${opportunityData.opportunityIndex?.score || 'N/A'}`, 
    progress: 90,
    data: opportunityData 
  });

  // Stage 6: Generate Executive Summary & Evidence Links
  onProgress({ stage: "summary", message: "Generating executive summary with evidence...", progress: 95 });

  // Collect real competitor names from previous analysis
  const topCompetitorBrands = competitorData?.competitorGraph?.closeSubstitutes?.slice(0, 3).map(c => c.brand).filter(Boolean) || [];

  const summaryPrompt = `Create an executive summary for "${product.productName}" by ${product.brand} - merchant intelligence report.

Use REAL competitor brand names (${topCompetitorBrands.join(", ") || "actual market competitors"}) - NOT generic placeholders.
Generate REALISTIC evidence URLs that would exist for this product category.

Return JSON:
{
  "executiveSummary": {
    "headline": "Specific headline with real brand context - e.g., '${product.brand} faces pricing pressure from REAL_COMPETITOR's aggressive promo'",
    "categoryOverview": "Market context mentioning real competing brands and market dynamics",
    "topRisks": [
      "REAL_COMPETITOR_BRAND running 20% off promotion through end of month",
      "Rising negative sentiment about specific feature matching REAL_COMPETITOR's advantage"
    ],
    "topOpportunities": [
      "REAL_COMPETITOR out of stock - opportunity to capture 15% of their traffic",
      "Price gap vs REAL_COMPETITOR narrowed - can justify premium with better reviews"
    ],
    "immediateActions": [
      "Match REAL_COMPETITOR's bundle offer to prevent share loss",
      "Add comparison chart showing advantage over REAL_COMPETITOR",
      "Run targeted ads against REAL_COMPETITOR's out-of-stock SKU"
    ]
  },
  "evidenceLinks": [
    {
      "source": "Amazon Product Page",
      "url": "https://www.amazon.com/s?k=PRODUCT+BRAND+MODEL (use SEARCH URL format)",
      "dataPoint": "Current price $XXX with 4.2 stars from 1,234 reviews",
      "freshness": "Live",
      "trustIndicator": "Direct source"
    },
    {
      "source": "REAL_COMPETITOR on Amazon",
      "url": "https://www.amazon.com/s?k=COMPETITOR+BRAND+MODEL (use SEARCH URL, not /dp/)",
      "dataPoint": "Competitor at $XXX (12% lower) with 4.1 stars",
      "freshness": "Live",
      "trustIndicator": "Direct competitor comparison"
    },
    {
      "source": "Google Shopping Price Comparison",
      "url": "https://www.google.com/search?tbm=shop&q=PRODUCT+NAME (use Google Shopping search)",
      "dataPoint": "Price tracked across 8 retailers - range $XXX-$XXX",
      "freshness": "Updated hourly",
      "trustIndicator": "Multi-retailer validation"
    },
    {
      "source": "Camelcamelcamel Price History",
      "url": "https://camelcamelcamel.com/search?sq=PRODUCT+NAME (use search, not fake product ID)",
      "dataPoint": "Price history showing 15% drop last month",
      "freshness": "Historical",
      "trustIndicator": "Third-party price tracking"
    },
    {
      "source": "Reddit r/ProductCategory",
      "url": "https://www.reddit.com/search/?q=PRODUCT+NAME+review",
      "dataPoint": "User discussion comparing ${product.brand} vs REAL_COMPETITOR",
      "freshness": "Posted 3 days ago",
      "trustIndicator": "Community sentiment"
    },
    {
      "source": "YouTube Reviews",
      "url": "https://www.youtube.com/results?search_query=PRODUCT+NAME+review",
      "dataPoint": "Top reviewer gave 8/10, cited noise as concern",
      "freshness": "Published last week",
      "trustIndicator": "Expert review"
    }
  ],
  "weeklyReportPreview": {
    "subject": "Weekly Intelligence: ${product.productName} vs ${topCompetitorBrands[0] || 'Competition'}",
    "sections": ["Competitive Snapshot", "Opportunity Index", "Top Alerts", "Recommended Actions"],
    "keyMetrics": {
      "opportunityScore": ${opportunityData?.opportunityIndex?.score || 72},
      "competitorThreats": 3,
      "pricePosition": "+2% vs median",
      "sentimentTrend": "Stable"
    }
  },
  "skuDeepDive": {
    "strengthsToLeverage": [
      "Higher review rating than REAL_COMPETITOR (4.2 vs 4.0)",
      "Better availability - ships same day vs REAL_COMPETITOR's 3-5 days"
    ],
    "weaknessesToAddress": [
      "8% price premium over REAL_COMPETITOR without clear justification",
      "Missing comparison content that REAL_COMPETITOR has"
    ],
    "quickWins": [
      "Add noise level specs to PDP (reduce complaints 25%)",
      "Create vs-REAL_COMPETITOR comparison chart"
    ],
    "strategicMoves": [
      "Launch bundle matching REAL_COMPETITOR's accessory offer",
      "Target REAL_COMPETITOR's out-of-stock periods with boosted ads"
    ]
  }
}

Replace all REAL_COMPETITOR and placeholders with actual brand names for ${product.category}.
Only return valid JSON.`;

  let summaryData;
  try {
    summaryData = await callGemini(summaryPrompt);
  } catch {
    summaryData = { executiveSummary: {}, evidenceLinks: [], weeklyReportPreview: {} };
  }

  // Stage 7: Product Trends & Assortment Gaps Analysis (Research-Driven)
  onProgress({ stage: "trends", message: "Researching market trends and assortment gaps with real data...", progress: 95 });

  // Use grounded model for real-time research on trends
  const trendsPrompt = `You are a senior retail trend analyst and category manager. Research and analyze market trends for "${product.productName}" in the ${product.category} category.

SOURCE RETAILER: ${product.retailer}
PRODUCT: ${product.brand} ${product.productName}
CATEGORY: ${product.category}

🔍 RESEARCH TASK 1: CURRENT MARKET TRENDS
Search for and analyze:
1. Google Trends data for "${product.productName}" and "${product.category}" search interest
2. Industry reports on ${product.category} market trends (2024-2025)
3. Consumer behavior shifts in this category
4. Technology/feature trends (e.g., battery vs gas, smart features)
5. Price segment performance (budget vs premium)
6. Seasonal demand patterns

Look for data from:
- Google Trends (search interest over time, related queries, rising searches)
- Industry publications (Lawn & Landscape Magazine, Pro Contractor Rentals)
- Market research (Statista, IBISWorld, Grand View Research)
- Retail analytics (NPD Group, Numerator, CircleUp)
- News about category trends

🔍 RESEARCH TASK 2: ASSORTMENT GAPS AT ${(product.retailer || 'Walmart').toUpperCase()}
Research what products/brands are:
1. Sold at Home Depot, Lowes, Amazon, Costco but NOT at ${product.retailer}
2. Top-selling in this category that ${product.retailer} doesn't carry
3. New 2024/2025 product releases not yet at ${product.retailer}
4. Exclusive brands at competitors (e.g., Ryobi at Home Depot, Craftsman at Lowes)

Search for:
- "${product.category} best sellers 2024 2025"
- "Home Depot exclusive lawn mower brands"
- "Lowes exclusive outdoor power equipment"
- "${product.retailer} vs Home Depot ${product.category} selection"

Return JSON with REAL researched data:
{
  "salesTrends": {
    "categoryTrend": "Growing/Stable/Declining - with market size if known",
    "marketInsight": "Brief overview of the ${product.category} market in 2024-2025",
    "googleTrendsInsight": "What Google Trends shows for search interest in this category/product",
    "searchInterest": {
      "currentInterest": "High/Medium/Low based on Google Trends",
      "trend": "Rising/Stable/Declining over past 12 months",
      "peakSeason": "When search interest peaks (e.g., Spring for lawn mowers)",
      "relatedRisingQueries": ["rising search query 1", "rising search query 2"]
    },
    "trendingUp": [
      {
        "trend": "Specific trend with real data",
        "growthRate": "XX% growth based on research",
        "source": "Name of report/article/data source",
        "sourceUrl": "https://actual-url-to-source.com",
        "driver": "Why this is growing",
        "topProducts": ["Real product 1", "Real product 2"],
        "recommendation": "How ${product.retailer} should respond"
      }
    ],
    "trendingDown": [
      {
        "trend": "Specific declining trend",
        "declineRate": "XX% decline based on research",
        "source": "Data source name",
        "sourceUrl": "https://source-url.com",
        "reason": "Why declining",
        "affectedBrands": ["Brand1", "Brand2"]
      }
    ],
    "emergingFeatures": [
      {
        "feature": "Specific feature gaining demand",
        "demandLevel": "High/Medium/Low",
        "source": "Where this insight comes from",
        "examples": ["Real product with this feature"]
      }
    ],
    "consumerPreferences": [
      {
        "preference": "Specific consumer preference",
        "percentage": "XX% of consumers prefer this (if data available)",
        "insight": "What this means for retailers",
        "source": "Survey or report name"
      }
    ]
  },
  "assortmentGaps": {
    "retailerAnalyzed": "${product.retailer}",
    "analysisMethod": "Compared ${product.retailer} catalog against Home Depot, Lowes, Amazon",
    "missingFromRetailer": [
      {
        "product": "REAL product name with exact model number",
        "brand": "Real brand",
        "availableAt": ["Home Depot", "Amazon"],
        "price": "$XXX at competitor",
        "whyPopular": "Reason for popularity (reviews, best-seller status)",
        "competitorUrl": "https://homedepot.com/s/actual-search",
        "demandLevel": "High/Medium based on sales rank or reviews",
        "impact": "Revenue ${product.retailer} is losing by not stocking"
      }
    ],
    "newModelsNotStocked": [
      {
        "product": "New 2024/2025 model name",
        "brand": "Brand",
        "launchDate": "Release date",
        "availableAt": ["Retailer1"],
        "keyFeatures": ["Feature1", "Feature2"],
        "url": "https://retailer.com/search?q=model"
      }
    ],
    "competitorExclusives": [
      {
        "product": "Product only at specific retailer",
        "brand": "Brand",
        "exclusiveTo": "Home Depot / Lowes / Costco",
        "price": "$XXX",
        "marketShare": "Estimated share this takes",
        "url": "https://competitor-url.com"
      }
    ],
    "recommendedAdditions": [
      {
        "product": "Product ${product.retailer} should add",
        "brand": "Brand",
        "reason": "Why add this",
        "priority": "High/Medium/Low",
        "estimatedRevenue": "Potential sales opportunity"
      }
    ]
  },
  "competitiveInsight": {
    "categoryLeader": "Which retailer leads in ${product.category} and why",
    "retailerPosition": "${product.retailer}'s strengths and weaknesses in this category",
    "marketShare": "Estimated market share breakdown if known",
    "keyGaps": "Most critical gaps ${product.retailer} should address",
    "strategicRecommendation": "Specific actions to improve competitive position",
    "assortmentSummary": "Summary of assortment comparison",
    "opportunityCost": "Estimated revenue ${product.retailer} loses from gaps"
  },
  "sources": [
    {
      "title": "Article or report title",
      "url": "https://actual-url.com",
      "type": "Industry Report / News / Retailer Data / Market Research",
      "dateAccessed": "2025-01"
    }
  ]
}

IMPORTANT: 
- Use REAL product names, model numbers, and brand names only
- Include actual URLs to sources when available
- Do NOT make up statistics - only use data you can source
- If you can't find exact data, note it as "estimated" or "industry observation"
- For assortment gaps, actually compare what's on competitor websites vs ${product.retailer}

Only return valid JSON.`;

  let trendsData;
  try {
    // Use grounded model for real-time research
    trendsData = await callGroundedGemini(trendsPrompt);
  } catch (error) {
    console.error("Grounded trends research failed:", error);
    // Fallback to regular model
    try {
      trendsData = await callGemini(trendsPrompt);
    } catch {
      trendsData = { salesTrends: {}, assortmentGaps: {}, competitiveInsight: {}, sources: [] };
    }
  }

  onProgress({ 
    stage: "trends_done", 
    message: "Market research and gap analysis complete", 
    progress: 98,
    data: trendsData 
  });

  // Final Result Assembly
  const finalResult = {
    product,
    competitorGraph: competitorData,
    competitorSignals: signalsData,
    aspectSentiment: sentimentData,
    opportunityIndex: opportunityData,
    summary: summaryData,
    trendsAndGaps: trendsData,
    generatedAt: new Date().toISOString(),
    refreshSchedule: "Daily at 6:00 AM"
  };

  onProgress({ 
    stage: "complete", 
    message: "Analysis complete!",
    progress: 100,
    data: finalResult
  });

  return finalResult;
}

// Export the original function name for compatibility
export { analyzeProductEnhanced as analyzeProductWithOpenAI };
