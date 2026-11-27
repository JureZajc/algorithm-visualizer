/**
 * Keeps the page's category, algorithm, and input in the query string, and each category's last
 * input in session storage, for example
 * `?category=searching&algorithm=binary_search&numbers=5,12,19,27,36&target=19`.
 *
 * Each category writes its own query and reads it back through the parsers its controls use. A
 * value that is missing, longer than the cap, or invalid is left out of the parsed state, so the
 * category falls back to its default for that value. Parsing never throws.
 */

import {
  DEFAULT_FIELDS as BACKTRACKING_DEFAULT_FIELDS,
  INITIAL_FORM as BACKTRACKING_INITIAL_FORM,
  validateBacktrackingForm,
  validateMazeGrid,
  validateSudokuBoard,
  type BacktrackingForm,
} from "@/lib/backtracking-input";
import {
  DEFAULT_FIELDS as DYNAMIC_PROGRAMMING_DEFAULT_FIELDS,
  INITIAL_FORM as DYNAMIC_PROGRAMMING_INITIAL_FORM,
  validateDynamicProgrammingForm,
  type DynamicProgrammingForm,
} from "@/lib/dynamic-programming-input";
import { parseGraphJson, type ActiveGraph } from "@/lib/graph-input";
import { GRAPH_PRESETS } from "@/lib/graph-presets";
import { validateHashValues, validateTableSize, validateTarget as validateHashTarget } from "@/lib/hash-tables-input";
import { parseInteger } from "@/lib/number-input";
import { validateCountDraft as validateSearchingCount, validateTarget as validateSearchingTarget } from "@/lib/searching-input";
import { validateCountDraft as validateSortingCount } from "@/lib/sorting-input";
import { validateTarget as validateTreeTarget, validateTreeValues } from "@/lib/trees-input";
import type { VisualizerMode } from "@/types/algorithm";
import {
  BACKTRACKING_ALGORITHM_LABELS,
  MAZE_PRESET_LABELS,
  type BacktrackingAlgorithm,
  type BacktrackingCell,
  type SudokuBoard,
} from "@/types/backtracking";
import { DYNAMIC_PROGRAMMING_ALGORITHM_LABELS, type DynamicProgrammingAlgorithm } from "@/types/dynamic-programming";
import { GRAPH_ALGORITHM_LABELS, type GraphAlgorithm, type GraphPreset } from "@/types/graph";
import { HASH_TABLE_ALGORITHM_LABELS, type HashTableAlgorithm } from "@/types/hash-tables";
import { SEARCHING_ALGORITHM_LABELS, type SearchingAlgorithm } from "@/types/searching";
import { ALGORITHM_LABELS as SORTING_ALGORITHM_LABELS, type SortingAlgorithm } from "@/types/sorting";
import { TREE_ALGORITHM_LABELS, type TreeAlgorithm } from "@/types/trees";

/** The longest query value that is parsed. A longer value is ignored without parsing it. */
export const MAX_QUERY_VALUE_LENGTH = 2_000;
/** The node and edge lists of a custom graph may be longer. */
export const MAX_GRAPH_QUERY_VALUE_LENGTH = 10_000;

/** Props a category takes to restore its input from a query and report changes to it. */
export interface QueryStateProps {
  /** The query to restore the algorithm and input from, as the category wrote it. */
  initialQuery?: string;
  /** Called with the query for the current algorithm and input whenever either changes. */
  onQueryChange?: (query: string) => void;
}

function readValue(params: URLSearchParams, key: string, maxLength = MAX_QUERY_VALUE_LENGTH) {
  const value = params.get(key);
  return value !== null && value.length <= maxLength ? value : undefined;
}

function readOption<T extends string>(params: URLSearchParams, key: string, options: Record<T, string>) {
  const value = readValue(params, key);
  return value !== undefined && Object.hasOwn(options, value) ? (value as T) : undefined;
}

function readBoolean(params: URLSearchParams, key: string) {
  const value = params.get(key);
  return value === "true" ? true : value === "false" ? false : undefined;
}

/** Reads a non-empty value; several parsers read an empty string as 0. */
function readFilled(params: URLSearchParams, key: string) {
  const value = readValue(params, key);
  return value?.trim() ? value : undefined;
}

