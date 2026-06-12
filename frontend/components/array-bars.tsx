import type { ArrayAlgorithmStep, ArrayStepType } from "@/types/algorithm";

interface ArrayBarsProps {
  values: number[];
  step: ArrayAlgorithmStep | null;
}

const ACTIVE_CLASS: Record<ArrayStepType, string> = {
  compare: "bg-amber-400 shadow-amber-200",
  swap: "bg-rose-500 shadow-rose-200",
  overwrite: "bg-violet-500 shadow-violet-200",
  partition: "bg-sky-500 shadow-sky-200",
  merge: "bg-emerald-500 shadow-emerald-200",
  heapify: "bg-pink-500 shadow-pink-200",
  found: "bg-emerald-500 shadow-emerald-200",
  not_found: "bg-slate-400 shadow-slate-200",
  done: "bg-emerald-500 shadow-emerald-200",
};

export function ArrayBars({ values, step }: ArrayBarsProps) {
  const largestValue = Math.max(...values.map((value) => Math.abs(value)), 1);
  const activeIndices = new Set(step?.indices ?? []);
  const highlightAll = step?.type === "done";

  return (
    <div
      className="flex h-[390px] items-end gap-[clamp(3px,0.75vw,10px)] overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(to_top,rgba(99,102,241,0.055)_1px,transparent_1px)] bg-[length:100%_25%] px-4 pb-4 pt-8 sm:h-[420px]"
      aria-label="Array visualization"
    >
      {values.map((value, index) => {
        const isActive = highlightAll || activeIndices.has(index);
        const height = 8 + (Math.abs(value) / largestValue) * 82;
        const activeClass = isActive && step ? ACTIVE_CLASS[step.type] : "";
        const barClass = isActive
          ? `-translate-y-1 shadow-lg ${activeClass}`
          : "bg-indigo-500";

        return (
          <div
            className="flex h-full min-w-[3px] flex-1 flex-col items-center justify-end gap-1.5"
            key={index}
          >
            <span className="hidden font-mono text-[clamp(0.55rem,1vw,0.72rem)] text-slate-600 sm:block">
              {value}
            </span>
            <div
              className={`min-h-1.5 w-full max-w-11 rounded-t-lg shadow-inner transition-all duration-150 ${barClass}`}
              style={{ height: `${height}%` }}
              title={`Index ${index}: ${value}`}
            />
          </div>
        );
      })}
    </div>
  );
}
