from random import randint

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator

from app.algorithms.graph import GRAPH_ALGORITHM_METADATA, graph_algorithm_steps
from app.algorithms.graph.types import GraphAlgorithm, GraphEdge, GraphStep
from app.algorithms.graph.utils import validate_graph
from app.algorithms.searching import (
    SEARCHING_ALGORITHM_METADATA,
    SEARCHING_ALGORITHMS,
)
from app.algorithms.sorting import SORTING_ALGORITHM_METADATA, SORTING_ALGORITHMS
from app.algorithms.types import (
    AlgorithmStep,
    SearchingAlgorithm,
    SortingAlgorithm,
)


app = FastAPI(title="Algorithm Visualizer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    size: int = 20
    min_value: int = 1
    max_value: int = 100


class SortRequest(BaseModel):
    numbers: list[int]
    algorithm: SortingAlgorithm


class SortResponse(BaseModel):
    algorithm: SortingAlgorithm
    initial: list[int]
    steps: list[AlgorithmStep]
    step_count: int


class SearchRequest(BaseModel):
    numbers: list[int]
    algorithm: SearchingAlgorithm
    target: int


class SearchResponse(BaseModel):
    algorithm: SearchingAlgorithm
    target: int
    initial: list[int]
    steps: list[AlgorithmStep]
    step_count: int


class GraphEdgeModel(BaseModel):
    source: str
    target: str
    weight: int | float = 1


class GraphRequest(BaseModel):
    nodes: list[str]
    edges: list[GraphEdgeModel]
    start: str
    target: str
    algorithm: GraphAlgorithm
    directed: bool = False
    heuristics: dict[str, int | float] | None = None

    @model_validator(mode="after")
    def validate_references(self) -> "GraphRequest":
        """Ensure all graph references point to submitted nodes."""

        edges: list[GraphEdge] = [
            {
                "source": edge.source,
                "target": edge.target,
                "weight": edge.weight,
            }
            for edge in self.edges
        ]
        validate_graph(self.nodes, edges, self.start, self.target)
        if self.heuristics is not None:
            unknown_nodes = set(self.heuristics) - set(self.nodes)
            if unknown_nodes:
                unknown = min(unknown_nodes)
                raise ValueError(f"Heuristic node {unknown!r} is not in the graph.")
            if any(value < 0 for value in self.heuristics.values()):
                raise ValueError(
                    "A* search requires non-negative heuristic values."
                )
        return self


class GraphResponse(BaseModel):
    algorithm: GraphAlgorithm
    nodes: list[str]
    edges: list[GraphEdgeModel]
    start: str
    target: str
    directed: bool
    heuristics: dict[str, int | float] | None
    steps: list[GraphStep]
    step_count: int


class AlgorithmMetadata(BaseModel):
    id: str
    label: str


class AlgorithmsResponse(BaseModel):
    sorting: list[AlgorithmMetadata]
    searching: list[AlgorithmMetadata]
    graph: list[AlgorithmMetadata]


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Algorithm Visualizer API is running"}


@app.get("/algorithms", response_model=AlgorithmsResponse)
def algorithms() -> AlgorithmsResponse:
    return AlgorithmsResponse(
        sorting=[AlgorithmMetadata(**item) for item in SORTING_ALGORITHM_METADATA],
        searching=[
            AlgorithmMetadata(**item) for item in SEARCHING_ALGORITHM_METADATA
        ],
        graph=[AlgorithmMetadata(**item) for item in GRAPH_ALGORITHM_METADATA],
    )


@app.post("/numbers/random")
def random_numbers(request: GenerateRequest) -> dict[str, list[int]]:
    numbers = [
        randint(request.min_value, request.max_value)
        for _ in range(request.size)
    ]
    return {"numbers": numbers}


@app.post("/sorting/steps", response_model=SortResponse)
def sorting_steps(request: SortRequest) -> SortResponse:
    initial = request.numbers.copy()
    steps = SORTING_ALGORITHMS[request.algorithm](request.numbers)

    return SortResponse(
        algorithm=request.algorithm,
        initial=initial,
        steps=steps,
        step_count=len(steps),
    )


@app.post("/searching/steps", response_model=SearchResponse)
def searching_steps(request: SearchRequest) -> SearchResponse:
    initial = request.numbers.copy()

    try:
        steps = SEARCHING_ALGORITHMS[request.algorithm](
            request.numbers,
            request.target,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return SearchResponse(
        algorithm=request.algorithm,
        target=request.target,
        initial=initial,
        steps=steps,
        step_count=len(steps),
    )


@app.post("/graph/steps", response_model=GraphResponse)
def graph_steps(request: GraphRequest) -> GraphResponse:
    edges: list[GraphEdge] = [
        {
            "source": edge.source,
            "target": edge.target,
            "weight": edge.weight,
        }
        for edge in request.edges
    ]

    try:
        steps = graph_algorithm_steps(
            request.algorithm,
            request.nodes,
            edges,
            request.start,
            request.target,
            request.directed,
            request.heuristics,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return GraphResponse(
        algorithm=request.algorithm,
        nodes=request.nodes.copy(),
        edges=[edge.model_copy(deep=True) for edge in request.edges],
        start=request.start,
        target=request.target,
        directed=request.directed,
        heuristics=request.heuristics.copy() if request.heuristics else None,
        steps=steps,
        step_count=len(steps),
    )
