from typing import Literal, NotRequired, TypedDict


StepType = Literal[
    "compare",
    "swap",
    "overwrite",
    "partition",
    "merge",
    "heapify",
    "found",
    "not_found",
    "done",
]

SortingAlgorithm = Literal[
    "bubble_sort",
    "selection_sort",
    "insertion_sort",
    "merge_sort",
    "quick_sort",
    "heap_sort",
    "shell_sort",
    "cocktail_shaker_sort",
    "gnome_sort",
    "comb_sort",
    "counting_sort",
]

SearchingAlgorithm = Literal[
    "linear_search",
    "binary_search",
]


class AlgorithmStep(TypedDict):
    """A single visual state produced while an algorithm runs."""

    type: StepType
    indices: list[int]
    array: list[int]
    description: str
    pseudocode_line: NotRequired[int]


def create_step(
    step_type: StepType,
    indices: list[int],
    array: list[int],
    description: str,
    pseudocode_line: int | None = None,
) -> AlgorithmStep:
    """Create a step with independent copies of its mutable values."""

    step: AlgorithmStep = {
        "type": step_type,
        "indices": indices.copy(),
        "array": array.copy(),
        "description": description,
    }
    if pseudocode_line is not None:
        step["pseudocode_line"] = pseudocode_line
    return step


def apply_pseudocode_lines(
    steps: list[AlgorithmStep],
    lines_by_type: dict[StepType, int],
) -> list[AlgorithmStep]:
    """Attach 1-based pseudocode lines without changing step generation."""

    for step in steps:
        line = lines_by_type.get(step["type"])
        if line is not None and "pseudocode_line" not in step:
            step["pseudocode_line"] = line
    return steps
