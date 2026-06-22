"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { DynamicProgrammingTable } from "@/components/dynamic-programming-table";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage, VisualizerHeading } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchDynamicProgrammingSteps } from "@/lib/api";
import {
  DYNAMIC_PROGRAMMING_PRESETS,
  type DynamicProgrammingPreset,
} from "@/lib/dynamic-programming-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  DYNAMIC_PROGRAMMING_ALGORITHM_LABELS,
  type DynamicProgrammingAlgorithm,
  type DynamicProgrammingCell,
  type DynamicProgrammingRequest,
  type DynamicProgrammingStep,
  type TablePosition,
} from "@/types/dynamic-programming";

interface DynamicProgrammingForm {
  n: string;
  coins: string;
  amount: string;
  weights: string;
  values: string;
  capacity: string;
  textA: string;
  textB: string;
  rows: string;
  cols: string;
}

const INITIAL_FORM: DynamicProgrammingForm = {
  n: "8",
  coins: "1, 3, 4",
  amount: "6",
  weights: "2, 3, 4, 5",
  values: "3, 4, 5, 6",
  capacity: "5",
  textA: "ABCDEF",
  textB: "ACE",
  rows: "3",
  cols: "7",
};

const DEFAULT_FIELDS: Record<
  DynamicProgrammingAlgorithm,
  Partial<DynamicProgrammingForm>
> = {
  fibonacci: { n: "8" },
  coin_change: { coins: "1, 3, 4", amount: "6" },
  knapsack: {
    weights: "2, 3, 4, 5",
    values: "3, 4, 5, 6",
    capacity: "5",
  },
  lcs: { textA: "ABCDEF", textB: "ACE" },
  edit_distance: { textA: "kitten", textB: "sitting" },
  unique_paths: { rows: "3", cols: "7" },
};

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";
const FIBONACCI_COLUMNS_PER_ROW = 8;

function parseInteger(rawValue: string, label: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return value;
}

function parseIntegerList(rawValue: string, label: string) {
  const parts = rawValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error(`${label} must include at least one value.`);
  }

  return parts.map((part) => parseInteger(part, label));
}

