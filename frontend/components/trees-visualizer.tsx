"use client";

import { useState } from "react";

import { LearningPanel } from "@/components/learning-panel";
import { StepControls } from "@/components/step-controls";
import { TreeCanvas } from "@/components/tree-canvas";
import {
  ActionRow,
  Button,
  ControlPanel,
  FormField,
  inputClassName,
  SpeedField,
  VisualizationEmptyState,
  type LegendItem,
} from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { Stat, VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchTreeSteps } from "@/lib/api";
import { validateTarget, validateTreeValues } from "@/lib/trees-input";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  TREE_ALGORITHM_LABELS,
  type TreeAlgorithm,
  type TreeRotationType,
  type TreeStep,
} from "@/types/trees";

const DEFAULT_VALUES = "8, 3, 10, 1, 6, 14, 4, 7, 13";
const DEFAULT_TARGET = 7;
const ROTATION_LABELS: Record<TreeRotationType, string> = {
  left: "Left rotation",
  right: "Right rotation",
  left_right: "Left-right rotation",
  right_left: "Right-left rotation",
};

// The node colors TreeCanvas draws. Comparing is the current action while a value descends.
const CURRENT: LegendItem = { label: "Current", tone: "amber" };
const INSERTED: LegendItem = { label: "Inserted", tone: "violet" };
const PATH: LegendItem = { label: "Path", tone: "indigo" };
const VISITED: LegendItem = { label: "Visited", tone: "sky" };
const TRAVERSAL_LEGEND = [PATH, VISITED];
const LEGENDS: Record<TreeAlgorithm, LegendItem[]> = {
  bst_insert: [CURRENT, INSERTED, PATH, VISITED],
  avl_insert: [
    CURRENT,
    INSERTED,
    PATH,
    { label: "Balance check", tone: "cyan" },
    { label: "Imbalanced", tone: "rose" },
    { label: "Rotation", tone: "fuchsia" },
    VISITED,
  ],
  bst_search: [CURRENT, PATH, { label: "Found", tone: "emerald" }, { label: "Not found", tone: "slate" }],
  inorder_traversal: TRAVERSAL_LEGEND,
  preorder_traversal: TRAVERSAL_LEGEND,
  postorder_traversal: TRAVERSAL_LEGEND,
};

export function TreesVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<TreeAlgorithm>("bst_insert");
  const [valuesInput, setValuesInput] = useState(DEFAULT_VALUES);
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET));
  const [speed, setSpeed] = useState(520);
  const run = useVisualizationRun();
  const playback = useLearningPlayback<TreeStep>(speed, algorithm);
  const isLoading = run.isLoading;
  const currentStep = playback.currentStep;
  const isSearch = algorithm === "bst_search";
  const isInsert = algorithm === "bst_insert" || algorithm === "avl_insert";
  const valuesValidation = validateTreeValues(valuesInput);
  const targetValidation = validateTarget(targetInput, isSearch);
  const displayedTree = currentStep?.tree ?? null;
  const editingDisabled = playback.isPlaying || isLoading;
  const hasValidationError = !valuesValidation.ok || !targetValidation.ok;

  function resetForInputChange() {
    run.clearError();
    playback.reset();
  }

  function changeAlgorithm(next: TreeAlgorithm) {
    setAlgorithm(next);
    resetForInputChange();
  }

  function startVisualization() {
    if (!valuesValidation.ok || !targetValidation.ok) {
      return;
    }

    const request = {
      algorithm,
      values: valuesValidation.values,
      ...(isSearch ? { target: targetValidation.target } : {}),
    };
    return run.start({
      onStart: playback.reset,
      request: (signal) => fetchTreeSteps(request, signal),
      onSuccess: (response) => playback.load(response.steps),
      errorMessage: "Could not load tree steps.",
    });
  }

  const result = formatResult(algorithm, playback.isComplete, currentStep);
  const resultLabel = isSearch
    ? "Search result"
    : isInsert
      ? "Final inorder"
      : "Traversal order";
  const rotationLabel = formatRotationType(currentStep?.rotation_type ?? null);

  const controls = (
    <ControlPanel className="md:grid-cols-2 xl:grid-cols-6" label="Tree controls">
      <FormField label="Tree algorithm" className="xl:col-span-2">
        <select className={inputClassName()} value={algorithm} disabled={editingDisabled} onChange={(event) => changeAlgorithm(event.target.value as TreeAlgorithm)}>
          {Object.entries(TREE_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </FormField>
      <FormField className="xl:col-span-2" error={valuesValidation.ok ? undefined : valuesValidation.error} helperText="Use 1 to 31 unique comma-separated integers." label="Values" messageId="tree-values-validation">
        <input
          className={inputClassName(!valuesValidation.ok)}
          value={valuesInput}
          disabled={editingDisabled}
          aria-invalid={!valuesValidation.ok}
          aria-describedby="tree-values-validation"
          onChange={(event) => {
            setValuesInput(event.target.value);
            resetForInputChange();
          }}
        />
      </FormField>
      {isSearch ? (
        <FormField error={targetValidation.ok ? undefined : targetValidation.error} helperText="Use an integer target." label="Target" messageId="tree-target-validation">
          <input
            className={inputClassName(!targetValidation.ok)}
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
        </FormField>
      ) : null}
      <SpeedField min={120} max={1200} step={20} value={speed} onChange={setSpeed} />
      <ActionRow className="md:col-span-2 xl:col-span-6">
        <Button variant="primary" disabled={editingDisabled || hasValidationError} onClick={startVisualization}>{isLoading ? "Loading steps..." : "Start visualization"}</Button>
        <Button disabled={isLoading} onClick={playback.reset}>Reset run</Button>
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
          title={TREE_ALGORITHM_LABELS[algorithm]}
          className="min-w-0 p-4 sm:p-5"
          status={playbackStatus({
            hasError: run.error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Enter unique values and start the tree visualization."}
          legend={LEGENDS[algorithm]}
          resultSummary={playback.isComplete ? <span>{resultLabel}: <span className="font-mono text-xs">{result}</span></span> : null}
        >
          {displayedTree ? (
            <TreeCanvas tree={displayedTree} step={currentStep} />
          ) : (
            <VisualizationEmptyState
              title="No tree yet"
              description="Start the visualization to build the tree from your values, one step at a time."
            />
          )}
        </VisualizationPanel>
      }
      pseudocodeLine={currentStep?.pseudocode_line}
      stats={
        <VisualizerStats algorithmName={TREE_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel={resultLabel} result={<span className="font-mono text-xs font-medium">{result}</span>}>
          <Stat label="Input values"><span className="font-mono text-xs">{valuesValidation.ok ? valuesValidation.values.join(", ") : "Invalid input"}</span></Stat>
          {isSearch ? <Stat label="Search path"><span className="font-mono text-xs">{currentStep?.path.join(", ") || "Empty"}</span></Stat> : null}
          {algorithm === "avl_insert" ? <Stat label="Rotation"><span className="font-mono text-xs">{rotationLabel}</span></Stat> : null}
          {!isSearch ? <Stat label="Visited order"><span className="font-mono text-xs">{currentStep?.visited.join(", ") || "Empty"}</span></Stat> : null}
        </VisualizerStats>
      }
    />
  );
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