function splitList(value: string) {
  return value === "" ? [] : value.split(",");
}

/** "1, 3 ,4" becomes "1,3,4" for the query. */
function compactList(value: string) {
  return value.split(",").map((part) => part.trim()).join(",");
}

/** "1,3,4" becomes "1, 3, 4", the way the controls show lists. */
function spacedList(value: string) {
  return value.split(",").map((part) => part.trim()).join(", ");
}

/** Builds a query in entry order, leaving out undefined values and keeping commas and colons readable. */
function toQuery(entries: [string, string | undefined][]) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString().replace(/%2C/gi, ",").replace(/%3A/gi, ":");
}

/** The query for a category's input, with the category first. */
export function categoryQuery(category: VisualizerMode, query: string) {
  return query ? `category=${category}&${query}` : `category=${category}`;
}

/**
 * Puts `query` in the address bar without a navigation. Browsers may throttle or block history
 * updates; the address then keeps its previous query, and the page carries on.
 */
export function replaceQuery(query: string) {
  try {
    const { pathname, search, hash } = window.location;
    const nextSearch = query ? `?${query}` : "";
    if (nextSearch !== search) window.history.replaceState(null, "", `${pathname}${nextSearch}${hash}`);
  } catch {
    // The address bar is a convenience; the page state is unaffected.
  }
}

/** Integers separated by commas, with a count the controls accept. */
function readIntegerList(params: URLSearchParams, key: string, isValidCount: (count: number) => boolean) {
  const value = readValue(params, key);
  if (value === undefined) return undefined;
  const parts = value.split(",");
  if (!isValidCount(parts.length) || parts.some((part) => part.trim() === "")) return undefined;
  try {
    const numbers = parts.map((part) => parseInteger(part, "Value"));
    return numbers.every(Number.isSafeInteger) ? numbers : undefined;
  } catch {
    return undefined;
  }
}

const isSortingCount = (count: number) => validateSortingCount(String(count)).value !== null;
const isSearchingCount = (count: number) => validateSearchingCount(String(count)).value !== null;

// Sorting

export interface SortingQueryState {
  algorithm: SortingAlgorithm;
  numbers: number[];
}

export function parseSortingQuery(query?: string): Partial<SortingQueryState> {
  const params = new URLSearchParams(query);
  return {
    algorithm: readOption(params, "algorithm", SORTING_ALGORITHM_LABELS),
    numbers: readIntegerList(params, "numbers", isSortingCount),
  };
}

export function sortingQuery(state: SortingQueryState) {
  return toQuery([
    ["algorithm", state.algorithm],
    ["numbers", state.numbers.join(",")],
  ]);
}

// Compare

export const MIN_COMPARED_ALGORITHMS = 2;
export const MAX_COMPARED_ALGORITHMS = 4;

export interface CompareQueryState {
  algorithms: SortingAlgorithm[];
  numbers: number[];
}

function readComparedAlgorithms(params: URLSearchParams) {
  const value = readValue(params, "algorithms");
  if (value === undefined) return undefined;
  const algorithms = value.split(",");
  const isValid =
    algorithms.length >= MIN_COMPARED_ALGORITHMS &&
    algorithms.length <= MAX_COMPARED_ALGORITHMS &&
    new Set(algorithms).size === algorithms.length &&
    algorithms.every((algorithm) => Object.hasOwn(SORTING_ALGORITHM_LABELS, algorithm));
  return isValid ? (algorithms as SortingAlgorithm[]) : undefined;
}

export function parseCompareQuery(query?: string): Partial<CompareQueryState> {
  const params = new URLSearchParams(query);
  return {
    algorithms: readComparedAlgorithms(params),
    numbers: readIntegerList(params, "numbers", isSortingCount),
  };
}

export function compareQuery(state: CompareQueryState) {
  return toQuery([
    ["algorithms", state.algorithms.join(",")],
    ["numbers", state.numbers.join(",")],
  ]);
}

// Searching

export interface SearchingQueryState {
  algorithm: SearchingAlgorithm;
  numbers: number[];
  /** The target as the control holds it. */
  target: string;
}

