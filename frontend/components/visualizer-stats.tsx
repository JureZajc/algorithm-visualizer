import type { ReactNode } from "react";

import { PanelHeader, panelClassName, ValueLabel } from "@/components/ui-primitives";

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
      className={panelClassName("default", "self-start overflow-hidden")}
      aria-label="Visualization statistics"
    >
      <PanelHeader eyebrow="Run details" title="Stats and result" />
      <div className="sm:grid sm:grid-cols-2 lg:block">
        <Stat label="Algorithm">{props.algorithmName}</Stat>
        <Stat label="Progress">{props.currentStep} / {props.totalSteps}</Stat>
        <Stat label="Elapsed time">{(props.elapsedMs / 1000).toFixed(1)} s</Stat>
        <Stat label={props.resultLabel}>{props.result}</Stat>
        {props.children}
      </div>
    </aside>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-slate-100 p-5 last:border-b-0 sm:odd:border-r lg:odd:border-r-0">
      <ValueLabel>{label}</ValueLabel>
      <div className="break-words text-sm font-bold leading-6 text-slate-800">{children}</div>
    </div>
  );
}
