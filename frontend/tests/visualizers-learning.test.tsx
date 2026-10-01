import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { DynamicProgrammingVisualizer } from "@/components/dynamic-programming-visualizer";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { TreesVisualizer } from "@/components/trees-visualizer";
import { run } from "./learning-fixtures";

vi.mock("@/lib/api", () => ({
  fetchSortingSteps: vi.fn(async () => ({ steps: run("bubble").steps })),
  fetchSearchingSteps: vi.fn(async () => ({ steps: run("binary_right").steps })),
  fetchTreeSteps: vi.fn(async (request: { algorithm: string }) => ({ steps: run(request.algorithm === "bst_insert" ? "bst_insert" : "bst_search").steps })),
  fetchGraphSteps: vi.fn(async () => ({ steps: run("bfs").steps, nodes: run("bfs").context.nodes })),
  fetchDynamicProgrammingSteps: vi.fn(async () => ({ steps: run("fibonacci_8").steps })),
  fetchBacktrackingSteps: vi.fn(async () => ({ steps: run("n_queens").steps })),
}));

const props = { algorithms: [], isMetadataLoading: false, metadataError: null };

describe("visualizer learning integration", () => {
  it.each([
    { name: "sorting", component: SortingVisualizer },
    { name: "searching", component: SearchingVisualizer, select: "Searching algorithm", algorithm: "binary_search" },
    { name: "BST insertion", component: TreesVisualizer },
    { name: "BST search", component: TreesVisualizer, select: "Tree algorithm", algorithm: "bst_search" },
    { name: "graph", component: GraphVisualizer, select: "Algorithm", algorithm: "bfs" },
    { name: "dynamic programming", component: DynamicProgrammingVisualizer },
    { name: "backtracking", component: BacktrackingVisualizer },
  ])("wires learning checkpoints and reset in $name", async ({ component: Component, select, algorithm }) => {
    render(<Component {...props} />);
    if (select) fireEvent.change(screen.getByLabelText(select), { target: { value: algorithm } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Start visualization" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Jump to last step" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
    expect(screen.getByRole("heading", { name: "What happens next?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Skip question" }));
    expect(screen.getByText("Skipped: 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset run" }));
    expect(screen.getByText("Skipped: 0")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "What happens next?" })).toBeNull();
  });

  it("disables learning mode for unsupported algorithm selections", () => {
    render(<SortingVisualizer {...props} />);
    fireEvent.change(screen.getByLabelText("Sorting algorithm"), { target: { value: "quick_sort" } });
    expect((screen.getByRole("checkbox", { name: "Learning mode" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Learning mode is not available for this algorithm yet")).toBeTruthy();
  });
});