export function parseSearchingQuery(query?: string): Partial<SearchingQueryState> {
  const params = new URLSearchParams(query);
  const algorithm = readOption(params, "algorithm", SEARCHING_ALGORITHM_LABELS);
  const numbers = readIntegerList(params, "numbers", isSearchingCount);
  const target = readFilled(params, "target");
  const parsedTarget = target === undefined ? null : validateSearchingTarget(target).target;
  return {
    algorithm,
    // Binary Search runs on an ascending copy, as when it is chosen in the controls.
    numbers: numbers && algorithm === "binary_search" ? [...numbers].sort((a, b) => a - b) : numbers,
    target: parsedTarget === null ? undefined : String(parsedTarget),
  };
}

export function searchingQuery(state: SearchingQueryState) {
  return toQuery([
    ["algorithm", state.algorithm],
    ["numbers", state.numbers.join(",")],
    ["target", state.target.trim()],
  ]);
}

// Graph

export const CUSTOM_GRAPH_ID = "custom";
const CUSTOM_GRAPH_DESCRIPTION = "Create a graph, choose its start and target nodes, then run an algorithm.";

export function graphFromPreset(preset: GraphPreset): ActiveGraph {
  return {
    nodes: preset.nodes.map((node) => ({ ...node })),
    edges: preset.edges.map((edge) => ({ ...edge })),
    start: preset.defaultStart,
    target: preset.defaultTarget,
    directed: preset.defaultDirected ?? false,
    description: preset.description,
  };
}

export function createEmptyGraph(): ActiveGraph {
  return { nodes: [], edges: [], start: "", target: "", directed: false, description: CUSTOM_GRAPH_DESCRIPTION };
}

export interface GraphQueryState {
  algorithm: GraphAlgorithm;
  /** A preset ID, or CUSTOM_GRAPH_ID. */
  graphId: string;
  graph: ActiveGraph;
}

function toNumber(value: string | undefined) {
  return value === undefined || value.trim() === "" ? Number.NaN : Number(value);
}

/**
 * A custom graph's nodes are `id:x:y` and its edges `source:target:weight`, separated by commas.
 * IDs are percent-encoded, so a comma or colon in an ID cannot split the list. The graph is then
 * checked by the JSON import parser.
 */
function readCustomGraph(params: URLSearchParams): ActiveGraph | undefined {
  const rawNodes = params.has("nodes") ? readValue(params, "nodes", MAX_GRAPH_QUERY_VALUE_LENGTH) : "";
  const rawEdges = params.has("edges") ? readValue(params, "edges", MAX_GRAPH_QUERY_VALUE_LENGTH) : "";
  if (rawNodes === undefined || rawEdges === undefined) return undefined;
  try {
    const nodes = splitList(rawNodes).map((entry) => {
      const [id, x, y, ...rest] = entry.split(":");
      if (rest.length > 0) throw new Error("A node has too many parts.");
      return { id: decodeURIComponent(id), x: toNumber(x), y: toNumber(y) };
    });
    const edges = splitList(rawEdges).map((entry) => {
      const [source, target, weight, ...rest] = entry.split(":");
      if (rest.length > 0 || target === undefined) throw new Error("An edge has too many or too few parts.");
      return { source: decodeURIComponent(source), target: decodeURIComponent(target), weight: toNumber(weight) };
    });
    const nodeIds = new Set(nodes.map((node) => node.id));
    const start = readValue(params, "start");
    const target = readValue(params, "target");
    const graph = parseGraphJson(JSON.stringify({
      nodes,
      edges,
      directed: readBoolean(params, "directed") ?? false,
      // An unknown endpoint is left out, so the first node is used.
      start: start !== undefined && nodeIds.has(start) ? start : undefined,
      target: target !== undefined && nodeIds.has(target) ? target : undefined,
    }));
    return { ...graph, description: CUSTOM_GRAPH_DESCRIPTION };
  } catch {
    return undefined;
  }
}

function readPresetGraph(params: URLSearchParams, preset: GraphPreset): ActiveGraph {
  const graph = graphFromPreset(preset);
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const start = readValue(params, "start");
  const target = readValue(params, "target");
  return {
    ...graph,
    start: start !== undefined && nodeIds.has(start) ? start : graph.start,
    target: target !== undefined && nodeIds.has(target) ? target : graph.target,
    directed: readBoolean(params, "directed") ?? graph.directed,
  };
}

