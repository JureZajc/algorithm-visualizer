import { question, type LearningQuestion, type LearningStep } from "./types";

export function nQueensQuestion(steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  if (!step || !("grid" in step) || !step.active_cell) return null;
  const [row, column] = step.active_cell;
  if (step.type === "try") {
    const token = step.grid[row]?.[column];
    if (token !== "attempt" && token !== "conflict") return null;
    const safe = token === "attempt" && step.related_cells.length === 0;
    return question("n_queens", index, "candidate-validity",
      `Can a queen be safely placed at row ${row + 1}, column ${column + 1} on the current board?`,
      ["Yes, place a queen", "No, an existing queen attacks this square"], safe ? 0 : 1,
      safe ? "No existing queen shares this column or diagonal, so the candidate is safe."
        : "An existing queen attacks this square along a column or diagonal. This candidate is rejected.");
  }
  if (step.type !== "remove") return null;
  return question("n_queens", index, "backtrack", "What happens next after this unsuccessful branch?",
    [`Remove the queen at row ${row + 1}, column ${column + 1}`, "Keep all queens and try another square", "Report a complete solution"], 0,
    "This branch could not complete a solution. The algorithm removes its previous choice so it can try another candidate.");
}
