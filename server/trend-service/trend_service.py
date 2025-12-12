"""
Style Shepherd — Trend Integration Service (single-file prototype)

What this file provides
-----------------------
A lightweight FastAPI service that demonstrates several practical,
hackathon-ready ways to integrate style/trend signals without paid APIs:

1. /api/trends?keywords=kw1,kw2,...
   - Uses pytrends (unofficial Google Trends client) to fetch interest-over-time
     and returns normalized trend scores per keyword.
   - Falls back to mock/synthetic scores if pytrends or network is unavailable.

2. /api/clusters?n_clusters=8
   - Downloads Fashion-MNIST from OpenML (if available), runs quick PCA+KMeans,
     and returns lightweight cluster summaries (counts, sample indices).
   - Falls back to a small built-in mock dataset if offline.

3. /api/mock-trends
   - Returns curated mock trend data (useful for demos / pitch decks).

4. /api/combined?keywords=...
   - Combines Google Trends-derived scores with cluster popularity to produce
     "trend-aware style-group scores" that can feed your recommender.

Notes and caveats
-----------------
* pytrends: no API key needed but depends on Google Trends behavior and may be
  rate-limited or blocked in some environments. The code handles failures by
  returning deterministic mock data.

* Fashion-MNIST: pulled via sklearn.datasets.fetch_openml('Fashion-MNIST').
  Internet is required. If unavailable, we use a tiny internal mock.

* This is meant for prototyping / hackathon use. For production:
  - Add caching, retries, auth, rate-limiting.
  - Move heavy ML work offline or into scheduled jobs.
  - Respect Google Terms of Service for Trends usage.

How to run
----------
1. Create a virtualenv and install deps:

   python -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn scikit-learn pandas numpy python-multipart Pillow

   OPTIONAL (recommended for real trends):
   pip install pytrends

2. Run:

   uvicorn trend_service:app --reload --port 8000

3. Open:

   http://localhost:8000/docs  (Swagger / interactive)
"""

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import traceback
import math
import time
import random
import os

# Optional imports (may be unavailable in sandbox). We handle import failures gracefully.
try:
    from pytrends.request import TrendReq
    _HAS_PYTRENDS = True
except Exception:
    _HAS_PYTRENDS = False

try:
    import numpy as np
    import pandas as pd
    from sklearn.decomposition import PCA
    from sklearn.cluster import KMeans
    from sklearn.datasets import fetch_openml
    _HAS_SKLEARN = True
except Exception:
    _HAS_SKLEARN = False

# Basic FastAPI app
app = FastAPI(title="Style Shepherd — Trend Prototype Service", version="0.1")

# CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# reference image path (developer uploaded asset)
# Note: Update this path if you have a design reference image
REFERENCE_ASSET_PATH = '/mnt/data/A_presentation_slide_titled_"The_Challenge_in_Fash.png'

# ---------------------------
# Utilities
# ---------------------------
def safe_normalize(scores: List[float]) -> List[float]:
    """Normalize a list of positive numbers into [0,1] scores. If all zeros, return zeros."""
    arr = [float(max(0.0, s)) for s in scores]
    smax = max(arr) if arr else 0.0
    smin = min(arr) if arr else 0.0
    if smax == smin:
        # nothing to scale
        return [0.0 for _ in arr]
    return [(v - smin) / (smax - smin) for v in arr]

def mock_trend_scores(keywords: List[str]) -> Dict[str, float]:
    """Return deterministic mock scores for given keywords (stable between runs)."""
    scores = {}
    for k in keywords:
        # deterministic pseudo-random based on keyword hash
        h = abs(hash(k)) % 1000
        base = ((h % 70) + (len(k) % 30)) / 100.0
        # clamp
        scores[k] = round(min(1.0, max(0.01, base)), 3)
    # normalize
    norm_vals = safe_normalize(list(scores.values()))
    return {k: round(v, 3) for k, v in zip(scores.keys(), norm_vals)}

