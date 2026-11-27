# Algorithm Visualizer Backend

FastAPI service that runs the visualizer's algorithms and returns each run as an
ordered list of execution states. The frontend plays those states back; the
backend validates the input, runs the selected algorithm, and records a snapshot
with a description and, where one applies, a 1-based pseudocode line at every
step. It also serves the algorithm catalog: names, complexities, notes, and
pseudocode for all 41 algorithms.

The service keeps no state between requests and has no database. Step
generation is deterministic: the same request always returns the same steps.

## Requirements

- Python 3.12 or newer
- [uv](https://docs.astral.sh/uv/)

## Run

From the repository root, install the locked dependencies and start the API:

```bash
python scripts/dev.py setup
python scripts/dev.py backend
```

The helper prefers port `8000`, selects the next free port if `8000` is taken,
and prints the API and interactive docs URLs. Use `python scripts/dev.py dev` to
start the frontend as well, with matching URL and CORS settings.

To run the server without the helper:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

`CORS_ORIGINS` takes a comma-separated list of exact frontend origins. Without
it, the API accepts `http://localhost:3000` and `http://127.0.0.1:3000`.

The endpoints, request examples, and response conventions are documented in
[docs/api.md](../docs/api.md). The running service also serves an OpenAPI
interface at `/docs`.

## Test

From the `backend` directory:

```bash
uv run ruff check . ../scripts
uv run ruff format --check . ../scripts
uv run mypy
uv run pytest
```

Run one file with `uv run pytest tests/test_graph.py`. To run the backend and
frontend checks together, use `python scripts/dev.py check` from the repository
root.

## Layout

```text
backend/
├── main.py                    # Re-exports app.main:app
├── export_api.py              # Writes the OpenAPI schema and catalog that frontend/types/generated/ is built from
├── app/
│   ├── main.py                # FastAPI app, middleware, router registration
│   ├── routers/               # One router per category, plus the catalog and random numbers
│   ├── schemas/               # Request and response models per category; limits.py reads input limits from them
│   └── algorithms/
│       ├── metadata.py        # Catalog served by GET /algorithms
│       ├── types.py           # Shared step type; sorting and searching identifiers
│       ├── sorting/
│       ├── searching/
│       ├── hash_tables/
│       ├── trees/
│       ├── graph/
│       ├── dynamic_programming/
│       └── backtracking/
└── tests/                     # pytest suite, one file per category plus API, CORS, metadata, and dev helper tests
```

Each category package holds the step functions for its algorithms, usually one
module per algorithm, and a `types.py` for its step shape where the category
needs one. Its `__init__.py` maps algorithm identifiers to step functions, for
example `SORTING_ALGORITHMS`; the graph package uses `graph_algorithm_steps`
instead.

Each module in `app/schemas/` defines the category's request and response
models and maps every algorithm identifier to the model that validates its
input, for example `SORTING_REQUEST_MODELS`. Input limits are declared once, as
`Field` constraints on those models; `GET /algorithms` reads them back, so the
catalog, the OpenAPI schema, and validation always agree. Dynamic programming
and backtracking have one request model per algorithm, joined into a union
discriminated on `algorithm`.

To add an algorithm:

1. Write a function that returns its list of steps in the category package, and
   register it in the package's `__init__.py`.
2. Add its identifier to the category's `Literal` type.
3. Add its entry, including pseudocode, to `app/algorithms/metadata.py`.
   `tests/test_metadata.py` fails when the metadata, the `Literal` type, and the
   registry disagree.
4. Map its identifier to a request model in `app/schemas/<category>.py`. For
   dynamic programming and backtracking, add a request model with its fields
   and limits, add it to the category's union, and register it in the
   category's `*_REQUEST_MODELS`; the category's router in `app/routers/` calls
   the model's `algorithm_input()`. `tests/test_api_contract.py` fails when an
   algorithm has no request model.
5. Add tests beside the existing ones for that category.
