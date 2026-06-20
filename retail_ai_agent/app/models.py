from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class PartyType(str, Enum):
    first_party = "first_party"
    third_party = "third_party"


class Marketplace(str, Enum):
    walmart = "walmart"
    amazon = "amazon"
    target = "target"
    other = "other"


class AssortmentItem(BaseModel):
    sku: str = Field(..., description="Unique SKU identifier")
    title: str
    brand: str
    category: str
    seller_id: str
    marketplace: Marketplace
    party_type: PartyType
    price: float = Field(..., ge=0)
    shipping_cost: float = Field(0, ge=0)
    stock_qty: int = Field(0, ge=0)
    out_of_stock_events_30d: int = Field(0, ge=0)
    sales_30d: int = Field(0, ge=0)
    is_incremental: bool = False
    is_new_item: bool = False


class UploadAssortmentRequest(BaseModel):
    source: str = Field(..., description="Dataset source id, e.g. walmart_seller_export")
    items: List[AssortmentItem]


class UploadAssortmentResponse(BaseModel):
    source: str
    ingested_count: int


class SellerSummary(BaseModel):
    seller_id: str
    item_count: int
    total_sales_30d: int
    avg_price: float
    first_party_count: int
    third_party_count: int


class SellerComparisonRequest(BaseModel):
    category: str
    seller_a: str
    seller_b: str
    brand_filter: Optional[str] = None
    marketplace_filter: Optional[Marketplace] = None


class OfferWinner(str, Enum):
    seller_a = "seller_a"
    seller_b = "seller_b"
    tie = "tie"


class OfferComparison(BaseModel):
    sku: str
    brand: str
    category: str
    seller_a_total_cost: Optional[float] = None
    seller_b_total_cost: Optional[float] = None
    winner: OfferWinner
    is_incremental: bool
    is_new_item: bool


class SellerComparisonResponse(BaseModel):
    category: str
    seller_a: SellerSummary
    seller_b: SellerSummary
    common_sku_count: int
    missing_in_seller_a: List[str]
    missing_in_seller_b: List[str]
    brand_level_missing_assortments: Dict[str, Dict[str, List[str]]]
    offer_comparison: List[OfferComparison]


class MarketplaceGapRequest(BaseModel):
    brand: Optional[str] = None
    category: str
    source_marketplace: Marketplace
    target_marketplace: Marketplace


class MarketplaceGapResponse(BaseModel):
    brand: Optional[str]
    category: str
    source_marketplace: Marketplace
    target_marketplace: Marketplace
    missing_in_target: List[str]
    setup_coverage_percent: float


class CompetitorInsightRequest(BaseModel):
    category: str
    focus_brand: Optional[str] = None
    seller_ids: List[str]


class CompetitorInsightResponse(BaseModel):
    category: str
    focus_brand: Optional[str]
    best_offer_seller_on_existing: Optional[str]
    best_offer_seller_on_incremental: Optional[str]
    top_sellers_by_sales: List[str]
    first_party_sellers: List[str]
    third_party_sellers: List[str]


class TopSellersRequest(BaseModel):
    category: str
    brand_filter: Optional[str] = None
    marketplace_filter: Optional[Marketplace] = None
    limit: int = Field(10, ge=1, le=100)


class TopSellerRecord(BaseModel):
    seller_id: str
    total_sales_30d: int
    item_count: int


class TopSellersResponse(BaseModel):
    category: str
    brand_filter: Optional[str] = None
    marketplace_filter: Optional[Marketplace] = None
    sellers: List[TopSellerRecord]


class SentimentInput(BaseModel):
    source: str = Field(..., description="e.g. reddit, web, support_tickets")
    texts: List[str]


class SentimentRequest(BaseModel):
    topic: str
    items: List[SentimentInput]


class SourceSentiment(BaseModel):
    source: str
    sentiment: str
    confidence: float
    key_points: List[str]


class SentimentResponse(BaseModel):
    topic: str
    summary: str
    source_sentiments: List[SourceSentiment]


class BrandSourceType(str, Enum):
    seller = "seller"
    marketplace = "marketplace"
    amazon_scrape = "amazon_scrape"


