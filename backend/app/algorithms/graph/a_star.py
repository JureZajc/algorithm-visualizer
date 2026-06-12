from heapq import heappop, heappush
from itertools import count

from app.algorithms.graph.types import GraphEdge, GraphStep, create_graph_step
from app.algorithms.graph.utils import (
    build_adjacency_list,
    reconstruct_path,
    validate_graph,
)


PriorityEntry = tuple[int | float, int, str, int | float]


def _frontier_nodes(
    priority_queue: list[PriorityEntry],
    distances: dict[str, int | float],
    closed: set[str],
) -> list[str]:
    """Return active open-set nodes ordered by estimated total cost."""

    frontier: list[str] = []
    included: set[str] = set()
    for _, _, node, distance in sorted(priority_queue):
        if (
            node not in closed
            and node not in included
            and distances.get(node) == distance
        ):
            frontier.append(node)
            included.add(node)
    return frontier


def a_star_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
    directed: bool = False,
    heuristics: dict[str, int | float] | None = None,
) -> list[GraphStep]:
    """Find a minimum-weight path using A* search."""

    validate_graph(nodes, edges, start, target)
    if any(edge["weight"] < 0 for edge in edges):
        raise ValueError("A* search requires non-negative weights.")

    heuristic_values = heuristics or {}
    unknown_nodes = set(heuristic_values) - set(nodes)
    if unknown_nodes:
        unknown = min(unknown_nodes)
        raise ValueError(f"Heuristic node {unknown!r} is not in the graph.")
    if any(value < 0 for value in heuristic_values.values()):
        raise ValueError("A* search requires non-negative heuristic values.")

    adjacency = build_adjacency_list(nodes, edges, directed)
    order = count()
    start_estimate = heuristic_values.get(start, 0)
    priority_queue: list[PriorityEntry] = [
        (start_estimate, next(order), start, 0)
    ]
    distances: dict[str, int | float] = {start: 0}
    previous: dict[str, str | None] = {node: None for node in nodes}
    visited: list[str] = []
    closed: set[str] = set()
    steps: list[GraphStep] = [
        create_graph_step(
            "push",
            current=start,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=[start],
            distances=distances,
            previous=previous,
            path=[],
            description=(
                f"Add start node {start} with estimated cost {start_estimate}."
            ),
        )
    ]

    found = False
    while priority_queue:
        estimate, _, current, current_distance = heappop(priority_queue)
        if current in closed or distances.get(current) != current_distance:
            continue

        frontier = _frontier_nodes(priority_queue, distances, closed)
        steps.append(
            create_graph_step(
                "pop",
                current=current,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=frontier,
                distances=distances,
                previous=previous,
                path=[],
                description=(
                    f"Remove {current} with estimated cost {estimate} "
                    "from the open set."
                ),
            )
        )

        closed.add(current)
        visited.append(current)
        steps.append(
            create_graph_step(
                "visit",
                current=current,
                neighbor=None,
                edge=None,
                visited=visited,
                frontier=frontier,
                distances=distances,
                previous=previous,
                path=[],
                description=f"Move node {current} to the closed set.",
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
                    frontier=_frontier_nodes(
                        priority_queue,
                        distances,
                        closed,
                    ),
                    distances=distances,
                    previous=previous,
                    path=[],
                    description=f"Inspect edge from {current} to {neighbor}.",
                )
            )

            candidate_distance = current_distance + edge["weight"]
            known_distance = distances.get(neighbor)
            if known_distance is not None and candidate_distance >= known_distance:
                continue

            distances[neighbor] = candidate_distance
            previous[neighbor] = current
            if neighbor in closed:
                closed.remove(neighbor)
                visited.remove(neighbor)
            candidate_estimate = candidate_distance + heuristic_values.get(
                neighbor,
                0,
            )
            heappush(
                priority_queue,
                (
                    candidate_estimate,
                    next(order),
                    neighbor,
                    candidate_distance,
                ),
            )
            steps.append(
                create_graph_step(
                    "relax",
                    current=current,
                    neighbor=neighbor,
                    edge=edge,
                    visited=visited,
                    frontier=_frontier_nodes(
                        priority_queue,
                        distances,
                        closed,
                    ),
                    distances=distances,
                    previous=previous,
                    path=[],
                    description=(
                        f"Update g-score for {neighbor} to {candidate_distance} "
                        f"and estimated cost to {candidate_estimate}."
                    ),
                )
            )

    path = reconstruct_path(previous, start, target) if found else []
    frontier = _frontier_nodes(priority_queue, distances, closed)
    outcome = "path_found" if found else "not_found"
    description = (
        f"Found shortest path: {' -> '.join(path)}."
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
            frontier=frontier,
            distances=distances,
            previous=previous,
            path=path,
            description=description,
        )
    )
    steps.append(
        create_graph_step(
            "done",
            current=target if found else None,
            neighbor=None,
            edge=None,
            visited=visited,
            frontier=frontier,
            distances=distances,
            previous=previous,
            path=path,
            description="A* search is complete.",
        )
    )
    return steps
