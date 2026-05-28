from fastapi import FastAPI

from app.routers.analysis import router as analysis_router

app = FastAPI(
    title="Retail Brand Comparison API",
    description="API for brand-level assortment gaps, top-seller comparison, offer competitiveness, and sentiment insights.",
    version="0.1.0",
)

app.include_router(analysis_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
