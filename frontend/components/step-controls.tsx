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
  onRestart: () => void;
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
        ? "Running"
        : isAtEnd
          ? "Complete"
          : "Paused";
  const playLabel = props.isPlaying ? "Pause" : hasSteps && isAtEnd ? "Replay" : props.currentStepIndex <= 0 ? "Play" : "Resume";

  return (
    <div className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 md:grid-cols-[auto_minmax(12rem,1fr)] md:items-center">
      <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" aria-label="Step navigation controls">
        <Button
          size="sm"
          className="min-w-0 whitespace-nowrap px-1.5 text-[0.625rem] leading-tight tracking-[-0.02em] sm:px-3 sm:text-sm"
          type="button"
          aria-label="Jump to first step"
          disabled={controlsDisabled || isAtStart}
          onClick={props.onJumpToStart}
        >
          First
        </Button>
        <Button
          size="sm"
          className="min-w-0 whitespace-nowrap px-1.5 text-[0.625rem] leading-tight tracking-[-0.02em] sm:px-3 sm:text-sm"
          type="button"
          aria-label="Previous step"
          disabled={controlsDisabled || isAtStart}
          onClick={props.onPrevious}
        >
          Prev
        </Button>
        <Button
          size="sm"
          className="min-w-0 whitespace-nowrap px-1.5 text-[0.625rem] leading-tight tracking-[-0.02em] sm:px-3 sm:text-sm"
          variant="soft"
          type="button"
          aria-label={playLabel === "Replay" ? "Replay loaded steps" : playLabel === "Resume" ? "Resume playback" : `${playLabel} playback`}
          disabled={controlsDisabled}
          onClick={isAtEnd && !props.isPlaying ? props.onRestart : props.onTogglePlayback}
        >
          {playLabel}
        </Button>
        <Button
          size="sm"
          className="min-w-0 whitespace-nowrap px-1.5 text-[0.625rem] leading-tight tracking-[-0.02em] sm:px-3 sm:text-sm"
          type="button"
          aria-label="Next step"
          disabled={controlsDisabled || isAtEnd}
          onClick={props.onNext}
        >
          Next
        </Button>
        <Button
          size="sm"
          className="min-w-0 whitespace-nowrap px-1.5 text-[0.625rem] leading-tight tracking-[-0.02em] sm:px-3 sm:text-sm"
          type="button"
          aria-label="Jump to last step"
          disabled={controlsDisabled || isAtEnd}
          onClick={props.onJumpToEnd}
        >
          Last
        </Button>
      </div>

      <label className="flex min-w-0 flex-col gap-2 text-xs font-bold text-slate-700">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
            Choose a step
            <StatusBadge label={statusLabel} variant={statusVariant} />
          </span>
          <span className="min-w-0 max-w-full break-all text-right font-mono text-sm text-indigo-600" aria-live="polite">
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
