import type { ArrayAlgorithmStep, ArrayStepType } from "@/types/algorithm";
import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

export type StepType = ArrayStepType;
export type AlgorithmStep = ArrayAlgorithmStep;

export type SortingAlgorithm = Schemas["SortRequest"]["algorithm"];
export type SortingStepsResponse = Schemas["SortResponse"];
export type RandomNumbersResponse = Schemas["RandomNumbersResponse"];

export const ALGORITHM_LABELS: Record<SortingAlgorithm, string> =
  CATALOG_LABELS.sorting;
