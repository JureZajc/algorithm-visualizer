export type GraphAlgorithm = "bfs" | "dfs" | "dijkstra";

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
  description: string;
}

export interface GraphRequest {
  nodes: string[];
  edges: GraphEdge[];
  start: string;
  target: string;
  algorithm: GraphAlgorithm;
  directed: boolean;
}

export interface GraphResponse extends GraphRequest {
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
};
