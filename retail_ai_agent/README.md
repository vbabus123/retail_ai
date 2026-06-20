# Retail Brand Comparison API (FastAPI + Python)

This service provides APIs for:
- Brand-level missing assortment detection
- Seller-vs-seller comparison in a category
- 1P/3P seller identification
- Existing vs incremental/new item best-offer analysis
- Walmart vs Amazon (or any marketplace) gap detection
- Optional LLM-based sentiment analysis for web/reddit/social text

## 1) Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# one-time browser install for Playwright scraping
python -m playwright install chromium
```

If you want LLM sentiment, set `OPENAI_API_KEY` in `.env`.

## 2) Run API

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger: `http://localhost:8000/docs`

## 3) Key Endpoints
added on june 20th:

http://localhost:8000/docs#/retail-analysis/get_seller_top_brands_api_v1_brands_seller_top_brands_post

POST /api/v1/brands/seller/top-brands

Body:
```json
{
"store_url": "https://www.amazon.com/s?me=ASSKFE9KVAV03&marketplaceID=ATVPDKIKX0DER",
"max_brands": 10,
"max_pages": 1,
"include_audit": true
}
```
### Upload seller assortment
`POST /api/v1/assortments/upload`

Sample payload:

```json
{
  "source": "batch_2026_03_22",
  "items": [
    {
      "sku": "SKU-1001",
      "title": "Samsung 55 TV",
      "brand": "Samsung",
      "category": "Electronics",
      "seller_id": "seller_amz_1",
      "marketplace": "amazon",
      "party_type": "third_party",
      "price": 499.99,
      "shipping_cost": 0,
      "stock_qty": 14,
      "out_of_stock_events_30d": 2,
      "sales_30d": 120,
      "is_incremental": false,
      "is_new_item": false
    }
  ]
}
```

### Compare 2 sellers (category + optional brand)
`POST /api/v1/compare/sellers`

```json
{
  "category": "Electronics",
  "seller_a": "seller_amz_1",
  "seller_b": "seller_wm_2",
  "brand_filter": "Samsung",
  "marketplace_filter": "walmart"
}
```

Returns:
- missing SKUs on each side
- brand-level missing assortments
- best offer by SKU using price + shipping
- split for incremental/new items

### Marketplace gap (ex: what Amazon has but Walmart misses)
`POST /api/v1/compare/marketplace-gap`

```json
{
  "brand": "Samsung",
  "category": "Electronics",
  "source_marketplace": "amazon",
  "target_marketplace": "walmart"
}
```

Returns:
- missing SKU list in target marketplace
- setup coverage %, e.g. "75% already setup"

### Competitor insights
`POST /api/v1/insights/competitor`

```json
{
  "category": "Electronics",
  "focus_brand": "Samsung",
  "seller_ids": ["seller_amz_1", "seller_wm_2"]
}
```

Returns:
- top sellers by sales
- 1P and 3P seller lists
- best offer seller on existing items
- best offer seller on incremental/new items

### Top sellers by category
`POST /api/v1/sellers/top`

```json
{
  "category": "Electronics",
  "brand_filter": "Samsung",
  "marketplace_filter": "walmart",
  "limit": 5
}
```

### Scrape top Amazon brands by category
`POST /api/v1/brands/amazon/top`

```json
{
  "category": "toys",
  "max_brands": 20,
  "pages": 1,
  "country_domain": "com"
}
```

Returns top brand candidates extracted from Amazon category search results.

### Scrape Amazon Best Sellers page (specific category)
`POST /api/v1/brands/amazon/top-sellers`

```json
{
  "category": "toys-and-games",
  "best_sellers_url": "https://www.amazon.com/Best-Sellers-Toys-Games/zgbs/toys-and-games",
  "max_brands": 20
}
```

Returns top brand candidates extracted from the Amazon Best Sellers category page.

### Scrape seller storefront (brands + product titles)
`POST /api/v1/brands/storefront/scrape`

```json
{
  "store_url": "https://www.amazon.com/s?ie=UTF8&marketplaceID=ATVPDKIKX0DER&me=ASSKFE9KVAV03",
  "max_brands": 20,
  "max_products": 50,
  "max_pages": 2
}
```

Returns:
- ranked brand list
- product title list
- visited URLs across pages
- page-wise counts of newly added products/brands
- stop diagnostics (`stopped_at_page`, `stop_reason`)
- warning when storefront has bot protection/limited extraction

### Get top selling brands from seller (with ratings & reviews)
`POST /api/v1/brands/seller/top-brands`

```json
{
  "store_url": "https://www.amazon.com/s?ie=UTF8&marketplaceID=ATVPDKIKX0DER&me=ASSKFE9KVAV03",
  "max_brands": 20,
  "max_pages": 3
}
```

Returns:
- top brands ranked by engagement_score (rating * review_count)
- product_count per brand
- avg_rating
- total_reviews and avg_reviews_per_product
- total_products_analyzed
- total_unique_brands

### Compare brand diff between 2 sources
`POST /api/v1/brands/diff`

Example: Amazon scraped brands vs Walmart marketplace brands in same category.

```json
{
  "left": {
    "source_type": "amazon_scrape",
    "category": "toys",
    "max_brands": 20,
    "pages": 1,
    "country_domain": "com"
  },
  "right": {
    "source_type": "marketplace",
    "category": "toys",
    "marketplace": "walmart"
  }
}
```

You can also compare:
- seller vs seller (`source_type: seller`, `seller_id` required)
- seller vs marketplace
- marketplace vs marketplace

For generic seller source in `/brands/diff`, you can pass `seller_store_url` when seller upload data is not present.

### Compare brand diff between 2 sellers
`POST /api/v1/brands/diff/sellers`

```json
{
  "category": "toys",
  "seller_a": "seller_amz_1",
  "seller_b": "seller_wm_2",
  "seller_a_store_url": "https://www.amazon.com/s?me=A_SELLER_ID&rh=n%3A165793011",
  "seller_b_store_url": "https://www.walmart.com/seller/SELLER_ID",
  "max_brands": 20
}
```

If uploaded assortments are unavailable for a seller, API falls back to scraping `seller_*_store_url`.

### Compare brand diff between 2 retailers
`POST /api/v1/brands/diff/retailers`

```json
{
  "category": "toys",
  "retailer_a": "amazon",
  "retailer_b": "walmart"
}
```

### Sentiment insights (web/reddit/etc.)
`POST /api/v1/insights/sentiment`

```json
{
  "topic": "Samsung availability at Walmart",
  "items": [
    {
      "source": "reddit",
      "texts": [
        "Prices are good but many items are out of stock",
        "Shipping was slow for TV orders"
      ]
    },
    {
      "source": "web",
      "texts": [
        "Great discounts and value packs from seller A"
      ]
    }
  ]
}
```

## 4) Product Notes for Your Requirements

This API directly supports your requirement list:
- Brand-level missing assortments
- Difference analysis between two sellers
- 1P/3P identification
- Top Amazon brand scraping by category
- Brand diff between 2 sellers or 2 retailers in a category
- Pricing + shipping competitiveness
- Sales-based top-seller ranking
- Incremental/new-item competitiveness
- Upload assortment and run competitor analysis
- Stock and out-of-stock trend field support (`stock_qty`, `out_of_stock_events_30d`)
- Brand examples like Samsung/Pikeman/Lego via payload data

## 5) Next Steps

For production:
- add a database (Postgres) instead of in-memory store
- add auth (JWT/API key)
- add background jobs for large uploads
- integrate real market feeds (Amazon SP-API, Walmart APIs)
