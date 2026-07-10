import { useState } from "react";

import { StepControls } from "@/components/step-controls";
import { Button, FormField, inputClassName, Panel } from "@/components/ui-primitives";
import type { SortingPreset } from "@/lib/array-presets";
import { ALGORITHM_LABELS, type SortingAlgorithm } from "@/types/sorting";

interface VisualizerControlsProps {
  algorithm: SortingAlgorithm;
  count: number;
  speed: number;
  isLoading: boolean;
  isPlaying: boolean;
  currentStepIndex: number;
  totalSteps: number;
  presetId: string;
  presets: SortingPreset[];
  onAlgorithmChange: (algorithm: SortingAlgorithm) => void;
  onCountChange: (count: number) => void;
  onSpeedChange: (speed: number) => void;
  onGenerate: (count: number) => void;
  onStart: (count: number) => void;
  onTogglePlayback: () => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSeek: (index: number) => void;
  onReset: () => void;
  onPresetChange: (presetId: string) => void;
}

export function VisualizerControls(props: VisualizerControlsProps) {
  const [countDraft, setCountDraft] = useState(String(props.count));
  const countValidation = validateCountDraft(countDraft);
  const hasCountError = countValidation.error !== null;

  function commitCount(): number {
    if (countValidation.value === null) return props.count;
    setCountDraft(String(countValidation.value));
    props.onCountChange(countValidation.value);
    return countValidation.value;
  }

  return (
    <Panel
      className="mb-5 grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4"
      variant="control"
      aria-label="Sorting visualization controls"
    >
      <FormField label="Sorting algorithm">
        <select
          className={inputClassName()}
          value={props.algorithm}
          disabled={props.isPlaying || props.isLoading}
          onChange={(event) =>
            props.onAlgorithmChange(event.target.value as SortingAlgorithm)
          }
        >
          {Object.entries(ALGORITHM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Sample preset">
        <select
          className={inputClassName()}
          value={props.presetId}
          disabled={props.isPlaying || props.isLoading}
          onChange={(event) => props.onPresetChange(event.target.value)}
        >
          <option value="" disabled>Choose a preset</option>
          {props.presets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
      </FormField>

      <FormField
        error={countValidation.error}
        helperText="Use 5 to 50 values."
        label="Random values"
        messageId="sorting-count-validation"
      >
        <input
          aria-describedby="sorting-count-validation"
          aria-invalid={hasCountError}
          className={inputClassName(hasCountError)}
          type="number"
          min={5}
          max={50}
          value={countDraft}
          disabled={props.isPlaying || props.isLoading}
          onBlur={commitCount}
          onChange={(event) => setCountDraft(event.target.value)}
        />
      </FormField>

      <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
        <span className="flex justify-between gap-3">
          Animation speed
          <span className="font-mono text-indigo-600">{props.speed} ms</span>
        </span>
        <input
          className="w-full accent-indigo-600"
          type="range"
          min={80}
          max={1000}
          step={20}
          value={props.speed}
          onChange={(event) => props.onSpeedChange(Number(event.target.value))}
        />
      </label>

      <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
        <Button disabled={props.isPlaying || props.isLoading || hasCountError} onClick={() => props.onGenerate(commitCount())}>
          Generate numbers
        </Button>
        <Button variant="primary" disabled={props.isPlaying || props.isLoading || hasCountError} onClick={() => props.onStart(commitCount())}>
          {props.isLoading ? "Loading steps..." : "Start visualization"}
        </Button>
        <Button disabled={props.isLoading} onClick={props.onReset}>
          Reset
        </Button>
      </div>

      <div className="md:col-span-2 xl:col-span-4">
        <StepControls
          currentStepIndex={props.currentStepIndex}
          totalSteps={props.totalSteps}
          isLoading={props.isLoading}
          isPlaying={props.isPlaying}
          onTogglePlayback={props.onTogglePlayback}
          onPrevious={props.onPreviousStep}
          onNext={props.onNextStep}
          onJumpToStart={props.onJumpToStart}
          onJumpToEnd={props.onJumpToEnd}
          onSeek={props.onSeek}
        />
      </div>
    </Panel>
  );
}

function validateCountDraft(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: "Enter a whole number from 5 to 50.", value: null };
  }
  if (value < 5 || value > 50) {
    return { error: "Random values must be between 5 and 50.", value: null };
  }
  return { error: null, value };
}
