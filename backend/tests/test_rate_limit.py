import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from starlette.testclient import TestClient

from app.rate_limit import RateLimiter, client_address


SORT_REQUEST = {"algorithm": "bubble_sort", "numbers": [3, 1, 2]}


class FakeClock:
    def __init__(self) -> None:
        self.now = 1_000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_allows_a_burst_then_reports_when_to_retry() -> None:
    limiter = RateLimiter(3, 60, clock=FakeClock())

    assert [limiter.acquire("a") for _ in range(3)] == [0, 0, 0]
    # The allowance refills at 3 requests per 60 seconds: one every 20.
    assert limiter.acquire("a") == pytest.approx(20)


def test_refills_at_the_configured_rate() -> None:
    clock = FakeClock()
    limiter = RateLimiter(3, 60, clock=clock)
    for _ in range(3):
        limiter.acquire("a")

    clock.advance(10)
    assert limiter.acquire("a") == pytest.approx(10)
    clock.advance(10)
    assert limiter.acquire("a") == 0
    assert limiter.acquire("a") == pytest.approx(20)


def test_rejected_requests_do_not_spend_the_allowance() -> None:
    clock = FakeClock()
    limiter = RateLimiter(1, 60, clock=clock)
    limiter.acquire("a")
    for _ in range(5):
        assert limiter.acquire("a") > 0

    clock.advance(60)
    assert limiter.acquire("a") == 0


def test_the_allowance_never_exceeds_one_burst() -> None:
    clock = FakeClock()
    limiter = RateLimiter(2, 60, clock=clock)
    limiter.acquire("a")
    clock.advance(3_600)

    assert [limiter.acquire("a") for _ in range(3)] == [0, 0, pytest.approx(30)]


def test_clients_have_separate_allowances() -> None:
    limiter = RateLimiter(1, 60, clock=FakeClock())

    assert limiter.acquire("a") == 0
    assert limiter.acquire("b") == 0
    assert limiter.acquire("a") > 0


def test_forgets_clients_idle_for_a_whole_window() -> None:
    clock = FakeClock()
    limiter = RateLimiter(2, 60, clock=clock)
    limiter.acquire("a")
    clock.advance(30)
    limiter.acquire("b")
    clock.advance(30)
    limiter.acquire("c")

    # "a" has been idle for 60 seconds, so its bucket was full again.
    assert len(limiter) == 2
    assert [limiter.acquire("a") for _ in range(2)] == [0, 0]


def test_bounds_the_number_of_remembered_clients() -> None:
    limiter = RateLimiter(1, 60, max_clients=2, clock=FakeClock())
    for client in ("a", "b", "c"):
        limiter.acquire(client)

    assert len(limiter) == 2
    # The least recently seen client was forgotten and starts afresh.
    assert limiter.acquire("a") == 0
    assert limiter.acquire("c") > 0


def test_concurrent_requests_never_exceed_the_allowance(
    frequent_thread_switches: None,
) -> None:
    limiter = RateLimiter(100, 60, clock=FakeClock())
    threads = 16
    start = threading.Barrier(threads)

    def spend(_: int) -> int:
        start.wait()
        return sum(limiter.acquire("a") == 0 for _ in range(50))

    with ThreadPoolExecutor(threads) as pool:
        allowed = sum(pool.map(spend, range(threads)))

    assert allowed == 100


@pytest.mark.parametrize(
    "arguments",
    [
        {"requests": 0, "window_seconds": 60},
        {"requests": 1, "window_seconds": 0},
        {"requests": 1, "window_seconds": 60, "trusted_proxies": -1},
        {"requests": 1, "window_seconds": 60, "max_clients": 0},
    ],
)
def test_rejects_invalid_settings(arguments: dict[str, int]) -> None:
    with pytest.raises(ValueError):
        RateLimiter(**arguments)


def _scope(
    forwarded: list[str],
    client: tuple[str, int] | None = ("203.0.113.9", 50_000),
) -> dict[str, object]:
    return {
        "type": "http",
        "headers": [(b"x-forwarded-for", value.encode()) for value in forwarded],
        "client": client,
    }


@pytest.mark.parametrize(
    ("trusted_proxies", "forwarded", "expected"),
    [
        # Forwarded addresses are ignored unless proxies are trusted.
        (0, [], "203.0.113.9"),
        (0, ["198.51.100.1"], "203.0.113.9"),
        (1, ["198.51.100.1"], "198.51.100.1"),
        # A client cannot choose its identity by sending the header itself.
        (1, ["6.6.6.6, 198.51.100.1"], "198.51.100.1"),
        (2, ["6.6.6.6, 198.51.100.1, 192.0.2.10"], "198.51.100.1"),
        (1, ["6.6.6.6", "198.51.100.1"], "198.51.100.1"),
        # Fewer entries than proxies: take the leftmost, which a proxy added.
        (2, ["198.51.100.1"], "198.51.100.1"),
        (1, [], "203.0.113.9"),
        (1, [" , "], "203.0.113.9"),
        (1, ["198.51.100.1:51234"], "198.51.100.1"),
        (1, ["[2001:db8:1:2::5]:443"], "2001:db8:1:2::/64"),
        (1, ["unknown-host"], "unknown-host"),
    ],
)
def test_client_address_trusts_forwarded_addresses_only_when_told(
    trusted_proxies: int,
    forwarded: list[str],
    expected: str,
) -> None:
    assert client_address(_scope(forwarded), trusted_proxies) == expected


