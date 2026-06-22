from app.algorithms.backtracking.types import (
    BacktrackingResult,
    BacktrackingStep,
    BacktrackingStepType,
    GridPosition,
    create_backtracking_step,
)


SudokuInputValue = int | str
SudokuInputBoard = list[list[SudokuInputValue]]
SudokuBoard = list[list[str]]

BOARD_SIZE = 9
BOX_SIZE = 3
DIGITS = tuple(str(value) for value in range(1, 10))

DEFAULT_SUDOKU_BOARD: SudokuInputBoard = [
    ["5", "3", ".", ".", "7", ".", ".", ".", "."],
    ["6", ".", ".", "1", "9", "5", ".", ".", "."],
    [".", "9", "8", ".", ".", ".", ".", "6", "."],
    ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
    ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
    ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
    [".", "6", ".", ".", ".", ".", "2", "8", "."],
    [".", ".", ".", "4", "1", "9", ".", ".", "5"],
    [".", ".", ".", ".", "8", ".", ".", "7", "9"],
]


def sudoku_solver_steps(
    board: SudokuInputBoard | None = None,
    max_steps: int | None = None,
) -> list[BacktrackingStep]:
    """Solve a 9x9 Sudoku puzzle with classic recursive backtracking."""

    initial_board = normalize_sudoku_board(board or DEFAULT_SUDOKU_BOARD)
    _validate_givens(initial_board)

    working_board = [row.copy() for row in initial_board]
    fixed_cells = _fixed_cells(initial_board)
    steps: list[BacktrackingStep] = []

    def add_step(step: BacktrackingStep) -> None:
        if max_steps is not None and len(steps) >= max_steps:
            raise ValueError(
                f"Sudoku step limit of {max_steps} was exceeded."
            )
        steps.append(step)

    add_step(
        _create_sudoku_step(
            "try",
            working_board,
            initial_board,
            fixed_cells,
            "Start with the submitted Sudoku puzzle.",
            pseudocode_line=1,
        )
    )
    solution: SudokuBoard = []

    def solve() -> bool:
        nonlocal solution

        empty_cell = _find_empty_cell(working_board)
        if empty_cell is None:
            solution = [row.copy() for row in working_board]
            add_step(
                _create_sudoku_step(
                    "solution_found",
                    working_board,
                    initial_board,
                    fixed_cells,
                    "Every cell is filled without conflicts.",
                    active_cell=(BOARD_SIZE - 1, BOARD_SIZE - 1),
                    related_cells=fixed_cells,
                    pseudocode_line=7,
                    solved=True,
                    solution=solution,
                )
            )
            return True

        row, column = empty_cell
        for digit in DIGITS:
            conflicts = _conflicting_cells(working_board, row, column, digit)
            related_cells = conflicts or _peer_cells(row, column)
            add_step(
                _create_sudoku_step(
                    "try",
                    working_board,
                    initial_board,
                    fixed_cells,
                    f"Try {digit} at row {row + 1}, column {column + 1}.",
                    active_cell=empty_cell,
                    related_cells=related_cells,
                    pseudocode_line=3,
                    tried_value=digit,
                    conflicts=conflicts,
                )
            )

            if conflicts:
                add_step(
                    _create_sudoku_step(
                        "dead_end",
                        working_board,
                        initial_board,
                        fixed_cells,
                        f"{digit} conflicts with an existing value.",
                        active_cell=empty_cell,
                        related_cells=conflicts,
                        pseudocode_line=4,
                        tried_value=digit,
                        conflicts=conflicts,
                    )
                )
                continue

            working_board[row][column] = digit
            add_step(
                _create_sudoku_step(
                    "place",
                    working_board,
                    initial_board,
                    fixed_cells,
                    f"Place {digit} at row {row + 1}, column {column + 1}.",
                    active_cell=empty_cell,
                    related_cells=_peer_cells(row, column),
                    pseudocode_line=5,
                    tried_value=digit,
                )
            )

            if solve():
                return True

            working_board[row][column] = "."
            add_step(
                _create_sudoku_step(
                    "remove",
                    working_board,
                    initial_board,
                    fixed_cells,
                    f"Remove {digit} from row {row + 1}, column {column + 1}.",
                    active_cell=empty_cell,
                    related_cells=_peer_cells(row, column),
                    pseudocode_line=6,
                    tried_value=digit,
                )
            )

        return False

    solved = solve()
    add_step(
        _create_sudoku_step(
            "done",
            solution if solved else working_board,
            initial_board,
            fixed_cells,
            "Sudoku puzzle solved." if solved else "No solution exists for this puzzle.",
            active_cell=None,
            related_cells=fixed_cells if solved else [],
            pseudocode_line=8,
            solved=solved,
            solution=solution,
        )
    )
    return steps


