import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { GraphVisualizer } from "@/components/graph-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { RUN_TIMEOUT_MS, runTimeoutMessage } from "@/hooks/use-visualization-run";
import * as api from "@/lib/api";
import type { MetadataSourceProps } from "@/types/algorithm";

vi.mock("@/lib/api", () => ({
  fetchGraphSteps: vi.fn(),
  fetchSearchingSteps: vi.fn(),
  fetchSortingSteps: vi.fn(),
  generateRandomNumbers: vi.fn(),
}));

/** Each category's request function, started by its "Start visualization" button. */
const CATEGORIES: { name: string; component: ComponentType<MetadataSourceProps>; request: () => Mock }[] = [
  { name: "Sorting", component: SortingVisualizer, request: () => vi.mocked(api.fetchSortingSteps) },
  { name: "Searching", component: SearchingVisualizer, request: () => vi.mocked(api.fetchSearchingSteps) },
  { name: "Graph", component: GraphVisualizer, request: () => vi.mocked(api.fetchGraphSteps) },
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
