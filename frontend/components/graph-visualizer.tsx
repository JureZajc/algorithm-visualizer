"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { GraphCanvas } from "@/components/graph-canvas";
import { GraphEditor } from "@/components/graph-editor";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { StepControls } from "@/components/step-controls";
import { Alert, Button, FormField, InlineMessage, inputClassName, Panel, type LegendItem } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { LearningPanel } from "@/components/learning-panel";
import { fetchGraphSteps } from "@/lib/api";
import { parseGraphJson, serializeGraph, type ActiveGraph } from "@/lib/graph-input";
import { createAdmissibleHeuristics, GRAPH_PRESETS } from "@/lib/graph-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  GRAPH_ALGORITHM_LABELS,
  type GraphAlgorithm,
  type GraphEdge,
  type GraphPreset,
  type GraphStep,
} from "@/types/graph";

const CUSTOM_GRAPH_ID = "custom";
const PATH_ALGORITHMS = new Set<GraphAlgorithm>(["bfs", "dfs", "dijkstra", "a_star"]);
const WEIGHTED_PATH_ALGORITHMS = new Set<GraphAlgorithm>(["dijkstra", "a_star"]);
const MST_ALGORITHMS = new Set<GraphAlgorithm>(["kruskal", "prim"]);

// The node and edge colors GraphCanvas draws. The current node or edge takes the color of the
// step's action; most actions inspect, so "Current" shows that color.
const CURRENT: LegendItem = { label: "Current", tone: "amber" };
const VISITED: LegendItem = { label: "Visited", tone: "sky" };
const FRONTIER: LegendItem = { label: "Frontier", tone: "violet" };
const PATH: LegendItem = { label: "Path", tone: "emerald" };
const SPANNING_TREE: LegendItem = { label: "Spanning tree", tone: "emerald" };
const CANDIDATE: LegendItem = { label: "Candidate", tone: "cyan" };
const REJECTED: LegendItem = { label: "Rejected", tone: "rose" };

const LEGENDS: Record<GraphAlgorithm, LegendItem[]> = {
  bfs: [CURRENT, VISITED, FRONTIER, PATH],
  dfs: [CURRENT, VISITED, FRONTIER, PATH],
  dijkstra: [CURRENT, VISITED, FRONTIER, { label: "Relax", tone: "fuchsia" }, PATH],
  a_star: [CURRENT, VISITED, FRONTIER, { label: "Relax", tone: "fuchsia" }, PATH],
  topological_sort: [CURRENT, FRONTIER, { label: "Ordered", tone: "teal" }, { label: "Cycle", tone: "rose-soft" }],
  kruskal: [CURRENT, SPANNING_TREE, CANDIDATE, REJECTED],
  prim: [CURRENT, VISITED, SPANNING_TREE, CANDIDATE, REJECTED],
};

function graphFromPreset(preset: GraphPreset): ActiveGraph {
  return {
    nodes: preset.nodes.map((node) => ({ ...node })),
    edges: preset.edges.map((edge) => ({ ...edge })),
    start: preset.defaultStart,
    target: preset.defaultTarget,
    directed: preset.defaultDirected ?? false,
    description: preset.description,
  };
}

function createEmptyGraph(): ActiveGraph {
  return {
    nodes: [],
    edges: [],
    start: "",
    target: "",
    directed: false,
    description: "Create a graph, choose its start and target nodes, then run an algorithm.",
  };
}

function formatEdges(edges: GraphEdge[]) {
  return edges.length > 0
    ? edges.map((edge) => `${edge.source}-${edge.target} (${edge.weight})`).join(", ")
    : "None";
}

