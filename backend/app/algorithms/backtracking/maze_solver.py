from app.algorithms.backtracking.types import (
    BacktrackingResult,
    BacktrackingStep,
    GridPosition,
    MazePreset,
    create_backtracking_step,
)


Direction = tuple[int, int]

DIRECTIONS: tuple[Direction, ...] = (
    (0, 1),
    (1, 0),
    (0, -1),
    (-1, 0),
)


def maze_solver_steps(
    rows: int,
    cols: int,
    preset: MazePreset = "classic",
    grid: list[list[str]] | None = None,
    start: GridPosition | None = None,
    target: GridPosition | None = None,
) -> list[BacktrackingStep]:
    """Solve a deterministic maze with depth-first backtracking."""

    start = start or (0, 0)
    target = target or (rows - 1, cols - 1)
    walls = _walls_from_grid(grid) if grid is not None else _build_walls(rows, cols, preset)
    walls.discard(start)
    walls.discard(target)
    visited: set[GridPosition] = set()
    path: list[GridPosition] = []
    backtracked: set[GridPosition] = set()
    steps: list[BacktrackingStep] = [
        create_backtracking_step(
            "move",
            _build_grid(rows, cols, walls, start, target),
            "Start the maze search at the entrance.",
            active_cell=start,
            pseudocode_line=1,
        )
    ]
    solution: list[GridPosition] = []

    def solve(position: GridPosition) -> bool:
        nonlocal solution

        visited.add(position)
        path.append(position)
        steps.append(
            create_backtracking_step(
                "move",
                _build_grid(
                    rows,
                    cols,
                    walls,
                    start,
                    target,
                    visited=visited,
                    path=path,
                ),
                f"Move to cell ({position[0] + 1}, {position[1] + 1}).",
                active_cell=position,
                related_cells=path[:-1],
                pseudocode_line=3,
            )
        )

        if position == target:
            solution = path.copy()
            result = _create_result(rows, cols, preset, True, solution)
            steps.append(
                create_backtracking_step(
                    "solution_found",
                    _build_grid(
                        rows,
                        cols,
                        walls,
                        start,
                        target,
                        visited=visited,
                        path=path,
                        solution=solution,
                    ),
                    "The exit has been reached.",
                    active_cell=position,
                    related_cells=solution,
                    pseudocode_line=4,
                    result=result,
                )
            )
            return True

        for next_position in _neighbors(position):
            in_bounds = _is_in_bounds(next_position, rows, cols)
            can_visit = (
                in_bounds
                and next_position not in walls
                and next_position not in visited
            )
            steps.append(
                create_backtracking_step(
                    "try",
                    _build_grid(
                        rows,
                        cols,
                        walls,
                        start,
                        target,
                        visited=visited,
                        path=path,
                        active_cell=next_position if in_bounds else None,
                        active_token="attempt" if can_visit else None,
                    ),
                    _describe_try(next_position, rows, cols, walls, visited),
                    active_cell=next_position if in_bounds else None,
                    related_cells=[position],
                    pseudocode_line=5,
                )
            )

            if not can_visit:
                steps.append(
                    create_backtracking_step(
                        "dead_end",
                        _build_grid(
                            rows,
                            cols,
                            walls,
                            start,
                            target,
                            visited=visited,
                            path=path,
                            active_cell=next_position if in_bounds else None,
                            active_token="wall"
                            if in_bounds and next_position in walls
                            else None,
                        ),
                        _describe_dead_end(
                            next_position,
                            rows,
                            cols,
                            walls,
                            visited,
                        ),
                        active_cell=next_position if in_bounds else None,
                        related_cells=[position],
                        pseudocode_line=6,
                    )
                )
                continue

            if solve(next_position):
                return True

        removed = path.pop()
        backtracked.add(removed)
        steps.append(
            create_backtracking_step(
                "remove",
                _build_grid(
                    rows,
                    cols,
                    walls,
                    start,
                    target,
                    visited=visited,
                    path=path,
                    backtracked=backtracked,
                    active_cell=removed,
                    active_token="backtracked",
                ),
                f"Backtrack from cell ({removed[0] + 1}, {removed[1] + 1}).",
                active_cell=removed,
                related_cells=path,
                pseudocode_line=7,
            )
        )
        return False

    solved = solve(start)
    result = _create_result(rows, cols, preset, solved, solution)
    steps.append(
        create_backtracking_step(
            "done",
            _build_grid(
                rows,
                cols,
                walls,
                start,
                target,
                visited=visited,
                path=path,
                backtracked=backtracked,
                solution=solution if solved else None,
            ),
            "Maze search is complete."
            if solved
            else "No route from the entrance to the exit was found.",
            active_cell=target if solved else None,
            related_cells=solution,
            pseudocode_line=8,
            result=result,
        )
    )
    return steps


