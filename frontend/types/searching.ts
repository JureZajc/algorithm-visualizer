import type { ArrayAlgorithmStep } from "@/types/algorithm";

export type SearchingAlgorithm = "linear_search" | "binary_search";

export interface SearchingStepsResponse {
  algorithm: SearchingAlgorithm;
  target: number;
  initial: number[];
  steps: ArrayAlgorithmStep[];
  step_count: number;
}

export const SEARCHING_ALGORITHM_LABELS: Record<SearchingAlgorithm, string> = {
  linear_search: "Linear Search",
  binary_search: "Binary Search",
};
