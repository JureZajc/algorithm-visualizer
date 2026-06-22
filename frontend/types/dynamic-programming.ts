export type DynamicProgrammingAlgorithm =
  | "fibonacci"
  | "coin_change"
  | "knapsack"
  | "lcs"
  | "edit_distance"
  | "unique_paths";

export type DynamicProgrammingStepType =
  | "initialize"
  | "compare"
  | "update"
  | "choose"
  | "skip"
  | "done";

export type DynamicProgrammingCell = number | string;
export type TablePosition = [number, number];

export interface DynamicProgrammingStep {
  type: DynamicProgrammingStepType;
  table: DynamicProgrammingCell[][];
  active_cell: TablePosition | null;
  related_cells: TablePosition[];
  description: string;
  pseudocode_line: number | null;
  result: number | string | null;
}

export interface DynamicProgrammingRequest {
  algorithm: DynamicProgrammingAlgorithm;
  n?: number;
  coins?: number[];
  amount?: number;
  weights?: number[];
  values?: number[];
  capacity?: number;
  text_a?: string;
  text_b?: string;
  rows?: number;
  cols?: number;
}

export interface DynamicProgrammingResponse {
  algorithm: DynamicProgrammingAlgorithm;
  input: Record<string, unknown>;
  steps: DynamicProgrammingStep[];
  step_count: number;
}

export const DYNAMIC_PROGRAMMING_ALGORITHM_LABELS: Record<
  DynamicProgrammingAlgorithm,
  string
> = {
  fibonacci: "Fibonacci DP",
  coin_change: "Coin Change",
  knapsack: "0/1 Knapsack",
  lcs: "Longest Common Subsequence",
  edit_distance: "Edit Distance",
  unique_paths: "Grid Unique Paths",
};
