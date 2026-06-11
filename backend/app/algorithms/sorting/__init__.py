from collections.abc import Callable

from app.algorithms.sorting.bubble_sort import bubble_sort_steps
from app.algorithms.sorting.insertion_sort import insertion_sort_steps
from app.algorithms.sorting.merge_sort import merge_sort_steps
from app.algorithms.sorting.quick_sort import quick_sort_steps
from app.algorithms.sorting.selection_sort import selection_sort_steps
from app.algorithms.types import AlgorithmStep, SortingAlgorithm


SortingFunction = Callable[[list[int]], list[AlgorithmStep]]

SORTING_ALGORITHMS: dict[SortingAlgorithm, SortingFunction] = {
    "bubble_sort": bubble_sort_steps,
    "selection_sort": selection_sort_steps,
    "insertion_sort": insertion_sort_steps,
    "merge_sort": merge_sort_steps,
    "quick_sort": quick_sort_steps,
}

__all__ = [
    "SORTING_ALGORITHMS",
    "bubble_sort_steps",
    "insertion_sort_steps",
    "merge_sort_steps",
    "quick_sort_steps",
    "selection_sort_steps",
]
