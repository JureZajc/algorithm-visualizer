"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { TreeCanvas } from "@/components/tree-canvas";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchTreeSteps } from "@/lib/api";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  TREE_ALGORITHM_LABELS,
  type TreeAlgorithm,
  type TreeStep,
} from "@/types/trees";

const DEFAULT_VALUES = "8, 3, 10, 1, 6, 14, 4, 7, 13";
const DEFAULT_TARGET = 7;
const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

export function TreesVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<TreeAlgorithm>("bst_insert");
  const [valuesInput, setValuesInput] = useState(DEFAULT_VALUES);
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET));
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<TreeStep>(speed);
  const currentStep = playback.currentStep;
  const valuesPreview = parseValues(valuesInput, false);
  const displayedTree = currentStep?.tree ?? null;
  const isSearch = algorithm === "bst_search";
  const editingDisabled = playback.isPlaying || isLoading;

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function changeAlgorithm(next: TreeAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  async function startVisualization() {
    const parsed = parseValues(valuesInput, true);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const parsedTarget = Number(targetInput);
    if (isSearch && !Number.isInteger(parsedTarget)) {
      setError("Enter an integer target value.");
      return;
    }

    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const response = await fetchTreeSteps({
        algorithm,
        values: parsed.values,
        ...(isSearch ? { target: parsedTarget } : {}),
      });
      playback.load(response.steps);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load tree steps.");
    } finally {
      setIsLoading(false);
    }
  }

  const result = formatResult(algorithm, playback.isComplete, currentStep);
  const resultLabel = isSearch
    ? "Search result"
    : algorithm === "bst_insert"
      ? "Final inorder"
      : "Traversal order";

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Tree algorithm
          <select className={inputClass} value={algorithm} disabled={editingDisabled} onChange={(event) => changeAlgorithm(event.target.value as TreeAlgorithm)}>
            {Object.entries(TREE_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Values
          <input
            className={inputClass}
            value={valuesInput}
            disabled={editingDisabled}
            onChange={(event) => {
              setValuesInput(event.target.value);
              resetForInputChange();
            }}
          />
        </label>
        {isSearch ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Target
            <input
              className={inputClass}
              type="number"
              value={targetInput}
              disabled={editingDisabled}
              onChange={(event) => {
                setTargetInput(event.target.value);
                resetForInputChange();
              }}
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={120} max={1200} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={editingDisabled} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
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

      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div>
              <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">{TREE_ALGORITHM_LABELS[algorithm]}</h2>
              <p className="m-0 min-h-6 text-sm leading-6 text-slate-500" aria-live="polite">{currentStep?.description ?? "Enter unique values and start the tree visualization."}</p>
            </div>
            <div className="flex max-w-md flex-wrap gap-x-3 gap-y-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Current</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Inserted</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" />Visited</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />Path</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Found</span>
            </div>
          </div>
          <TreeCanvas tree={displayedTree} step={currentStep} />
        </section>

        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line ?? undefined} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={TREE_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel={resultLabel} result={<span className="font-mono text-xs font-medium">{result}</span>}>
            <Stat label="Input values"><span className="font-mono text-xs">{valuesPreview.ok ? valuesPreview.values.join(", ") : "Invalid input"}</span></Stat>
            {isSearch ? <Stat label="Search path"><span className="font-mono text-xs">{currentStep?.path.join(", ") || "Empty"}</span></Stat> : null}
            {!isSearch ? <Stat label="Visited order"><span className="font-mono text-xs">{currentStep?.visited.join(", ") || "Empty"}</span></Stat> : null}
          </VisualizerStats>
        </div>
      </div>
    </div>
  );
}

type ParsedValues =
  | { ok: true; values: number[] }
  | { ok: false; error: string };

function parseValues(raw: string, requireValid: boolean): ParsedValues {
  const parts = raw.split(",").map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => part.length === 0)) {
    return requireValid
      ? { ok: false, error: "Enter 1 to 31 comma-separated integer values." }
      : { ok: false, error: "Invalid input" };
  }

  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isInteger(value))) {
    return { ok: false, error: "Tree values must be integers." };
  }
  if (values.length < 1 || values.length > 31) {
    return { ok: false, error: "Enter 1 to 31 values." };
  }
  if (new Set(values).size !== values.length) {
    return { ok: false, error: "Tree values must be unique for this version." };
  }
  return { ok: true, values };
}

function formatResult(
  algorithm: TreeAlgorithm,
  isComplete: boolean,
  currentStep: TreeStep | null,
) {
  if (!isComplete || !currentStep?.result) return "Waiting for completion";

  if (algorithm === "bst_search") {
    const found = currentStep.result.found === true;
    const target = currentStep.result.target;
    return found ? `Found ${target}` : `${target} was not found`;
  }

  if (algorithm === "bst_insert" && Array.isArray(currentStep.result.inorder)) {
    return `[${currentStep.result.inorder.join(", ")}]`;
  }

  if (Array.isArray(currentStep.result.order)) {
    return `[${currentStep.result.order.join(", ")}]`;
  }

  return "Complete";
}