class AmazonTopBrandsRequest(BaseModel):
    category: str
    max_brands: int = Field(20, ge=1, le=100)
    pages: int = Field(1, ge=1, le=5)
    country_domain: str = Field("com", description="Amazon domain, e.g. com, in, co.uk")


class AmazonTopBrandsResponse(BaseModel):
    category: str
    brands: List[str]
    scraped_count: int
    pages: int
    source_urls: List[str]
    warning: Optional[str] = None


class AmazonTopSellersRequest(BaseModel):
    category: str
    best_sellers_url: str = Field(..., description="Amazon Best Sellers page URL for category")
    max_brands: int = Field(20, ge=1, le=100)


class AmazonTopSellersResponse(BaseModel):
    category: str
    brands: List[str]
    scraped_count: int
    source_url: str
    warning: Optional[str] = None


class StorefrontScrapeRequest(BaseModel):
    store_url: str = Field(..., description="Seller storefront/search URL")
    max_brands: int = Field(20, ge=1, le=100)
    max_products: int = Field(50, ge=1, le=200)
    max_pages: int = Field(1, ge=1, le=10)


class StorefrontScrapePageStat(BaseModel):
    page_number: int
    page_url: str
    new_products_added: int
    new_brands_added: int


class StorefrontScrapeResponse(BaseModel):
    store_url: str
    brands: List[str]
    products: List[str]
    brand_count: int
    product_count: int
    warning: Optional[str] = None
    visited_urls: List[str] = []
    page_stats: List[StorefrontScrapePageStat] = []
    stopped_at_page: Optional[int] = None
    stop_reason: Optional[str] = None


class BrandSetInput(BaseModel):
    source_type: BrandSourceType
    category: str
    seller_id: Optional[str] = None
    seller_store_url: Optional[str] = None
    marketplace: Optional[Marketplace] = None
    max_brands: int = Field(20, ge=1, le=100)
    pages: int = Field(1, ge=1, le=5)
    country_domain: str = Field("com")


class BrandDiffRequest(BaseModel):
    left: BrandSetInput
    right: BrandSetInput


class BrandDiffResponse(BaseModel):
    category: str
    left_source: str
    right_source: str
    left_brands: List[str]
    right_brands: List[str]
    common_brands: List[str]
    missing_in_left: List[str]
    missing_in_right: List[str]
    warnings: List[str] = []


class SellerBrandDiffRequest(BaseModel):
    category: str
    seller_a: str
    seller_b: str
    seller_a_store_url: Optional[str] = None
    seller_b_store_url: Optional[str] = None
    max_brands: int = Field(20, ge=1, le=100)


class RetailerBrandDiffRequest(BaseModel):
    category: str
    retailer_a: Marketplace
    retailer_b: Marketplace


class SellerBrandMetric(BaseModel):
    rank: int
    brand: str
    product_count: int
    avg_rating: float
    total_reviews: int
    avg_reviews_per_product: float
    avg_price: Optional[float] = None
    top_demand_product: Optional[str] = None
    max_bought_in_month: Optional[int] = None
    engagement_score: float
    demand_score: float


class TopSellerBrandsRequest(BaseModel):
    store_url: str = Field(..., description="Seller storefront/search URL")
    max_brands: int = Field(20, ge=1, le=100)
    max_pages: int = Field(2, ge=1, le=10)
    include_audit: bool = Field(True, description="Include product-level evidence for each returned brand")


class SellerBrandAuditProduct(BaseModel):
    title: str
    rating: float
    reviews: int
    price: Optional[float] = None
    bought_in_past_month: Optional[int] = None
    page_number: int
    page_url: str
    asin: Optional[str] = None


class SellerBrandAudit(BaseModel):
    brand: str
    product_count: int
    total_reviews: int
    products: List[SellerBrandAuditProduct]


class TopSellerBrandsResponse(BaseModel):
    store_url: str
    top_brands: List[SellerBrandMetric]
    total_products_analyzed: int
    total_unique_brands: int
    warning: Optional[str] = None
    brand_audit: List[SellerBrandAudit] = []
