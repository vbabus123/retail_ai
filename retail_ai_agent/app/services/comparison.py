from __future__ import annotations

from collections import defaultdict
from statistics import mean
from typing import Dict, Iterable, List, Optional, Tuple

from app.models import (
    AssortmentItem,
    CompetitorInsightResponse,
    MarketplaceGapResponse,
    OfferComparison,
    OfferWinner,
    SellerComparisonRequest,
    SellerComparisonResponse,
    SellerSummary,
    TopSellerRecord,
    TopSellersResponse,
)


def _filter_items(
    items: Iterable[AssortmentItem],
    *,
    category: str,
    brand_filter: Optional[str],
    marketplace_filter: Optional[str],
) -> List[AssortmentItem]:
    filtered = [item for item in items if item.category.lower() == category.lower()]
    if brand_filter:
        filtered = [item for item in filtered if item.brand.lower() == brand_filter.lower()]
    if marketplace_filter:
        filtered = [item for item in filtered if item.marketplace.value == marketplace_filter]
    return filtered


def _seller_summary(seller_id: str, items: List[AssortmentItem]) -> SellerSummary:
    return SellerSummary(
        seller_id=seller_id,
        item_count=len(items),
        total_sales_30d=sum(item.sales_30d for item in items),
        avg_price=round(mean([item.price for item in items]), 2) if items else 0,
        first_party_count=sum(1 for item in items if item.party_type.value == "first_party"),
        third_party_count=sum(1 for item in items if item.party_type.value == "third_party"),
    )


def compare_sellers(
    request: SellerComparisonRequest,
    seller_a_items: List[AssortmentItem],
    seller_b_items: List[AssortmentItem],
) -> SellerComparisonResponse:
    seller_a_items = _filter_items(
        seller_a_items,
        category=request.category,
        brand_filter=request.brand_filter,
        marketplace_filter=request.marketplace_filter.value if request.marketplace_filter else None,
    )
    seller_b_items = _filter_items(
        seller_b_items,
        category=request.category,
        brand_filter=request.brand_filter,
        marketplace_filter=request.marketplace_filter.value if request.marketplace_filter else None,
    )

    a_by_sku = {item.sku: item for item in seller_a_items}
    b_by_sku = {item.sku: item for item in seller_b_items}

    a_skus = set(a_by_sku)
    b_skus = set(b_by_sku)
    common_skus = sorted(a_skus.intersection(b_skus))

    missing_in_a = sorted(list(b_skus - a_skus))
    missing_in_b = sorted(list(a_skus - b_skus))

    brand_missing: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: {"missing_in_seller_a": [], "missing_in_seller_b": []})
    for sku in missing_in_a:
        brand_missing[b_by_sku[sku].brand]["missing_in_seller_a"].append(sku)
    for sku in missing_in_b:
        brand_missing[a_by_sku[sku].brand]["missing_in_seller_b"].append(sku)

    offer_comparison: List[OfferComparison] = []
    for sku in common_skus:
        a_item = a_by_sku[sku]
        b_item = b_by_sku[sku]
        a_total = a_item.price + a_item.shipping_cost
        b_total = b_item.price + b_item.shipping_cost
        winner = OfferWinner.tie
        if a_total < b_total:
            winner = OfferWinner.seller_a
        elif b_total < a_total:
            winner = OfferWinner.seller_b

        offer_comparison.append(
            OfferComparison(
                sku=sku,
                brand=a_item.brand,
                category=a_item.category,
                seller_a_total_cost=round(a_total, 2),
                seller_b_total_cost=round(b_total, 2),
                winner=winner,
                is_incremental=a_item.is_incremental or b_item.is_incremental,
                is_new_item=a_item.is_new_item or b_item.is_new_item,
            )
        )

    return SellerComparisonResponse(
        category=request.category,
        seller_a=_seller_summary(request.seller_a, seller_a_items),
        seller_b=_seller_summary(request.seller_b, seller_b_items),
        common_sku_count=len(common_skus),
        missing_in_seller_a=missing_in_a,
        missing_in_seller_b=missing_in_b,
        brand_level_missing_assortments=dict(brand_missing),
        offer_comparison=offer_comparison,
    )


