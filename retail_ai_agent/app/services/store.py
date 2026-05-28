from __future__ import annotations

from collections import defaultdict
from threading import Lock
from typing import DefaultDict, Dict, List

from app.models import AssortmentItem


class InMemoryAssortmentStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._by_source: Dict[str, List[AssortmentItem]] = {}
        self._by_seller: DefaultDict[str, List[AssortmentItem]] = defaultdict(list)

    def upload(self, source: str, items: List[AssortmentItem]) -> int:
        with self._lock:
            self._by_source[source] = items
            self._rebuild_seller_index()
            return len(items)

    def _rebuild_seller_index(self) -> None:
        self._by_seller = defaultdict(list)
        for source_items in self._by_source.values():
            for item in source_items:
                self._by_seller[item.seller_id].append(item)

    def all_items(self) -> List[AssortmentItem]:
        with self._lock:
            return [item for values in self._by_source.values() for item in values]

    def items_by_seller(self, seller_id: str) -> List[AssortmentItem]:
        with self._lock:
            return list(self._by_seller.get(seller_id, []))


store = InMemoryAssortmentStore()
