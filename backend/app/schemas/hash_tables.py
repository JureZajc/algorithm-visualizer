from typing import Annotated, NotRequired, TypedDict, get_args

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
    with_config,
)

from app.algorithms.hash_tables.types import (
    HashKey,
    HashTableAlgorithm,
    HashTableStep,
)


MAX_HASH_VALUES = 31
MIN_TABLE_SIZE = 2
MAX_TABLE_SIZE = 31
MAX_HASH_KEY_LENGTH = 32

# An integer, or a string that is not empty once surrounding spaces are removed.
HashKeyValue = (
    int
    | Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=1,
            max_length=MAX_HASH_KEY_LENGTH,
        ),
    ]
)

SEARCH_ALGORITHMS = {"hash_search_chaining", "hash_search_linear_probing"}
LINEAR_PROBING_ALGORITHMS = {
    "hash_insert_linear_probing",
    "hash_search_linear_probing",
}


@with_config(ConfigDict(extra="forbid"))
class HashTableInput(TypedDict):
    values: list[HashKey]
    table_size: int
    # Search operations only.
    target: NotRequired[HashKey]


class HashTableRequest(BaseModel):
    algorithm: HashTableAlgorithm
    values: list[HashKeyValue] = Field(min_length=1, max_length=MAX_HASH_VALUES)
    table_size: int = Field(default=10, ge=MIN_TABLE_SIZE, le=MAX_TABLE_SIZE)
    target: HashKeyValue | None = None

    @model_validator(mode="after")
    def validate_algorithm_input(self) -> "HashTableRequest":
        """Validate algorithm-specific hash table fields."""

        if self.algorithm in SEARCH_ALGORITHMS and self.target is None:
            raise ValueError("Hash table search requires a target key.")
        if (
            self.algorithm in LINEAR_PROBING_ALGORITHMS
            and len(self.values) > self.table_size
        ):
            raise ValueError(
                "Linear probing requires values count to fit within table_size."
            )
        return self

    def algorithm_input(self) -> HashTableInput:
        algorithm_input: HashTableInput = {
            "values": self.values.copy(),
            "table_size": self.table_size,
        }
        if self.algorithm in SEARCH_ALGORITHMS and self.target is not None:
            algorithm_input["target"] = self.target
        return algorithm_input


class HashTableResponse(BaseModel):
    algorithm: HashTableAlgorithm
    input: HashTableInput
    steps: list[HashTableStep]
    step_count: int


HASH_TABLES_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    algorithm: HashTableRequest for algorithm in get_args(HashTableAlgorithm)
}