/** Always returns a graph: the one in the query, or the first preset. */
export function parseGraphQuery(query?: string): Partial<GraphQueryState> & Pick<GraphQueryState, "graphId" | "graph"> {
  const params = new URLSearchParams(query);
  const algorithm = readOption(params, "algorithm", GRAPH_ALGORITHM_LABELS);
  const graphId = readValue(params, "graph");
  if (graphId === CUSTOM_GRAPH_ID) {
    const graph = readCustomGraph(params);
    if (graph) return { algorithm, graphId, graph };
  }
  const preset = GRAPH_PRESETS.find((item) => item.id === graphId) ?? GRAPH_PRESETS[0];
  return { algorithm, graphId: preset.id, graph: readPresetGraph(params, preset) };
}

export function graphQuery({ algorithm, graphId, graph }: GraphQueryState) {
  const isCustom = graphId === CUSTOM_GRAPH_ID;
  const nodes = graph.nodes.map((node) => `${encodeURIComponent(node.id)}:${Math.round(node.x)}:${Math.round(node.y)}`).join(",");
  const edges = graph.edges.map((edge) => `${encodeURIComponent(edge.source)}:${encodeURIComponent(edge.target)}:${edge.weight}`).join(",");
  return toQuery([
    ["algorithm", algorithm],
    ["graph", graphId],
    ["nodes", isCustom && nodes ? nodes : undefined],
    ["edges", isCustom && edges ? edges : undefined],
    ["start", graph.start || undefined],
    ["target", graph.target || undefined],
    ["directed", String(graph.directed)],
  ]);
}

// Form-based categories

/**
 * Applies the fields read from the query over the defaults, and drops each field the form's
 * validator rejects, one at a time. If the form is still invalid, for example because two fields
 * do not match, the defaults are used.
 */
function restoreForm<F extends object>(
  defaults: F,
  fromQuery: Partial<F>,
  validate: (form: F) => Partial<Record<string, string>>,
): F {
  const fields: Partial<F> = { ...fromQuery };
  for (;;) {
    const form = { ...defaults, ...fields };
    const errorFields = Object.keys(validate(form));
    if (errorFields.length === 0) return form;
    const field = errorFields.find((key) => Object.hasOwn(fields, key));
    if (field === undefined) return defaults;
    delete fields[field as keyof F];
  }
}

// Dynamic programming

const DYNAMIC_PROGRAMMING_QUERY_KEYS: Record<keyof DynamicProgrammingForm, string> = {
  n: "n",
  coins: "coins",
  amount: "amount",
  weights: "weights",
  values: "values",
  capacity: "capacity",
  textA: "text_a",
  textB: "text_b",
  rows: "rows",
  cols: "cols",
};
const DYNAMIC_PROGRAMMING_TEXT_FIELDS = new Set<keyof DynamicProgrammingForm>(["textA", "textB"]);

export interface DynamicProgrammingQueryState {
  algorithm: DynamicProgrammingAlgorithm;
  form: DynamicProgrammingForm;
}

function dynamicProgrammingFields(algorithm: DynamicProgrammingAlgorithm) {
  return Object.keys(DYNAMIC_PROGRAMMING_DEFAULT_FIELDS[algorithm]) as (keyof DynamicProgrammingForm)[];
}

/** The form holds every algorithm's fields; the query names only the chosen algorithm's. */
export function parseDynamicProgrammingQuery(query?: string): Partial<DynamicProgrammingQueryState> {
  const params = new URLSearchParams(query);
  const algorithm = readOption(params, "algorithm", DYNAMIC_PROGRAMMING_ALGORITHM_LABELS);
  if (!algorithm) return {};
  const fields: Partial<DynamicProgrammingForm> = {};
  for (const field of dynamicProgrammingFields(algorithm)) {
    const value = readValue(params, DYNAMIC_PROGRAMMING_QUERY_KEYS[field]);
    if (value !== undefined) fields[field] = DYNAMIC_PROGRAMMING_TEXT_FIELDS.has(field) ? value : spacedList(value);
  }
  const defaults = { ...DYNAMIC_PROGRAMMING_INITIAL_FORM, ...DYNAMIC_PROGRAMMING_DEFAULT_FIELDS[algorithm] };
  return {
    algorithm,
    form: restoreForm(defaults, fields, (form) => validateDynamicProgrammingForm(algorithm, form)),
  };
}

