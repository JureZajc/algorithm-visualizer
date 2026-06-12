from collections.abc import Callable

from app.algorithms.graph.breadth_first_search import breadth_first_search_steps
from app.algorithms.graph.depth_first_search import depth_first_search_steps
from app.algorithms.graph.dijkstra import dijkstra_steps
from app.algorithms.graph.types import GraphAlgorithm, GraphEdge, GraphStep


GraphFunction = Callable[
    [list[str], list[GraphEdge], str, str, bool],
    list[GraphStep],
]

GRAPH_ALGORITHMS: dict[GraphAlgorithm, GraphFunction] = {
    "bfs": breadth_first_search_steps,
    "dfs": depth_first_search_steps,
    "dijkstra": dijkstra_steps,
}

GRAPH_ALGORITHM_METADATA = [
    {"id": "bfs", "label": "Breadth-First Search"},
    {"id": "dfs", "label": "Depth-First Search"},
    {"id": "dijkstra", "label": "Dijkstra's Algorithm"},
]

__all__ = [
    "GRAPH_ALGORITHMS",
    "GRAPH_ALGORITHM_METADATA",
    "breadth_first_search_steps",
    "depth_first_search_steps",
    "dijkstra_steps",
]
