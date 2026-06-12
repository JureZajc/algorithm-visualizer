"use client";

import { useState } from "react";

import { GraphCanvas } from "@/components/graph-canvas";
import { ErrorMessage } from "@/components/sorting-visualizer";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchGraphSteps } from "@/lib/api";
import { GRAPH_PRESETS } from "@/lib/graph-presets";
import { GRAPH_ALGORITHM_LABELS, type GraphAlgorithm, type GraphStep } from "@/types/graph";

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

export function GraphVisualizer() {
  const [presetId, setPresetId] = useState(GRAPH_PRESETS[0].id);
  const preset = GRAPH_PRESETS.find((item) => item.id === presetId) ?? GRAPH_PRESETS[0];
  const [algorithm, setAlgorithm] = useState<GraphAlgorithm>("bfs");
  const [start, setStart] = useState(preset.defaultStart);
  const [target, setTarget] = useState(preset.defaultTarget);
  const [directed, setDirected] = useState(false);
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<GraphStep>(speed);
  const finalPath = playback.isComplete ? playback.currentStep?.path ?? [] : [];
  const distances = playback.currentStep?.distances;

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function changePreset(nextId: string) {
    const next = GRAPH_PRESETS.find((item) => item.id === nextId) ?? GRAPH_PRESETS[0];
    setPresetId(next.id);
    setStart(next.defaultStart);
    setTarget(next.defaultTarget);
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
        directed,
      });
      playback.load(response.steps);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load graph steps.");
    } finally {
      setIsLoading(false);
    }
  }

  const result = playback.isComplete
    ? finalPath.length > 0 ? finalPath.join(" -> ") : "No path found"
    : "Waiting for completion";

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Graph preset
          <select className={inputClass} value={presetId} disabled={playback.isPlaying || isLoading} onChange={(event) => changePreset(event.target.value)}>
            {GRAPH_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Algorithm
          <select className={inputClass} value={algorithm} disabled={playback.isPlaying || isLoading} onChange={(event) => { setAlgorithm(event.target.value as GraphAlgorithm); resetForInputChange(); }}>
            {Object.entries(GRAPH_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Start node
          <select className={inputClass} value={start} disabled={playback.isPlaying || isLoading} onChange={(event) => { setStart(event.target.value); resetForInputChange(); }}>
            {preset.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Target node
          <select className={inputClass} value={target} disabled={playback.isPlaying || isLoading} onChange={(event) => { setTarget(event.target.value); resetForInputChange(); }}>
            {preset.nodes.map((node) => <option key={node.id} value={node.id}>{node.id}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={100} max={1200} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-5">
          <label className="mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">
            <input className="h-4 w-4 accent-indigo-600" type="checkbox" checked={directed} disabled={playback.isPlaying || isLoading} onChange={(event) => { setDirected(event.target.checked); resetForInputChange(); }} /> Directed graph
          </label>
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={playback.isPlaying || isLoading} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
          <button className={`${buttonClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`} type="button" disabled={playback.steps.length === 0 || isLoading || playback.isComplete} onClick={playback.toggle}>{playback.isPlaying ? "Pause" : "Resume"}</button>
          <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={isLoading} onClick={playback.reset}>Reset</button>
        </div>
      </section>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">{GRAPH_ALGORITHM_LABELS[algorithm]}</h2>
              <p className="m-0 text-sm leading-6 text-slate-500" aria-live="polite">{playback.currentStep?.description ?? preset.description}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
              <Legend color="bg-amber-400" label="Current" /><Legend color="bg-sky-500" label="Visited" /><Legend color="bg-violet-500" label="Frontier" /><Legend color="bg-emerald-500" label="Path" />
            </div>
          </div>
          <GraphCanvas nodes={preset.nodes} edges={preset.edges} start={start} target={target} directed={directed} step={playback.currentStep} />
        </section>

        <VisualizerStats algorithmName={GRAPH_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel="Final path" result={<span className="font-mono text-xs font-medium">{result}</span>}>
          <Stat label="Frontier">{playback.currentStep?.frontier.join(", ") || "Empty"}</Stat>
          {algorithm === "dijkstra" ? <Stat label="Distances"><div className="grid grid-cols-2 gap-x-3 font-mono text-xs font-medium">{preset.nodes.map((node) => <span key={node.id}>{node.id}: {distances?.[node.id] ?? "∞"}</span>)}</div></Stat> : null}
        </VisualizerStats>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}