def marketplace_gap(
    all_items: List[AssortmentItem],
    *,
    category: str,
    brand: Optional[str],
    source_marketplace: str,
    target_marketplace: str,
) -> MarketplaceGapResponse:
    category_items = [item for item in all_items if item.category.lower() == category.lower()]
    if brand:
        category_items = [item for item in category_items if item.brand.lower() == brand.lower()]

    source_skus = {
        item.sku
        for item in category_items
        if item.marketplace.value == source_marketplace
    }
    target_skus = {
        item.sku
        for item in category_items
        if item.marketplace.value == target_marketplace
    }

    missing = sorted(list(source_skus - target_skus))
    setup_coverage = 0.0
    if source_skus:
        setup_coverage = round((len(source_skus.intersection(target_skus)) / len(source_skus)) * 100, 2)

    return MarketplaceGapResponse(
        brand=brand,
        category=category,
        source_marketplace=source_marketplace,
        target_marketplace=target_marketplace,
        missing_in_target=missing,
        setup_coverage_percent=setup_coverage,
    )


def competitor_insights(
    items: List[AssortmentItem],
    *,
    category: str,
    focus_brand: Optional[str],
    seller_ids: List[str],
) -> CompetitorInsightResponse:
    filtered = [
        item
        for item in items
        if item.category.lower() == category.lower() and item.seller_id in seller_ids
    ]

    if focus_brand:
        filtered = [item for item in filtered if item.brand.lower() == focus_brand.lower()]

    per_seller = defaultdict(list)
    for item in filtered:
        per_seller[item.seller_id].append(item)

    sales_by_seller: List[Tuple[str, int]] = []
    for seller_id in seller_ids:
        sales_by_seller.append((seller_id, sum(item.sales_30d for item in per_seller.get(seller_id, []))))

    top_sellers = [seller for seller, _ in sorted(sales_by_seller, key=lambda x: x[1], reverse=True)]

    first_party_sellers = sorted(
        {
            item.seller_id
            for item in filtered
            if item.party_type.value == "first_party"
        }
    )
    third_party_sellers = sorted(
        {
            item.seller_id
            for item in filtered
            if item.party_type.value == "third_party"
        }
    )

    def best_offer(incremental_only: bool) -> Optional[str]:
        scored = []
        for seller_id in seller_ids:
            seller_items = per_seller.get(seller_id, [])
            if incremental_only:
                seller_items = [item for item in seller_items if item.is_incremental or item.is_new_item]
            else:
                seller_items = [item for item in seller_items if not item.is_incremental and not item.is_new_item]
            if not seller_items:
                continue
            avg_total_cost = mean([item.price + item.shipping_cost for item in seller_items])
            scored.append((seller_id, avg_total_cost))

        if not scored:
            return None
        return min(scored, key=lambda x: x[1])[0]

    return CompetitorInsightResponse(
        category=category,
        focus_brand=focus_brand,
        best_offer_seller_on_existing=best_offer(incremental_only=False),
        best_offer_seller_on_incremental=best_offer(incremental_only=True),
        top_sellers_by_sales=top_sellers,
        first_party_sellers=first_party_sellers,
        third_party_sellers=third_party_sellers,
    )


def top_sellers(
    items: List[AssortmentItem],
    *,
    category: str,
    brand_filter: Optional[str],
    marketplace_filter: Optional[str],
    limit: int,
) -> TopSellersResponse:
    filtered = _filter_items(
        items,
        category=category,
        brand_filter=brand_filter,
        marketplace_filter=marketplace_filter,
    )

    per_seller = defaultdict(list)
    for item in filtered:
        per_seller[item.seller_id].append(item)

    ranked = sorted(
        [
            TopSellerRecord(
                seller_id=seller_id,
                total_sales_30d=sum(i.sales_30d for i in seller_items),
                item_count=len(seller_items),
            )
            for seller_id, seller_items in per_seller.items()
        ],
        key=lambda x: x.total_sales_30d,
        reverse=True,
    )[:limit]

    return TopSellersResponse(
        category=category,
        brand_filter=brand_filter,
        marketplace_filter=marketplace_filter,
        sellers=ranked,
    )
