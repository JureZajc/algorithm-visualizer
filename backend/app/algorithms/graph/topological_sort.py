from collections import deque

from app.algorithms.graph.types import (
    GraphEdge,
    GraphStep,
    apply_graph_pseudocode_lines,
    create_graph_step,
)
from app.algorithms.graph.utils import build_adjacency_list, validate_graph_structure


def topological_sort_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    directed: bool,
) -> list[GraphStep]:
    """Order a directed acyclic graph using Kahn's algorithm."""

    validate_graph_structure(nodes, edges)
    if not directed:
        raise ValueError("Topological sort requires a directed graph.")

    adjacency = build_adjacency_list(nodes, edges, directed=True)
    in_degree = {node: 0 for node in nodes}
    for edge in edges:
        in_degree[edge["target"]] += 1

    queue = deque(node for node in nodes if in_degree[node] == 0)
    processed: list[str] = []
    result: list[str] = []
    steps: list[GraphStep] = [
        create_graph_step(
            "update_frontier",
            current=None,
            neighbor=None,
            edge=None,
            visited=processed,
            frontier=list(queue),
            distances=in_degree,
            previous=None,
            path=[],
            result=result,
            description="Collect all nodes with zero in-degree.",
            pseudocode_line=1,
        )
    ]

    while queue:
        current = queue.popleft()
        processed.append(current)
        result.append(current)
        steps.append(
            create_graph_step(
                "add_to_result",
                current=current,
                neighbor=None,
                edge=None,
                visited=processed,
                frontier=list(queue),
                distances=in_degree,
                previous=None,
                path=[],
                result=result,
                description=f"Add {current} to the topological order.",
            )
        )

        for edge in adjacency[current]:
            neighbor = edge["target"]
            steps.append(
                create_graph_step(
                    "inspect_edge",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=processed,
                    frontier=list(queue),
                    distances=in_degree,
                    previous=None,
                    path=[],
                    result=result,
                    description=f"Inspect edge from {current} to {neighbor}.",
                )
            )
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                steps.append(
                    create_graph_step(
                        "update_frontier",
                        current=current,
                        neighbor=neighbor,
                        edge=edge,
                        visited=processed,
                        frontier=list(queue),
                        distances=in_degree,
                        previous=None,
                        path=[],
                        result=result,
                        description=(
                            f"Add {neighbor} to the zero in-degree frontier."
                        ),
                    )
                )

    cycle_detected = len(result) != len(nodes)
    if cycle_detected:
        steps.append(
            create_graph_step(
                "cycle_detected",
                current=None,
                neighbor=None,
                edge=None,
                visited=processed,
                frontier=[],
                distances=in_degree,
                previous=None,
                path=[],
                result=result,
                description=(
                    "A cycle was detected, so no complete topological order exists."
                ),
            )
        )

    steps.append(
        create_graph_step(
            "done",
            current=None,
            neighbor=None,
            edge=None,
            visited=processed,
            frontier=[],
            distances=in_degree,
            previous=None,
            path=[],
            result=result,
            description=(
                "Topological sort stopped after detecting a cycle."
                if cycle_detected
                else "Topological sort is complete."
            ),
        )
    )
    return apply_graph_pseudocode_lines(
        steps,
        {
            "update_frontier": 5,
            "add_to_result": 3,
            "inspect_edge": 4,
            "cycle_detected": 6,
            "done": 7,
        },
    )
