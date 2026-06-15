"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { GraphCanvas } from "@/components/graph-canvas";
import { GraphEditor } from "@/components/graph-editor";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchGraphSteps } from "@/lib/api";
import { createAdmissibleHeuristics, GRAPH_PRESETS } from "@/lib/graph-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  GRAPH_ALGORITHM_LABELS,
  type GraphAlgorithm,
  type GraphEdge,
  type GraphNodePosition,
  type GraphPreset,
  type GraphStep,
} from "@/types/graph";

interface ActiveGraph {
  nodes: GraphNodePosition[];
  edges: GraphEdge[];
  start: string;
  target: string;
  directed: boolean;
  description: string;
}

const CUSTOM_GRAPH_ID = "custom";
const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";
const PATH_ALGORITHMS = new Set<GraphAlgorithm>(["bfs", "dfs", "dijkstra", "a_star"]);
const WEIGHTED_PATH_ALGORITHMS = new Set<GraphAlgorithm>(["dijkstra", "a_star"]);
const MST_ALGORITHMS = new Set<GraphAlgorithm>(["kruskal", "prim"]);

const LEGEND_ITEMS = [
  { id: "current", label: "Current", className: "bg-amber-400" },
  { id: "visited", label: "Visited", className: "bg-sky-500" },
  { id: "frontier", label: "Frontier", className: "bg-violet-500" },
  { id: "path", label: "Path / MST", className: "bg-emerald-500" },
  { id: "candidate", label: "Candidate", className: "bg-cyan-400" },
  { id: "rejected", label: "Rejected", className: "bg-rose-500" },
] as const;

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
  const playback = useStepPlayback<GraphStep>(speed);

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

  async function startVisualization() {
    if (validationMessage) {
      setError(validationMessage);
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
      playback.load(response.steps);
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
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Graph
          <select className={inputClass} value={graphId} disabled={editingDisabled} onChange={(event) => selectGraph(event.target.value)}>
            {GRAPH_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            <option value={CUSTOM_GRAPH_ID}>Custom graph</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Algorithm
          <select className={inputClass} value={algorithm} disabled={editingDisabled} onChange={(event) => selectAlgorithm(event.target.value as GraphAlgorithm)}>
            {Object.entries(GRAPH_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {!isCustom && needsStart ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Start node
            <select className={inputClass} value={activeGraph.start} disabled={editingDisabled} onChange={(event) => updateGraph((graph) => ({ ...graph, start: event.target.value }))}>
              {activeGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </label>
        ) : null}
        {!isCustom && needsTarget ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Target node
            <select className={inputClass} value={activeGraph.target} disabled={editingDisabled} onChange={(event) => updateGraph((graph) => ({ ...graph, target: event.target.value }))}>
              {activeGraph.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </label>
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
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={editingDisabled || validationMessage !== null} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
          <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={isLoading} onClick={playback.reset}>Reset</button>
        </div>
        <div className="md:col-span-2 xl:col-span-6">
          <StepControls
            currentStepIndex={playback.currentStepIndex}
            totalSteps={playback.steps.length}
            isLoading={isLoading}
            isPlaying={playback.isPlaying}
            onTogglePlayback={playback.toggle}
            onPrevious={playback.previous}
            onNext={playback.next}
            onJumpToStart={playback.jumpToStart}
            onJumpToEnd={playback.jumpToEnd}
            onSeek={playback.seek}
          />
        </div>
      </section>

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
        />
      ) : null}

      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />

      {error ? <ErrorMessage message={error} /> : validationMessage && isCustom ? <ErrorMessage message={validationMessage} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">{GRAPH_ALGORITHM_LABELS[algorithm]}</h2>
              <p className="m-0 min-h-6 text-sm leading-6 text-slate-500" aria-live="polite">{currentStep?.description ?? (pendingNodeId ? `Click the canvas to place node ${pendingNodeId}.` : activeGraph.description)}</p>
            </div>
            <div className="flex max-w-md flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-slate-500">
              {LEGEND_ITEMS.filter((item) => isMstAlgorithm || (item.id !== "candidate" && item.id !== "rejected")).map((item) => (
                <span className="inline-flex items-center gap-1.5" key={item.id}><span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />{item.label}</span>
              ))}
            </div>
          </div>
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
        </section>

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
    </div>
  );
}
