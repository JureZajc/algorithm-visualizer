from collections.abc import Callable

from app.algorithms.backtracking.maze_solver import maze_solver_steps
from app.algorithms.backtracking.n_queens import n_queens_steps
from app.algorithms.backtracking.permutations import permutations_steps
from app.algorithms.backtracking.subsets import subsets_steps
from app.algorithms.backtracking.types import (
    BacktrackingAlgorithm,
    BacktrackingStep,
)


BacktrackingFunction = Callable[..., list[BacktrackingStep]]

BACKTRACKING_ALGORITHMS: dict[
    BacktrackingAlgorithm,
    BacktrackingFunction,
] = {
    "n_queens": n_queens_steps,
    "maze_solver": maze_solver_steps,
    "permutations": permutations_steps,
    "subsets": subsets_steps,
}

__all__ = [
    "BACKTRACKING_ALGORITHMS",
    "maze_solver_steps",
    "n_queens_steps",
    "permutations_steps",
    "subsets_steps",
]
