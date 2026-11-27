import type { GraphEdge, GraphExportData, GraphNodePosition } from "@/types/graph";

export interface ActiveGraph {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  description: string;
}

const GRAPH_CANVAS_MIN_X = 32;
const GRAPH_CANVAS_MAX_X = 618;
const GRAPH_CANVAS_MIN_Y = 32;
const GRAPH_CANVAS_MAX_Y = 378;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function createFallbackPosition(index: number, total: number): Pick<GraphNodePosition, "x" | "y"> {
  if (total <= 1) return { x: 325, y: 205 };
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;

  return {
    x: Math.round(325 + Math.cos(angle) * 210),
    y: Math.round(205 + Math.sin(angle) * 130),
  };
}

export function serializeGraph(graph: ActiveGraph) {
  const data: GraphExportData = {
    nodes: graph.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    edges: graph.edges.map((edge) => ({ ...edge })),
    directed: graph.directed,
    start: graph.start,
    target: graph.target,
  };

  return JSON.stringify(data, null, 2);
}

export function parseGraphJson(rawJson: string): ActiveGraph {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("JSON could not be parsed. Check for missing commas, quotes, or braces.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Graph JSON must be an object with nodes and edges.");
  }

  if (!Array.isArray(parsed.nodes)) {
    throw new Error("Graph JSON must include a nodes array.");
  }

  if (!Array.isArray(parsed.edges)) {
    throw new Error("Graph JSON must include an edges array.");
  }

  const rawNodes = parsed.nodes;
  const rawEdges = parsed.edges;
  const seenNodeIds = new Set<string>();
  const nodes = rawNodes.map((rawNode, index): GraphNodePosition => {
    let id: string;
    let x: number | null = null;
    let y: number | null = null;

    if (typeof rawNode === "string") {
      id = rawNode.trim();
    } else if (isRecord(rawNode)) {
      id = typeof rawNode.id === "string" ? rawNode.id.trim() : "";
      if (rawNode.x !== undefined || rawNode.y !== undefined) {
        if (typeof rawNode.x !== "number" || typeof rawNode.y !== "number" || !Number.isFinite(rawNode.x) || !Number.isFinite(rawNode.y)) {
          throw new Error(`Node ${id || index + 1} must use finite numeric x and y positions.`);
        }
        x = clamp(rawNode.x, GRAPH_CANVAS_MIN_X, GRAPH_CANVAS_MAX_X);
        y = clamp(rawNode.y, GRAPH_CANVAS_MIN_Y, GRAPH_CANVAS_MAX_Y);
      }
    } else {
      throw new Error(`Node ${index + 1} must be a node ID string or an object with id, x, and y.`);
    }

    if (!id) {
      throw new Error(`Node ${index + 1} needs a non-empty id.`);
    }
    if (seenNodeIds.has(id)) {
      throw new Error(`Node ID ${id} is duplicated. Node IDs must be unique.`);
    }
    seenNodeIds.add(id);

    const fallback = createFallbackPosition(index, rawNodes.length);
    return {
      id,
      x: x ?? fallback.x,
      y: y ?? fallback.y,
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = rawEdges.map((rawEdge, index): GraphEdge => {
    if (!isRecord(rawEdge)) {
      throw new Error(`Edge ${index + 1} must be an object with source, target, and weight.`);
    }

    const source = typeof rawEdge.source === "string" ? rawEdge.source.trim() : "";
    const target = typeof rawEdge.target === "string" ? rawEdge.target.trim() : "";
    const weight = rawEdge.weight;

    if (!source || !target) {
      throw new Error(`Edge ${index + 1} needs source and target node IDs.`);
    }
    if (!nodeIds.has(source)) {
      throw new Error(`Edge ${index + 1} uses unknown source node ${source}.`);
    }
    if (!nodeIds.has(target)) {
      throw new Error(`Edge ${index + 1} uses unknown target node ${target}.`);
    }
    if (source === target) {
      throw new Error(`Edge ${index + 1} is a self-loop. Choose two different nodes.`);
    }
    if (typeof weight !== "number" || !Number.isFinite(weight)) {
      throw new Error(`Edge ${index + 1} needs a finite numeric weight.`);
    }

    return { source, target, weight };
  });

  if (parsed.directed !== undefined && typeof parsed.directed !== "boolean") {
    throw new Error("The directed field must be true or false.");
  }

  const fallbackNode = nodes[0]?.id ?? "";
  const start = parsed.start === undefined ? fallbackNode : typeof parsed.start === "string" ? parsed.start.trim() : "";
  const target = parsed.target === undefined ? fallbackNode : typeof parsed.target === "string" ? parsed.target.trim() : "";

  if (start && !nodeIds.has(start)) {
    throw new Error(`Start node ${start} is not in the nodes array.`);
  }
  if (target && !nodeIds.has(target)) {
    throw new Error(`Target node ${target} is not in the nodes array.`);
  }
  if (nodes.length > 0 && !start) {
    throw new Error("Start must be a node ID from the nodes array.");
  }
  if (nodes.length > 0 && !target) {
    throw new Error("Target must be a node ID from the nodes array.");
  }

  return {
    nodes,
    edges,
    start,
    target,
    directed: parsed.directed ?? false,
    description: "Imported custom graph.",
  };
}
