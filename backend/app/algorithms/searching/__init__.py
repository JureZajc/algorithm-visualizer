from collections.abc import Callable

from app.algorithms.searching.binary_search import binary_search_steps
from app.algorithms.searching.linear_search import linear_search_steps
from app.algorithms.types import AlgorithmStep, SearchingAlgorithm


SearchingFunction = Callable[[list[int], int], list[AlgorithmStep]]

SEARCHING_ALGORITHMS: dict[SearchingAlgorithm, SearchingFunction] = {
    "linear_search": linear_search_steps,
    "binary_search": binary_search_steps,
}

__all__ = [
    "SEARCHING_ALGORITHMS",
    "binary_search_steps",
    "linear_search_steps",
]