@pytest.mark.parametrize(
    ("client", "expected"),
    [
        (("2001:db8:1:2:aaaa:bbbb:cccc:1", 50_000), "2001:db8:1:2::/64"),
        (("2001:db8:1:2::9", 50_000), "2001:db8:1:2::/64"),
        (("::ffff:198.51.100.7", 50_000), "198.51.100.7"),
        (("testclient", 50_000), "testclient"),
        (None, "unknown"),
    ],
)
def test_client_address_groups_ipv6_clients_by_network(
    client: tuple[str, int] | None,
    expected: str,
) -> None:
    assert client_address(_scope([], client)) == expected


def test_rate_limit_is_off_by_default(configure_main) -> None:
    main = configure_main()

    assert main.rate_limiter is None
    with TestClient(main.app) as client:
        for _ in range(20):
            assert client.post("/sorting/steps", json=SORT_REQUEST).status_code == 200


def test_rejects_requests_over_the_limit_with_retry_after(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="2", RATE_LIMIT_WINDOW_SECONDS="3600")

    with TestClient(main.app) as client:
        statuses = [
            client.post("/sorting/steps", json=SORT_REQUEST).status_code
            for _ in range(2)
        ]
        response = client.post("/sorting/steps", json=SORT_REQUEST)

    assert statuses == [200, 200]
    assert response.status_code == 429
    # One request refills every 1,800 seconds.
    retry_after = int(response.headers["retry-after"])
    assert 1_790 <= retry_after <= 1_800
    assert response.json() == {
        "detail": f"Too many requests. Try again in {retry_after} seconds."
    }


def test_step_endpoints_share_one_allowance_per_client(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="2")

    with TestClient(main.app) as client:
        sorting = client.post("/sorting/steps", json=SORT_REQUEST)
        searching = client.post(
            "/searching/steps",
            json={"algorithm": "linear_search", "numbers": [3, 1, 2], "target": 2},
        )
        trees = client.post(
            "/trees/steps", json={"algorithm": "bst_insert", "values": [2, 1, 3]}
        )

    assert [sorting.status_code, searching.status_code] == [200, 200]
    assert trees.status_code == 429


def test_other_endpoints_are_not_limited(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="1")

    with TestClient(main.app) as client:
        client.post("/sorting/steps", json=SORT_REQUEST)
        assert client.post("/sorting/steps", json=SORT_REQUEST).status_code == 429
        for _ in range(3):
            assert client.get("/health").status_code == 200
            assert client.get("/").status_code == 200
            assert client.get("/algorithms").status_code == 200
            assert (
                client.post(
                    "/numbers/random", json={"size": 3, "min_value": 1, "max_value": 9}
                ).status_code
                == 200
            )


def test_a_browser_can_read_the_limit_response(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="1")
    origin = {"Origin": "http://localhost:3000"}

    with TestClient(main.app) as client:
        for _ in range(3):
            preflight = client.options(
                "/sorting/steps",
                headers={
                    **origin,
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "content-type",
                },
            )
            assert preflight.status_code == 200
        # Preflight requests did not count, so one request is still allowed.
        allowed = client.post("/sorting/steps", json=SORT_REQUEST, headers=origin)
        limited = client.post("/sorting/steps", json=SORT_REQUEST, headers=origin)

    assert allowed.status_code == 200
    assert limited.status_code == 429
    assert limited.headers["access-control-allow-origin"] == origin["Origin"]


def test_cache_hits_count_against_the_limit(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="2")

    with TestClient(main.app) as client:
        responses = [client.post("/sorting/steps", json=SORT_REQUEST) for _ in range(3)]

    assert [response.status_code for response in responses] == [200, 200, 429]
    assert [response.headers.get("x-cache") for response in responses] == [
        "MISS",
        "HIT",
        None,
    ]


def test_forwarded_addresses_are_ignored_by_default(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="1")

    with TestClient(main.app) as client:
        first = client.post(
            "/sorting/steps",
            json=SORT_REQUEST,
            headers={"X-Forwarded-For": "198.51.100.1"},
        )
        second = client.post(
            "/sorting/steps",
            json=SORT_REQUEST,
            headers={"X-Forwarded-For": "198.51.100.2"},
        )

    assert [first.status_code, second.status_code] == [200, 429]


def test_trusted_proxies_identify_clients_by_forwarded_address(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="1", RATE_LIMIT_TRUSTED_PROXIES="1")

    def post(forwarded: str) -> int:
        return client.post(
            "/sorting/steps",
            json=SORT_REQUEST,
            headers={"X-Forwarded-For": forwarded},
        ).status_code

    with TestClient(main.app) as client:
        assert post("198.51.100.1") == 200
        assert post("198.51.100.1") == 429
        # A spoofed entry on the left does not change the client's identity.
        assert post("6.6.6.6, 198.51.100.1") == 429
        assert post("198.51.100.2") == 200
