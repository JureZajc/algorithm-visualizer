import { DEFAULT_SUDOKU_BOARD } from "@/lib/backtracking-presets";
import { parseInteger, requireRange } from "@/lib/number-input";
import type {
  BacktrackingAlgorithm,
  BacktrackingCell,
  BacktrackingRequest,
  GridPosition,
  MazePreset,
  SudokuBoard,
  SudokuCell,
} from "@/types/backtracking";
import { CATALOG_LIMITS } from "@/types/generated/catalog";

const LIMITS = CATALOG_LIMITS.backtracking;

export interface BacktrackingForm {
  size: string;
  rows: string;
  cols: string;
  preset: MazePreset;
  values: string;
}

export const INITIAL_FORM: BacktrackingForm = {
  size: "4",
  rows: "7",
  cols: "7",
  preset: "classic",
  values: "A, B, C",
};

export const DEFAULT_FIELDS: Record<
  BacktrackingAlgorithm,
  Partial<BacktrackingForm>
> = {
  n_queens: { size: "4" },
  maze_solver: { rows: "7", cols: "7", preset: "classic" },
  permutations: { values: "A, B, C" },
  subsets: { values: "A, B, C" },
  sudoku_solver: {},
};

export function parseValueList(rawValue: string, label: string, maximum: number) {
  const parts = rawValue.split(",").map((part) => part.trim());
  if (parts.length === 0 || parts.every((part) => part.length === 0)) {
    throw new Error(`${label} must include at least one value.`);
  }
  if (parts.some((part) => part.length === 0)) {
    throw new Error(`${label} must not include empty values.`);
  }
  if (parts.length > maximum) {
    throw new Error(`${label} can include at most ${maximum} values.`);
  }
  return parts;
}

export function createRequest(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
  mazeGrid?: BacktrackingCell[][],
  sudokuBoard?: SudokuBoard,
): BacktrackingRequest {
  if (algorithm === "n_queens") {
    return {
      algorithm,
      size: requireRange(
        parseInteger(form.size, "Board size"),
        "Board size",
        LIMITS.n_queens.size.minimum,
        LIMITS.n_queens.size.maximum,
      ),
    };
  }

  if (algorithm === "permutations") {
    return {
      algorithm,
      values: parseValueList(
        form.values,
        "Values",
        LIMITS.permutations.values.max_items,
      ),
    };
  }

  if (algorithm === "subsets") {
    return {
      algorithm,
      values: parseValueList(form.values, "Values", LIMITS.subsets.values.max_items),
    };
  }

  if (algorithm === "sudoku_solver") {
    const board = sudokuBoard ?? cloneSudokuBoard(DEFAULT_SUDOKU_BOARD);
    const validation = validateSudokuBoard(board);
    if (validation) throw new Error(validation);
    return {
      algorithm,
      board: cloneSudokuBoard(board),
    };
  }

  const request: BacktrackingRequest = {
    algorithm,
    rows: requireRange(
      parseInteger(form.rows, "Rows"),
      "Rows",
      LIMITS.maze_solver.rows.minimum,
      LIMITS.maze_solver.rows.maximum,
    ),
    cols: requireRange(
      parseInteger(form.cols, "Columns"),
      "Columns",
      LIMITS.maze_solver.cols.minimum,
      LIMITS.maze_solver.cols.maximum,
    ),
    preset: form.preset,
  };

  if (mazeGrid) {
    const validation = validateMazeGrid(mazeGrid);
    if (validation) throw new Error(validation);
    request.grid = mazeGrid.map((row) => row.slice());
    request.start = findCell(mazeGrid, "start") as GridPosition;
    request.end = findCell(mazeGrid, "end") as GridPosition;
  }

  return request;
}

export function createDefaultRequest(algorithm: BacktrackingAlgorithm) {
  return createRequest(algorithm, {
    ...INITIAL_FORM,
    ...DEFAULT_FIELDS[algorithm],
  }, undefined, algorithm === "sudoku_solver" ? DEFAULT_SUDOKU_BOARD : undefined);
}

export function safeRequest(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
) {
  try {
    return createRequest(algorithm, form);
  } catch {
    return createDefaultRequest(algorithm);
  }
}

