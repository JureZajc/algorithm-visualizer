import asyncio
import gzip
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from starlette.testclient import TestClient
from starlette.types import Message, Receive, Scope, Send

from app.algorithms.searching import SEARCHING_ALGORITHMS
from app.algorithms.sorting import SORTING_ALGORITHMS
from app.step_cache import CachedResponse, StepCache, StepCacheMiddleware, cache_key


SORT_REQUEST = {"algorithm": "bubble_sort", "numbers": [3, 1, 2]}
JSON = {"Content-Type": "application/json"}


def _response(body: bytes) -> CachedResponse:
    return CachedResponse(((b"content-type", b"application/json"),), body)


def test_evicts_the_least_recently_used_entries_first() -> None:
    cache = StepCache(max_bytes=10)
    cache.put(("/a", b"1"), _response(b"aaaa"))
    cache.put(("/a", b"2"), _response(b"bbbb"))
    assert cache.get(("/a", b"1")) is not None

    cache.put(("/a", b"3"), _response(b"cccc"))

    assert cache.get(("/a", b"2")) is None
    assert cache.get(("/a", b"1")) is not None
    assert cache.get(("/a", b"3")) is not None
    assert (len(cache), cache.size) == (2, 8)


def test_does_not_store_a_body_larger_than_the_budget() -> None:
    cache = StepCache(max_bytes=10)
    cache.put(("/a", b"1"), _response(b"small"))
    cache.put(("/a", b"2"), _response(b"x" * 11))

    assert cache.get(("/a", b"2")) is None
    assert (len(cache), cache.size) == (1, 5)


def test_replacing_an_entry_updates_the_size() -> None:
    cache = StepCache(max_bytes=10)
    cache.put(("/a", b"1"), _response(b"aaaa"))
    cache.put(("/a", b"1"), _response(b"aaaaaaa"))

    assert (len(cache), cache.size) == (1, 7)


def test_concurrent_use_keeps_the_size_within_the_budget(
    frequent_thread_switches: None,
) -> None:
    cache = StepCache(max_bytes=1_000)
    threads = 8
    start = threading.Barrier(threads)

    def use(thread: int) -> None:
        start.wait()
        for index in range(500):
            # Threads share keys, so they replace and evict each other's entries.
            key = ("/a", str((thread + index) % 40).encode())
            cache.put(key, _response(b"x" * (index % 50 + 1)))
            cache.get(key)

    with ThreadPoolExecutor(threads) as pool:
        list(pool.map(use, range(threads)))

    assert 0 < cache.size <= 1_000
    stored = [cache.get(("/a", str(index).encode())) for index in range(40)]
    assert cache.size == sum(len(entry.body) for entry in stored if entry is not None)


def test_rejects_an_empty_budget() -> None:
    with pytest.raises(ValueError):
        StepCache(max_bytes=0)


@pytest.mark.parametrize(
    ("first", "second"),
    [
        (b'{"a": [1, 2], "b": "A"}', b'{"a":[1,2],"b":"A"}'),
        (b'{"b": "A"}', b'{"b": "\\u0041"}'),
        (b'{"n": 1e2}', b'{"n": 100.0}'),
        # FastAPI keeps the last of duplicate keys, and so does the key.
        (b'{"a": 1, "a": 2}', b'{"a": 2}'),
    ],
)
def test_equivalent_bodies_share_a_key(first: bytes, second: bytes) -> None:
    assert cache_key("/sorting/steps", first) == cache_key("/sorting/steps", second)


@pytest.mark.parametrize(
    ("first", "second"),
    [
        (b'{"n": 1}', b'{"n": 1.0}'),
        (b'{"a": 1, "b": 2}', b'{"b": 2, "a": 1}'),
        (b'{"values": [1, 2]}', b'{"values": [2, 1]}'),
    ],
)
def test_different_bodies_have_different_keys(first: bytes, second: bytes) -> None:
    assert cache_key("/sorting/steps", first) != cache_key("/sorting/steps", second)


def test_the_path_is_part_of_the_key() -> None:
    body = b'{"algorithm": "bfs"}'
    assert cache_key("/graph/steps", body) != cache_key("/trees/steps", body)


@pytest.mark.parametrize(
    "body",
    [b"", b"{", b"\xff\xfe\xfa", b"[" * 100_000 + b"]" * 100_000],
    ids=["empty", "truncated", "not-utf-8", "deeply-nested"],
)
def test_bodies_that_are_not_json_have_no_key(body: bytes) -> None:
    assert cache_key("/sorting/steps", body) is None


