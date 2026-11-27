"use client";

import { useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { LearningPanel } from "@/components/learning-panel";
import type { LegendItem } from "@/components/ui-primitives";
import { VisualizerControls } from "@/components/visualizer-controls";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchSortingSteps, generateRandomNumbers } from "@/lib/api";
import { SORTING_PRESETS } from "@/lib/array-presets";
import type { ArrayStepType, MetadataSourceProps } from "@/types/algorithm";
import { ALGORITHM_LABELS, type AlgorithmStep, type SortingAlgorithm } from "@/types/sorting";

const DEFAULT_NUMBERS = [42, 17, 83, 29, 64, 8, 51, 36, 75, 23, 92, 58];

type SortingLegendStep = Exclude<ArrayStepType, "found" | "not_found">;

// The colors ArrayBars draws for each step type.
const LEGEND_ITEMS: Record<SortingLegendStep, LegendItem> = {
  compare: { label: "Compare", tone: "amber" },
  swap: { label: "Swap", tone: "rose" },
  overwrite: { label: "Overwrite", tone: "violet" },
  partition: { label: "Partition", tone: "sky" },
  merge: { label: "Merge", tone: "emerald" },
  heapify: { label: "Heapify", tone: "pink" },
  done: { label: "Sorted", tone: "emerald" },
};

// The step types each algorithm produces, so the legend lists only colors that can appear.
const ALGORITHM_STEP_TYPES: Record<SortingAlgorithm, SortingLegendStep[]> = {
  bubble_sort: ["compare", "swap"],
  selection_sort: ["compare", "swap"],
  insertion_sort: ["compare", "overwrite"],
  merge_sort: ["compare", "partition", "merge", "overwrite"],
  quick_sort: ["compare", "partition", "swap"],
  heap_sort: ["compare", "heapify", "swap"],
  shell_sort: ["compare", "overwrite"],
  cocktail_shaker_sort: ["compare", "swap"],
  gnome_sort: ["compare", "swap"],
  comb_sort: ["compare", "swap"],
  counting_sort: ["overwrite"],
};

function sortingLegend(algorithm: SortingAlgorithm): LegendItem[] {
  return [...ALGORITHM_STEP_TYPES[algorithm], "done" as const].map((type) => LEGEND_ITEMS[type]);
}

export function SortingVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<SortingAlgorithm>("bubble_sort");
  const [count, setCount] = useState(DEFAULT_NUMBERS.length);
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(320);
  const [initialNumbers, setInitialNumbers] = useState(DEFAULT_NUMBERS);
  const run = useVisualizationRun();
  const playback = useLearningPlayback<AlgorithmStep>(speed, algorithm);
  const displayedNumbers = playback.currentStep?.array ?? initialNumbers;
  const finalArray = playback.isComplete ? playback.currentStep?.array : null;

  function handleGenerate(numberCount: number) {
    return run.start({
      onStart: playback.reset,
      request: (signal) => generateRandomNumbers(numberCount, signal),
      onSuccess: (response) => {
        setInitialNumbers(response.numbers);
        setPresetId("");
      },
      errorMessage: "Could not generate numbers.",
    });
  }

  function handleStart(numberCount: number) {
    return run.start({
      onStart: playback.reset,
      request: async (signal) => {
        let numbers = initialNumbers;
        if (numbers.length !== numberCount) {
          numbers = (await generateRandomNumbers(numberCount, signal)).numbers;
          signal.throwIfAborted();
          setInitialNumbers(numbers);
          setPresetId("");
        }
        return fetchSortingSteps(numbers, algorithm, signal);
      },
      onSuccess: (response) => playback.load(response.steps),
      errorMessage: "Could not load sorting steps.",
    });
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
    run.clearError();
    playback.reset();
  }

  return (
    <VisualizerWorkspace
      algorithmId={algorithm}
      metadata={props}
      controls={
        <VisualizerControls
          key={count}
          algorithm={algorithm}
          count={count}
          speed={speed}
          isLoading={run.isLoading}
          isPlaying={playback.isPlaying}
          learningBlocked={playback.learning.blocked}
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
          onRestart={playback.restart}
          onSeek={playback.seek}
          onReset={playback.reset}
          onPresetChange={loadPreset}
        />
      }
      notices={<LearningPanel learning={playback.learning} isLoading={run.isLoading} />}
      error={run.error}
      visualization={
        <VisualizationPanel
          title={ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: run.error !== null,
            isComplete: playback.isComplete,
            isLoading: run.isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={playback.currentStep?.description ?? "Generate a new array or start with the sample values."}
          legend={sortingLegend(algorithm)}
          resultSummary={finalArray ? <span>Final sorted array ({finalArray.length} values): <span className="font-mono text-xs">[{finalArray.join(", ")}]</span></span> : null}
        >
          <ArrayBars values={displayedNumbers} step={playback.currentStep} />
        </VisualizationPanel>
      }
      pseudocodeLine={playback.currentStep?.pseudocode_line}
      stats={
        <VisualizerStats
          algorithmName={ALGORITHM_LABELS[algorithm]}
          currentStep={playback.currentStepIndex + 1}
          totalSteps={playback.steps.length}
          elapsedMs={playback.elapsedMs}
          resultLabel="Final sorted array"
          result={<span className="font-mono text-xs font-medium">{finalArray ? `[${finalArray.join(", ")}]` : "Waiting for completion"}</span>}
        />
      }
    />
  );
}
