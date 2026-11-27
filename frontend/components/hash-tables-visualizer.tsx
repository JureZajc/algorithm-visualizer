"use client";

import { useEffect, useState } from "react";

import { HashTableView } from "@/components/hash-table-view";
import { StepControls } from "@/components/step-controls";
import { ActionRow, Button, ControlPanel, FormField, inputClassName, SpeedField, type LegendItem } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchHashTableSteps } from "@/lib/api";
import {
  validateHashValues,
  validateLinearCapacity,
  validateTableSize,
  validateTarget,
} from "@/lib/hash-tables-input";
import { hashTablesQuery, parseHashTablesQuery, type QueryStateProps } from "@/lib/url-state";
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

// The colors HashTableView draws: tinted buckets for hashing, checking, and probing, and
// filled keys for what happens to the active key.
const HASH: LegendItem = { label: "Hash", tone: "sky-soft" };
const CHECKED: LegendItem = { label: "Checked", tone: "indigo-soft" };
const COMPARE: LegendItem = { label: "Compare", tone: "amber" };
const COLLISION: LegendItem = { label: "Collision", tone: "rose" };
const INSERTED: LegendItem = { label: "Inserted", tone: "violet" };
const FOUND: LegendItem = { label: "Found", tone: "emerald" };
const NOT_FOUND: LegendItem = { label: "Not found", tone: "slate" };
const PROBE: LegendItem = { label: "Probe", tone: "cyan-soft" };
const LEGENDS: Record<HashTableAlgorithm, LegendItem[]> = {
  hash_insert_chaining: [HASH, CHECKED, COLLISION, INSERTED],
  hash_search_chaining: [HASH, CHECKED, COMPARE, FOUND, NOT_FOUND],
  hash_insert_linear_probing: [HASH, CHECKED, PROBE, COLLISION, INSERTED],
  hash_search_linear_probing: [HASH, CHECKED, PROBE, COMPARE, FOUND, NOT_FOUND],
};

export function HashTablesVisualizer({ initialQuery, onQueryChange, ...props }: MetadataSourceProps & QueryStateProps) {
  const [restored] = useState(() => parseHashTablesQuery(initialQuery));
  const [algorithm, setAlgorithm] = useState<HashTableAlgorithm>(restored.algorithm ?? "hash_insert_chaining");
  const [valuesInput, setValuesInput] = useState(restored.values ?? DEFAULT_VALUES);
  const [tableSizeInput, setTableSizeInput] = useState(restored.tableSize ?? DEFAULT_TABLE_SIZE);
  const [targetInput, setTargetInput] = useState(restored.target ?? DEFAULT_TARGET);
  const [speed, setSpeed] = useState(520);
  const run = useVisualizationRun();
  const playback = useStepPlayback<HashTableStep>(speed);
  const isLoading = run.isLoading;
  const currentStep = playback.currentStep;
  const isSearch = isSearchAlgorithm(algorithm);
  const query = hashTablesQuery({ algorithm, values: valuesInput, tableSize: tableSizeInput, target: isSearch ? targetInput : undefined });
  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);
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
    run.clearError();
    playback.reset();
  }

  function changeAlgorithm(next: HashTableAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  function startVisualization() {
    if (
      !valuesValidation.ok ||
      !tableSizeValidation.ok ||
      !targetValidation.ok ||
      capacityError !== null
    ) {
      return;
    }

    const request = {
      algorithm,
      values: valuesValidation.values,
      table_size: tableSizeValidation.tableSize,
      ...(isSearch ? { target: targetValidation.target } : {}),
    };
    return run.start({
      onStart: playback.reset,
      request: (signal) => fetchHashTableSteps(request, signal),
      onSuccess: (response) => playback.load(response.steps),
      errorMessage: "Could not load hash table steps.",
    });
  }

  const controls = (
    <ControlPanel className="md:grid-cols-2 xl:grid-cols-6" label="Hash table controls">
      <FormField label="Hash table operation" className="xl:col-span-2">
        <select
          className={inputClassName()}
          value={algorithm}
          disabled={editingDisabled}
          onChange={(event) => changeAlgorithm(event.target.value as HashTableAlgorithm)}
        >
          {Object.entries(HASH_TABLE_ALGORITHM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FormField>

      <FormField
        className="xl:col-span-2"
        error={!valuesValidation.ok ? valuesValidation.error : capacityError ?? undefined}
        helperText="Use 1 to 31 comma-separated keys."
        label="Values"
        messageId="hash-values-validation"
      >
        <input
          className={inputClassName(!valuesValidation.ok || capacityError !== null)}
          value={valuesInput}
          disabled={editingDisabled}
          aria-invalid={!valuesValidation.ok || capacityError !== null}
          aria-describedby="hash-values-validation"
          onChange={(event) => {
            setValuesInput(event.target.value);
            resetForInputChange();
          }}
        />
      </FormField>

      <FormField error={tableSizeValidation.ok ? undefined : tableSizeValidation.error} helperText="Use a table size from 2 to 31." label="Table size" messageId="hash-table-size-validation">
        <input
          className={inputClassName(!tableSizeValidation.ok || capacityError !== null)}
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
      </FormField>

      {isSearch ? (
        <FormField error={targetValidation.ok ? undefined : targetValidation.error} helperText="Use a number or string key." label="Target" messageId="hash-target-validation">
          <input
            className={inputClassName(!targetValidation.ok)}
            value={targetInput}
            disabled={editingDisabled}
            aria-invalid={!targetValidation.ok}
            aria-describedby="hash-target-validation"
            onChange={(event) => {
              setTargetInput(event.target.value);
              resetForInputChange();
            }}
          />
        </FormField>
      ) : null}

      <SpeedField min={100} max={1200} step={20} value={speed} onChange={setSpeed} />

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
      error={run.error}
      visualization={
        <VisualizationPanel
          title={HASH_TABLE_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: run.error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Enter keys and start the hash table visualization."}
          legend={LEGENDS[algorithm]}
          resultSummary={playback.isComplete ? <span>{isSearch ? "Search result" : "Insert result"}: <span className="font-mono text-xs">{result}</span></span> : null}
        >
          <HashTableView table={displayedTable} step={currentStep} />
        </VisualizationPanel>
      }
      pseudocodeLine={currentStep?.pseudocode_line}
      stats={
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
      }
    />
  );
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
