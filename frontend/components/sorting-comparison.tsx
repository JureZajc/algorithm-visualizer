"use client";

import { useId, useState } from "react";

import { ActionRow, Alert, Button, EmptyState, FormField, inputClassName, Panel, SectionHeader } from "@/components/ui-primitives";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchSortingSteps, generateRandomNumbers } from "@/lib/api";
import { SORTING_PRESETS } from "@/lib/array-presets";
import { validateCountDraft } from "@/lib/sorting-input";
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
  const run = useVisualizationRun();
  const isLoading = run.isLoading;
  const headingId = useId();
  const summaryHeadingId = useId();
  const chartHeadingId = useId();

  const fewestSteps =
    results.length > 0
      ? Math.min(...results.map((result) => result.totalSteps))
      : null;
  const maxSteps = Math.max(...results.map((result) => result.totalSteps), 1);
  const countValidation = validateCountDraft(countDraft);
  const hasCountError = countValidation.error !== null;

  function commitCount(): number {
    if (countValidation.value === null) return count;
    setCount(countValidation.value);
    setCountDraft(String(countValidation.value));
    if (countValidation.value !== initialNumbers.length) setPresetId("");
    return countValidation.value;
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
    run.clearError();
  }

  function handleGenerate(numberCount: number) {
    return run.start({
      onStart: () => setResults([]),
      request: (signal) => generateRandomNumbers(numberCount, signal),
      onSuccess: (response) => {
        setInitialNumbers(response.numbers);
        setPresetId("");
      },
      errorMessage: "Could not generate numbers.",
    });
  }

  function handleCompare(numberCount: number) {
    return run.start({
      onStart: () => setResults([]),
      request: async (signal) => {
        let numbers = initialNumbers;
        if (numbers.length !== numberCount) {
          numbers = (await generateRandomNumbers(numberCount, signal)).numbers;
          signal.throwIfAborted();
          setInitialNumbers(numbers);
          setPresetId("");
        }
        return Promise.all(
          selectedAlgorithms.map((algorithm) => fetchSortingSteps(numbers, algorithm, signal)),
        );
      },
      onSuccess: (responses) =>
        setResults(
          responses.map((response) =>
            summarizeResponse(response, props.algorithms),
          ),
        ),
      errorMessage: "Could not compare sorting algorithms.",
    });
  }

  return (
    <div>
      <Panel className="mb-5 p-5" variant="control" aria-labelledby={headingId}>
        <div className="mb-5">
          <SectionHeader
            eyebrow="Sorting comparison"
            title="Compare algorithms on one shared array"
            titleId={headingId}
            description="Select two to four sorting algorithms, generate one input, and compare the step counts returned by the API."
          />
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Sample preset">
            <select
              className={inputClassName(false, "h-11")}
              value={presetId}
              disabled={isLoading}
              onChange={(event) => loadPreset(event.target.value)}
            >
              <option value="" disabled>Choose a preset</option>
              {SORTING_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </FormField>

          <FormField
            error={countValidation.error}
            helperText="Use 5 to 50 values."
            label="Random values"
            messageId="compare-count-validation"
          >
            <input
              aria-describedby="compare-count-validation"
              aria-invalid={hasCountError}
              className={inputClassName(hasCountError, "h-11")}
              type="number"
              min={5}
              max={50}
              value={countDraft}
              disabled={isLoading}
              onBlur={commitCount}
              onChange={(event) => setCountDraft(event.target.value)}
            />
          </FormField>

          <ActionRow className="md:col-span-2 md:self-start md:pt-[1.625rem]">
            <Button
              disabled={isLoading || hasCountError}
              onClick={() => handleGenerate(commitCount())}
            >
              Generate shared input
            </Button>
            <Button
              variant="primary"
              disabled={isLoading || selectedAlgorithms.length < MIN_SELECTED || hasCountError}
              onClick={() => handleCompare(commitCount())}
            >
              {isLoading ? "Comparing..." : "Run comparison"}
            </Button>
          </ActionRow>
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
      </Panel>

      {props.metadataError ? (
        <Alert title="Metadata unavailable" variant="warning">
          {props.metadataError}. Comparison still works, but complexity may be unavailable.
        </Alert>
      ) : null}

      {run.error ? (
        <Alert title="Comparison unavailable">{run.error}</Alert>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="p-5" aria-labelledby={summaryHeadingId}>
            <h2 className="mb-4 text-lg font-extrabold tracking-normal text-slate-950" id={summaryHeadingId}>Comparison summary</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((result) => (
                <ComparisonCard
                  key={result.algorithm}
                  result={result}
                  isWinner={result.totalSteps === fewestSteps}
                />
              ))}
            </div>
          </Panel>

          <Panel className="p-5" aria-labelledby={chartHeadingId}>
            <h2 className="mb-4 text-lg font-extrabold tracking-normal text-slate-950" id={chartHeadingId}>Step count</h2>
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
          </Panel>
        </div>
      ) : (
        <EmptyState title="Ready to compare" description="Choose algorithms, generate or select an input, then run the comparison." />
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
      <span className="mb-1 block text-xs font-extrabold uppercase tracking-[0.09em] text-slate-500">Shared input</span>
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
        <h3 className="m-0 text-base font-extrabold tracking-normal text-slate-950">{result.algorithmName}</h3>
        {isWinner ? (
          <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-white">
            Fewest steps
          </span>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Metric label="Total steps" value={String(result.totalSteps)} />
        <Metric label="Comparisons" value={String(result.comparisons)} />
        <Metric label="Swaps" value={String(result.swaps)} />
        <Metric label="Overwrites" value={String(result.overwrites)} />
        <Metric className="col-span-2" label="Avg. time" value={result.timeComplexity} />
      </dl>
    </article>
  );
}

// A <dl> may group each <dt> and <dd> in one <div>, but no deeper.
function Metric({ className, label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={className}>
      <dt className="mb-1 text-xs font-extrabold uppercase tracking-[0.09em] text-slate-500">{label}</dt>
      <dd className="m-0 font-mono text-sm font-bold text-slate-950">{value}</dd>
    </div>
  );
}
