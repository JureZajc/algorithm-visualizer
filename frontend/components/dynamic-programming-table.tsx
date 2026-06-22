import type {
  DynamicProgrammingCell,
  DynamicProgrammingStep,
  TablePosition,
} from "@/types/dynamic-programming";

interface DynamicProgrammingTableProps {
  table: DynamicProgrammingCell[][];
  step: DynamicProgrammingStep | null;
  rowLabels: string[];
  columnLabels: string[];
  variant?: "standard" | "compact";
}

function positionKey(position: TablePosition) {
  return `${position[0]}:${position[1]}`;
}

export function DynamicProgrammingTable({
  table,
  step,
  rowLabels,
  columnLabels,
  variant = "standard",
}: DynamicProgrammingTableProps) {
  if (table.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
        No table cells to display.
      </div>
    );
  }

  const activeKey = step?.active_cell ? positionKey(step.active_cell) : null;
  const relatedKeys = new Set((step?.related_cells ?? []).map(positionKey));

  if (variant === "compact") {
    return (
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {table.map((row, rowIndex) => (
          <div
            className="grid gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-center"
            key={rowIndex}
          >
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600">
              {rowLabels[rowIndex] ?? `Row ${rowIndex}`}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {row.map((cell, columnIndex) => {
                const key = `${rowIndex}:${columnIndex}`;
                const isActive = activeKey === key;
                const isRelated = relatedKeys.has(key);
                const stateClass = isActive
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : isRelated
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-800";

                return (
                  <div
                    className={`min-h-12 min-w-0 rounded-lg border px-2 py-2 text-center font-mono text-[clamp(0.72rem,1.2vw,0.95rem)] font-bold transition ${stateClass}`}
                    key={key}
                    title={`${columnLabels[columnIndex] ?? `Column ${columnIndex}`}: ${cell}`}
                  >
                    <span className="block whitespace-nowrap">{cell}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <table className="min-w-full border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 min-w-20 rounded-lg bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
              State
            </th>
            {columnLabels.map((label, index) => (
              <th
                className="sticky top-0 z-10 min-w-12 rounded-lg bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600"
                key={`${label}-${index}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th className="sticky left-0 z-10 max-w-32 rounded-lg bg-slate-100 px-3 py-2 text-left text-xs font-extrabold text-slate-600">
                {rowLabels[rowIndex] ?? `Row ${rowIndex}`}
              </th>
              {row.map((cell, columnIndex) => {
                const key = `${rowIndex}:${columnIndex}`;
                const isActive = activeKey === key;
                const isRelated = relatedKeys.has(key);
                const stateClass = isActive
                  ? "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : isRelated
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-800";

                return (
                  <td
                    className={`h-12 min-w-12 rounded-lg border px-3 py-2 font-mono text-sm font-bold transition ${stateClass}`}
                    key={key}
                    title={`Row ${rowIndex}, column ${columnIndex}: ${cell}`}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