export function dynamicProgrammingQuery({ algorithm, form }: DynamicProgrammingQueryState) {
  return toQuery([
    ["algorithm", algorithm],
    ...dynamicProgrammingFields(algorithm).map((field): [string, string] => [
      DYNAMIC_PROGRAMMING_QUERY_KEYS[field],
      DYNAMIC_PROGRAMMING_TEXT_FIELDS.has(field) ? form[field] : compactList(form[field]),
    ]),
  ]);
}

// Backtracking

const BACKTRACKING_QUERY_KEYS: Record<keyof BacktrackingForm, string> = {
  size: "size",
  rows: "rows",
  cols: "cols",
  preset: "maze",
  values: "values",
};

/** Maze cells in the query: one character per cell, rows separated by commas. */
const MAZE_CELL_CODES: Partial<Record<BacktrackingCell, string>> = { empty: ".", wall: "x", start: "s", end: "e" };
const MAZE_CODE_CELLS: Record<string, BacktrackingCell> = { ".": "empty", x: "wall", s: "start", e: "end" };

export interface BacktrackingQueryState {
  algorithm: BacktrackingAlgorithm;
  form: BacktrackingForm;
  /** The edited maze. Without it, the maze is built from the form's size and layout. */
  mazeGrid?: BacktrackingCell[][];
  sudokuBoard?: SudokuBoard;
}

function backtrackingFields(algorithm: BacktrackingAlgorithm) {
  return Object.keys(BACKTRACKING_DEFAULT_FIELDS[algorithm]) as (keyof BacktrackingForm)[];
}

function countCells(grid: BacktrackingCell[][], cell: BacktrackingCell) {
  return grid.reduce((total, row) => total + row.filter((item) => item === cell).length, 0);
}

function readMazeGrid(params: URLSearchParams, form: BacktrackingForm) {
  const value = readValue(params, "grid");
  if (value === undefined) return undefined;
  const rows = value.split(",");
  const columnCount = Number(form.cols);
  if (rows.length !== Number(form.rows) || rows.some((row) => row.length !== columnCount)) return undefined;
  if (rows.some((row) => [...row].some((code) => !Object.hasOwn(MAZE_CODE_CELLS, code)))) return undefined;
  const grid = rows.map((row) => [...row].map((code) => MAZE_CODE_CELLS[code]));
  const isValid = validateMazeGrid(grid) === null && countCells(grid, "start") === 1 && countCells(grid, "end") === 1;
  return isValid ? grid : undefined;
}

function readSudokuBoard(params: URLSearchParams) {
  const value = readValue(params, "board");
  if (value === undefined) return undefined;
  const board = value.split(",").map((row) => [...row]) as SudokuBoard;
  return validateSudokuBoard(board) === null ? board : undefined;
}

export function parseBacktrackingQuery(query?: string): Partial<BacktrackingQueryState> {
  const params = new URLSearchParams(query);
  const algorithm = readOption(params, "algorithm", BACKTRACKING_ALGORITHM_LABELS);
  if (!algorithm) return {};
  const fields: Partial<BacktrackingForm> = {};
  for (const field of backtrackingFields(algorithm)) {
    if (field === "preset") {
      const preset = readOption(params, BACKTRACKING_QUERY_KEYS.preset, MAZE_PRESET_LABELS);
      if (preset) fields.preset = preset;
      continue;
    }
    const value = readValue(params, BACKTRACKING_QUERY_KEYS[field]);
    if (value !== undefined) fields[field] = spacedList(value);
  }
  const defaults = { ...BACKTRACKING_INITIAL_FORM, ...BACKTRACKING_DEFAULT_FIELDS[algorithm] };
  const form = restoreForm(defaults, fields, (next) => validateBacktrackingForm(algorithm, next));
  return {
    algorithm,
    form,
    mazeGrid: algorithm === "maze_solver" ? readMazeGrid(params, form) : undefined,
    sudokuBoard: algorithm === "sudoku_solver" ? readSudokuBoard(params) : undefined,
  };
}

