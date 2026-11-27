from collections.abc import Sequence
from typing import Annotated, Literal, NotRequired, TypeAlias, TypedDict

from pydantic import ConfigDict, Field, SerializeAsAny, with_config


BacktrackingAlgorithm = Literal[
    "n_queens",
    "maze_solver",
    "permutations",
    "subsets",
    "sudoku_solver",
]

BacktrackingStepType = Literal[
    "try",
    "choose",
    "unchoose",
    "place",
    "remove",
    "move",
    "dead_end",
    "solution_found",
    "done",
]

MazePreset = Literal[
    "classic",
    "open",
    "rooms",
]

GridPosition: TypeAlias = tuple[int, int]
# The algorithms build results as plain dicts. The typed shapes below describe
# them per algorithm, and the API validates every step against them.
BacktrackingResult: TypeAlias = dict[str, object]

# An undeclared key fails validation instead of being dropped from a response.
_EXACT_KEYS = ConfigDict(extra="forbid")


class SudokuRun(TypedDict):
    """Sudoku board data that is the same for every step, sent once per run."""

    initial_board: list[list[str]]
    fixed_cells: list[GridPosition]


@with_config(_EXACT_KEYS)
class NQueensResult(TypedDict):
    """Result of an N-Queens step: the placement once a solution is found."""

    solved: bool
    size: int
    solution: list[GridPosition]


@with_config(_EXACT_KEYS)
class MazeSolverResult(TypedDict):
    """Result of a maze step: the path once the end is reached."""

    solved: bool
    rows: int
    cols: int
    preset: MazePreset
    path: list[GridPosition]


@with_config(_EXACT_KEYS)
class ListBacktrackingState(TypedDict):
    """Search state of a permutations or subsets step before the final one."""

    values: list[str]
    partial: list[str]
    active_item: str | None
    active_index: int | None
    depth: int
    # Permutations only: which input positions the partial result uses.
    used: NotRequired[list[bool]]
    # Subsets only: the decision this step makes, such as "include".
    decision: NotRequired[str]
    generated_count: int
    # Only on solution_found steps: the one result that step adds.
    generated_item: NotRequired[list[str]]


@with_config(_EXACT_KEYS)
class PermutationsResult(TypedDict):
    """Result of the final permutations step: every ordering found."""

    values: list[str]
    permutations: list[list[str]]
    count: int


@with_config(_EXACT_KEYS)
class SubsetsResult(TypedDict):
    """Result of the final subsets step: every subset found."""

    values: list[str]
    subsets: list[list[str]]
    count: int


@with_config(_EXACT_KEYS)
class SudokuResult(TypedDict):
    """Result of a Sudoku step. The step's grid holds the current board."""

    solved: bool
    solution: list[list[str]]
    tried_value: str | None
    conflicts: list[GridPosition]


class BacktrackingStepBase(TypedDict):
    """The fields that every backtracking step has, apart from its result."""

    type: BacktrackingStepType
    grid: list[list[str]]
    active_cell: GridPosition | None
    related_cells: list[GridPosition]
    description: str
    pseudocode_line: int | None


class BacktrackingStep(BacktrackingStepBase):
    """A single visual state produced by a backtracking algorithm."""

    result: BacktrackingResult | None


# The API types steps per algorithm, so each response states its result shape.
class NQueensStep(BacktrackingStepBase):
    result: NQueensResult | None


class MazeSolverStep(BacktrackingStepBase):
    result: MazeSolverResult | None


# Every step but the last holds the search state, so trying it first stops at
# the first member. A validated result already has the right shape, so it
# serializes as itself; checking it against the union again would double the
# cost of serializing these runs, which reach 12,000 steps.
class PermutationsStep(BacktrackingStepBase):
    result: SerializeAsAny[
        Annotated[
            ListBacktrackingState | PermutationsResult | None,
            Field(union_mode="left_to_right"),
        ]
    ]


class SubsetsStep(BacktrackingStepBase):
    result: SerializeAsAny[
        Annotated[
            ListBacktrackingState | SubsetsResult | None,
            Field(union_mode="left_to_right"),
        ]
    ]


class SudokuStep(BacktrackingStepBase):
    result: SudokuResult | None


def copy_grid(grid: Sequence[Sequence[str]]) -> list[list[str]]:
    """Create an independent snapshot of a backtracking grid."""

    return [list(row) for row in grid]


def create_backtracking_step(
    step_type: BacktrackingStepType,
    grid: Sequence[Sequence[str]],
    description: str,
    *,
    active_cell: GridPosition | None = None,
    related_cells: list[GridPosition] | None = None,
    pseudocode_line: int | None = None,
    result: BacktrackingResult | None = None,
) -> BacktrackingStep:
    """Create a step with independent copies of mutable values."""

    return {
        "type": step_type,
        "grid": copy_grid(grid),
        "active_cell": active_cell,
        "related_cells": (related_cells or []).copy(),
        "description": description,
        "pseudocode_line": pseudocode_line,
        "result": result.copy() if result is not None else None,
    }
