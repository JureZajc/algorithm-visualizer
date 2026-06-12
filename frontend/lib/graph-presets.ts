import type { GraphPreset } from "@/types/graph";

export const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: "city-routes",
    label: "City Routes",
    description: "A connected weighted graph with several competing routes.",
    nodes: [
      { id: "A", x: 80, y: 210 },
      { id: "B", x: 220, y: 85 },
      { id: "C", x: 225, y: 330 },
      { id: "D", x: 400, y: 105 },
      { id: "E", x: 405, y: 315 },
      { id: "F", x: 570, y: 210 },
    ],
    edges: [
      { source: "A", target: "B", weight: 4 },
      { source: "A", target: "C", weight: 2 },
      { source: "B", target: "C", weight: 1 },
      { source: "B", target: "D", weight: 5 },
      { source: "C", target: "E", weight: 3 },
      { source: "D", target: "E", weight: 2 },
      { source: "D", target: "F", weight: 4 },
      { source: "E", target: "F", weight: 1 },
    ],
    defaultStart: "A",
    defaultTarget: "F",
  },
  {
    id: "branching-trails",
    label: "Branching Trails",
    description: "A tree-like graph that makes BFS and DFS order easy to compare.",
    nodes: [
      { id: "A", x: 325, y: 55 },
      { id: "B", x: 175, y: 170 },
      { id: "C", x: 475, y: 170 },
      { id: "D", x: 80, y: 330 },
      { id: "E", x: 250, y: 330 },
      { id: "F", x: 400, y: 330 },
      { id: "G", x: 570, y: 330 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 },
      { source: "A", target: "C", weight: 4 },
      { source: "B", target: "D", weight: 3 },
      { source: "B", target: "E", weight: 1 },
      { source: "C", target: "F", weight: 2 },
      { source: "C", target: "G", weight: 5 },
      { source: "E", target: "F", weight: 2 },
    ],
    defaultStart: "A",
    defaultTarget: "G",
  },
  {
    id: "build-pipeline",
    label: "Build Pipeline (DAG)",
    description: "A directed acyclic graph designed for topological sorting.",
    nodes: [
      { id: "A", x: 75, y: 205 },
      { id: "B", x: 205, y: 85 },
      { id: "C", x: 205, y: 325 },
      { id: "D", x: 365, y: 85 },
      { id: "E", x: 365, y: 325 },
      { id: "F", x: 500, y: 205 },
      { id: "G", x: 600, y: 205 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 },
      { source: "A", target: "C", weight: 3 },
      { source: "B", target: "D", weight: 2 },
      { source: "B", target: "E", weight: 4 },
      { source: "C", target: "E", weight: 2 },
      { source: "D", target: "F", weight: 3 },
      { source: "E", target: "F", weight: 1 },
      { source: "F", target: "G", weight: 2 },
    ],
    defaultStart: "A",
    defaultTarget: "G",
  },
  {
    id: "islands",
    label: "Disconnected Islands",
    description: "Two components for demonstrating the no-path outcome.",
    nodes: [
      { id: "A", x: 90, y: 135 },
      { id: "B", x: 245, y: 80 },
      { id: "C", x: 245, y: 250 },
      { id: "D", x: 420, y: 110 },
      { id: "E", x: 565, y: 225 },
      { id: "F", x: 430, y: 330 },
    ],
    edges: [
      { source: "A", target: "B", weight: 2 },
      { source: "A", target: "C", weight: 5 },
      { source: "B", target: "C", weight: 1 },
      { source: "D", target: "E", weight: 3 },
      { source: "E", target: "F", weight: 2 },
      { source: "D", target: "F", weight: 6 },
    ],
    defaultStart: "A",
    defaultTarget: "F",
  },
];

export function createAdmissibleHeuristics(
  preset: GraphPreset,
  targetId: string,
): Record<string, number> {
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

  return Object.fromEntries(
    preset.nodes.map((node) => [
      node.id,
      Math.floor(Math.hypot(node.x - target.x, node.y - target.y) * scale * 100) / 100,
    ]),
  );
}