export function backtrackingQuery({ algorithm, form, mazeGrid, sudokuBoard }: BacktrackingQueryState) {
  return toQuery([
    ["algorithm", algorithm],
    ...backtrackingFields(algorithm).map((field): [string, string] => [BACKTRACKING_QUERY_KEYS[field], compactList(form[field])]),
    ["grid", algorithm === "maze_solver" && mazeGrid ? mazeGrid.map((row) => row.map((cell) => MAZE_CELL_CODES[cell] ?? ".").join("")).join(",") : undefined],
    ["board", algorithm === "sudoku_solver" && sudokuBoard ? sudokuBoard.map((row) => row.join("")).join(",") : undefined],
  ]);
}

// Trees

export interface TreesQueryState {
  algorithm: TreeAlgorithm;
  /** The values as the control holds them. */
  values: string;
  /** The search target, for algorithms that take one. */
  target?: string;
}

export function parseTreesQuery(query?: string): Partial<TreesQueryState> {
  const params = new URLSearchParams(query);
  const values = readValue(params, "values");
  const parsedValues = values === undefined ? null : validateTreeValues(values);
  const target = readFilled(params, "target");
  const parsedTarget = target === undefined ? null : validateTreeTarget(target, true);
  return {
    algorithm: readOption(params, "algorithm", TREE_ALGORITHM_LABELS),
    values: parsedValues?.ok ? parsedValues.values.join(", ") : undefined,
    target: parsedTarget?.ok ? String(parsedTarget.target) : undefined,
  };
}

export function treesQuery(state: TreesQueryState) {
  return toQuery([
    ["algorithm", state.algorithm],
    ["values", compactList(state.values)],
    ["target", state.target?.trim()],
  ]);
}

// Hash tables

export interface HashTablesQueryState {
  algorithm: HashTableAlgorithm;
  /** The keys as the control holds them. */
  values: string;
  tableSize: string;
  /** The key to search for, for operations that take one. */
  target?: string;
}

export function parseHashTablesQuery(query?: string): Partial<HashTablesQueryState> {
  const params = new URLSearchParams(query);
  const values = readValue(params, "values");
  const parsedValues = values === undefined ? null : validateHashValues(values);
  const tableSize = readValue(params, "table_size");
  const parsedTableSize = tableSize === undefined ? null : validateTableSize(tableSize);
  const target = readFilled(params, "target");
  const parsedTarget = target === undefined ? null : validateHashTarget(target, true);
  return {
    algorithm: readOption(params, "algorithm", HASH_TABLE_ALGORITHM_LABELS),
    values: parsedValues?.ok ? parsedValues.values.join(", ") : undefined,
    tableSize: parsedTableSize?.ok ? String(parsedTableSize.tableSize) : undefined,
    target: parsedTarget?.ok ? String(parsedTarget.target) : undefined,
  };
}

export function hashTablesQuery(state: HashTablesQueryState) {
  return toQuery([
    ["algorithm", state.algorithm],
    ["values", compactList(state.values)],
    ["table_size", state.tableSize.trim()],
    ["target", state.target?.trim()],
  ]);
}

// Session memory

export const INPUT_MEMORY_STORAGE_KEY = "algorithm-visualizer:category-inputs";

/** Each category's last query in this browser tab. */
export interface InputMemory {
  get(category: VisualizerMode): string | null;
  set(category: VisualizerMode, query: string): void;
}

/**
 * Storage can be missing, blocked, or full, so every read and write is guarded. The queries are
 * also kept in memory, so switching categories restores inputs even when storage fails.
 */
export function createInputMemory(getStorage: () => Storage | null): InputMemory {
  let entries: Map<string, string> | null = null;

  function load() {
    if (entries) return entries;
    entries = new Map();
    try {
      const raw = getStorage()?.getItem(INPUT_MEMORY_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        for (const [category, query] of Object.entries(parsed)) {
          if (typeof query === "string") entries.set(category, query);
        }
      }
    } catch {
      // Unreadable or unavailable storage: start empty.
    }
    return entries;
  }

  return {
    get: (category) => load().get(category) ?? null,
    set(category, query) {
      const current = load();
      current.set(category, query);
      try {
        getStorage()?.setItem(INPUT_MEMORY_STORAGE_KEY, JSON.stringify(Object.fromEntries(current)));
      } catch {
        // Kept in memory for this page.
      }
    },
  };
}
