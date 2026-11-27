"""In-process cache of step responses.

Step generation is deterministic: the same request always returns the same
steps. The cache keeps successful step responses in memory and replays them
without validating the request, running the algorithm, or serializing the
result again.

- Only POST requests to the step paths are cached, so `/numbers/random` never
  is. Only HTTP 200 responses are stored; errors are recomputed every time.
- The key is the path and a digest of the JSON body, re-serialized after
  `json.loads`, the parser FastAPI uses. Bodies that differ only in whitespace,
  string escapes, or the spelling of a number share an entry, and a hit returns
  the bytes the handler would have produced for the request. Object keys keep
  their order, because a response can echo a mapping from the request.
- Requests that FastAPI would not parse as JSON, because of their content type
  or a malformed body, bypass the cache and fail as before.
- The cache sits inside `GZipMiddleware` and stores uncompressed bodies, so one
  entry serves every client, and hits are compressed on the way out.
- Its size is bounded by the total size of the stored bodies. The least
  recently used entries are evicted first.
"""

import email.message
import hashlib
import json
import threading
from collections import OrderedDict
from collections.abc import Collection
from dataclasses import dataclass
from typing import Self

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.environment import integer_setting


DEFAULT_MAX_MB = 64

CacheKey = tuple[str, bytes]


@dataclass(frozen=True, slots=True)
class CachedResponse:
    headers: tuple[tuple[bytes, bytes], ...]
    body: bytes


class StepCache:
    """Least recently used responses within a byte budget. Safe from any thread."""

    def __init__(self, max_bytes: int) -> None:
        if max_bytes < 1:
            raise ValueError("A step cache needs a budget of at least one byte.")
        self.max_bytes = max_bytes
        self._entries: OrderedDict[CacheKey, CachedResponse] = OrderedDict()
        self._size = 0
        self._lock = threading.Lock()

    @classmethod
    def from_environment(cls) -> Self | None:
        """Build the cache that the environment configures, or None when it is off."""

        megabytes = integer_setting("STEP_CACHE_MAX_MB", DEFAULT_MAX_MB)
        return cls(megabytes * 1_000_000) if megabytes else None

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    @property
    def size(self) -> int:
        """Return the total size of the stored bodies, in bytes."""

        with self._lock:
            return self._size

    def get(self, key: CacheKey) -> CachedResponse | None:
        with self._lock:
            response = self._entries.get(key)
            if response is not None:
                self._entries.move_to_end(key)
            return response

    def put(self, key: CacheKey, response: CachedResponse) -> None:
        """Store a response. A body larger than the whole budget is not stored."""

        if len(response.body) > self.max_bytes:
            return
        with self._lock:
            previous = self._entries.pop(key, None)
            if previous is not None:
                self._size -= len(previous.body)
            self._entries[key] = response
            self._size += len(response.body)
            while self._size > self.max_bytes:
                _, evicted = self._entries.popitem(last=False)
                self._size -= len(evicted.body)


def cache_key(path: str, body: bytes) -> CacheKey | None:
    """Return the key for a request, or None when its body is not valid JSON."""

    try:
        canonical = json.dumps(json.loads(body), separators=(",", ":"))
    except (ValueError, RecursionError):
        return None
    return path, hashlib.sha256(canonical.encode()).digest()


def _is_json(content_type: str | None) -> bool:
    # The same test FastAPI applies before it parses a body as JSON.
    if not content_type:
        return False
    message = email.message.Message()
    message["content-type"] = content_type
    subtype = message.get_content_subtype()
    return message.get_content_maintype() == "application" and (
        subtype == "json" or subtype.endswith("+json")
    )


class StepCacheMiddleware:
    """Serve repeated POST requests to the given paths from a `StepCache`.

    Responses that pass through the cache carry `X-Cache: HIT` or `X-Cache: MISS`.
    """

    def __init__(
        self,
        app: ASGIApp,
        cache: StepCache,
        paths: Collection[str],
    ) -> None:
        self.app = app
        self.cache = cache
        self.paths = frozenset(paths)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"] in self.paths
            and _is_json(Headers(scope=scope).get("content-type"))
        ):
            await self.app(scope, receive, send)
            return

        # Read the whole body to build the key, then replay it to the app.
        messages: list[Message] = []
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] != "http.request" or not message.get("more_body"):
                break

        async def replay() -> Message:
            if messages:
                return messages.pop(0)
            return await receive()

        key = None
        if messages[-1]["type"] == "http.request":
            body = b"".join(message.get("body", b"") for message in messages)
            key = cache_key(scope["path"], body)
        if key is None:
            await self.app(scope, replay, send)
            return

        cached = self.cache.get(key)
        if cached is not None:
            await send(
                {
                    "type": "http.response.start",
                    "status": 200,
                    "headers": [*cached.headers, (b"x-cache", b"HIT")],
                }
            )
            await send({"type": "http.response.body", "body": cached.body})
            return

        headers: tuple[tuple[bytes, bytes], ...] | None = None
        chunks: list[bytes] = []

        async def store(message: Message) -> None:
            nonlocal headers
            if message["type"] == "http.response.start" and message["status"] == 200:
                headers = tuple(
                    (name, value) for name, value in message.get("headers", ())
                )
                message = {**message, "headers": [*headers, (b"x-cache", b"MISS")]}
            elif message["type"] == "http.response.body" and headers is not None:
                chunks.append(message.get("body", b""))
                if not message.get("more_body"):
                    self.cache.put(key, CachedResponse(headers, b"".join(chunks)))
            await send(message)

        await self.app(scope, replay, store)
