import type { ArrayAlgorithmStep, ArrayStepType } from "@/types/algorithm";

export type StepType = ArrayStepType;

export type SortingAlgorithm =
  | "bubble_sort"
  | "selection_sort"
  | "insertion_sort"
  | "merge_sort"
  | "quick_sort"
  | "heap_sort"
  | "shell_sort"
  | "cocktail_shaker_sort"
  | "gnome_sort"
  | "comb_sort"
  | "counting_sort";

export type AlgorithmStep = ArrayAlgorithmStep;

export interface SortingStepsResponse {
  algorithm: SortingAlgorithm;
  initial: number[];
  steps: AlgorithmStep[];
  step_count: number;
}

export interface RandomNumbersResponse {
  numbers: number[];
}

export const ALGORITHM_LABELS: Record<SortingAlgorithm, string> = {
  bubble_sort: "Bubble Sort",
  selection_sort: "Selection Sort",
  insertion_sort: "Insertion Sort",
  merge_sort: "Merge Sort",
  quick_sort: "Quick Sort",
  heap_sort: "Heap Sort",
  shell_sort: "Shell Sort",
  cocktail_shaker_sort: "Cocktail Shaker Sort",
  gnome_sort: "Gnome Sort",
  comb_sort: "Comb Sort",
  counting_sort: "Counting Sort",
};
