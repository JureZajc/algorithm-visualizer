import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_FIELDS as BACKTRACKING_DEFAULT_FIELDS, INITIAL_FORM as BACKTRACKING_INITIAL_FORM } from "@/lib/backtracking-input";
import { DEFAULT_SUDOKU_BOARD } from "@/lib/backtracking-presets";
import { DEFAULT_FIELDS as DYNAMIC_PROGRAMMING_DEFAULT_FIELDS, INITIAL_FORM as DYNAMIC_PROGRAMMING_INITIAL_FORM } from "@/lib/dynamic-programming-input";
import { GRAPH_PRESETS } from "@/lib/graph-presets";
import {
  backtrackingQuery,
  categoryQuery,
  compareQuery,
  createInputMemory,
  CUSTOM_GRAPH_ID,
  dynamicProgrammingQuery,
  graphFromPreset,
  graphQuery,
  hashTablesQuery,
  INPUT_MEMORY_STORAGE_KEY,
  MAX_GRAPH_QUERY_VALUE_LENGTH,
  MAX_QUERY_VALUE_LENGTH,
  parseBacktrackingQuery,
  parseCompareQuery,
  parseDynamicProgrammingQuery,
  parseGraphQuery,
  parseHashTablesQuery,
  parseSearchingQuery,
  parseSortingQuery,
  parseTreesQuery,
  replaceQuery,
  searchingQuery,
  sortingQuery,
  treesQuery,
  type BacktrackingQueryState,
  type GraphQueryState,
} from "@/lib/url-state";
import type { BacktrackingCell, SudokuBoard } from "@/types/backtracking";

const FIRST_PRESET = GRAPH_PRESETS[0];
const WEIGHTED = GRAPH_PRESETS.find((preset) => preset.id === "weighted-graph")!;
const DEFAULT_GRAPH = { graphId: FIRST_PRESET.id, graph: graphFromPreset(FIRST_PRESET) };

/** A Storage backed by a Map, with hooks to make it fail. */
function fakeStorage(options: { failGet?: boolean; failSet?: boolean } = {}) {
  const items = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => {
      if (options.failGet) throw new DOMException("Blocked", "SecurityError");
      return items.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (options.failSet) throw new DOMException("Full", "QuotaExceededError");
      items.set(key, value);
    }),
  };
  return { items, storage: storage as unknown as Storage };
}

