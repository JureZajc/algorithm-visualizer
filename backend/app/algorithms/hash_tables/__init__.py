from collections.abc import Callable

from app.algorithms.hash_tables.hash_tables import (
    hash_insert_chaining_steps,
    hash_insert_linear_probing_steps,
    hash_search_chaining_steps,
    hash_search_linear_probing_steps,
)
from app.algorithms.hash_tables.types import HashKey, HashTableAlgorithm, HashTableStep


HashTableFunction = Callable[..., list[HashTableStep]]

HASH_TABLE_ALGORITHMS: dict[HashTableAlgorithm, HashTableFunction] = {
    "hash_insert_chaining": hash_insert_chaining_steps,
    "hash_search_chaining": hash_search_chaining_steps,
    "hash_insert_linear_probing": hash_insert_linear_probing_steps,
    "hash_search_linear_probing": hash_search_linear_probing_steps,
}

__all__ = [
    "HASH_TABLE_ALGORITHMS",
    "HashKey",
    "hash_insert_chaining_steps",
    "hash_insert_linear_probing_steps",
    "hash_search_chaining_steps",
    "hash_search_linear_probing_steps",
]
