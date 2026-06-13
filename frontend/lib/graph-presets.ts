import type { GraphPreset } from "@/types/graph";

export const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: "simple-path",
    label: "Simple path",
    description: "A small chain with one clear route from start to target.",
    nodes: [
      { id: "A", x: 75, y: 205 }, { id: "B", x: 200, y: 105 },
      { id: "C", x: 325, y: 205 }, { id: "D", x: 450, y: 105 },
      { id: "E", x: 575, y: 205 },
    ],
    edges: [
      { source: "A", target: "B", weight: 1 }, { source: "B", target: "C", weight: 1 },
      { source: "C", target: "D", weight: 1 }, { source: "D", target: "E", weight: 1 },
    ],
    defaultStart: "A", defaultTarget: "E",
  },
  {
    id: "weighted-graph",
    label: "Weighted graph",
    description: "Several competing routes show why edge weights matter.",
    nodes: [
      { id: "A", x: 80, y: 210 }, { id: "B", x: 220, y: 85 }, { id: "C", x: 225, y: 330 },
      { id: "D", x: 400, y: 105 }, { id: "E", x: 405, y: 315 }, { id: "F", x: 570, y: 210 },
    ],
    edges: [
      { source: "A", target: "B", weight: 4 }, { source: "A", target: "C", weight: 2 },
      { source: "B", target: "C", weight: 1 }, { source: "B", target: "D", weight: 5 },
      { source: "C", target: "E", weight: 3 }, { source: "D", target: "E", weight: 2 },
      { source: "D", target: "F", weight: 4 }, { source: "E", target: "F", weight: 1 },
    ],
    defaultStart: "A", defaultTarget: "F",
  },
  {
    id: "disconnected-graph",
    label: "Disconnected graph",
    description: "Two separate components demonstrate traversal limits and spanning forests.",
    nodes: [
      { id: "A", x: 90, y: 110 }, { id: "B", x: 235, y: 70 }, { id: "C", x: 220, y: 235 },
      { id: "D", x: 420, y: 120 }, { id: "E", x: 565, y: 80 }, { id: "F", x: 500, y: 285 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 }, { source: "A", target: "C", weight: 4 },
      { source: "B", target: "C", weight: 1 }, { source: "D", target: "E", weight: 3 },
      { source: "D", target: "F", weight: 5 }, { source: "E", target: "F", weight: 2 },
    ],
    defaultStart: "A", defaultTarget: "C",
  },
  {
    id: "no-path",
    label: "No path",
    description: "The target is in another component, so no route can be found.",
    nodes: [
      { id: "A", x: 90, y: 135 }, { id: "B", x: 245, y: 80 }, { id: "C", x: 245, y: 250 },
      { id: "D", x: 420, y: 110 }, { id: "E", x: 565, y: 225 }, { id: "F", x: 430, y: 330 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 }, { source: "A", target: "C", weight: 5 },
      { source: "B", target: "C", weight: 1 }, { source: "D", target: "E", weight: 3 },
      { source: "E", target: "F", weight: 2 }, { source: "D", target: "F", weight: 6 },
    ],
    defaultStart: "A", defaultTarget: "F",
  },
  {
    id: "topological-dag",
    label: "DAG for topological sort",
    description: "A directed build pipeline with valid dependency orderings.",
    nodes: [
      { id: "A", x: 75, y: 205 }, { id: "B", x: 205, y: 85 }, { id: "C", x: 205, y: 325 },
      { id: "D", x: 365, y: 85 }, { id: "E", x: 365, y: 325 }, { id: "F", x: 500, y: 205 },
      { id: "G", x: 600, y: 205 },
    ],
    edges: [
      { source: "A", target: "B", weight: 1 }, { source: "A", target: "C", weight: 1 },
      { source: "B", target: "D", weight: 1 }, { source: "B", target: "E", weight: 1 },
      { source: "C", target: "E", weight: 1 }, { source: "D", target: "F", weight: 1 },
      { source: "E", target: "F", weight: 1 }, { source: "F", target: "G", weight: 1 },
    ],
    defaultStart: "A", defaultTarget: "G", defaultDirected: true,
  },
  {
    id: "cycle-graph",
    label: "Cycle graph",
    description: "A directed dependency cycle demonstrates cycle detection.",
    nodes: [
      { id: "A", x: 325, y: 55 }, { id: "B", x: 520, y: 170 }, { id: "C", x: 445, y: 340 },
      { id: "D", x: 205, y: 340 }, { id: "E", x: 130, y: 170 },
    ],
    edges: [
      { source: "A", target: "B", weight: 1 }, { source: "B", target: "C", weight: 1 },
      { source: "C", target: "D", weight: 1 }, { source: "D", target: "E", weight: 1 },
      { source: "E", target: "A", weight: 1 },
    ],
    defaultStart: "A", defaultTarget: "D", defaultDirected: true,
  },
  {
    id: "mst-example",
    label: "MST example",
    description: "A connected weighted graph with clear spanning-tree tradeoffs.",
    nodes: [
      { id: "A", x: 90, y: 205 }, { id: "B", x: 220, y: 75 }, { id: "C", x: 220, y: 330 },
      { id: "D", x: 400, y: 80 }, { id: "E", x: 400, y: 325 }, { id: "F", x: 565, y: 205 },
    ],
    edges: [
      { source: "A", target: "B", weight: 4 }, { source: "A", target: "C", weight: 3 },
      { source: "B", target: "C", weight: 2 }, { source: "B", target: "D", weight: 5 },
      { source: "C", target: "D", weight: 3 }, { source: "C", target: "E", weight: 6 },
      { source: "D", target: "E", weight: 1 }, { source: "D", target: "F", weight: 7 },
      { source: "E", target: "F", weight: 4 },
    ],
    defaultStart: "A", defaultTarget: "F",
  },
  {
    id: "a-star-friendly",
    label: "A* friendly graph",
    description: "Spatially arranged routes make the A* heuristic easy to follow.",
    nodes: [
      { id: "A", x: 65, y: 300 }, { id: "B", x: 180, y: 175 }, { id: "C", x: 190, y: 340 },
      { id: "D", x: 330, y: 105 }, { id: "E", x: 340, y: 260 }, { id: "F", x: 470, y: 160 },
      { id: "G", x: 585, y: 80 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 }, { source: "A", target: "C", weight: 2 },
      { source: "B", target: "D", weight: 2 }, { source: "B", target: "E", weight: 3 },
      { source: "C", target: "E", weight: 2 }, { source: "D", target: "F", weight: 2 },
      { source: "E", target: "F", weight: 2 }, { source: "F", target: "G", weight: 2 },
      { source: "E", target: "G", weight: 5 },
    ],
    defaultStart: "A", defaultTarget: "G",
  },
];

export function createAdmissibleHeuristics(preset: GraphPreset, targetId: string): Record<string, number> {
  const positions = new Map(preset.nodes.map((node) => [node.id, node]));
  const target = positions.get(targetId);
  if (!target) return {};

  const ratios = preset.edges.flatMap((edge) => {
    const source = positions.get(edge.source);
    const edgeTarget = positions.get(edge.target);
    if (!source || !edgeTarget) return [];
    const length = Math.hypot(source.x - edgeTarget.x, source.y - edgeTarget.y);
    return length > 0 ? [edge.weight / length] : [];
  });
  const scale = ratios.length > 0 ? Math.min(...ratios) : 0;

  return Object.fromEntries(preset.nodes.map((node) => [
    node.id,
    Math.floor(Math.hypot(node.x - target.x, node.y - target.y) * scale * 100) / 100,
  ]));
}
