from app.algorithms.graph.types import GraphEdge, GraphStep, create_graph_step
from app.algorithms.graph.utils import validate_graph_structure


class DisjointSet:
    """Track connected components for Kruskal's algorithm."""

    def __init__(self, nodes: list[str]) -> None:
        self.parent = {node: node for node in nodes}
        self.rank = {node: 0 for node in nodes}

    def find(self, node: str) -> str:
        """Return the component representative with path compression."""

        if self.parent[node] != node:
            self.parent[node] = self.find(self.parent[node])
        return self.parent[node]

    def union(self, first: str, second: str) -> bool:
        """Join two components and report whether they were separate."""

        first_root = self.find(first)
        second_root = self.find(second)
        if first_root == second_root:
            return False

        if self.rank[first_root] < self.rank[second_root]:
            first_root, second_root = second_root, first_root
        self.parent[second_root] = first_root
        if self.rank[first_root] == self.rank[second_root]:
            self.rank[first_root] += 1
        return True


def kruskal_steps(
    nodes: list[str],
    edges: list[GraphEdge],
) -> list[GraphStep]:
    """Build a minimum spanning forest using Kruskal's algorithm."""

    validate_graph_structure(nodes, edges)
    sorted_edges = sorted(enumerate(edges), key=lambda item: (item[1]["weight"], item[0]))
    disjoint_set = DisjointSet(nodes)
    mst_edges: list[GraphEdge] = []
    total_weight: int | float = 0
    steps: list[GraphStep] = []

    for index, (_, edge) in enumerate(sorted_edges):
        remaining_edges = [item[1] for item in sorted_edges[index + 1 :]]
        steps.append(
            create_graph_step(
                "inspect_edge",
                current=edge["source"],
                neighbor=edge["target"],
                edge=edge,
                visited=[],
                frontier=[],
                distances=None,
                previous=None,
                path=[],
                frontier_edges=remaining_edges,
                mst_edges=mst_edges,
                total_weight=total_weight,
                description=(
                    f"Inspect edge from {edge['source']} to {edge['target']} "
                    f"with weight {edge['weight']}."
                ),
            )
        )

        if disjoint_set.union(edge["source"], edge["target"]):
            mst_edges.append(edge.copy())
            total_weight += edge["weight"]
            step_type = "accept_edge"
            description = "Accept the edge because it connects two components."
        else:
            step_type = "reject_edge"
            description = "Reject the edge because it would form a cycle."

        steps.append(
            create_graph_step(
                step_type,
                current=edge["source"],
                neighbor=edge["target"],
                edge=edge,
                visited=[],
                frontier=[],
                distances=None,
                previous=None,
                path=[],
                frontier_edges=remaining_edges,
                mst_edges=mst_edges,
                total_weight=total_weight,
                description=description,
            )
        )

    steps.append(
        create_graph_step(
            "done",
            current=None,
            neighbor=None,
            edge=None,
            visited=[],
            frontier=[],
            distances=None,
            previous=None,
            path=[],
            mst_edges=mst_edges,
            total_weight=total_weight,
            description="Kruskal's minimum spanning forest is complete.",
        )
    )
    return steps
