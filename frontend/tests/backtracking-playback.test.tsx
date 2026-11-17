import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { generatedResultsThrough } from "@/components/backtracking-list-visualizer";
import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { SudokuGrid } from "@/components/sudoku-grid";
import type {
  BacktrackingAlgorithm,
  BacktrackingResponse,
  BacktrackingStep,
  ListBacktrackingState,
  PermutationsResult,
  SubsetsResult,
  SudokuBoard,
  SudokuResult,
} from "@/types/backtracking";
import fixtures from "./fixtures/backtracking-runs.json";

// Responses captured from the real /backtracking/steps endpoint: permutations
// and subsets of A, B, C, and a 61-step Sudoku puzzle that backtracks twice.
type FixtureName = "permutations" | "subsets" | "sudoku_solver";
const responses = fixtures as unknown as Record<FixtureName, BacktrackingResponse>;

function response(name: FixtureName): BacktrackingResponse {
  return structuredClone(responses[name]);
}

vi.mock("@/lib/api", () => ({
  fetchBacktrackingSteps: vi.fn(async (request: { algorithm: BacktrackingAlgorithm }) =>
    response(request.algorithm as FixtureName),
  ),
}));

const props = { algorithms: [], isMetadataLoading: false, metadataError: null };
const EMPTY_BOARD: SudokuBoard = Array.from({ length: 9 }, () =>
  Array.from({ length: 9 }, () => "." as const),
);

function formatResult(items: string[]) {
  return items.length ? items.join(", ") : "empty set";
}

function shownResults() {
  const section = screen.getByRole("heading", { name: "Generated results" }).closest("section");
  if (!section) throw new Error("The generated results section is missing.");
  return within(section).queryAllByRole("listitem").map((item) => item.textContent);
}

function shownGeneratedCount() {
  return screen.getByText("Generated").nextElementSibling?.textContent;
}

function expectResultsAt(steps: BacktrackingStep[], index: number) {
  const expected = generatedResultsThrough(steps, index);
  expect(shownResults()).toEqual(expected.map(formatResult));
  expect(shownGeneratedCount()).toBe(String(expected.length));
}

function sudokuCell(row: number, column: number) {
  return screen.getByLabelText(`Sudoku row ${row + 1}, column ${column + 1}`) as HTMLInputElement;
}

function expectedSudokuValue(step: BacktrackingStep, row: number, column: number) {
  const result = step.result as SudokuResult;
  const isActive = step.active_cell?.[0] === row && step.active_cell?.[1] === column;
  const showsTry = ["try", "dead_end", "remove"].includes(step.type);
  const value = isActive && showsTry && result.tried_value ? result.tried_value : step.grid[row][column];
  return value === "." ? "" : value;
}

function expectSudokuAt(steps: BacktrackingStep[], index: number) {
  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      expect(sudokuCell(row, column).value).toBe(expectedSudokuValue(steps[index], row, column));
    }
  }
}

async function startRun(algorithm: BacktrackingAlgorithm) {
  render(<BacktrackingVisualizer {...props} />);
  fireEvent.change(screen.getByLabelText("Backtracking algorithm"), { target: { value: algorithm } });
  fireEvent.click(screen.getByRole("button", { name: "Start visualization" }));
  const last = screen.getByRole("button", { name: "Jump to last step" }) as HTMLButtonElement;
  await waitFor(() => expect(last.disabled).toBe(false));
  // Any seek pauses autoplay, so the rest of the test steps by hand.
  fireEvent.click(screen.getByRole("button", { name: "Jump to first step" }));
}

describe("generatedResultsThrough", () => {
  it.each(["permutations", "subsets"] as const)(
    "rebuilds the %s found so far at every step",
    (name) => {
      const { steps } = response(name);
      const played: string[][] = [];

      steps.forEach((step, index) => {
        const result = step.result as ListBacktrackingState | null;
        if (step.type === "solution_found" && result?.generated_item) {
          played.push(result.generated_item);
        }
        expect(generatedResultsThrough(steps, index)).toEqual(played);
      });

      const final = steps[steps.length - 1].result as PermutationsResult & SubsetsResult;
      expect(played).toEqual(name === "permutations" ? final.permutations : final.subsets);
      expect(played).toHaveLength(final.count);
    },
  );

  it("returns no results before a run is loaded", () => {
    expect(generatedResultsThrough([], -1)).toEqual([]);
    expect(generatedResultsThrough(response("subsets").steps, -1)).toEqual([]);
  });
});

