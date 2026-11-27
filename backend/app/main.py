import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

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


app = FastAPI(title="Algorithm Visualizer API")
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

for router in (
    catalog.router,
    numbers.router,
    sorting.router,
    searching.router,
    graph.router,
    dynamic_programming.router,
    backtracking.router,
    trees.router,
    hash_tables.router,
):
    app.include_router(router)
