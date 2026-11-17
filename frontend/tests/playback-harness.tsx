import { StepControls } from "@/components/step-controls";
import { playbackStatus, VisualizationPanel } from "@/components/visualizer-panel";
import { useStepPlayback } from "@/hooks/use-step-playback";

export const PLAYBACK_SPEED = 100;
export const DEMO_STEPS = ["First", "Second", "Third", "Fourth"].map((word) => ({ description: `${word} step.` }));

// The playback wiring every category uses: one hook driving StepControls and VisualizationPanel.
export function PlaybackHarness() {
  const playback = useStepPlayback<(typeof DEMO_STEPS)[number]>(PLAYBACK_SPEED);
  return <>
    <button type="button" onClick={() => playback.load(DEMO_STEPS)}>Load steps</button>
    <StepControls currentStepIndex={playback.currentStepIndex} totalSteps={playback.steps.length} isLoading={false}
      isPlaying={playback.isPlaying} onTogglePlayback={playback.toggle} onNext={playback.next} onPrevious={playback.previous}
      onJumpToStart={playback.jumpToStart} onJumpToEnd={playback.jumpToEnd} onRestart={playback.restart} onSeek={playback.seek} />
    <VisualizationPanel title="Demo run" description={playback.currentStep?.description ?? "Load the steps to begin."}
      status={playbackStatus({ isComplete: playback.isComplete, isLoading: false, isPlaying: playback.isPlaying, totalSteps: playback.steps.length })}>
      <div />
    </VisualizationPanel>
  </>;
}
