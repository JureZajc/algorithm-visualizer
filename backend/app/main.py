from random import randint

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, model_validator

from app.algorithms.backtracking import BACKTRACKING_ALGORITHMS
from app.algorithms.backtracking.sudoku_solver import DEFAULT_SUDOKU_BOARD
from app.algorithms.backtracking.types import (
    BacktrackingAlgorithm,
    BacktrackingStep,
    MazePreset,
)
from app.algorithms.dynamic_programming import DYNAMIC_PROGRAMMING_ALGORITHMS
from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingAlgorithm,
    DynamicProgrammingStep,
)
from app.algorithms.graph import graph_algorithm_steps
from app.algorithms.graph.types import GraphAlgorithm, GraphEdge, GraphStep
from app.algorithms.graph.utils import validate_graph
from app.algorithms.metadata import (
    AlgorithmsResponse,
    BACKTRACKING_ALGORITHM_METADATA,
    DYNAMIC_PROGRAMMING_ALGORITHM_METADATA,
    GRAPH_ALGORITHM_METADATA,
    SEARCHING_ALGORITHM_METADATA,
    SORTING_ALGORITHM_METADATA,
)
from app.algorithms.searching import (
    SEARCHING_ALGORITHMS,
)
from app.algorithms.sorting import SORTING_ALGORITHMS
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


class DynamicProgrammingRequest(BaseModel):
    algorithm: DynamicProgrammingAlgorithm
    n: int | None = None
    coins: list[int] | None = None
    amount: int | None = None
    weights: list[int] | None = None
    values: list[int] | None = None
    capacity: int | None = None
    text_a: str | None = None
    text_b: str | None = None
    rows: int | None = None
    cols: int | None = None

    @model_validator(mode="after")
    def validate_algorithm_input(self) -> "DynamicProgrammingRequest":
        """Apply algorithm defaults and validate bounded DP inputs."""

        if self.algorithm == "fibonacci":
            self.n = _validate_range(self.n if self.n is not None else 8, "n", 0, 40)
        elif self.algorithm == "coin_change":
            self.coins = _validate_positive_list(
                self.coins if self.coins is not None else [1, 3, 4],
                "coins",
                1,
                8,
            )
            self.amount = _validate_range(
                self.amount if self.amount is not None else 6,
                "amount",
                0,
                50,
            )
        elif self.algorithm == "knapsack":
            self.weights = _validate_positive_list(
                self.weights if self.weights is not None else [2, 3, 4, 5],
                "weights",
                1,
                8,
            )
            self.values = _validate_nonnegative_list(
                self.values if self.values is not None else [3, 4, 5, 6],
                "values",
                1,
                8,
            )
            if len(self.weights) != len(self.values):
                raise ValueError("Knapsack requires matching weights and values.")
            self.capacity = _validate_range(
                self.capacity if self.capacity is not None else 5,
                "capacity",
                0,
                50,
            )
        elif self.algorithm == "lcs":
            self.text_a = _validate_text(self.text_a if self.text_a is not None else "ABCDEF", "text_a")
            self.text_b = _validate_text(self.text_b if self.text_b is not None else "ACE", "text_b")
        elif self.algorithm == "edit_distance":
            self.text_a = _validate_text(self.text_a if self.text_a is not None else "kitten", "text_a")
            self.text_b = _validate_text(self.text_b if self.text_b is not None else "sitting", "text_b")
        else:
            self.rows = _validate_range(
                self.rows if self.rows is not None else 3,
                "rows",
                1,
                12,
            )
            self.cols = _validate_range(
                self.cols if self.cols is not None else 7,
                "cols",
                1,
                12,
            )
        return self

    def algorithm_input(self) -> dict[str, object]:
        if self.algorithm == "fibonacci":
            return {"n": self.n}
        if self.algorithm == "coin_change":
            return {"coins": self.coins.copy() if self.coins else [], "amount": self.amount}
        if self.algorithm == "knapsack":
            return {
                "weights": self.weights.copy() if self.weights else [],
                "values": self.values.copy() if self.values else [],
                "capacity": self.capacity,
            }
        if self.algorithm in {"lcs", "edit_distance"}:
            return {"text_a": self.text_a, "text_b": self.text_b}
        return {"rows": self.rows, "cols": self.cols}


class DynamicProgrammingResponse(BaseModel):
    algorithm: DynamicProgrammingAlgorithm
    input: dict[str, object]
    steps: list[DynamicProgrammingStep]
    step_count: int


