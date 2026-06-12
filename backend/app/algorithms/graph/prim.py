from heapq import heappop, heappush
from itertools import count

from app.algorithms.graph.types import GraphEdge, GraphStep, create_graph_step
from app.algorithms.graph.utils import build_adjacency_list, validate_graph_structure


PriorityEntry = tuple[int | float, int, GraphEdge]


def _candidate_edges(
    priority_queue: list[PriorityEntry],
    visited: set[str],
) -> list[GraphEdge]:
    """Return active candidate edges in priority order."""

    return [
        edge
        for _, _, edge in sorted(priority_queue, key=lambda item: (item[0], item[1]))
        if edge["target"] not in visited
    ]


def prim_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
) -> list[GraphStep]:
    """Build a minimum spanning forest using Prim's algorithm."""

    validate_graph_structure(nodes, edges)
    if start not in nodes:
        raise ValueError(f"Start node {start!r} is not in the graph.")

    adjacency = build_adjacency_list(nodes, edges, directed=False)
    order = count()
    priority_queue: list[PriorityEntry] = []
    visited: list[str] = []
    visited_set: set[str] = set()
    mst_edges: list[GraphEdge] = []
    total_weight: int | float = 0
    steps: list[GraphStep] = []

    def add_node(node: str) -> None:
        visited_set.add(node)
        visited.append(node)
        for edge in adjacency[node]:
            if edge["target"] not in visited_set:
                heappush(
                    priority_queue,
                    (edge["weight"], next(order), edge.copy()),
                )
        steps.append(
            create_graph_step(
                "update_frontier",
                current=node,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=[],
                distances=None,
                previous=None,
                path=[],
                frontier_edges=_candidate_edges(priority_queue, visited_set),
                mst_edges=mst_edges,
                total_weight=total_weight,
                description=f"Add candidate edges from node {node}.",
            )
        )

    component_starts = [start, *(node for node in nodes if node != start)]
    for component_start in component_starts:
        if component_start in visited_set:
            continue
        add_node(component_start)

        while priority_queue:
            _, _, edge = heappop(priority_queue)
            steps.append(
                create_graph_step(
                    "inspect_edge",
                    current=edge["source"],
                    neighbor=edge["target"],
                    edge=edge,
                    visited=visited,
                    frontier=[],
                    distances=None,
                    previous=None,
                    path=[],
                    frontier_edges=_candidate_edges(
                        priority_queue,
                        visited_set,
                    ),
                    mst_edges=mst_edges,
                    total_weight=total_weight,
                    description=(
                        f"Inspect edge from {edge['source']} to "
                        f"{edge['target']}."
                    ),
                )
            )

            if edge["target"] in visited_set:
                steps.append(
                    create_graph_step(
                        "reject_edge",
                        current=edge["source"],
                        neighbor=edge["target"],
                        edge=edge,
                        visited=visited,
                        frontier=[],
                        distances=None,
                        previous=None,
                        path=[],
                        frontier_edges=_candidate_edges(
                            priority_queue,
                            visited_set,
                        ),
                        mst_edges=mst_edges,
                        total_weight=total_weight,
                        description="Reject the edge because its target is visited.",
                    )
                )
                continue

            mst_edges.append(edge.copy())
            total_weight += edge["weight"]
            steps.append(
                create_graph_step(
                    "accept_edge",
                    current=edge["target"],
                    neighbor=edge["source"],
                    edge=edge,
                    visited=visited,
                    frontier=[],
                    distances=None,
                    previous=None,
                    path=[],
                    frontier_edges=_candidate_edges(
                        priority_queue,
                        visited_set,
                    ),
                    mst_edges=mst_edges,
                    total_weight=total_weight,
                    description="Accept the lightest edge to an unvisited node.",
                )
            )
            add_node(edge["target"])

    steps.append(
        create_graph_step(
            "done",
            current=None,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=[],
            distances=None,
            previous=None,
            path=[],
            mst_edges=mst_edges,
            total_weight=total_weight,
            description="Prim's minimum spanning forest is complete.",
        )
    )
    return steps
