import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

SUPPORTED_ALGORITHMS = [
    "bubble_sort",
    "selection_sort",
    "insertion_sort",
    "merge_sort",
    "quick_sort",
    "heap_sort",
    "shell_sort",
    "cocktail_shaker_sort",
    "gnome_sort",
    "comb_sort",
    "counting_sort",
]

EXPECTED_ALGORITHM_IDS = {
    "sorting": SUPPORTED_ALGORITHMS,
    "searching": ["linear_search", "binary_search"],
    "graph": [
        "bfs",
        "dfs",
        "dijkstra",
        "a_star",
        "topological_sort",
        "kruskal",
        "prim",
    ],
}

GRAPH_REQUEST = {
    "nodes": ["A", "B", "C", "D"],
    "edges": [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 4},
        {"source": "B", "target": "D", "weight": 2},
    ],
    "start": "A",
    "target": "D",
}


def test_root_module_reexports_canonical_app() -> None:
    from main import app as compatibility_app

    assert compatibility_app is app


def test_algorithms_endpoint() -> None:
    response = client.get("/algorithms")

    assert response.status_code == 200
    body = response.json()
    assert {
        category: [item["id"] for item in items]
        for category, items in body.items()
    } == EXPECTED_ALGORITHM_IDS

    required_fields = {
        "id",
        "label",
        "name",
        "category",
        "description",
        "time_complexity",
        "space_complexity",
        "notes",
        "pseudocode",
    }
    for category, items in body.items():
        for item in items:
            assert set(item) == required_fields
            assert item["category"] == category
            assert item["label"] == item["name"]
            assert set(item["time_complexity"]) == {"best", "average", "worst"}
            assert item["description"]
            assert item["space_complexity"]
            assert item["notes"]
            assert item["pseudocode"]


