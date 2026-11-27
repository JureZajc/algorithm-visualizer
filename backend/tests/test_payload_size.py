"""Bound the size of every step response at the largest input the API accepts.

The frontend parses the whole body, so compression on the wire is not enough:
the limit applies to the uncompressed JSON.

Integers use at most seven digits. Tree values, hash keys, and dynamic
programming lists do not yet bound integer magnitude, so a request with
thousands of digits per value can still exceed the limit.
"""

from typing import get_args

import pytest
from starlette.testclient import TestClient

import app.main as main
from app.algorithms.backtracking import BACKTRACKING_ALGORITHMS
from app.algorithms.dynamic_programming import DYNAMIC_PROGRAMMING_ALGORITHMS
from app.algorithms.graph.types import GraphAlgorithm
from app.algorithms.hash_tables import HASH_TABLE_ALGORITHMS
from app.algorithms.searching import SEARCHING_ALGORITHMS
from app.algorithms.sorting import SORTING_ALGORITHMS
from app.algorithms.trees import TREES_ALGORITHMS


MAX_RESPONSE_BYTES = 10_000_000


@pytest.fixture(scope="module")
def client() -> TestClient:
    # test_cors.py reloads app.main, so build the client from the current app.
    return TestClient(main.app)


# 50 values (the maximum) with wide numbers, in both orders.
DESCENDING = [1_000_000 - index * 40_000 for index in range(50)]
ASCENDING = sorted(DESCENDING)
MISSING_TARGET = -999_999

# 30 nodes with 20-character names and 200 edges (both maximums). Edges run
# from lower to higher index, so the directed graph is acyclic.
GRAPH_NODES = [f"node-{index:02d}".ljust(20, "x") for index in range(30)]
GRAPH_EDGES = [
    {"source": source, "target": target, "weight": (index * 7 + offset) % 13 + 1.5}
    for index, source in enumerate(GRAPH_NODES)
    for offset, target in enumerate(GRAPH_NODES[index + 1 :])
][:200]

# 31 unique values (the maximum), ascending, so the BST degenerates into a list.
TREE_VALUES = [-1_000_000 + index * 1_000 for index in range(31)]


def _colliding_key(position: int) -> str:
    """Return a 32-character key whose character codes sum to 32 * ord("a")."""

    characters = ["a"] * 32
    characters[position] = "b"
    characters[(position + 1) % 32] = "`"
    return "".join(characters)


# 31 maximum-length keys that all land in the same bucket, and a missing one.
HASH_KEYS = [_colliding_key(position) for position in range(31)]
MISSING_HASH_KEY = _colliding_key(31)

LIST_VALUES = [f"{index}".ljust(12, "v") for index in range(10)]

# A valid puzzle that brute force solves in 9,572 steps, close to the limit.
NEAR_LIMIT_SUDOKU = [
    ["5", "3", ".", ".", "7", ".", ".", ".", "."],
    ["6", ".", ".", "1", "9", "5", ".", "4", "."],
    [".", "9", "8", ".", ".", ".", ".", "6", "."],
    ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
    ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
    ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
    [".", "6", ".", ".", ".", ".", "2", "8", "."],
    [".", ".", ".", "4", "1", "9", ".", ".", "5"],
    [".", ".", ".", ".", "8", ".", "1", "7", "9"],
]
EMPTY_MAZE = [["empty"] * 15 for _ in range(15)]
EMPTY_MAZE[0][0] = "start"
EMPTY_MAZE[14][0] = "end"

DYNAMIC_PROGRAMMING_CASES: dict[str, list[dict[str, object]]] = {
    "fibonacci": [{"n": 40}],
    "coin_change": [{"coins": [1, 2, 3, 4, 5, 6, 7, 8], "amount": 50}],
    "knapsack": [
        {
            "weights": [1, 2, 3, 4, 5, 6, 7, 8],
            "values": [
                999_991,
                999_992,
                999_993,
                999_994,
                999_995,
                999_996,
                999_997,
                999_998,
            ],
            "capacity": 50,
        }
    ],
    "lcs": [{"text_a": "ABCDEFGHIJKL", "text_b": "LKJIHGFEDCBA"}],
    "edit_distance": [{"text_a": "ABCDEFGHIJKL", "text_b": "MNOPQRSTUVWX"}],
    "unique_paths": [{"rows": 12, "cols": 12}],
}

BACKTRACKING_CASES: dict[str, list[dict[str, object]]] = {
    "n_queens": [{"size": 10}],
    "maze_solver": [
        {"rows": 15, "cols": 15, "preset": "classic"},
        {"rows": 15, "cols": 15, "preset": "open"},
        {"rows": 15, "cols": 15, "preset": "rooms"},
        {"rows": 15, "cols": 15, "grid": EMPTY_MAZE, "start": [0, 0], "end": [14, 0]},
    ],
    "permutations": [{"values": LIST_VALUES[:6]}],
    "subsets": [{"values": LIST_VALUES}],
    "sudoku_solver": [
        {"board": NEAR_LIMIT_SUDOKU},
        {"board": [["."] * 9 for _ in range(9)]},
    ],
}


