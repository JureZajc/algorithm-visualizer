from collections.abc import Sequence
from typing import Literal, TypeAlias, TypedDict


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
BacktrackingResult: TypeAlias = dict[str, object]


class BacktrackingStep(TypedDict):
    """A single visual state produced by a backtracking algorithm."""

    type: BacktrackingStepType
    grid: list[list[str]]
    active_cell: GridPosition | None
    related_cells: list[GridPosition]
    description: str
    pseudocode_line: int | None
    result: BacktrackingResult | None


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
