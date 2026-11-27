"""Backtracking requests and responses, one model per algorithm.

A request selects its model through `algorithm`, and fields that belong to
other algorithms are ignored. Responses are typed per algorithm as well, so
each one states the shape of its steps' results.
"""

from collections.abc import Callable
from typing import Annotated, Literal, NotRequired, TypedDict

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SerializeAsAny,
    StringConstraints,
    model_validator,
    with_config,
)

from app.algorithms.backtracking.sudoku_solver import (
    BOARD_SIZE,
    DEFAULT_SUDOKU_BOARD,
)
from app.algorithms.backtracking.types import (
    GridPosition,
    MazePreset,
    MazeSolverStep,
    NQueensStep,
    PermutationsStep,
    SubsetsStep,
    SudokuStep,
)


# Step counts grow quickly with these values; each step snapshots the state.
MAX_QUEENS = 10
MIN_MAZE_SIZE = 2
MAX_MAZE_SIZE = 15
MAX_PERMUTATION_VALUES = 6
MAX_SUBSET_VALUES = 10
MAX_LIST_VALUE_LENGTH = 12

MazeGridCell = Literal[
    "empty",
    "wall",
    "start",
    "end",
    "visited",
    "path",
    "backtracked",
    "solution",
]
ListValue = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=MAX_LIST_VALUE_LENGTH,
    ),
]
# Cells are digits, with 0 or "." for an empty cell; the solver checks them.
SudokuRow = Annotated[
    list[int | str],
    Field(min_length=BOARD_SIZE, max_length=BOARD_SIZE),
]
SudokuBoard = Annotated[
    list[SudokuRow],
    Field(min_length=BOARD_SIZE, max_length=BOARD_SIZE),
]

_EXACT_KEYS = ConfigDict(extra="forbid")


@with_config(_EXACT_KEYS)
class NQueensInput(TypedDict):
    size: int


@with_config(_EXACT_KEYS)
class MazeSolverInput(TypedDict):
    rows: int
    cols: int
    preset: MazePreset
    grid: NotRequired[list[list[MazeGridCell]]]
    start: NotRequired[GridPosition]
    # The request's `end`, under the solver's parameter name.
    target: NotRequired[GridPosition]


@with_config(_EXACT_KEYS)
class ListValuesInput(TypedDict):
    values: list[str]


@with_config(_EXACT_KEYS)
class SudokuInput(TypedDict):
    board: list[list[int | str]]


class NQueensRequest(BaseModel):
    algorithm: Literal["n_queens"]
    size: int = Field(default=4, ge=1, le=MAX_QUEENS)

    def algorithm_input(self) -> NQueensInput:
        return {"size": self.size}


class MazeSolverRequest(BaseModel):
    algorithm: Literal["maze_solver"]
    rows: int = Field(default=7, ge=MIN_MAZE_SIZE, le=MAX_MAZE_SIZE)
    cols: int = Field(default=7, ge=MIN_MAZE_SIZE, le=MAX_MAZE_SIZE)
    preset: MazePreset = "classic"
    # A custom maze; it must have `rows` rows of `cols` cells.
    grid: list[list[MazeGridCell]] | None = None
    start: GridPosition | None = None
    end: GridPosition | None = None

    @model_validator(mode="after")
    def validate_custom_maze(self) -> "MazeSolverRequest":
        if self.grid is not None:
            if len(self.grid) != self.rows:
                raise ValueError("Maze grid row count must match rows.")
            if any(len(row) != self.cols for row in self.grid):
                raise ValueError("Maze grid column count must match cols.")
        for name, position in (("start", self.start), ("end", self.end)):
            if position is not None and not self._contains(position):
                raise ValueError(f"Maze {name} must be inside the grid.")
        if self.start is not None and self.start == self.end:
            raise ValueError("Maze start and end must be different cells.")
        return self

    def _contains(self, position: GridPosition) -> bool:
        row, column = position
        return 0 <= row < self.rows and 0 <= column < self.cols

    def algorithm_input(self) -> MazeSolverInput:
        algorithm_input: MazeSolverInput = {
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


class PermutationsRequest(BaseModel):
    algorithm: Literal["permutations"]
    values: list[ListValue] = Field(
        default=["A", "B", "C"],
        min_length=1,
        max_length=MAX_PERMUTATION_VALUES,
    )

    def algorithm_input(self) -> ListValuesInput:
        return {"values": self.values.copy()}


class SubsetsRequest(BaseModel):
    algorithm: Literal["subsets"]
    values: list[ListValue] = Field(
        default=["A", "B", "C"],
        min_length=1,
        max_length=MAX_SUBSET_VALUES,
    )

    def algorithm_input(self) -> ListValuesInput:
        return {"values": self.values.copy()}


class SudokuSolverRequest(BaseModel):
    algorithm: Literal["sudoku_solver"]
    board: SudokuBoard = DEFAULT_SUDOKU_BOARD

    def algorithm_input(self) -> SudokuInput:
        return {"board": [row.copy() for row in self.board]}


BacktrackingRequest = Annotated[
    NQueensRequest
    | MazeSolverRequest
    | PermutationsRequest
    | SubsetsRequest
    | SudokuSolverRequest,
    Field(discriminator="algorithm"),
]


# Every response has `initial_board` and `fixed_cells`: the Sudoku data that
# all steps share, sent once. They are null for the other algorithms.
class NQueensResponse(BaseModel):
    algorithm: Literal["n_queens"]
    input: NQueensInput
    steps: list[NQueensStep]
    step_count: int
    initial_board: None = None
    fixed_cells: None = None


class MazeSolverResponse(BaseModel):
    algorithm: Literal["maze_solver"]
    input: MazeSolverInput
    steps: list[MazeSolverStep]
    step_count: int
    initial_board: None = None
    fixed_cells: None = None


class PermutationsResponse(BaseModel):
    algorithm: Literal["permutations"]
    input: ListValuesInput
    steps: list[PermutationsStep]
    step_count: int
    initial_board: None = None
    fixed_cells: None = None


class SubsetsResponse(BaseModel):
    algorithm: Literal["subsets"]
    input: ListValuesInput
    steps: list[SubsetsStep]
    step_count: int
    initial_board: None = None
    fixed_cells: None = None


class SudokuSolverResponse(BaseModel):
    algorithm: Literal["sudoku_solver"]
    input: SudokuInput
    steps: list[SudokuStep]
    step_count: int
    # The normalized puzzle, with "." for empty cells.
    initial_board: list[list[str]]
    fixed_cells: list[GridPosition]


# A route returns one of these models, so each serializes as itself. Without
# SerializeAsAny, Pydantic type-checks every value against the union while it
# serializes, which takes over twice as long for a 10,000-step Sudoku run.
BacktrackingResponse = SerializeAsAny[
    Annotated[
        NQueensResponse
        | MazeSolverResponse
        | PermutationsResponse
        | SubsetsResponse
        | SudokuSolverResponse,
        Field(discriminator="algorithm"),
    ]
]

BACKTRACKING_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    "n_queens": NQueensRequest,
    "maze_solver": MazeSolverRequest,
    "permutations": PermutationsRequest,
    "subsets": SubsetsRequest,
    "sudoku_solver": SudokuSolverRequest,
}

BACKTRACKING_RESPONSE_MODELS: dict[str, Callable[..., BacktrackingResponse]] = {
    "n_queens": NQueensResponse,
    "maze_solver": MazeSolverResponse,
    "permutations": PermutationsResponse,
    "subsets": SubsetsResponse,
    "sudoku_solver": SudokuSolverResponse,
}