export function formFieldsFromRequest(
  request: Omit<BacktrackingRequest, "algorithm">,
): Partial<BacktrackingForm> {
  return {
    ...(request.size !== undefined ? { size: String(request.size) } : {}),
    ...(request.rows !== undefined ? { rows: String(request.rows) } : {}),
    ...(request.cols !== undefined ? { cols: String(request.cols) } : {}),
    ...(request.preset !== undefined ? { preset: request.preset } : {}),
    ...(request.values !== undefined ? { values: request.values.join(", ") } : {}),
  };
}

export function findCell(
  grid: BacktrackingCell[][],
  target: BacktrackingCell,
): GridPosition | null {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].findIndex((cell) => cell === target);
    if (columnIndex !== -1) return [rowIndex, columnIndex];
  }
  return null;
}

export function validateMazeGrid(grid: BacktrackingCell[][]) {
  const start = findCell(grid, "start");
  const end = findCell(grid, "end");

  if (!start) return "Place a Start cell before running Maze Solver.";
  if (!end) return "Place an End cell before running Maze Solver.";
  if (start[0] === end[0] && start[1] === end[1]) {
    return "Start and End must be different cells.";
  }
  return null;
}

export function cloneSudokuBoard(board: SudokuBoard): SudokuBoard {
  return board.map((row) => row.slice()) as SudokuBoard;
}

export function isSudokuCell(value: string): value is SudokuCell {
  return value === "." || /^[1-9]$/.test(value);
}

export function validateSudokuBoard(board: SudokuBoard) {
  if (board.length !== 9) return "Sudoku board must contain exactly 9 rows.";
  for (let rowIndex = 0; rowIndex < board.length; rowIndex += 1) {
    if (board[rowIndex].length !== 9) {
      return `Sudoku row ${rowIndex + 1} must contain exactly 9 cells.`;
    }
    for (let columnIndex = 0; columnIndex < board[rowIndex].length; columnIndex += 1) {
      if (!isSudokuCell(board[rowIndex][columnIndex])) {
        return `Sudoku cell (${rowIndex + 1}, ${columnIndex + 1}) must be 1-9 or blank.`;
      }
    }
  }

  const rowError = validateSudokuUnits(
    Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, column) => board[row][column]),
    ),
    "row",
  );
  if (rowError) return rowError;

  const columnError = validateSudokuUnits(
    Array.from({ length: 9 }, (_, column) =>
      Array.from({ length: 9 }, (_, row) => board[row][column]),
    ),
    "column",
  );
  if (columnError) return columnError;

  const boxes: SudokuCell[][] = [];
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxColumn = 0; boxColumn < 9; boxColumn += 3) {
      const values: SudokuCell[] = [];
      for (let row = boxRow; row < boxRow + 3; row += 1) {
        for (let column = boxColumn; column < boxColumn + 3; column += 1) {
          values.push(board[row][column]);
        }
      }
      boxes.push(values);
    }
  }
  return validateSudokuUnits(boxes, "box");
}

export function validateSudokuUnits(units: SudokuCell[][], label: "row" | "column" | "box") {
  for (let index = 0; index < units.length; index += 1) {
    const seen = new Set<SudokuCell>();
    for (const value of units[index]) {
      if (value === ".") continue;
      if (seen.has(value)) {
        return `Sudoku ${label} ${index + 1} contains duplicate ${value}.`;
      }
      seen.add(value);
    }
  }
  return null;
}

export function validateBacktrackingForm(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
  mazeGrid?: BacktrackingCell[][],
  sudokuBoard?: SudokuBoard,
): Partial<Record<keyof BacktrackingForm | "form", string>> {
  try {
    createRequest(algorithm, form, mazeGrid, sudokuBoard);
    return {};
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "Check the highlighted inputs.";
    const field = backtrackingErrorField(message);
    return field ? { [field]: message } : { form: message };
  }
}

export function backtrackingErrorField(message: string): keyof BacktrackingForm | null {
  if (message.startsWith("Board size")) return "size";
  if (message.startsWith("Rows")) return "rows";
  if (message.startsWith("Columns")) return "cols";
  if (message.startsWith("Values")) return "values";
  return null;
}
