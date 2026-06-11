import { useState } from "react";

import {
  ALGORITHM_LABELS,
  type SortingAlgorithm,
} from "@/types/sorting";

interface VisualizerControlsProps {
  algorithm: SortingAlgorithm;
  count: number;
  speed: number;
  isLoading: boolean;
  isPlaying: boolean;
  hasSteps: boolean;
  isComplete: boolean;
  onAlgorithmChange: (algorithm: SortingAlgorithm) => void;
  onCountChange: (count: number) => void;
  onSpeedChange: (speed: number) => void;
  onGenerate: (count: number) => void;
  onStart: (count: number) => void;
  onTogglePlayback: () => void;
  onReset: () => void;
}

export function VisualizerControls({
  algorithm,
  count,
  speed,
  isLoading,
  isPlaying,
  hasSteps,
  isComplete,
  onAlgorithmChange,
  onCountChange,
  onSpeedChange,
  onGenerate,
  onStart,
  onTogglePlayback,
  onReset,
}: VisualizerControlsProps) {
  const [countDraft, setCountDraft] = useState(String(count));

  function normalizeCount(): number {
    const parsedCount = Number.parseInt(countDraft, 10);
    const normalizedCount = Number.isNaN(parsedCount)
      ? count
      : Math.min(50, Math.max(5, parsedCount));

    setCountDraft(String(normalizedCount));
    onCountChange(normalizedCount);
    return normalizedCount;
  }

  return (
    <section className="control-panel" aria-label="Visualization controls">
      <div className="field">
        <label htmlFor="algorithm">Sorting algorithm</label>
        <select
          id="algorithm"
          value={algorithm}
          disabled={isPlaying || isLoading}
          onChange={(event) =>
            onAlgorithmChange(event.target.value as SortingAlgorithm)
          }
        >
          {Object.entries(ALGORITHM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="count">Random values</label>
        <input
          id="count"
          type="number"
          min={5}
          max={50}
          value={countDraft}
          disabled={isPlaying || isLoading}
          onBlur={normalizeCount}
          onChange={(event) => setCountDraft(event.target.value)}
        />
      </div>

      <div className="field field-speed">
        <div className="speed-header">
          <label htmlFor="speed">Animation speed</label>
          <span className="speed-value">{speed} ms</span>
        </div>
        <input
          id="speed"
          className="range-input"
          type="range"
          min={80}
          max={1000}
          step={20}
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
        />
      </div>

      <div className="button-row">
        <button
          className="button button-secondary"
          type="button"
          disabled={isPlaying || isLoading}
          onClick={() => onGenerate(normalizeCount())}
        >
          Generate numbers
        </button>
        <button
          className="button button-primary"
          type="button"
          disabled={isPlaying || isLoading}
          onClick={() => onStart(normalizeCount())}
        >
          {isLoading ? "Loading steps..." : "Start visualization"}
        </button>
        <button
          className="button button-quiet"
          type="button"
          disabled={!hasSteps || isLoading || isComplete}
          onClick={onTogglePlayback}
        >
          {isPlaying ? "Pause" : "Resume"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={isLoading}
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
