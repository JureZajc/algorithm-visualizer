from app.algorithms.graph.types import GraphEdge, GraphStep, create_graph_step
from app.algorithms.graph.utils import (
    build_adjacency_list,
    reconstruct_path,
    validate_graph,
)


def depth_first_search_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
    directed: bool = False,
) -> list[GraphStep]:
    """Find the first depth-first path using an explicit stack."""

    validate_graph(nodes, edges, start, target)
    adjacency = build_adjacency_list(nodes, edges, directed)
    stack = [start]
    discovered = {start}
    visited: list[str] = []
    previous: dict[str, str | None] = {node: None for node in nodes}
    steps: list[GraphStep] = []

    steps.append(
        create_graph_step(
            "push",
            current=start,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=stack,
            distances=None,
            previous=previous,
            path=[],
            description=f"Push start node {start} onto the stack.",
        )
    )

    found = False
    while stack:
        current = stack.pop()
        steps.append(
            create_graph_step(
                "pop",
                current=current,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=stack,
                distances=None,
                previous=previous,
                path=[],
                description=f"Pop {current} from the stack.",
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
                frontier=stack,
                distances=None,
                previous=previous,
                path=[],
                description=f"Visit node {current}.",
            )
        )

        if current == target:
            found = True
            break

        for edge in reversed(adjacency[current]):
            neighbor = edge["target"]
            steps.append(
                create_graph_step(
                    "inspect_edge",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=visited,
                    frontier=stack,
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
            stack.append(neighbor)
            steps.append(
                create_graph_step(
                    "push",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=visited,
                    frontier=stack,
                    distances=None,
                    previous=previous,
                    path=[],
                    description=f"Push {neighbor} onto the stack.",
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
            frontier=stack,
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
            frontier=stack,
            distances=None,
            previous=previous,
            path=path,
            description="Depth-first search is complete.",
        )
    )
    return steps
