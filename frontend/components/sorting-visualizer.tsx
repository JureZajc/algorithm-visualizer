"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { VisualizerControls } from "@/components/visualizer-controls";
import { VisualizerStats } from "@/components/visualizer-stats";
import { fetchSortingSteps, generateRandomNumbers } from "@/lib/api";
import {
  ALGORITHM_LABELS,
  type AlgorithmStep,
  type SortingAlgorithm,
} from "@/types/sorting";

const DEFAULT_NUMBERS = [42, 17, 83, 29, 64, 8, 51, 36, 75, 23, 92, 58];

export function SortingVisualizer() {
  const [algorithm, setAlgorithm] = useState<SortingAlgorithm>("bubble_sort");
  const [count, setCount] = useState(DEFAULT_NUMBERS.length);
  const [speed, setSpeed] = useState(320);
  const [initialNumbers, setInitialNumbers] = useState(DEFAULT_NUMBERS);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const accumulatedTimeRef = useRef(0);
  const playStartedAtRef = useRef<number | null>(null);

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;
  const displayedNumbers = currentStep?.array ?? initialNumbers;
  const isComplete = currentStep?.type === "done";
  const finalArray = isComplete ? currentStep.array : null;

  const pauseAnimation = useCallback(() => {
    if (playStartedAtRef.current !== null) {
      accumulatedTimeRef.current += performance.now() - playStartedAtRef.current;
      playStartedAtRef.current = null;
      setElapsedMs(accumulatedTimeRef.current);
    }
    setIsPlaying(false);
  }, []);

  const playAnimation = useCallback(() => {
    playStartedAtRef.current = performance.now();
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      if (playStartedAtRef.current !== null) {
        setElapsedMs(
          accumulatedTimeRef.current +
            performance.now() -
            playStartedAtRef.current,
        );
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (currentStepIndex >= steps.length - 1) {
      pauseAnimation();
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentStepIndex((index) => index + 1);
    }, speed);

    return () => window.clearTimeout(timer);
  }, [currentStepIndex, isPlaying, pauseAnimation, speed, steps.length]);

  const clearVisualization = useCallback(() => {
    playStartedAtRef.current = null;
    accumulatedTimeRef.current = 0;
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setElapsedMs(0);
  }, []);

  async function handleGenerate() {
    setError(null);
    setIsLoading(true);
    clearVisualization();

    try {
      const response = await generateRandomNumbers(count);
      setInitialNumbers(response.numbers);
    } catch {
      setError("Could not reach the backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStart() {
    setError(null);
    setIsLoading(true);
    clearVisualization();

    try {
      const response = await fetchSortingSteps(initialNumbers, algorithm);
      setSteps(response.steps);
      setCurrentStepIndex(0);

      if (response.steps.length > 1) {
        playAnimation();
      }
    } catch {
      setError("Could not load sorting steps from the backend.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleTogglePlayback() {
    if (isPlaying) {
      pauseAnimation();
    } else if (!isComplete) {
      playAnimation();
    }
  }

  function handleAlgorithmChange(nextAlgorithm: SortingAlgorithm) {
    setAlgorithm(nextAlgorithm);
    clearVisualization();
  }

  const status = isLoading
    ? "Loading"
    : isPlaying
      ? "Animating"
      : isComplete
        ? "Complete"
        : steps.length > 0
          ? "Paused"
          : "Ready";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Open source learning tool</p>
          <h1>Algorithm Visualizer</h1>
          <p className="subtitle">
            Watch each comparison, swap, and overwrite turn an unsorted array
            into an ordered one.
          </p>
        </div>
        <div className="status-pill" aria-live="polite">
          <span className="status-dot" />
          {status}
        </div>
      </header>

      <VisualizerControls
        algorithm={algorithm}
        count={count}
        speed={speed}
        isLoading={isLoading}
        isPlaying={isPlaying}
        hasSteps={steps.length > 0}
        isComplete={isComplete}
        onAlgorithmChange={handleAlgorithmChange}
        onCountChange={setCount}
        onSpeedChange={setSpeed}
        onGenerate={handleGenerate}
        onStart={handleStart}
        onTogglePlayback={handleTogglePlayback}
        onReset={clearVisualization}
      />

      {error ? <p className="error-message">{error}</p> : null}

      <div className="workspace-grid">
        <section className="visualizer-card">
          <div className="card-heading">
            <div>
              <h2>{ALGORITHM_LABELS[algorithm]}</h2>
              <p className="step-description" aria-live="polite">
                {currentStep?.description ?? "Generate a new array or start with the sample values."}
              </p>
            </div>
            <div className="legend" aria-label="Bar color legend">
              <span className="legend-item">
                <span className="legend-swatch bar-compare" /> Compare
              </span>
              <span className="legend-item">
                <span className="legend-swatch bar-swap" /> Swap
              </span>
              <span className="legend-item">
                <span className="legend-swatch bar-overwrite" /> Overwrite
              </span>
            </div>
          </div>
          <ArrayBars values={displayedNumbers} step={currentStep} />
        </section>

        <VisualizerStats
          algorithmName={ALGORITHM_LABELS[algorithm]}
          currentStep={currentStepIndex + 1}
          totalSteps={steps.length}
          elapsedMs={elapsedMs}
          finalArray={finalArray}
        />
      </div>
    </main>
  );
}
