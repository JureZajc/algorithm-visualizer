import type { components } from "@/types/generated/api";

type Schemas = components["schemas"];

export type ArrayAlgorithmStep = Schemas["AlgorithmStep"];
export type ArrayStepType = ArrayAlgorithmStep["type"];

/**
 * An algorithm's catalog entry. The forms take input limits from the generated
 * catalog at build time, so the entries that the panels use leave them out.
 */
export type AlgorithmMetadata = Omit<Schemas["AlgorithmMetadata"], "limits">;
export type AlgorithmCategory = AlgorithmMetadata["category"];
export type TimeComplexity = Schemas["TimeComplexity"];
export type AlgorithmsResponse = Schemas["AlgorithmsResponse"];

/** A view in the app: one per category, plus the sorting comparison. */
export type VisualizerMode = AlgorithmCategory | "compare";

export interface MetadataSourceProps {
  algorithms: AlgorithmMetadata[];
  isMetadataLoading: boolean;
  metadataError: string | null;
}
