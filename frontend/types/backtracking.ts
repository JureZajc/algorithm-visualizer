import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

/** A request model's fields other than `algorithm`, each optional. */
type OptionalFields<Model> = Partial<Omit<Model, "algorithm">>;

export type BacktrackingResponse =
  | Schemas["NQueensResponse"]
  | Schemas["MazeSolverResponse"]
  | Schemas["PermutationsResponse"]
  | Schemas["SubsetsResponse"]
  | Schemas["SudokuSolverResponse"];
export type BacktrackingStep = BacktrackingResponse["steps"][number];
export type BacktrackingResult = NonNullable<BacktrackingStep["result"]>;

export type NQueensResult = Schemas["NQueensResult"];
export type MazeSolverResult = Schemas["MazeSolverResult"];
export type ListBacktrackingState = Schemas["ListBacktrackingState"];
export type PermutationsResult = Schemas["PermutationsResult"];
export type SubsetsResult = Schemas["SubsetsResult"];
export type SudokuResult = Schemas["SudokuResult"];

/** Sudoku data that every step shares; the API sends it once per run. */
export type SudokuRun = Pick<
  Schemas["SudokuSolverResponse"],
  "initial_board" | "fixed_cells"
>;

export type BacktrackingAlgorithm = BacktrackingResponse["algorithm"];
export type BacktrackingStepType = BacktrackingStep["type"];
export type MazePreset = MazeSolverResult["preset"];
export type GridPosition = MazeSolverResult["path"][number];

type MazeGridCell = NonNullable<Schemas["MazeSolverRequest"]["grid"]>[number][number];

/**
 * A cell token in a maze or N-Queens grid. The API types step grids as plain
 * strings, so the N-Queens tokens are listed here.
 */
export type BacktrackingCell = MazeGridCell | "queen" | "attempt" | "conflict";
export type MazeTool = "empty" | "wall" | "start" | "end";

/**
 * A Sudoku cell as the editor holds it, with "." for an empty cell. The API
 * accepts any digit string and returns plain strings.
 */
export type SudokuCell = "." | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SudokuBoard = SudokuCell[][];
export type BacktrackingStepGridCell = BacktrackingCell | SudokuCell;

/**
 * The API has one request model per algorithm and reads only the fields of the
 * selected one. The forms and presets build every algorithm's request through
 * this single type, so it has the fields of all the models. The maze grid and
 * the Sudoku board use the editor's cell types.
 */
export type BacktrackingRequest = {
  algorithm: BacktrackingAlgorithm;
  grid?: BacktrackingCell[][];
  board?: SudokuBoard;
} & OptionalFields<Schemas["NQueensRequest"]> &
  OptionalFields<Omit<Schemas["MazeSolverRequest"], "grid">> &
  OptionalFields<Schemas["PermutationsRequest"]> &
  OptionalFields<Schemas["SubsetsRequest"]> &
  OptionalFields<Omit<Schemas["SudokuSolverRequest"], "board">>;

export const BACKTRACKING_ALGORITHM_LABELS: Record<
  BacktrackingAlgorithm,
  string
> = CATALOG_LABELS.backtracking;

export const MAZE_PRESET_LABELS: Record<MazePreset, string> = {
  classic: "Classic corridors",
  open: "Open grid",
  rooms: "Room divider",
};
