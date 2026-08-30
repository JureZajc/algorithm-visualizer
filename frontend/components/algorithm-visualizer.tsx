"use client";

import { useEffect, useState } from "react";

import { BacktrackingVisualizer } from "@/components/backtracking-visualizer";
import { DynamicProgrammingVisualizer } from "@/components/dynamic-programming-visualizer";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { HashTablesVisualizer } from "@/components/hash-tables-visualizer";
import { SearchingVisualizer } from "@/components/searching-visualizer";
import { SortingComparison } from "@/components/sorting-comparison";
import { SortingVisualizer } from "@/components/sorting-visualizer";
import { TreesVisualizer } from "@/components/trees-visualizer";
import { fetchAlgorithms } from "@/lib/api";
import type { AlgorithmsResponse, VisualizerMode } from "@/types/algorithm";

const MODES: { id: VisualizerMode; label: string }[] = [
  { id: "sorting", label: "Sorting" },
  { id: "compare", label: "Compare" },
  { id: "searching", label: "Searching" },
  { id: "graph", label: "Graph / Pathfinding" },
  { id: "dynamic_programming", label: "Dynamic Programming" },
  { id: "backtracking", label: "Backtracking" },
  { id: "trees", label: "Trees" },
  { id: "hash_tables", label: "Hash Tables" },
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
      <header className="mb-6">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Open source learning tool</p>
          <h1 className="mb-3 text-[clamp(2.25rem,5vw,4rem)] font-black leading-[0.92] tracking-normal text-slate-950">Algorithm<br className="hidden sm:block" /> Visualizer</h1>
          <p className="m-0 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">See how data structures change at every step, from array operations to tree traversal, hash tables, graph traversal, shortest paths, spanning trees, dynamic programming tables, and backtracking search.</p>
          <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
            Interactive step by step
          </div>
        </div>
      </header>

      <nav className="relative mb-5 rounded-2xl border border-slate-200 bg-white/85 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur" aria-label="Visualizer mode">
        <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0 xl:grid-cols-[0.8fr_0.9fr_1fr_1.3fr_1.45fr_1.15fr_0.75fr_1fr]">
          {MODES.map((item) => (
            <button
              className={`min-h-11 shrink-0 snap-start rounded-xl px-3 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:min-w-0 sm:whitespace-normal xl:px-2 xl:text-xs xl:whitespace-nowrap ${mode === item.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              type="button"
              key={item.id}
              aria-current={mode === item.id ? "page" : undefined}
              aria-label={item.label}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute inset-y-1.5 right-1.5 flex items-center bg-gradient-to-l from-white/95 via-white/75 to-transparent pl-8 pr-2 text-xs font-bold text-slate-500 sm:hidden" aria-hidden="true">
          Scroll →
        </span>
      </nav>

      {mode === "sorting" ? <SortingVisualizer algorithms={algorithms?.sorting ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "compare" ? <SortingComparison algorithms={algorithms?.sorting ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "searching" ? <SearchingVisualizer algorithms={algorithms?.searching ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "graph" ? <GraphVisualizer algorithms={algorithms?.graph ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "dynamic_programming" ? <DynamicProgrammingVisualizer algorithms={algorithms?.dynamic_programming ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "backtracking" ? <BacktrackingVisualizer algorithms={algorithms?.backtracking ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "trees" ? <TreesVisualizer algorithms={algorithms?.trees ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
      {mode === "hash_tables" ? <HashTablesVisualizer algorithms={algorithms?.hash_tables ?? []} isMetadataLoading={isMetadataLoading} metadataError={metadataError} /> : null}
    </main>
  );
}
