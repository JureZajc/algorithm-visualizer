"use client";

import { useState } from "react";

import { fetchSortingSteps, generateRandomNumbers } from "@/lib/api";
import { SORTING_PRESETS } from "@/lib/array-presets";
import type { AlgorithmMetadata, MetadataSourceProps } from "@/types/algorithm";
import {
  ALGORITHM_LABELS,
  type AlgorithmStep,
  type SortingAlgorithm,
  type SortingStepsResponse,
} from "@/types/sorting";

const DEFAULT_NUMBERS = [42, 17, 83, 29, 64, 8, 51, 36, 75, 23, 92, 58];
const DEFAULT_SELECTION: SortingAlgorithm[] = [
  "bubble_sort",
  "selection_sort",
  "insertion_sort",
];
const MIN_SELECTED = 2;
const MAX_SELECTED = 4;

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass =
  "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

interface ComparisonResult {
  algorithm: SortingAlgorithm;
  algorithmName: string;
  totalSteps: number;
  comparisons: number;
  swaps: number;
  overwrites: number;
  timeComplexity: string;
}

export function SortingComparison(props: MetadataSourceProps) {
  const [selectedAlgorithms, setSelectedAlgorithms] =
    useState<SortingAlgorithm[]>(DEFAULT_SELECTION);
  const [count, setCount] = useState(DEFAULT_NUMBERS.length);
  const [countDraft, setCountDraft] = useState(String(DEFAULT_NUMBERS.length));
  const [presetId, setPresetId] = useState("");
  const [initialNumbers, setInitialNumbers] = useState(DEFAULT_NUMBERS);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fewestSteps =
    results.length > 0
      ? Math.min(...results.map((result) => result.totalSteps))
      : null;
  const maxSteps = Math.max(...results.map((result) => result.totalSteps), 1);

  function normalizeCount(): number {
    const parsedCount = Number.parseInt(countDraft, 10);
    const normalizedCount = Number.isNaN(parsedCount)
      ? count
      : Math.min(50, Math.max(5, parsedCount));
    setCount(normalizedCount);
    setCountDraft(String(normalizedCount));
    if (normalizedCount !== initialNumbers.length) setPresetId("");
    return normalizedCount;
  }

  function toggleAlgorithm(algorithm: SortingAlgorithm) {
    setSelectedAlgorithms((current) => {
      if (current.includes(algorithm)) {
        if (current.length <= MIN_SELECTED) return current;
        return current.filter((item) => item !== algorithm);
      }
      if (current.length >= MAX_SELECTED) return current;
      return [...current, algorithm];
    });
    setResults([]);
  }

  function loadPreset(nextId: string) {
    const preset = SORTING_PRESETS.find((item) => item.id === nextId);
    if (!preset) return;
    const numbers = preset.createNumbers();
    setPresetId(preset.id);
    setCount(numbers.length);
    setCountDraft(String(numbers.length));
    setInitialNumbers(numbers);
    setResults([]);
    setError(null);
  }

  async function handleGenerate(numberCount: number) {
    setError(null);
    setIsLoading(true);
    setResults([]);
    try {
      const response = await generateRandomNumbers(numberCount);
      setInitialNumbers(response.numbers);
      setPresetId("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate numbers.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompare(numberCount: number) {
    setError(null);
    setIsLoading(true);
    setResults([]);
    try {
      let numbers = initialNumbers;
      if (numbers.length !== numberCount) {
        numbers = (await generateRandomNumbers(numberCount)).numbers;
        setInitialNumbers(numbers);
        setPresetId("");
      }

      const responses = await Promise.all(
        selectedAlgorithms.map((algorithm) => fetchSortingSteps(numbers, algorithm)),
      );
      setResults(
        responses.map((response) =>
          summarizeResponse(response, props.algorithms),
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not compare sorting algorithms.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur" aria-label="Sorting comparison controls">
        <div className="mb-5 flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Sorting comparison</span>
          <h2 className="m-0 text-xl font-extrabold tracking-tight text-slate-950">Compare algorithms on one shared array</h2>
          <p className="m-0 max-w-3xl text-sm leading-6 text-slate-600">Select two to four sorting algorithms, generate one input, and compare the step counts returned by the API.</p>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Sample preset
            <select
              className={inputClass}
              value={presetId}
              disabled={isLoading}
              onChange={(event) => loadPreset(event.target.value)}
            >
              <option value="" disabled>Choose a preset</option>
              {SORTING_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
            Random values
            <input
              className={inputClass}
              type="number"
              min={5}
              max={50}
              value={countDraft}
              disabled={isLoading}
              onBlur={normalizeCount}
              onChange={(event) => setCountDraft(event.target.value)}
            />
          </label>

          <div className="flex items-end gap-2 md:col-span-2">
            <button
              className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              type="button"
              disabled={isLoading}
              onClick={() => handleGenerate(normalizeCount())}
            >
              Generate shared input
            </button>
            <button
              className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`}
              type="button"
              disabled={isLoading || selectedAlgorithms.length < MIN_SELECTED}
              onClick={() => handleCompare(normalizeCount())}
            >
              {isLoading ? "Comparing..." : "Run comparison"}
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className="m-0 text-sm font-extrabold text-slate-900">Algorithms</h3>
            <span className="text-xs font-bold text-slate-500">{selectedAlgorithms.length} selected</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(Object.keys(ALGORITHM_LABELS) as SortingAlgorithm[]).map((algorithm) => {
              const isSelected = selectedAlgorithms.includes(algorithm);
              const isDisabled =
                isLoading ||
                (!isSelected && selectedAlgorithms.length >= MAX_SELECTED) ||
                (isSelected && selectedAlgorithms.length <= MIN_SELECTED);

              return (
                <label
                  className={isSelected ? "flex min-h-12 items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-950" : "flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"}
                  key={algorithm}
                >
                  <input
                    className="h-4 w-4 accent-indigo-600"
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggleAlgorithm(algorithm)}
                  />
                  {ALGORITHM_LABELS[algorithm]}
                </label>
              );
            })}
          </div>
        </div>

        <SharedInputPreview numbers={initialNumbers} />
      </section>

      {props.metadataError ? (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Metadata unavailable: {props.metadataError}. Comparison still works, but complexity may be unavailable.
        </p>
      ) : null}

      {error ? (
        <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-950">Comparison summary</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((result) => (
                <ComparisonCard
                  key={result.algorithm}
                  result={result}
                  isWinner={result.totalSteps === fewestSteps}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <h2 className="mb-4 text-lg font-extrabold tracking-tight text-slate-950">Step count</h2>
            <div className="grid gap-4">
              {results.map((result) => (
                <div className="grid gap-2" key={result.algorithm}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{result.algorithmName}</span>
                    <span className="font-mono font-bold text-slate-950">{result.totalSteps}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={result.totalSteps === fewestSteps ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-indigo-500"}
                      style={{ width: `${Math.max(6, (result.totalSteps / maxSteps) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
          <h2 className="mb-2 text-lg font-extrabold tracking-tight text-slate-950">Ready to compare</h2>
          <p className="m-0 text-sm leading-6 text-slate-600">Choose algorithms, generate or select an input, then run the comparison.</p>
        </section>
      )}
    </div>
  );
}

function summarizeResponse(
  response: SortingStepsResponse,
  metadata: AlgorithmMetadata[],
): ComparisonResult {
  return {
    algorithm: response.algorithm,
    algorithmName: ALGORITHM_LABELS[response.algorithm],
    totalSteps: response.step_count,
    comparisons: countSteps(response.steps, "compare"),
    swaps: countSteps(response.steps, "swap"),
    overwrites: countSteps(response.steps, "overwrite"),
    timeComplexity:
      metadata.find((item) => item.id === response.algorithm)?.time_complexity
        .average ?? "Unavailable",
  };
}

function countSteps(
  steps: AlgorithmStep[],
  stepType: AlgorithmStep["type"],
): number {
  return steps.filter((step) => step.type === stepType).length;
}

function SharedInputPreview({ numbers }: { numbers: number[] }) {
  const preview = numbers.length > 18
    ? `${numbers.slice(0, 18).join(", ")}...`
    : numbers.join(", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-[0.09em] text-slate-500">Shared input</span>
      <span className="break-words font-mono text-xs font-medium text-slate-800">[{preview}]</span>
    </div>
  );
}

function ComparisonCard({
  result,
  isWinner,
}: {
  result: ComparisonResult;
  isWinner: boolean;
}) {
  return (
    <article className={isWinner ? "rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm" : "rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm"}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="m-0 text-base font-extrabold tracking-tight text-slate-950">{result.algorithmName}</h3>
        {isWinner ? (
          <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-white">
            Fewest steps
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Metric label="Total steps" value={String(result.totalSteps)} />
        <Metric label="Comparisons" value={String(result.comparisons)} />
        <Metric label="Swaps" value={String(result.swaps)} />
        <Metric label="Overwrites" value={String(result.overwrites)} />
        <div className="col-span-2">
          <Metric label="Avg. time" value={result.timeComplexity} />
        </div>
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-[0.65rem] font-extrabold uppercase tracking-[0.09em] text-slate-500">{label}</dt>
      <dd className="m-0 font-mono text-sm font-bold text-slate-950">{value}</dd>
    </div>
  );
}
