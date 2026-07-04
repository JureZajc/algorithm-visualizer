import type { ReactNode } from "react";

import { Legend, Panel, StatusBadge } from "@/components/ui-primitives";

export type VisualizerStatus = "idle" | "loading" | "running" | "paused" | "complete" | "invalid" | "error";

const statusLabels: Record<VisualizerStatus, string> = {
  idle: "Ready",
  loading: "Loading",
  running: "Running",
  paused: "Paused",
  complete: "Complete",
  invalid: "Needs input",
  error: "Error",
};

export function playbackStatus({
  hasError = false,
  hasValidationError = false,
  isComplete,
  isLoading,
  isPlaying,
  totalSteps,
}: {
  hasError?: boolean;
  hasValidationError?: boolean;
  isComplete: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  totalSteps: number;
}): VisualizerStatus {
  if (hasError) return "error";
  if (hasValidationError) return "invalid";
  if (isLoading) return "loading";
  if (isPlaying) return "running";
  if (isComplete) return "complete";
  if (totalSteps > 0) return "paused";
  return "idle";
}

export function VisualizationPanel({
  children,
  className,
  description,
  legend,
  resultSummary,
  status,
  statusLabel,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  legend?: string[];
  resultSummary?: ReactNode;
  status: VisualizerStatus;
  statusLabel?: string;
  title: string;
}) {
  return (
    <Panel className={className ?? "min-w-0 p-5"} variant="visualization">
      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-extrabold tracking-normal text-slate-900">{title}</h2>
            <StatusBadge label={statusLabel ?? statusLabels[status]} variant={status} />
          </div>
          <p className="m-0 min-h-6 text-sm leading-6 text-slate-500" aria-live="polite">{description}</p>
          {resultSummary ? (
            <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800" aria-live="polite">
              {resultSummary}
            </div>
          ) : null}
        </div>
        {legend?.length ? <Legend items={legend} /> : null}
      </div>
      {children}
    </Panel>
  );
}