describe("backtracking list playback", () => {
  it.each(["permutations", "subsets"] as const)(
    "shows the same %s when playing, seeking, and replaying",
    async (name) => {
      const { steps } = response(name);
      await startRun(name);
      expect(shownResults()).toEqual([]);
      expect(screen.getByText("No completed results yet.")).toBeTruthy();

      // Play through one step at a time.
      for (let index = 1; index < steps.length; index += 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next step" }));
        expectResultsAt(steps, index);
      }

      // Step backward, then seek to arbitrary indexes in both directions.
      for (let index = steps.length - 2; index >= steps.length - 6; index -= 1) {
        fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
        expectResultsAt(steps, index);
      }
      const slider = screen.getByRole("slider", { name: /Choose a step/ });
      for (const index of [Math.floor(steps.length / 2), 3, steps.length - 2, 0, steps.length - 1]) {
        fireEvent.change(slider, { target: { value: String(index) } });
        expectResultsAt(steps, index);
      }

      // Replay restarts from the first step with an empty list.
      fireEvent.click(screen.getByRole("button", { name: "Replay loaded steps" }));
      expectResultsAt(steps, 0);
      fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
      expectResultsAt(steps, steps.length - 1);
    },
  );
});

describe("Sudoku playback", () => {
  it("shows each step's board when playing, seeking, and replaying", async () => {
    const { steps } = response("sudoku_solver");
    await startRun("sudoku_solver");
    expectSudokuAt(steps, 0);

    for (let index = 1; index < steps.length; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next step" }));
      expectSudokuAt(steps, index);
    }
    const removeIndex = steps.findIndex((step) => step.type === "remove");
    const slider = screen.getByRole("slider", { name: /Choose a step/ });
    for (const index of [removeIndex, 0, removeIndex + 1, steps.length - 1, removeIndex - 1]) {
      fireEvent.change(slider, { target: { value: String(index) } });
      expectSudokuAt(steps, index);
    }

    fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
    fireEvent.click(screen.getByRole("button", { name: "Replay loaded steps" }));
    expectSudokuAt(steps, 0);
  });

  it("marks the run's given cells as fixed, not the editor board's", async () => {
    const run = response("sudoku_solver");
    await startRun("sudoku_solver");

    // The editor still holds the default puzzle, which leaves (0, 3) empty;
    // the loaded run gives it, so only the run data can mark it as fixed.
    expect(run.fixed_cells).toContainEqual([0, 3]);
    expect(sudokuCell(0, 3).className).toContain("bg-slate-100");
    expect(sudokuCell(0, 2).className).not.toContain("bg-slate-100");
  });

  it("reads fixed cells from the run while a step is shown", () => {
    const { steps, initial_board, fixed_cells } = response("sudoku_solver");
    if (!initial_board || !fixed_cells) throw new Error("The Sudoku fixture has no run data.");
    const onCellChange = vi.fn();
    const { rerender } = render(
      <SudokuGrid
        board={EMPTY_BOARD}
        step={steps[0]}
        run={{ initial_board, fixed_cells }}
        editingDisabled
        onCellChange={onCellChange}
      />,
    );

    for (const [row, column] of fixed_cells) {
      expect(sudokuCell(row, column).className).toContain("bg-slate-100");
    }

    // Without a step, the editor board decides which cells are given.
    rerender(
      <SudokuGrid
        board={EMPTY_BOARD}
        step={null}
        run={{ initial_board, fixed_cells }}
        editingDisabled={false}
        onCellChange={onCellChange}
      />,
    );
    for (const [row, column] of fixed_cells) {
      expect(sudokuCell(row, column).className).not.toContain("bg-slate-100");
    }
  });
});
