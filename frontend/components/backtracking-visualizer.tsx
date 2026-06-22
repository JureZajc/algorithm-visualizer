"use client";

import { useState } from "react";

import { AlgorithmMetadataPanel } from "@/components/algorithm-metadata-panel";
import { BacktrackingGrid } from "@/components/backtracking-grid";
import { BacktrackingListVisualizer } from "@/components/backtracking-list-visualizer";
import { PseudocodePanel } from "@/components/pseudocode-panel";
import { ErrorMessage, VisualizerHeading } from "@/components/sorting-visualizer";
import { StepControls } from "@/components/step-controls";
import { VisualizerStats } from "@/components/visualizer-stats";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { fetchBacktrackingSteps } from "@/lib/api";
import {
  BACKTRACKING_PRESETS,
  type BacktrackingPreset,
} from "@/lib/backtracking-presets";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  BACKTRACKING_ALGORITHM_LABELS,
  MAZE_PRESET_LABELS,
  type BacktrackingAlgorithm,
  type BacktrackingCell,
  type BacktrackingRequest,
  type BacktrackingResult,
  type BacktrackingStep,
  type GridPosition,
  type MazePreset,
  type MazeTool,
} from "@/types/backtracking";

interface BacktrackingForm {
  size: string;
  rows: string;
  cols: string;
  preset: MazePreset;
  values: string;
}

const INITIAL_FORM: BacktrackingForm = {
  size: "4",
  rows: "7",
  cols: "7",
  preset: "classic",
  values: "A, B, C",
};

const DEFAULT_FIELDS: Record<
  BacktrackingAlgorithm,
  Partial<BacktrackingForm>
> = {
  n_queens: { size: "4" },
  maze_solver: { rows: "7", cols: "7", preset: "classic" },
  permutations: { values: "A, B, C" },
  subsets: { values: "A, B, C" },
};

const inputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0";

const MAZE_TOOLS: { id: MazeTool; label: string }[] = [
  { id: "empty", label: "Empty cell" },
  { id: "wall", label: "Wall" },
  { id: "start", label: "Start" },
  { id: "end", label: "End" },
];

