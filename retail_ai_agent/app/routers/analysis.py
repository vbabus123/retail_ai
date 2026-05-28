from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import (
    AmazonTopBrandsRequest,
    AmazonTopBrandsResponse,
    AmazonTopSellersRequest,
    AmazonTopSellersResponse,
    BrandDiffRequest,
    BrandDiffResponse,
    CompetitorInsightRequest,
    CompetitorInsightResponse,
    MarketplaceGapRequest,
    MarketplaceGapResponse,
    SellerComparisonRequest,
    SellerComparisonResponse,
    SentimentRequest,
    SentimentResponse,
    SellerBrandDiffRequest,
    RetailerBrandDiffRequest,
    TopSellersRequest,
    TopSellersResponse,
    UploadAssortmentRequest,
    UploadAssortmentResponse,
)
from app.services.brand_compare import (
    compare_brand_sets,
    compare_retailer_brand_diff,
    compare_seller_brand_diff,
    scrape_amazon_top_brands,
    scrape_amazon_best_sellers_brands,
)
from app.services.comparison import compare_sellers, competitor_insights, marketplace_gap, top_sellers
from app.services.llm import llm_service
from app.services.store import store

router = APIRouter(prefix="/api/v1", tags=["retail-analysis"])


@router.post("/assortments/upload", response_model=UploadAssortmentResponse)
def upload_assortments(payload: UploadAssortmentRequest) -> UploadAssortmentResponse:
    count = store.upload(payload.source, payload.items)
    return UploadAssortmentResponse(source=payload.source, ingested_count=count)


@router.post("/compare/sellers", response_model=SellerComparisonResponse)
def compare_two_sellers(payload: SellerComparisonRequest) -> SellerComparisonResponse:
    seller_a_items = store.items_by_seller(payload.seller_a)
    seller_b_items = store.items_by_seller(payload.seller_b)

    if not seller_a_items:
        raise HTTPException(status_code=404, detail=f"No assortments found for seller_a={payload.seller_a}")
    if not seller_b_items:
        raise HTTPException(status_code=404, detail=f"No assortments found for seller_b={payload.seller_b}")

    return compare_sellers(payload, seller_a_items, seller_b_items)


@router.post("/compare/marketplace-gap", response_model=MarketplaceGapResponse)
def compare_marketplace_gap(payload: MarketplaceGapRequest) -> MarketplaceGapResponse:
    items = store.all_items()
    if not items:
        raise HTTPException(status_code=404, detail="No assortments uploaded")

    return marketplace_gap(
        items,
        category=payload.category,
        brand=payload.brand,
        source_marketplace=payload.source_marketplace.value,
        target_marketplace=payload.target_marketplace.value,
    )


@router.post("/insights/competitor", response_model=CompetitorInsightResponse)
def get_competitor_insights(payload: CompetitorInsightRequest) -> CompetitorInsightResponse:
    items = store.all_items()
    if not items:
        raise HTTPException(status_code=404, detail="No assortments uploaded")

    return competitor_insights(
        items,
        category=payload.category,
        focus_brand=payload.focus_brand,
        seller_ids=payload.seller_ids,
    )


@router.post("/sellers/top", response_model=TopSellersResponse)
def get_top_sellers(payload: TopSellersRequest) -> TopSellersResponse:
    items = store.all_items()
    if not items:
        raise HTTPException(status_code=404, detail="No assortments uploaded")

    return top_sellers(
        items,
        category=payload.category,
        brand_filter=payload.brand_filter,
        marketplace_filter=payload.marketplace_filter.value if payload.marketplace_filter else None,
        limit=payload.limit,
    )


@router.post("/insights/sentiment", response_model=SentimentResponse)
async def get_sentiment(payload: SentimentRequest) -> SentimentResponse:
    return await llm_service.summarize_sentiment(payload.topic, payload.items)


@router.post("/brands/amazon/top", response_model=AmazonTopBrandsResponse)
async def get_amazon_top_brands(payload: AmazonTopBrandsRequest) -> AmazonTopBrandsResponse:
    return await scrape_amazon_top_brands(
        payload.category,
        max_brands=payload.max_brands,
        pages=payload.pages,
        country_domain=payload.country_domain,
    )


@router.post("/brands/amazon/top-sellers", response_model=AmazonTopSellersResponse)
async def get_amazon_best_sellers_brands(payload: AmazonTopSellersRequest) -> AmazonTopSellersResponse:
    return await scrape_amazon_best_sellers_brands(
        payload.category,
        best_sellers_url=payload.best_sellers_url,
        max_brands=payload.max_brands,
    )


@router.post("/brands/diff", response_model=BrandDiffResponse)
async def get_brand_diff(payload: BrandDiffRequest) -> BrandDiffResponse:
    try:
        return await compare_brand_sets(payload.left, payload.right)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/brands/diff/sellers", response_model=BrandDiffResponse)
async def get_seller_brand_diff(payload: SellerBrandDiffRequest) -> BrandDiffResponse:
    try:
        return await compare_seller_brand_diff(
            payload.category,
            payload.seller_a,
            payload.seller_b,
            seller_a_store_url=payload.seller_a_store_url,
            seller_b_store_url=payload.seller_b_store_url,
            max_brands=payload.max_brands,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/brands/diff/retailers", response_model=BrandDiffResponse)
async def get_retailer_brand_diff(payload: RetailerBrandDiffRequest) -> BrandDiffResponse:
    try:
        return await compare_retailer_brand_diff(
            payload.category,
            payload.retailer_a.value,
            payload.retailer_b.value,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
