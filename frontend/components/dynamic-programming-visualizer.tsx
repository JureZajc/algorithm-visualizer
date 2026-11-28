"use client";

import { useEffect, useState } from "react";

import { DynamicProgrammingTable } from "@/components/dynamic-programming-table";
import { LearningPanel } from "@/components/learning-panel";
import { StepControls } from "@/components/step-controls";
import { ActionRow, Button, ControlPanel, FormField, InlineMessage, inputClassName, SpeedField, type LegendItem } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchDynamicProgrammingSteps } from "@/lib/api";
import {
  createRequest,
  DEFAULT_FIELDS,
  formFieldsFromRequest,
  INITIAL_FORM,
  safeRequest,
  validateDynamicProgrammingForm,
  type DynamicProgrammingForm,
} from "@/lib/dynamic-programming-input";
import {
  DYNAMIC_PROGRAMMING_PRESETS,
  type DynamicProgrammingPreset,
} from "@/lib/dynamic-programming-presets";
import { dynamicProgrammingQuery, parseDynamicProgrammingQuery, type QueryStateProps } from "@/lib/url-state";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  DYNAMIC_PROGRAMMING_ALGORITHM_LABELS,
  type DynamicProgrammingAlgorithm,
  type DynamicProgrammingCell,
  type DynamicProgrammingStep,
  type TablePosition,
} from "@/types/dynamic-programming";

const FIBONACCI_COLUMNS_PER_ROW = 8;

// DynamicProgrammingTable fills the active cell and tints the cells it reads from.
const LEGEND: LegendItem[] = [
  { label: "Active", tone: "indigo" },
  { label: "Related", tone: "amber-soft" },
];

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

/** The n of a cell in the wrapped table, counted across rows rather than restarting at 0. */
function fibonacciCellLabel(rowIndex: number, columnIndex: number) {
  return `n ${rowIndex * FIBONACCI_COLUMNS_PER_ROW + columnIndex}`;
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

export function DynamicProgrammingVisualizer({ initialQuery, onQueryChange, ...props }: MetadataSourceProps & QueryStateProps) {
  const [restored] = useState(() => parseDynamicProgrammingQuery(initialQuery));
  const [algorithm, setAlgorithm] = useState<DynamicProgrammingAlgorithm>(restored.algorithm ?? "fibonacci");
  const [form, setForm] = useState<DynamicProgrammingForm>(restored.form ?? INITIAL_FORM);
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(520);
  const query = dynamicProgrammingQuery({ algorithm, form });
  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);
  const run = useVisualizationRun();
  const playback = useLearningPlayback<DynamicProgrammingStep>(speed, algorithm);
  const isLoading = run.isLoading;
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
    run.clearError();
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

  function startVisualization() {
    if (hasValidationError) return;

    return run.start({
      onStart: playback.reset,
      // Built inside the request, as before, so an input it rejects shows as the run's error.
      request: (signal) => fetchDynamicProgrammingSteps(createRequest(algorithm, form), signal),
      onSuccess: (response) => playback.load(response.steps),
      errorMessage: "Could not load dynamic programming steps.",
    });
  }

  const editingDisabled = playback.isPlaying || isLoading;

  const controls = (
    <ControlPanel className="md:grid-cols-2 xl:grid-cols-6" label="Dynamic programming controls">
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

      <SpeedField className="xl:col-span-2" min={80} max={1200} step={20} value={speed} onChange={setSpeed} />

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

      <ActionRow className="md:col-span-2 xl:col-span-6">
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
      </ActionRow>

      <div className="md:col-span-2 xl:col-span-6">
        <StepControls
          currentStepIndex={playback.currentStepIndex}
          totalSteps={playback.steps.length}
          isLoading={isLoading}
          isPlaying={playback.isPlaying}
          learningBlocked={playback.learning.blocked}
          onTogglePlayback={playback.toggle}
          onPrevious={playback.previous}
          onNext={playback.next}
          onJumpToStart={playback.jumpToStart}
          onJumpToEnd={playback.jumpToEnd}
          onRestart={playback.restart}
          onSeek={playback.seek}
        />
      </div>
    </ControlPanel>
  );

  return (
    <VisualizerWorkspace
      algorithmId={algorithm}
      metadata={props}
      controls={controls}
      notices={<LearningPanel learning={playback.learning} isLoading={isLoading} />}
      error={run.error}
      visualization={
        <VisualizationPanel
          title={DYNAMIC_PROGRAMMING_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: run.error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Set the inputs and start the table visualization."}
          legend={LEGEND}
          resultSummary={playback.isComplete ? <span>DP result: <span className="font-mono text-xs">{result}</span></span> : null}
        >
          <DynamicProgrammingTable
            table={table}
            step={displayStep}
            rowLabels={rowLabels}
            columnLabels={columnLabels}
            variant={algorithm === "fibonacci" ? "compact" : "standard"}
            cellLabel={algorithm === "fibonacci" ? fibonacciCellLabel : undefined}
          />
        </VisualizationPanel>
      }
      pseudocodeLine={currentStep?.pseudocode_line}
      stats={
        <VisualizerStats
          algorithmName={DYNAMIC_PROGRAMMING_ALGORITHM_LABELS[algorithm]}
          currentStep={playback.currentStepIndex + 1}
          totalSteps={playback.steps.length}
          elapsedMs={playback.elapsedMs}
          resultLabel="DP result"
          result={result}
        />
      }
    />
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
