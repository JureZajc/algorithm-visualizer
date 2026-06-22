from collections.abc import Callable

from app.algorithms.dynamic_programming.coin_change import coin_change_steps
from app.algorithms.dynamic_programming.edit_distance import edit_distance_steps
from app.algorithms.dynamic_programming.fibonacci import fibonacci_steps
from app.algorithms.dynamic_programming.knapsack import knapsack_steps
from app.algorithms.dynamic_programming.longest_common_subsequence import lcs_steps
from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingAlgorithm,
    DynamicProgrammingStep,
)
from app.algorithms.dynamic_programming.unique_paths import unique_paths_steps


DynamicProgrammingFunction = Callable[..., list[DynamicProgrammingStep]]

DYNAMIC_PROGRAMMING_ALGORITHMS: dict[
    DynamicProgrammingAlgorithm,
    DynamicProgrammingFunction,
] = {
    "fibonacci": fibonacci_steps,
    "coin_change": coin_change_steps,
    "knapsack": knapsack_steps,
    "lcs": lcs_steps,
    "edit_distance": edit_distance_steps,
    "unique_paths": unique_paths_steps,
}

__all__ = [
    "DYNAMIC_PROGRAMMING_ALGORITHMS",
    "coin_change_steps",
    "edit_distance_steps",
    "fibonacci_steps",
    "knapsack_steps",
    "lcs_steps",
    "unique_paths_steps",
]