@pytest.fixture
def sort_calls(monkeypatch: pytest.MonkeyPatch) -> list[list[int]]:
    """Record every input that Bubble Sort runs on."""

    calls: list[list[int]] = []
    bubble_sort = SORTING_ALGORITHMS["bubble_sort"]

    def recording_sort(numbers: list[int]):
        calls.append(list(numbers))
        return bubble_sort(numbers)

    monkeypatch.setitem(SORTING_ALGORITHMS, "bubble_sort", recording_sort)
    return calls


def test_replays_a_repeated_request_without_running_the_algorithm(
    configure_main,
    sort_calls: list[list[int]],
) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        first = client.post("/sorting/steps", json=SORT_REQUEST)
        second = client.post("/sorting/steps", json=SORT_REQUEST)

    assert [first.headers["x-cache"], second.headers["x-cache"]] == ["MISS", "HIT"]
    assert second.content == first.content
    assert second.headers["content-type"] == first.headers["content-type"]
    assert sort_calls == [[3, 1, 2]]


def test_equivalent_requests_share_an_entry(configure_main, sort_calls) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        compact = client.post(
            "/sorting/steps",
            content=b'{"algorithm":"bubble_sort","numbers":[3,1,2]}',
            headers=JSON,
        )
        spaced = client.post(
            "/sorting/steps",
            content=b'{ "algorithm": "bubble_sort", "numbers": [3, 1, 2] }',
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        different = client.post(
            "/sorting/steps", json={**SORT_REQUEST, "numbers": [2, 1, 3]}
        )

    assert [compact.headers["x-cache"], spaced.headers["x-cache"]] == ["MISS", "HIT"]
    assert different.headers["x-cache"] == "MISS"
    assert sort_calls == [[3, 1, 2], [2, 1, 3]]


def test_random_numbers_are_never_cached(configure_main) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        for _ in range(2):
            response = client.post(
                "/numbers/random", json={"size": 5, "min_value": 1, "max_value": 9}
            )
            assert response.status_code == 200
            assert "x-cache" not in response.headers

    assert len(main.step_cache) == 0


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        # Rejected by the request model.
        ("/sorting/steps", {"algorithm": "bubble_sort", "numbers": list(range(51))}),
        # Rejected by the algorithm.
        (
            "/searching/steps",
            {"algorithm": "binary_search", "numbers": [3, 1, 2], "target": 2},
        ),
    ],
)
def test_errors_are_not_cached(configure_main, path: str, payload: dict) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        for _ in range(2):
            response = client.post(path, json=payload)
            assert response.status_code == 422
            assert "x-cache" not in response.headers

    assert len(main.step_cache) == 0


def test_a_failed_run_is_retried(configure_main, monkeypatch) -> None:
    main = configure_main()
    outcomes = [ValueError("Temporary failure."), None]
    linear_search = SEARCHING_ALGORITHMS["linear_search"]

    def flaky_search(numbers, target):
        outcome = outcomes.pop(0)
        if outcome is not None:
            raise outcome
        return linear_search(numbers, target)

    monkeypatch.setitem(SEARCHING_ALGORITHMS, "linear_search", flaky_search)
    request = {"algorithm": "linear_search", "numbers": [3, 1, 2], "target": 2}

    with TestClient(main.app) as client:
        failed = client.post("/searching/steps", json=request)
        retried = client.post("/searching/steps", json=request)

    assert failed.status_code == 422
    assert (retried.status_code, retried.headers["x-cache"]) == (200, "MISS")


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Content-Type": "text/plain"},
        {"Content-Type": "application/x-www-form-urlencoded"},
    ],
    ids=["no-content-type", "text", "form"],
)
def test_requests_that_are_not_json_bypass_the_cache(configure_main, headers) -> None:
    main = configure_main()
    body = b'{"algorithm":"bubble_sort","numbers":[3,1,2]}'

    with TestClient(main.app) as client:
        cached = client.post("/sorting/steps", content=body, headers=JSON)
        response = client.post("/sorting/steps", content=body, headers=headers)

    assert cached.headers["x-cache"] == "MISS"
    # FastAPI rejects these bodies; a cached copy must not change that.
    assert response.status_code == 422
    assert "x-cache" not in response.headers


