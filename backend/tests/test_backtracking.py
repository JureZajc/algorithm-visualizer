from collections.abc import Callable
from copy import deepcopy

import pytest

from app.algorithms.backtracking import (
    maze_solver_steps,
    n_queens_steps,
    permutations_steps,
    subsets_steps,
    sudoku_solver_steps,
)
from app.algorithms.backtracking.sudoku_solver import (
    DEFAULT_SUDOKU_BOARD,
    MAX_SUDOKU_STEPS,
    sudoku_run,
)
from app.algorithms.backtracking.types import BacktrackingStep
from app.algorithms.metadata import ALGORITHM_METADATA


BacktrackingFunction = Callable[..., list[BacktrackingStep]]

STEP_KEYS = {
    "type",
    "grid",
    "active_cell",
    "related_cells",
    "description",
    "pseudocode_line",
    "result",
}
VALID_STEP_TYPES = {
    "try",
    "choose",
    "unchoose",
    "place",
    "remove",
    "move",
    "dead_end",
    "solution_found",
    "done",
}
PSEUDOCODE_LENGTHS = {item.id: len(item.pseudocode) for item in ALGORITHM_METADATA}

SUDOKU_SOLUTION = [
    ["5", "3", "4", "6", "7", "8", "9", "1", "2"],
    ["6", "7", "2", "1", "9", "5", "3", "4", "8"],
    ["1", "9", "8", "3", "4", "2", "5", "6", "7"],
    ["8", "5", "9", "7", "6", "1", "4", "2", "3"],
    ["4", "2", "6", "8", "5", "3", "7", "9", "1"],
    ["7", "1", "3", "9", "2", "4", "8", "5", "6"],
    ["9", "6", "1", "5", "3", "7", "2", "8", "4"],
    ["2", "8", "7", "4", "1", "9", "6", "3", "5"],
    ["3", "4", "5", "2", "8", "6", "1", "7", "9"],
]

SUDOKU_PUZZLE = [
    ["5", "3", "4", "6", "7", "8", "9", ".", "."],
    ["6", "7", "2", "1", "9", "5", "3", "4", "8"],
    ["1", "9", "8", "3", "4", "2", "5", "6", "7"],
    ["8", "5", "9", "7", "6", "1", "4", "2", "3"],
    ["4", "2", "6", "8", "5", "3", "7", "9", "1"],
    ["7", "1", "3", "9", "2", "4", "8", "5", "6"],
    ["9", "6", "1", "5", "3", "7", "2", "8", "4"],
    ["2", "8", "7", "4", "1", "9", "6", "3", "5"],
    ["3", "4", "5", "2", "8", "6", "1", "7", "9"],
]

BACKTRACKING_CASES: list[
    tuple[str, BacktrackingFunction, dict[str, object]]
] = [
    ("n_queens", n_queens_steps, {"size": 4}),
    ("maze_solver", maze_solver_steps, {"rows": 5, "cols": 6, "preset": "classic"}),
    ("permutations", permutations_steps, {"values": ["A", "B", "C"]}),
    ("subsets", subsets_steps, {"values": ["A", "B", "C"]}),
    (
        "sudoku_solver",
        sudoku_solver_steps,
        {"board": SUDOKU_PUZZLE, "max_steps": 100},
    ),
]


@pytest.mark.parametrize(
    ("algorithm_id", "algorithm", "kwargs"),
    BACKTRACKING_CASES,
)
def test_backtracking_algorithm_contract(
    algorithm_id: str,
    algorithm: BacktrackingFunction,
    kwargs: dict[str, object],
) -> None:
    original_kwargs = deepcopy(kwargs)

    steps = algorithm(**kwargs)

    assert kwargs == original_kwargs
    assert steps
    assert steps[-1]["type"] == "done"
    assert steps[-1]["result"] is not None

    for step in steps:
        assert set(step) == STEP_KEYS
        assert step["type"] in VALID_STEP_TYPES
        assert isinstance(step["grid"], list)
        assert all(isinstance(row, list) for row in step["grid"])
        assert step["active_cell"] is None or len(step["active_cell"]) == 2
        assert all(len(cell) == 2 for cell in step["related_cells"])
        assert step["description"]
        assert step["pseudocode_line"] is not None
        assert 1 <= step["pseudocode_line"] <= PSEUDOCODE_LENGTHS[algorithm_id]


@pytest.mark.parametrize(
    ("_algorithm_id", "algorithm", "kwargs"),
    BACKTRACKING_CASES,
)
def test_backtracking_step_grids_are_independent_copies(
    _algorithm_id: str,
    algorithm: BacktrackingFunction,
    kwargs: dict[str, object],
) -> None:
    steps = algorithm(**deepcopy(kwargs))

    assert len({id(step["grid"]) for step in steps}) == len(steps)
    row_count = sum(len(step["grid"]) for step in steps)
    assert len({id(row) for step in steps for row in step["grid"]}) == row_count


