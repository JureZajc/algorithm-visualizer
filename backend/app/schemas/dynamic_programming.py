"""Dynamic programming requests, one model per algorithm.

Each model declares its fields' limits and defaults. A request selects its
model through `algorithm`, and fields that belong to other algorithms are
ignored.
"""

from typing import Annotated, Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field, model_validator, with_config

from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingAlgorithm,
    DynamicProgrammingStep,
)


# Tables grow with these values, and every step snapshots the whole table.
MAX_FIBONACCI_N = 40
MAX_DP_LIST_LENGTH = 8
MAX_DP_TARGET = 50
MAX_DP_TEXT_LENGTH = 12
MAX_DP_GRID_SIZE = 12

DpPositiveList = Annotated[
    list[Annotated[int, Field(ge=1)]],
    Field(min_length=1, max_length=MAX_DP_LIST_LENGTH),
]
DpNonNegativeList = Annotated[
    list[Annotated[int, Field(ge=0)]],
    Field(min_length=1, max_length=MAX_DP_LIST_LENGTH),
]
DpText = Annotated[str, Field(max_length=MAX_DP_TEXT_LENGTH)]

_EXACT_KEYS = ConfigDict(extra="forbid")


@with_config(_EXACT_KEYS)
class FibonacciInput(TypedDict):
    n: int


@with_config(_EXACT_KEYS)
class CoinChangeInput(TypedDict):
    coins: list[int]
    amount: int


@with_config(_EXACT_KEYS)
class KnapsackInput(TypedDict):
    weights: list[int]
    values: list[int]
    capacity: int


@with_config(_EXACT_KEYS)
class TextPairInput(TypedDict):
    text_a: str
    text_b: str


@with_config(_EXACT_KEYS)
class GridSizeInput(TypedDict):
    rows: int
    cols: int


DynamicProgrammingInput = (
    FibonacciInput | CoinChangeInput | KnapsackInput | TextPairInput | GridSizeInput
)


class FibonacciRequest(BaseModel):
    algorithm: Literal["fibonacci"]
    n: int = Field(default=8, ge=0, le=MAX_FIBONACCI_N)

    def algorithm_input(self) -> FibonacciInput:
        return {"n": self.n}


class CoinChangeRequest(BaseModel):
    algorithm: Literal["coin_change"]
    coins: DpPositiveList = [1, 3, 4]
    amount: int = Field(default=6, ge=0, le=MAX_DP_TARGET)

    def algorithm_input(self) -> CoinChangeInput:
        return {"coins": self.coins.copy(), "amount": self.amount}


class KnapsackRequest(BaseModel):
    algorithm: Literal["knapsack"]
    weights: DpPositiveList = [2, 3, 4, 5]
    values: DpNonNegativeList = [3, 4, 5, 6]
    capacity: int = Field(default=5, ge=0, le=MAX_DP_TARGET)

    @model_validator(mode="after")
    def validate_matching_items(self) -> "KnapsackRequest":
        if len(self.weights) != len(self.values):
            raise ValueError("Knapsack requires matching weights and values.")
        return self

    def algorithm_input(self) -> KnapsackInput:
        return {
            "weights": self.weights.copy(),
            "values": self.values.copy(),
            "capacity": self.capacity,
        }


class LongestCommonSubsequenceRequest(BaseModel):
    algorithm: Literal["lcs"]
    text_a: DpText = "ABCDEF"
    text_b: DpText = "ACE"

    def algorithm_input(self) -> TextPairInput:
        return {"text_a": self.text_a, "text_b": self.text_b}


class EditDistanceRequest(BaseModel):
    algorithm: Literal["edit_distance"]
    text_a: DpText = "kitten"
    text_b: DpText = "sitting"

    def algorithm_input(self) -> TextPairInput:
        return {"text_a": self.text_a, "text_b": self.text_b}


class UniquePathsRequest(BaseModel):
    algorithm: Literal["unique_paths"]
    rows: int = Field(default=3, ge=1, le=MAX_DP_GRID_SIZE)
    cols: int = Field(default=7, ge=1, le=MAX_DP_GRID_SIZE)

    def algorithm_input(self) -> GridSizeInput:
        return {"rows": self.rows, "cols": self.cols}


DynamicProgrammingRequest = Annotated[
    FibonacciRequest
    | CoinChangeRequest
    | KnapsackRequest
    | LongestCommonSubsequenceRequest
    | EditDistanceRequest
    | UniquePathsRequest,
    Field(discriminator="algorithm"),
]


class DynamicProgrammingResponse(BaseModel):
    algorithm: DynamicProgrammingAlgorithm
    input: DynamicProgrammingInput
    steps: list[DynamicProgrammingStep]
    step_count: int


DYNAMIC_PROGRAMMING_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    "fibonacci": FibonacciRequest,
    "coin_change": CoinChangeRequest,
    "knapsack": KnapsackRequest,
    "lcs": LongestCommonSubsequenceRequest,
    "edit_distance": EditDistanceRequest,
    "unique_paths": UniquePathsRequest,
}