def _build_walls(rows: int, cols: int, preset: MazePreset) -> set[GridPosition]:
    walls: set[GridPosition] = set()

    if preset == "classic":
        for row in range(1, rows - 1, 2):
            gap = (row * 2 + cols // 3) % cols
            for column in range(cols):
                if column != gap:
                    walls.add((row, column))
    elif preset == "rooms":
        middle_row = rows // 2
        middle_col = cols // 2
        for column in range(cols):
            if column not in {1, cols - 2}:
                walls.add((middle_row, column))
        for row in range(rows):
            if row not in {1, rows - 2}:
                walls.add((row, middle_col))
    else:
        walls = set()

    _clear_guaranteed_route(walls, rows, cols)
    walls.discard((0, 0))
    walls.discard((rows - 1, cols - 1))
    return walls


def _walls_from_grid(grid: list[list[str]]) -> set[GridPosition]:
    walls: set[GridPosition] = set()
    for row_index, row in enumerate(grid):
        for column_index, cell in enumerate(row):
            if cell == "wall":
                walls.add((row_index, column_index))
    return walls


def _clear_guaranteed_route(
    walls: set[GridPosition],
    rows: int,
    cols: int,
) -> None:
    for column in range(cols):
        walls.discard((0, column))
    for row in range(rows):
        walls.discard((row, cols - 1))


def _neighbors(position: GridPosition) -> list[GridPosition]:
    row, column = position
    return [(row + row_delta, column + col_delta) for row_delta, col_delta in DIRECTIONS]


def _is_in_bounds(position: GridPosition, rows: int, cols: int) -> bool:
    row, column = position
    return 0 <= row < rows and 0 <= column < cols


def _build_grid(
    rows: int,
    cols: int,
    walls: set[GridPosition],
    start: GridPosition,
    target: GridPosition,
    *,
    visited: set[GridPosition] | None = None,
    path: list[GridPosition] | None = None,
    backtracked: set[GridPosition] | None = None,
    solution: list[GridPosition] | None = None,
    active_cell: GridPosition | None = None,
    active_token: str | None = None,
) -> list[list[str]]:
    grid = [["empty" for _ in range(cols)] for _ in range(rows)]

    for row, column in walls:
        grid[row][column] = "wall"
    for row, column in visited or set():
        if (row, column) not in walls:
            grid[row][column] = "visited"
    for row, column in backtracked or set():
        if (row, column) not in walls:
            grid[row][column] = "backtracked"
    for row, column in path or []:
        grid[row][column] = "path"
    for row, column in solution or []:
        grid[row][column] = "solution"

    start_row, start_column = start
    target_row, target_column = target
    grid[start_row][start_column] = "start"
    grid[target_row][target_column] = "end"

    if active_cell is not None and active_token is not None:
        active_row, active_column = active_cell
        grid[active_row][active_column] = active_token

    return grid


def _describe_try(
    position: GridPosition,
    rows: int,
    cols: int,
    walls: set[GridPosition],
    visited: set[GridPosition],
) -> str:
    if not _is_in_bounds(position, rows, cols):
        return "Try a neighboring cell outside the maze boundary."
    if position in walls:
        return "Try a neighboring cell, but it is blocked by a wall."
    if position in visited:
        return "Try a neighboring cell, but it was already visited."
    return f"Try cell ({position[0] + 1}, {position[1] + 1})."


def _describe_dead_end(
    position: GridPosition,
    rows: int,
    cols: int,
    walls: set[GridPosition],
    visited: set[GridPosition],
) -> str:
    if not _is_in_bounds(position, rows, cols):
        return "The maze boundary blocks this direction."
    if position in walls:
        return "A wall blocks this direction."
    if position in visited:
        return "This cell was already explored."
    return "This branch cannot continue."


def _create_result(
    rows: int,
    cols: int,
    preset: MazePreset,
    solved: bool,
    path: list[GridPosition],
) -> BacktrackingResult:
    return {
        "solved": solved,
        "rows": rows,
        "cols": cols,
        "preset": preset,
        "path": [list(position) for position in path],
    }
