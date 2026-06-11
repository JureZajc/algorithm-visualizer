from collections.abc import Callable

from app.algorithms.searching.binary_search import binary_search_steps
from app.algorithms.searching.linear_search import linear_search_steps
from app.algorithms.types import AlgorithmStep, SearchingAlgorithm


SearchingFunction = Callable[[list[int], int], list[AlgorithmStep]]

SEARCHING_ALGORITHMS: dict[SearchingAlgorithm, SearchingFunction] = {
    "linear_search": linear_search_steps,
    "binary_search": binary_search_steps,
}

SEARCHING_ALGORITHM_METADATA = [
    {"id": "linear_search", "label": "Linear Search"},
    {"id": "binary_search", "label": "Binary Search"},
]

__all__ = [
    "SEARCHING_ALGORITHMS",
    "SEARCHING_ALGORITHM_METADATA",
    "binary_search_steps",
    "linear_search_steps",
]