const toolClasses: Record<MazeTool, string> = {
  empty: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  wall: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
  start: "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  end: "border-rose-500 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

const selectedToolClasses: Record<MazeTool, string> = {
  empty: "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200",
  wall: "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200",
  start: "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-100",
  end: "border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-100",
};

function parseInteger(rawValue: string, label: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return value;
}

function requireRange(value: number, label: string, minimum: number, maximum: number) {
  if (value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function parseValueList(rawValue: string, label: string, maximum: number) {
  const parts = rawValue.split(",").map((part) => part.trim());
  if (parts.length === 0 || parts.every((part) => part.length === 0)) {
    throw new Error(`${label} must include at least one value.`);
  }
  if (parts.some((part) => part.length === 0)) {
    throw new Error(`${label} must not include empty values.`);
  }
  if (parts.length > maximum) {
    throw new Error(`${label} can include at most ${maximum} values.`);
  }
  return parts;
}

function isListAlgorithm(algorithm: BacktrackingAlgorithm) {
  return algorithm === "permutations" || algorithm === "subsets";
}

function createRequest(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
  mazeGrid?: BacktrackingCell[][],
): BacktrackingRequest {
  if (algorithm === "n_queens") {
    return {
      algorithm,
      size: requireRange(parseInteger(form.size, "Board size"), "Board size", 1, 10),
    };
  }

  if (algorithm === "permutations") {
    return {
      algorithm,
      values: parseValueList(form.values, "Values", 6),
    };
  }

  if (algorithm === "subsets") {
    return {
      algorithm,
      values: parseValueList(form.values, "Values", 10),
    };
  }

  const request: BacktrackingRequest = {
    algorithm,
    rows: requireRange(parseInteger(form.rows, "Rows"), "Rows", 2, 15),
    cols: requireRange(parseInteger(form.cols, "Columns"), "Columns", 2, 15),
    preset: form.preset,
  };

  if (mazeGrid) {
    const validation = validateMazeGrid(mazeGrid);
    if (validation) throw new Error(validation);
    request.grid = mazeGrid.map((row) => row.slice());
    request.start = findCell(mazeGrid, "start") as GridPosition;
    request.end = findCell(mazeGrid, "end") as GridPosition;
  }

  return request;
}

function createDefaultRequest(algorithm: BacktrackingAlgorithm) {
  return createRequest(algorithm, {
    ...INITIAL_FORM,
    ...DEFAULT_FIELDS[algorithm],
  });
}

function safeRequest(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
) {
  try {
    return createRequest(algorithm, form);
  } catch {
    return createDefaultRequest(algorithm);
  }
}

function formFieldsFromRequest(
  request: Omit<BacktrackingRequest, "algorithm">,
): Partial<BacktrackingForm> {
  return {
    ...(request.size !== undefined ? { size: String(request.size) } : {}),
    ...(request.rows !== undefined ? { rows: String(request.rows) } : {}),
    ...(request.cols !== undefined ? { cols: String(request.cols) } : {}),
    ...(request.preset !== undefined ? { preset: request.preset } : {}),
    ...(request.values !== undefined ? { values: request.values.join(", ") } : {}),
  };
}

function createPreviewGrid(
  algorithm: BacktrackingAlgorithm,
  form: BacktrackingForm,
): BacktrackingCell[][] {
  const request = safeRequest(algorithm, form);

  if (algorithm === "n_queens") {
    const size = request.size ?? 4;
    return Array.from({ length: size }, () =>
      Array.from({ length: size }, () => "empty" as BacktrackingCell),
    );
  }

  if (isListAlgorithm(algorithm)) {
    return [];
  }

  return createPreviewMazeGrid(
    request.rows ?? 7,
    request.cols ?? 7,
    request.preset ?? "classic",
  );
}

function createPreviewMazeGrid(
  rows: number,
  cols: number,
  preset: MazePreset,
): BacktrackingCell[][] {
  const walls = createPreviewWalls(rows, cols, preset);
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, column) => {
      if (row === 0 && column === 0) return "start";
      if (row === rows - 1 && column === cols - 1) return "end";
      if (walls.has(`${row}:${column}`)) return "wall";
      return "empty";
    }),
  );
}

function findCell(
  grid: BacktrackingCell[][],
  target: BacktrackingCell,
): GridPosition | null {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].findIndex((cell) => cell === target);
    if (columnIndex !== -1) return [rowIndex, columnIndex];
  }
  return null;
}

function validateMazeGrid(grid: BacktrackingCell[][]) {
  const start = findCell(grid, "start");
  const end = findCell(grid, "end");

  if (!start) return "Place a Start cell before running Maze Solver.";
  if (!end) return "Place an End cell before running Maze Solver.";
  if (start[0] === end[0] && start[1] === end[1]) {
    return "Start and End must be different cells.";
  }
  return null;
}

function createPreviewWalls(rows: number, cols: number, preset: MazePreset) {
  const walls = new Set<string>();

  if (preset === "classic") {
    for (let row = 1; row < rows - 1; row += 2) {
      const gap = (row * 2 + Math.floor(cols / 3)) % cols;
      for (let column = 0; column < cols; column += 1) {
        if (column !== gap) walls.add(`${row}:${column}`);
      }
    }
  } else if (preset === "rooms") {
    const middleRow = Math.floor(rows / 2);
    const middleCol = Math.floor(cols / 2);
    for (let column = 0; column < cols; column += 1) {
      if (column !== 1 && column !== cols - 2) walls.add(`${middleRow}:${column}`);
    }
    for (let row = 0; row < rows; row += 1) {
      if (row !== 1 && row !== rows - 2) walls.add(`${row}:${middleCol}`);
    }
  }

  for (let column = 0; column < cols; column += 1) {
    walls.delete(`0:${column}`);
  }
  for (let row = 0; row < rows; row += 1) {
    walls.delete(`${row}:${cols - 1}`);
  }
  walls.delete("0:0");
  walls.delete(`${rows - 1}:${cols - 1}`);
  return walls;
}

