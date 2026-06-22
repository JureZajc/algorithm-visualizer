from app.algorithms.backtracking.types import (
    BacktrackingResult,
    BacktrackingStep,
    GridPosition,
    create_backtracking_step,
)


def n_queens_steps(size: int) -> list[BacktrackingStep]:
    """Find the first N-Queens solution with row-by-row backtracking."""

    queens: list[GridPosition] = []
    steps: list[BacktrackingStep] = [
        create_backtracking_step(
            "try",
            _build_grid(size, queens),
            f"Start with an empty {size} by {size} board.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]
    solution: list[GridPosition] = []

    def solve(row: int) -> bool:
        nonlocal solution

        if row == size:
            solution = queens.copy()
            result = _create_result(size, True, solution)
            steps.append(
                create_backtracking_step(
                    "solution_found",
                    _build_grid(size, queens, solution_cells=solution),
                    "Every row has a safe queen placement.",
                    active_cell=solution[-1] if solution else None,
                    related_cells=solution,
                    pseudocode_line=7,
                    result=result,
                )
            )
            return True

        for column in range(size):
            position = (row, column)
            conflicts = _conflicting_queens(queens, row, column)
            is_safe = not conflicts
            steps.append(
                create_backtracking_step(
                    "try",
                    _build_grid(
                        size,
                        queens,
                        active_cell=position,
                        active_token="attempt" if is_safe else "conflict",
                        related_cells=conflicts,
                    ),
                    f"Try row {row + 1}, column {column + 1}.",
                    active_cell=position,
                    related_cells=conflicts,
                    pseudocode_line=3,
                )
            )

            if conflicts:
                steps.append(
                    create_backtracking_step(
                        "dead_end",
                        _build_grid(
                            size,
                            queens,
                            active_cell=position,
                            active_token="conflict",
                            related_cells=conflicts,
                        ),
                        "This square is attacked by an existing queen.",
                        active_cell=position,
                        related_cells=conflicts,
                        pseudocode_line=4,
                    )
                )
                continue

            queens.append(position)
            steps.append(
                create_backtracking_step(
                    "place",
                    _build_grid(size, queens),
                    f"Place a queen at row {row + 1}, column {column + 1}.",
                    active_cell=position,
                    pseudocode_line=4,
                )
            )

            if solve(row + 1):
                return True

            removed = queens.pop()
            steps.append(
                create_backtracking_step(
                    "remove",
                    _build_grid(
                        size,
                        queens,
                        active_cell=removed,
                        active_token="backtracked",
                    ),
                    f"Remove the queen from row {row + 1}, column {column + 1}.",
                    active_cell=removed,
                    pseudocode_line=6,
                )
            )

        return False

    solved = solve(0)
    result = _create_result(size, solved, solution)
    done_grid = (
        _build_grid(size, solution, solution_cells=solution)
        if solved
        else _build_grid(size, [])
    )
    steps.append(
        create_backtracking_step(
            "done",
            done_grid,
            "N-Queens search is complete."
            if solved
            else f"No solution exists for a {size} by {size} board.",
            active_cell=solution[-1] if solution else None,
            related_cells=solution,
            pseudocode_line=7,
            result=result,
        )
    )
    return steps


def _conflicting_queens(
    queens: list[GridPosition],
    row: int,
    column: int,
) -> list[GridPosition]:
    conflicts: list[GridPosition] = []
    for queen_row, queen_column in queens:
        same_column = queen_column == column
        same_diagonal = abs(queen_row - row) == abs(queen_column - column)
        if same_column or same_diagonal:
            conflicts.append((queen_row, queen_column))
    return conflicts


def _build_grid(
    size: int,
    queens: list[GridPosition],
    *,
    active_cell: GridPosition | None = None,
    active_token: str | None = None,
    related_cells: list[GridPosition] | None = None,
    solution_cells: list[GridPosition] | None = None,
) -> list[list[str]]:
    grid = [["empty" for _ in range(size)] for _ in range(size)]

    for row, column in queens:
        grid[row][column] = "queen"

    for row, column in related_cells or []:
        grid[row][column] = "conflict"

    for row, column in solution_cells or []:
        grid[row][column] = "solution"

    if active_cell is not None and active_token is not None:
        row, column = active_cell
        grid[row][column] = active_token

    return grid


def _create_result(
    size: int,
    solved: bool,
    solution: list[GridPosition],
) -> BacktrackingResult:
    return {
        "solved": solved,
        "size": size,
        "solution": [list(position) for position in solution],
    }
