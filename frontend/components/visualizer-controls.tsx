import { useState } from "react";

import type { SortingPreset } from "@/lib/array-presets";
import { ALGORITHM_LABELS, type SortingAlgorithm } from "@/types/sorting";

interface VisualizerControlsProps {
  algorithm: SortingAlgorithm;
  count: number;
  speed: number;
  isLoading: boolean;
  isPlaying: boolean;
  hasSteps: boolean;
  isComplete: boolean;
  presetId: string;
  presets: SortingPreset[];
  onAlgorithmChange: (algorithm: SortingAlgorithm) => void;
  onCountChange: (count: number) => void;
  onSpeedChange: (speed: number) => void;
  onGenerate: (count: number) => void;
  onStart: (count: number) => void;
  onTogglePlayback: () => void;
  onReset: () => void;
  onPresetChange: (presetId: string) => void;
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass =
  "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

export function VisualizerControls(props: VisualizerControlsProps) {
  const [countDraft, setCountDraft] = useState(String(props.count));

  function normalizeCount(): number {
    const parsedCount = Number.parseInt(countDraft, 10);
    const normalizedCount = Number.isNaN(parsedCount)
      ? props.count
      : Math.min(50, Math.max(5, parsedCount));
    setCountDraft(String(normalizedCount));
    props.onCountChange(normalizedCount);
    return normalizedCount;
  }

  return (
    <section
      className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur md:grid-cols-2 xl:grid-cols-4"
      aria-label="Sorting visualization controls"
    >
      <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
        Sorting algorithm
        <select
          className={inputClass}
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
      </label>

      <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
        Sample preset
        <select
          className={inputClass}
          value={props.presetId}
          disabled={props.isPlaying || props.isLoading}
          onChange={(event) => props.onPresetChange(event.target.value)}
        >
          <option value="" disabled>Choose a preset</option>
          {props.presets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
        Random values
        <input
          className={inputClass}
          type="number"
          min={5}
          max={50}
          value={countDraft}
          disabled={props.isPlaying || props.isLoading}
          onBlur={normalizeCount}
          onChange={(event) => setCountDraft(event.target.value)}
        />
      </label>

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
        <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={props.isPlaying || props.isLoading} onClick={() => props.onGenerate(normalizeCount())}>
          Generate numbers
        </button>
        <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={props.isPlaying || props.isLoading} onClick={() => props.onStart(normalizeCount())}>
          {props.isLoading ? "Loading steps..." : "Start visualization"}
        </button>
        <button className={`${buttonClass} bg-indigo-50 text-indigo-700 hover:bg-indigo-100`} type="button" disabled={!props.hasSteps || props.isLoading || props.isComplete} onClick={props.onTogglePlayback}>
          {props.isPlaying ? "Pause" : "Resume"}
        </button>
        <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={props.isLoading} onClick={props.onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