@pytest.mark.parametrize("algorithm", SUPPORTED_ALGORITHMS)
def test_sorting_steps_endpoint(algorithm: str) -> None:
    numbers = [5, 3, 8, 1]

    response = client.post(
        "/sorting/steps",
        json={"numbers": numbers, "algorithm": algorithm},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["initial"] == numbers
    assert body["steps"]
    assert body["steps"][-1]["type"] == "done"
    assert body["steps"][-1]["array"] == sorted(numbers)
    assert body["step_count"] == len(body["steps"])


def test_sorting_steps_endpoint_rejects_unsupported_algorithm() -> None:
    response = client.post(
        "/sorting/steps",
        json={"numbers": [3, 2, 1], "algorithm": "radix_sort"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("algorithm", "numbers", "target", "outcome"),
    [
        ("linear_search", [4, 2, 7, 2], 7, "found"),
        ("linear_search", [4, 2, 7, 2], 9, "not_found"),
        ("binary_search", [2, 4, 7, 9], 7, "found"),
        ("binary_search", [2, 4, 7, 9], 3, "not_found"),
    ],
)
def test_searching_steps_endpoint(
    algorithm: str,
    numbers: list[int],
    target: int,
    outcome: str,
) -> None:
    response = client.post(
        "/searching/steps",
        json={"numbers": numbers, "algorithm": algorithm, "target": target},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["target"] == target
    assert body["initial"] == numbers
    assert body["steps"]
    assert outcome in {step["type"] for step in body["steps"]}
    assert body["steps"][-1]["type"] == "done"
    assert body["step_count"] == len(body["steps"])


def test_searching_steps_endpoint_rejects_unsupported_algorithm() -> None:
    response = client.post(
        "/searching/steps",
        json={"numbers": [1, 2, 3], "algorithm": "jump_search", "target": 2},
    )

    assert response.status_code == 422


def test_binary_search_endpoint_rejects_unsorted_input() -> None:
    response = client.post(
        "/searching/steps",
        json={
            "numbers": [3, 1, 2],
            "algorithm": "binary_search",
            "target": 2,
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Binary search requires numbers sorted in ascending order."
    }


@pytest.mark.parametrize("algorithm", ["bfs", "dfs", "dijkstra"])
def test_graph_steps_endpoint(algorithm: str) -> None:
    request = {**GRAPH_REQUEST, "algorithm": algorithm}

    response = client.post("/graph/steps", json=request)

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["nodes"] == request["nodes"]
    assert body["edges"] == request["edges"]
    assert body["start"] == request["start"]
    assert body["target"] == request["target"]
    assert body["directed"] is False
    assert body["steps"][-2]["type"] == "path_found"
    assert body["steps"][-1]["type"] == "done"
    assert body["step_count"] == len(body["steps"])


def test_graph_steps_endpoint_supports_default_edge_weight() -> None:
    response = client.post(
        "/graph/steps",
        json={
            "nodes": ["A", "B"],
            "edges": [{"source": "A", "target": "B"}],
            "start": "A",
            "target": "B",
            "algorithm": "bfs",
        },
    )

    assert response.status_code == 200
    assert response.json()["edges"] == [
        {"source": "A", "target": "B", "weight": 1}
    ]


def test_graph_steps_endpoint_rejects_unsupported_algorithm() -> None:
    response = client.post(
        "/graph/steps",
        json={**GRAPH_REQUEST, "algorithm": "bellman_ford"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {**GRAPH_REQUEST, "nodes": ["A", "A", "C", "D"]},
        {**GRAPH_REQUEST, "start": "missing"},
        {**GRAPH_REQUEST, "target": "missing"},
        {
            **GRAPH_REQUEST,
            "edges": [{"source": "missing", "target": "A", "weight": 1}],
        },
        {
            **GRAPH_REQUEST,
            "edges": [{"source": "A", "target": "missing", "weight": 1}],
        },
    ],
)
def test_graph_steps_endpoint_rejects_invalid_graph(
    payload: dict[str, object],
) -> None:
    response = client.post(
        "/graph/steps",
        json={**payload, "algorithm": "bfs"},
    )

    assert response.status_code == 422


def test_dijkstra_endpoint_rejects_negative_weights() -> None:
    response = client.post(
        "/graph/steps",
        json={
            **GRAPH_REQUEST,
            "algorithm": "dijkstra",
            "edges": [{"source": "A", "target": "D", "weight": -1}],
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Dijkstra's algorithm requires non-negative weights."
    }


def test_a_star_steps_endpoint() -> None:
    response = client.post(
        "/graph/steps",
        json={
            **GRAPH_REQUEST,
            "algorithm": "a_star",
            "heuristics": {"A": 2, "B": 1, "C": 4, "D": 0},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == "a_star"
    assert body["heuristics"] == {"A": 2, "B": 1, "C": 4, "D": 0}
    assert body["steps"][-2]["type"] == "path_found"
    assert body["steps"][-1]["type"] == "done"
    assert body["steps"][-1]["distances"]["D"] == 3


def test_a_star_endpoint_uses_zero_heuristic_when_omitted() -> None:
    response = client.post(
        "/graph/steps",
        json={**GRAPH_REQUEST, "algorithm": "a_star"},
    )

    assert response.status_code == 200
    assert response.json()["heuristics"] is None
    assert response.json()["steps"][-1]["distances"]["D"] == 3


def test_a_star_endpoint_rejects_negative_weights() -> None:
    response = client.post(
        "/graph/steps",
        json={
            **GRAPH_REQUEST,
            "algorithm": "a_star",
            "edges": [{"source": "A", "target": "D", "weight": -1}],
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "A* search requires non-negative weights."
    }


@pytest.mark.parametrize(
    "heuristics",
    [
        {"missing": 1},
        {"A": -1},
    ],
)
def test_graph_endpoint_rejects_invalid_heuristics(
    heuristics: dict[str, int],
) -> None:
    response = client.post(
        "/graph/steps",
        json={
            **GRAPH_REQUEST,
            "algorithm": "a_star",
            "heuristics": heuristics,
        },
    )

    assert response.status_code == 422


TOPOLOGICAL_REQUEST = {
    "nodes": ["A", "B", "C", "D"],
    "edges": [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 1},
        {"source": "B", "target": "D", "weight": 1},
        {"source": "C", "target": "D", "weight": 1},
    ],
    "start": "A",
    "target": "D",
    "algorithm": "topological_sort",
    "directed": True,
}


def test_topological_sort_steps_endpoint() -> None:
    response = client.post("/graph/steps", json=TOPOLOGICAL_REQUEST)

    assert response.status_code == 200
    body = response.json()
    positions = {
        node: index for index, node in enumerate(body["steps"][-1]["result"])
    }
    assert all(
        positions[edge["source"]] < positions[edge["target"]]
        for edge in TOPOLOGICAL_REQUEST["edges"]
    )
    assert body["steps"][-1]["type"] == "done"


def test_topological_sort_endpoint_detects_cycle() -> None:
    response = client.post(
        "/graph/steps",
        json={
            **TOPOLOGICAL_REQUEST,
            "nodes": ["A", "B", "C"],
            "edges": [
                {"source": "A", "target": "B", "weight": 1},
                {"source": "B", "target": "C", "weight": 1},
                {"source": "C", "target": "A", "weight": 1},
            ],
            "target": "C",
        },
    )

    assert response.status_code == 200
    assert response.json()["steps"][-2]["type"] == "cycle_detected"
    assert response.json()["steps"][-1]["type"] == "done"


def test_topological_sort_endpoint_rejects_undirected_graph() -> None:
    response = client.post(
        "/graph/steps",
        json={**TOPOLOGICAL_REQUEST, "directed": False},
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Topological sort requires a directed graph."
    }


MST_REQUEST = {
    "nodes": ["A", "B", "C", "D"],
    "edges": [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 4},
        {"source": "B", "target": "C", "weight": 2},
        {"source": "B", "target": "D", "weight": 5},
        {"source": "C", "target": "D", "weight": 3},
    ],
    "start": "A",
    "target": "D",
}


@pytest.mark.parametrize("algorithm", ["kruskal", "prim"])
def test_mst_steps_endpoint(algorithm: str) -> None:
    response = client.post(
        "/graph/steps",
        json={**MST_REQUEST, "algorithm": algorithm, "directed": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["steps"][-1]["type"] == "done"
    assert body["steps"][-1]["total_weight"] == 6
    assert len(body["steps"][-1]["mst_edges"]) == 3
