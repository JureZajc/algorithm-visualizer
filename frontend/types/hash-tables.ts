import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

export type HashTableRequest = Schemas["HashTableRequest"];
export type HashTableResponse = Schemas["HashTableResponse"];
/** The result of a step, typed per operation. */
export type HashTableStepResult = NonNullable<Schemas["HashTableStep"]["result"]>;
/**
 * A step of a hash table operation. The hash table view reads `result` as a
 * plain record, so it stays one here until the view narrows it to
 * `HashTableStepResult`.
 */
export type HashTableStep = Omit<Schemas["HashTableStep"], "result"> & {
  result: Record<string, unknown> | null;
};
export type HashTableSnapshot = Schemas["HashTableSnapshot"];
export type HashTableBucket = Schemas["HashTableBucket"];

export type HashKey = HashTableBucket["items"][number];
export type HashTableAlgorithm = HashTableRequest["algorithm"];
export type HashTableStrategy = HashTableSnapshot["strategy"];
export type HashTableStepType = HashTableStep["type"];

export const HASH_TABLE_ALGORITHM_LABELS: Record<HashTableAlgorithm, string> =
  CATALOG_LABELS.hash_tables;
