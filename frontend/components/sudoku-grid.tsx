import { gridTrackStyle, useRovingGridFocus } from "@/components/backtracking-grid";
import { OverflowFrame } from "@/components/overflow-frame";
import type {
  BacktrackingStep,
  GridPosition,
  SudokuBoard,
  SudokuCell,
  SudokuResult,
  SudokuRun,
} from "@/types/backtracking";

interface SudokuGridProps {
  board: SudokuBoard;
  step: BacktrackingStep | null;
  /** Data shared by every step of the loaded run, used while a step is shown. */
  run?: SudokuRun | null;
  editingDisabled: boolean;
  onCellChange: (row: number, column: number, value: SudokuCell) => void;
}

const cellStateClasses = {
  editable: "bg-white text-slate-900 hover:bg-indigo-50",
  fixed: "bg-slate-100 text-slate-950",
  active: "bg-amber-100 text-amber-950 ring-4 ring-amber-300 ring-offset-1",
  conflict: "bg-rose-100 text-rose-800 ring-2 ring-rose-400 ring-offset-1",
  related: "bg-indigo-50 text-indigo-900",
  removed: "bg-violet-100 text-violet-800 ring-2 ring-violet-300 ring-offset-1",
  solved: "bg-emerald-50 text-emerald-800",
};

/** 44px editable cells; the board's 2px left border sits beside the tracks. */
const SUDOKU_TRACKS = gridTrackStyle(9, "2.75rem", "0px", "2px");

function positionKey(position: GridPosition) {
  return `${position[0]}:${position[1]}`;
}

function isSudokuResult(result: unknown): result is SudokuResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "tried_value" in result &&
    "conflicts" in result
  );
}

function givenCells(board: SudokuBoard): GridPosition[] {
  return board.flatMap((row, rowIndex) =>
    row.flatMap((cell, columnIndex) =>
      cell === "." ? [] : [[rowIndex, columnIndex] as GridPosition],
    ),
  );
}

function isSudokuBoard(grid: unknown): grid is SudokuBoard {
  return (
    Array.isArray(grid) &&
    grid.length === 9 &&
    grid.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 9 &&
        row.every((cell) => typeof cell === "string"),
    )
  );
}

function borderClass(row: number, column: number) {
  const right = column === 2 || column === 5 ? "border-r-2" : "border-r";
  const bottom = row === 2 || row === 5 ? "border-b-2" : "border-b";
  return `${right} ${bottom}`;
}

function normalizeSudokuInput(value: string): SudokuCell {
  const lastCharacter = value.trim().slice(-1);
  if (/^[1-9]$/.test(lastCharacter)) return lastCharacter as SudokuCell;
  return ".";
}

export function SudokuGrid({
  board,
  step,
  run = null,
  editingDisabled,
  onCellChange,
}: SudokuGridProps) {
  const result = isSudokuResult(step?.result) ? step.result : null;
  const displayBoard = isSudokuBoard(step?.grid) ? step.grid : board;
  const activeKey = step?.active_cell ? positionKey(step.active_cell) : null;
  const relatedKeys = new Set((step?.related_cells ?? []).map(positionKey));
  const conflictKeys = new Set((result?.conflicts ?? []).map(positionKey));
  const fixedKeys = new Set(
    (step && run ? run.fixed_cells : givenCells(board)).map(positionKey),
  );
  const isSolvedStep =
    step?.type === "solution_found" || (step?.type === "done" && result?.solved);
  const roving = useRovingGridFocus(9, 9);

  return (
    <OverflowFrame
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
      focusable={editingDisabled}
      label="Sudoku board"
    >
      <div
        aria-label="Sudoku board"
        className="mx-auto grid w-full max-w-[612px] border-l-2 border-t-2 border-slate-900 bg-slate-900"
        role={editingDisabled ? "table" : "grid"}
        style={SUDOKU_TRACKS}
        onKeyDown={editingDisabled ? undefined : roving.onKeyDown}
      >
        {displayBoard.map((row, rowIndex) => (
          <div className="col-span-full grid grid-cols-subgrid" key={rowIndex} role="row">
            {row.map((cell, columnIndex) => {
              const key = `${rowIndex}:${columnIndex}`;
              const isActive = activeKey === key;
              const isFixed = fixedKeys.has(key);
              const isConflict = conflictKeys.has(key);
              const isRelated = relatedKeys.has(key);
              const shownValue =
                isActive &&
                result?.tried_value &&
                (step?.type === "try" ||
                  step?.type === "dead_end" ||
                  step?.type === "remove")
                  ? result.tried_value
                  : cell;
              const stateClass = isConflict
                ? cellStateClasses.conflict
                : isActive && step?.type === "remove"
                  ? cellStateClasses.removed
                  : isActive
                    ? cellStateClasses.active
                    : isSolvedStep && cell !== "."
                      ? cellStateClasses.solved
                      : isFixed
                        ? cellStateClasses.fixed
                        : isRelated
                          ? cellStateClasses.related
                          : cellStateClasses.editable;

              return (
                <div className="min-w-0" key={key} role={editingDisabled ? "cell" : "gridcell"}>
                  <input
                    {...(editingDisabled ? {} : roving.cellProps(rowIndex, columnIndex))}
                    aria-label={`Sudoku row ${rowIndex + 1}, column ${columnIndex + 1}`}
                    className={`relative block aspect-square w-full min-w-0 border-slate-300 text-center font-mono text-lg font-black leading-none transition focus:z-10 focus:outline-none ${borderClass(rowIndex, columnIndex)} ${stateClass} ${editingDisabled ? "cursor-default" : "cursor-text"}`}
                    disabled={editingDisabled}
                    inputMode="numeric"
                    maxLength={1}
                    size={1}
                    title={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                    type="text"
                    value={shownValue === "." ? "" : shownValue}
                    onChange={(event) =>
                      onCellChange(
                        rowIndex,
                        columnIndex,
                        normalizeSudokuInput(event.target.value),
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </OverflowFrame>
  );
}
