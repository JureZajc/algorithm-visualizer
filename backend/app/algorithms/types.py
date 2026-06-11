from typing import Literal, TypedDict


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
