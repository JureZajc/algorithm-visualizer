import type { SearchingAlgorithm } from "@/types/searching";

export interface SortingPreset {
  id: string;
  label: string;
  createNumbers: () => number[];
}

export interface SearchingPreset {
  id: string;
  label: string;
  numbers: number[];
  target: number;
  algorithm?: SearchingAlgorithm;
}

function randomNumbers(size: number) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 96) + 5);
}

export const SORTING_PRESETS: SortingPreset[] = [
  { id: "random", label: "Random", createNumbers: () => randomNumbers(14) },
  { id: "nearly-sorted", label: "Nearly sorted", createNumbers: () => [8, 14, 21, 29, 46, 38, 55, 63, 72, 81, 90, 97] },
  { id: "reversed", label: "Reversed", createNumbers: () => [96, 88, 79, 71, 63, 54, 45, 37, 28, 19, 11, 5] },
  { id: "few-unique", label: "Few unique values", createNumbers: () => [20, 60, 40, 20, 40, 60, 20, 60, 40, 20, 40, 60] },
  { id: "duplicates", label: "Duplicates", createNumbers: () => [42, 17, 42, 83, 17, 29, 64, 29, 51, 42, 83, 17] },
  { id: "small", label: "Small array", createNumbers: () => [37, 12, 48, 5, 29, 21] },
  { id: "large", label: "Large array", createNumbers: () => randomNumbers(40) },
];

export const SEARCHING_PRESETS: SearchingPreset[] = [
  { id: "target-exists", label: "Target exists", numbers: [34, 12, 78, 45, 23, 91, 56, 67, 8, 39], target: 56 },
  { id: "target-missing", label: "Target missing", numbers: [18, 43, 7, 62, 29, 84, 51, 36, 95, 14], target: 70 },
  { id: "target-beginning", label: "Target at beginning", numbers: [73, 18, 42, 9, 61, 35, 88, 24, 50, 12], target: 73, algorithm: "linear_search" },
  { id: "target-end", label: "Target at end", numbers: [16, 47, 82, 25, 63, 9, 54, 31, 76, 92], target: 92, algorithm: "linear_search" },
  { id: "binary-search", label: "Sorted array for binary search", numbers: [5, 12, 19, 27, 36, 48, 59, 71, 84, 96], target: 71, algorithm: "binary_search" },
];
