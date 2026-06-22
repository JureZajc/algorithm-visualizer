export type BacktrackingAlgorithm =
  | "n_queens"
  | "maze_solver"
  | "permutations"
  | "subsets";

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

export type BacktrackingResult =
  | NQueensResult
  | MazeSolverResult
  | ListBacktrackingState
  | PermutationsResult
  | SubsetsResult;

export interface BacktrackingStep {
  type: BacktrackingStepType;
  grid: BacktrackingCell[][];
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
};

export const MAZE_PRESET_LABELS: Record<MazePreset, string> = {
  classic: "Classic corridors",
  open: "Open grid",
  rooms: "Room divider",
};
