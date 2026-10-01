import { question, type LearningQuestion, type LearningStep } from "./types";

export function fibonacciQuestion(steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  const previous = steps[index - 1];
  if (!step || !previous || !("table" in step) || !("table" in previous) ||
      !step.active_cell || step.active_cell[0] !== 0 || step.related_cells.length !== 2) return null;
  const k = step.active_cell[1];
  if (k < 2) return null;
  if (step.type === "compare") {
    const dependencies = step.related_cells.map(([, column]) => column).sort((a, b) => a - b);
    if (dependencies[0] !== k - 2 || dependencies[1] !== k - 1) return null;
    return question("fibonacci", index, "dependencies", `Which entries are read to compute F(${k})?`,
      [`F(${k - 2}) and F(${k - 1})`, `F(${k - 1}) and F(${k})`, `F(${k}) and F(${k + 1})`], 0,
      `The recurrence reads F(${k - 1}) and F(${k - 2}), the two preceding Fibonacci entries.`);
  }
  if (step.type !== "update" || previous.type !== "compare") return null;
  const answer = step.table[0]?.[k];
  const values = step.related_cells.map(([row, column]) => previous.table[row]?.[column]);
  if (typeof answer !== "number" || !values.every((value) => typeof value === "number")) return null;
  const [a, b] = values as number[];
  const choices = [...new Set([answer, a, b, Math.abs(a - b), answer + 1])].slice(0, 4).sort((x, y) => x - y);
  return question("fibonacci", index, "computed-value", `What value is stored in F(${k}) next?`,
    choices.map(String), choices.indexOf(answer), `The two preceding entries contain ${a} and ${b}. Their sum, ${answer}, is stored in F(${k}).`);
}
