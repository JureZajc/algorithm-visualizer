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

export function selectionSortQuestion(steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("array" in step) || !("array" in previous) || previous.type !== "compare" || previous.indices.length !== 2) return null;
  const [minimum, candidate] = previous.indices;
  const minimumValue = previous.array[minimum];
  const candidateValue = previous.array[candidate];
  if (minimumValue === undefined || candidateValue === undefined) return null;
  if (step.type === "compare" && step.indices.length === 2 && step.indices[1] === candidate + 1) {
    const kept = step.indices[0];
    if (kept !== minimum && kept !== candidate) return null;
    return question("selection_sort", index, "minimum-candidate",
      `The current minimum is ${minimumValue} at index ${minimum}. After comparing it with ${candidateValue} at index ${candidate}, which index holds the minimum?`,
      [`Index ${minimum} (${minimumValue})`, `Index ${candidate} (${candidateValue})`], kept === minimum ? 0 : 1,
      kept === minimum ? `${candidateValue} is not smaller than ${minimumValue}, so index ${minimum} remains the minimum.`
        : `${candidateValue} is smaller than ${minimumValue}, so index ${candidate} becomes the new minimum.`);
  }
  if (step.type !== "swap" || step.indices.length !== 2 || candidate !== previous.array.length - 1) return null;
  const [start, smallest] = step.indices;
  const value = previous.array[smallest];
  if (value === undefined || smallest <= start || (smallest !== minimum && smallest !== candidate) ||
      previous.array.slice(start).some((other) => other < value)) return null;
  // Equal values elsewhere would also be "the smallest", so they never appear as distractors.
  const others = [start, minimum, candidate, ...previous.array.keys()].filter((i) => i >= start && previous.array[i] !== value);
  const selected = [smallest, ...[...new Set(others)].slice(0, 3)].sort((a, b) => a - b);
  return question("selection_sort", index, "place-minimum",
    `Every value from index ${start} onward has been compared. Which value does Selection Sort move into index ${start}?`,
    selected.map((i) => `${previous.array[i]} at index ${i}`), selected.indexOf(smallest),
    `${value} at index ${smallest} is the smallest value from index ${start} onward, so Selection Sort swaps it into index ${start}.`);
}

// Shifting overwrites the inserted value's slot, so it is read from the comparison
// that starts its insertion round: one not preceded by a shift into index right + 1.
function insertionRound(steps: readonly LearningStep[], index: number): { value: number; source: number } | null {
  for (let k = index; k >= 0; k -= 2) {
    const step = steps[k];
    if (!step || !("array" in step) || step.type !== "compare" || step.indices.length !== 2) return null;
    const [left, right] = step.indices;
    if (right !== left + 1) return null;
    const before = steps[k - 1];
    if (before && "array" in before && before.type === "overwrite" && before.indices[0] === right + 1) continue;
    const value = step.array[right];
    return value === undefined ? null : { value, source: right };
  }
  return null;
}

export function insertionSortQuestion(steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("array" in step) || !("array" in previous)) return null;
  if (previous.type === "compare") {
    const round = insertionRound(steps, index - 1);
    const [left, right] = previous.indices;
    const compared = previous.array[left];
    if (!round || compared === undefined) return null;
    const shift = compared > round.value;
    const writes = (value: number) => step.type === "overwrite" && step.indices[0] === right && step.array[right] === value;
    const revealed = shift ? writes(compared) : right === round.source ? step.type === "compare" || step.type === "done" : writes(round.value);
    if (!revealed) return null;
    return question("insertion_sort", index, "shift-or-stop",
      `Inserting ${round.value}: it was compared with ${compared} at index ${left}. What happens next?`,
      [`Shift ${compared} one position to the right`, `Stop shifting: ${round.value} belongs at index ${right}`], shift ? 0 : 1,
      shift ? `${compared} is larger than ${round.value}, so Insertion Sort shifts it right to make room.`
        : `${compared} is not larger than ${round.value}, so ${round.value} belongs at index ${right}${right === round.source ? ", where it already is" : ""}.`);
  }
  if (step.type !== "compare" || step.indices.length !== 2 || insertionRound(steps, index)?.source !== step.indices[1]) return null;
  const source = step.indices[1];
  const others = [source - 1, source + 1, source + 2, source - 2].filter((i) => i >= 0 && i < previous.array.length && previous.array[i] !== previous.array[source]);
  const selected = [source, ...others.slice(0, 3)].sort((a, b) => a - b);
  return question("insertion_sort", index, "next-value", "Which value does Insertion Sort insert into the sorted section next?",
    selected.map((i) => `${previous.array[i]} at index ${i}`), selected.indexOf(source),
    `Indices 0 to ${source - 1} already form the sorted section, so Insertion Sort takes ${previous.array[source]} from index ${source} next.`);
}

export function linearSearchQuestion(steps: readonly LearningStep[], index: number, context: LearningRunContext): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("array" in step) || !("array" in previous) ||
      previous.type !== "compare" || previous.indices.length !== 1 || !Number.isFinite(context.target)) return null;
  const position = previous.indices[0];
  const value = previous.array[position];
  if (value === undefined) return null;
  let correct: number;
  if (step.type === "found" && value === context.target) correct = 1;
  else if (step.type === "compare" && step.indices[0] === position + 1 && value !== context.target) correct = 0;
  else if (step.type === "not_found" && value !== context.target && position === previous.array.length - 1) correct = 2;
  else return null;
  const explanations = [
    `${value} is not target ${context.target}, so Linear Search checks index ${position + 1} next.`,
    `${value} equals target ${context.target}, so the search reports a match at index ${position}.`,
    `${value} is not target ${context.target}, and index ${position} is the last index. Target ${context.target} is absent.`,
  ];
  return question("linear_search", index, "search-action",
    `Target: ${context.target}. Index ${position} holds ${value}. What is the next search action?`,
    ["Check the next index", "Report target found", "Report target absent"], correct, explanations[correct]);
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
