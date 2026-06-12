from collections.abc import Callable

from app.algorithms.sorting.bubble_sort import bubble_sort_steps
from app.algorithms.sorting.cocktail_shaker_sort import cocktail_shaker_sort_steps
from app.algorithms.sorting.comb_sort import comb_sort_steps
from app.algorithms.sorting.counting_sort import counting_sort_steps
from app.algorithms.sorting.gnome_sort import gnome_sort_steps
from app.algorithms.sorting.heap_sort import heap_sort_steps
from app.algorithms.sorting.insertion_sort import insertion_sort_steps
from app.algorithms.sorting.merge_sort import merge_sort_steps
from app.algorithms.sorting.quick_sort import quick_sort_steps
from app.algorithms.sorting.selection_sort import selection_sort_steps
from app.algorithms.sorting.shell_sort import shell_sort_steps
from app.algorithms.types import AlgorithmStep, SortingAlgorithm


SortingFunction = Callable[[list[int]], list[AlgorithmStep]]

SORTING_ALGORITHMS: dict[SortingAlgorithm, SortingFunction] = {
    "bubble_sort": bubble_sort_steps,
    "selection_sort": selection_sort_steps,
    "insertion_sort": insertion_sort_steps,
    "merge_sort": merge_sort_steps,
    "quick_sort": quick_sort_steps,
    "heap_sort": heap_sort_steps,
    "shell_sort": shell_sort_steps,
    "cocktail_shaker_sort": cocktail_shaker_sort_steps,
    "gnome_sort": gnome_sort_steps,
    "comb_sort": comb_sort_steps,
    "counting_sort": counting_sort_steps,
}

__all__ = [
    "SORTING_ALGORITHMS",
    "bubble_sort_steps",
    "cocktail_shaker_sort_steps",
    "comb_sort_steps",
    "counting_sort_steps",
    "gnome_sort_steps",
    "heap_sort_steps",
    "insertion_sort_steps",
    "merge_sort_steps",
    "quick_sort_steps",
    "selection_sort_steps",
    "shell_sort_steps",
]
