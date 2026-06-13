from heapq import heappop, heappush
from itertools import count

from app.algorithms.graph.types import (
    GraphEdge,
    GraphStep,
    apply_graph_pseudocode_lines,
    create_graph_step,
)
from app.algorithms.graph.utils import (
    build_adjacency_list,
    reconstruct_path,
    validate_graph,
)


PriorityEntry = tuple[int | float, int, str]


def _frontier_nodes(
    priority_queue: list[PriorityEntry],
    distances: dict[str, int | float],
    visited: set[str],
) -> list[str]:
    """Return active priority queue nodes in their processing order."""

    frontier: list[str] = []
    included: set[str] = set()
    for distance, _, node in sorted(priority_queue):
        if (
            node not in visited
            and node not in included
            and distances.get(node) == distance
        ):
            frontier.append(node)
            included.add(node)
    return frontier


def dijkstra_steps(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
    directed: bool = False,
) -> list[GraphStep]:
    """Find a minimum-weight path using Dijkstra's algorithm."""

    validate_graph(nodes, edges, start, target)
    if any(edge["weight"] < 0 for edge in edges):
        raise ValueError("Dijkstra's algorithm requires non-negative weights.")

    adjacency = build_adjacency_list(nodes, edges, directed)
    order = count()
    priority_queue: list[PriorityEntry] = [(0, next(order), start)]
    distances: dict[str, int | float] = {start: 0}
    previous: dict[str, str | None] = {node: None for node in nodes}
    visited: list[str] = []
    visited_set: set[str] = set()
    steps: list[GraphStep] = []

    steps.append(
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
            description=f"Add start node {start} with distance 0.",
        )
    )

    found = False
    while priority_queue:
        current_distance, _, current = heappop(priority_queue)
        if current in visited_set or distances[current] != current_distance:
            continue

        frontier = _frontier_nodes(priority_queue, distances, visited_set)
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
                    f"Remove {current} with distance {current_distance} "
                    "from the priority queue."
                ),
            )
        )

        visited_set.add(current)
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
                    frontier=_frontier_nodes(
                        priority_queue,
                        distances,
                        visited_set,
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
            heappush(
                priority_queue,
                (candidate_distance, next(order), neighbor),
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
                        visited_set,
                    ),
                    distances=distances,
                    previous=previous,
                    path=[],
                    description=(
                        f"Update distance to {neighbor} to {candidate_distance}."
                    ),
                )
            )

    path = reconstruct_path(previous, start, target) if found else []
    frontier = _frontier_nodes(priority_queue, distances, visited_set)
    outcome = "path_found" if found else "not_found"
    outcome_description = (
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
            frontier=frontier,
            distances=distances,
            previous=previous,
            path=path,
            description="Dijkstra's algorithm is complete.",
        )
    )
    return apply_graph_pseudocode_lines(
        steps,
        {
            "push": 1,
            "pop": 2,
            "visit": 3,
            "inspect_edge": 5,
            "relax": 6,
            "path_found": 7,
            "not_found": 7,
            "done": 8,
        },
    )
