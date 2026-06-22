from collections.abc import Sequence
from typing import Literal, TypeAlias, TypedDict


DynamicProgrammingAlgorithm = Literal[
    "fibonacci",
    "coin_change",
    "knapsack",
    "lcs",
    "edit_distance",
    "unique_paths",
]

DynamicProgrammingStepType = Literal[
    "initialize",
    "compare",
    "update",
    "choose",
    "skip",
    "done",
]

DynamicProgrammingCell: TypeAlias = int | str
TablePosition: TypeAlias = tuple[int, int]


class DynamicProgrammingStep(TypedDict):
    """A single visual state produced by a dynamic programming algorithm."""

    type: DynamicProgrammingStepType
    table: list[list[DynamicProgrammingCell]]
    active_cell: TablePosition | None
    related_cells: list[TablePosition]
    description: str
    pseudocode_line: int | None
    result: int | str | None


def copy_table(
    table: Sequence[Sequence[DynamicProgrammingCell]],
) -> list[list[DynamicProgrammingCell]]:
    """Create an independent snapshot of a DP table."""

    return [list(row) for row in table]


def create_dynamic_programming_step(
    step_type: DynamicProgrammingStepType,
    table: Sequence[Sequence[DynamicProgrammingCell]],
    description: str,
    *,
    active_cell: TablePosition | None = None,
    related_cells: list[TablePosition] | None = None,
    pseudocode_line: int | None = None,
    result: int | str | None = None,
) -> DynamicProgrammingStep:
    """Create a step with independent copies of mutable values."""

    return {
        "type": step_type,
        "table": copy_table(table),
        "active_cell": active_cell,
        "related_cells": (related_cells or []).copy(),
        "description": description,
        "pseudocode_line": pseudocode_line,
        "result": result,
    }
