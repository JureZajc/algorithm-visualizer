import type { ReactNode } from "react";

import type {
  BacktrackingAlgorithm,
  PermutationsResult,
  BacktrackingStep,
  ListBacktrackingState,
  SubsetsResult,
} from "@/types/backtracking";

interface BacktrackingListVisualizerProps {
  algorithm: BacktrackingAlgorithm;
  values: string[];
  step: BacktrackingStep | null;
}

const chipClasses = {
  base: "rounded-xl border px-3 py-2 text-sm font-bold transition",
  inactive: "border-slate-200 bg-white text-slate-700",
  active: "border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-100",
  used: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

function isListState(result: unknown): result is ListBacktrackingState {
  return (
    typeof result === "object" &&
    result !== null &&
    "partial" in result &&
    "generated_count" in result
  );
}

function isPermutationsResult(result: unknown): result is PermutationsResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "permutations" in result &&
    "count" in result
  );
}

function isSubsetsResult(result: unknown): result is SubsetsResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "subsets" in result &&
    "count" in result
  );
}

function formatResult(items: string[]) {
  return items.length ? items.join(", ") : "empty set";
}

export function BacktrackingListVisualizer({
  algorithm,
  values,
  step,
}: BacktrackingListVisualizerProps) {
  const state = isListState(step?.result) ? step.result : null;
  const finalPermutations = isPermutationsResult(step?.result)
    ? step.result.permutations
    : null;
  const finalSubsets = isSubsetsResult(step?.result) ? step.result.subsets : null;
  const finalValues =
    isPermutationsResult(step?.result) || isSubsetsResult(step?.result)
      ? step.result.values
      : null;
  const displayValues = state?.values ?? finalValues ?? values;
  const partial = state?.partial ?? [];
  const generated = state?.generated ?? finalPermutations ?? finalSubsets ?? [];
  const activeIndex = state?.active_index ?? null;
  const activeItem = state?.active_item ?? null;
  const used = state?.used ?? [];
  const depth = state?.depth ?? 0;
  const decision = state?.decision;
  const partialLabel =
    algorithm === "permutations" ? "Current permutation" : "Current subset";

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <section>
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
          Input values
        </h3>
        <div className="flex flex-wrap gap-2">
          {displayValues.map((value, index) => {
            const isActive = activeIndex === index;
            const isUsed = used[index] === true;
            const stateClass = isActive
              ? chipClasses.active
              : isUsed
                ? chipClasses.used
                : chipClasses.inactive;
            return (
              <span className={`${chipClasses.base} ${stateClass}`} key={`${value}-${index}`}>
                {value}
              </span>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Depth">{depth}</Metric>
        <Metric label="Active item">{activeItem ?? "None"}</Metric>
        <Metric label="Generated">{state?.generated_count ?? 0}</Metric>
      </div>

      {decision ? (
        <p className="m-0 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">
          Decision: {decision}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
          {partialLabel}
        </h3>
        <div className="flex min-h-12 flex-wrap gap-2 rounded-xl bg-slate-50 p-3">
          {partial.length ? (
            partial.map((item, index) => (
              <span
                className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white"
                key={`${item}-${index}`}
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-sm font-medium text-slate-500">
              No values chosen yet
            </span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
          Generated results
        </h3>
        <div className="max-h-56 overflow-auto rounded-xl bg-slate-50 p-3">
          {generated.length ? (
            <ol className="m-0 grid gap-2 p-0">
              {generated.slice(-24).map((items, index) => (
                <li
                  className="list-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-700"
                  key={`${items.join("|")}-${index}`}
                >
                  {formatResult(items)}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-sm font-medium text-slate-500">
              No completed results yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-[0.09em] text-slate-500">
        {label}
      </span>
      <span className="font-mono text-sm font-bold text-slate-900">{children}</span>
    </div>
  );
}
