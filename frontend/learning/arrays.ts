import { question, type LearningQuestion, type LearningRunContext, type LearningStep } from "./types";

export function bubbleSortQuestion(steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("array" in step) || !("array" in previous)) return null;
  if (previous.type === "compare" && previous.indices.length === 2 && ["swap", "compare", "done"].includes(step.type)) {
    const [a, b] = previous.indices;
    if (previous.array[a] === undefined || previous.array[b] === undefined) return null;
    return question("bubble_sort", index, "next-operation",
      `After comparing ${previous.array[a]} at index ${a} and ${previous.array[b]} at index ${b}, what happens next?`,
      [`Swap indices ${a} and ${b}`, "Compare the next adjacent pair", "Finish sorting"],
      step.type === "swap" ? 0 : step.type === "compare" ? 1 : 2,
      step.type === "swap" ? "The left value is larger, so Bubble Sort swaps this adjacent pair."
        : step.type === "compare" ? "This pair is already in order. Bubble Sort continues with another adjacent pair."
          : "No further comparisons are needed in this run. The array is sorted.");
  }
  if (step.type !== "compare" || step.indices.length !== 2) return null;
  const [a, b] = step.indices;
  const pairs = previous.array.slice(1).map((_, i) => [i, i + 1]);
  const correct = pairs.findIndex(([x, y]) => x === a && y === b);
  if (correct < 0 || pairs.length < 2) return null;
  const selected = [pairs[correct], ...pairs.filter((_, i) => i !== correct).slice(0, 3)].sort((x, y) => x[0] - y[0]);
  const choices = selected.map(([x, y]) => `Indices ${x} and ${y} (${previous.array[x]} and ${previous.array[y]})`);
  return question("bubble_sort", index, "compare-pair", "Which adjacent indices will Bubble Sort compare next?",
    choices, selected.findIndex(([x, y]) => x === a && y === b),
    `Bubble Sort compares the neighboring values at indices ${a} and ${b} before deciding whether to swap them.`);
}

export function binarySearchQuestion(steps: readonly LearningStep[], index: number, context: LearningRunContext): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("array" in step) || !("array" in previous) ||
      previous.type !== "compare" || previous.indices.length !== 1 || !Number.isFinite(context.target)) return null;
  const midpoint = previous.indices[0];
  const value = previous.array[midpoint];
  if (value === undefined) return null;
  let correct: number;
  if (step.type === "found") correct = 2;
  else if (step.type === "not_found") correct = 3;
  else if (step.type === "compare" && step.indices.length === 1 && step.indices[0] !== midpoint) correct = step.indices[0] < midpoint ? 0 : 1;
  else return null;
  const explanations = [
    `Target ${context.target} is smaller than ${value}, so the next midpoint is in the left half.`,
    `Target ${context.target} is larger than ${value}, so the next midpoint is in the right half.`,
    `The midpoint value equals target ${context.target}, so the search reports a match.`,
    `The remaining search interval is empty. Target ${context.target} is absent.`,
  ];
  return question("binary_search", index, "search-direction",
    `Target: ${context.target}. Current midpoint: index ${midpoint}, value ${value}. What is the next search action?`,
    ["Check a midpoint in the left half", "Check a midpoint in the right half", "Report target found", "Report target absent"],
    correct, explanations[correct]);
}
