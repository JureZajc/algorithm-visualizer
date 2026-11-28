import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { DynamicProgrammingVisualizer } from "@/components/dynamic-programming-visualizer";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { HashTablesVisualizer } from "@/components/hash-tables-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { TreesVisualizer } from "@/components/trees-visualizer";
import { run } from "./learning-fixtures";

const sortingRuns: Record<string, string> = { selection_sort: "selection", insertion_sort: "insertion" };
const hashRuns: Record<string, string> = {
  hash_insert_chaining: "hash_chaining_insert",
  hash_search_chaining: "hash_chaining_found",
  hash_insert_linear_probing: "hash_probing_insert_wrap",
  hash_search_linear_probing: "hash_probing_absent",
};

vi.mock("@/lib/api", () => ({
  fetchSortingSteps: vi.fn(async (_numbers: number[], algorithm: string) => ({ steps: run(sortingRuns[algorithm] ?? "bubble").steps })),
  fetchSearchingSteps: vi.fn(async (_numbers: number[], algorithm: string) => ({ steps: run(algorithm === "linear_search" ? "linear_found" : "binary_right").steps })),
  fetchTreeSteps: vi.fn(async (request: { algorithm: string }) => ({ steps: run(request.algorithm === "bst_insert" ? "bst_insert" : "bst_search").steps })),
  fetchGraphSteps: vi.fn(async (request: { algorithm: string }) => {
    const sample = run(request.algorithm === "dfs" ? "dfs" : "bfs");
    return { steps: sample.steps, nodes: sample.context.nodes };
  }),
  fetchDynamicProgrammingSteps: vi.fn(async () => ({ steps: run("fibonacci_8").steps })),
  fetchBacktrackingSteps: vi.fn(async () => ({ steps: run("n_queens").steps })),
  fetchHashTableSteps: vi.fn(async (request: { algorithm: string }) => ({ steps: run(hashRuns[request.algorithm]).steps })),
}));

const props = { algorithms: [], isMetadataLoading: false, metadataError: null };

describe("visualizer learning integration", () => {
  it.each([
    { name: "sorting", component: SortingVisualizer },
    { name: "selection sort", component: SortingVisualizer, select: "Sorting algorithm", algorithm: "selection_sort" },
    { name: "insertion sort", component: SortingVisualizer, select: "Sorting algorithm", algorithm: "insertion_sort" },
    { name: "linear search", component: SearchingVisualizer },
    { name: "searching", component: SearchingVisualizer, select: "Searching algorithm", algorithm: "binary_search" },
    { name: "BST insertion", component: TreesVisualizer },
    { name: "BST search", component: TreesVisualizer, select: "Tree algorithm", algorithm: "bst_search" },
    { name: "graph", component: GraphVisualizer, select: "Algorithm", algorithm: "bfs" },
    { name: "DFS", component: GraphVisualizer, select: "Algorithm", algorithm: "dfs" },
    { name: "dynamic programming", component: DynamicProgrammingVisualizer },
    { name: "backtracking", component: BacktrackingVisualizer },
    { name: "hash tables", component: HashTablesVisualizer },
    { name: "chaining search", component: HashTablesVisualizer, select: "Hash table operation", algorithm: "hash_search_chaining" },
    { name: "linear probing insert", component: HashTablesVisualizer, select: "Hash table operation", algorithm: "hash_insert_linear_probing" },
    { name: "linear probing search", component: HashTablesVisualizer, select: "Hash table operation", algorithm: "hash_search_linear_probing" },
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

  it("enables learning mode for Hash Tables and stops playback before the first checkpoint", async () => {
    render(<HashTablesVisualizer {...props} />);
    const learning = screen.getByRole("checkbox", { name: "Learning mode" }) as HTMLInputElement;
    expect(learning.disabled).toBe(false);
    expect(screen.queryByText("Learning mode is not available for this algorithm yet")).toBeNull();
    fireEvent.click(learning);
    fireEvent.click(screen.getByRole("button", { name: "Start visualization" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Jump to last step" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
    // The first checkpoint asks about step 3, so playback holds on step 2.
    expect(screen.getByText("Bucket 2 has been inspected for 12. How is 12 stored?")).toBeTruthy();
    expect(screen.getByText("Step 2 / 15")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Next step" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "As the first key in bucket 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("✓ Correct!")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Step 3 / 15")).toBeTruthy();
    expect(screen.getAllByText("Insert 12 into bucket 2.").length).toBeGreaterThan(0);
  });

  it("disables learning mode for unsupported algorithm selections", () => {
    render(<SortingVisualizer {...props} />);
    fireEvent.change(screen.getByLabelText("Sorting algorithm"), { target: { value: "quick_sort" } });
    expect((screen.getByRole("checkbox", { name: "Learning mode" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Learning mode is not available for this algorithm yet")).toBeTruthy();
  });
});
