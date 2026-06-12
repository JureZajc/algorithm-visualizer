from collections.abc import Callable
from copy import deepcopy

import pytest

from app.algorithms.graph import (
    breadth_first_search_steps,
    depth_first_search_steps,
    dijkstra_steps,
)
from app.algorithms.graph.types import GraphEdge, GraphStep


GraphFunction = Callable[
    [list[str], list[GraphEdge], str, str, bool],
    list[GraphStep],
]

GRAPH_FUNCTIONS: list[GraphFunction] = [
    breadth_first_search_steps,
    depth_first_search_steps,
    dijkstra_steps,
]

NODES = ["A", "B", "C", "D"]
EDGES: list[GraphEdge] = [
    {"source": "A", "target": "B", "weight": 1},
    {"source": "A", "target": "C", "weight": 4},
    {"source": "B", "target": "D", "weight": 2},
]

STEP_KEYS = {
    "type",
    "current",
    "neighbor",
    "edge",
    "visited",
    "frontier",
    "distances",
    "previous",
    "path",
    "description",
}


@pytest.mark.parametrize("graph_function", GRAPH_FUNCTIONS)
def test_graph_algorithm_contract(graph_function: GraphFunction) -> None:
    nodes = NODES.copy()
    edges = deepcopy(EDGES)
    original_nodes = nodes.copy()
    original_edges = deepcopy(edges)

    steps = graph_function(nodes, edges, "A", "D", False)

    assert nodes == original_nodes
    assert edges == original_edges
    assert steps
    assert steps[-2]["type"] == "path_found"
    assert steps[-1]["type"] == "done"
    assert steps[-1]["path"] == steps[-2]["path"]

    for step in steps:
        assert set(step) == STEP_KEYS
        assert isinstance(step["visited"], list)
        assert isinstance(step["frontier"], list)
        assert isinstance(step["path"], list)
        assert step["previous"] is not None
        assert step["description"]


@pytest.mark.parametrize("graph_function", GRAPH_FUNCTIONS)
def test_graph_step_states_are_independent_copies(
    graph_function: GraphFunction,
) -> None:
    steps = graph_function(NODES, EDGES, "A", "D", False)

    for field in ("visited", "frontier", "previous", "path"):
        assert len({id(step[field]) for step in steps}) == len(steps)

    edge_steps = [step for step in steps if step["edge"] is not None]
    assert len({id(step["edge"]) for step in edge_steps}) == len(edge_steps)

    distance_steps = [step for step in steps if step["distances"] is not None]
    assert len({id(step["distances"]) for step in distance_steps}) == len(
        distance_steps
    )


@pytest.mark.parametrize("graph_function", GRAPH_FUNCTIONS)
def test_unreachable_target_emits_not_found(graph_function: GraphFunction) -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 1},
    ]

    steps = graph_function(NODES, edges, "A", "D", False)

    assert steps[-2]["type"] == "not_found"
    assert steps[-2]["path"] == []
    assert steps[-1]["type"] == "done"
    assert steps[-1]["path"] == []


@pytest.mark.parametrize("graph_function", GRAPH_FUNCTIONS)
def test_start_equal_to_target_returns_single_node_path(
    graph_function: GraphFunction,
) -> None:
    steps = graph_function(NODES, EDGES, "A", "A", False)

    assert steps[-2]["type"] == "path_found"
    assert steps[-2]["path"] == ["A"]
    assert steps[-1]["path"] == ["A"]


def test_breadth_first_search_returns_minimum_edge_path() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 1},
        {"source": "B", "target": "E", "weight": 1},
        {"source": "E", "target": "D", "weight": 1},
        {"source": "C", "target": "D", "weight": 1},
    ]

    steps = breadth_first_search_steps(
        ["A", "B", "C", "D", "E"],
        edges,
        "A",
        "D",
    )

    assert steps[-1]["path"] == ["A", "C", "D"]
    assert steps[-1]["distances"] is None


def test_depth_first_search_returns_first_discovered_path() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 1},
        {"source": "B", "target": "D", "weight": 1},
        {"source": "C", "target": "D", "weight": 1},
    ]

    steps = depth_first_search_steps(NODES, edges, "A", "D")

    assert steps[-1]["path"] == ["A", "B", "D"]
    assert steps[-1]["distances"] is None


def test_dijkstra_returns_expected_shortest_path() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 4},
        {"source": "A", "target": "C", "weight": 1},
        {"source": "C", "target": "B", "weight": 2},
        {"source": "B", "target": "D", "weight": 1},
        {"source": "C", "target": "D", "weight": 5},
    ]

    steps = dijkstra_steps(NODES, edges, "A", "D")

    assert steps[-1]["path"] == ["A", "C", "B", "D"]
    assert steps[-1]["distances"] == {"A": 0, "B": 3, "C": 1, "D": 4}


def test_graph_is_undirected_by_default() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 1},
    ]

    steps = breadth_first_search_steps(["A", "B"], edges, "B", "A")

    assert steps[-1]["path"] == ["B", "A"]


def test_directed_graph_does_not_traverse_edges_backwards() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": 1},
    ]

    steps = breadth_first_search_steps(
        ["A", "B"],
        edges,
        "B",
        "A",
        directed=True,
    )

    assert steps[-2]["type"] == "not_found"


def test_dijkstra_rejects_negative_weights_without_mutating_input() -> None:
    edges: list[GraphEdge] = [
        {"source": "A", "target": "B", "weight": -1},
    ]
    original = deepcopy(edges)

    with pytest.raises(ValueError, match="requires non-negative weights"):
        dijkstra_steps(["A", "B"], edges, "A", "B")

    assert edges == original
