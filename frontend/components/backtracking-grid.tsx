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

function positionKey(position: GridPosition) {
  return `${position[0]}:${position[1]}`;
}

function emptyCellClass(algorithm: BacktrackingAlgorithm, row: number, column: number) {
  if (algorithm !== "n_queens") return cellClasses.empty;
  return (row + column) % 2 === 0
    ? "border-slate-200 bg-slate-50 text-slate-400"
    : "border-slate-300 bg-slate-200 text-slate-500";
}

export function BacktrackingGrid({
  algorithm,
  grid,
  step,
  onCellClick,
  editingDisabled = false,
}: BacktrackingGridProps) {
  if (grid.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
        No grid cells to display.
      </div>
    );
  }

  const columnCount = grid[0]?.length ?? 0;
  const activeKey = step?.active_cell ? positionKey(step.active_cell) : null;
  const relatedKeys = new Set((step?.related_cells ?? []).map(positionKey));
  const isEditable = onCellClick !== undefined && !editingDisabled;

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div
        className="mx-auto grid min-w-[280px] max-w-[680px] gap-1"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, columnIndex) => {
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

            const cellClassName = `aspect-square min-h-8 min-w-8 rounded-md border text-center font-mono text-sm font-black leading-none shadow-sm transition sm:min-h-10 sm:min-w-10 ${stateClass} ${focusClass} ${isEditable ? "cursor-pointer hover:ring-2 hover:ring-indigo-300" : ""}`;

            if (isEditable) {
              return (
                <button
                  aria-label={`Edit row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`}
                  className={cellClassName}
                  key={key}
                  title={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`}
                  type="button"
                  onClick={() => onCellClick(rowIndex, columnIndex)}
                >
                  <span className="flex h-full w-full items-center justify-center">
                    {label}
                  </span>
                </button>
              );
            }

            return (
              <div
                aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`}
                className={cellClassName}
                key={key}
                title={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${cell}`}
              >
                <span className="flex h-full w-full items-center justify-center">
                  {label}
                </span>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
