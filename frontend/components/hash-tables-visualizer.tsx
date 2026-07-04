"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { HashTableView } from "@/components/hash-table-view";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage, VisualizerHeading } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchHashTableSteps } from "@/lib/api";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  HASH_TABLE_ALGORITHM_LABELS,
  type HashKey,
  type HashTableAlgorithm,
  type HashTableSnapshot,
  type HashTableStep,
  type HashTableStrategy,
} from "@/types/hash-tables";

const DEFAULT_VALUES = "12, 22, 32, 5";
const DEFAULT_TARGET = "32";
const DEFAULT_TABLE_SIZE = "10";
const inputBaseClass = "min-h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm text-slate-900 transition focus:bg-white focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";
const neutralInputClass = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100";
const invalidInputClass = "border-rose-300 focus:border-rose-500 focus:ring-rose-100";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

export function HashTablesVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<HashTableAlgorithm>("hash_insert_chaining");
  const [valuesInput, setValuesInput] = useState(DEFAULT_VALUES);
  const [tableSizeInput, setTableSizeInput] = useState(DEFAULT_TABLE_SIZE);
  const [targetInput, setTargetInput] = useState(DEFAULT_TARGET);
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<HashTableStep>(speed);
  const currentStep = playback.currentStep;
  const isSearch = isSearchAlgorithm(algorithm);
  const strategy = strategyForAlgorithm(algorithm);
  const valuesValidation = validateHashValues(valuesInput);
  const tableSizeValidation = validateTableSize(tableSizeInput);
  const targetValidation = validateTarget(targetInput, isSearch);
  const capacityError = validateLinearCapacity(
    strategy,
    valuesValidation,
    tableSizeValidation,
  );
  const hasValidationError =
    !valuesValidation.ok ||
    !tableSizeValidation.ok ||
    !targetValidation.ok ||
    capacityError !== null;
  const editingDisabled = playback.isPlaying || isLoading;
  const displayedTable =
    currentStep?.table ??
    createPreviewTable(
      tableSizeValidation.ok ? tableSizeValidation.tableSize : 10,
      strategy,
    );
  const result = formatResult(algorithm, playback.isComplete, currentStep);

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function changeAlgorithm(next: HashTableAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  async function startVisualization() {
    if (
      !valuesValidation.ok ||
      !tableSizeValidation.ok ||
      !targetValidation.ok ||
      capacityError !== null
    ) {
      return;
    }

    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const response = await fetchHashTableSteps({
        algorithm,
        values: valuesValidation.values,
        table_size: tableSizeValidation.tableSize,
        ...(isSearch ? { target: targetValidation.target } : {}),
      });
      playback.load(response.steps);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load hash table steps.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Hash table operation
          <select
            className={hashInputClass(false)}
            value={algorithm}
            disabled={editingDisabled}
            onChange={(event) => changeAlgorithm(event.target.value as HashTableAlgorithm)}
          >
            {Object.entries(HASH_TABLE_ALGORITHM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Values
          <input
            className={hashInputClass(!valuesValidation.ok || capacityError !== null)}
            value={valuesInput}
            disabled={editingDisabled}
            aria-invalid={!valuesValidation.ok || capacityError !== null}
            aria-describedby="hash-values-validation"
            onChange={(event) => {
              setValuesInput(event.target.value);
              resetForInputChange();
            }}
          />
          <span id="hash-values-validation" className="min-h-5 text-xs font-semibold leading-5 text-rose-600" aria-live="polite">
            {!valuesValidation.ok ? valuesValidation.error : capacityError ?? ""}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Table size
          <input
            className={hashInputClass(!tableSizeValidation.ok || capacityError !== null)}
            type="number"
            min={2}
            max={31}
            value={tableSizeInput}
            disabled={editingDisabled}
            aria-invalid={!tableSizeValidation.ok || capacityError !== null}
            aria-describedby="hash-table-size-validation"
            onChange={(event) => {
              setTableSizeInput(event.target.value);
              resetForInputChange();
            }}
          />
          <span id="hash-table-size-validation" className="min-h-5 text-xs font-semibold leading-5 text-rose-600" aria-live="polite">
            {tableSizeValidation.ok ? "" : tableSizeValidation.error}
          </span>
        </label>

        {isSearch ? (
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Target
            <input
              className={hashInputClass(!targetValidation.ok)}
              value={targetInput}
              disabled={editingDisabled}
              aria-invalid={!targetValidation.ok}
              aria-describedby="hash-target-validation"
              onChange={(event) => {
                setTargetInput(event.target.value);
                resetForInputChange();
              }}
            />
            <span id="hash-target-validation" className="min-h-5 text-xs font-semibold leading-5 text-rose-600" aria-live="polite">
              {targetValidation.ok ? "" : targetValidation.error}
            </span>
          </label>
        ) : null}

        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between gap-3">
            Animation speed
            <span className="font-mono text-indigo-600">{speed} ms</span>
          </span>
          <input
            className="w-full accent-indigo-600"
            type="range"
            min={100}
            max={1200}
            step={20}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <button
            className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`}
            type="button"
            disabled={editingDisabled || hasValidationError}
            onClick={startVisualization}
          >
            {isLoading ? "Loading steps..." : "Start visualization"}
          </button>
          <button
            className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            type="button"
            disabled={isLoading}
            onClick={playback.reset}
          >
            Reset
          </button>
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
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          <VisualizerHeading
            title={HASH_TABLE_ALGORITHM_LABELS[algorithm]}
            description={currentStep?.description ?? "Enter keys and start the hash table visualization."}
            legend={["Hash", "Active", "Collision", "Probe", "Found", "Not found"]}
          />
          <HashTableView table={displayedTable} step={currentStep} />
        </section>

        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line ?? undefined} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats
            algorithmName={HASH_TABLE_ALGORITHM_LABELS[algorithm]}
            currentStep={playback.currentStepIndex + 1}
            totalSteps={playback.steps.length}
            elapsedMs={playback.elapsedMs}
            resultLabel={isSearch ? "Search result" : "Insert result"}
            result={<span className="font-mono text-xs font-medium">{result}</span>}
          >
            <Stat label="Input values"><span className="font-mono text-xs">{valuesValidation.ok ? formatKeyList(valuesValidation.values) : "Invalid input"}</span></Stat>
            <Stat label="Table size"><span className="font-mono text-xs">{tableSizeValidation.ok ? tableSizeValidation.tableSize : "Invalid"}</span></Stat>
            <Stat label="Hash index"><span className="font-mono text-xs">{currentStep?.hash_index ?? "None"}</span></Stat>
            <Stat label="Visited buckets"><span className="font-mono text-xs">{currentStep?.visited_buckets.length ? currentStep.visited_buckets.join(" -> ") : "None"}</span></Stat>
          </VisualizerStats>
        </div>
      </div>
    </div>
  );
}

type ParsedValues =
  | { ok: true; values: HashKey[] }
  | { ok: false; error: string };

type ParsedTableSize =
  | { ok: true; tableSize: number }
  | { ok: false; error: string };

type ParsedTarget =
  | { ok: true; target: HashKey | null }
  | { ok: false; error: string };

function hashInputClass(isInvalid: boolean) {
  return `${inputBaseClass} ${isInvalid ? invalidInputClass : neutralInputClass}`;
}

function validateHashValues(raw: string): ParsedValues {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter 1 to 31 comma-separated keys." };
  }

  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) {
    return { ok: false, error: "Use commas between keys without empty entries." };
  }
  if (parts.length < 1 || parts.length > 31) {
    return { ok: false, error: "Enter 1 to 31 keys." };
  }

  try {
    return { ok: true, values: parts.map(parseHashKey) };
  } catch (parseError) {
    return {
      ok: false,
      error: parseError instanceof Error ? parseError.message : "Invalid key input.",
    };
  }
}

function validateTableSize(raw: string): ParsedTableSize {
  const tableSize = Number(raw.trim());
  if (!Number.isInteger(tableSize)) {
    return { ok: false, error: "Enter a whole number table size." };
  }
  if (tableSize < 2 || tableSize > 31) {
    return { ok: false, error: "Table size must be between 2 and 31." };
  }
  return { ok: true, tableSize };
}

function validateTarget(raw: string, isSearch: boolean): ParsedTarget {
  if (!isSearch) {
    return { ok: true, target: null };
  }
  if (raw.trim().length === 0) {
    return { ok: false, error: "Enter a target key." };
  }
  try {
    return { ok: true, target: parseHashKey(raw.trim()) };
  } catch (parseError) {
    return {
      ok: false,
      error: parseError instanceof Error ? parseError.message : "Invalid target key.",
    };
  }
}

function validateLinearCapacity(
  strategy: HashTableStrategy,
  values: ParsedValues,
  tableSize: ParsedTableSize,
) {
  if (
    strategy === "linear_probing" &&
    values.ok &&
    tableSize.ok &&
    values.values.length > tableSize.tableSize
  ) {
    return "Linear probing needs at least one slot per value.";
  }
  return null;
}

function parseHashKey(raw: string): HashKey {
  const value = raw.trim();
  if (/^[+-]?\d+$/.test(value)) {
    const numericValue = Number(value);
    if (!Number.isSafeInteger(numericValue)) {
      throw new Error("Integer keys must fit safely in JavaScript.");
    }
    return numericValue;
  }
  return value;
}

function isSearchAlgorithm(algorithm: HashTableAlgorithm) {
  return algorithm === "hash_search_chaining" || algorithm === "hash_search_linear_probing";
}

function strategyForAlgorithm(algorithm: HashTableAlgorithm): HashTableStrategy {
  return algorithm === "hash_insert_chaining" || algorithm === "hash_search_chaining"
    ? "separate_chaining"
    : "linear_probing";
}

function createPreviewTable(
  tableSize: number,
  strategy: HashTableStrategy,
): HashTableSnapshot {
  return {
    strategy,
    size: tableSize,
    buckets: Array.from({ length: tableSize }, (_, index) => ({
      index,
      items: [],
    })),
  };
}

function formatResult(
  algorithm: HashTableAlgorithm,
  isComplete: boolean,
  currentStep: HashTableStep | null,
) {
  if (!isComplete || !currentStep?.result) return "Waiting for completion";

  if (isSearchAlgorithm(algorithm)) {
    const target = currentStep.result.target;
    const bucket = currentStep.result.bucket;
    return currentStep.result.found === true
      ? `Found ${target} at bucket ${bucket}`
      : `${target} was not found`;
  }

  const values = currentStep.result.values;
  if (Array.isArray(values)) {
    return `${values.length} keys inserted`;
  }
  return "Complete";
}

function formatKeyList(values: HashKey[]) {
  return values.map(String).join(", ");
}
