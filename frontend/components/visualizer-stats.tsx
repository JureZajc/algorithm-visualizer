import type { ReactNode } from "react";

interface VisualizerStatsProps {
  algorithmName: string;
  currentStep: number;
  totalSteps: number;
  elapsedMs: number;
  resultLabel: string;
  result: ReactNode;
  children?: ReactNode;
}

export function VisualizerStats(props: VisualizerStatsProps) {
  return (
    <aside
      className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:grid sm:grid-cols-2 lg:block"
      aria-label="Visualization statistics"
    >
      <Stat label="Algorithm">{props.algorithmName}</Stat>
      <Stat label="Progress">{props.currentStep} / {props.totalSteps}</Stat>
      <Stat label="Elapsed time">{(props.elapsedMs / 1000).toFixed(1)} s</Stat>
      <Stat label={props.resultLabel}>{props.result}</Stat>
      {props.children}
    </aside>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 p-5 last:border-b-0 sm:odd:border-r lg:odd:border-r-0">
      <span className="mb-1.5 block text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <div className="break-words text-sm font-bold leading-6 text-slate-800">{children}</div>
    </div>
  );
}
