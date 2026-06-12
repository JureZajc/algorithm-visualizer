export type ArrayStepType =
  | "compare"
  | "swap"
  | "overwrite"
  | "partition"
  | "merge"
  | "heapify"
  | "found"
  | "not_found"
  | "done";

export interface ArrayAlgorithmStep {
  type: ArrayStepType;
  indices: number[];
  array: number[];
  description: string;
}

export type VisualizerMode = "sorting" | "searching" | "graph";
