"use client";

import { useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { StepControls } from "@/components/step-controls";
import { Alert, Button, FormField, inputClassName, Panel } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchSearchingSteps, generateRandomNumbers } from "@/lib/api";
import { SEARCHING_PRESETS } from "@/lib/array-presets";
import type { ArrayAlgorithmStep, MetadataSourceProps } from "@/types/algorithm";
import { SEARCHING_ALGORITHM_LABELS, type SearchingAlgorithm } from "@/types/searching";

const DEFAULT_NUMBERS = [8, 14, 23, 31, 42, 56, 67, 75, 83, 91];

export function SearchingVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<SearchingAlgorithm>("linear_search");
  const [count, setCount] = useState(DEFAULT_NUMBERS.length);
  const [countDraft, setCountDraft] = useState(String(DEFAULT_NUMBERS.length));
  const [presetId, setPresetId] = useState("");
  const [targetInput, setTargetInput] = useState("67");
  const [numbers, setNumbers] = useState(DEFAULT_NUMBERS);
  const [speed, setSpeed] = useState(420);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<ArrayAlgorithmStep>(speed);
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

  async function generate(numberCount: number) {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      let next = (await generateRandomNumbers(numberCount)).numbers;
      if (algorithm === "binary_search") next = [...next].sort((a, b) => a - b);
      setNumbers(next);
      setTargetInput(String(next[Math.floor(next.length / 2)] ?? 0));
      setPresetId("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate numbers.");
    } finally {
      setIsLoading(false);
    }
  }

  async function start(numberCount: number) {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      if (targetValidation.target === null) return;
      let next = numbers;
      if (next.length !== numberCount) {
        next = (await generateRandomNumbers(numberCount)).numbers;
        setPresetId("");
      }
      if (algorithm === "binary_search") next = [...next].sort((a, b) => a - b);
      setNumbers(next);
      playback.load((await fetchSearchingSteps(next, algorithm, targetValidation.target)).steps);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load searching steps.");
    } finally {
      setIsLoading(false);
    }
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
    setError(null);
    playback.reset();
  }

  const result = playback.isComplete
    ? notFound
      ? `Target ${targetInput} was not found`
      : `Found ${targetInput} at index ${foundIndex}`
    : "Waiting for completion";

  return (
    <div>
      <Panel className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5" variant="control">
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
          <input aria-describedby="search-target-validation" aria-invalid={targetValidation.error !== null} className={inputClassName(targetValidation.error !== null)} type="number" value={targetInput} disabled={playback.isPlaying || isLoading} onChange={(event) => { setTargetInput(event.target.value); setPresetId(""); setError(null); playback.reset(); }} />
        </FormField>
        <FormField error={countValidation.error} helperText="Use 5 to 40 values." label="Random values" messageId="search-count-validation">
          <input aria-describedby="search-count-validation" aria-invalid={countValidation.error !== null} className={inputClassName(countValidation.error !== null)} type="number" min={5} max={40} value={countDraft} disabled={playback.isPlaying || isLoading} onBlur={commitCount} onChange={(event) => setCountDraft(event.target.value)} />
        </FormField>
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={80} max={1000} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
          <Button disabled={playback.isPlaying || isLoading || countValidation.error !== null} onClick={() => generate(commitCount())}>Generate numbers</Button>
          <Button variant="primary" disabled={playback.isPlaying || isLoading || hasValidationError} onClick={() => start(commitCount())}>{isLoading ? "Loading steps..." : "Start visualization"}</Button>
          <Button disabled={isLoading} onClick={playback.reset}>Reset run</Button>
        </div>
        <div className="md:col-span-2 xl:col-span-5">
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

      {algorithm === "binary_search" ? <Alert title="Binary Search input" variant="info">Binary Search uses an ascending copy of the generated values.</Alert> : null}
      {error ? <Alert title="Visualization unavailable">{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <VisualizationPanel
          title={SEARCHING_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Choose a target and start the search."}
          legend={["Inspect", "Found", "Not found"]}
          resultSummary={playback.isComplete ? <span>{result}</span> : null}
        >
          <ArrayBars values={currentStep?.array ?? numbers} step={outcomeStep} />
        </VisualizationPanel>
        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={SEARCHING_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel="Search result" result={result} />
        </div>
      </div>
      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />
    </div>
  );
}

function validateCountDraft(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter a whole number from 5 to 40.", value: null };
  }
  if (value < 5 || value > 40) {
    return { error: "Random values must be between 5 and 40.", value: null };
  }
  return { error: null, value };
}

function validateTarget(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter an integer target value.", target: null };
  }
  return { error: null, target: value };
}
