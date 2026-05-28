from __future__ import annotations

import json
import os
from typing import List

import httpx
from dotenv import load_dotenv

from app.models import SentimentInput, SourceSentiment, SentimentResponse

load_dotenv()


class LLMService:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    async def summarize_sentiment(self, topic: str, items: List[SentimentInput]) -> SentimentResponse:
        if not self.api_key:
            return self._heuristic_sentiment(topic, items)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a retail analyst. Return only valid JSON with this schema: "
                    "{summary: string, source_sentiments: [{source: string, sentiment: positive|neutral|negative, confidence: number, key_points: string[]}]}"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "topic": topic,
                        "sources": [item.model_dump() for item in items],
                    }
                ),
            },
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)

            source_sentiments = [SourceSentiment(**entry) for entry in parsed.get("source_sentiments", [])]
            return SentimentResponse(
                topic=topic,
                summary=parsed.get("summary", "No summary generated"),
                source_sentiments=source_sentiments,
            )
        except Exception:
            return self._heuristic_sentiment(topic, items)

    def _heuristic_sentiment(self, topic: str, items: List[SentimentInput]) -> SentimentResponse:
        positives = {"good", "great", "best", "love", "fast", "value", "improved"}
        negatives = {"bad", "late", "slow", "missing", "expensive", "out of stock", "broken"}

        source_outputs: List[SourceSentiment] = []
        for source in items:
            joined = " ".join(source.texts).lower()
            p_score = sum(1 for token in positives if token in joined)
            n_score = sum(1 for token in negatives if token in joined)
            if p_score > n_score:
                sentiment = "positive"
            elif n_score > p_score:
                sentiment = "negative"
            else:
                sentiment = "neutral"

            confidence = 0.6 if sentiment != "neutral" else 0.5
            key_points = source.texts[:3]
            source_outputs.append(
                SourceSentiment(
                    source=source.source,
                    sentiment=sentiment,
                    confidence=confidence,
                    key_points=key_points,
                )
            )

        summary = f"Sentiment summary generated for {topic} across {len(items)} source(s)."
        return SentimentResponse(topic=topic, summary=summary, source_sentiments=source_outputs)


llm_service = LLMService()