def normalize_sudoku_board(board: SudokuInputBoard) -> SudokuBoard:
    """Normalize accepted Sudoku values to digit strings and '.' empties."""

    if len(board) != BOARD_SIZE:
        raise ValueError("Sudoku board must contain exactly 9 rows.")

    normalized: SudokuBoard = []
    for row_index, row in enumerate(board):
        if len(row) != BOARD_SIZE:
            raise ValueError(
                f"Sudoku row {row_index + 1} must contain exactly 9 cells."
            )
        normalized_row: list[str] = []
        for column_index, value in enumerate(row):
            normalized_row.append(_normalize_cell(value, row_index, column_index))
        normalized.append(normalized_row)
    return normalized


def _normalize_cell(value: SudokuInputValue, row: int, column: int) -> str:
    if isinstance(value, int):
        if value == 0:
            return "."
        if 1 <= value <= 9:
            return str(value)
    elif isinstance(value, str):
        stripped = value.strip()
        if stripped in {".", "0"}:
            return "."
        if stripped in DIGITS:
            return stripped
    raise ValueError(
        "Sudoku cell "
        f"({row + 1}, {column + 1}) must be 1-9, 0, or '.'."
    )


def _validate_givens(board: SudokuBoard) -> None:
    for row_index, row in enumerate(board):
        _validate_unit(row, f"row {row_index + 1}")

    for column_index in range(BOARD_SIZE):
        column = [board[row_index][column_index] for row_index in range(BOARD_SIZE)]
        _validate_unit(column, f"column {column_index + 1}")

    for box_row in range(0, BOARD_SIZE, BOX_SIZE):
        for box_column in range(0, BOARD_SIZE, BOX_SIZE):
            cells = [
                board[row][column]
                for row in range(box_row, box_row + BOX_SIZE)
                for column in range(box_column, box_column + BOX_SIZE)
            ]
            box_label = (
                f"box ({box_row // BOX_SIZE + 1}, {box_column // BOX_SIZE + 1})"
            )
            _validate_unit(cells, box_label)


def _validate_unit(values: list[str], label: str) -> None:
    seen: set[str] = set()
    for value in values:
        if value == ".":
            continue
        if value in seen:
            raise ValueError(f"Sudoku puzzle has duplicate value {value!r} in {label}.")
        seen.add(value)


def _find_empty_cell(board: SudokuBoard) -> GridPosition | None:
    for row_index, row in enumerate(board):
        for column_index, value in enumerate(row):
            if value == ".":
                return (row_index, column_index)
    return None


def _conflicting_cells(
    board: SudokuBoard,
    row: int,
    column: int,
    digit: str,
) -> list[GridPosition]:
    conflicts: list[GridPosition] = []
    for candidate in _peer_cells(row, column):
        candidate_row, candidate_column = candidate
        if board[candidate_row][candidate_column] == digit:
            conflicts.append(candidate)
    return conflicts


def _peer_cells(row: int, column: int) -> list[GridPosition]:
    peers: list[GridPosition] = []
    seen: set[GridPosition] = set()

    def add_peer(position: GridPosition) -> None:
        if position != (row, column) and position not in seen:
            seen.add(position)
            peers.append(position)

    for index in range(BOARD_SIZE):
        add_peer((row, index))
        add_peer((index, column))

    box_row = (row // BOX_SIZE) * BOX_SIZE
    box_column = (column // BOX_SIZE) * BOX_SIZE
    for peer_row in range(box_row, box_row + BOX_SIZE):
        for peer_column in range(box_column, box_column + BOX_SIZE):
            add_peer((peer_row, peer_column))

    return peers


def _fixed_cells(board: SudokuBoard) -> list[GridPosition]:
    return [
        (row_index, column_index)
        for row_index, row in enumerate(board)
        for column_index, value in enumerate(row)
        if value != "."
    ]


def _create_sudoku_step(
    step_type: BacktrackingStepType,
    board: SudokuBoard,
    initial_board: SudokuBoard,
    fixed_cells: list[GridPosition],
    description: str,
    *,
    active_cell: GridPosition | None = None,
    related_cells: list[GridPosition] | None = None,
    pseudocode_line: int,
    tried_value: str | None = None,
    conflicts: list[GridPosition] | None = None,
    solved: bool = False,
    solution: SudokuBoard | None = None,
) -> BacktrackingStep:
    result: BacktrackingResult = {
        "solved": solved,
        "board": [row.copy() for row in board],
        "initial_board": [row.copy() for row in initial_board],
        "solution": [row.copy() for row in solution] if solution else [],
        "fixed_cells": [list(position) for position in fixed_cells],
        "tried_value": tried_value,
        "conflicts": [list(position) for position in conflicts or []],
    }
    return create_backtracking_step(
        step_type,
        board,
        description,
        active_cell=active_cell,
        related_cells=related_cells,
        pseudocode_line=pseudocode_line,
        result=result,
    )
