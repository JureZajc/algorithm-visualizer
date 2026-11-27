import { describe, expect, it } from "vitest";
import {
  backtrackingErrorField,
  cloneSudokuBoard,
  createDefaultRequest,
  createRequest,
  DEFAULT_FIELDS,
  findCell,
  formFieldsFromRequest,
  INITIAL_FORM,
  isSudokuCell,
  parseValueList,
  safeRequest,
  validateBacktrackingForm,
  validateMazeGrid,
  validateSudokuBoard,
  type BacktrackingForm,
} from "@/lib/backtracking-input";
import { BACKTRACKING_PRESETS, DEFAULT_SUDOKU_BOARD } from "@/lib/backtracking-presets";
import type { BacktrackingAlgorithm, BacktrackingCell, SudokuBoard, SudokuCell } from "@/types/backtracking";

const ALGORITHMS = Object.keys(DEFAULT_FIELDS) as BacktrackingAlgorithm[];

function form(overrides: Partial<BacktrackingForm> = {}): BacktrackingForm {
  return { ...INITIAL_FORM, ...overrides };
}

function maze(rows: string[]): BacktrackingCell[][] {
  const cells: Record<string, BacktrackingCell> = { S: "start", E: "end", "#": "wall", ".": "empty" };
  return rows.map((row) => row.split("").map((cell) => cells[cell]));
}

function sudoku(placements: [number, number, SudokuCell][] = []): SudokuBoard {
  const board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => "." as SudokuCell));
  for (const [row, column, value] of placements) board[row][column] = value;
  return board;
}

