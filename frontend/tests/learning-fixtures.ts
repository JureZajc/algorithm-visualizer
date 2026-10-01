import fixtures from "./fixtures/learning-runs.json";
import type { LearningRunContext, LearningStep } from "@/learning/types";

// Snapshots captured directly from the existing Python algorithms. These are
// contract fixtures, not frontend reimplementations of the algorithms.
export interface LearningRun {
  algorithm: string;
  steps: LearningStep[];
  context: LearningRunContext;
}

export const runs = fixtures as unknown as Record<string, LearningRun>;
export function run(name: string): LearningRun {
  return structuredClone(runs[name]);
}