function mazeGrid(rows: string[]): BacktrackingCell[][] {
  const cells: Record<string, BacktrackingCell> = { ".": "empty", x: "wall", s: "start", e: "end" };
  return rows.map((row) => [...row].map((code) => cells[code]));
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("query round trips", () => {
  it("writes sorting input with readable commas and reads it back", () => {
    const state = { algorithm: "quick_sort" as const, numbers: [5, -3, 1_000_000, 0, 42] };
    const query = sortingQuery(state);
    expect(query).toBe("algorithm=quick_sort&numbers=5,-3,1000000,0,42");
    expect(parseSortingQuery(query)).toEqual(state);
  });

  it("round-trips the compared algorithms and their shared input", () => {
    const state = { algorithms: ["merge_sort" as const, "heap_sort" as const, "counting_sort" as const], numbers: [9, 4, 7, 1, 5, 3] };
    const query = compareQuery(state);
    expect(query).toBe("algorithms=merge_sort,heap_sort,counting_sort&numbers=9,4,7,1,5,3");
    expect(parseCompareQuery(query)).toEqual(state);
  });

  it("round-trips a search and sorts the values for Binary Search", () => {
    const state = { algorithm: "binary_search" as const, numbers: [5, 12, 19, 27, 36], target: "19" };
    expect(parseSearchingQuery(searchingQuery(state))).toEqual(state);
    expect(parseSearchingQuery("algorithm=binary_search&numbers=36,5,27,12,19&target=19").numbers).toEqual([5, 12, 19, 27, 36]);
    expect(parseSearchingQuery("algorithm=linear_search&numbers=36,5,27,12,19").numbers).toEqual([36, 5, 27, 12, 19]);
  });

  it("writes a preset graph by ID with its endpoints and direction", () => {
    const state: GraphQueryState = {
      algorithm: "dijkstra",
      graphId: WEIGHTED.id,
      graph: { ...graphFromPreset(WEIGHTED), start: "B", target: "E", directed: true },
    };
    const query = graphQuery(state);
    expect(query).toBe("algorithm=dijkstra&graph=weighted-graph&start=B&target=E&directed=true");
    expect(parseGraphQuery(query)).toEqual(state);
  });

  it("round-trips a custom graph whose node IDs contain separators", () => {
    const graph = {
      nodes: [{ id: "A", x: 80, y: 90 }, { id: "node, 2", x: 300, y: 200 }, { id: "x:y", x: 500, y: 320 }, { id: "Ä 100%", x: 600, y: 100 }],
      edges: [
        { source: "A", target: "node, 2", weight: 1.5 },
        { source: "node, 2", target: "x:y", weight: -2 },
        { source: "x:y", target: "Ä 100%", weight: 1e-7 },
      ],
      start: "node, 2",
      target: "Ä 100%",
      directed: true,
      description: "Create a graph, choose its start and target nodes, then run an algorithm.",
    };
    const state: GraphQueryState = { algorithm: "bfs", graphId: CUSTOM_GRAPH_ID, graph };
    const query = graphQuery(state);
    expect(query.startsWith("algorithm=bfs&graph=custom&nodes=A:80:90,node%252C%25202:300:200,")).toBe(true);
    expect(parseGraphQuery(query)).toEqual(state);
  });

  it("rounds custom node positions and keeps an empty custom graph", () => {
    const graph = { ...graphFromPreset(FIRST_PRESET), nodes: [{ id: "A", x: 75.4, y: 204.6 }], edges: [], start: "A", target: "A" };
    expect(parseGraphQuery(graphQuery({ algorithm: "bfs", graphId: CUSTOM_GRAPH_ID, graph })).graph?.nodes).toEqual([{ id: "A", x: 75, y: 205 }]);
    const empty = parseGraphQuery("graph=custom");
    expect(empty.graphId).toBe(CUSTOM_GRAPH_ID);
    expect(empty.graph).toMatchObject({ nodes: [], edges: [], start: "", target: "" });
  });

  it("writes only the chosen dynamic programming algorithm's fields", () => {
    const form = { ...DYNAMIC_PROGRAMMING_INITIAL_FORM, weights: "1, 2, 3", values: "6, 10, 12", capacity: "5" };
    const query = dynamicProgrammingQuery({ algorithm: "knapsack", form });
    expect(query).toBe("algorithm=knapsack&weights=1,2,3&values=6,10,12&capacity=5");
    expect(parseDynamicProgrammingQuery(query)).toEqual({ algorithm: "knapsack", form });
  });

  it("keeps spaces inside dynamic programming strings", () => {
    const form = { ...DYNAMIC_PROGRAMMING_INITIAL_FORM, ...DYNAMIC_PROGRAMMING_DEFAULT_FIELDS.lcs, textA: "AB CD", textB: "" };
    expect(parseDynamicProgrammingQuery(dynamicProgrammingQuery({ algorithm: "lcs", form }))).toEqual({ algorithm: "lcs", form });
  });

  it("round-trips an edited maze", () => {
    const grid = mazeGrid(["s..", "xx.", "e.."]);
    const state: BacktrackingQueryState = {
      algorithm: "maze_solver",
      form: { ...BACKTRACKING_INITIAL_FORM, rows: "3", cols: "3", preset: "open" },
      mazeGrid: grid,
    };
    const query = backtrackingQuery(state);
    expect(query).toBe("algorithm=maze_solver&rows=3&cols=3&maze=open&grid=s..,xx.,e..");
    expect(parseBacktrackingQuery(query)).toEqual(state);
  });

  it("round-trips a Sudoku puzzle and list values", () => {
    const board = DEFAULT_SUDOKU_BOARD.map((row) => row.slice()) as SudokuBoard;
    board[0][2] = "4";
    const sudoku: BacktrackingQueryState = { algorithm: "sudoku_solver", form: { ...BACKTRACKING_INITIAL_FORM }, sudokuBoard: board };
    expect(backtrackingQuery(sudoku)).toContain("&board=534.7..1.,6..195.4.,");
    expect(parseBacktrackingQuery(backtrackingQuery(sudoku))).toEqual(sudoku);

    const subsets: BacktrackingQueryState = { algorithm: "subsets", form: { ...BACKTRACKING_INITIAL_FORM, values: "red, light blue, green" } };
    expect(backtrackingQuery(subsets)).toBe("algorithm=subsets&values=red,light+blue,green");
    expect(parseBacktrackingQuery(backtrackingQuery(subsets))).toEqual(subsets);
  });

  it("writes a tree search target only when there is one", () => {
    expect(treesQuery({ algorithm: "bst_insert", values: "8, 3, 10" })).toBe("algorithm=bst_insert&values=8,3,10");
    const search = { algorithm: "bst_search" as const, values: "8, 3, 10", target: "3" };
    expect(parseTreesQuery(treesQuery(search))).toEqual(search);
  });

  it("round-trips hash table keys, size, and target", () => {
    const state = { algorithm: "hash_search_linear_probing" as const, values: "12, apple, -7, banana split", tableSize: "11", target: "apple" };
    const query = hashTablesQuery(state);
    expect(query).toBe("algorithm=hash_search_linear_probing&values=12,apple,-7,banana+split&table_size=11&target=apple");
    expect(parseHashTablesQuery(query)).toEqual(state);
  });

  it("puts the category first", () => {
    expect(categoryQuery("trees", "algorithm=bst_insert")).toBe("category=trees&algorithm=bst_insert");
    expect(categoryQuery("trees", "")).toBe("category=trees");
  });
});

describe("invalid values fall back to the defaults", () => {
  it("reads nothing from a missing or empty query", () => {
    expect(parseSortingQuery()).toEqual({});
    expect(parseSortingQuery("")).toEqual({});
    expect(parseDynamicProgrammingQuery()).toEqual({});
    expect(parseGraphQuery()).toEqual(DEFAULT_GRAPH);
  });

  it("ignores unknown algorithms, including names from Object.prototype", () => {
    for (const algorithm of ["bogus", "constructor", "__proto__", "toString", ""]) {
      const query = `algorithm=${algorithm}`;
      expect(parseSortingQuery(query).algorithm).toBeUndefined();
      expect(parseSearchingQuery(query).algorithm).toBeUndefined();
      expect(parseGraphQuery(query).algorithm).toBeUndefined();
      expect(parseDynamicProgrammingQuery(query)).toEqual({});
      expect(parseBacktrackingQuery(query)).toEqual({});
      expect(parseTreesQuery(query).algorithm).toBeUndefined();
      expect(parseHashTablesQuery(query).algorithm).toBeUndefined();
    }
  });

  it("keeps valid values when another value is invalid", () => {
    expect(parseSortingQuery("algorithm=heap_sort&numbers=1,2,x,4,5")).toEqual({ algorithm: "heap_sort" });
    expect(parseSearchingQuery("algorithm=binary_search&numbers=1,2,3,4,5&target=abc")).toEqual({ algorithm: "binary_search", numbers: [1, 2, 3, 4, 5] });
  });

  it.each([
    ["too few values", "1,2,3,4"],
    ["too many values", Array.from({ length: 51 }, (_, index) => index).join(",")],
    ["a decimal", "1,2,3,4,5.5"],
    ["an empty entry", "1,2,,4,5"],
    ["a word", "1,2,three,4,5"],
    ["an unsafe integer", "1,2,3,4,9007199254740993"],
  ])("rejects sorting numbers with %s", (_, numbers) => {
    expect(parseSortingQuery(`numbers=${numbers}`).numbers).toBeUndefined();
  });

  it("applies each category's count limit", () => {
    const fortyFive = Array.from({ length: 45 }, (_, index) => index).join(",");
    expect(parseSortingQuery(`numbers=${fortyFive}`).numbers).toHaveLength(45);
    expect(parseSearchingQuery(`numbers=${fortyFive}`).numbers).toBeUndefined();
  });

  it.each([
    ["one algorithm", "bubble_sort"],
    ["five algorithms", "bubble_sort,selection_sort,insertion_sort,merge_sort,quick_sort"],
    ["a duplicate", "bubble_sort,bubble_sort"],
    ["an unknown algorithm", "bubble_sort,bogo_sort"],
  ])("rejects a comparison of %s", (_, algorithms) => {
    expect(parseCompareQuery(`algorithms=${algorithms}`).algorithms).toBeUndefined();
  });

  it("rejects empty and non-integer targets", () => {
    expect(parseSearchingQuery("target=").target).toBeUndefined();
    expect(parseSearchingQuery("target=1.5").target).toBeUndefined();
    expect(parseTreesQuery("target=+").target).toBeUndefined();
    expect(parseHashTablesQuery("target=%20").target).toBeUndefined();
  });

  it("falls back per graph value", () => {
    expect(parseGraphQuery("graph=unknown")).toEqual(DEFAULT_GRAPH);
    const graph = parseGraphQuery("graph=weighted-graph&start=Z&target=D&directed=yes").graph;
    expect(graph).toMatchObject({ start: WEIGHTED.defaultStart, target: "D", directed: false });
  });

  it.each([
    ["an edge to an unknown node", "nodes=A:10:10,B:20:20&edges=A:C:1"],
    ["a self-loop", "nodes=A:10:10&edges=A:A:1"],
    ["a weight that is not a number", "nodes=A:10:10,B:20:20&edges=A:B:heavy"],
    ["a missing position", "nodes=A:10"],
    ["a duplicate node", "nodes=A:10:10,A:20:20"],
    ["a node with extra parts", "nodes=A:10:10:10"],
    ["a malformed escape", "nodes=%25E0%25A4%25A:10:10"],
  ])("falls back to the default graph for a custom graph with %s", (_, query) => {
    expect(parseGraphQuery(`graph=custom&${query}`)).toEqual(DEFAULT_GRAPH);
  });

  it("uses the first node for an unknown custom endpoint", () => {
    const { graph } = parseGraphQuery("graph=custom&nodes=A:10:10,B:20:20&edges=A:B:1&start=Q&target=B");
    expect(graph).toMatchObject({ start: "A", target: "B" });
  });

  it("drops only the dynamic programming fields that are invalid", () => {
    expect(parseDynamicProgrammingQuery("algorithm=coin_change&coins=2,5&amount=999").form).toMatchObject({ coins: "2, 5", amount: "6" });
    expect(parseDynamicProgrammingQuery("algorithm=fibonacci&n=-1").form).toMatchObject({ n: "8" });
    expect(parseDynamicProgrammingQuery("algorithm=lcs&text_a=ABCDEFGHIJKLM&text_b=XY").form).toMatchObject({ textA: "ABCDEF", textB: "XY" });
  });

  it("uses the defaults when dynamic programming fields only fail together", () => {
    const { form } = parseDynamicProgrammingQuery("algorithm=knapsack&weights=1,2&values=3,4,5&capacity=9");
    expect(form).toEqual({ ...DYNAMIC_PROGRAMMING_INITIAL_FORM, ...DYNAMIC_PROGRAMMING_DEFAULT_FIELDS.knapsack });
  });

  it("drops invalid backtracking fields, maze cells, and puzzles", () => {
    expect(parseBacktrackingQuery("algorithm=n_queens&size=99").form).toMatchObject({ size: "4" });
    expect(parseBacktrackingQuery("algorithm=permutations&values=a,b,c,d,e,f,g").form).toMatchObject({ values: "A, B, C" });
    expect(parseBacktrackingQuery("algorithm=subsets&values=a,,b").form).toMatchObject({ values: "A, B, C" });

    const maze = parseBacktrackingQuery("algorithm=maze_solver&rows=3&cols=3&maze=spiral&grid=s..,...,..e");
    expect(maze.form).toMatchObject({ rows: "3", cols: "3", preset: BACKTRACKING_DEFAULT_FIELDS.maze_solver.preset });
    expect(maze.mazeGrid).toEqual(mazeGrid(["s..", "...", "..e"]));
    for (const grid of ["s..,...", "s..,...,..e.", "s..,.?.,..e", "s..,...,...", "s..,s..,..e", "...,...,..e"]) {
      expect(parseBacktrackingQuery(`algorithm=maze_solver&rows=3&cols=3&grid=${grid}`).mazeGrid).toBeUndefined();
    }

    const duplicate = DEFAULT_SUDOKU_BOARD.map((row) => row.join(""));
    duplicate[0] = "55..7....";
    expect(parseBacktrackingQuery(`algorithm=sudoku_solver&board=${duplicate.join(",")}`).sudokuBoard).toBeUndefined();
    expect(parseBacktrackingQuery("algorithm=sudoku_solver&board=123").sudokuBoard).toBeUndefined();
  });

  it("rejects invalid trees and hash table input", () => {
    expect(parseTreesQuery("values=5,3,5").values).toBeUndefined();
    expect(parseTreesQuery("values=5,,3").values).toBeUndefined();
    expect(parseHashTablesQuery("table_size=1").tableSize).toBeUndefined();
    expect(parseHashTablesQuery(`values=${Array.from({ length: 32 }, (_, index) => index).join(",")}`).values).toBeUndefined();
  });
});

describe("oversized values", () => {
  it("ignores a value longer than the cap without reading it", () => {
    const numbers = `${"1,".repeat(MAX_QUERY_VALUE_LENGTH / 2)}1`;
    expect(numbers.length).toBeGreaterThan(MAX_QUERY_VALUE_LENGTH);
    expect(parseSortingQuery(`algorithm=bubble_sort&numbers=${numbers}`)).toEqual({ algorithm: "bubble_sort" });
    expect(parseTreesQuery(`values=${"9".repeat(MAX_QUERY_VALUE_LENGTH + 1)}`).values).toBeUndefined();
    expect(parseDynamicProgrammingQuery(`algorithm=lcs&text_a=${"A".repeat(MAX_QUERY_VALUE_LENGTH + 1)}`).form).toMatchObject({ textA: "ABCDEF" });
    expect(parseGraphQuery(`algorithm=bfs&start=${"A".repeat(MAX_QUERY_VALUE_LENGTH + 1)}`)).toEqual({ algorithm: "bfs", ...DEFAULT_GRAPH });
  });

  it("allows longer custom graph lists, up to their own cap", () => {
    const nodes = Array.from({ length: 30 }, (_, index) => `node-number-${index}:${100 + index}:200`).join(",");
    const edges = Array.from({ length: 29 }, (_, index) => `node-number-${index}:node-number-${index + 1}:${index}`);
    const longEdges = [...edges, ...edges, ...edges, ...edges].join(",");
    expect(longEdges.length).toBeGreaterThan(MAX_QUERY_VALUE_LENGTH);
    expect(longEdges.length).toBeLessThan(MAX_GRAPH_QUERY_VALUE_LENGTH);
    expect(parseGraphQuery(`graph=custom&nodes=${nodes}&edges=${longEdges}`).graph?.edges).toHaveLength(116);
    expect(parseGraphQuery(`graph=custom&nodes=${nodes}&edges=${longEdges},${"x".repeat(MAX_GRAPH_QUERY_VALUE_LENGTH)}`)).toEqual(DEFAULT_GRAPH);
  });

  it("parses a very long query quickly and without throwing", () => {
    const huge = "9,".repeat(500_000);
    const query = `algorithm=bubble_sort&numbers=${huge}&values=${huge}&nodes=${huge}&graph=custom&board=${huge}&grid=${huge}`;
    const started = performance.now();
    expect(parseSortingQuery(query)).toEqual({ algorithm: "bubble_sort" });
    expect(parseTreesQuery(query).values).toBeUndefined();
    expect(parseGraphQuery(query)).toEqual(DEFAULT_GRAPH);
    expect(parseBacktrackingQuery(`algorithm=maze_solver&${query}`).mazeGrid).toBeUndefined();
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe("input memory", () => {
  it("keeps each category's last query in session storage", () => {
    const { items, storage } = fakeStorage();
    const memory = createInputMemory(() => storage);
    memory.set("trees", "algorithm=bst_search&values=1,2&target=2");
    memory.set("graph", "algorithm=dfs");
    memory.set("trees", "algorithm=avl_insert&values=3,4");

    expect(memory.get("trees")).toBe("algorithm=avl_insert&values=3,4");
    expect(memory.get("sorting")).toBeNull();
    expect(JSON.parse(items.get(INPUT_MEMORY_STORAGE_KEY)!)).toEqual({ trees: "algorithm=avl_insert&values=3,4", graph: "algorithm=dfs" });
    // A new page in the same tab reads it back.
    expect(createInputMemory(() => storage).get("graph")).toBe("algorithm=dfs");
  });

  it("works in memory when storage cannot be reached", () => {
    const memory = createInputMemory(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(memory.get("trees")).toBeNull();
    expect(() => memory.set("trees", "algorithm=bst_insert")).not.toThrow();
    expect(memory.get("trees")).toBe("algorithm=bst_insert");
  });

  it("works in memory when reads or writes fail", () => {
    const blockedReads = createInputMemory(() => fakeStorage({ failGet: true }).storage);
    blockedReads.set("compare", "algorithms=bubble_sort,heap_sort");
    expect(blockedReads.get("compare")).toBe("algorithms=bubble_sort,heap_sort");

    const full = createInputMemory(() => fakeStorage({ failSet: true }).storage);
    full.set("searching", "target=5");
    expect(full.get("searching")).toBe("target=5");

    const missing = createInputMemory(() => null);
    missing.set("sorting", "algorithm=heap_sort");
    expect(missing.get("sorting")).toBe("algorithm=heap_sort");
  });

  it("ignores unreadable stored data", () => {
    for (const raw of ["not json", "[1,2]", "null", '{"trees":5,"graph":"algorithm=dfs","__proto__":"x"}']) {
      const { items, storage } = fakeStorage();
      items.set(INPUT_MEMORY_STORAGE_KEY, raw);
      const memory = createInputMemory(() => storage);
      expect(memory.get("trees")).toBeNull();
      expect(memory.get("graph")).toBe(raw.includes("graph") ? "algorithm=dfs" : null);
    }
  });
});

describe("replaceQuery", () => {
  it("replaces the query without adding a history entry", () => {
    window.history.replaceState(null, "", "/#top");
    const length = window.history.length;
    replaceQuery("category=trees&algorithm=bst_insert");
    expect(window.location.search).toBe("?category=trees&algorithm=bst_insert");
    expect(window.location.hash).toBe("#top");
    expect(window.history.length).toBe(length);
  });

  it("leaves the page working when the browser refuses the update", () => {
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {
      throw new DOMException("Too many calls", "SecurityError");
    });
    expect(() => replaceQuery("category=graph")).not.toThrow();
  });
});
