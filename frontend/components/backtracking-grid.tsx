import { useState, type CSSProperties, type KeyboardEvent } from "react";

import { OverflowFrame } from "@/components/overflow-frame";
import type {
  BacktrackingAlgorithm,
  BacktrackingCell,
  BacktrackingStep,
  GridPosition,
} from "@/types/backtracking";

interface BacktrackingGridProps {
  algorithm: BacktrackingAlgorithm;
  grid: BacktrackingCell[][];
  step: BacktrackingStep | null;
  onCellClick?: (row: number, column: number) => void;
  editingDisabled?: boolean;
}

const cellClasses: Record<BacktrackingCell, string> = {
  empty: "border-slate-200 bg-white text-slate-400",
  wall: "border-slate-900 bg-slate-900 text-white",
  start: "border-emerald-500 bg-emerald-500 text-white",
  end: "border-rose-500 bg-rose-500 text-white",
  queen: "border-slate-950 bg-slate-950 text-white",
  attempt: "border-amber-400 bg-amber-100 text-amber-900",
  conflict: "border-rose-500 bg-rose-100 text-rose-700",
  visited: "border-sky-300 bg-sky-100 text-sky-800",
  path: "border-indigo-500 bg-indigo-500 text-white",
  backtracked: "border-violet-400 bg-violet-100 text-violet-800",
  solution: "border-emerald-500 bg-emerald-100 text-emerald-800",
};

const tokenLabels: Record<BacktrackingCell, string> = {
  empty: "",
  wall: "",
  start: "S",
  end: "E",
  queen: "Q",
  attempt: "",
  conflict: "!",
  visited: "",
  path: "",
  backtracked: "",
  solution: "",
};

/** Editable cells meet the 44px target size; display-only boards may be denser. */
const EDITABLE_CELL_SIZE = "2.75rem";
const DISPLAY_CELL_SIZE = "2rem";
const CELL_GAP = "0.25rem";

function positionKey(position: GridPosition) {
  return `${position[0]}:${position[1]}`;
}

function emptyCellClass(algorithm: BacktrackingAlgorithm, row: number, column: number) {
  if (algorithm !== "n_queens") return cellClasses.empty;
  return (row + column) % 2 === 0
    ? "border-slate-200 bg-slate-50 text-slate-400"
    : "border-slate-300 bg-slate-200 text-slate-500";
}

/**
 * Explicit tracks that never shrink below `cellSize`. The minimum width keeps the tracks inside
 * the grid box, so a large grid scrolls in its frame instead of overlapping its own cells.
 */
