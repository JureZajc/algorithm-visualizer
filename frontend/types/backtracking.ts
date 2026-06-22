export type BacktrackingAlgorithm =
  | "n_queens"
  | "maze_solver"
  | "permutations"
  | "subsets"
  | "sudoku_solver";

export type BacktrackingStepType =
  | "try"
  | "choose"
  | "unchoose"
  | "place"
  | "remove"
  | "move"
  | "dead_end"
  | "solution_found"
  | "done";

export type BacktrackingCell =
  | "empty"
  | "wall"
  | "start"
  | "end"
  | "queen"
  | "attempt"
  | "conflict"
  | "visited"
  | "path"
  | "backtracked"
  | "solution";

export type MazePreset = "classic" | "open" | "rooms";
export type MazeTool = "empty" | "wall" | "start" | "end";
export type GridPosition = [number, number];
export type SudokuCell = "." | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SudokuBoard = SudokuCell[][];
export type BacktrackingStepGridCell = BacktrackingCell | SudokuCell;

export interface NQueensResult {
  solved: boolean;
  size: number;
  solution: GridPosition[];
}

export interface MazeSolverResult {
  solved: boolean;
  rows: number;
  cols: number;
  preset: MazePreset;
  path: GridPosition[];
}

export interface ListBacktrackingState {
  values: string[];
  partial: string[];
  active_item: string | null;
  active_index: number | null;
  depth: number;
  used?: boolean[];
  decision?: string;
  generated: string[][];
  generated_count: number;
}

export interface PermutationsResult {
  values: string[];
  permutations: string[][];
  count: number;
}

export interface SubsetsResult {
  values: string[];
  subsets: string[][];
  count: number;
}

export interface SudokuResult {
  solved: boolean;
  board: SudokuBoard;
  initial_board: SudokuBoard;
  solution: SudokuBoard | [];
  fixed_cells: GridPosition[];
  tried_value: SudokuCell | null;
  conflicts: GridPosition[];
}

export type BacktrackingResult =
  | NQueensResult
  | MazeSolverResult
  | ListBacktrackingState
  | PermutationsResult
  | SubsetsResult
  | SudokuResult;

export interface BacktrackingStep {
  type: BacktrackingStepType;
  grid: BacktrackingStepGridCell[][];
  active_cell: GridPosition | null;
  related_cells: GridPosition[];
  description: string;
  pseudocode_line: number | null;
  result: BacktrackingResult | null;
}

export interface BacktrackingRequest {
  algorithm: BacktrackingAlgorithm;
  size?: number;
  rows?: number;
  cols?: number;
  preset?: MazePreset;
  values?: string[];
  board?: SudokuBoard;
  grid?: BacktrackingCell[][];
  start?: GridPosition;
  end?: GridPosition;
}

export interface BacktrackingResponse {
  algorithm: BacktrackingAlgorithm;
  input: Record<string, unknown>;
  steps: BacktrackingStep[];
  step_count: number;
}

export const BACKTRACKING_ALGORITHM_LABELS: Record<
  BacktrackingAlgorithm,
  string
> = {
  n_queens: "N-Queens",
  maze_solver: "Maze Solver",
  permutations: "Permutations",
  subsets: "Subsets",
  sudoku_solver: "Sudoku Solver",
};

export const MAZE_PRESET_LABELS: Record<MazePreset, string> = {
  classic: "Classic corridors",
  open: "Open grid",
  rooms: "Room divider",
};
