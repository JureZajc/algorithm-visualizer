import type {
  BacktrackingAlgorithm,
  BacktrackingRequest,
} from "@/types/backtracking";

export interface BacktrackingPreset {
  id: string;
  label: string;
  algorithm: BacktrackingAlgorithm;
  request: Omit<BacktrackingRequest, "algorithm">;
}

export const BACKTRACKING_PRESETS: BacktrackingPreset[] = [
  {
    id: "queens-4",
    label: "4 queens",
    algorithm: "n_queens",
    request: { size: 4 },
  },
  {
    id: "queens-6",
    label: "6 queens",
    algorithm: "n_queens",
    request: { size: 6 },
  },
  {
    id: "maze-classic",
    label: "Classic 7 by 7",
    algorithm: "maze_solver",
    request: { rows: 7, cols: 7, preset: "classic" },
  },
  {
    id: "maze-rooms",
    label: "Rooms 9 by 9",
    algorithm: "maze_solver",
    request: { rows: 9, cols: 9, preset: "rooms" },
  },
  {
    id: "maze-open",
    label: "Open 6 by 8",
    algorithm: "maze_solver",
    request: { rows: 6, cols: 8, preset: "open" },
  },
  {
    id: "permutations-numbers",
    label: "Numbers 1, 2, 3",
    algorithm: "permutations",
    request: { values: ["1", "2", "3"] },
  },
  {
    id: "permutations-letters",
    label: "Letters A, B, C",
    algorithm: "permutations",
    request: { values: ["A", "B", "C"] },
  },
  {
    id: "subsets-colors",
    label: "Colors",
    algorithm: "subsets",
    request: { values: ["red", "green", "blue"] },
  },
  {
    id: "subsets-letters",
    label: "Letters A, B, C",
    algorithm: "subsets",
    request: { values: ["A", "B", "C"] },
  },
  {
    id: "sudoku-classic",
    label: "Classic puzzle",
    algorithm: "sudoku_solver",
    request: {
      board: [
        ["5", "3", ".", ".", "7", ".", ".", ".", "."],
        ["6", ".", ".", "1", "9", "5", ".", ".", "."],
        [".", "9", "8", ".", ".", ".", ".", "6", "."],
        ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
        ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
        ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
        [".", "6", ".", ".", ".", ".", "2", "8", "."],
        [".", ".", ".", "4", "1", "9", ".", ".", "5"],
        [".", ".", ".", ".", "8", ".", ".", "7", "9"],
      ],
    },
  },
];