describe("backtracking requests", () => {
  it("builds N-Queens, permutations, subsets, and maze requests from the form", () => {
    expect(createRequest("n_queens", form({ size: " 6 " }))).toEqual({ algorithm: "n_queens", size: 6 });
    expect(createRequest("permutations", form({ values: "1, 2, 3, 4, 5, 6" }))).toEqual({ algorithm: "permutations", values: ["1", "2", "3", "4", "5", "6"] });
    expect(createRequest("subsets", form({ values: " red ,green" }))).toEqual({ algorithm: "subsets", values: ["red", "green"] });
    expect(createRequest("maze_solver", form({ rows: "9", cols: "15", preset: "rooms" }))).toEqual({ algorithm: "maze_solver", rows: 9, cols: 15, preset: "rooms" });
  });

  it("parses comma-separated value lists up to a maximum", () => {
    expect(parseValueList("A", "Values", 1)).toEqual(["A"]);
    expect(() => parseValueList("", "Values", 6)).toThrow("Values must include at least one value.");
    expect(() => parseValueList(" , ", "Values", 6)).toThrow("Values must include at least one value.");
    expect(() => parseValueList("A,,B", "Values", 6)).toThrow("Values must not include empty values.");
    expect(() => parseValueList("A, B,", "Values", 6)).toThrow("Values must not include empty values.");
    expect(() => parseValueList("A, B, C", "Values", 2)).toThrow("Values can include at most 2 values.");
  });

  it.each([
    ["n_queens", { size: "0" }, "Board size must be between 1 and 10."],
    ["n_queens", { size: "11" }, "Board size must be between 1 and 10."],
    ["n_queens", { size: "four" }, "Board size must be a whole number."],
    ["permutations", { values: "A, B, C, D, E, F, G" }, "Values can include at most 6 values."],
    ["subsets", { values: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11" }, "Values can include at most 10 values."],
    ["maze_solver", { rows: "1" }, "Rows must be between 2 and 15."],
    ["maze_solver", { cols: "16" }, "Columns must be between 2 and 15."],
  ] as const)("rejects invalid %s input %j", (algorithm, overrides, message) => {
    expect(() => createRequest(algorithm, form(overrides))).toThrow(message);
  });

  it("sends an edited maze with copies of its grid and start and end cells", () => {
    const grid = maze(["S.#", "#..", "..E"]);
    const request = createRequest("maze_solver", form({ rows: "3", cols: "3" }), grid);
    expect(request).toEqual({ algorithm: "maze_solver", rows: 3, cols: 3, preset: "classic", grid, start: [0, 0], end: [2, 2] });
    expect(request.grid).not.toBe(grid);
    expect(request.grid?.[0]).not.toBe(grid[0]);
  });

  it("requires a maze to have both a start and an end cell", () => {
    expect(findCell(maze(["..", ".E"]), "end")).toEqual([1, 1]);
    expect(findCell(maze(["..", ".E"]), "start")).toBeNull();
    expect(validateMazeGrid(maze(["S.", ".E"]))).toBeNull();
    expect(validateMazeGrid(maze(["..", ".E"]))).toBe("Place a Start cell before running Maze Solver.");
    expect(validateMazeGrid(maze(["S.", ".."]))).toBe("Place an End cell before running Maze Solver.");
    expect(() => createRequest("maze_solver", form(), maze(["S.", ".."]))).toThrow("Place an End cell before running Maze Solver.");
  });

  it("sends a copy of the Sudoku board, using the default puzzle when none is given", () => {
    const board = sudoku([[0, 0, "5"]]);
    const request = createRequest("sudoku_solver", form(), undefined, board);
    expect(request).toEqual({ algorithm: "sudoku_solver", board });
    expect(request.board).not.toBe(board);
    expect(createRequest("sudoku_solver", form())).toEqual({ algorithm: "sudoku_solver", board: DEFAULT_SUDOKU_BOARD });
  });

  it("finds the first invalid shape, cell, or duplicate in a Sudoku board", () => {
    expect(validateSudokuBoard(DEFAULT_SUDOKU_BOARD)).toBeNull();
    expect(validateSudokuBoard(sudoku())).toBeNull();
    expect(validateSudokuBoard(sudoku().slice(0, 8))).toBe("Sudoku board must contain exactly 9 rows.");
    const shortRow = sudoku();
    shortRow[1] = shortRow[1].slice(0, 8);
    expect(validateSudokuBoard(shortRow)).toBe("Sudoku row 2 must contain exactly 9 cells.");
    const zero = sudoku();
    (zero[0] as string[])[2] = "0";
    expect(validateSudokuBoard(zero)).toBe("Sudoku cell (1, 3) must be 1-9 or blank.");
    expect(validateSudokuBoard(sudoku([[0, 0, "3"], [0, 5, "3"]]))).toBe("Sudoku row 1 contains duplicate 3.");
    expect(validateSudokuBoard(sudoku([[0, 0, "2"], [5, 0, "2"]]))).toBe("Sudoku column 1 contains duplicate 2.");
    expect(validateSudokuBoard(sudoku([[3, 3, "1"], [4, 4, "1"]]))).toBe("Sudoku box 5 contains duplicate 1.");
    expect(() => createRequest("sudoku_solver", form(), undefined, sudoku([[8, 0, "9"], [8, 8, "9"]]))).toThrow("Sudoku row 9 contains duplicate 9.");
  });

  it("accepts only blanks and the digits 1 to 9 as Sudoku cells", () => {
    expect([".", "1", "9"].every(isSudokuCell)).toBe(true);
    expect(["0", "10", "a", "", " "].some(isSudokuCell)).toBe(false);
  });

  it("clones a Sudoku board row by row", () => {
    const copy = cloneSudokuBoard(DEFAULT_SUDOKU_BOARD);
    expect(copy).toEqual(DEFAULT_SUDOKU_BOARD);
    expect(copy).not.toBe(DEFAULT_SUDOKU_BOARD);
    expect(copy.every((row, index) => row !== DEFAULT_SUDOKU_BOARD[index])).toBe(true);
  });

  it("maps validation errors to the field that caused them", () => {
    expect(validateBacktrackingForm("n_queens", form())).toEqual({});
    expect(validateBacktrackingForm("n_queens", form({ size: "12" }))).toEqual({ size: "Board size must be between 1 and 10." });
    expect(validateBacktrackingForm("maze_solver", form({ rows: "x" }))).toEqual({ rows: "Rows must be a whole number." });
    expect(validateBacktrackingForm("maze_solver", form({ cols: "1" }))).toEqual({ cols: "Columns must be between 2 and 15." });
    expect(validateBacktrackingForm("subsets", form({ values: "" }))).toEqual({ values: "Values must include at least one value." });
    expect(validateBacktrackingForm("maze_solver", form(), maze(["S.", ".."]))).toEqual({ form: "Place an End cell before running Maze Solver." });
    expect(validateBacktrackingForm("sudoku_solver", form(), undefined, sudoku([[0, 0, "4"], [0, 1, "4"]]))).toEqual({ form: "Sudoku row 1 contains duplicate 4." });
    expect(backtrackingErrorField("Sudoku row 1 contains duplicate 4.")).toBeNull();
  });

  it("falls back to the default request while the form is invalid", () => {
    for (const algorithm of ALGORITHMS) {
      expect(() => createDefaultRequest(algorithm)).not.toThrow();
    }
    expect(safeRequest("n_queens", form({ size: "99" }))).toEqual({ algorithm: "n_queens", size: 4 });
    expect(safeRequest("maze_solver", form({ rows: "1", cols: "9" }))).toEqual({ algorithm: "maze_solver", rows: 7, cols: 7, preset: "classic" });
  });

  it("round-trips every preset through the form", () => {
    for (const preset of BACKTRACKING_PRESETS) {
      const fields = formFieldsFromRequest(preset.request);
      expect(createRequest(preset.algorithm, form(fields), undefined, preset.request.board)).toEqual({ algorithm: preset.algorithm, ...preset.request });
    }
  });
});
