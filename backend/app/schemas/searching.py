from typing import get_args

from pydantic import BaseModel

from app.algorithms.types import AlgorithmStep, SearchingAlgorithm
from app.schemas.numbers import ArrayValue, ArrayValues


class SearchRequest(BaseModel):
    numbers: ArrayValues
    algorithm: SearchingAlgorithm
    target: ArrayValue


class SearchResponse(BaseModel):
    algorithm: SearchingAlgorithm
    target: int
    initial: list[int]
    steps: list[AlgorithmStep]
    step_count: int


SEARCHING_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    algorithm: SearchRequest for algorithm in get_args(SearchingAlgorithm)
}
