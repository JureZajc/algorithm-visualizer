"use client";

import { useEffect, useState } from "react";

import { BacktrackingGrid } from "@/components/backtracking-grid";
import { BacktrackingListVisualizer } from "@/components/backtracking-list-visualizer";
import { LearningPanel } from "@/components/learning-panel";
import { StepControls } from "@/components/step-controls";
import { SudokuGrid } from "@/components/sudoku-grid";
import { ActionRow, Button, ControlPanel, FormField, InlineMessage, inputClassName, SpeedField, type LegendItem } from "@/components/ui-primitives";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { VisualizerStats } from "@/components/visualizer-stats";
import { VisualizerWorkspace } from "@/components/visualizer-workspace";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useVisualizationRun } from "@/hooks/use-visualization-run";
import { fetchBacktrackingSteps } from "@/lib/api";
import {
  cloneSudokuBoard,
  createRequest,
  DEFAULT_FIELDS,
  formFieldsFromRequest,
  INITIAL_FORM,
  parseValueList,
  safeRequest,
  validateBacktrackingForm,
  type BacktrackingForm,
} from "@/lib/backtracking-input";
import {
  BACKTRACKING_PRESETS,
  DEFAULT_SUDOKU_BOARD,
  type BacktrackingPreset,
} from "@/lib/backtracking-presets";
import { backtrackingQuery, parseBacktrackingQuery, type QueryStateProps } from "@/lib/url-state";
import type { MetadataSourceProps } from "@/types/algorithm";
import {
  BACKTRACKING_ALGORITHM_LABELS,
  MAZE_PRESET_LABELS,
  type BacktrackingAlgorithm,
  type BacktrackingCell,
  type BacktrackingResult,
  type BacktrackingStep,
  type MazePreset,
  type MazeTool,
  type SudokuBoard,
  type SudokuCell,
  type SudokuRun,
} from "@/types/backtracking";

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

// The colors of BacktrackingGrid, SudokuGrid, and the list view. Board cells are tinted, so
// their swatches are soft; walls, queens, paths, and the active value are filled.
const ATTEMPT: LegendItem = { label: "Attempt", tone: "amber-soft" };
const BACKTRACK: LegendItem = { label: "Backtrack", tone: "violet-soft" };
const SOLUTION: LegendItem = { label: "Solution", tone: "emerald-soft" };
const LIST_LEGEND: LegendItem[] = [
  { label: "Active", tone: "indigo" },
  { label: "Chosen", tone: "emerald-soft" },
];
const LEGENDS: Record<BacktrackingAlgorithm, LegendItem[]> = {
  n_queens: [
    { label: "Queen", tone: "ink" },
    ATTEMPT,
    { label: "Conflict", tone: "rose-soft" },
    BACKTRACK,
    SOLUTION,
  ],
  maze_solver: [
    { label: "Wall", tone: "ink" },
    ATTEMPT,
    { label: "Visited", tone: "sky-soft" },
    { label: "Path", tone: "indigo" },
    BACKTRACK,
    SOLUTION,
  ],
  sudoku_solver: [
    { label: "Given", tone: "slate-soft" },
    { label: "Try", tone: "amber-soft" },
    { label: "Conflict", tone: "rose-soft" },
    BACKTRACK,
    SOLUTION,
  ],
  permutations: LIST_LEGEND,
  subsets: LIST_LEGEND,
};

function isListAlgorithm(algorithm: BacktrackingAlgorithm) {
  return algorithm === "permutations" || algorithm === "subsets";
}

