export type HashKey = number | string;

export type HashTableAlgorithm =
  | "hash_insert_chaining"
  | "hash_search_chaining"
  | "hash_insert_linear_probing"
  | "hash_search_linear_probing";

export type HashTableStrategy = "separate_chaining" | "linear_probing";

export type HashTableStepType =
  | "hash"
  | "inspect_bucket"
  | "compare"
  | "insert"
  | "collision"
  | "probe"
  | "found"
  | "not_found"
  | "done";

export interface HashTableBucket {
  index: number;
  items: HashKey[];
}

export interface HashTableSnapshot {
  strategy: HashTableStrategy;
  size: number;
  buckets: HashTableBucket[];
}

export interface HashTableStep {
  type: HashTableStepType;
  table: HashTableSnapshot;
  key: HashKey;
  hash_index: number | null;
  active_bucket: number | null;
  active_item: HashKey | null;
  visited_buckets: number[];
  result: Record<string, unknown> | null;
  description: string;
  pseudocode_line: number | null;
}

export interface HashTableRequest {
  algorithm: HashTableAlgorithm;
  values: HashKey[];
  table_size: number;
  target?: HashKey | null;
}

export interface HashTableResponse {
  algorithm: HashTableAlgorithm;
  input: Record<string, unknown>;
  steps: HashTableStep[];
  step_count: number;
}

export const HASH_TABLE_ALGORITHM_LABELS: Record<HashTableAlgorithm, string> = {
  hash_insert_chaining: "Insert - Separate Chaining",
  hash_search_chaining: "Search - Separate Chaining",
  hash_insert_linear_probing: "Insert - Linear Probing",
  hash_search_linear_probing: "Search - Linear Probing",
};
