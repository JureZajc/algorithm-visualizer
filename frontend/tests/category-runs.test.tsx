import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { DynamicProgrammingVisualizer } from "@/components/dynamic-programming-visualizer";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { HashTablesVisualizer } from "@/components/hash-tables-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingComparison } from "@/components/sorting-comparison";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { TreesVisualizer } from "@/components/trees-visualizer";
import { RUN_TIMEOUT_MS, runTimeoutMessage } from "@/hooks/use-visualization-run";
import * as api from "@/lib/api";
import type { MetadataSourceProps } from "@/types/algorithm";

vi.mock("@/lib/api", () => ({
  fetchBacktrackingSteps: vi.fn(),
  fetchDynamicProgrammingSteps: vi.fn(),
  fetchGraphSteps: vi.fn(),
  fetchHashTableSteps: vi.fn(),
  fetchSearchingSteps: vi.fn(),
  fetchSortingSteps: vi.fn(),
  fetchTreeSteps: vi.fn(),
  generateRandomNumbers: vi.fn(),
}));

/** Each category's request function, started by its "Start visualization" button. */
const CATEGORIES: { name: string; component: ComponentType<MetadataSourceProps>; request: () => Mock }[] = [
  { name: "Sorting", component: SortingVisualizer, request: () => vi.mocked(api.fetchSortingSteps) },
  { name: "Searching", component: SearchingVisualizer, request: () => vi.mocked(api.fetchSearchingSteps) },
  { name: "Graph", component: GraphVisualizer, request: () => vi.mocked(api.fetchGraphSteps) },
  { name: "Dynamic Programming", component: DynamicProgrammingVisualizer, request: () => vi.mocked(api.fetchDynamicProgrammingSteps) },
  { name: "Backtracking", component: BacktrackingVisualizer, request: () => vi.mocked(api.fetchBacktrackingSteps) },
  { name: "Trees", component: TreesVisualizer, request: () => vi.mocked(api.fetchTreeSteps) },
  { name: "Hash Tables", component: HashTablesVisualizer, request: () => vi.mocked(api.fetchHashTableSteps) },
];

const props = { algorithms: [], isMetadataLoading: false, metadataError: null };

/** A request that never settles on its own and records the signal it was given. */
function stalledRequest() {
  const signals: AbortSignal[] = [];
  const request = vi.fn((...args: unknown[]) => {
    signals.push(args.at(-1) as AbortSignal);
    return new Promise<never>(() => {});
  });
  return { request, signals };
}

/** The run's error, apart from other alerts on the page such as missing metadata. */
function runError() {
  return screen.queryAllByRole("alert")
    .map((alert) => alert.textContent ?? "")
    .find((text) => text.startsWith("Visualization unavailable"))
    ?.slice("Visualization unavailable".length) ?? null;
}

function startButton() {
  return screen.getByRole("button", { name: /Start visualization|Loading steps/ }) as HTMLButtonElement;
}

beforeEach(() => {
  for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
});

describe("category runs", () => {
  it("Sorting ends a stalled run with the timeout message and re-enables Start", async () => {
    vi.useFakeTimers();
    const stalled = stalledRequest();
    vi.mocked(api.fetchSortingSteps).mockImplementation(stalled.request);
    render(<SortingVisualizer {...props} />);

    fireEvent.click(startButton());
    expect(startButton().textContent).toBe("Loading steps...");
    expect(startButton().disabled).toBe(true);
    expect(screen.getByRole("region", { name: "Bubble Sort" }).getAttribute("aria-busy")).toBe("true");

    await act(() => vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS));
    expect(runError()).toBe(runTimeoutMessage(RUN_TIMEOUT_MS));
    expect(startButton().textContent).toBe("Start visualization");
    expect(startButton().disabled).toBe(false);
    expect(stalled.signals[0].aborted).toBe(true);
  });

  it.each(CATEGORIES)("$name cancels its request when the category unmounts", ({ component: Component, request }) => {
    const stalled = stalledRequest();
    request().mockImplementation(stalled.request);
    const { unmount } = render(<Component {...props} />);

    fireEvent.click(startButton());
    expect(request()).toHaveBeenCalledTimes(1);
    expect(stalled.signals[0].aborted).toBe(false);
    unmount();
    expect(stalled.signals[0].aborted).toBe(true);
  });

  it.each(CATEGORIES)("$name shows the backend's error and clears it on the next run", async ({ component: Component, request }) => {
    request().mockRejectedValueOnce(new Error("The backend returned status 503."));
    request().mockImplementationOnce(stalledRequest().request);
    render(<Component {...props} />);

    fireEvent.click(startButton());
    await waitFor(() => expect(runError()).toBe("The backend returned status 503."));
    expect(screen.getAllByText("Error").length).toBeGreaterThan(0);

    fireEvent.click(startButton());
    expect(runError()).toBeNull();
  });

  it("Sorting keeps the generated values when the steps request fails", async () => {
    vi.mocked(api.generateRandomNumbers).mockResolvedValue({ numbers: [9, 4, 7, 1, 5] });
    vi.mocked(api.fetchSortingSteps).mockRejectedValue(new Error("The backend returned status 500."));
    render(<SortingVisualizer {...props} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: /Random values/ }), { target: { value: "5" } });
    fireEvent.click(startButton());

    await waitFor(() => expect(runError()).toBe("The backend returned status 500."));
    expect(api.generateRandomNumbers).toHaveBeenCalledWith(5, expect.any(AbortSignal));
    expect(api.fetchSortingSteps).toHaveBeenCalledWith([9, 4, 7, 1, 5], "bubble_sort", expect.any(AbortSignal));
    expect(screen.getByTitle("Index 0: 9")).toBeTruthy();
  });
});

