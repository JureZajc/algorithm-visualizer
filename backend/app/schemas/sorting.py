from typing import get_args

from pydantic import BaseModel

from app.algorithms.types import AlgorithmStep, SortingAlgorithm
from app.schemas.numbers import ArrayValues


class SortRequest(BaseModel):
    numbers: ArrayValues
    algorithm: SortingAlgorithm


class SortResponse(BaseModel):
    algorithm: SortingAlgorithm
    initial: list[int]
    steps: list[AlgorithmStep]
    step_count: int


SORTING_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    algorithm: SortRequest for algorithm in get_args(SortingAlgorithm)
}
