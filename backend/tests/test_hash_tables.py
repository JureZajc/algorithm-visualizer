from collections.abc import Callable
from copy import deepcopy

import pytest

from app.algorithms.hash_tables import (
    hash_insert_chaining_steps,
    hash_insert_linear_probing_steps,
    hash_search_chaining_steps,
    hash_search_linear_probing_steps,
)
from app.algorithms.hash_tables.types import HashKey, HashTableStep
from app.algorithms.metadata import ALGORITHM_METADATA


HashTableFunction = Callable[..., list[HashTableStep]]

VALUES = [12, 22, 32, 5]
STEP_KEYS = {
    "type",
    "table",
    "key",
    "hash_index",
    "active_bucket",
    "active_item",
    "visited_buckets",
    "result",
    "description",
    "pseudocode_line",
}
VALID_STEP_TYPES = {
    "hash",
    "inspect_bucket",
    "compare",
    "insert",
    "collision",
    "probe",
    "found",
    "not_found",
    "done",
}
PSEUDOCODE_LENGTHS = {item.id: len(item.pseudocode) for item in ALGORITHM_METADATA}

HASH_TABLE_CASES: list[tuple[str, HashTableFunction, dict[str, object]]] = [
    (
        "hash_insert_chaining",
        hash_insert_chaining_steps,
        {"values": VALUES, "table_size": 10},
    ),
    (
        "hash_search_chaining",
        hash_search_chaining_steps,
        {"values": VALUES, "table_size": 10, "target": 32},
    ),
    (
        "hash_insert_linear_probing",
        hash_insert_linear_probing_steps,
        {"values": VALUES, "table_size": 10},
    ),
    (
        "hash_search_linear_probing",
        hash_search_linear_probing_steps,
        {"values": VALUES, "table_size": 10, "target": 32},
    ),
]


@pytest.mark.parametrize(
    ("algorithm_id", "algorithm", "kwargs"),
    HASH_TABLE_CASES,
)
def test_hash_table_algorithm_contract(
    algorithm_id: str,
    algorithm: HashTableFunction,
    kwargs: dict[str, object],
) -> None:
    original_kwargs = deepcopy(kwargs)

    steps = algorithm(**kwargs)

    assert kwargs == original_kwargs
    assert steps
    assert steps[-1]["type"] == "done"

    for step in steps:
        assert set(step) == STEP_KEYS
        assert step["type"] in VALID_STEP_TYPES
        assert step["description"]
        assert step["pseudocode_line"] is not None
        assert 1 <= step["pseudocode_line"] <= PSEUDOCODE_LENGTHS[algorithm_id]
        assert step["table"]["size"] == kwargs["table_size"]
        assert len(step["table"]["buckets"]) == kwargs["table_size"]
        assert isinstance(step["visited_buckets"], list)


def test_hash_insert_chaining_places_values_in_expected_buckets() -> None:
    steps = hash_insert_chaining_steps(VALUES, 10)
    buckets = _bucket_items(steps[-1])

    assert buckets[2] == [12, 22, 32]
    assert buckets[5] == [5]
    assert steps[-1]["table"]["strategy"] == "separate_chaining"


def test_hash_insert_linear_probing_places_values_in_expected_slots() -> None:
    steps = hash_insert_linear_probing_steps(VALUES, 10)
    buckets = _bucket_items(steps[-1])

    assert buckets[2] == [12]
    assert buckets[3] == [22]
    assert buckets[4] == [32]
    assert buckets[5] == [5]
    assert steps[-1]["table"]["strategy"] == "linear_probing"


@pytest.mark.parametrize(
    "search_function",
    [hash_search_chaining_steps, hash_search_linear_probing_steps],
)
def test_hash_search_finds_existing_value(
    search_function: Callable[[list[HashKey], int, HashKey], list[HashTableStep]],
) -> None:
    steps = search_function(VALUES, 10, 32)
    found_step = next(step for step in steps if step["type"] == "found")

    assert found_step["result"] is not None
    assert found_step["result"]["found"] is True
    assert found_step["result"]["target"] == 32
    assert steps[-1]["result"] == found_step["result"]


@pytest.mark.parametrize(
    "search_function",
    [hash_search_chaining_steps, hash_search_linear_probing_steps],
)
def test_hash_search_returns_not_found_for_missing_value(
    search_function: Callable[[list[HashKey], int, HashKey], list[HashTableStep]],
) -> None:
    steps = search_function(VALUES, 10, 42)
    not_found_step = next(step for step in steps if step["type"] == "not_found")

    assert not_found_step["result"] is not None
    assert not_found_step["result"]["found"] is False
    assert not_found_step["result"]["target"] == 42
    assert steps[-1]["result"] == not_found_step["result"]


@pytest.mark.parametrize(
    "insert_function",
    [hash_insert_chaining_steps, hash_insert_linear_probing_steps],
)
def test_hash_insert_visualizes_collision_steps(
    insert_function: Callable[[list[HashKey], int], list[HashTableStep]],
) -> None:
    steps = insert_function(VALUES, 10)

    assert any(step["type"] == "collision" for step in steps)


def test_hash_insert_linear_probing_visits_expected_buckets() -> None:
    steps = hash_insert_linear_probing_steps(VALUES, 10)
    insert_step = next(
        step
        for step in steps
        if step["type"] == "insert" and step["key"] == 32
    )

    assert insert_step["visited_buckets"] == [2, 3, 4]


def test_hash_search_linear_probing_visits_expected_buckets() -> None:
    steps = hash_search_linear_probing_steps(VALUES, 10, 32)
    found_step = next(step for step in steps if step["type"] == "found")

    assert found_step["visited_buckets"] == [2, 3, 4]


def test_hash_table_step_tables_are_independent_copies() -> None:
    steps = hash_insert_chaining_steps(VALUES, 10)

    assert len({id(step["table"]) for step in steps}) == len(steps)
    bucket_count = sum(len(step["table"]["buckets"]) for step in steps)
    assert (
        len({id(bucket) for step in steps for bucket in step["table"]["buckets"]})
        == bucket_count
    )
    assert (
        len(
            {
                id(bucket["items"])
                for step in steps
                for bucket in step["table"]["buckets"]
            }
        )
        == bucket_count
    )


def _bucket_items(step: HashTableStep) -> dict[int, list[HashKey]]:
    return {
        bucket["index"]: bucket["items"]
        for bucket in step["table"]["buckets"]
    }
