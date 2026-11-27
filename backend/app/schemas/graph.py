from typing import Annotated, get_args

from pydantic import BaseModel, Field, FiniteFloat, model_validator

from app.algorithms.graph.types import GraphAlgorithm, GraphEdge, GraphStep
from app.algorithms.graph.utils import validate_graph


MAX_GRAPH_NODES = 30
MAX_GRAPH_EDGES = 200
MAX_GRAPH_NODE_LENGTH = 20

GraphNode = Annotated[str, Field(min_length=1, max_length=MAX_GRAPH_NODE_LENGTH)]
GraphNumber = int | FiniteFloat


class GraphEdgeModel(BaseModel):
    source: str
    target: str
    weight: GraphNumber = 1


class GraphRequest(BaseModel):
    nodes: list[GraphNode] = Field(max_length=MAX_GRAPH_NODES)
    edges: list[GraphEdgeModel] = Field(max_length=MAX_GRAPH_EDGES)
    start: str
    target: str
    algorithm: GraphAlgorithm
    directed: bool = False
    heuristics: dict[str, GraphNumber] | None = None

    @model_validator(mode="after")
    def validate_references(self) -> "GraphRequest":
        """Ensure all graph references point to submitted nodes."""

        if any(not node.strip() for node in self.nodes):
            raise ValueError("Graph node names must not be empty.")
        validate_graph(self.nodes, self.graph_edges(), self.start, self.target)
        if self.heuristics is not None:
            unknown_nodes = set(self.heuristics) - set(self.nodes)
            if unknown_nodes:
                unknown = min(unknown_nodes)
                raise ValueError(f"Heuristic node {unknown!r} is not in the graph.")
            if any(value < 0 for value in self.heuristics.values()):
                raise ValueError("A* search requires non-negative heuristic values.")
        return self

    def graph_edges(self) -> list[GraphEdge]:
        return [
            {
                "source": edge.source,
                "target": edge.target,
                "weight": edge.weight,
            }
            for edge in self.edges
        ]


class GraphResponse(BaseModel):
    algorithm: GraphAlgorithm
    nodes: list[str]
    edges: list[GraphEdgeModel]
    start: str
    target: str
    directed: bool
    heuristics: dict[str, GraphNumber] | None
    steps: list[GraphStep]
    step_count: int


GRAPH_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    algorithm: GraphRequest for algorithm in get_args(GraphAlgorithm)
}
