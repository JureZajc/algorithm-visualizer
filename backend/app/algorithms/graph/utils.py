from app.algorithms.graph.types import GraphEdge


AdjacencyList = dict[str, list[GraphEdge]]


def validate_graph(
    nodes: list[str],
    edges: list[GraphEdge],
    start: str,
    target: str,
) -> None:
    """Validate graph references shared by all graph algorithms."""

    if len(nodes) != len(set(nodes)):
        raise ValueError("Graph nodes must be unique.")
    if start not in nodes:
        raise ValueError(f"Start node {start!r} is not in the graph.")
    if target not in nodes:
        raise ValueError(f"Target node {target!r} is not in the graph.")

    node_set = set(nodes)
    for edge in edges:
        if edge["source"] not in node_set:
            raise ValueError(
                f"Edge source {edge['source']!r} is not in the graph."
            )
        if edge["target"] not in node_set:
            raise ValueError(
                f"Edge target {edge['target']!r} is not in the graph."
            )


def build_adjacency_list(
    nodes: list[str],
    edges: list[GraphEdge],
    directed: bool,
) -> AdjacencyList:
    """Build an adjacency list without modifying the submitted graph."""

    adjacency: AdjacencyList = {node: [] for node in nodes}

    for edge in edges:
        forward_edge = edge.copy()
        adjacency[edge["source"]].append(forward_edge)

        if not directed and edge["source"] != edge["target"]:
            reverse_edge: GraphEdge = {
                "source": edge["target"],
                "target": edge["source"],
                "weight": edge["weight"],
            }
            adjacency[edge["target"]].append(reverse_edge)

    return adjacency


def reconstruct_path(
    previous: dict[str, str | None],
    start: str,
    target: str,
) -> list[str]:
    """Reconstruct a discovered path from target back to start."""

    path: list[str] = []
    current: str | None = target

    while current is not None:
        path.append(current)
        if current == start:
            return list(reversed(path))
        current = previous[current]

    return []