describe("Compare runs", () => {
  const compareButton = () => screen.getByRole("button", { name: /Run comparison|Comparing/ }) as HTMLButtonElement;

  it("cancels every request of the comparison when the view unmounts", () => {
    const stalled = stalledRequest();
    vi.mocked(api.fetchSortingSteps).mockImplementation(stalled.request);
    const { unmount } = render(<SortingComparison {...props} />);

    fireEvent.click(compareButton());
    expect(compareButton().textContent).toBe("Comparing...");
    expect(stalled.signals).toHaveLength(3);
    expect(stalled.signals.every((signal) => !signal.aborted)).toBe(true);
    unmount();
    expect(stalled.signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("ends a stalled comparison with the timeout message", async () => {
    vi.useFakeTimers();
    vi.mocked(api.fetchSortingSteps).mockImplementation(stalledRequest().request);
    render(<SortingComparison {...props} />);

    fireEvent.click(compareButton());
    await act(() => vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS));
    const alert = screen.getAllByRole("alert").find((item) => item.textContent?.startsWith("Comparison unavailable"));
    expect(alert?.textContent).toBe(`Comparison unavailable${runTimeoutMessage(RUN_TIMEOUT_MS)}`);
    expect(compareButton().disabled).toBe(false);
    expect(screen.getByRole("heading", { name: "Ready to compare" })).toBeTruthy();
  });

  it("names its control panel after its heading", () => {
    render(<SortingComparison {...props} />);
    expect(screen.getByRole("region", { name: "Compare algorithms on one shared array" })).toBeTruthy();
  });
});

describe("category controls", () => {
  it.each(CATEGORIES)("$name names its control panel and its visualization", ({ component: Component }) => {
    render(<Component {...props} />);
    const controls = screen.getByRole("region", { name: /controls$/ });
    expect(controls.textContent).toContain("Start visualization");
    // The visualization region takes its name from its heading, the algorithm's name.
    const title = screen.getAllByRole("heading", { level: 2 })[0];
    const visualization = screen.getByRole("region", { name: title.textContent ?? "" });
    expect(visualization.getAttribute("aria-labelledby")).toBe(title.id);
  });

  it.each(CATEGORIES)("$name uses one speed slider with a 44px box", ({ component: Component }) => {
    render(<Component {...props} />);
    const sliders = screen.getAllByRole("slider", { name: /Animation speed/ });
    expect(sliders).toHaveLength(1);
    expect(sliders[0].className.split(" ")).toContain("h-11");
    expect(sliders[0].getAttribute("aria-valuetext")).toMatch(/^\d+ milliseconds per step$/);
  });

  it("Trees shows an empty state until a run draws the tree", async () => {
    const tree = { value: 8, left: null, right: null };
    vi.mocked(api.fetchTreeSteps).mockResolvedValue({
      algorithm: "bst_insert",
      input: { values: [8] },
      steps: [{ type: "done", tree, current_node: 8, visited: [], path: [], description: "Tree complete.", pseudocode_line: null, result: null }],
      step_count: 1,
    } as unknown as Awaited<ReturnType<typeof api.fetchTreeSteps>>);
    render(<TreesVisualizer {...props} />);

    expect(screen.getByText("No tree yet")).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Binary search tree visualization" })).toBeNull();

    fireEvent.click(startButton());
    await waitFor(() => expect(screen.getByRole("img", { name: "Binary search tree visualization" })).toBeTruthy());
    expect(screen.queryByText("No tree yet")).toBeNull();
  });

  it("Backtracking marks the selected maze tool as pressed", () => {
    render(<BacktrackingVisualizer {...props} />);
    fireEvent.change(screen.getByLabelText("Backtracking algorithm"), { target: { value: "maze_solver" } });
    const tools = screen.getByRole("group", { name: "Maze editing tool" });
    const pressed = () => Array.from(tools.querySelectorAll("button")).filter((button) => button.getAttribute("aria-pressed") === "true").map((button) => button.textContent);

    expect(pressed()).toEqual(["Wall"]);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(pressed()).toEqual(["Start"]);
    expect(screen.getByRole("button", { name: "End", pressed: false })).toBeTruthy();
  });
});
