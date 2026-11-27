import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.routing import APIRoute

from app.rate_limit import RateLimiter, RateLimitMiddleware
from app.routers import (
    backtracking,
    catalog,
    dynamic_programming,
    graph,
    hash_tables,
    numbers,
    searching,
    sorting,
    trees,
)
from app.step_cache import StepCache, StepCacheMiddleware


# The routers whose endpoints generate steps. Their paths are rate limited and
# cached.
STEP_ROUTERS = (
    sorting.router,
    searching.router,
    graph.router,
    dynamic_programming.router,
    backtracking.router,
    trees.router,
    hash_tables.router,
)
STEP_PATHS = frozenset(
    route.path
    for router in STEP_ROUTERS
    for route in router.routes
    if isinstance(route, APIRoute)
)

app = FastAPI(title="Algorithm Visualizer API")

# Starlette runs the middleware added last first, so a request passes GZip,
# CORS, the rate limiter, and the cache, in that order. CORS wraps the limiter
# so that a browser can read its 429 response, and answers preflight requests
# without counting them. The limiter wraps the cache, so a cache hit counts
# against the limit too. The cache stores bodies before GZip compresses them.
step_cache = StepCache.from_environment()
if step_cache is not None:
    app.add_middleware(StepCacheMiddleware, cache=step_cache, paths=STEP_PATHS)
rate_limiter = RateLimiter.from_environment()
if rate_limiter is not None:
    app.add_middleware(RateLimitMiddleware, limiter=rate_limiter, paths=STEP_PATHS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ],
    # Only the standalone development helper opts into other loopback ports.
    allow_origin_regex=(
        r"http://(localhost|127\.0\.0\.1):[0-9]{1,5}"
        if os.environ.get("ALGORITHM_VISUALIZER_DEV_CORS") == "1"
        else None
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)
# Step responses repeat a lot of structure and compress well; level 5 keeps
# most of the gain of level 9 at a lower CPU cost.
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)

for router in (catalog.router, numbers.router, *STEP_ROUTERS):
    app.include_router(router)


@app.get("/health")
def health() -> dict[str, str]:
    """Report that the service is up, for container and platform health checks."""

    return {"status": "ok"}
