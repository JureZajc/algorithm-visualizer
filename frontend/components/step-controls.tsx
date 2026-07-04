import { Button, StatusBadge } from "@/components/ui-primitives";

interface StepControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isLoading: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onSeek: (index: number) => void;
}

export function StepControls(props: StepControlsProps) {
  const hasSteps = props.totalSteps > 0;
  const isAtStart = !hasSteps || props.currentStepIndex <= 0;
  const isAtEnd = !hasSteps || props.currentStepIndex >= props.totalSteps - 1;
  const displayedStep = hasSteps ? props.currentStepIndex + 1 : 0;
  const controlsDisabled = props.isLoading || !hasSteps;
  const statusVariant = props.isLoading
    ? "loading"
    : !hasSteps
      ? "idle"
      : props.isPlaying
        ? "running"
        : isAtEnd
          ? "complete"
          : "paused";
  const statusLabel = props.isLoading
    ? "Loading steps"
    : !hasSteps
      ? "No steps yet"
      : props.isPlaying
        ? "Playing"
        : isAtEnd
          ? "Complete"
          : "Paused";
  const playLabel = props.isPlaying
    ? "Pause"
    : props.currentStepIndex <= 0
      ? "Play"
      : "Resume";

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 md:grid-cols-[auto_minmax(12rem,1fr)] md:items-center">
      <div className="flex flex-wrap gap-2" aria-label="Step navigation controls">
        <Button
          size="sm"
          type="button"
          disabled={controlsDisabled || isAtStart}
          onClick={props.onJumpToStart}
        >
          Jump to start
        </Button>
        <Button
          size="sm"
          type="button"
          disabled={controlsDisabled || isAtStart}
          onClick={props.onPrevious}
        >
          Previous step
        </Button>
        <Button
          size="sm"
          variant="soft"
          type="button"
          disabled={controlsDisabled || (!props.isPlaying && isAtEnd)}
          onClick={props.onTogglePlayback}
        >
          {playLabel}
        </Button>
        <Button
          size="sm"
          type="button"
          disabled={controlsDisabled || isAtEnd}
          onClick={props.onNext}
        >
          Next step
        </Button>
        <Button
          size="sm"
          type="button"
          disabled={controlsDisabled || isAtEnd}
          onClick={props.onJumpToEnd}
        >
          Jump to end
        </Button>
      </div>

      <label className="flex min-w-0 flex-col gap-2 text-xs font-bold text-slate-700">
        <span className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            Choose a step
            <StatusBadge label={statusLabel} variant={statusVariant} />
          </span>
          <span className="whitespace-nowrap font-mono text-sm text-indigo-600" aria-live="polite">
            Step {displayedStep} / {props.totalSteps}
          </span>
        </span>
        <input
          className="w-full accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
          type="range"
          min={0}
          max={Math.max(0, props.totalSteps - 1)}
          step={1}
          value={hasSteps ? props.currentStepIndex : 0}
          disabled={controlsDisabled}
          aria-valuetext={hasSteps ? `Step ${displayedStep} of ${props.totalSteps}` : "No steps loaded"}
          onChange={(event) => props.onSeek(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
