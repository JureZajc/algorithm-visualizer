# Deployment

The frontend and the backend are hosted separately. The backend runs as a container. The frontend is a Next.js build that calls the backend at a URL fixed when it is built.

Nothing is deployed yet, and the repository does not prescribe a host. This guide covers what any host needs.

## Order of Steps

1. Build and deploy the backend container, and note its public URL, for example `https://api.example.com`.
2. Build the frontend with `NEXT_PUBLIC_API_URL` set to that URL, deploy it, and note its origin, for example `https://visualizer.example.com`.
3. Set `CORS_ORIGINS` on the backend to that origin and restart it.
4. Check the deployment as described in [After Deploying](#after-deploying).

## Backend Container

### Build and Run

From the repository root:

```bash
docker build -t algorithm-visualizer-api backend
docker run --rm -p 8000:8000 algorithm-visualizer-api
curl http://localhost:8000/health
```

The image installs the runtime dependencies from `backend/uv.lock` with `uv sync --locked`, so a lockfile that does not match `pyproject.toml` fails the build. It leaves out the development tools and uv itself, runs as an unprivileged `app` user, and starts one Uvicorn process that serves `app.main:app` on `$PORT`. Uvicorn shuts down gracefully on `SIGTERM`.

With the defaults, the local frontend can use the container directly: `python scripts/dev.py frontend` calls `http://127.0.0.1:8000`, and the backend accepts requests from `http://localhost:3000` and `http://127.0.0.1:3000`. If the frontend starts on a different port, set `CORS_ORIGINS` to match, for example `docker run --rm -p 8000:8000 -e CORS_ORIGINS=http://localhost:3001 algorithm-visualizer-api`.

### Environment Variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8000` | Port that Uvicorn listens on. Most hosts set it. |
| `CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated list of exact frontend origins allowed to call the API. Set it to the deployed frontend's origin, with no path or trailing slash. |
| `RATE_LIMIT_REQUESTS` | `0` (off) | Step requests each client may send per window, which is also the largest burst. See [Rate Limiting](#rate-limiting). |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Length of the window for `RATE_LIMIT_REQUESTS`, in seconds. |
| `RATE_LIMIT_TRUSTED_PROXIES` | `0` | Number of proxies in front of the service that append to `X-Forwarded-For`. `0` identifies a client by its connection address. See [Clients Behind a Proxy](#clients-behind-a-proxy). |
| `STEP_CACHE_MAX_MB` | `64` | Memory for cached step responses, in megabytes (1,000,000 bytes) of response body. `0` turns the cache off. See [Response Cache](#response-cache). |

The numeric settings take whole numbers. A blank value counts as unset. Any other invalid value, such as `ten` or `-1`, stops the service at startup with a message that names the variable, so a typo cannot turn the rate limit off without notice.

For a public demo, start with:

```bash
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_TRUSTED_PROXIES=1   # set this to match the host; see below
STEP_CACHE_MAX_MB=64
```

Running a visualization sends one step request, and Compare sends one per selected algorithm, at most four. Thirty requests a minute is far more than a person sends by clicking, and it holds a script to one request every two seconds.

### Health Check

`GET /health` returns HTTP 200 with `{"status": "ok"}`. It does no other work, and it is never rate limited or cached. Point the host's health check at it.

The image declares no Docker `HEALTHCHECK`, because hosting platforms run their own HTTP checks against a path. Locally, use `curl` as shown above.

### Rate Limiting

Step generation is synchronous and CPU-bound, so a few concurrent worst-case requests can occupy a small instance. When `RATE_LIMIT_REQUESTS` is set, the service limits `POST` requests to the seven step endpoints:

- `/sorting/steps`, `/searching/steps`, `/hash-tables/steps`, `/trees/steps`, `/graph/steps`, `/dynamic-programming/steps`, `/backtracking/steps`

The catalog (`/` and `/algorithms`), `/numbers/random`, `/health`, the API docs, and CORS preflight requests are not limited.

Each client has one allowance shared by all step endpoints. It holds `RATE_LIMIT_REQUESTS` requests and refills at `RATE_LIMIT_REQUESTS` per `RATE_LIMIT_WINDOW_SECONDS`, so a client can send a full burst at once and then one request each `RATE_LIMIT_WINDOW_SECONDS / RATE_LIMIT_REQUESTS` seconds. A request over the allowance is answered before its body is read, with HTTP 429, a `Retry-After` header in seconds, and a message that the frontend shows:

```json
{ "detail": "Too many requests. Try again in 2 seconds." }
```

A response served from the cache counts against the allowance too. A cache hit is cheaper than a run but not free: the body is still compressed and sent, and it can be several megabytes before compression. Counting every request also makes the limit predictable, since whether a request is a hit depends on what other visitors asked for earlier.

The allowances live in the process. They reset when the service restarts, and if the host runs several replicas, each one keeps its own, so a client whose requests are spread over `N` replicas can send up to `N` times the limit.

### Clients Behind a Proxy

By default, a client is identified by the address of its connection to the service. Most hosts put a load balancer or proxy in front of the container, so every connection comes from the proxy and all visitors would share one allowance.

`RATE_LIMIT_TRUSTED_PROXIES` tells the service how many proxies every request passes through. When it is set to `N`, the service reads the `X-Forwarded-For` header and takes the entry `N` places from the end. Each proxy appends the address it received the request from, so that entry was written by the outermost proxy and names the visitor. Entries further left came from the visitor, who can write anything there, and are ignored.

For example, a visitor at `203.0.113.7` sends a forged `X-Forwarded-For: 192.0.2.1`. A CDN appends the visitor's address, and the host's load balancer appends the CDN's address. The service receives:

```text
X-Forwarded-For: 192.0.2.1, 203.0.113.7, 198.51.100.20
```

With `RATE_LIMIT_TRUSTED_PROXIES=2`, the service identifies the client as `203.0.113.7`.

| Setup | Value |
| --- | --- |
| Visitors connect to the container directly, for example `docker run` on a server with a public address | `0` |
| One load balancer or proxy, as on most container platforms | `1` |
| A CDN in front of the host's load balancer | `2` |

Check the host's documentation for how many proxies append to `X-Forwarded-For`, and set the value only when no request can reach the container without passing through all of them; a visitor who reaches the container directly can choose any identity. A value that is too high reads an address the visitor wrote, so the limit can be evaded. A value that is too low reads a proxy's address, so visitors share an allowance.

To check a deployment, send one request more than the limit, each with a different forged address. With the right value, the last request returns 429; if every request returns 200, the value is too high.

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.example.com/sorting/steps \
    -H 'Content-Type: application/json' -H "X-Forwarded-For: 192.0.2.$i" \
    -d '{"algorithm": "bubble_sort", "numbers": [3, 1, 2]}'
done
```

A port after an address is ignored, and IPv6 clients are grouped by /64 network, the block usually assigned to one subscriber.

Uvicorn has a separate proxy setting, `FORWARDED_ALLOW_IPS`, which rewrites the connection address for connections from the listed addresses (by default only `127.0.0.1`, which does not occur in the container). Leave it unset and use `RATE_LIMIT_TRUSTED_PROXIES`. In particular, do not set `FORWARDED_ALLOW_IPS=*`: Uvicorn then takes the leftmost entry of `X-Forwarded-For`, which the visitor controls.

### Response Cache

Step generation is deterministic, so the service keeps successful step responses in memory and replays them without running the algorithm again. The cache is on by default.

- **What is cached.** HTTP 200 responses to `POST` requests to the seven step endpoints, sent with a JSON content type. Errors are not cached, and neither is `/numbers/random`, whose output is random.
- **Key.** The path and a SHA-256 digest of the JSON body, re-serialized after parsing it the way FastAPI does. Requests that differ only in whitespace, string escapes, or how a number is written share an entry. Requests whose object keys are in a different order do not, because a response can repeat a mapping from the request in its order.
- **Compression.** The cache stores uncompressed bodies, and the existing gzip middleware compresses each response on the way out, so one entry serves clients with and without gzip support. The cost is small: the largest Sudoku response the API allows, 5.6 MB, takes 111 ms to generate and 14 ms to compress (measured on a laptop). Storing compressed bodies would fit about 35 times as many entries, but needs an entry per encoding.
- **Size.** `STEP_CACHE_MAX_MB` bounds the total size of the stored bodies. When it is full, the least recently used entries are evicted. A response larger than the whole budget is not stored. Keys and headers are not counted; they are small beside the bodies.
- **Headers.** Responses that pass through the cache carry `X-Cache: MISS` when generated and `X-Cache: HIT` when replayed.

The cache lives in the process and is emptied when the service restarts. In a local measurement, the process peaked at about 200 MB after the largest input of every algorithm, 56 requests in all, filled 49 MB of the cache, so an instance with 512 MB of memory fits the defaults.

### Processes and Threads

The step handlers are plain functions, so FastAPI runs them on a pool of worker threads, while the rate limiter and the cache run on the event loop before and after them. Both guard their state with a lock, so they stay correct whichever thread calls them. Python runs CPU-bound threads one at a time, so one process uses about one CPU core.

Run one process per container, as the image does. To use more cores, run more containers, and keep in mind that each one has its own allowances and cache.

## Frontend

The frontend reads the backend's URL from `NEXT_PUBLIC_API_URL`. Next.js inlines the value into the JavaScript bundle when the frontend is built, so set it at build time, and rebuild after changing it. Give the URL without a trailing slash; the frontend appends paths such as `/sorting/steps` to it.

```bash
cd frontend
npm ci
NEXT_PUBLIC_API_URL=https://api.example.com npm run build
npm run start
```

`npm run start` serves the build with `next start` on port 3000, or on `$PORT` when it is set. Alternatively, use a host that builds Next.js projects: set the project directory to `frontend` and add `NEXT_PUBLIC_API_URL` to the build environment.

The page is prerendered as static content, but the project does not configure a static export (`output: "export"` in `next.config.ts`), so the build needs `next start` or a host that runs Next.js. Serving it as plain files would need that frontend change first.

## After Deploying

1. `curl https://api.example.com/health` returns `{"status":"ok"}`.
2. The deployed frontend loads the algorithm catalog and runs a visualization. If the browser reports a CORS error, `CORS_ORIGINS` does not match the frontend's origin exactly.
3. Running the same visualization twice shows `X-Cache: HIT` on the second step request in the browser's network panel.
4. If the rate limit is on, the check in [Clients Behind a Proxy](#clients-behind-a-proxy) returns 429 for the last request.
5. Add the demo link to the top of the README.