function describeResult(
  algorithm: BacktrackingAlgorithm,
  result: BacktrackingResult | null,
  isComplete: boolean,
) {
  if (!isComplete || !result) return "Waiting for completion";

  if (algorithm === "n_queens") {
    const queenResult = result as Extract<BacktrackingResult, { size: number }>;
    return queenResult.solved
      ? `${queenResult.solution.length} queens placed`
      : "No solution";
  }

  if (algorithm === "permutations" && "count" in result) {
    return `${result.count} permutations`;
  }

  if (algorithm === "subsets" && "count" in result) {
    return `${result.count} subsets`;
  }

  const mazeResult = result as Extract<BacktrackingResult, { rows: number }>;
  return mazeResult.solved ? `${mazeResult.path.length} cells in path` : "No route";
}

export function BacktrackingVisualizer(props: MetadataSourceProps) {
  const [algorithm, setAlgorithm] = useState<BacktrackingAlgorithm>("n_queens");
  const [form, setForm] = useState<BacktrackingForm>(INITIAL_FORM);
  const [mazeGrid, setMazeGrid] = useState<BacktrackingCell[][]>(() =>
    createPreviewMazeGrid(7, 7, "classic"),
  );
  const [mazeTool, setMazeTool] = useState<MazeTool>("wall");
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(420);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playback = useStepPlayback<BacktrackingStep>(speed);
  const currentStep = playback.currentStep;
  const availablePresets = BACKTRACKING_PRESETS.filter(
    (preset) => preset.algorithm === algorithm,
  );
  const listValues = isListAlgorithm(algorithm)
    ? (() => {
        try {
          return parseValueList(form.values, "Values", algorithm === "permutations" ? 6 : 10);
        } catch {
          return [];
        }
      })()
    : [];
  const grid = currentStep?.grid ?? (algorithm === "maze_solver" ? mazeGrid : createPreviewGrid(algorithm, form));
  const result = describeResult(
    algorithm,
    currentStep?.result ?? null,
    playback.isComplete,
  );

  function resetForInputChange() {
    setError(null);
    playback.reset();
  }

  function createMazeGridFromForm(nextForm = form) {
    const request = safeRequest("maze_solver", nextForm);
    return createPreviewMazeGrid(
      request.rows ?? 7,
      request.cols ?? 7,
      request.preset ?? "classic",
    );
  }

  function changeAlgorithm(next: BacktrackingAlgorithm) {
    setAlgorithm(next);
    setForm((current) => ({ ...current, ...DEFAULT_FIELDS[next] }));
    if (next === "maze_solver") {
      setMazeGrid(createPreviewMazeGrid(7, 7, "classic"));
      setMazeTool("wall");
    }
    setPresetId("");
    resetForInputChange();
  }

  function updateField(field: keyof BacktrackingForm, value: string | MazePreset) {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (algorithm === "maze_solver" && ["rows", "cols", "preset"].includes(field)) {
        setMazeGrid(createMazeGridFromForm(nextForm));
      }
      return nextForm;
    });
    setPresetId("");
    resetForInputChange();
  }

  function loadPreset(nextId: string) {
    const preset: BacktrackingPreset | undefined = BACKTRACKING_PRESETS.find(
      (item) => item.id === nextId,
    );
    if (!preset) return;

    setAlgorithm(preset.algorithm);
    setForm((current) => ({
      ...current,
      ...formFieldsFromRequest(preset.request),
    }));
    if (preset.algorithm === "maze_solver") {
      setMazeGrid(
        createPreviewMazeGrid(
          preset.request.rows ?? 7,
          preset.request.cols ?? 7,
          preset.request.preset ?? "classic",
        ),
      );
      setMazeTool("wall");
    }
    setPresetId(preset.id);
    resetForInputChange();
  }

  function editMazeCell(row: number, column: number) {
    if (editingDisabled || algorithm !== "maze_solver") return;
    setMazeGrid((current) => {
      const currentCell = current[row]?.[column];
      if (!currentCell) return current;
      if (mazeTool === "start" && currentCell === "end") {
        setError("Start and End must be different cells.");
        return current;
      }
      if (mazeTool === "end" && currentCell === "start") {
        setError("Start and End must be different cells.");
        return current;
      }

      const nextGrid = current.map((gridRow) => gridRow.slice());
      if (mazeTool === "start") {
        for (const gridRow of nextGrid) {
          for (let columnIndex = 0; columnIndex < gridRow.length; columnIndex += 1) {
            if (gridRow[columnIndex] === "start") gridRow[columnIndex] = "empty";
          }
        }
      }
      if (mazeTool === "end") {
        for (const gridRow of nextGrid) {
          for (let columnIndex = 0; columnIndex < gridRow.length; columnIndex += 1) {
            if (gridRow[columnIndex] === "end") gridRow[columnIndex] = "empty";
          }
        }
      }

      nextGrid[row][column] = mazeTool;
      setError(null);
      playback.reset();
      return nextGrid;
    });
    setPresetId("");
  }

  function resetMaze() {
    setMazeGrid(createMazeGridFromForm());
    setMazeTool("wall");
    setPresetId("");
    resetForInputChange();
  }

  function clearWalls() {
    setMazeGrid((current) =>
      current.map((row) =>
        row.map((cell) => (cell === "wall" ? "empty" : cell)),
      ),
    );
    setPresetId("");
    resetForInputChange();
  }

  async function startVisualization() {
    setError(null);
    setIsLoading(true);
    playback.reset();
    try {
      const request = createRequest(
        algorithm,
        form,
        algorithm === "maze_solver" ? mazeGrid : undefined,
      );
      playback.load((await fetchBacktrackingSteps(request)).steps);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load backtracking steps.");
    } finally {
      setIsLoading(false);
    }
  }

  const editingDisabled = playback.isPlaying || isLoading;
  const legend =
    algorithm === "n_queens"
      ? ["Attempt", "Conflict", "Backtrack", "Solution"]
      : algorithm === "maze_solver"
        ? ["Wall", "Visited", "Path", "Backtrack", "Solution"]
        : ["Active", "Chosen", "Backtrack", "Solution"];

  return (
    <div>
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Backtracking algorithm
          <select
            className={inputClass}
            value={algorithm}
            disabled={editingDisabled}
            onChange={(event) => changeAlgorithm(event.target.value as BacktrackingAlgorithm)}
          >
            {Object.entries(BACKTRACKING_ALGORITHM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 xl:col-span-2">
          Sample preset
          <select
            className={inputClass}
            value={presetId}
            disabled={editingDisabled}
            onChange={(event) => loadPreset(event.target.value)}
          >
            <option value="" disabled>Choose a preset</option>
            {availablePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-3 text-xs font-bold text-slate-700 xl:col-span-2">
          <span className="flex justify-between gap-3">
            Animation speed
            <span className="font-mono text-indigo-600">{speed} ms</span>
          </span>
          <input
            className="w-full accent-indigo-600"
            type="range"
            min={80}
            max={1200}
            step={20}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
        </label>

        <AlgorithmInputFields
          algorithm={algorithm}
          form={form}
          disabled={editingDisabled}
          onChange={updateField}
        />

        {algorithm === "maze_solver" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-6">
            <div className="flex flex-col gap-1">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
                Maze editing tools
              </p>
              <p className="m-0 text-sm leading-6 text-slate-600">
                Choose a tool, then click cells to edit the maze.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MAZE_TOOLS.map((tool) => (
                <button
                  className={`min-h-10 rounded-xl border px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${mazeTool === tool.id ? selectedToolClasses[tool.id] : toolClasses[tool.id]}`}
                  disabled={editingDisabled}
                  key={tool.id}
                  type="button"
                  onClick={() => setMazeTool(tool.id)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                type="button"
                disabled={editingDisabled}
                onClick={resetMaze}
              >
                Reset maze
              </button>
              <button
                className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                type="button"
                disabled={editingDisabled}
                onClick={clearWalls}
              >
                Clear walls
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-6">
          <button
            className={`${buttonClass} bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700`}
            type="button"
            disabled={editingDisabled}
            onClick={startVisualization}
          >
            {isLoading ? "Loading steps..." : "Start visualization"}
          </button>
          <button
            className={`${buttonClass} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            type="button"
            disabled={isLoading}
            onClick={playback.reset}
          >
            Reset
          </button>
        </div>

        <div className="md:col-span-2 xl:col-span-6">
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

      {error ? <ErrorMessage message={error} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
          <VisualizerHeading
            title={BACKTRACKING_ALGORITHM_LABELS[algorithm]}
            description={currentStep?.description ?? "Choose an input and start the backtracking visualization."}
            legend={legend}
          />
          {isListAlgorithm(algorithm) ? (
            <BacktrackingListVisualizer
              algorithm={algorithm}
              values={listValues}
              step={currentStep}
            />
          ) : (
            <BacktrackingGrid
              algorithm={algorithm}
              grid={grid}
              step={currentStep}
              editingDisabled={editingDisabled || playback.steps.length > 0}
              onCellClick={algorithm === "maze_solver" ? editMazeCell : undefined}
            />
          )}
        </section>
        <div className="grid gap-5 self-start">
          <PseudocodePanel algorithmId={algorithm} algorithms={props.algorithms} currentLine={currentStep?.pseudocode_line ?? undefined} isLoading={props.isMetadataLoading} error={props.metadataError} />
          <VisualizerStats
            algorithmName={BACKTRACKING_ALGORITHM_LABELS[algorithm]}
            currentStep={playback.currentStepIndex + 1}
            totalSteps={playback.steps.length}
            elapsedMs={playback.elapsedMs}
            resultLabel="Backtracking result"
            result={result}
          />
        </div>
      </div>
    </div>
  );
}

function AlgorithmInputFields({
  algorithm,
  form,
  disabled,
  onChange,
}: {
  algorithm: BacktrackingAlgorithm;
  form: BacktrackingForm;
  disabled: boolean;
  onChange: (field: keyof BacktrackingForm, value: string | MazePreset) => void;
}) {
  if (algorithm === "n_queens") {
    return (
      <NumberField
        label="Board size"
        value={form.size}
        min={1}
        max={10}
        disabled={disabled}
        onChange={(value) => onChange("size", value)}
      />
    );
  }

  if (algorithm === "permutations" || algorithm === "subsets") {
    return (
      <label className="flex flex-col gap-2 text-xs font-bold text-slate-700 md:col-span-2 xl:col-span-3">
        Comma-separated values
        <input
          className={inputClass}
          type="text"
          value={form.values}
          disabled={disabled}
          placeholder="A, B, C"
          onChange={(event) => onChange("values", event.target.value)}
        />
      </label>
    );
  }

  return (
    <>
      <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
        Maze pattern
        <select
          className={inputClass}
          value={form.preset}
          disabled={disabled}
          onChange={(event) => onChange("preset", event.target.value as MazePreset)}
        >
          {Object.entries(MAZE_PRESET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <NumberField
        label="Rows"
        value={form.rows}
        min={2}
        max={15}
        disabled={disabled}
        onChange={(value) => onChange("rows", value)}
      />
      <NumberField
        label="Columns"
        value={form.cols}
        min={2}
        max={15}
        disabled={disabled}
        onChange={(value) => onChange("cols", value)}
      />
    </>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-bold text-slate-700">
      {label}
      <input
        className={inputClass}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
