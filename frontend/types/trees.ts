import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

export type TreeRequest = Schemas["TreeRequest"];
export type TreeResponse = Schemas["TreeResponse"];
/** The result of a step, typed per operation. */
export type TreeStepResult = NonNullable<Schemas["TreeStep"]["result"]>;
/**
 * A step of a tree algorithm. The tree view reads `result` as a plain record,
 * so it stays one here until the view narrows it to `TreeStepResult`.
 */
export type TreeStep = Omit<Schemas["TreeStep"], "result"> & {
  result: Record<string, unknown> | null;
};
export type TreeNode = Schemas["TreeNode"];

export type TreeAlgorithm = TreeRequest["algorithm"];
export type TreeStepType = TreeStep["type"];
export type TreeRotationType = NonNullable<TreeStep["rotation_type"]>;

export const TREE_ALGORITHM_LABELS: Record<TreeAlgorithm, string> =
  CATALOG_LABELS.trees;
