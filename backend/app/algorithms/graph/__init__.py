from app.algorithms.graph.a_star import a_star_steps
from app.algorithms.graph.breadth_first_search import breadth_first_search_steps
from app.algorithms.graph.depth_first_search import depth_first_search_steps
from app.algorithms.graph.dijkstra import dijkstra_steps
from app.algorithms.graph.kruskal import kruskal_steps
from app.algorithms.graph.prim import prim_steps
from app.algorithms.graph.topological_sort import topological_sort_steps
from app.algorithms.graph.types import GraphAlgorithm, GraphEdge, GraphStep


GRAPH_ALGORITHM_METADATA = [
    {"id": "bfs", "label": "Breadth-First Search"},
    {"id": "dfs", "label": "Depth-First Search"},
    {"id": "dijkstra", "label": "Dijkstra's Algorithm"},
    {"id": "a_star", "label": "A* Search"},
    {"id": "topological_sort", "label": "Topological Sort"},
    {"id": "kruskal", "label": "Kruskal's Minimum Spanning Tree"},
    {"id": "prim", "label": "Prim's Minimum Spanning Tree"},
]


def graph_algorithm_steps(
    algorithm: GraphAlgorithm,
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
    directed: bool,
    heuristics: dict[str, int | float] | None = None,
) -> list[GraphStep]:
    """Dispatch a graph request to an algorithm-specific function."""

    if algorithm == "bfs":
        return breadth_first_search_steps(nodes, edges, start, target, directed)
    if algorithm == "dfs":
        return depth_first_search_steps(nodes, edges, start, target, directed)
    if algorithm == "dijkstra":
        return dijkstra_steps(nodes, edges, start, target, directed)
    if algorithm == "a_star":
        return a_star_steps(
            nodes,
            edges,
            start,
            target,
            directed,
            heuristics,
        )
    if algorithm == "topological_sort":
        return topological_sort_steps(nodes, edges, directed)
    if algorithm == "kruskal":
        return kruskal_steps(nodes, edges)
    return prim_steps(nodes, edges, start)


__all__ = [
    "GRAPH_ALGORITHM_METADATA",
    "a_star_steps",
    "breadth_first_search_steps",
    "depth_first_search_steps",
    "dijkstra_steps",
    "graph_algorithm_steps",
    "kruskal_steps",
    "prim_steps",
    "topological_sort_steps",
]
