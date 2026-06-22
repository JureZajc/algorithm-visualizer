from collections.abc import Callable
from copy import deepcopy

import pytest

from app.algorithms.dynamic_programming import (
    coin_change_steps,
    edit_distance_steps,
    fibonacci_steps,
    knapsack_steps,
    lcs_steps,
    unique_paths_steps,
)
from app.algorithms.dynamic_programming.types import DynamicProgrammingStep
from app.algorithms.metadata import ALGORITHM_METADATA


DynamicProgrammingFunction = Callable[..., list[DynamicProgrammingStep]]

STEP_KEYS = {
    "type",
    "table",
    "active_cell",
    "related_cells",
    "description",
    "pseudocode_line",
    "result",
}
VALID_STEP_TYPES = {
    "initialize",
    "compare",
    "update",
    "choose",
    "skip",
    "done",
}
PSEUDOCODE_LENGTHS = {item.id: len(item.pseudocode) for item in ALGORITHM_METADATA}

DP_CASES: list[tuple[str, DynamicProgrammingFunction, dict[str, object], int | str]] = [
    ("fibonacci", fibonacci_steps, {"n": 8}, 21),
    ("coin_change", coin_change_steps, {"coins": [1, 3, 4], "amount": 6}, 2),
    (
        "knapsack",
        knapsack_steps,
        {"weights": [2, 3, 4, 5], "values": [3, 4, 5, 6], "capacity": 5},
        7,
    ),
    ("lcs", lcs_steps, {"text_a": "ABCDEF", "text_b": "ACE"}, "ACE"),
    (
        "edit_distance",
        edit_distance_steps,
        {"text_a": "kitten", "text_b": "sitting"},
        3,
    ),
    ("unique_paths", unique_paths_steps, {"rows": 3, "cols": 7}, 28),
]


@pytest.mark.parametrize(
    ("algorithm_id", "algorithm", "kwargs", "expected_result"),
    DP_CASES,
)
def test_dynamic_programming_algorithm_contract(
    algorithm_id: str,
    algorithm: DynamicProgrammingFunction,
    kwargs: dict[str, object],
    expected_result: int | str,
) -> None:
    original_kwargs = deepcopy(kwargs)

    steps = algorithm(**kwargs)

    assert kwargs == original_kwargs
    assert steps
    assert steps[-1]["type"] == "done"
    assert steps[-1]["result"] == expected_result

    for step in steps:
        assert set(step) == STEP_KEYS
        assert step["type"] in VALID_STEP_TYPES
        assert isinstance(step["table"], list)
        assert all(isinstance(row, list) for row in step["table"])
        assert step["active_cell"] is None or len(step["active_cell"]) == 2
        assert all(len(cell) == 2 for cell in step["related_cells"])
        assert step["description"]
        assert step["pseudocode_line"] is not None
        assert 1 <= step["pseudocode_line"] <= PSEUDOCODE_LENGTHS[algorithm_id]


@pytest.mark.parametrize(
    ("_algorithm_id", "algorithm", "kwargs", "_expected_result"),
    DP_CASES,
)
def test_dynamic_programming_step_tables_are_independent_copies(
    _algorithm_id: str,
    algorithm: DynamicProgrammingFunction,
    kwargs: dict[str, object],
    _expected_result: int | str,
) -> None:
    steps = algorithm(**deepcopy(kwargs))

    assert len({id(step["table"]) for step in steps}) == len(steps)
    row_count = sum(len(step["table"]) for step in steps)
    assert len({id(row) for step in steps for row in step["table"]}) == row_count


def test_coin_change_reports_impossible_amount() -> None:
    steps = coin_change_steps([4, 6], 7)

    assert steps[-1]["type"] == "done"
    assert steps[-1]["result"] == "not possible"
    assert any("inf" in row for step in steps for row in step["table"])


def test_lcs_uses_deterministic_tie_breaking() -> None:
    steps = lcs_steps("ABCBDAB", "BDCABA")

    assert steps[-1]["result"] == "BCBA"
