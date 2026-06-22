import type {
  DynamicProgrammingAlgorithm,
  DynamicProgrammingRequest,
} from "@/types/dynamic-programming";

export interface DynamicProgrammingPreset {
  id: string;
  label: string;
  algorithm: DynamicProgrammingAlgorithm;
  request: Omit<DynamicProgrammingRequest, "algorithm">;
}

export const DYNAMIC_PROGRAMMING_PRESETS: DynamicProgrammingPreset[] = [
  { id: "fib-8", label: "F(8)", algorithm: "fibonacci", request: { n: 8 } },
  { id: "fib-12", label: "F(12)", algorithm: "fibonacci", request: { n: 12 } },
  {
    id: "coin-standard",
    label: "Coins 1, 3, 4",
    algorithm: "coin_change",
    request: { coins: [1, 3, 4], amount: 6 },
  },
  {
    id: "coin-impossible",
    label: "Impossible amount",
    algorithm: "coin_change",
    request: { coins: [4, 6], amount: 7 },
  },
  {
    id: "knapsack-standard",
    label: "Four items",
    algorithm: "knapsack",
    request: {
      weights: [2, 3, 4, 5],
      values: [3, 4, 5, 6],
      capacity: 5,
    },
  },
  {
    id: "knapsack-tight",
    label: "Tight capacity",
    algorithm: "knapsack",
    request: {
      weights: [1, 3, 4, 5],
      values: [1, 4, 5, 7],
      capacity: 7,
    },
  },
  {
    id: "lcs-simple",
    label: "ABCDEF / ACE",
    algorithm: "lcs",
    request: { text_a: "ABCDEF", text_b: "ACE" },
  },
  {
    id: "lcs-tie",
    label: "Classic tie",
    algorithm: "lcs",
    request: { text_a: "ABCBDAB", text_b: "BDCABA" },
  },
  {
    id: "edit-kitten",
    label: "kitten / sitting",
    algorithm: "edit_distance",
    request: { text_a: "kitten", text_b: "sitting" },
  },
  {
    id: "edit-short",
    label: "horse / ros",
    algorithm: "edit_distance",
    request: { text_a: "horse", text_b: "ros" },
  },
  {
    id: "paths-wide",
    label: "3 by 7 grid",
    algorithm: "unique_paths",
    request: { rows: 3, cols: 7 },
  },
  {
    id: "paths-square",
    label: "5 by 5 grid",
    algorithm: "unique_paths",
    request: { rows: 5, cols: 5 },
  },
];
