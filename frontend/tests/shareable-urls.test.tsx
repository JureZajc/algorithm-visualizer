import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AlgorithmVisualizer } from "@/components/algorithm-visualizer";
import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { DynamicProgrammingVisualizer } from "@/components/dynamic-programming-visualizer";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { HashTablesVisualizer } from "@/components/hash-tables-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingComparison } from "@/components/sorting-comparison";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { TreesVisualizer } from "@/components/trees-visualizer";
import * as api from "@/lib/api";
import { categoryQuery, INPUT_MEMORY_STORAGE_KEY, MAX_QUERY_VALUE_LENGTH, type QueryStateProps } from "@/lib/url-state";
import type { MetadataSourceProps, VisualizerMode } from "@/types/algorithm";

vi.mock("@/lib/api", () => ({
  fetchAlgorithms: vi.fn(),
  fetchBacktrackingSteps: vi.fn(),
  fetchDynamicProgrammingSteps: vi.fn(),
  fetchGraphSteps: vi.fn(),
  fetchHashTableSteps: vi.fn(),
  fetchSearchingSteps: vi.fn(),
  fetchSortingSteps: vi.fn(),
  fetchTreeSteps: vi.fn(),
  generateRandomNumbers: vi.fn(),
}));

// Outside a Next.js router, read the query from the jsdom address.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

type Category = ComponentType<MetadataSourceProps & QueryStateProps>;

const props = { algorithms: [], isMetadataLoading: false, metadataError: null };

function select(name: string | RegExp) {
  return screen.getByRole("combobox", { name }) as HTMLSelectElement;
}

function field(label: RegExp) {
  return screen.getByLabelText(label) as HTMLInputElement;
}

function barValues() {
  return screen.getAllByTitle(/^Index \d+: /).map((bar) => bar.getAttribute("title")!.split(": ")[1]);
}

function tab(name: string) {
  return screen.getByRole("navigation", { name: "Visualizer mode" }).querySelector(`button[aria-label="${name}"]`) as HTMLButtonElement;
}