# ---------------------------
# 1) Google Trends via pytrends (best-effort)
# ---------------------------
def fetch_google_trends(keywords: List[str], timeframe: str = 'today 12-m') -> Dict[str, float]:
    """
    Query Google Trends for keywords and return a normalized score per keyword (0-1).
    Requires pytrends installed and outbound network access.
    """
    if not _HAS_PYTRENDS:
        raise RuntimeError("pytrends not installed in this environment")

    # instantiate pytrends
    pytrends = TrendReq(hl='en-US', tz=360)
    # pytrends accepts up to ~5 keywords per request for comparison; we chunk if needed
    CHUNK = 5
    all_scores = {}
    for i in range(0, len(keywords), CHUNK):
        chunk = keywords[i:i+CHUNK]
        try:
            pytrends.build_payload(chunk, timeframe=timeframe)
            df = pytrends.interest_over_time()
            if df is None or df.empty:
                # fallback: zeroes
                for k in chunk:
                    all_scores[k] = 0.0
                continue
            # df has columns for each kw and 'isPartial'
            # compute mean interest per kw
            for k in chunk:
                if k in df.columns:
                    vals = df[k].fillna(0.0).astype(float).values
                    mean_val = float(vals.mean()) if len(vals) else 0.0
                    all_scores[k] = mean_val
                else:
                    all_scores[k] = 0.0
        except Exception as e:
            # best-effort: if Google blocks, raise to caller
            raise RuntimeError(f"pytrends failure: {e}")
    # normalize to 0-1
    keys = list(all_scores.keys())
    vals = [all_scores[k] for k in keys]
    normed = safe_normalize(vals)
    return {k: float(round(v, 4)) for k, v in zip(keys, normed)}

# ---------------------------
# 2) Fashion-MNIST quick clustering
# ---------------------------
_CLUSTER_CACHE: Optional[Dict[str, Any]] = None

def compute_fashion_clusters(n_clusters: int = 8, sample_limit: int = 5000) -> Dict[str, Any]:
    """
    Quick pipeline:
    - fetch Fashion-MNIST from OpenML (if available)
    - apply PCA to 50 dims
    - KMeans clustering into n_clusters
    Returns lightweight summary: cluster counts, sample indices, example pixels shape
    """
    global _CLUSTER_CACHE
    cache_key = f"clusters_{n_clusters}_{sample_limit}"
    if _CLUSTER_CACHE and _CLUSTER_CACHE.get("key") == cache_key:
        return _CLUSTER_CACHE["value"]

    if not _HAS_SKLEARN:
        # fallback: small mock clusters
        clusters = {
            "meta": {"n_clusters": n_clusters, "source": "mock"},
            "clusters": []
        }
        for i in range(n_clusters):
            clusters["clusters"].append({
                "cluster_id": i,
                "count": random.randint(20, 200),
                "sample_indices": [random.randint(0, 999) for _ in range(3)],
                "label_hint": random.choice(["tops", "dresses", "shoes", "accessories"])
            })
        _CLUSTER_CACHE = {"key": cache_key, "value": clusters}
        return clusters

    # try to download / load dataset
    try:
        # fetch_openml returns X as (70000, 784) for Fashion-MNIST
        ds = fetch_openml('Fashion-MNIST', version=1, as_frame=False)
        X = ds['data'].astype(np.float32) / 255.0  # shape (70000, 784)
        # optionally reduce sample for speed
        if sample_limit and X.shape[0] > sample_limit:
            rng = np.random.default_rng(42)
            idx = rng.choice(X.shape[0], sample_limit, replace=False)
            Xs = X[idx]
        else:
            idx = np.arange(X.shape[0])
            Xs = X
        # PCA
        pca = PCA(n_components=min(50, Xs.shape[1]), random_state=42)
        Z = pca.fit_transform(Xs)
        # KMeans
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(Z)
        clusters = {"meta": {"n_clusters": n_clusters, "source": "fashion-mnist", "sampled": Xs.shape[0]},
                    "clusters": []}
        for c in range(n_clusters):
            inds = list(np.where(labels == c)[0])
            # map back to original dataset indices (if sampled)
            sample_inds = [int(idx[i]) for i in inds[:5]]  # up to 5 sample indices
            clusters["clusters"].append({
                "cluster_id": int(c),
                "count": int(len(inds)),
                "sample_indices": sample_inds,
                "centroid_norm": float(np.linalg.norm(kmeans.cluster_centers_[c])),
                "label_hint": "unknown"  # could run a classifier to name clusters
            })
        _CLUSTER_CACHE = {"key": cache_key, "value": clusters}
        return clusters
    except Exception as e:
        # fallback on error
        clusters = {
            "meta": {"n_clusters": n_clusters, "source": "fallback_error"},
            "clusters": []
        }
        for i in range(n_clusters):
            clusters["clusters"].append({
                "cluster_id": i,
                "count": random.randint(10, 200),
                "sample_indices": [random.randint(0, 999) for _ in range(3)],
                "label_hint": random.choice(["tops", "dresses", "outerwear"])
            })
        _CLUSTER_CACHE = {"key": cache_key, "value": clusters}
        return clusters

