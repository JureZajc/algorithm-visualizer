from collections.abc import Callable

import pytest

from app.algorithms.sorting import (
    bubble_sort_steps,
    cocktail_shaker_sort_steps,
    comb_sort_steps,
    counting_sort_steps,
    gnome_sort_steps,
    heap_sort_steps,
    insertion_sort_steps,
    merge_sort_steps,
    quick_sort_steps,
    selection_sort_steps,
    shell_sort_steps,
)
from app.algorithms.metadata import ALGORITHM_METADATA
from app.algorithms.types import AlgorithmStep, create_step


SortingFunction = Callable[[list[int]], list[AlgorithmStep]]

SORTING_FUNCTIONS: list[SortingFunction] = [
    bubble_sort_steps,
    selection_sort_steps,
    insertion_sort_steps,
    merge_sort_steps,
    quick_sort_steps,
    heap_sort_steps,
    shell_sort_steps,
    cocktail_shaker_sort_steps,
    gnome_sort_steps,
    comb_sort_steps,
    counting_sort_steps,
]

INPUTS = [
    [],
    [7],
    [4, 2, 4, 1],
    [-3, 5, 0, -1],
    [1, 2, 3, 4],
    [5, 4, 3, 2, 1],
]

VALID_STEP_TYPES = {
    "compare",
    "swap",
    "overwrite",
    "partition",
    "merge",
    "heapify",
    "done",
}
PSEUDOCODE_LENGTHS = {item.id: len(item.pseudocode) for item in ALGORITHM_METADATA}


@pytest.mark.parametrize("sort_function", SORTING_FUNCTIONS)
@pytest.mark.parametrize("numbers", INPUTS)
def test_sorting_algorithm_contract(
    sort_function: SortingFunction,
    numbers: list[int],
) -> None:
    original = numbers.copy()

    steps = sort_function(numbers)

    assert numbers == original
    assert steps
    assert steps[-1]["type"] == "done"
    assert steps[-1]["array"] == sorted(original)

    for step in steps:
        assert set(step) == {
            "type",
            "indices",
            "array",
            "description",
            "pseudocode_line",
        }
        assert step["type"] in VALID_STEP_TYPES
        assert isinstance(step["indices"], list)
        assert isinstance(step["array"], list)
        assert step["description"]
        algorithm_id = sort_function.__name__.removesuffix("_steps")
        assert 1 <= step["pseudocode_line"] <= PSEUDOCODE_LENGTHS[algorithm_id]


@pytest.mark.parametrize("sort_function", SORTING_FUNCTIONS)
def test_step_arrays_are_independent_copies(sort_function: SortingFunction) -> None:
    steps = sort_function([3, 1, 2])

    assert len({id(step["array"]) for step in steps}) == len(steps)


@pytest.mark.parametrize(
    ("sort_function", "expected_types"),
    [
        (bubble_sort_steps, {"compare", "swap", "done"}),
        (selection_sort_steps, {"compare", "swap", "done"}),
        (insertion_sort_steps, {"compare", "overwrite", "done"}),
        (
            merge_sort_steps,
            {"partition", "compare", "overwrite", "merge", "done"},
        ),
        (quick_sort_steps, {"partition", "compare", "swap", "done"}),
        (heap_sort_steps, {"heapify", "compare", "swap", "done"}),
        (shell_sort_steps, {"compare", "overwrite", "done"}),
        (cocktail_shaker_sort_steps, {"compare", "swap", "done"}),
        (gnome_sort_steps, {"compare", "swap", "done"}),
        (comb_sort_steps, {"compare", "swap", "done"}),
        (counting_sort_steps, {"overwrite", "done"}),
    ],
)
def test_algorithm_emits_expected_step_types(
    sort_function: SortingFunction,
    expected_types: set[str],
) -> None:
    steps = sort_function([3, 1, 2])

    assert {step["type"] for step in steps} == expected_types


def test_create_step_keeps_pseudocode_line_optional() -> None:
    legacy_step = create_step("compare", [0, 1], [2, 1], "Compare values.")
    annotated_step = create_step(
        "compare",
        [0, 1],
        [2, 1],
        "Compare values.",
        2,
    )

    assert "pseudocode_line" not in legacy_step
    assert annotated_step["pseudocode_line"] == 2
