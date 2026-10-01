import type { LearningQuestion } from "./types";

export function selectCheckpoints(candidates: readonly LearningQuestion[], stepCount: number): LearningQuestion[] {
  const selected: LearningQuestion[] = [];
  const kindCounts: Record<string, number> = {};
  for (let bin = 0; bin < 8; bin++) {
    const available = candidates.filter((candidate) => candidate.stepIndex > 0 && candidate.stepIndex < stepCount &&
      Math.floor((candidate.stepIndex - 1) * 8 / Math.max(1, stepCount - 1)) === bin &&
      selected.every((other) => Math.abs(other.stepIndex - candidate.stepIndex) >= 3));
    available.sort((a, b) => (kindCounts[a.kind] ?? 0) - (kindCounts[b.kind] ?? 0) || a.stepIndex - b.stepIndex || a.id.localeCompare(b.id));
    const candidate = available[0];
    if (candidate) {
      selected.push(candidate);
      kindCounts[candidate.kind] = (kindCounts[candidate.kind] ?? 0) + 1;
    }
  }
  return selected;
}
