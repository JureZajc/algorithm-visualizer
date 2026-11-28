import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LearningPanel } from "@/components/learning-panel";
import { StepControls } from "@/components/step-controls";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { BEST_SCORES_STORAGE_KEY, createBestScoreStore, type BestScoreStore } from "@/learning/best-scores";
import type { LearningStep } from "@/learning/types";
import { run } from "./learning-fixtures";

function Harness({ algorithm = "bubble_sort", bestScores }: { algorithm?: string; bestScores?: BestScoreStore }) {
  const playback = useLearningPlayback<LearningStep>(100, algorithm, bestScores);
  const sample = run("bubble");
  return <>
    <button onClick={() => playback.load(sample.steps, false)}>Load run</button>
    <LearningPanel learning={playback.learning} />
    <StepControls currentStepIndex={playback.currentStepIndex} totalSteps={playback.steps.length} isLoading={false}
      isPlaying={playback.isPlaying} learningBlocked={playback.learning.blocked} onTogglePlayback={playback.toggle}
      onNext={playback.next} onPrevious={playback.previous} onJumpToStart={playback.jumpToStart}
      onJumpToEnd={playback.jumpToEnd} onRestart={playback.restart} onSeek={playback.seek} />
    <p data-testid="description">{playback.currentStep?.description}</p>
  </>;
}

function openQuestion() {
  render(<Harness />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" }));
  fireEvent.click(screen.getByRole("button", { name: "Load run" }));
  fireEvent.click(screen.getByRole("button", { name: "Next step" }));
}

describe("learning panel", () => {
  beforeEach(() => localStorage.clear());

  it("shows a focused, labeled radio group and blocks forward controls", () => {
    openQuestion();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "What happens next?" }));
    expect(screen.getByRole("group", { name: /After comparing/ })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect((screen.getByRole("button", { name: "Submit answer" }) as HTMLButtonElement).disabled).toBe(true);
    for (const name of ["Play playback", "Next step", "Jump to last step"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.getByTestId("description").textContent).toBe("Compare 3 and 2.");
  });

  it.each([["Swap indices 0 and 1", "✓ Correct!", "Score: 1 / 1"], ["Finish sorting", "Incorrect.", "Score: 0 / 1"]])("submits %s and reveals feedback before Continue", (answer, feedback, score) => {
    openQuestion();
    fireEvent.click(screen.getByRole("radio", { name: answer }));
    fireEvent.submit(screen.getByRole("button", { name: "Submit answer" }).closest("form")!);
    expect(screen.getByText(feedback)).toBeTruthy();
    expect(screen.getByText(score)).toBeTruthy();
    expect(screen.getByText("Correct answer: Swap indices 0 and 1")).toBeTruthy();
    expect(screen.getByTestId("description").textContent).toBe("Compare 3 and 2.");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByTestId("description").textContent).toBe("Swap indices 0 and 1.");
    expect(screen.queryByRole("heading", { name: "What happens next?" })).toBeNull();
  });

  it("skips, continues, and shows a completion summary with no answered questions", () => {
    openQuestion();
    fireEvent.click(screen.getByRole("button", { name: "Skip question" }));
    expect(screen.getByText("Question skipped.")).toBeTruthy();
    expect(screen.getByText("Accuracy: —")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    for (let i = 0; i < 12 && !screen.queryByRole("heading", { name: "Learning session complete" }); i++) {
      fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
      if (screen.queryByRole("button", { name: "Skip question" })) {
        fireEvent.click(screen.getByRole("button", { name: "Skip question" }));
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      }
    }
    expect(screen.getByRole("heading", { name: "Learning session complete" })).toBeTruthy();
    expect(screen.getByText(/Correct: 0 \/ 0 · Accuracy: —/)).toBeTruthy();
  });

  it("keeps backward controls usable and limits the seek slider while a later checkpoint is active", () => {
    openQuestion();
    fireEvent.click(screen.getByRole("button", { name: "Skip question" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
    expect((screen.getByRole("button", { name: "Prev step" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Jump to first step" }) as HTMLButtonElement).disabled).toBe(false);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.max).toBe(slider.value);
    fireEvent.click(screen.getByRole("button", { name: "Jump to first step" }));
    expect(screen.queryByRole("heading", { name: "What happens next?" })).toBeNull();
  });

  it("explains unsupported algorithms and restores normal controls when toggled off", () => {
    const { unmount } = render(<Harness algorithm="quick_sort" />);
    expect((screen.getByRole("checkbox", { name: "Learning mode" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Learning mode is not available for this algorithm yet")).toBeTruthy();
    unmount();
    openQuestion();
    act(() => fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" })));
    expect(screen.queryByRole("heading", { name: "What happens next?" })).toBeNull();
    expect((screen.getByRole("button", { name: "Next step" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the best score saved for the selected algorithm", () => {
    localStorage.setItem(BEST_SCORES_STORAGE_KEY, JSON.stringify({ bubble_sort: { correct: 5, answered: 6 } }));
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" }));
    expect(screen.getByText("Best score: 5 / 6")).toBeTruthy();
    unmount();
    render(<Harness algorithm="selection_sort" />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" }));
    expect(screen.getByText("Best score: —")).toBeTruthy();
  });

  it("shows a finished session as the best score when storage is unavailable", () => {
    const bestScores = createBestScoreStore(() => { throw new DOMException("Storage is disabled.", "SecurityError"); });
    render(<Harness bestScores={bestScores} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Learning mode" }));
    fireEvent.click(screen.getByRole("button", { name: "Load run" }));
    expect(screen.getByText("Best score: —")).toBeTruthy();
    for (let i = 0; i < 12 && !screen.queryByRole("heading", { name: "Learning session complete" }); i++) {
      fireEvent.click(screen.getByRole("button", { name: "Jump to last step" }));
      if (screen.queryByRole("button", { name: "Submit answer" })) {
        fireEvent.click(screen.getAllByRole("radio")[0]);
        fireEvent.submit(screen.getByRole("button", { name: "Submit answer" }).closest("form")!);
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      }
    }
    expect(screen.getByRole("heading", { name: "Learning session complete" })).toBeTruthy();
    const score = screen.getByText(/^Score: /).textContent!.replace("Score: ", "");
    expect(screen.getByText(`Best score: ${score}`)).toBeTruthy();
  });
});
