import { useId, type ReactNode } from "react";

import { Legend, Panel, ResultSummary, ScreenReaderStatus, StatusBadge, type LegendItem } from "@/components/ui-primitives";
import { VisualizationDescriptionContext } from "@/components/visualization-description";

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

/** The visualization of a category: a region named after its heading, the algorithm's name. */
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
  /** Each item's tone must match the color the visualization draws for that state. */
  legend?: LegendItem[];
  resultSummary?: ReactNode;
  status: VisualizerStatus;
  statusLabel?: string;
  title: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Panel
      aria-busy={status === "loading"}
      aria-labelledby={titleId}
      className={className ?? "min-w-0 p-5"}
      variant="visualization"
    >
      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-lg font-extrabold tracking-normal text-slate-900" id={titleId}>{title}</h2>
            <StatusBadge label={statusLabel ?? statusLabels[status]} variant={status} />
          </div>
          <p className="m-0 min-h-6 text-sm leading-6 text-slate-500" id={descriptionId}>{description}</p>
          {/* Autoplay changes the description on every tick; announce it only when playback rests. */}
          <ScreenReaderStatus silent={status === "loading" || status === "running"}>{description}</ScreenReaderStatus>
          {resultSummary ? <ResultSummary>{resultSummary}</ResultSummary> : null}
        </div>
        {legend?.length ? <Legend items={legend} /> : null}
      </div>
      <VisualizationDescriptionContext value={descriptionId}>{children}</VisualizationDescriptionContext>
    </Panel>
  );
}