function requireRange(value: number, label: string, minimum: number, maximum: number) {
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function requireListLength(
  values: number[],
  label: string,
  minimum: number,
  maximum: number,
) {
  if (values.length < minimum || values.length > maximum) {
    throw new Error(`${label} must include ${minimum} to ${maximum} values.`);
  }
  return values;
}

function requirePositiveValues(values: number[], label: string) {
  if (values.some((value) => value <= 0)) {
    throw new Error(`${label} must contain positive values.`);
  }
  return values;
}

function requireNonnegativeValues(values: number[], label: string) {
  if (values.some((value) => value < 0)) {
    throw new Error(`${label} must contain nonnegative values.`);
  }
  return values;
}

function requireText(value: string, label: string) {
  if (value.length > 12) {
    throw new Error(`${label} must be 12 characters or fewer.`);
  }
  return value;
}

function createRequest(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
): DynamicProgrammingRequest {
  if (algorithm === "fibonacci") {
    return {
      algorithm,
      n: requireRange(parseInteger(form.n, "n"), "n", 0, 40),
    };
  }

  if (algorithm === "coin_change") {
    const coins = requirePositiveValues(
      requireListLength(parseIntegerList(form.coins, "Coins"), "Coins", 1, 8),
      "Coins",
    );
    return {
      algorithm,
      coins,
      amount: requireRange(parseInteger(form.amount, "Amount"), "Amount", 0, 50),
    };
  }

  if (algorithm === "knapsack") {
    const weights = requirePositiveValues(
      requireListLength(
        parseIntegerList(form.weights, "Weights"),
        "Weights",
        1,
        8,
      ),
      "Weights",
    );
    const values = requireNonnegativeValues(
      requireListLength(parseIntegerList(form.values, "Values"), "Values", 1, 8),
      "Values",
    );
    if (weights.length !== values.length) {
      throw new Error("Knapsack requires matching weights and values.");
    }
    return {
      algorithm,
      weights,
      values,
      capacity: requireRange(
        parseInteger(form.capacity, "Capacity"),
        "Capacity",
        0,
        50,
      ),
    };
  }

  if (algorithm === "lcs") {
    return {
      algorithm,
      text_a: requireText(form.textA, "First string"),
      text_b: requireText(form.textB, "Second string"),
    };
  }

  if (algorithm === "edit_distance") {
    return {
      algorithm,
      text_a: requireText(form.textA, "Source string"),
      text_b: requireText(form.textB, "Target string"),
    };
  }

  return {
    algorithm,
    rows: requireRange(parseInteger(form.rows, "Rows"), "Rows", 1, 12),
    cols: requireRange(parseInteger(form.cols, "Columns"), "Columns", 1, 12),
  };
}

function createDefaultRequest(algorithm: DynamicProgrammingAlgorithm) {
  return createRequest(algorithm, {
    ...INITIAL_FORM,
    ...DEFAULT_FIELDS[algorithm],
  });
}

function safeRequest(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
) {
  try {
    return createRequest(algorithm, form);
  } catch {
    return createDefaultRequest(algorithm);
  }
}

function formFieldsFromRequest(
  request: Omit<DynamicProgrammingRequest, "algorithm">,
): Partial<DynamicProgrammingForm> {
  return {
    ...(request.n !== undefined ? { n: String(request.n) } : {}),
    ...(request.coins ? { coins: request.coins.join(", ") } : {}),
    ...(request.amount !== undefined ? { amount: String(request.amount) } : {}),
    ...(request.weights ? { weights: request.weights.join(", ") } : {}),
    ...(request.values ? { values: request.values.join(", ") } : {}),
    ...(request.capacity !== undefined ? { capacity: String(request.capacity) } : {}),
    ...(request.text_a !== undefined ? { textA: request.text_a } : {}),
    ...(request.text_b !== undefined ? { textB: request.text_b } : {}),
    ...(request.rows !== undefined ? { rows: String(request.rows) } : {}),
    ...(request.cols !== undefined ? { cols: String(request.cols) } : {}),
  };
}

function createPreviewTable(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
): DynamicProgrammingCell[][] {
  const request = safeRequest(algorithm, form);

  if (algorithm === "fibonacci") {
    return [Array.from({ length: (request.n ?? 0) + 1 }, () => 0)];
  }

  if (algorithm === "coin_change") {
    const coins = request.coins ?? [];
    const amount = request.amount ?? 0;
    return Array.from({ length: coins.length + 1 }, () =>
      Array.from({ length: amount + 1 }, (_, column) => column === 0 ? 0 : "inf"),
    );
  }

  if (algorithm === "knapsack") {
    return Array.from({ length: (request.weights?.length ?? 0) + 1 }, () =>
      Array.from({ length: (request.capacity ?? 0) + 1 }, () => 0),
    );
  }

  if (algorithm === "lcs" || algorithm === "edit_distance") {
    return Array.from({ length: (request.text_a?.length ?? 0) + 1 }, () =>
      Array.from({ length: (request.text_b?.length ?? 0) + 1 }, () => 0),
    );
  }

  return Array.from({ length: request.rows ?? 1 }, () =>
    Array.from({ length: request.cols ?? 1 }, () => 0),
  );
}

function wrapFibonacciTable(table: DynamicProgrammingCell[][]) {
  const values = table[0] ?? [];
  if (values.length <= FIBONACCI_COLUMNS_PER_ROW) return table;

  return Array.from(
    { length: Math.ceil(values.length / FIBONACCI_COLUMNS_PER_ROW) },
    (_, rowIndex) =>
      values.slice(
        rowIndex * FIBONACCI_COLUMNS_PER_ROW,
        (rowIndex + 1) * FIBONACCI_COLUMNS_PER_ROW,
      ),
  );
}

function wrapFibonacciPosition(position: TablePosition | null) {
  if (!position) return null;
  const [, column] = position;
  return [
    Math.floor(column / FIBONACCI_COLUMNS_PER_ROW),
    column % FIBONACCI_COLUMNS_PER_ROW,
  ] as TablePosition;
}

function wrapFibonacciRelatedPosition(position: TablePosition) {
  return wrapFibonacciPosition(position) as TablePosition;
}

function createDisplayStep(
  algorithm: DynamicProgrammingAlgorithm,
  step: DynamicProgrammingStep | null,
) {
  if (!step || algorithm !== "fibonacci") return step;

  return {
    ...step,
    table: wrapFibonacciTable(step.table),
    active_cell: wrapFibonacciPosition(step.active_cell),
    related_cells: step.related_cells.map(wrapFibonacciRelatedPosition),
  };
}

function fillLabels(labels: string[], count: number, fallback: string) {
  return Array.from(
    { length: count },
    (_, index) => labels[index] ?? `${fallback} ${index}`,
  );
}

function createTableLabels(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
  table: DynamicProgrammingCell[][],
) {
  const request = safeRequest(algorithm, form);
  const rowCount = table.length;
  const columnCount = table[0]?.length ?? 0;

  if (algorithm === "fibonacci") {
    if (rowCount > 1) {
      return {
        rowLabels: Array.from({ length: rowCount }, (_, rowIndex) => {
          const start = rowIndex * FIBONACCI_COLUMNS_PER_ROW;
          const end = start + (table[rowIndex]?.length ?? 1) - 1;
          return `n ${start}-${end}`;
        }),
        columnLabels: fillLabels([], columnCount, "Slot"),
      };
    }

    return {
      rowLabels: ["F"],
      columnLabels: fillLabels([], columnCount, "n"),
    };
  }

  if (algorithm === "coin_change") {
    const coins = request.coins ?? [];
    return {
      rowLabels: fillLabels(
        ["No coins", ...coins.map((coin) => `Coin ${coin}`)],
        rowCount,
        "Coin",
      ),
      columnLabels: fillLabels([], columnCount, "Amount"),
    };
  }

  if (algorithm === "knapsack") {
    const weights = request.weights ?? [];
    return {
      rowLabels: fillLabels(
        ["0 items", ...weights.map((weight, index) => `Item ${index + 1} w${weight}`)],
        rowCount,
        "Item",
      ),
      columnLabels: fillLabels([], columnCount, "Cap"),
    };
  }

  if (algorithm === "lcs" || algorithm === "edit_distance") {
    const textA = request.text_a ?? "";
    const textB = request.text_b ?? "";
    return {
      rowLabels: fillLabels(["empty", ...textA.split("")], rowCount, "A"),
      columnLabels: fillLabels(["empty", ...textB.split("")], columnCount, "B"),
    };
  }

  return {
    rowLabels: fillLabels([], rowCount, "Row"),
    columnLabels: fillLabels([], columnCount, "Col"),
  };
}

export function DynamicProgrammingVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<DynamicProgrammingAlgorithm>("fibonacci");
  const [form, setForm] = useState<DynamicProgrammingForm>(INITIAL_FORM);
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(520);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<DynamicProgrammingStep>(speed);
  const currentStep = playback.currentStep;
  const availablePresets = DYNAMIC_PROGRAMMING_PRESETS.filter(
    (preset) => preset.algorithm === algorithm,
  );
  const displayStep = createDisplayStep(algorithm, currentStep);
  const table =
    displayStep?.table ??
    (algorithm === "fibonacci"
      ? wrapFibonacciTable(createPreviewTable(algorithm, form))
      : createPreviewTable(algorithm, form));
  const { rowLabels, columnLabels } = createTableLabels(algorithm, form, table);
  const result = playback.isComplete
    ? String(currentStep?.result ?? "No result")
    : "Waiting for completion";

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function changeAlgorithm(next: DynamicProgrammingAlgorithm) {
    setAlgorithm(next);
    setForm((current) => ({ ...current, ...DEFAULT_FIELDS[next] }));
    setPresetId("");
    resetForInputChange();
  }

  function updateField(field: keyof DynamicProgrammingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setPresetId("");
    resetForInputChange();
  }

  function loadPreset(nextId: string) {
    const preset: DynamicProgrammingPreset | undefined =
      DYNAMIC_PROGRAMMING_PRESETS.find((item) => item.id === nextId);
    if (!preset) return;

    setAlgorithm(preset.algorithm);
    setForm((current) => ({
      ...current,
      ...formFieldsFromRequest(preset.request),
    }));
    setPresetId(preset.id);
    resetForInputChange();
  }

  async function startVisualization() {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const request = createRequest(algorithm, form);
      playback.load((await fetchDynamicProgrammingSteps(request)).steps);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load dynamic programming steps.");
    } finally {
      setIsLoading(false);
    }
  }

  const editingDisabled = playback.isPlaying || isLoading;

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Dynamic programming algorithm
          <select
            className={inputClass}
            value={algorithm}
            disabled={editingDisabled}
            onChange={(event) => changeAlgorithm(event.target.value as DynamicProgrammingAlgorithm)}
          >
            {Object.entries(DYNAMIC_PROGRAMMING_ALGORITHM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Sample preset
          <select
            className={inputClass}
            value={presetId}
            disabled={editingDisabled}
            onChange={(event) => loadPreset(event.target.value)}
          >
            <option value="" disabled>Choose a preset</option>
            {availablePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700 xl:col-span-2">
          <span className="flex justify-between gap-3">
            Animation speed
            <span className="font-mono text-indigo-600">{speed} ms</span>
          </span>
          <input
            className="w-full accent-indigo-600"
            type="range"
            min={80}
            max={1200}
            step={20}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>

        <AlgorithmInputFields
          algorithm={algorithm}
          form={form}
          disabled={editingDisabled}
          onChange={updateField}
        />

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <button
            className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`}
            type="button"
            disabled={editingDisabled}
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          <VisualizerHeading
            title={DYNAMIC_PROGRAMMING_ALGORITHM_LABELS[algorithm]}
            description={currentStep?.description ?? "Set the inputs and start the table visualization."}
            legend={["Active", "Related"]}
          />
          <DynamicProgrammingTable
            table={table}
            step={displayStep}
            rowLabels={rowLabels}
            columnLabels={columnLabels}
            variant={algorithm === "fibonacci" ? "compact" : "standard"}
          />
        </section>
        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line ?? undefined} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats
            algorithmName={DYNAMIC_PROGRAMMING_ALGORITHM_LABELS[algorithm]}
            currentStep={playback.currentStepIndex + 1}
            totalSteps={playback.steps.length}
            elapsedMs={playback.elapsedMs}
            resultLabel="DP result"
            result={result}
          />
        </div>
      </div>
    </div>
  );
}

function AlgorithmInputFields({
  algorithm,
  form,
  disabled,
  onChange,
}: {
  algorithm: DynamicProgrammingAlgorithm;
  form: DynamicProgrammingForm;
  disabled: boolean;
  onChange: (field: keyof DynamicProgrammingForm, value: string) => void;
}) {
  if (algorithm === "fibonacci") {
    return (
      <NumberField
        label="n"
        value={form.n}
        min={0}
        max={40}
        disabled={disabled}
        onChange={(value) => onChange("n", value)}
      />
    );
  }

  if (algorithm === "coin_change") {
    return (
      <>
        <TextField
          label="Coins"
          value={form.coins}
          disabled={disabled}
          onChange={(value) => onChange("coins", value)}
        />
        <NumberField
          label="Amount"
          value={form.amount}
          min={0}
          max={50}
          disabled={disabled}
          onChange={(value) => onChange("amount", value)}
        />
      </>
    );
  }

  if (algorithm === "knapsack") {
    return (
      <>
        <TextField
          label="Weights"
          value={form.weights}
          disabled={disabled}
          onChange={(value) => onChange("weights", value)}
        />
        <TextField
          label="Values"
          value={form.values}
          disabled={disabled}
          onChange={(value) => onChange("values", value)}
        />
        <NumberField
          label="Capacity"
          value={form.capacity}
          min={0}
          max={50}
          disabled={disabled}
          onChange={(value) => onChange("capacity", value)}
        />
      </>
    );
  }

  if (algorithm === "lcs") {
    return (
      <>
        <TextField
          label="First string"
          value={form.textA}
          disabled={disabled}
          onChange={(value) => onChange("textA", value)}
        />
        <TextField
          label="Second string"
          value={form.textB}
          disabled={disabled}
          onChange={(value) => onChange("textB", value)}
        />
      </>
    );
  }

  if (algorithm === "edit_distance") {
    return (
      <>
        <TextField
          label="Source string"
          value={form.textA}
          disabled={disabled}
          onChange={(value) => onChange("textA", value)}
        />
        <TextField
          label="Target string"
          value={form.textB}
          disabled={disabled}
          onChange={(value) => onChange("textB", value)}
        />
      </>
    );
  }

  return (
    <>
      <NumberField
        label="Rows"
        value={form.rows}
        min={1}
        max={12}
        disabled={disabled}
        onChange={(value) => onChange("rows", value)}
      />
      <NumberField
        label="Columns"
        value={form.cols}
        min={1}
        max={12}
        disabled={disabled}
        onChange={(value) => onChange("cols", value)}
      />
    </>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
      {label}
      <input
        className={inputClass}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
      {label}
      <input
        className={inputClass}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
