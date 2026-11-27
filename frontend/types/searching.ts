import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

export type SearchingAlgorithm = Schemas["SearchRequest"]["algorithm"];
export type SearchingStepsResponse = Schemas["SearchResponse"];

export const SEARCHING_ALGORITHM_LABELS: Record<SearchingAlgorithm, string> =
  CATALOG_LABELS.searching;
