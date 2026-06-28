"use client";

import { useState } from "react";

import { ArrayBars } from "@/components/array-bars";
import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage, VisualizerHeading } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchSearchingSteps, generateRandomNumbers } from "@/lib/api";
import { SEARCHING_PRESETS } from "@/lib/array-presets";
import type { ArrayAlgorithmStep, MetadataSourceProps } from "@/types/algorithm";
import { SEARCHING_ALGORITHM_LABELS, type SearchingAlgorithm } from "@/types/searching";

const DEFAULT_NUMBERS = [8, 14, 23, 31, 42, 56, 67, 75, 83, 91];
const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

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

  function normalizeCount() {
    const parsed = Number.parseInt(countDraft, 10);
    const normalized = Number.isNaN(parsed) ? count : Math.min(40, Math.max(5, parsed));
    setCount(normalized);
    setCountDraft(String(normalized));
    if (normalized !== numbers.length) setPresetId("");
    return normalized;
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
      const target = Number(targetInput);
      if (!Number.isInteger(target)) {
        throw new Error("Enter an integer target value.");
      }
      let next = numbers;
      if (next.length !== numberCount) {
        next = (await generateRandomNumbers(numberCount)).numbers;
        setPresetId("");
      }
      if (algorithm === "binary_search") next = [...next].sort((a, b) => a - b);
      setNumbers(next);
      playback.load((await fetchSearchingSteps(next, algorithm, target)).steps);
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
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Searching algorithm
          <select className={inputClass} value={algorithm} disabled={playback.isPlaying || isLoading} onChange={(event) => changeAlgorithm(event.target.value as SearchingAlgorithm)}>
            {Object.entries(SEARCHING_ALGORITHM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Sample preset
          <select className={inputClass} value={presetId} disabled={playback.isPlaying || isLoading} onChange={(event) => loadPreset(event.target.value)}>
            <option value="" disabled>Choose a preset</option>
            {SEARCHING_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Target value
          <input className={inputClass} type="number" value={targetInput} disabled={playback.isPlaying || isLoading} onChange={(event) => { setTargetInput(event.target.value); setPresetId(""); playback.reset(); }} />
        </label>
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
          Random values
          <input className={inputClass} type="number" min={5} max={40} value={countDraft} disabled={playback.isPlaying || isLoading} onBlur={normalizeCount} onChange={(event) => setCountDraft(event.target.value)} />
        </label>
        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700">
          <span className="flex justify-between"><span>Animation speed</span><span className="font-mono text-indigo-600">{speed} ms</span></span>
          <input className="w-full accent-indigo-600" type="range" min={80} max={1000} step={20} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
          <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={playback.isPlaying || isLoading} onClick={() => generate(normalizeCount())}>Generate numbers</button>
          <button className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`} type="button" disabled={playback.isPlaying || isLoading} onClick={() => start(normalizeCount())}>{isLoading ? "Loading steps..." : "Start visualization"}</button>
          <button className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} type="button" disabled={isLoading} onClick={playback.reset}>Reset</button>
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
            onSeek={playback.seek}
          />
        </div>
      </section>

      <AlgorithmMetadataPanel algorithmId={algorithm} algorithms={props.algorithms} isLoading={props.isMetadataLoading} error={props.metadataError} />

      {algorithm === "binary_search" ? <p className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">Binary Search uses an ascending copy of the generated values.</p> : null}
      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          <VisualizerHeading title={SEARCHING_ALGORITHM_LABELS[algorithm]} description={currentStep?.description ?? "Choose a target and start the search."} legend={["Inspect", "Found"]} />
          <ArrayBars values={currentStep?.array ?? numbers} step={outcomeStep} />
        </section>
        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats algorithmName={SEARCHING_ALGORITHM_LABELS[algorithm]} currentStep={playback.currentStepIndex + 1} totalSteps={playback.steps.length} elapsedMs={playback.elapsedMs} resultLabel="Search result" result={result} />
        </div>
      </div>
    </div>
  );
}
