"""Per-client rate limiting for the step endpoints.

Step generation is synchronous and CPU-bound, so a few concurrent worst-case
requests can occupy a small instance. Each client gets a token bucket: it may
send up to `requests` requests at once, and that allowance refills at
`requests` per `window_seconds`. A request over the allowance is answered with
HTTP 429 and a `Retry-After` header, before its body is read.

The limiter is off unless `RATE_LIMIT_REQUESTS` is set. Its state lives in the
process, so each worker process keeps its own allowances.
"""

import ipaddress
import math
import threading
import time
from collections import OrderedDict
from collections.abc import Callable, Collection
from dataclasses import dataclass
from typing import Self

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.environment import integer_setting


# A client idle for a whole window has a full bucket again, the same as a client
# never seen, so the limiter forgets it. This bound applies only when more
# clients than this are active within one window; the least recently seen one
# is then forgotten early.
MAX_CLIENTS = 10_000


@dataclass(slots=True)
class _Bucket:
    tokens: float
    updated: float


class RateLimiter:
    """Token buckets keyed by client address. Safe to call from any thread."""

    def __init__(
        self,
        requests: int,
        window_seconds: float,
        *,
        trusted_proxies: int = 0,
        max_clients: int = MAX_CLIENTS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if requests < 1 or window_seconds <= 0:
            raise ValueError("A rate limit needs at least one request per window.")
        if trusted_proxies < 0 or max_clients < 1:
            raise ValueError("Use trusted_proxies >= 0 and max_clients >= 1.")
        self.requests = requests
        self.window_seconds = window_seconds
        self.trusted_proxies = trusted_proxies
        self._capacity = float(requests)
        self._rate = requests / window_seconds
        self._max_clients = max_clients
        self._clock = clock
        # Ordered from least to most recently seen.
        self._buckets: OrderedDict[str, _Bucket] = OrderedDict()
        self._lock = threading.Lock()

    @classmethod
    def from_environment(cls) -> Self | None:
        """Build the limiter that the environment configures, or None when it is off."""

        requests = integer_setting("RATE_LIMIT_REQUESTS", 0)
        if requests == 0:
            return None
        return cls(
            requests,
            integer_setting("RATE_LIMIT_WINDOW_SECONDS", 60, minimum=1),
            trusted_proxies=integer_setting("RATE_LIMIT_TRUSTED_PROXIES", 0),
        )

    def __len__(self) -> int:
        """Return the number of clients the limiter remembers."""

        with self._lock:
            return len(self._buckets)

    def acquire(self, client: str) -> float:
        """Spend one request from the client's allowance.

        Return 0 when the request may proceed, and otherwise the number of
        seconds until the client has a request to spend again.
        """

        with self._lock:
            now = self._clock()
            self._forget_idle_clients(now)
            bucket = self._buckets.get(client)
            if bucket is None:
                if len(self._buckets) >= self._max_clients:
                    self._buckets.popitem(last=False)
                bucket = _Bucket(tokens=self._capacity, updated=now)
                self._buckets[client] = bucket
            else:
                refill = (now - bucket.updated) * self._rate
                bucket.tokens = min(self._capacity, bucket.tokens + refill)
                bucket.updated = now
                self._buckets.move_to_end(client)
            if bucket.tokens >= 1:
                bucket.tokens -= 1
                return 0.0
            return (1 - bucket.tokens) / self._rate

    def _forget_idle_clients(self, now: float) -> None:
        while self._buckets:
            client, bucket = next(iter(self._buckets.items()))
            if now - bucket.updated < self.window_seconds:
                return
            del self._buckets[client]


def client_address(scope: Scope, trusted_proxies: int = 0) -> str:
    """Return the address that identifies the client of a request.

    By default this is the peer address of the connection. Behind a proxy the
    peer is the proxy, and every client would share one allowance. With
    `trusted_proxies` set to the number of proxies in front of the service,
    the address comes from `X-Forwarded-For` instead. Each proxy appends the
    address it received the request from, so the entry `trusted_proxies`
    places from the end was added by the outermost proxy and names the client.
    Entries to its left came from the client and are ignored, because a client
    can write anything there.

    IPv6 clients are grouped by /64 network, which is usually what a single
    subscriber is assigned.
    """

    address = ""
    if trusted_proxies:
        forwarded = [
            entry.strip()
            for name, value in scope["headers"]
            if name == b"x-forwarded-for"
            for entry in value.decode("latin-1").split(",")
        ]
        forwarded = [entry for entry in forwarded if entry]
        if forwarded:
            address = forwarded[max(len(forwarded) - trusted_proxies, 0)]
    if not address and scope.get("client"):
        address = scope["client"][0]
    return _client_key(address) if address else "unknown"


def _client_key(address: str) -> str:
    host = address
    if host.startswith("["):
        # An IPv6 address with a port: "[2001:db8::1]:443".
        host = host[1:].partition("]")[0]
    elif host.count(":") == 1:
        # An IPv4 address with a port: "203.0.113.7:51234".
        host = host.partition(":")[0]
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return address
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return str(ip.ipv4_mapped)
        return str(ipaddress.IPv6Network((ip, 64), strict=False))
    return str(ip)


class RateLimitMiddleware:
    """Answer HTTP 429 to clients over their allowance on the given POST paths."""

    def __init__(
        self,
        app: ASGIApp,
        limiter: RateLimiter,
        paths: Collection[str],
    ) -> None:
        self.app = app
        self.limiter = limiter
        self.paths = frozenset(paths)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"] in self.paths
        ):
            client = client_address(scope, self.limiter.trusted_proxies)
            retry_after = self.limiter.acquire(client)
            if retry_after > 0:
                seconds = max(1, math.ceil(retry_after))
                unit = "second" if seconds == 1 else "seconds"
                response = JSONResponse(
                    {"detail": f"Too many requests. Try again in {seconds} {unit}."},
                    status_code=429,
                    headers={"Retry-After": str(seconds)},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)
