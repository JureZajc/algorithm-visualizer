from typing import Literal, TypeAlias, TypedDict


HashTableAlgorithm = Literal[
    "hash_insert_chaining",
    "hash_search_chaining",
    "hash_insert_linear_probing",
    "hash_search_linear_probing",
]

HashTableStrategy = Literal["separate_chaining", "linear_probing"]

HashTableStepType = Literal[
    "hash",
    "inspect_bucket",
    "compare",
    "insert",
    "collision",
    "probe",
    "found",
    "not_found",
    "done",
]

HashKey: TypeAlias = int | str
HashTableResult: TypeAlias = dict[str, object]


class HashTableBucket(TypedDict):
    index: int
    items: list[HashKey]


class HashTableSnapshot(TypedDict):
    strategy: HashTableStrategy
    size: int
    buckets: list[HashTableBucket]


class HashTableStep(TypedDict):
    """A single visual state produced by a hash table operation."""

    type: HashTableStepType
    table: HashTableSnapshot
    key: HashKey
    hash_index: int | None
    active_bucket: int | None
    active_item: HashKey | None
    visited_buckets: list[int]
    result: HashTableResult | None
    description: str
    pseudocode_line: int | None


def clone_hash_table(table: HashTableSnapshot) -> HashTableSnapshot:
    """Create an independent hash table snapshot."""

    return {
        "strategy": table["strategy"],
        "size": table["size"],
        "buckets": [
            {"index": bucket["index"], "items": bucket["items"].copy()}
            for bucket in table["buckets"]
        ],
    }


def create_hash_table(
    size: int,
    strategy: HashTableStrategy,
) -> HashTableSnapshot:
    """Create an empty hash table snapshot."""

    return {
        "strategy": strategy,
        "size": size,
        "buckets": [
            {"index": index, "items": []}
            for index in range(size)
        ],
    }


def create_hash_table_step(
    step_type: HashTableStepType,
    table: HashTableSnapshot,
    key: HashKey,
    description: str,
    *,
    hash_index: int | None = None,
    active_bucket: int | None = None,
    active_item: HashKey | None = None,
    visited_buckets: list[int] | None = None,
    result: HashTableResult | None = None,
    pseudocode_line: int | None = None,
) -> HashTableStep:
    """Create a hash table step with independent mutable values."""

    step: HashTableStep = {
        "type": step_type,
        "table": clone_hash_table(table),
        "key": key,
        "hash_index": hash_index,
        "active_bucket": active_bucket,
        "active_item": active_item,
        "visited_buckets": (visited_buckets or []).copy(),
        "result": result.copy() if result is not None else None,
        "description": description,
        "pseudocode_line": pseudocode_line,
    }
    return step
