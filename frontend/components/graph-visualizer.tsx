"use client";

import { useState } from "react";

import { GraphCanvas } from "@/components/graph-canvas";
import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage } from "@/components/sorting-visualizer";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchGraphSteps } from "@/lib/api";
import { createAdmissibleHeuristics, GRAPH_PRESETS } from "@/lib/graph-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import { GRAPH_ALGORITHM_LABELS, type GraphAlgorithm, type GraphEdge, type GraphStep } from "@/types/graph";

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

function formatEdges(edges: GraphEdge[]) {
  return edges.length > 0
    ? edges.map((edge) => `${edge.source}-${edge.target} (${edge.weight})`).join(", ")
    : "None";
}

export function GraphVisualizer(props: MetadataSourceProps) {
  const [presetId, setPresetId] = useState(GRAPH_PRESETS[0].id);
  const preset = GRAPH_PRESETS.find((item) => item.id === presetId) ?? GRAPH_PRESETS[0];
  const [algorithm, setAlgorithm] = useState<GraphAlgorithm>("bfs");
  const [start, setStart] = useState(preset.defaultStart);
  const [target, setTarget] = useState(preset.defaultTarget);
  const [directed, setDirected] = useState(preset.defaultDirected ?? false);
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<GraphStep>(speed);

  const isPathAlgorithm = PATH_ALGORITHMS.has(algorithm);
  const isMstAlgorithm = MST_ALGORITHMS.has(algorithm);
  const needsStart = isPathAlgorithm || algorithm === "prim";
  const needsTarget = isPathAlgorithm;
  const effectiveDirected = algorithm === "topological_sort" ? true : isMstAlgorithm ? false : directed;
  const heuristics = createAdmissibleHeuristics(preset, target);
  const currentStep = playback.currentStep;
  const cycleDetected = playback.steps.some((step) => step.type === "cycle_detected");

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function selectPreset(nextId: string) {
    const next = GRAPH_PRESETS.find((item) => item.id === nextId) ?? GRAPH_PRESETS[0];
    setPresetId(next.id);
    setStart(next.defaultStart);
    setTarget(next.defaultTarget);
    setDirected(next.defaultDirected ?? false);
    resetForInputChange();
  }

  function selectAlgorithm(next: GraphAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  async function startVisualization() {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const response = await fetchGraphSteps({
        nodes: preset.nodes.map((node) => node.id),
        edges: preset.edges,
        start,
        target,
        algorithm,
        directed: effectiveDirected,
        ...(algorithm === "a_star" ? { heuristics } : {}),
      });
      playback.load(response.steps);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load graph steps.");
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
          Graph preset
          <select className={inputClass} value={presetId} disabled={playback.isPlaying || isLoading} onChange={(event) => selectPreset(event.target.value)}>
            {GRAPH_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Algorithm
          <select className={inputClass} value={algorithm} disabled={playback.isPlaying || isLoading} onChange={(event) => selectAlgorithm(event.target.value as GraphAlgorithm)}>
            {Object.entries(GRAPH_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {needsStart ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Start node
            <select className={inputClass} value={start} disabled={playback.isPlaying || isLoading} onChange={(event) => { setStart(event.target.value); resetForInputChange(); }}>
              {preset.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </label>
        ) : null}
        {needsTarget ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Target node
            <select className={inputClass} value={target} disabled={playback.isPlaying || isLoading} onChange={(event) => { setTarget(event.target.value); resetForInputChange(); }}>
              {preset.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700 xl:col-span-2">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={100} max={1200} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
          {isPathAlgorithm ? (
            <label className="mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
              <input className="h-4 w-4 accent-indigo-600" type="checkbox" checked={directed} disabled={playback.isPlaying || isLoading} onChange={(event) => { setDirected(event.target.checked); resetForInputChange(); }} /> Directed graph
            </label>
          ) : (
            <span className="mr-2 inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
              {algorithm === "topological_sort" ? "Directed graph required" : "Undirected graph required"}
            </span>
          )}
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={playback.isPlaying || isLoading} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
          <button className={`${buttonClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`} type="button" disabled={playback.steps.length === 0 || isLoading || playback.isComplete} onClick={playback.toggle}>{playback.isPlaying ? "Pause" : "Resume"}</button>
          <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={isLoading} onClick={playback.reset}>Reset</button>
        </div>
      </section>

      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">{GRAPH_ALGORITHM_LABELS[algorithm]}</h2>
              <p className="m-0 min-h-6 text-sm leading-6 text-slate-500" aria-live="polite">{currentStep?.description ?? preset.description}</p>
            </div>
            <div className="flex max-w-md flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-slate-500">
              {LEGEND_ITEMS.filter((item) => isMstAlgorithm || (item.id !== "candidate" && item.id !== "rejected")).map((item) => (
                <span className="inline-flex items-center gap-1.5" key={item.id}><span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />{item.label}</span>
              ))}
            </div>
          </div>
          <GraphCanvas nodes={preset.nodes} edges={preset.edges} start={start} target={target} directed={effectiveDirected} showStart={needsStart} showTarget={needsTarget} step={currentStep} />
        </section>

        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={GRAPH_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel={resultLabel} result={<span className="font-mono text-xs font-medium">{result}</span>}>
            {currentStep?.frontier.length || (!isMstAlgorithm && algorithm !== "topological_sort") ? <Stat label={algorithm === "dfs" || algorithm === "a_star" ? "Stack / open set" : "Frontier"}>{currentStep?.frontier.join(", ") || "Empty"}</Stat> : null}
            {WEIGHTED_PATH_ALGORITHMS.has(algorithm) ? <Stat label="Path costs"><div className="grid grid-cols-2 gap-x-3 font-mono text-xs font-medium">{preset.nodes.map((node) => <span key={node.id}>{node.id}: {currentStep?.distances?.[node.id] ?? "∞"}</span>)}</div></Stat> : null}
            {algorithm === "a_star" ? <Stat label="Heuristics"><div className="grid grid-cols-2 gap-x-3 font-mono text-xs font-medium">{preset.nodes.map((node) => <span key={node.id}>{node.id}: {heuristics[node.id]}</span>)}</div></Stat> : null}
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