export function GraphVisualizer(props: MetadataSourceProps) {
  const [graphId, setGraphId] = useState(GRAPH_PRESETS[0].id);
  const [customGraph, setCustomGraph] = useState<ActiveGraph>(createEmptyGraph);
  const [activeGraph, setActiveGraph] = useState<ActiveGraph>(() => graphFromPreset(GRAPH_PRESETS[0]));
  const [algorithm, setAlgorithm] = useState<GraphAlgorithm>("bfs");
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const playback = useLearningPlayback<GraphStep>(speed, algorithm);

  const isCustom = graphId === CUSTOM_GRAPH_ID;
  const isPathAlgorithm = PATH_ALGORITHMS.has(algorithm);
  const isMstAlgorithm = MST_ALGORITHMS.has(algorithm);
  const needsStart = isPathAlgorithm || algorithm === "prim";
  const needsTarget = isPathAlgorithm;
  const effectiveDirected = algorithm === "topological_sort" ? true : isMstAlgorithm ? false : activeGraph.directed;
  const directionLockMessage = algorithm === "topological_sort"
    ? "Topological Sort always runs in directed mode. Your graph type choice is preserved for other algorithms."
    : isMstAlgorithm
      ? "Minimum spanning tree algorithms always run in undirected mode. Your graph type choice is preserved for other algorithms."
      : null;
  const heuristics = createAdmissibleHeuristics(activeGraph.nodes, activeGraph.edges, activeGraph.target);
  const currentStep = playback.currentStep;
  const cycleDetected = playback.steps.some((step) => step.type === "cycle_detected");
  const editingDisabled = playback.isPlaying || isLoading;
  const hasNegativeWeight = activeGraph.edges.some((edge) => edge.weight < 0);

  let validationMessage: string | null = null;
  if (activeGraph.nodes.length === 0) {
    validationMessage = "Add at least one node before starting the visualization.";
  } else if (!activeGraph.nodes.some((node) => node.id === activeGraph.start)) {
    validationMessage = "Choose a valid start node before starting the visualization.";
  } else if (!activeGraph.nodes.some((node) => node.id === activeGraph.target)) {
    validationMessage = "Choose a valid target node before starting the visualization.";
  } else if (hasNegativeWeight && algorithm === "dijkstra") {
    validationMessage = "Dijkstra's algorithm requires non-negative weights.";
  } else if (hasNegativeWeight && algorithm === "a_star") {
    validationMessage = "A* search requires non-negative weights.";
  }

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function commitGraph(next: ActiveGraph) {
    setActiveGraph(next);
    if (isCustom) setCustomGraph(next);
    setEditorError(null);
    resetForInputChange();
  }

  function updateGraph(update: (graph: ActiveGraph) => ActiveGraph) {
    commitGraph(update(activeGraph));
  }

  function selectGraph(nextId: string) {
    setGraphId(nextId);
    setPendingNodeId(null);
    setEditorError(null);
    if (nextId === CUSTOM_GRAPH_ID) {
      setActiveGraph(customGraph);
    } else {
      const preset = GRAPH_PRESETS.find((item) => item.id === nextId) ?? GRAPH_PRESETS[0];
      setActiveGraph(graphFromPreset(preset));
    }
    resetForInputChange();
  }

  function selectAlgorithm(next: GraphAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  function beginNodePlacement(rawNodeId: string) {
    const nodeId = rawNodeId.trim();
    if (!nodeId) {
      setEditorError("Enter a node ID before adding a node.");
      return false;
    }
    if (activeGraph.nodes.some((node) => node.id === nodeId)) {
      setEditorError(`Node ID ${nodeId} already exists.`);
      return false;
    }
    setEditorError(null);
    setPendingNodeId(nodeId);
    return true;
  }

  function placeNode(x: number, y: number) {
    if (!pendingNodeId || activeGraph.nodes.some((node) => node.id === pendingNodeId)) return;
    const isFirstNode = activeGraph.nodes.length === 0;
    commitGraph({
      ...activeGraph,
      nodes: [...activeGraph.nodes, { id: pendingNodeId, x, y }],
      start: isFirstNode ? pendingNodeId : activeGraph.start,
      target: isFirstNode ? pendingNodeId : activeGraph.target,
    });
    setPendingNodeId(null);
  }

  function removeNode(nodeId: string) {
    const nodes = activeGraph.nodes.filter((node) => node.id !== nodeId);
    const fallback = nodes[0]?.id ?? "";
    updateGraph((graph) => ({
      ...graph,
      nodes,
      edges: graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      start: nodes.some((node) => node.id === graph.start) ? graph.start : fallback,
      target: nodes.some((node) => node.id === graph.target) ? graph.target : fallback,
    }));
  }

  function addEdge(source: string, target: string, weight: number) {
    const nodeIds = new Set(activeGraph.nodes.map((node) => node.id));
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      setEditorError("Both edge endpoints must be nodes in the graph.");
      return false;
    }
    if (source === target) {
      setEditorError("Choose two different nodes. Self-loops are not supported in this editor.");
      return false;
    }
    if (!Number.isFinite(weight)) {
      setEditorError("Enter a finite numeric edge weight.");
      return false;
    }
    updateGraph((graph) => ({ ...graph, edges: [...graph.edges, { source, target, weight }] }));
    return true;
  }

  function updateEdgeWeight(index: number, weight: number) {
    if (!Number.isFinite(weight)) {
      setEditorError("Enter a finite numeric edge weight.");
      return false;
    }
    updateGraph((graph) => ({
      ...graph,
      edges: graph.edges.map((edge, edgeIndex) => edgeIndex === index ? { ...edge, weight } : edge),
    }));
    return true;
  }

  function exportJson() {
    const url = URL.createObjectURL(new Blob([serializeGraph(activeGraph)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-graph.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(serializeGraph(activeGraph));
      return true;
    } catch {
      return false;
    }
  }

  function loadJson(rawJson: string) {
    try {
      const graph = parseGraphJson(rawJson);
      setGraphId(CUSTOM_GRAPH_ID);
      setCustomGraph(graph);
      setActiveGraph(graph);
      setPendingNodeId(null);
      setEditorError(null);
      resetForInputChange();
      return true;
    } catch (importError) {
      setEditorError(importError instanceof Error ? importError.message : "Could not load graph JSON.");
      return false;
    }
  }

  async function startVisualization() {
    if (validationMessage) {
      return;
    }
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const response = await fetchGraphSteps({
        nodes: activeGraph.nodes.map((node) => node.id),
        edges: activeGraph.edges,
        start: activeGraph.start,
        target: activeGraph.target,
        algorithm,
        directed: effectiveDirected,
        ...(algorithm === "a_star" ? { heuristics } : {}),
      });
      playback.load(response.steps, true, { nodes: response.nodes });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load graph steps.");
    } finally {
      setIsLoading(false);
    }
  }

  let result = "Waiting for completion";
  let resultLabel = "Final path";
  if (playback.isComplete && isPathAlgorithm) {
    result = currentStep?.path.length ? currentStep.path.join(" → ") : "No path found";
  } else if (playback.isComplete && algorithm === "topological_sort") {
    resultLabel = "Topological order";
    result = cycleDetected ? "Cycle detected; no complete order" : currentStep?.result.join(" → ") || "No nodes";
  } else if (playback.isComplete && isMstAlgorithm) {
    resultLabel = "Spanning forest";
    result = `${currentStep?.mst_edges.length ?? 0} edges, weight ${currentStep?.total_weight ?? 0}`;
  } else if (algorithm === "topological_sort") {
    resultLabel = "Topological order";
  } else if (isMstAlgorithm) {
    resultLabel = "Spanning forest";
  }

  return (
    <div>
      <Panel className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6" variant="control">
        <FormField label="Graph" className="xl:col-span-2">
          <select className={inputClassName()} value={graphId} disabled={editingDisabled} onChange={(event) => selectGraph(event.target.value)}>
            {GRAPH_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value={CUSTOM_GRAPH_ID}>Custom graph</option>
          </select>
        </FormField>
        <FormField label="Algorithm" className="xl:col-span-2">
          <select className={inputClassName()} value={algorithm} disabled={editingDisabled} onChange={(event) => selectAlgorithm(event.target.value as GraphAlgorithm)}>
            {Object.entries(GRAPH_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </FormField>
        {!isCustom && needsStart ? (
          <FormField label="Start node">
            <select className={inputClassName()} value={activeGraph.start} disabled={editingDisabled} onChange={(event) => updateGraph((graph) => ({ ...graph, start: event.target.value }))}>
              {activeGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </FormField>
        ) : null}
        {!isCustom && needsTarget ? (
          <FormField label="Target node">
            <select className={inputClassName()} value={activeGraph.target} disabled={editingDisabled} onChange={(event) => updateGraph((graph) => ({ ...graph, target: event.target.value }))}>
              {activeGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </FormField>
        ) : null}
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700 xl:col-span-2">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={100} max={1200} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
          {!isCustom && isPathAlgorithm ? (
            <label className="mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
              <input className="h-4 w-4 accent-indigo-600" type="checkbox" checked={activeGraph.directed} disabled={editingDisabled} onChange={(event) => updateGraph((graph) => ({ ...graph, directed: event.target.checked }))} /> Directed graph
            </label>
          ) : (
            <span className="mr-2 inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
              {algorithm === "topological_sort" ? "Directed graph required" : isMstAlgorithm ? "Undirected graph required" : effectiveDirected ? "Directed graph" : "Undirected graph"}
            </span>
          )}
          <Button variant="primary" disabled={editingDisabled || validationMessage !== null} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</Button>
          <Button disabled={isLoading} onClick={playback.reset}>Reset run</Button>
        </div>
        {validationMessage ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 md:col-span-2 xl:col-span-6">
            <InlineMessage tone="error">{validationMessage}</InlineMessage>
          </div>
        ) : null}
        <div className="md:col-span-2 xl:col-span-6">
          <StepControls
            currentStepIndex={playback.currentStepIndex}
            totalSteps={playback.steps.length}
            isLoading={isLoading}
            isPlaying={playback.isPlaying}
            learningBlocked={playback.learning.blocked}
            onTogglePlayback={playback.toggle}
            onPrevious={playback.previous}
            onNext={playback.next}
            onJumpToStart={playback.jumpToStart}
            onJumpToEnd={playback.jumpToEnd}
            onRestart={playback.restart}
            onSeek={playback.seek}
          />
        </div>
      </Panel>

      <LearningPanel learning={playback.learning} isLoading={isLoading} />

      {isCustom ? (
        <GraphEditor
          nodes={activeGraph.nodes}
          edges={activeGraph.edges}
          start={activeGraph.start}
          target={activeGraph.target}
          directed={effectiveDirected}
          disabled={editingDisabled}
          pendingNodeId={pendingNodeId}
          directionLockMessage={directionLockMessage}
          error={editorError}
          onBeginNodePlacement={beginNodePlacement}
          onCancelNodePlacement={() => setPendingNodeId(null)}
          onRemoveNode={removeNode}
          onAddEdge={addEdge}
          onRemoveEdge={(index) => updateGraph((graph) => ({ ...graph, edges: graph.edges.filter((_, edgeIndex) => edgeIndex !== index) }))}
          onUpdateEdgeWeight={updateEdgeWeight}
          onInvalidWeight={() => setEditorError("Enter a finite numeric edge weight.")}
          onStartChange={(start) => updateGraph((graph) => ({ ...graph, start }))}
          onTargetChange={(target) => updateGraph((graph) => ({ ...graph, target }))}
          onDirectedChange={(directed) => updateGraph((graph) => ({ ...graph, directed }))}
          onExportJson={exportJson}
          onCopyJson={copyJson}
          onLoadJson={loadJson}
        />
      ) : null}

      {error ? <Alert title="Visualization unavailable">{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <VisualizationPanel
          title={GRAPH_ALGORITHM_LABELS[algorithm]}
          className="min-w-0 p-4 sm:p-5"
          status={playbackStatus({
            hasError: error !== null,
            hasValidationError: validationMessage !== null,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? (pendingNodeId ? `Click the canvas to place node ${pendingNodeId}.` : activeGraph.description)}
          legend={LEGENDS[algorithm]}
          resultSummary={playback.isComplete ? <span>{resultLabel}: <span className="font-mono text-xs">{result}</span></span> : null}
        >
          <GraphCanvas
            nodes={activeGraph.nodes}
            edges={activeGraph.edges}
            start={activeGraph.start}
            target={activeGraph.target}
            directed={effectiveDirected}
            showStart={needsStart}
            showTarget={needsTarget}
            step={currentStep}
            isPlacementActive={isCustom && pendingNodeId !== null && !editingDisabled}
            onCanvasClick={isCustom ? placeNode : undefined}
          />
        </VisualizationPanel>

        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={GRAPH_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel={resultLabel} result={<span className="font-mono text-xs font-medium">{result}</span>}>
            {currentStep?.frontier.length || (!isMstAlgorithm && algorithm !== "topological_sort") ? <Stat label={algorithm === "dfs" || algorithm === "a_star" ? "Stack / open set" : "Frontier"}>{currentStep?.frontier.join(", ") || "Empty"}</Stat> : null}
            {WEIGHTED_PATH_ALGORITHMS.has(algorithm) ? <Stat label="Path costs"><div className="grid grid-cols-2 gap-x-3 font-mono text-xs font-medium">{activeGraph.nodes.map((node) => <span key={node.id}>{node.id}: {currentStep?.distances?.[node.id] ?? "∞"}</span>)}</div></Stat> : null}
            {algorithm === "a_star" ? <Stat label="Heuristics"><div className="grid grid-cols-2 gap-x-3 font-mono text-xs font-medium">{activeGraph.nodes.map((node) => <span key={node.id}>{node.id}: {heuristics[node.id]}</span>)}</div></Stat> : null}
            {algorithm === "topological_sort" ? <Stat label="Current order"><span className="font-mono text-xs">{currentStep?.result.join(" → ") || "Empty"}</span></Stat> : null}
            {isMstAlgorithm ? <Stat label="Accepted edges"><span className="font-mono text-xs">{formatEdges(currentStep?.mst_edges ?? [])}</span></Stat> : null}
            {isMstAlgorithm ? <Stat label="Candidate edges"><span className="font-mono text-xs">{formatEdges(currentStep?.frontier_edges ?? [])}</span></Stat> : null}
            {isMstAlgorithm ? <Stat label="Total weight">{currentStep?.total_weight ?? 0}</Stat> : null}
          </VisualizerStats>
        </div>
      </div>
      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />
    </div>
  );
}