def test_malformed_json_is_rejected_as_before(configure_main) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        response = client.post("/sorting/steps", content=b'{"numbers": [', headers=JSON)

    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "json_invalid"
    assert len(main.step_cache) == 0


def test_one_entry_serves_clients_with_and_without_gzip(configure_main) -> None:
    main = configure_main()
    request = {"algorithm": "bubble_sort", "numbers": list(range(50, 0, -1))}

    with TestClient(main.app) as client:
        plain = client.post(
            "/sorting/steps", json=request, headers={"Accept-Encoding": "identity"}
        )
        compressed = client.stream(
            "POST", "/sorting/steps", json=request, headers={"Accept-Encoding": "gzip"}
        )
        with compressed as response:
            raw = b"".join(response.iter_raw())
            encoding = response.headers.get("content-encoding")
            hit = response.headers["x-cache"]
        plain_again = client.post(
            "/sorting/steps", json=request, headers={"Accept-Encoding": "identity"}
        )

    assert plain.headers["x-cache"] == "MISS"
    assert "content-encoding" not in plain.headers
    assert (hit, encoding) == ("HIT", "gzip")
    assert gzip.decompress(raw) == plain.content
    assert plain_again.headers["x-cache"] == "HIT"
    assert plain_again.content == plain.content
    assert "content-encoding" not in plain_again.headers
    assert len(main.step_cache) == 1
    assert main.step_cache.size == len(plain.content)


def test_the_cache_can_be_turned_off(configure_main, sort_calls) -> None:
    main = configure_main(STEP_CACHE_MAX_MB="0")

    with TestClient(main.app) as client:
        responses = [client.post("/sorting/steps", json=SORT_REQUEST) for _ in range(2)]

    assert main.step_cache is None
    assert all("x-cache" not in response.headers for response in responses)
    assert len(sort_calls) == 2


def test_the_budget_comes_from_the_environment(configure_main) -> None:
    assert configure_main().step_cache.max_bytes == 64_000_000
    assert configure_main(STEP_CACHE_MAX_MB="5").step_cache.max_bytes == 5_000_000


def _run_middleware(
    cache: StepCache,
    request: list[Message],
) -> tuple[list[Message], list[Message]]:
    """Send one request through the middleware to an echoing app.

    Return the request messages the app received and the response messages.
    """

    received: list[Message] = []
    sent: list[Message] = []
    incoming = list(request)

    async def echo(scope: Scope, receive: Receive, send: Send) -> None:
        body = b""
        while True:
            message = await receive()
            received.append(message)
            body += message.get("body", b"")
            if message["type"] != "http.request" or not message.get("more_body"):
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": body, "more_body": True})
        await send({"type": "http.response.body", "body": b"!"})

    async def receive() -> Message:
        return incoming.pop(0) if incoming else {"type": "http.disconnect"}

    async def send(message: Message) -> None:
        sent.append(message)

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/sorting/steps",
        "headers": [(b"content-type", b"application/json")],
    }
    middleware = StepCacheMiddleware(echo, cache=cache, paths={"/sorting/steps"})
    asyncio.run(middleware(scope, receive, send))
    return received, sent


def test_reads_a_body_sent_in_chunks_and_stores_a_streamed_response() -> None:
    cache = StepCache(max_bytes=1_000)
    chunks = [
        {"type": "http.request", "body": b'{"numbers": ', "more_body": True},
        {"type": "http.request", "body": b"[3, 1, 2]}", "more_body": False},
    ]

    received, sent = _run_middleware(cache, chunks)

    assert received == chunks
    assert sent[0]["headers"] == [(b"x-cache", b"MISS")]
    key = cache_key("/sorting/steps", b'{"numbers":[3,1,2]}')
    assert key is not None
    assert cache.get(key) == CachedResponse((), b'{"numbers": [3, 1, 2]}!')

    received, sent = _run_middleware(cache, chunks)

    assert received == []
    assert sent[0]["headers"] == [(b"x-cache", b"HIT")]
    assert sent[1]["body"] == b'{"numbers": [3, 1, 2]}!'


def test_passes_a_disconnect_through_without_caching() -> None:
    cache = StepCache(max_bytes=1_000)
    request = [
        {"type": "http.request", "body": b'{"numbers": ', "more_body": True},
        {"type": "http.disconnect"},
    ]

    received, sent = _run_middleware(cache, request)

    assert received == request
    assert "x-cache" not in dict(sent[0]["headers"])
    assert len(cache) == 0
