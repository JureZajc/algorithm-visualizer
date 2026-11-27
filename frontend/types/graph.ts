import type { components } from "@/types/generated/api";
import { CATALOG_LABELS } from "@/types/generated/catalog";

type Schemas = components["schemas"];

export type GraphRequest = Schemas["GraphRequest"];
export type GraphResponse = Schemas["GraphResponse"];
export type GraphStep = Schemas["GraphStep"];
export type GraphEdge = Schemas["GraphEdge"];

export type GraphAlgorithm = GraphRequest["algorithm"];
export type GraphStepType = GraphStep["type"];

export interface GraphNodePosition {
  id: string;
  x: number;
  y: number;
}

export type GraphExportNode = string | GraphNodePosition;

export interface GraphExportData {
  nodes: GraphExportNode[];
  edges: GraphEdge[];
  directed?: boolean;
  start?: string;
  target?: string;
}

export interface GraphPreset {
  id: string;
  label: string;
  description: string;
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  defaultStart: string;
  defaultTarget: string;
  defaultDirected?: boolean;
}

export const GRAPH_ALGORITHM_LABELS: Record<GraphAlgorithm, string> =
  CATALOG_LABELS.graph;