# ---------------------------
# 3) Mock / curated trend data (useful for demos)
# ---------------------------
def curated_mock_trends() -> Dict[str, Any]:
    """Return a structured mock trends feed — style categories with scores & notes."""
    data = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "reference_asset": REFERENCE_ASSET_PATH,
        "trends": [
            {"category": "linen", "score": 0.92, "note": "Rising in searches across Europe; summer staple"},
            {"category": "oversized-blazer", "score": 0.79, "note": "High engagement on social platforms"},
            {"category": "pastel-denim", "score": 0.66, "note": "Niche but rapidly growing"},
            {"category": "sustainable-fabrics", "score": 0.87, "note": "Brands pushing eco-friendly collections"},
            {"category": "athleisure", "score": 0.58, "note": "Stable interest; high conversion rates"}
        ]
    }
    return data

# ---------------------------
# 4) Combined logic (trend + cluster popularity)
# ---------------------------
def combine_trends_with_clusters(trend_scores: Dict[str, float], cluster_summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Heuristic: Prefer style categories with growing trend scores and clusters that
    are large/popular in the dataset or sampled telemetry. This function demonstrates
    a simple merge; replace with ML model for production.
    """
    # cluster popularity score = normalized cluster counts
    cluster_counts = [c["count"] for c in cluster_summary["clusters"]]
    pop_norm = safe_normalize(cluster_counts) if cluster_counts else []
    cluster_info = []
    for c, pop in zip(cluster_summary["clusters"], pop_norm):
        # create a pseudo category name (use label_hint if exists)
        cat = c.get("label_hint") or f"cluster_{c['cluster_id']}"
        # base score: combine trend (if exists) and cluster pop
        trend_val = trend_scores.get(cat, 0.0)
        combined = 0.6 * trend_val + 0.4 * pop  # weighting example
        cluster_info.append({
            "cluster_id": c["cluster_id"],
            "category": cat,
            "cluster_pop_score": round(pop, 3),
            "trend_score": round(float(trend_val), 3),
            "combined_score": round(float(combined), 3),
            "sample_indices": c.get("sample_indices", [])[:3]
        })
    # also include standalone trend-only categories not part of clusters
    extra_trends = []
    for k, v in trend_scores.items():
        if not any(ci["category"] == k for ci in cluster_info):
            extra_trends.append({"category": k, "trend_score": round(v, 3)})
    return {"clusters": cluster_info, "extra_trends": extra_trends, "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

# ---------------------------
# FastAPI endpoints
# ---------------------------

@app.get("/api/mock-trends")
async def api_mock_trends():
    """Return curated mock trends useful for demos / slides."""
    try:
        payload = curated_mock_trends()
        return JSONResponse(content=payload)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

@app.get("/api/trends")
async def api_trends(keywords: Optional[str] = Query(None, description="Comma-separated keywords, e.g. 'linen,denim'"),
                     timeframe: str = Query('today 12-m', description="pytrends timeframe string")):
    """
    Query Google Trends for provided keywords. If pytrends is absent or fails,
    return deterministic mock scores instead.
    """
    try:
        if not keywords:
            return JSONResponse(content={"error": "please provide ?keywords=kw1,kw2,..."}, status_code=400)
        kws = [k.strip() for k in keywords.split(",") if k.strip()]
        if not kws:
            return JSONResponse(content={"error": "no valid keywords provided"}, status_code=400)

        # try real pytrends if available
        if _HAS_PYTRENDS:
            try:
                res = fetch_google_trends(kws, timeframe=timeframe)
                return JSONResponse(content={"source": "pytrends", "timeframe": timeframe, "scores": res})
            except Exception as e:
                # fallback to mock
                fallback = mock_trend_scores(kws)
                return JSONResponse(content={"source": "fallback_pytrends_error", "error": str(e), "scores": fallback})
        else:
            fallback = mock_trend_scores(kws)
            return JSONResponse(content={"source": "mock", "scores": fallback})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

@app.get("/api/clusters")
async def api_clusters(n_clusters: int = 8, sample_limit: int = 5000):
    """Return Fashion-MNIST cluster summaries (PCA + KMeans)."""
    try:
        clusters = compute_fashion_clusters(n_clusters=n_clusters, sample_limit=sample_limit)
        return JSONResponse(content=clusters)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

@app.get("/api/combined")
async def api_combined(keywords: Optional[str] = Query(None, description="Comma-separated keywords to bias trends"),
                       n_clusters: int = 8):
    """
    Combine trend keyword scores with cluster popularity to return a
    'trend-aware cluster ranking' useful for a trend-powered recommender.
    """
    try:
        # get trends
        if keywords:
            kws = [k.strip() for k in keywords.split(",") if k.strip()]
            if _HAS_PYTRENDS:
                try:
                    trend_scores = fetch_google_trends(kws)
                except Exception:
                    trend_scores = mock_trend_scores(kws)
            else:
                trend_scores = mock_trend_scores(kws)
        else:
            # use curated mock categories if no keywords
            curated = curated_mock_trends()
            trend_scores = {t["category"]: t["score"] for t in curated["trends"]}

        # get clusters
        clusters = compute_fashion_clusters(n_clusters=n_clusters)
        combined = combine_trends_with_clusters(trend_scores, clusters)
        # attach reference asset path to help frontends render design-consistent slides
        combined["reference_asset"] = REFERENCE_ASSET_PATH
        return JSONResponse(content=combined)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

# ---------------------------
# Example "demo" endpoint that returns a trend + suggested products payload
# ---------------------------
@app.get("/api/demo-recommendation")
async def api_demo_recommendation(keywords: Optional[str] = Query(None), limit: int = 5):
    """
    Demo feed: takes keywords (trends) and returns mock recommended items with
    trend-aware scoring and sizeConfidence hints. Useful to wire into your voice agent.
    """
    try:
        # base trends
        if keywords:
            kws = [k.strip() for k in keywords.split(",") if k.strip()]
            trend_scores = mock_trend_scores(kws)
        else:
            trend_scores = {t["category"]: t["score"] for t in curated_mock_trends()["trends"]}

        # produce demo products influenced by trend keys
        products = []
        # seed deterministic pseudo-randomness
        seed = sum(ord(c) for c in "".join(trend_scores.keys())) % 97
        rng = random.Random(seed)
        for i in range(limit):
            cat = rng.choice(list(trend_scores.keys()))
            trend_val = trend_scores[cat]
            price = int(40 + rng.random() * 120)
            size_conf = int(70 + rng.random() * 30)
            return_risk = round(max(0.02, 1.0 - trend_val - rng.random() * 0.2), 2)
            products.append({
                "id": f"demo-{cat}-{i}",
                "title": f"{cat.title().replace('-', ' ')} Sample {i+1}",
                "price": price,
                "image": None,
                "sizeRecommendation": random.choice(["S", "M", "L"]),
                "sizeConfidence": size_conf,
                "returnRiskScore": return_risk,
                "returnRiskLabel": "low" if return_risk < 0.25 else "medium",
                "trendCategory": cat,
                "trendScore": round(trend_val, 3)
            })
        return JSONResponse(content={"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "products": products, "reference_asset": REFERENCE_ASSET_PATH})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

# ---------------------------
# Root health check / quick info
# ---------------------------
@app.get("/")
async def root():
    info = {
        "service": "Style Shepherd Trend Prototype",
        "endpoints": ["/api/mock-trends", "/api/trends", "/api/clusters", "/api/combined", "/api/demo-recommendation"],
        "pytrends_available": bool(_HAS_PYTRENDS),
        "sklearn_available": bool(_HAS_SKLEARN),
        "reference_asset_path": REFERENCE_ASSET_PATH,
        "notes": "This service is for prototyping and hackathon use. Add caching & auth for production."
    }
    return JSONResponse(content=info)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return JSONResponse(content={"status": "healthy", "service": "trend-service"})
