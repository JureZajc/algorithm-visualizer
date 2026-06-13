export type GraphAlgorithm =
  | "bfs"
  | "dfs"
  | "dijkstra"
  | "a_star"
  | "topological_sort"
  | "kruskal"
  | "prim";

export type GraphStepType =
  | "visit"
  | "inspect_edge"
  | "enqueue"
  | "dequeue"
  | "push"
  | "pop"
  | "relax"
  | "path_found"
  | "not_found"
  | "cycle_detected"
  | "accept_edge"
  | "reject_edge"
  | "add_to_result"
  | "update_frontier"
  | "done";

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphStep {
  type: GraphStepType;
  current: string | null;
  neighbor: string | null;
  edge: GraphEdge | null;
  visited: string[];
  frontier: string[];
  distances: Record<string, number> | null;
  previous: Record<string, string | null> | null;
  path: string[];
  result: string[];
  frontier_edges: GraphEdge[];
  mst_edges: GraphEdge[];
  total_weight: number | null;
  description: string;
  pseudocode_line?: number;
}

export interface GraphRequest {
  nodes: string[];
  edges: GraphEdge[];
  start: string;
  target: string;
  algorithm: GraphAlgorithm;
  directed: boolean;
  heuristics?: Record<string, number> | null;
}

export interface GraphResponse extends GraphRequest {
  heuristics: Record<string, number> | null;
  steps: GraphStep[];
  step_count: number;
}

export interface GraphNodePosition {
  id: string;
  x: number;
  y: number;
}

export interface GraphPreset {
  id: string;
  label: string;
  description: string;
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  defaultStart: string;
  defaultTarget: string;
}

export const GRAPH_ALGORITHM_LABELS: Record<GraphAlgorithm, string> = {
  bfs: "Breadth-First Search",
  dfs: "Depth-First Search",
  dijkstra: "Dijkstra's Algorithm",
  a_star: "A* Search",
  topological_sort: "Topological Sort",
  kruskal: "Kruskal's Minimum Spanning Tree",
  prim: "Prim's Minimum Spanning Tree",
};