function isSudokuAlgorithm(algorithm: BacktrackingAlgorithm) {
  return algorithm === "sudoku_solver";
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

  if (isSudokuAlgorithm(algorithm)) {
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

  if (algorithm === "sudoku_solver" && "conflicts" in result) {
    return result.solved ? "Solved puzzle" : "No solution";
  }

  const mazeResult = result as Extract<BacktrackingResult, { rows: number }>;
  return mazeResult.solved ? `${mazeResult.path.length} cells in path` : "No route";
}

export function BacktrackingVisualizer({ initialQuery, onQueryChange, ...props }: MetadataSourceProps & QueryStateProps) {
  const [restored] = useState(() => parseBacktrackingQuery(initialQuery));
  const [algorithm, setAlgorithm] = useState<BacktrackingAlgorithm>(restored.algorithm ?? "n_queens");
  const [form, setForm] = useState<BacktrackingForm>(restored.form ?? INITIAL_FORM);
  const [mazeGrid, setMazeGrid] = useState<BacktrackingCell[][]>(() => {
    if (restored.mazeGrid) return restored.mazeGrid;
    const request = safeRequest("maze_solver", restored.form ?? INITIAL_FORM);
    return createPreviewMazeGrid(request.rows ?? 7, request.cols ?? 7, request.preset ?? "classic");
  });
  const [mazeTool, setMazeTool] = useState<MazeTool>("wall");
  const [sudokuBoard, setSudokuBoard] = useState<SudokuBoard>(() =>
    cloneSudokuBoard(restored.sudokuBoard ?? DEFAULT_SUDOKU_BOARD),
  );
  const [presetId, setPresetId] = useState("");
  const [speed, setSpeed] = useState(420);
  const [controlMessage, setControlMessage] = useState<string | null>(null);
  const query = backtrackingQuery({ algorithm, form, mazeGrid, sudokuBoard });
  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);
  // Playback holds only the steps; run-level Sudoku data is kept here.
  const [sudokuRun, setSudokuRun] = useState<SudokuRun | null>(null);
  const run = useVisualizationRun();
  const playback = useLearningPlayback<BacktrackingStep>(speed, algorithm);
  const isLoading = run.isLoading;
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
  const grid = (currentStep?.grid ??
    (algorithm === "maze_solver" ? mazeGrid : createPreviewGrid(algorithm, form))) as BacktrackingCell[][];
  const result = describeResult(
    algorithm,
    currentStep?.result ?? null,
    playback.isComplete,
  );
  const formErrors = validateBacktrackingForm(
    algorithm,
    form,
    algorithm === "maze_solver" ? mazeGrid : undefined,
    algorithm === "sudoku_solver" ? sudokuBoard : undefined,
  );
  const hasValidationError = Object.keys(formErrors).length > 0;

  function resetForInputChange() {
    run.clearError();
    setControlMessage(null);
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
    } else if (next === "sudoku_solver") {
      setSudokuBoard(cloneSudokuBoard(DEFAULT_SUDOKU_BOARD));
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
    } else if (preset.algorithm === "sudoku_solver" && preset.request.board) {
      setSudokuBoard(cloneSudokuBoard(preset.request.board));
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
        setControlMessage("Start and End must be different cells.");
        return current;
      }
      if (mazeTool === "end" && currentCell === "start") {
        setControlMessage("Start and End must be different cells.");
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
      setControlMessage(null);
      run.clearError();
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

  function editSudokuCell(row: number, column: number, value: SudokuCell) {
    if (editingDisabled || algorithm !== "sudoku_solver") return;
    setSudokuBoard((current) => {
      const nextBoard = cloneSudokuBoard(current);
      nextBoard[row][column] = value;
      return nextBoard;
    });
    setPresetId("");
    resetForInputChange();
  }

  function resetSudokuPuzzle() {
    setSudokuBoard(cloneSudokuBoard(DEFAULT_SUDOKU_BOARD));
    setPresetId("");
    resetForInputChange();
  }

  function clearSudokuPuzzle() {
    setSudokuBoard(
      Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => "." as SudokuCell),
      ),
    );
    setPresetId("");
    resetForInputChange();
  }

  function startVisualization() {
    if (hasValidationError) return;

    return run.start({
      onStart: () => {
        setSudokuRun(null);
        playback.reset();
      },
      // Built inside the request, as before, so an input it rejects shows as the run's error.
      request: (signal) => fetchBacktrackingSteps(
        createRequest(
          algorithm,
          form,
          algorithm === "maze_solver" ? mazeGrid : undefined,
          algorithm === "sudoku_solver" ? sudokuBoard : undefined,
        ),
        signal,
      ),
      onSuccess: (response) => {
        const initialBoard = response.initial_board ?? null;
        const fixedCells = response.fixed_cells ?? null;
        setSudokuRun(
          initialBoard && fixedCells
            ? { initial_board: initialBoard, fixed_cells: fixedCells }
            : null,
        );
        playback.load(response.steps);
      },
      errorMessage: "Could not load backtracking steps.",
    });
  }

  const editingDisabled = playback.isPlaying || isLoading;

  const controls = (
    <ControlPanel className="md:grid-cols-2 xl:grid-cols-6" label="Backtracking controls">
      <FormField label="Backtracking algorithm" className="xl:col-span-2">
        <select
          className={inputClassName()}
          value={algorithm}
          disabled={editingDisabled}
          onChange={(event) => changeAlgorithm(event.target.value as BacktrackingAlgorithm)}
        >
          {Object.entries(BACKTRACKING_ALGORITHM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Sample preset" className="xl:col-span-2">
        <select
          className={inputClassName()}
          value={presetId}
          disabled={editingDisabled}
          onChange={(event) => loadPreset(event.target.value)}
        >
          <option value="" disabled>Choose a preset</option>
          {availablePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.label}</option>
          ))}
        </select>
      </FormField>

      <SpeedField className="xl:col-span-2" min={80} max={1200} step={20} value={speed} onChange={setSpeed} />

      <AlgorithmInputFields
        algorithm={algorithm}
        errors={formErrors}
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
          <div className="flex flex-wrap gap-2" role="group" aria-label="Maze editing tool">
            {MAZE_TOOLS.map((tool) => (
              <button
                aria-pressed={mazeTool === tool.id}
                className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${mazeTool === tool.id ? selectedToolClasses[tool.id] : toolClasses[tool.id]}`}
                disabled={editingDisabled}
                key={tool.id}
                type="button"
                onClick={() => setMazeTool(tool.id)}
              >
                {tool.label}
              </button>
            ))}
          </div>
          {controlMessage ? <InlineMessage tone="error">{controlMessage}</InlineMessage> : null}
          <ActionRow>
            <Button
              disabled={editingDisabled}
              onClick={resetMaze}
            >
              Reset maze
            </Button>
            <Button
              disabled={editingDisabled}
              variant="danger"
              onClick={clearWalls}
            >
              Clear walls
            </Button>
          </ActionRow>
        </div>
      ) : algorithm === "sudoku_solver" ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-6">
          <div className="flex flex-col gap-1">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
              Sudoku puzzle
            </p>
            <p className="m-0 text-sm leading-6 text-slate-600">
              Type digits into the board, or clear cells to leave them empty.
            </p>
          </div>
          <ActionRow>
            <Button
              disabled={editingDisabled}
              onClick={resetSudokuPuzzle}
            >
              Reset puzzle
            </Button>
            <Button
              disabled={editingDisabled}
              variant="danger"
              onClick={clearSudokuPuzzle}
            >
              Clear puzzle
            </Button>
          </ActionRow>
        </div>
      ) : null}

      {formErrors.form ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 md:col-span-2 xl:col-span-6">
          <InlineMessage tone="error">{formErrors.form}</InlineMessage>
        </div>
      ) : null}

      <ActionRow className="md:col-span-2 xl:col-span-6">
        <Button
          variant="primary"
          disabled={editingDisabled || hasValidationError}
          onClick={startVisualization}
        >
          {isLoading ? "Loading steps..." : "Start visualization"}
        </Button>
        <Button
          disabled={isLoading}
          onClick={playback.reset}
        >
          Reset run
        </Button>
      </ActionRow>

      <div className="md:col-span-2 xl:col-span-6">
        <StepControls
          currentStepIndex={playback.currentStepIndex}
          totalSteps={playback.steps.length}
          isLoading={isLoading}
          isPlaying={playback.isPlaying}
          learningBlocked={playback.learning.blocked}
          onTogglePlayback={playback.toggle}
          onPrevious={playback.previous}
          onNext={playback.next}
          onJumpToStart={playback.jumpToStart}
          onJumpToEnd={playback.jumpToEnd}
          onRestart={playback.restart}
          onSeek={playback.seek}
        />
      </div>
    </ControlPanel>
  );

  return (
    <VisualizerWorkspace
      algorithmId={algorithm}
      metadata={props}
      controls={controls}
      notices={<LearningPanel learning={playback.learning} isLoading={isLoading} />}
      error={run.error}
      visualization={
        <VisualizationPanel
          title={BACKTRACKING_ALGORITHM_LABELS[algorithm]}
          status={playbackStatus({
            hasError: run.error !== null,
            hasValidationError,
            isComplete: playback.isComplete,
            isLoading,
            isPlaying: playback.isPlaying,
            totalSteps: playback.steps.length,
          })}
          description={currentStep?.description ?? "Choose an input and start the backtracking visualization."}
          legend={LEGENDS[algorithm]}
          resultSummary={playback.isComplete ? <span>{result}</span> : null}
        >
          {isListAlgorithm(algorithm) ? (
            <BacktrackingListVisualizer
              algorithm={algorithm}
              values={listValues}
              steps={playback.steps}
              stepIndex={playback.currentStepIndex}
            />
          ) : algorithm === "sudoku_solver" ? (
            <SudokuGrid
              board={sudokuBoard}
              step={currentStep}
              run={sudokuRun}
              editingDisabled={editingDisabled || playback.steps.length > 0}
              onCellChange={editSudokuCell}
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
        </VisualizationPanel>
      }
      pseudocodeLine={currentStep?.pseudocode_line}
      stats={
        <VisualizerStats
          algorithmName={BACKTRACKING_ALGORITHM_LABELS[algorithm]}
          currentStep={playback.currentStepIndex + 1}
          totalSteps={playback.steps.length}
          elapsedMs={playback.elapsedMs}
          resultLabel="Backtracking result"
          result={result}
        />
      }
    />
  );
}

function AlgorithmInputFields({
  algorithm,
  errors,
  form,
  disabled,
  onChange,
}: {
  algorithm: BacktrackingAlgorithm;
  errors: Partial<Record<keyof BacktrackingForm | "form", string>>;
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
        error={errors.size}
        disabled={disabled}
        onChange={(value) => onChange("size", value)}
      />
    );
  }

  if (algorithm === "permutations" || algorithm === "subsets") {
    const messageId = "backtracking-values-validation";
    return (
      <FormField
        className="md:col-span-2 xl:col-span-3"
        error={errors.values}
        helperText={algorithm === "permutations" ? "Use 1 to 6 comma-separated values." : "Use 1 to 10 comma-separated values."}
        label="Comma-separated values"
        messageId={messageId}
      >
        <input
          aria-describedby={messageId}
          aria-invalid={errors.values !== undefined}
          className={inputClassName(errors.values !== undefined)}
          type="text"
          value={form.values}
          disabled={disabled}
          placeholder="A, B, C"
          onChange={(event) => onChange("values", event.target.value)}
        />
      </FormField>
    );
  }

  if (algorithm === "sudoku_solver") {
    return null;
  }

  return (
    <>
      <FormField label="Maze pattern">
        <select
          className={inputClassName()}
          value={form.preset}
          disabled={disabled}
          onChange={(event) => onChange("preset", event.target.value as MazePreset)}
        >
          {Object.entries(MAZE_PRESET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </FormField>
      <NumberField
        label="Rows"
        value={form.rows}
        min={2}
        max={15}
        error={errors.rows}
        disabled={disabled}
        onChange={(value) => onChange("rows", value)}
      />
      <NumberField
        label="Columns"
        value={form.cols}
        min={2}
        max={15}
        error={errors.cols}
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
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const messageId = `backtracking-${label.toLowerCase().replace(/\s+/g, "-")}-validation`;
  return (
    <FormField error={error} helperText={`Use ${min} to ${max}.`} label={label} messageId={messageId}>
      <input
        aria-describedby={messageId}
        aria-invalid={error !== undefined}
        className={inputClassName(error !== undefined)}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}
