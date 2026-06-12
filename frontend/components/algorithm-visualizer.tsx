"use client";

import { useEffect, useState } from "react";

import { GraphVisualizer } from "@/components/graph-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { fetchAlgorithms } from "@/lib/api";
import type { AlgorithmsResponse, VisualizerMode } from "@/types/algorithm";

const MODES: { id: VisualizerMode; label: string; shortLabel: string }[] = [
  { id: "sorting", label: "Sorting", shortLabel: "Sort" },
  { id: "searching", label: "Searching", shortLabel: "Search" },
  { id: "graph", label: "Graph / Pathfinding", shortLabel: "Graph" },
];

export function AlgorithmVisualizer() {
  const [mode, setMode] = useState<VisualizerMode>("sorting");
  const [algorithms, setAlgorithms] = useState<AlgorithmsResponse | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchAlgorithms(controller.signal)
      .then(setAlgorithms)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMetadataError(error instanceof Error ? error.message : "Could not load algorithm details.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsMetadataLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto min-h-screen w-[min(1240px,calc(100%-24px))] py-6 sm:w-[min(1240px,calc(100%-40px))] sm:py-10">
      <header className="mb-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Open source learning tool</p>
          <h1 className="mb-3 text-[clamp(2.25rem,6vw,4.5rem)] font-black leading-[0.92] tracking-[-0.06em] text-slate-950">Algorithm<br className="hidden sm:block" /> Visualizer</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">See how data structures change at every step, from array operations to graph traversal, shortest paths, ordering, and spanning trees.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
          API-backed steps
        </div>
      </header>

      <nav className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-sm backdrop-blur" aria-label="Visualizer mode">
        {MODES.map((item) => (
          <button
            className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition ${mode === item.id ? "bg-slate-950 text-white shadow-lg shadow-slate-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
            type="button"
            key={item.id}
            aria-current={mode === item.id ? "page" : undefined}
            onClick={() => setMode(item.id)}
          >
            <span className="sm:hidden">{item.shortLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {mode === "sorting" ? <SortingVisualizer algorithms={algorithms?.sorting ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "searching" ? <SearchingVisualizer algorithms={algorithms?.searching ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "graph" ? <GraphVisualizer algorithms={algorithms?.graph ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
    </main>
  );
}
