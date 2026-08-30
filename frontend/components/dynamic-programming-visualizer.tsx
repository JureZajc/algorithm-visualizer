"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { DynamicProgrammingTable } from "@/components/dynamic-programming-table";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { StepControls } from "@/components/step-controls";
import { Alert, Button, FormField, InlineMessage, inputClassName, Panel } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
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
  const formErrors = validateDynamicProgrammingForm(algorithm, form);
  const hasValidationError = Object.keys(formErrors).length > 0;

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
    if (hasValidationError) return;

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
      <Panel className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-6" variant="control">
        <FormField label="Dynamic programming algorithm" className="xl:col-span-2">
          <select
            className={inputClassName()}
            value={algorithm}
            disabled={editingDisabled}
            onChange={(event) => changeAlgorithm(event.target.value as DynamicProgrammingAlgorithm)}
          >
            {Object.entries(DYNAMIC_PROGRAMMING_ALGORITHM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Sample preset" className="xl:col-span-2">
          <select
            className={inputClassName()}
            value={presetId}
            disabled={editingDisabled}
            onChange={(event) => loadPreset(event.target.value)}
          >
            <option value="" disabled>Choose a preset</option>
            {availablePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </FormField>

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
          errors={formErrors}
          form={form}
          disabled={editingDisabled}
          onChange={updateField}
        />

        {formErrors.form ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 md:col-span-2 xl:col-span-6">
            <InlineMessage tone="error">{formErrors.form}</InlineMessage>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <Button
            variant="primary"
            disabled={editingDisabled || hasValidationError}
            onClick={startVisualization}
          >
            {isLoading ? "Loading steps..." : "Start visualization"}
          </Button>
          <Button
            disabled={isLoading}
            onClick={playback.reset}
          >
            Reset run
          </Button>
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
            onRestart={playback.restart}
            onSeek={playback.seek}
          />
        </div>
      </Panel>

      {error ? <Alert title="Visualization unavailable">{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <VisualizationPanel
          title={DYNAMIC_PROGRAMMING_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Set the inputs and start the table visualization."}
          legend={["Active", "Related"]}
          resultSummary={playback.isComplete ? <span>DP result: <span className="font-mono text-xs">{result}</span></span> : null}
        >
          <DynamicProgrammingTable
            table={table}
            step={displayStep}
            rowLabels={rowLabels}
            columnLabels={columnLabels}
            variant={algorithm === "fibonacci" ? "compact" : "standard"}
          />
        </VisualizationPanel>
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
      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />
    </div>
  );
}

function AlgorithmInputFields({
  algorithm,
  errors,
  form,
  disabled,
  onChange,
}: {
  algorithm: DynamicProgrammingAlgorithm;
  errors: Partial<Record<keyof DynamicProgrammingForm | "form", string>>;
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
        error={errors.n}
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
          error={errors.coins}
          helperText="Comma-separated positive values, up to 8 coins."
          disabled={disabled}
          onChange={(value) => onChange("coins", value)}
        />
        <NumberField
          label="Amount"
          value={form.amount}
          min={0}
          max={50}
          error={errors.amount}
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
          error={errors.weights}
          helperText="Comma-separated positive weights, up to 8 values."
          disabled={disabled}
          onChange={(value) => onChange("weights", value)}
        />
        <TextField
          label="Values"
          value={form.values}
          error={errors.values}
          helperText="Comma-separated nonnegative values, up to 8 values."
          disabled={disabled}
          onChange={(value) => onChange("values", value)}
        />
        <NumberField
          label="Capacity"
          value={form.capacity}
          min={0}
          max={50}
          error={errors.capacity}
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
          error={errors.textA}
          helperText="12 characters or fewer."
          disabled={disabled}
          onChange={(value) => onChange("textA", value)}
        />
        <TextField
          label="Second string"
          value={form.textB}
          error={errors.textB}
          helperText="12 characters or fewer."
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
          error={errors.textA}
          helperText="12 characters or fewer."
          disabled={disabled}
          onChange={(value) => onChange("textA", value)}
        />
        <TextField
          label="Target string"
          value={form.textB}
          error={errors.textB}
          helperText="12 characters or fewer."
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
        error={errors.rows}
        disabled={disabled}
        onChange={(value) => onChange("rows", value)}
      />
      <NumberField
        label="Columns"
        value={form.cols}
        min={1}
        max={12}
        error={errors.cols}
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
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const messageId = `dp-${label.toLowerCase().replace(/\s+/g, "-")}-validation`;
  return (
    <FormField error={error} helperText={`Use ${min} to ${max}.`} label={label} messageId={messageId}>
      <input
        aria-describedby={messageId}
        aria-invalid={error !== undefined}
        className={inputClassName(error !== undefined)}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

function TextField({
  label,
  value,
  error,
  helperText,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  helperText?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const messageId = `dp-${label.toLowerCase().replace(/\s+/g, "-")}-validation`;
  return (
    <FormField error={error} helperText={helperText} label={label} messageId={messageId}>
      <input
        aria-describedby={messageId}
        aria-invalid={error !== undefined}
        className={inputClassName(error !== undefined)}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

function validateDynamicProgrammingForm(
  algorithm: DynamicProgrammingAlgorithm,
  form: DynamicProgrammingForm,
): Partial<Record<keyof DynamicProgrammingForm | "form", string>> {
  try {
    createRequest(algorithm, form);
    return {};
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "Check the highlighted inputs.";
    const field = dynamicProgrammingErrorField(message);
    return field ? { [field]: message } : { form: message };
  }
}

function dynamicProgrammingErrorField(message: string): keyof DynamicProgrammingForm | null {
  if (message.startsWith("n ")) return "n";
  if (message.startsWith("Coins")) return "coins";
  if (message.startsWith("Amount")) return "amount";
  if (message.startsWith("Weights")) return "weights";
  if (message.startsWith("Values")) return "values";
  if (message.startsWith("Capacity")) return "capacity";
  if (message.startsWith("First string") || message.startsWith("Source string")) return "textA";
  if (message.startsWith("Second string") || message.startsWith("Target string")) return "textB";
  if (message.startsWith("Rows")) return "rows";
  if (message.startsWith("Columns")) return "cols";
  return null;
}
