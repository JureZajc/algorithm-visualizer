import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

/** A request model's fields other than `algorithm`, each optional. */
type OptionalFields<Model> = Partial<Omit<Model, "algorithm">>;

export type DynamicProgrammingResponse = Schemas["DynamicProgrammingResponse"];
export type DynamicProgrammingStep = Schemas["DynamicProgrammingStep"];

export type DynamicProgrammingAlgorithm = DynamicProgrammingResponse["algorithm"];
export type DynamicProgrammingStepType = DynamicProgrammingStep["type"];
export type DynamicProgrammingCell =
  DynamicProgrammingStep["table"][number][number];
export type TablePosition = DynamicProgrammingStep["related_cells"][number];

/**
 * The API has one request model per algorithm and reads only the fields of the
 * selected one. The forms and presets build every algorithm's request through
 * this single type, so it has the fields of all the models.
 */
export type DynamicProgrammingRequest = {
  algorithm: DynamicProgrammingAlgorithm;
} & OptionalFields<Schemas["FibonacciRequest"]> &
  OptionalFields<Schemas["CoinChangeRequest"]> &
  OptionalFields<Schemas["KnapsackRequest"]> &
  OptionalFields<Schemas["LongestCommonSubsequenceRequest"]> &
  OptionalFields<Schemas["EditDistanceRequest"]> &
  OptionalFields<Schemas["UniquePathsRequest"]>;

export const DYNAMIC_PROGRAMMING_ALGORITHM_LABELS: Record<
  DynamicProgrammingAlgorithm,
  string
> = CATALOG_LABELS.dynamic_programming;