export function gridTrackStyle(columnCount: number, cellSize: string, gap = "0px", extraWidth = "0px"): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${columnCount}, minmax(${cellSize}, 1fr))`,
    minWidth: `calc(${columnCount} * ${cellSize} + ${Math.max(columnCount - 1, 0)} * ${gap} + ${extraWidth})`,
  };
}

function nextGridPosition(
  event: KeyboardEvent<HTMLElement>,
  [row, column]: GridPosition,
  rowCount: number,
  columnCount: number,
): GridPosition | null {
  if (event.altKey || event.metaKey || event.shiftKey) return null;
  switch (event.key) {
    case "ArrowUp":
      return [Math.max(row - 1, 0), column];
    case "ArrowDown":
      return [Math.min(row + 1, rowCount - 1), column];
    case "ArrowLeft":
      return [row, Math.max(column - 1, 0)];
    case "ArrowRight":
      return [row, Math.min(column + 1, columnCount - 1)];
    case "Home":
      return event.ctrlKey ? [0, 0] : [row, 0];
    case "End":
      return event.ctrlKey ? [rowCount - 1, columnCount - 1] : [row, columnCount - 1];
    default:
      return null;
  }
}

function cellPosition(element: EventTarget): GridPosition | null {
  if (!(element instanceof HTMLElement)) return null;
  const row = Number(element.dataset.gridRow);
  const column = Number(element.dataset.gridColumn);
  return Number.isInteger(row) && Number.isInteger(column) ? [row, column] : null;
}

/**
 * Roving focus for an editable grid: one cell is in the tab order, and the arrow keys, Home,
 * and End (with Ctrl for the whole grid) move focus between cells. Spread `cellProps` on each
 * focusable cell and pass `onKeyDown` to the grid element.
 */
export function useRovingGridFocus(rowCount: number, columnCount: number) {
  const [focusedCell, setFocusedCell] = useState<GridPosition>([0, 0]);
  const tabRow = Math.min(focusedCell[0], Math.max(rowCount - 1, 0));
  const tabColumn = Math.min(focusedCell[1], Math.max(columnCount - 1, 0));

  function cellProps(row: number, column: number) {
    return {
      "data-grid-row": row,
      "data-grid-column": column,
      tabIndex: row === tabRow && column === tabColumn ? 0 : -1,
      onFocus: () => setFocusedCell([row, column]),
    };
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const current = cellPosition(event.target);
    if (!current) return;
    const next = nextGridPosition(event, current, rowCount, columnCount);
    if (!next) return;
    event.preventDefault();
    event.currentTarget
      .querySelector<HTMLElement>(`[data-grid-row="${next[0]}"][data-grid-column="${next[1]}"]`)
      ?.focus();
  }

  return { cellProps, onKeyDown };
}

export function BacktrackingGrid({
  algorithm,
  grid,
  step,
  onCellClick,
  editingDisabled = false,
}: BacktrackingGridProps) {
  const columnCount = grid[0]?.length ?? 0;
  const roving = useRovingGridFocus(grid.length, columnCount);

  if (grid.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
        No grid cells to display.
      </div>
    );
  }

  const activeKey = step?.active_cell ? positionKey(step.active_cell) : null;
  const relatedKeys = new Set((step?.related_cells ?? []).map(positionKey));
  // Maze cells keep their editable size during playback, so the grid does not jump.
  const hasEditableLayout = onCellClick !== undefined;
  const isEditable = hasEditableLayout && !editingDisabled;
  const gridLabel = algorithm === "n_queens" ? "N-Queens board" : "Maze";

  return (
    <OverflowFrame
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
      focusable={!isEditable}
      label={gridLabel}
    >
      <div
        aria-label={gridLabel}
        className="mx-auto grid w-full max-w-[680px] gap-1"
        role={isEditable ? "grid" : "table"}
        style={gridTrackStyle(columnCount, hasEditableLayout ? EDITABLE_CELL_SIZE : DISPLAY_CELL_SIZE, CELL_GAP)}
        onKeyDown={isEditable ? roving.onKeyDown : undefined}
      >
        {grid.map((row, rowIndex) => (
          <div className="col-span-full grid grid-cols-subgrid" key={rowIndex} role="row">
            {row.map((cell, columnIndex) => {
              const key = `${rowIndex}:${columnIndex}`;
              const isActive = activeKey === key;
              const isRelated = relatedKeys.has(key);
              const stateClass =
                cell === "empty" ? emptyCellClass(algorithm, rowIndex, columnIndex) : cellClasses[cell];
              const focusClass = isActive
                ? "ring-4 ring-indigo-300 ring-offset-1"
                : isRelated
                  ? "ring-2 ring-amber-300 ring-offset-1"
                  : "";
              const label = tokenLabels[cell];
              const position = `Row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`;

              const cellClassName = `block aspect-square w-full rounded-md border text-center font-mono text-sm font-black leading-none shadow-sm transition ${stateClass} ${focusClass} ${isEditable ? "cursor-pointer hover:ring-2 hover:ring-indigo-300" : ""}`;

              if (isEditable) {
                return (
                  <div className="min-w-0" key={key} role="gridcell">
                    <button
                      {...roving.cellProps(rowIndex, columnIndex)}
                      aria-label={`Edit row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`}
                      className={cellClassName}
                      title={position}
                      type="button"
                      onClick={() => onCellClick(rowIndex, columnIndex)}
                    >
                      <span className="flex h-full w-full items-center justify-center">
                        {label}
                      </span>
                    </button>
                  </div>
                );
              }

              return (
                <div aria-label={position} className={`min-w-0 ${cellClassName}`} key={key} role="cell" title={position}>
                  <span className="flex h-full w-full items-center justify-center">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </OverflowFrame>
  );
}
