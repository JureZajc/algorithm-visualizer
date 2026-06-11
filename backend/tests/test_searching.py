from collections.abc import Callable

import pytest

from app.algorithms.searching import binary_search_steps, linear_search_steps
from app.algorithms.types import AlgorithmStep


SearchingFunction = Callable[[list[int], int], list[AlgorithmStep]]

SEARCHING_FUNCTIONS: list[SearchingFunction] = [
    linear_search_steps,
    binary_search_steps,
]


@pytest.mark.parametrize("search_function", SEARCHING_FUNCTIONS)
@pytest.mark.parametrize(
    ("numbers", "target", "expected_outcome"),
    [
        ([], 3, "not_found"),
        ([7], 7, "found"),
        ([1, 2, 2, 4], 2, "found"),
        ([-5, -1, 0, 8], 6, "not_found"),
    ],
)
def test_searching_algorithm_contract(
    search_function: SearchingFunction,
    numbers: list[int],
    target: int,
    expected_outcome: str,
) -> None:
    original = numbers.copy()

    steps = search_function(numbers, target)

    assert numbers == original
    assert steps
    assert steps[-1]["type"] == "done"
    assert steps[-1]["array"] == original
    assert expected_outcome in {step["type"] for step in steps}

    for step in steps:
        assert set(step) == {"type", "indices", "array", "description"}
        assert step["type"] in {"compare", "found", "not_found", "done"}
        assert isinstance(step["indices"], list)
        assert isinstance(step["array"], list)
        assert step["description"]


@pytest.mark.parametrize("search_function", SEARCHING_FUNCTIONS)
def test_search_step_arrays_are_independent_copies(
    search_function: SearchingFunction,
) -> None:
    steps = search_function([1, 2, 3], 2)

    assert len({id(step["array"]) for step in steps}) == len(steps)


@pytest.mark.parametrize("search_function", SEARCHING_FUNCTIONS)
def test_found_step_points_to_target(search_function: SearchingFunction) -> None:
    numbers = [1, 2, 2, 4]
    steps = search_function(numbers, 2)
    found_step = next(step for step in steps if step["type"] == "found")

    assert len(found_step["indices"]) == 1
    assert numbers[found_step["indices"][0]] == 2
    assert not any(step["type"] == "not_found" for step in steps)


@pytest.mark.parametrize("search_function", SEARCHING_FUNCTIONS)
def test_missing_target_emits_not_found(search_function: SearchingFunction) -> None:
    steps = search_function([1, 2, 4], 3)

    assert any(step["type"] == "not_found" for step in steps)
    assert not any(step["type"] == "found" for step in steps)


def test_binary_search_rejects_unsorted_input() -> None:
    numbers = [3, 1, 2]
    original = numbers.copy()

    with pytest.raises(
        ValueError,
        match="requires numbers sorted in ascending order",
    ):
        binary_search_steps(numbers, 2)

    assert numbers == original