/** No run has started: no steps were requested and no numbers were generated. */
function expectNoRequests() {
  for (const [name, request] of Object.entries(api)) {
    if (name !== "fetchAlgorithms") expect(request).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
  // Metadata never arrives, so no state changes after the test ends.
  vi.mocked(api.fetchAlgorithms).mockReturnValue(new Promise(() => {}));
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

/** A query each category restores, written the way the category writes it back. */
const RESTORES: { name: string; component: Category; query: string; check: () => void }[] = [
  {
    name: "Sorting",
    component: SortingVisualizer,
    query: "algorithm=quick_sort&numbers=5,9,1,7,3",
    check: () => {
      expect(select("Sorting algorithm").value).toBe("quick_sort");
      expect(barValues()).toEqual(["5", "9", "1", "7", "3"]);
      expect(field(/^Random values/).value).toBe("5");
    },
  },
  {
    name: "Compare",
    component: SortingComparison,
    query: "algorithms=merge_sort,heap_sort&numbers=5,9,1,7,3,2",
    check: () => {
      const checked = screen.getAllByRole("checkbox").filter((box) => (box as HTMLInputElement).checked);
      expect(checked.map((box) => box.parentElement?.textContent)).toEqual(["Merge Sort", "Heap Sort"]);
      expect(screen.getByText("[5, 9, 1, 7, 3, 2]")).toBeTruthy();
      expect(field(/^Random values/).value).toBe("6");
    },
  },
  {
    name: "Searching",
    component: SearchingVisualizer,
    query: "algorithm=binary_search&numbers=1,3,5,7,9&target=7",
    check: () => {
      expect(select("Searching algorithm").value).toBe("binary_search");
      expect(barValues()).toEqual(["1", "3", "5", "7", "9"]);
      expect(field(/^Target value/).value).toBe("7");
    },
  },
  {
    name: "Graph",
    component: GraphVisualizer,
    query: "algorithm=dijkstra&graph=weighted-graph&start=B&target=E&directed=true",
    check: () => {
      expect(select("Graph").value).toBe("weighted-graph");
      expect(select("Algorithm").value).toBe("dijkstra");
      expect(select("Start node").value).toBe("B");
      expect(select("Target node").value).toBe("E");
      expect((screen.getByRole("checkbox", { name: /Directed graph/ }) as HTMLInputElement).checked).toBe(true);
    },
  },
  {
    name: "Graph (custom)",
    component: GraphVisualizer,
    query: "algorithm=bfs&graph=custom&nodes=P:100:100,Q:300:200,R:500:300&edges=P:Q:3,Q:R:1.5&start=Q&target=R&directed=false",
    check: () => {
      expect(select("Graph").value).toBe("custom");
      expect(screen.getAllByRole("button", { name: /^Remove node / }).map((button) => button.getAttribute("aria-label"))).toEqual(["Remove node P", "Remove node Q", "Remove node R"]);
      expect((screen.getByLabelText("Weight for edge Q to R") as HTMLInputElement).value).toBe("1.5");
      expect(select(/^Start node/).value).toBe("Q");
      expect(select(/^Target node/).value).toBe("R");
    },
  },
  {
    name: "Dynamic Programming",
    component: DynamicProgrammingVisualizer,
    query: "algorithm=knapsack&weights=1,2,3&values=6,10,12&capacity=5",
    check: () => {
      expect(select("Dynamic programming algorithm").value).toBe("knapsack");
      expect(field(/^Weights/).value).toBe("1, 2, 3");
      expect(field(/^Values/).value).toBe("6, 10, 12");
      expect(field(/^Capacity/).value).toBe("5");
    },
  },
  {
    name: "Backtracking (maze)",
    component: BacktrackingVisualizer,
    query: "algorithm=maze_solver&rows=3&cols=4&maze=open&grid=s.x.,..x.,...e",
    check: () => {
      expect(select("Backtracking algorithm").value).toBe("maze_solver");
      expect(select("Maze pattern").value).toBe("open");
      expect(field(/^Rows/).value).toBe("3");
      expect(screen.getByRole("button", { name: "Edit row 1, column 3: wall" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Edit row 3, column 4: end" })).toBeTruthy();
    },
  },
  {
    name: "Backtracking (Sudoku)",
    component: BacktrackingVisualizer,
    query: "algorithm=sudoku_solver&board=12.......,.........,.........,.........,.........,.........,.........,.........,........9",
    check: () => {
      expect(select("Backtracking algorithm").value).toBe("sudoku_solver");
      expect(field(/^Sudoku row 1, column 2$/).value).toBe("2");
      expect(field(/^Sudoku row 1, column 3$/).value).toBe("");
      expect(field(/^Sudoku row 9, column 9$/).value).toBe("9");
    },
  },
  {
    name: "Backtracking (subsets)",
    component: BacktrackingVisualizer,
    query: "algorithm=subsets&values=red,green,light+blue",
    check: () => {
      expect(select("Backtracking algorithm").value).toBe("subsets");
      expect(field(/^Comma-separated values/).value).toBe("red, green, light blue");
    },
  },
  {
    name: "Trees",
    component: TreesVisualizer,
    query: "algorithm=bst_search&values=5,3,8,1&target=8",
    check: () => {
      expect(select("Tree algorithm").value).toBe("bst_search");
      expect(field(/^Values/).value).toBe("5, 3, 8, 1");
      expect(field(/^Target/).value).toBe("8");
    },
  },
  {
    name: "Hash Tables",
    component: HashTablesVisualizer,
    query: "algorithm=hash_search_linear_probing&values=12,apple,-7&table_size=11&target=apple",
    check: () => {
      expect(select("Hash table operation").value).toBe("hash_search_linear_probing");
      expect(field(/^Values/).value).toBe("12, apple, -7");
      expect(field(/^Table size/).value).toBe("11");
      expect(field(/^Target/).value).toBe("apple");
    },
  },
];

const CATEGORIES: { name: string; component: Category }[] = [
  { name: "Sorting", component: SortingVisualizer },
  { name: "Compare", component: SortingComparison },
  { name: "Searching", component: SearchingVisualizer },
  { name: "Graph", component: GraphVisualizer },
  { name: "Dynamic Programming", component: DynamicProgrammingVisualizer },
  { name: "Backtracking", component: BacktrackingVisualizer },
  { name: "Trees", component: TreesVisualizer },
  { name: "Hash Tables", component: HashTablesVisualizer },
];

/** The query a category reports for its defaults. */
function defaultQuery(Component: Category) {
  const onQueryChange = vi.fn();
  const { unmount } = render(<Component {...props} onQueryChange={onQueryChange} />);
  unmount();
  return onQueryChange.mock.lastCall?.[0] as string;
}

describe("restoring a category from a query", () => {
  it.each(RESTORES)("$name loads the algorithm and input without starting a run", ({ component: Component, query, check }) => {
    const onQueryChange = vi.fn();
    render(<Component {...props} initialQuery={query} onQueryChange={onQueryChange} />);

    check();
    expectNoRequests();
    expect(screen.queryByText(/^Step \d+ \/ [1-9]/)).toBeNull();
    // The restored input writes the same query back.
    expect(onQueryChange).toHaveBeenLastCalledWith(query);
  });

  it.each(CATEGORIES)("$name falls back to its defaults for invalid values", ({ component: Component }) => {
    const expected = defaultQuery(Component);
    const onQueryChange = vi.fn();
    const invalid = "algorithm=bogus&algorithms=bubble_sort&numbers=1,x&values=,,&target=&graph=nowhere&table_size=0&board=12";
    render(<Component {...props} initialQuery={invalid} onQueryChange={onQueryChange} />);
    expect(onQueryChange).toHaveBeenLastCalledWith(expected);
    expectNoRequests();
  });

  it.each(CATEGORIES)("$name ignores values over the length cap", ({ component: Component }) => {
    const expected = defaultQuery(Component);
    const long = "1,".repeat(MAX_QUERY_VALUE_LENGTH);
    const oversized = ["algorithm", "algorithms", "numbers", "values", "target", "graph", "table_size", "board"]
      .map((key) => `${key}=${long}`)
      .join("&");
    const onQueryChange = vi.fn();
    render(<Component {...props} initialQuery={oversized} onQueryChange={onQueryChange} />);
    expect(onQueryChange).toHaveBeenLastCalledWith(expected);
  });

  it("reports each input change", () => {
    const onQueryChange = vi.fn();
    render(<TreesVisualizer {...props} onQueryChange={onQueryChange} />);
    fireEvent.change(select("Tree algorithm"), { target: { value: "bst_search" } });
    fireEvent.change(field(/^Values/), { target: { value: "4, 2, 6" } });
    expect(onQueryChange).toHaveBeenLastCalledWith("algorithm=bst_search&values=4,2,6&target=7");
  });
});

describe("the address bar", () => {
  it("restores the category, algorithm, and input from the address without a run", () => {
    window.history.replaceState(null, "", "/?category=trees&algorithm=bst_search&values=5,3,8&target=8");
    render(<AlgorithmVisualizer />);

    expect(tab("Trees").getAttribute("aria-current")).toBe("page");
    expect(tab("Sorting").getAttribute("aria-current")).toBeNull();
    expect(select("Tree algorithm").value).toBe("bst_search");
    expect(field(/^Values/).value).toBe("5, 3, 8");
    expect(field(/^Target/).value).toBe("8");
    expect(api.fetchTreeSteps).not.toHaveBeenCalled();
  });

  it("keeps the address in step with the input, without adding history entries", async () => {
    const historyLength = window.history.length;
    render(<AlgorithmVisualizer />);
    await waitFor(() => expect(window.location.search).toBe("?category=sorting&algorithm=bubble_sort&numbers=42,17,83,29,64,8,51,36,75,23,92,58"));

    fireEvent.change(select("Sorting algorithm"), { target: { value: "merge_sort" } });
    await waitFor(() => expect(window.location.search).toContain("algorithm=merge_sort"));

    // A category switch is written at once, so a reload right after it keeps the category.
    fireEvent.click(tab("Hash Tables"));
    expect(window.location.search).toBe("?category=hash_tables&algorithm=hash_insert_chaining&values=12,22,32,5&table_size=10");
    expect(window.history.length).toBe(historyLength);
  });

  it("falls back to Sorting for an unknown category and rewrites the address", async () => {
    window.history.replaceState(null, "", "/?category=nowhere&algorithm=heap_sort");
    render(<AlgorithmVisualizer />);
    expect(tab("Sorting").getAttribute("aria-current")).toBe("page");
    expect(select("Sorting algorithm").value).toBe("heap_sort");
    await waitFor(() => expect(window.location.search).toMatch(/^\?category=sorting&algorithm=heap_sort&/));
  });

  it("does not break on an oversized address", async () => {
    window.history.replaceState(null, "", `/?category=graph&algorithm=dfs&graph=custom&nodes=${"A:1:1,".repeat(5_000)}`);
    render(<AlgorithmVisualizer />);
    expect(tab("Graph / Pathfinding").getAttribute("aria-current")).toBe("page");
    expect(select("Algorithm").value).toBe("dfs");
    expect(select("Graph").value).toBe("simple-path");
    await waitFor(() => expect(window.location.search).toBe("?category=graph&algorithm=dfs&graph=simple-path&start=A&target=E&directed=false"));
  });
});

/** Changes one input in each category and checks it after a reload or a category switch. */
const EDITS: { tab: string; category: VisualizerMode; edit: () => void; check: () => void }[] = [
  {
    tab: "Sorting",
    category: "sorting",
    edit: () => fireEvent.change(select("Sorting algorithm"), { target: { value: "shell_sort" } }),
    check: () => expect(select("Sorting algorithm").value).toBe("shell_sort"),
  },
  {
    tab: "Compare",
    category: "compare",
    edit: () => fireEvent.click(screen.getByRole("checkbox", { name: "Quick Sort" })),
    check: () => expect((screen.getByRole("checkbox", { name: "Quick Sort" }) as HTMLInputElement).checked).toBe(true),
  },
  {
    tab: "Searching",
    category: "searching",
    edit: () => fireEvent.change(field(/^Target value/), { target: { value: "23" } }),
    check: () => expect(field(/^Target value/).value).toBe("23"),
  },
  {
    tab: "Graph / Pathfinding",
    category: "graph",
    edit: () => fireEvent.change(select("Target node"), { target: { value: "C" } }),
    check: () => expect(select("Target node").value).toBe("C"),
  },
  {
    tab: "Dynamic Programming",
    category: "dynamic_programming",
    edit: () => fireEvent.change(field(/^n/), { target: { value: "13" } }),
    check: () => expect(field(/^n/).value).toBe("13"),
  },
  {
    tab: "Backtracking",
    category: "backtracking",
    edit: () => fireEvent.change(field(/^Board size/), { target: { value: "6" } }),
    check: () => expect(field(/^Board size/).value).toBe("6"),
  },
  {
    tab: "Trees",
    category: "trees",
    edit: () => fireEvent.change(field(/^Values/), { target: { value: "4, 2, 6" } }),
    check: () => expect(field(/^Values/).value).toBe("4, 2, 6"),
  },
  {
    tab: "Hash Tables",
    category: "hash_tables",
    edit: () => fireEvent.change(field(/^Table size/), { target: { value: "13" } }),
    check: () => expect(field(/^Table size/).value).toBe("13"),
  },
];

describe("copied addresses and session memory", () => {
  it.each(EDITS)("an address copied from $tab opens with the same input in a new tab", async ({ tab: name, category, edit, check }) => {
    const first = render(<AlgorithmVisualizer />);
    fireEvent.click(tab(name));
    edit();
    check();
    // The session memory has the edited input at once; the address follows once input settles.
    const remembered = JSON.parse(window.sessionStorage.getItem(INPUT_MEMORY_STORAGE_KEY)!)[category];
    await waitFor(() => expect(window.location.search).toBe(`?${categoryQuery(category, remembered)}`));
    const copied = `${window.location.pathname}${window.location.search}`;
    first.unmount();

    // A new tab has the address and nothing else.
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    window.history.replaceState(null, "", copied);
    render(<AlgorithmVisualizer />);
    expect(tab(name).getAttribute("aria-current")).toBe("page");
    check();
    expectNoRequests();
  });

  it("restores each category's input after switching away and back", () => {
    render(<AlgorithmVisualizer />);
    for (const { tab: name, edit } of EDITS) {
      fireEvent.click(tab(name));
      edit();
    }
    for (const { tab: name, check } of [...EDITS].reverse()) {
      fireEvent.click(tab(name));
      check();
    }
    expect(Object.keys(JSON.parse(window.sessionStorage.getItem(INPUT_MEMORY_STORAGE_KEY)!)).sort()).toEqual(
      ["backtracking", "compare", "dynamic_programming", "graph", "hash_tables", "searching", "sorting", "trees"],
    );
    expectNoRequests();
  });

  it("remembers inputs in memory when session storage is unavailable", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is disabled.", "SecurityError");
    });
    render(<AlgorithmVisualizer />);
    const trees = EDITS.find((item) => item.tab === "Trees")!;
    fireEvent.click(tab("Trees"));
    trees.edit();
    fireEvent.click(tab("Sorting"));
    fireEvent.click(tab("Trees"));
    trees.check();
    await waitFor(() => expect(window.location.search).toBe("?category=trees&algorithm=bst_insert&values=4,2,6"));
  });
});
