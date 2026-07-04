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
  type TreeRotationType,
  type TreeStep,
} from "@/types/trees";

const DEFAULT_VALUES = "8, 3, 10, 1, 6, 14, 4, 7, 13";
const DEFAULT_TARGET = 7;
const inputBaseClass = "min-h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 transition focus:bg-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";
const neutralInputClass = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100";
const invalidInputClass = "border-rose-300 focus:border-rose-500 focus:ring-rose-100";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";
const ROTATION_LABELS: Record<TreeRotationType, string> = {
  left: "Left rotation",
  right: "Right rotation",
  left_right: "Left-right rotation",
  right_left: "Right-left rotation",
};

export function TreesVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<TreeAlgorithm>("bst_insert");
  const [valuesInput, setValuesInput] = useState(DEFAULT_VALUES);
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET));
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<TreeStep>(speed);
  const currentStep = playback.currentStep;
  const isSearch = algorithm === "bst_search";
  const isInsert = algorithm === "bst_insert" || algorithm === "avl_insert";
  const valuesValidation = validateTreeValues(valuesInput);
  const targetValidation = validateTarget(targetInput, isSearch);
  const displayedTree = currentStep?.tree ?? null;
  const editingDisabled = playback.isPlaying || isLoading;
  const hasValidationError = !valuesValidation.ok || !targetValidation.ok;

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function changeAlgorithm(next: TreeAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  async function startVisualization() {
    if (!valuesValidation.ok || !targetValidation.ok) {
      return;
    }

    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const response = await fetchTreeSteps({
        algorithm,
        values: valuesValidation.values,
        ...(isSearch ? { target: targetValidation.target } : {}),
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
    : isInsert
      ? "Final inorder"
      : "Traversal order";
  const rotationLabel = formatRotationType(currentStep?.rotation_type ?? null);

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Tree algorithm
          <select className={treeInputClass(false)} value={algorithm} disabled={editingDisabled} onChange={(event) => changeAlgorithm(event.target.value as TreeAlgorithm)}>
            {Object.entries(TREE_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Values
          <input
            className={treeInputClass(!valuesValidation.ok)}
            value={valuesInput}
            disabled={editingDisabled}
            aria-invalid={!valuesValidation.ok}
            aria-describedby="tree-values-validation"
            onChange={(event) => {
              setValuesInput(event.target.value);
              resetForInputChange();
            }}
          />
          <span id="tree-values-validation" className="min-h-5 text-xs font-semibold leading-5 text-rose-600" aria-live="polite">
            {valuesValidation.ok ? "" : valuesValidation.error}
          </span>
        </label>
        {isSearch ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Target
            <input
              className={treeInputClass(!targetValidation.ok)}
              type="number"
              value={targetInput}
              disabled={editingDisabled}
              aria-invalid={!targetValidation.ok}
              aria-describedby="tree-target-validation"
              onChange={(event) => {
                setTargetInput(event.target.value);
                resetForInputChange();
              }}
            />
            <span id="tree-target-validation" className="min-h-5 text-xs font-semibold leading-5 text-rose-600" aria-live="polite">
              {targetValidation.ok ? "" : targetValidation.error}
            </span>
          </label>
        ) : null}
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={120} max={1200} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={editingDisabled || hasValidationError} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
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
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Imbalanced</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Rotation</span>
            </div>
          </div>
          <TreeCanvas tree={displayedTree} step={currentStep} />
        </section>

        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line ?? undefined} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={TREE_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel={resultLabel} result={<span className="font-mono text-xs font-medium">{result}</span>}>
            <Stat label="Input values"><span className="font-mono text-xs">{valuesValidation.ok ? valuesValidation.values.join(", ") : "Invalid input"}</span></Stat>
            {isSearch ? <Stat label="Search path"><span className="font-mono text-xs">{currentStep?.path.join(", ") || "Empty"}</span></Stat> : null}
            {algorithm === "avl_insert" ? <Stat label="Rotation"><span className="font-mono text-xs">{rotationLabel}</span></Stat> : null}
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

type ParsedTarget =
  | { ok: true; target: number | null }
  | { ok: false; error: string };

function treeInputClass(isInvalid: boolean) {
  return `${inputBaseClass} ${isInvalid ? invalidInputClass : neutralInputClass}`;
}

function validateTreeValues(raw: string): ParsedValues {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter 1 to 31 comma-separated integer values." };
  }

  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) {
    return { ok: false, error: "Use commas between values without empty entries." };
  }

  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isInteger(value))) {
    return { ok: false, error: "Tree values must be numbers, like 10, 20, 30." };
  }
  if (values.length < 1 || values.length > 31) {
    return { ok: false, error: "Enter 1 to 31 values." };
  }

  const seen = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) {
      return { ok: false, error: `Tree values must be unique. Duplicate value: ${value}.` };
    }
    seen.add(value);
  }
  return { ok: true, values };
}

function validateTarget(raw: string, isSearch: boolean): ParsedTarget {
  if (!isSearch) {
    return { ok: true, target: null };
  }

  const target = Number(raw);
  if (raw.trim().length === 0 || !Number.isInteger(target)) {
    return { ok: false, error: "Enter an integer target value." };
  }
  return { ok: true, target };
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

  if ((algorithm === "bst_insert" || algorithm === "avl_insert") && Array.isArray(currentStep.result.inorder)) {
    return `[${currentStep.result.inorder.join(", ")}]`;
  }

  if (Array.isArray(currentStep.result.order)) {
    return `[${currentStep.result.order.join(", ")}]`;
  }

  return "Complete";
}

function formatRotationType(rotationType: TreeRotationType | null) {
  if (rotationType === null) return "None";
  return ROTATION_LABELS[rotationType];
}