def test_n_queens_finds_first_four_queen_solution() -> None:
    steps = n_queens_steps(4)
    result = steps[-1]["result"]

    assert result is not None
    assert result["solved"] is True
    assert result["size"] == 4
    solution = result["solution"]
    assert solution == [[0, 1], [1, 3], [2, 0], [3, 2]]
    assert any(step["type"] == "remove" for step in steps)


def test_n_queens_reports_unsolved_board() -> None:
    steps = n_queens_steps(3)
    result = steps[-1]["result"]

    assert result is not None
    assert result == {"solved": False, "size": 3, "solution": []}


def test_maze_solver_returns_path_from_start_to_exit() -> None:
    steps = maze_solver_steps(5, 6, "rooms")
    result = steps[-1]["result"]

    assert result is not None
    assert result["solved"] is True
    assert result["rows"] == 5
    assert result["cols"] == 6
    assert result["preset"] == "rooms"
    path = result["path"]
    assert path[0] == [0, 0]
    assert path[-1] == [4, 5]
    assert any(step["type"] == "solution_found" for step in steps)


def test_maze_solver_supports_custom_start_end_and_walls() -> None:
    grid = [
        ["empty", "wall", "empty", "empty"],
        ["start", "empty", "empty", "wall"],
        ["wall", "empty", "end", "empty"],
    ]

    steps = maze_solver_steps(
        3,
        4,
        "classic",
        grid=grid,
        start=(1, 0),
        target=(2, 2),
    )
    result = steps[-1]["result"]

    assert result is not None
    assert result["solved"] is True
    assert result["path"] == [[1, 0], [1, 1], [1, 2], [2, 2]]


def test_permutations_generates_all_orderings() -> None:
    steps = permutations_steps(["A", "B", "C"])
    result = steps[-1]["result"]

    assert result is not None
    assert result["values"] == ["A", "B", "C"]
    assert result["count"] == 6
    assert result["permutations"] == [
        ["A", "B", "C"],
        ["A", "C", "B"],
        ["B", "A", "C"],
        ["B", "C", "A"],
        ["C", "A", "B"],
        ["C", "B", "A"],
    ]
    assert any(step["type"] == "choose" for step in steps)
    assert any(step["type"] == "unchoose" for step in steps)


def test_subsets_generates_power_set() -> None:
    steps = subsets_steps(["A", "B", "C"])
    result = steps[-1]["result"]

    assert result is not None
    assert result["values"] == ["A", "B", "C"]
    assert result["count"] == 8
    subsets = result["subsets"]
    assert [] in subsets
    assert ["A", "B", "C"] in subsets
    assert any(step["type"] == "choose" for step in steps)
    assert any(step["type"] == "unchoose" for step in steps)


def test_sudoku_solver_solves_valid_puzzle() -> None:
    steps = sudoku_solver_steps(SUDOKU_PUZZLE)
    result = steps[-1]["result"]

    assert result is not None
    assert result["solved"] is True
    assert result["solution"] == SUDOKU_SOLUTION
    assert steps[-1]["grid"] == SUDOKU_SOLUTION
    assert any(step["type"] == "place" for step in steps)
    assert any(step["type"] == "solution_found" for step in steps)


def test_sudoku_solver_rejects_invalid_board_shape() -> None:
    with pytest.raises(ValueError, match="exactly 9 rows"):
        sudoku_solver_steps([["."] * 9 for _ in range(8)])

    with pytest.raises(ValueError, match="row 1"):
        sudoku_solver_steps([["."] * 8, *(["."] * 9 for _ in range(8))])


def test_sudoku_solver_rejects_invalid_values() -> None:
    board = deepcopy(SUDOKU_PUZZLE)
    board[0][0] = "X"

    with pytest.raises(ValueError, match="must be 1-9"):
        sudoku_solver_steps(board)


def test_sudoku_solver_rejects_duplicate_givens() -> None:
    board = deepcopy(SUDOKU_PUZZLE)
    board[0][2] = "5"

    with pytest.raises(ValueError, match="duplicate value '5' in row 1"):
        sudoku_solver_steps(board)


def test_sudoku_solver_can_limit_generated_steps() -> None:
    with pytest.raises(ValueError, match="step limit"):
        sudoku_solver_steps(SUDOKU_PUZZLE, max_steps=1)


