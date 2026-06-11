from typing import Literal, TypedDict


StepType = Literal[
    "compare",
    "swap",
    "overwrite",
    "partition",
    "merge",
    "done",
]

SortingAlgorithm = Literal[
    "bubble_sort",
    "selection_sort",
    "insertion_sort",
    "merge_sort",
    "quick_sort",
]


class AlgorithmStep(TypedDict):
    """A single visual state produced while an algorithm runs."""

    type: StepType
    indices: list[int]
    array: list[int]
    description: str


def create_step(
    step_type: StepType,
    indices: list[int],
    array: list[int],
    description: str,
) -> AlgorithmStep:
    """Create a step with independent copies of its mutable values."""

    return {
        "type": step_type,
        "indices": indices.copy(),
        "array": array.copy(),
        "description": description,
    }
