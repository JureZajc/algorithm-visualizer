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
  onGenerate: () => void;
  onStart: () => void;
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
          value={count}
          disabled={isPlaying || isLoading}
          onChange={(event) =>
            onCountChange(Math.min(50, Math.max(5, Number(event.target.value))))
          }
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
          onClick={onGenerate}
        >
          Generate numbers
        </button>
        <button
          className="button button-primary"
          type="button"
          disabled={isPlaying || isLoading}
          onClick={onStart}
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
