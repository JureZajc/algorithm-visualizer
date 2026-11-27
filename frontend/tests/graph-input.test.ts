import { describe, expect, it } from "vitest";
import { parseGraphJson, serializeGraph, type ActiveGraph } from "@/lib/graph-input";
import { GRAPH_PRESETS } from "@/lib/graph-presets";

const json = (value: unknown) => JSON.stringify(value);
const edge = (source: unknown, target: unknown, weight: unknown = 1) => ({ source, target, weight });

function graphWith(overrides: Record<string, unknown>) {
  return json({ nodes: ["A", "B"], edges: [edge("A", "B")], ...overrides });
}

describe("parseGraphJson", () => {
  it("imports positioned nodes, edges, direction, start, and target", () => {
    const graph = parseGraphJson(json({
      nodes: [{ id: "A", x: 100, y: 120 }, { id: "B", x: 300, y: 200 }, { id: "C", x: 500, y: 90 }],
      edges: [edge("A", "B", 4), edge("B", "C", -2.5)],
      directed: true,
      start: "A",
      target: "C",
    }));
    expect(graph).toEqual({
      nodes: [{ id: "A", x: 100, y: 120 }, { id: "B", x: 300, y: 200 }, { id: "C", x: 500, y: 90 }],
      edges: [{ source: "A", target: "B", weight: 4 }, { source: "B", target: "C", weight: -2.5 }],
      start: "A",
      target: "C",
      directed: true,
      description: "Imported custom graph.",
    });
  });

  it("places string nodes on an ellipse, trims IDs, and defaults start, target, and direction", () => {
    const graph = parseGraphJson(json({ nodes: [" A ", "B", "C", "D"], edges: [edge(" A ", "B ")] }));
    expect(graph.nodes).toEqual([
      { id: "A", x: 325, y: 75 },
      { id: "B", x: 535, y: 205 },
      { id: "C", x: 325, y: 335 },
      { id: "D", x: 115, y: 205 },
    ]);
    expect(graph.edges).toEqual([{ source: "A", target: "B", weight: 1 }]);
    expect(graph).toMatchObject({ start: "A", target: "A", directed: false });
    expect(parseGraphJson(json({ nodes: ["Solo"], edges: [] })).nodes).toEqual([{ id: "Solo", x: 325, y: 205 }]);
  });

  it("clamps positions to the canvas and accepts an empty graph", () => {
    const graph = parseGraphJson(json({ nodes: [{ id: "A", x: -50, y: 999 }, { id: "B", x: 9999, y: 0 }], edges: [] }));
    expect(graph.nodes).toEqual([{ id: "A", x: 32, y: 378 }, { id: "B", x: 618, y: 32 }]);
    expect(parseGraphJson(json({ nodes: [], edges: [] }))).toEqual({
      nodes: [], edges: [], start: "", target: "", directed: false, description: "Imported custom graph.",
    });
  });

  it.each([
    ["{nodes: []}", "JSON could not be parsed. Check for missing commas, quotes, or braces."],
    [json([]), "Graph JSON must be an object with nodes and edges."],
    [json(null), "Graph JSON must be an object with nodes and edges."],
    [json({ edges: [] }), "Graph JSON must include a nodes array."],
    [json({ nodes: {}, edges: [] }), "Graph JSON must include a nodes array."],
    [json({ nodes: [] }), "Graph JSON must include an edges array."],
  ])("rejects a malformed document: %s", (raw, message) => {
    expect(() => parseGraphJson(raw)).toThrow(message);
  });

  it.each([
    [[5], "Node 1 must be a node ID string or an object with id, x, and y."],
    [["A", "  "], "Node 2 needs a non-empty id."],
    [[{ x: 10, y: 10 }], "Node 1 needs a non-empty id."],
    [["A", "A"], "Node ID A is duplicated. Node IDs must be unique."],
    [[{ id: "A", x: 10 }], "Node A must use finite numeric x and y positions."],
    [[{ x: "10", y: 10 }], "Node 1 must use finite numeric x and y positions."],
  ])("rejects invalid nodes: %j", (nodes, message) => {
    expect(() => parseGraphJson(json({ nodes, edges: [] }))).toThrow(message);
  });

  it.each([
    ["A-B", "Edge 1 must be an object with source, target, and weight."],
    [edge("A", ""), "Edge 1 needs source and target node IDs."],
    [edge(1, "B"), "Edge 1 needs source and target node IDs."],
    [edge("Z", "B"), "Edge 1 uses unknown source node Z."],
    [edge("A", "Z"), "Edge 1 uses unknown target node Z."],
    [edge("A", "A"), "Edge 1 is a self-loop. Choose two different nodes."],
    [edge("A", "B", "3"), "Edge 1 needs a finite numeric weight."],
    [{ source: "A", target: "B" }, "Edge 1 needs a finite numeric weight."],
  ])("rejects invalid edges: %j", (invalidEdge, message) => {
    expect(() => parseGraphJson(graphWith({ edges: [invalidEdge] }))).toThrow(message);
  });

  it.each([
    [{ directed: "yes" }, "The directed field must be true or false."],
    [{ start: "Z" }, "Start node Z is not in the nodes array."],
    [{ target: "Z" }, "Target node Z is not in the nodes array."],
    [{ start: "" }, "Start must be a node ID from the nodes array."],
    [{ start: 1 }, "Start must be a node ID from the nodes array."],
    [{ target: " " }, "Target must be a node ID from the nodes array."],
  ])("rejects invalid graph settings: %j", (settings, message) => {
    expect(() => parseGraphJson(graphWith(settings))).toThrow(message);
  });
});

describe("serializeGraph", () => {
  it("exports a graph that imports back unchanged", () => {
    for (const preset of GRAPH_PRESETS) {
      const graph: ActiveGraph = {
        nodes: preset.nodes,
        edges: preset.edges,
        start: preset.defaultStart,
        target: preset.defaultTarget,
        directed: true,
        description: preset.description,
      };
      expect(parseGraphJson(serializeGraph(graph))).toEqual({ ...graph, description: "Imported custom graph." });
    }
  });

  it("writes only the fields that import reads", () => {
    const exported = JSON.parse(serializeGraph({
      nodes: [{ id: "A", x: 40, y: 50 }],
      edges: [],
      start: "A",
      target: "A",
      directed: false,
      description: "Not exported",
    }));
    expect(exported).toEqual({ nodes: [{ id: "A", x: 40, y: 50 }], edges: [], directed: false, start: "A", target: "A" });
  });
});
