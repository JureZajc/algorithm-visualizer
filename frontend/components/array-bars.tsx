import type { AlgorithmStep, StepType } from "@/types/sorting";

interface ArrayBarsProps {
  values: number[];
  step: AlgorithmStep | null;
}

const ACTIVE_CLASS: Record<StepType, string> = {
  compare: "bar-compare",
  swap: "bar-swap",
  overwrite: "bar-overwrite",
  partition: "bar-partition",
  merge: "bar-merge",
  done: "bar-done",
};

export function ArrayBars({ values, step }: ArrayBarsProps) {
  const largestValue = Math.max(...values.map((value) => Math.abs(value)), 1);
  const activeIndices = new Set(step?.indices ?? []);
  const highlightAll = step?.type === "done";

  return (
    <div className="chart" aria-label="Array visualization">
      {values.map((value, index) => {
        const isActive = highlightAll || activeIndices.has(index);
        const height = 8 + (Math.abs(value) / largestValue) * 82;
        const activeClass = isActive && step ? ACTIVE_CLASS[step.type] : "";

        return (
          <div className="bar-column" key={index}>
            <span className="bar-value">{value}</span>
            <div
              className={`bar ${isActive ? "bar-active" : ""} ${activeClass}`}
              style={{ height: `${height}%` }}
              title={`Index ${index}: ${value}`}
            />
          </div>
        );
      })}
    </div>
  );
}
