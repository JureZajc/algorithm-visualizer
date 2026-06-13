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
  pseudocode_line?: number;
}

export type VisualizerMode = "sorting" | "searching" | "graph";

export type AlgorithmCategory = VisualizerMode;

export interface TimeComplexity {
  best: string;
  average: string;
  worst: string;
}

export interface AlgorithmMetadata {
  id: string;
  label: string;
  name: string;
  category: AlgorithmCategory;
  description: string;
  time_complexity: TimeComplexity;
  space_complexity: string;
  notes: string[];
  pseudocode: string[];
}

export interface AlgorithmsResponse {
  sorting: AlgorithmMetadata[];
  searching: AlgorithmMetadata[];
  graph: AlgorithmMetadata[];
}

export interface MetadataSourceProps {
  algorithms: AlgorithmMetadata[];
  isMetadataLoading: boolean;
  metadataError: string | null;
}
