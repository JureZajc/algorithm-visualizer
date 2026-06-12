from collections import deque

from app.algorithms.graph.types import GraphEdge, GraphStep, create_graph_step
from app.algorithms.graph.utils import (
    build_adjacency_list,
    reconstruct_path,
    validate_graph,
)


def breadth_first_search_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
    directed: bool = False,
) -> list[GraphStep]:
    """Find a minimum-edge path using breadth-first search."""

    validate_graph(nodes, edges, start, target)
    adjacency = build_adjacency_list(nodes, edges, directed)
    queue = deque([start])
    discovered = {start}
    visited: list[str] = []
    previous: dict[str, str | None] = {node: None for node in nodes}
    steps: list[GraphStep] = []

    steps.append(
        create_graph_step(
            "enqueue",
            current=start,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=list(queue),
            distances=None,
            previous=previous,
            path=[],
            description=f"Add start node {start} to the queue.",
        )
    )

    found = False
    while queue:
        current = queue.popleft()
        steps.append(
            create_graph_step(
                "dequeue",
                current=current,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=list(queue),
                distances=None,
                previous=previous,
                path=[],
                description=f"Remove {current} from the queue.",
            )
        )

        visited.append(current)
        steps.append(
            create_graph_step(
                "visit",
                current=current,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=list(queue),
                distances=None,
                previous=previous,
                path=[],
                description=f"Visit node {current}.",
            )
        )

        if current == target:
            found = True
            break

        for edge in adjacency[current]:
            neighbor = edge["target"]
            steps.append(
                create_graph_step(
                    "inspect_edge",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=visited,
                    frontier=list(queue),
                    distances=None,
                    previous=previous,
                    path=[],
                    description=f"Inspect edge from {current} to {neighbor}.",
                )
            )

            if neighbor in discovered:
                continue

            discovered.add(neighbor)
            previous[neighbor] = current
            queue.append(neighbor)
            steps.append(
                create_graph_step(
                    "enqueue",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=visited,
                    frontier=list(queue),
                    distances=None,
                    previous=previous,
                    path=[],
                    description=f"Add {neighbor} to the queue.",
                )
            )

    path = reconstruct_path(previous, start, target) if found else []
    outcome = "path_found" if found else "not_found"
    outcome_description = (
        f"Found path: {' -> '.join(path)}."
        if found
        else f"No path exists from {start} to {target}."
    )
    steps.append(
        create_graph_step(
            outcome,
            current=target if found else None,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=list(queue),
            distances=None,
            previous=previous,
            path=path,
            description=outcome_description,
        )
    )
    steps.append(
        create_graph_step(
            "done",
            current=target if found else None,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=list(queue),
            distances=None,
            previous=previous,
            path=path,
            description="Breadth-first search is complete.",
        )
    )
    return steps
