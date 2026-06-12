from typing import Literal, TypedDict


GraphAlgorithm = Literal[
    "bfs",
    "dfs",
    "dijkstra",
    "a_star",
    "topological_sort",
    "kruskal",
    "prim",
]

GraphStepType = Literal[
    "visit",
    "inspect_edge",
    "enqueue",
    "dequeue",
    "push",
    "pop",
    "relax",
    "path_found",
    "not_found",
    "cycle_detected",
    "accept_edge",
    "reject_edge",
    "add_to_result",
    "update_frontier",
    "done",
]


class GraphEdge(TypedDict):
    """A weighted edge between two graph nodes."""

    source: str
    target: str
    weight: int | float


class GraphStep(TypedDict):
    """A single visual state produced while a graph algorithm runs."""

    type: GraphStepType
    current: str | None
    neighbor: str | None
    edge: GraphEdge | None
    visited: list[str]
    frontier: list[str]
    distances: dict[str, int | float] | None
    previous: dict[str, str | None] | None
    path: list[str]
    result: list[str]
    frontier_edges: list[GraphEdge]
    mst_edges: list[GraphEdge]
    total_weight: int | float | None
    description: str


def create_graph_step(
    step_type: GraphStepType,
    *,
    current: str | None,
    neighbor: str | None,
    edge: GraphEdge | None,
    visited: list[str],
    frontier: list[str],
    distances: dict[str, int | float] | None,
    previous: dict[str, str | None] | None,
    path: list[str],
    description: str,
    result: list[str] | None = None,
    frontier_edges: list[GraphEdge] | None = None,
    mst_edges: list[GraphEdge] | None = None,
    total_weight: int | float | None = None,
) -> GraphStep:
    """Create a graph step with independent copies of mutable values."""

    return {
        "type": step_type,
        "current": current,
        "neighbor": neighbor,
        "edge": edge.copy() if edge is not None else None,
        "visited": visited.copy(),
        "frontier": frontier.copy(),
        "distances": distances.copy() if distances is not None else None,
        "previous": previous.copy() if previous is not None else None,
        "path": path.copy(),
        "result": result.copy() if result is not None else [],
        "frontier_edges": [
            frontier_edge.copy() for frontier_edge in (frontier_edges or [])
        ],
        "mst_edges": [mst_edge.copy() for mst_edge in (mst_edges or [])],
        "total_weight": total_weight,
        "description": description,
    }