CLASSIC_SUDOKU_PUZZLE: list[list[int | str]] = [
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


def _count_sudoku_solutions(board: list[list[str]], limit: int = 2) -> int:
    for row in range(9):
        for column in range(9):
            if board[row][column] != ".":
                continue
            found = 0
            for digit in "123456789":
                box_row, box_column = row // 3 * 3, column // 3 * 3
                if (
                    digit in board[row]
                    or any(board[index][column] == digit for index in range(9))
                    or any(
                        board[box_row + offset // 3][box_column + offset % 3] == digit
                        for offset in range(9)
                    )
                ):
                    continue
                board[row][column] = digit
                found += _count_sudoku_solutions(board, limit - found)
                board[row][column] = "."
                if found >= limit:
                    break
            return found
    return 1


def test_sudoku_step_limit_is_ten_thousand() -> None:
    assert MAX_SUDOKU_STEPS == 10_000


def test_default_sudoku_board_has_one_solution_and_a_short_run() -> None:
    board = [[str(cell) for cell in row] for row in DEFAULT_SUDOKU_BOARD]
    steps = sudoku_solver_steps()

    assert _count_sudoku_solutions(board) == 1
    assert len(steps) < 2_000
    assert steps[-1]["result"] is not None
    assert steps[-1]["result"]["solved"] is True
    assert any(step["type"] == "remove" for step in steps)


def test_former_classic_sudoku_preset_exceeds_the_step_limit() -> None:
    with pytest.raises(ValueError, match="step limit of 10000"):
        sudoku_solver_steps(CLASSIC_SUDOKU_PUZZLE)


def test_sudoku_run_holds_the_board_data_shared_by_every_step() -> None:
    board: list[list[int | str]] = [list(row) for row in SUDOKU_PUZZLE]
    board[0][7] = 0
    board[0][6] = 9

    run = sudoku_run(board)

    assert run["initial_board"][0] == ["5", "3", "4", "6", "7", "8", "9", ".", "."]
    assert run["initial_board"][1:] == SUDOKU_PUZZLE[1:]
    assert len(run["fixed_cells"]) == 79
    assert (0, 6) in run["fixed_cells"]
    assert (0, 7) not in run["fixed_cells"]


def test_sudoku_run_rejects_the_same_boards_as_the_solver() -> None:
    board: list[list[int | str]] = [list(row) for row in SUDOKU_PUZZLE]
    board[0][2] = "5"

    with pytest.raises(ValueError, match="duplicate value '5' in row 1"):
        sudoku_run(board)


def test_sudoku_steps_do_not_repeat_run_data() -> None:
    steps = sudoku_solver_steps(DEFAULT_SUDOKU_BOARD)

    for step in steps:
        result = step["result"]
        assert result is not None
        assert set(result) == {"solved", "solution", "tried_value", "conflicts"}


def test_sudoku_steps_replay_from_the_run_board() -> None:
    run = sudoku_run(DEFAULT_SUDOKU_BOARD)
    steps = sudoku_solver_steps(DEFAULT_SUDOKU_BOARD)
    board = [row.copy() for row in run["initial_board"]]

    assert steps[0]["grid"] == run["initial_board"]
    for step in steps:
        result = step["result"]
        assert result is not None
        if step["type"] in {"place", "remove"}:
            assert step["active_cell"] is not None
            row, column = step["active_cell"]
            assert (row, column) not in run["fixed_cells"]
            tried_value = result["tried_value"]
            assert isinstance(tried_value, str)
            board[row][column] = tried_value if step["type"] == "place" else "."
        assert step["grid"] == board


LIST_CASES = [
    (permutations_steps, ["A", "B", "C", "D"], "permutations"),
    (subsets_steps, ["A", "B", "C", "D"], "subsets"),
]


@pytest.mark.parametrize(("algorithm", "values", "final_key"), LIST_CASES)
def test_list_steps_carry_only_the_result_they_add(
    algorithm: BacktrackingFunction,
    values: list[str],
    final_key: str,
) -> None:
    steps = algorithm(values)

    for step in steps[:-1]:
        result = step["result"]
        assert result is not None
        assert "generated" not in result
        if step["type"] == "solution_found":
            assert result["generated_item"] == result["partial"]
        else:
            assert "generated_item" not in result


@pytest.mark.parametrize(("algorithm", "values", "final_key"), LIST_CASES)
def test_list_results_rebuilt_from_any_step_match_the_final_list(
    algorithm: BacktrackingFunction,
    values: list[str],
    final_key: str,
) -> None:
    steps = algorithm(values)
    final_result = steps[-1]["result"]
    assert final_result is not None

    def rebuilt_through(index: int) -> list[object]:
        rebuilt: list[object] = []
        for step in steps[: index + 1]:
            result = step["result"]
            if step["type"] == "solution_found" and result is not None:
                rebuilt.append(result["generated_item"])
        return rebuilt

    # Seeking to any index gives what playing through to it accumulated.
    played: list[object] = []
    for index, step in enumerate(steps[:-1]):
        result = step["result"]
        assert result is not None
        if step["type"] == "solution_found":
            played.append(result["generated_item"])
        assert rebuilt_through(index) == played
        assert len(played) == result["generated_count"]

    assert rebuilt_through(len(steps) - 1) == final_result[final_key]
    assert len(played) == final_result["count"]
