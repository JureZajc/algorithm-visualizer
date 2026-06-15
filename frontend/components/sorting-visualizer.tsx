"use client";

import { useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { VisualizerControls } from "@/components/visualizer-controls";
import { VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchSortingSteps, generateRandomNumbers } from "@/lib/api";
import { SORTING_PRESETS } from "@/lib/array-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import { ALGORITHM_LABELS, type AlgorithmStep, type SortingAlgorithm } from "@/types/sorting";

const DEFAULT_NUMBERS = [42, 17, 83, 29, 64, 8, 51, 36, 75, 23, 92, 58];

export function SortingVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<SortingAlgorithm>("bubble_sort");
  const [count, setCount] = useState(DEFAULT_NUMBERS.length);
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(320);
  const [initialNumbers, setInitialNumbers] = useState(DEFAULT_NUMBERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<AlgorithmStep>(speed);
  const displayedNumbers = playback.currentStep?.array ?? initialNumbers;
  const finalArray = playback.isComplete ? playback.currentStep?.array : null;

  async function handleGenerate(numberCount: number) {
    setError(null);
    setIsLoading(true);
    playback.reset();
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

  async function handleStart(numberCount: number) {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      let numbers = initialNumbers;
      if (numbers.length !== numberCount) {
        numbers = (await generateRandomNumbers(numberCount)).numbers;
        setInitialNumbers(numbers);
        setPresetId("");
      }
      playback.load((await fetchSortingSteps(numbers, algorithm)).steps);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load sorting steps.");
    } finally {
      setIsLoading(false);
    }
  }

  function changeAlgorithm(next: SortingAlgorithm) {
    setAlgorithm(next);
    playback.reset();
  }

  function loadPreset(nextId: string) {
    const preset = SORTING_PRESETS.find((item) => item.id === nextId);
    if (!preset) return;
    const numbers = preset.createNumbers();
    setPresetId(preset.id);
    setCount(numbers.length);
    setInitialNumbers(numbers);
    setError(null);
    playback.reset();
  }

  return (
    <div>
      <VisualizerControls
        key={count}
        algorithm={algorithm}
        count={count}
        speed={speed}
        isLoading={isLoading}
        isPlaying={playback.isPlaying}
        currentStepIndex={playback.currentStepIndex}
        totalSteps={playback.steps.length}
        presetId={presetId}
        presets={SORTING_PRESETS}
        onAlgorithmChange={changeAlgorithm}
        onCountChange={(nextCount) => {
          setCount(nextCount);
          if (nextCount !== initialNumbers.length) setPresetId("");
        }}
        onSpeedChange={setSpeed}
        onGenerate={handleGenerate}
        onStart={handleStart}
        onTogglePlayback={playback.toggle}
        onPreviousStep={playback.previous}
        onNextStep={playback.next}
        onJumpToStart={playback.jumpToStart}
        onJumpToEnd={playback.jumpToEnd}
        onSeek={playback.seek}
        onReset={playback.reset}
        onPresetChange={loadPreset}
      />

      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          <VisualizerHeading
            title={ALGORITHM_LABELS[algorithm]}
            description={playback.currentStep?.description ?? "Generate a new array or start with the sample values."}
            legend={["Compare", "Swap", "Overwrite"]}
          />
          <ArrayBars values={displayedNumbers} step={playback.currentStep} />
        </section>
        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={playback.currentStep?.pseudocode_line} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats
            algorithmName={ALGORITHM_LABELS[algorithm]}
            currentStep={playback.currentStepIndex + 1}
            totalSteps={playback.steps.length}
            elapsedMs={playback.elapsedMs}
            resultLabel="Final sorted array"
            result={<span className="font-mono text-xs font-medium">{finalArray ? `[${finalArray.join(", ")}]` : "Waiting for completion"}</span>}
          />
        </div>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</p>;
}

export function VisualizerHeading({ title, description, legend }: { title: string; description: string; legend: string[] }) {
  const legendClasses: Record<string, string> = {
    Compare: "bg-amber-400",
    Swap: "bg-rose-500",
    Overwrite: "bg-violet-500",
    Inspect: "bg-sky-500",
    Found: "bg-emerald-500",
  };
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h2 className="mb-1 text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="m-0 min-h-5 text-sm leading-6 text-slate-500" aria-live="polite">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-500">
        {legend.map((item) => (
          <span className="inline-flex items-center gap-1.5" key={item}>
            <span className={`h-2.5 w-2.5 rounded-sm ${legendClasses[item] ?? "bg-slate-400"}`} />{item}
          </span>
        ))}
      </div>
    </div>
  );
}