def _cases() -> list[object]:
    cases: list[object] = []
    algorithm: str
    for algorithm in SORTING_ALGORITHMS:
        for label, numbers in (("descending", DESCENDING), ("ascending", ASCENDING)):
            cases.append(
                pytest.param(
                    "/sorting/steps",
                    {"algorithm": algorithm, "numbers": numbers},
                    id=f"sorting-{algorithm}-{label}",
                )
            )
    for algorithm in SEARCHING_ALGORITHMS:
        cases.append(
            pytest.param(
                "/searching/steps",
                {
                    "algorithm": algorithm,
                    "numbers": ASCENDING,
                    "target": MISSING_TARGET,
                },
                id=f"searching-{algorithm}",
            )
        )
    for algorithm in get_args(GraphAlgorithm):
        payload: dict[str, object] = {
            "algorithm": algorithm,
            "nodes": GRAPH_NODES,
            "edges": GRAPH_EDGES,
            "start": GRAPH_NODES[0],
            "target": GRAPH_NODES[-1],
            "directed": algorithm == "topological_sort",
        }
        if algorithm == "a_star":
            payload["heuristics"] = {node: 0 for node in GRAPH_NODES}
        cases.append(pytest.param("/graph/steps", payload, id=f"graph-{algorithm}"))
    for algorithm in TREES_ALGORITHMS:
        cases.append(
            pytest.param(
                "/trees/steps",
                {
                    "algorithm": algorithm,
                    "values": TREE_VALUES,
                    "target": MISSING_TARGET,
                },
                id=f"trees-{algorithm}",
            )
        )
    for algorithm in HASH_TABLE_ALGORITHMS:
        cases.append(
            pytest.param(
                "/hash-tables/steps",
                {
                    "algorithm": algorithm,
                    "values": HASH_KEYS,
                    "table_size": 31,
                    "target": MISSING_HASH_KEY,
                },
                id=f"hash-tables-{algorithm}",
            )
        )
    for algorithm, payloads in DYNAMIC_PROGRAMMING_CASES.items():
        for index, payload in enumerate(payloads):
            cases.append(
                pytest.param(
                    "/dynamic-programming/steps",
                    {"algorithm": algorithm, **payload},
                    id=f"dynamic-programming-{algorithm}-{index}",
                )
            )
    for algorithm, payloads in BACKTRACKING_CASES.items():
        for index, payload in enumerate(payloads):
            cases.append(
                pytest.param(
                    "/backtracking/steps",
                    {"algorithm": algorithm, **payload},
                    id=f"backtracking-{algorithm}-{index}",
                )
            )
    return cases


def test_every_algorithm_has_a_worst_case_input() -> None:
    assert set(DYNAMIC_PROGRAMMING_CASES) == set(DYNAMIC_PROGRAMMING_ALGORITHMS)
    assert set(BACKTRACKING_CASES) == set(BACKTRACKING_ALGORITHMS)


@pytest.mark.parametrize(("path", "payload"), _cases())
def test_step_response_stays_under_size_limit(
    client: TestClient,
    path: str,
    payload: dict[str, object],
) -> None:
    response = client.post(path, json=payload, headers={"Accept-Encoding": "identity"})

    assert response.status_code == 200, response.text
    assert "content-encoding" not in response.headers
    assert len(response.content) <= MAX_RESPONSE_BYTES


def test_near_limit_sudoku_case_is_close_to_the_step_limit(client: TestClient) -> None:
    # The Sudoku limit is a step count, so the size test is only meaningful
    # when its puzzle runs close to that count.
    response = client.post(
        "/backtracking/steps",
        json={"algorithm": "sudoku_solver", "board": NEAR_LIMIT_SUDOKU},
    )

    assert response.status_code == 200
    assert 9_000 <= response.json()["step_count"] <= 10_000


def test_step_responses_are_gzip_compressed_when_accepted(client: TestClient) -> None:
    response = client.post(
        "/backtracking/steps",
        json={"algorithm": "subsets", "values": LIST_VALUES},
        headers={"Accept-Encoding": "gzip"},
    )

    assert response.status_code == 200
    assert response.headers["content-encoding"] == "gzip"
    assert int(response.headers["content-length"]) < len(response.content) / 10
    assert response.json()["steps"][-1]["result"]["count"] == 1024


def test_small_responses_are_not_compressed(client: TestClient) -> None:
    response = client.get("/", headers={"Accept-Encoding": "gzip"})

    assert response.status_code == 200
    assert "content-encoding" not in response.headers