class BacktrackingRequest(BaseModel):
    algorithm: BacktrackingAlgorithm
    size: int | None = None
    values: list[str] | None = None
    board: list[list[int | str]] | None = None
    rows: int | None = None
    cols: int | None = None
    preset: MazePreset | None = None
    grid: list[list[str]] | None = None
    start: tuple[int, int] | None = None
    end: tuple[int, int] | None = None

    @model_validator(mode="after")
    def validate_algorithm_input(self) -> "BacktrackingRequest":
        """Apply algorithm defaults and validate bounded backtracking inputs."""

        if self.algorithm == "n_queens":
            self.size = _validate_range(
                self.size if self.size is not None else 4,
                "size",
                1,
                10,
            )
        elif self.algorithm in {"permutations", "subsets"}:
            maximum = 6 if self.algorithm == "permutations" else 10
            self.values = _validate_text_list(
                self.values if self.values is not None else ["A", "B", "C"],
                "values",
                1,
                maximum,
            )
        elif self.algorithm == "maze_solver":
            self.rows = _validate_range(
                self.rows if self.rows is not None else 7,
                "rows",
                2,
                15,
            )
            self.cols = _validate_range(
                self.cols if self.cols is not None else 7,
                "cols",
                2,
                15,
            )
            self.preset = self.preset or "classic"
            if self.grid is not None:
                _validate_maze_grid(self.grid, self.rows, self.cols)
            if self.start is not None:
                _validate_position(self.start, "start", self.rows, self.cols)
            if self.end is not None:
                _validate_position(self.end, "end", self.rows, self.cols)
            if self.start is not None and self.end is not None and self.start == self.end:
                raise ValueError("Maze start and end must be different cells.")
        elif self.algorithm == "sudoku_solver":
            self.board = self.board or [row.copy() for row in DEFAULT_SUDOKU_BOARD]
        return self

    def algorithm_input(self) -> dict[str, object]:
        if self.algorithm == "n_queens":
            return {"size": self.size}
        if self.algorithm in {"permutations", "subsets"}:
            return {"values": self.values.copy() if self.values else []}
        if self.algorithm == "sudoku_solver":
            return {"board": [row.copy() for row in self.board or []]}
        algorithm_input: dict[str, object] = {
            "rows": self.rows,
            "cols": self.cols,
            "preset": self.preset,
        }
        if self.grid is not None:
            algorithm_input["grid"] = [row.copy() for row in self.grid]
        if self.start is not None:
            algorithm_input["start"] = self.start
        if self.end is not None:
            algorithm_input["target"] = self.end
        return algorithm_input


class BacktrackingResponse(BaseModel):
    algorithm: BacktrackingAlgorithm
    input: dict[str, object]
    steps: list[BacktrackingStep]
    step_count: int


def _validate_range(value: int, name: str, minimum: int, maximum: int) -> int:
    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}.")
    return value


def _validate_positive_list(
    values: list[int],
    name: str,
    minimum_length: int,
    maximum_length: int,
) -> list[int]:
    if len(values) < minimum_length or len(values) > maximum_length:
        raise ValueError(
            f"{name} must include {minimum_length} to {maximum_length} values."
        )
    if any(value <= 0 for value in values):
        raise ValueError(f"{name} must contain positive values.")
    return values.copy()


def _validate_nonnegative_list(
    values: list[int],
    name: str,
    minimum_length: int,
    maximum_length: int,
) -> list[int]:
    if len(values) < minimum_length or len(values) > maximum_length:
        raise ValueError(
            f"{name} must include {minimum_length} to {maximum_length} values."
        )
    if any(value < 0 for value in values):
        raise ValueError(f"{name} must contain nonnegative values.")
    return values.copy()


def _validate_text(value: str, name: str) -> str:
    if len(value) > 12:
        raise ValueError(f"{name} must be 12 characters or fewer.")
    return value


def _validate_text_list(
    values: list[str],
    name: str,
    minimum_length: int,
    maximum_length: int,
) -> list[str]:
    if len(values) < minimum_length or len(values) > maximum_length:
        raise ValueError(
            f"{name} must include {minimum_length} to {maximum_length} values."
        )
    normalized = [value.strip() for value in values]
    if any(not value for value in normalized):
        raise ValueError(f"{name} must not contain empty values.")
    return normalized


def _validate_maze_grid(
    grid: list[list[str]],
    rows: int | None,
    cols: int | None,
) -> None:
    if len(grid) != rows:
        raise ValueError("Maze grid row count must match rows.")
    if any(len(row) != cols for row in grid):
        raise ValueError("Maze grid column count must match cols.")
    valid_cells = {
        "empty",
        "wall",
        "start",
        "end",
        "visited",
        "path",
        "backtracked",
        "solution",
    }
    for row in grid:
        invalid_cells = set(row) - valid_cells
        if invalid_cells:
            invalid = min(invalid_cells)
            raise ValueError(f"Maze grid cell {invalid!r} is not supported.")


def _validate_position(
    position: tuple[int, int],
    name: str,
    rows: int | None,
    cols: int | None,
) -> None:
    row, column = position
    if rows is None or cols is None or row < 0 or row >= rows or column < 0 or column >= cols:
        raise ValueError(f"Maze {name} must be inside the grid.")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Algorithm Visualizer API is running"}


@app.get("/algorithms", response_model=AlgorithmsResponse)
def algorithms() -> AlgorithmsResponse:
    return AlgorithmsResponse(
        sorting=SORTING_ALGORITHM_METADATA,
        searching=SEARCHING_ALGORITHM_METADATA,
        graph=GRAPH_ALGORITHM_METADATA,
        dynamic_programming=DYNAMIC_PROGRAMMING_ALGORITHM_METADATA,
        backtracking=BACKTRACKING_ALGORITHM_METADATA,
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


@app.post("/dynamic-programming/steps", response_model=DynamicProgrammingResponse)
def dynamic_programming_steps(
    request: DynamicProgrammingRequest,
) -> DynamicProgrammingResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = DYNAMIC_PROGRAMMING_ALGORITHMS[request.algorithm](
            **algorithm_input,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return DynamicProgrammingResponse(
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
    )


@app.post("/backtracking/steps", response_model=BacktrackingResponse)
def backtracking_steps(request: BacktrackingRequest) -> BacktrackingResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = BACKTRACKING_ALGORITHMS[request.algorithm](**algorithm_input)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return BacktrackingResponse(
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
    )
