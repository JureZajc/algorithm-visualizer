"use client";

import { useEffect, useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { LearningPanel } from "@/components/learning-panel";
import { StepControls } from "@/components/step-controls";
import { ActionRow, Alert, Button, ControlPanel, FormField, inputClassName, SpeedField, type LegendItem } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchSearchingSteps, generateRandomNumbers } from "@/lib/api";
import { SEARCHING_PRESETS } from "@/lib/array-presets";
import { validateCountDraft, validateTarget } from "@/lib/searching-input";
import { parseSearchingQuery, searchingQuery, type QueryStateProps } from "@/lib/url-state";
import type { ArrayAlgorithmStep, MetadataSourceProps } from "@/types/algorithm";
import { SEARCHING_ALGORITHM_LABELS, type SearchingAlgorithm } from "@/types/searching";

const DEFAULT_NUMBERS = [8, 14, 23, 31, 42, 56, 67, 75, 83, 91];

// ArrayBars draws an inspected value in the compare color. A missing target colors no bar.
const LEGEND: LegendItem[] = [
  { label: "Inspect", tone: "amber" },
  { label: "Found", tone: "emerald" },
];

export function SearchingVisualizer({ initialQuery, onQueryChange, ...props }: MetadataSourceProps & QueryStateProps) {
  const [restored] = useState(() => parseSearchingQuery(initialQuery));
  const [algorithm, setAlgorithm] = useState<SearchingAlgorithm>(restored.algorithm ?? "linear_search");
  const [count, setCount] = useState((restored.numbers ?? DEFAULT_NUMBERS).length);
  const [countDraft, setCountDraft] = useState(String(count));
  const [presetId, setPresetId] = useState("");
  const [targetInput, setTargetInput] = useState(restored.target ?? "67");
  const [numbers, setNumbers] = useState(restored.numbers ?? DEFAULT_NUMBERS);
  const [speed, setSpeed] = useState(420);
  const query = searchingQuery({ algorithm, numbers, target: targetInput });
  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);
  const run = useVisualizationRun();
  const playback = useLearningPlayback<ArrayAlgorithmStep>(speed, algorithm);
  const isLoading = run.isLoading;
  const currentStep = playback.currentStep;
  const outcomeStep = currentStep?.type === "done" && playback.currentStepIndex > 0
    ? playback.steps[playback.currentStepIndex - 1]
    : currentStep;
  const foundIndex = playback.steps.find((step) => step.type === "found")?.indices[0];
  const notFound = playback.steps.some((step) => step.type === "not_found");
  const countValidation = validateCountDraft(countDraft);
  const targetValidation = validateTarget(targetInput);
  const hasValidationError = countValidation.error !== null || targetValidation.error !== null;

  function commitCount() {
    if (countValidation.value === null) return count;
    setCount(countValidation.value);
    setCountDraft(String(countValidation.value));
    if (countValidation.value !== numbers.length) setPresetId("");
    return countValidation.value;
  }

  function generate(numberCount: number) {
    return run.start({
      onStart: playback.reset,
      request: (signal) => generateRandomNumbers(numberCount, signal),
      onSuccess: (response) => {
        let next = response.numbers;
        if (algorithm === "binary_search") next = [...next].sort((a, b) => a - b);
        setNumbers(next);
        setTargetInput(String(next[Math.floor(next.length / 2)] ?? 0));
        setPresetId("");
      },
      errorMessage: "Could not generate numbers.",
    });
  }

  function start(numberCount: number) {
    const target = targetValidation.target;
    if (target === null) return;
    return run.start({
      onStart: playback.reset,
      request: async (signal) => {
        let next = numbers;
        if (next.length !== numberCount) {
          next = (await generateRandomNumbers(numberCount, signal)).numbers;
          signal.throwIfAborted();
          setPresetId("");
        }
        if (algorithm === "binary_search") next = [...next].sort((a, b) => a - b);
        setNumbers(next);
        return fetchSearchingSteps(next, algorithm, target, signal);
      },
      onSuccess: (response) => playback.load(response.steps, true, { target }),
      errorMessage: "Could not load searching steps.",
    });
  }

  function changeAlgorithm(next: SearchingAlgorithm) {
    setAlgorithm(next);
    setPresetId("");
    playback.reset();
    if (next === "binary_search") setNumbers((current) => [...current].sort((a, b) => a - b));
  }

  function loadPreset(nextId: string) {
    const preset = SEARCHING_PRESETS.find((item) => item.id === nextId);
    if (!preset) return;
    setPresetId(preset.id);
    setNumbers([...preset.numbers]);
    setTargetInput(String(preset.target));
    setCount(preset.numbers.length);
    setCountDraft(String(preset.numbers.length));
    if (preset.algorithm) setAlgorithm(preset.algorithm);
    run.clearError();
    playback.reset();
  }

  const result = playback.isComplete
    ? notFound
      ? `Target ${targetInput} was not found`
      : `Found ${targetInput} at index ${foundIndex}`
    : "Waiting for completion";

  const controls = (
    <ControlPanel className="md:grid-cols-2 xl:grid-cols-5" label="Searching controls">
      <FormField label="Searching algorithm">
        <select className={inputClassName()} value={algorithm} disabled={playback.isPlaying || isLoading} onChange={(event) => changeAlgorithm(event.target.value as SearchingAlgorithm)}>
          {Object.entries(SEARCHING_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </FormField>
      <FormField label="Sample preset">
        <select className={inputClassName()} value={presetId} disabled={playback.isPlaying || isLoading} onChange={(event) => loadPreset(event.target.value)}>
          <option value="" disabled>Choose a preset</option>
          {SEARCHING_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </FormField>
      <FormField error={targetValidation.error} helperText="Use an integer target." label="Target value" messageId="search-target-validation">
        <input aria-describedby="search-target-validation" aria-invalid={targetValidation.error !== null} className={inputClassName(targetValidation.error !== null)} type="number" value={targetInput} disabled={playback.isPlaying || isLoading} onChange={(event) => { setTargetInput(event.target.value); setPresetId(""); run.clearError(); playback.reset(); }} />
      </FormField>
      <FormField error={countValidation.error} helperText="Use 5 to 40 values." label="Random values" messageId="search-count-validation">
        <input aria-describedby="search-count-validation" aria-invalid={countValidation.error !== null} className={inputClassName(countValidation.error !== null)} type="number" min={5} max={40} value={countDraft} disabled={playback.isPlaying || isLoading} onBlur={commitCount} onChange={(event) => setCountDraft(event.target.value)} />
      </FormField>
      <SpeedField min={80} max={1000} step={20} value={speed} onChange={setSpeed} />
      <ActionRow className="md:col-span-2 xl:col-span-5">
        <Button disabled={playback.isPlaying || isLoading || countValidation.error !== null} onClick={() => generate(commitCount())}>Generate numbers</Button>
        <Button variant="primary" disabled={playback.isPlaying || isLoading || hasValidationError} onClick={() => start(commitCount())}>{isLoading ? "Loading steps..." : "Start visualization"}</Button>
        <Button disabled={isLoading} onClick={playback.reset}>Reset run</Button>
      </ActionRow>
      <div className="md:col-span-2 xl:col-span-5">
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
      notices={
        <>
          <LearningPanel learning={playback.learning} isLoading={isLoading} />
          {algorithm === "binary_search" ? <Alert title="Binary Search input" variant="info">Binary Search uses an ascending copy of the generated values.</Alert> : null}
        </>
      }
      error={run.error}
      visualization={
        <VisualizationPanel
          title={SEARCHING_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: run.error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Choose a target and start the search."}
          legend={LEGEND}
          resultSummary={playback.isComplete ? <span>{result}</span> : null}
        >
          <ArrayBars values={currentStep?.array ?? numbers} step={outcomeStep} />
        </VisualizationPanel>
      }
      pseudocodeLine={currentStep?.pseudocode_line}
      stats={<VisualizerStats algorithmName={SEARCHING_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel="Search result" result={result} />}
    />
  );
}
