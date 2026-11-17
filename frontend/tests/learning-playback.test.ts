import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLearningPlayback } from "@/hooks/use-learning-playback";
import { useStepPlayback } from "@/hooks/use-step-playback";
import { BEST_SCORES_STORAGE_KEY, createBestScoreStore, type BestScoreStore } from "@/learning/best-scores";
import type { LearningQuestion, LearningStep } from "@/learning/types";
import { run } from "./learning-fixtures";

function setup(name = "bubble", autoplay = false, bestScores?: BestScoreStore) {
  vi.useFakeTimers();
  const sample = run(name);
  const hook = renderHook(({ speed }) => useLearningPlayback<LearningStep>(speed, sample.algorithm, bestScores), { initialProps: { speed: 100 } });
  act(() => { hook.result.current.learning.setEnabled(true); hook.result.current.load(sample.steps, autoplay, sample.context); });
  return { ...hook, sample };
}

describe("learning playback", () => {
  it.each(["bubble", "selection", "insertion", "linear_found", "binary_right", "bst_insert", "bst_search", "bfs", "dfs", "fibonacci_8", "n_queens"])("stops before the revealing snapshot in %s", (name) => {
    const { result, sample } = setup(name);
    act(() => result.current.jumpToEnd());
    const checkpoint = result.current.learning.activeQuestion!;
    expect(result.current.currentStepIndex).toBe(checkpoint.stepIndex - 1);
    expect(result.current.currentStep).toEqual(sample.steps[checkpoint.stepIndex - 1]);
    expect(result.current.learning.blocked).toBe(true);
    expect(result.current.isComplete).toBe(false);
  });

  it("pauses autoplay, excludes question time, and reveals the answered step only on Continue", () => {
    const { result } = setup("bubble", true);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
    const elapsed = result.current.elapsedMs;
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.elapsedMs).toBe(elapsed);
    const checkpoint = result.current.learning.activeQuestion!;
    act(() => result.current.learning.submit(checkpoint.correctChoice));
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.learning.session.correct).toBe(1);
    act(() => { result.current.next(); result.current.jumpToEnd(); result.current.toggle(); });
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.learning.continuePlayback());
    expect(result.current.currentStepIndex).toBe(checkpoint.stepIndex);
    expect(result.current.isPlaying).toBe(true);
  });

  it("manual Continue stays paused and ignores premature Continue and double submission", () => {
    const { result } = setup();
    act(() => result.current.next());
    act(() => result.current.learning.continuePlayback());
    expect(result.current.currentStepIndex).toBe(0);
    const question = result.current.learning.activeQuestion!;
    act(() => { result.current.learning.submit(question.correctChoice); result.current.learning.submit(question.correctChoice); });
    expect(result.current.learning.session.answered).toBe(1);
    act(() => result.current.learning.continuePlayback());
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.isPlaying).toBe(false);
  });

  it("blocks rapid Play calls even before the checkpoint's disabled controls render", () => {
    const { result } = setup();
    act(() => {
      result.current.next();
      result.current.toggle();
      result.current.play();
    });
    expect(result.current.learning.activeQuestion).not.toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
  });

  it.each(["last", "seek"])("%s stops at the first unanswered checkpoint and discards its destination", (action) => {
    const { result, sample } = setup();
    act(() => action === "last" ? result.current.jumpToEnd() : result.current.seek(sample.steps.length - 1));
    const first = result.current.learning.activeQuestion!;
    act(() => result.current.learning.skip());
    expect(result.current.learning.session.skipped).toBe(1);
    act(() => result.current.learning.continuePlayback());
    expect(result.current.currentStepIndex).toBe(first.stepIndex);
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });

  it("backward navigation preserves outcomes and cannot duplicate scoring", () => {
    const { result } = setup();
    act(() => result.current.next());
    const first = result.current.learning.activeQuestion!;
    act(() => result.current.learning.submit(first.correctChoice));
    act(() => result.current.learning.continuePlayback());
    act(() => result.current.previous());
    act(() => result.current.next());
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.learning.session.correct).toBe(1);
    act(() => result.current.jumpToEnd());
    expect(result.current.learning.activeQuestion).not.toBeNull();
    act(() => result.current.jumpToStart());
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.learning.session.correct).toBe(1);
    act(() => result.current.jumpToEnd());
    expect(result.current.learning.activeQuestion?.id).not.toBe(first.id);
  });

  it("restart, reset, and new loads clear scores, while pause and speed changes preserve them", () => {
    const { result, rerender, sample } = setup();
    act(() => result.current.next());
    act(() => result.current.learning.submit(result.current.learning.activeQuestion!.correctChoice));
    act(() => result.current.learning.continuePlayback());
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    rerender({ speed: 200 });
    expect(result.current.learning.session.correct).toBe(1);
    act(() => result.current.restart());
    expect(result.current.learning.session.correct).toBe(0);
    expect(result.current.currentStepIndex).toBe(0);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.learning.activeQuestion).not.toBeNull();
    act(() => result.current.learning.skip());
    act(() => result.current.load(sample.steps, false));
    expect(result.current.learning.session.skipped).toBe(0);
    act(() => result.current.reset());
    expect(result.current.steps).toEqual([]);
    expect(result.current.learning.session.questions).toEqual([]);
    expect(result.current.learning.enabled).toBe(true);
  });

  it("disabling a checkpoint restores interrupted autoplay and does not re-score revealed steps", () => {
    const { result } = setup("bubble", true);
    act(() => vi.advanceTimersByTime(100));
    const first = result.current.learning.activeQuestion!;
    act(() => result.current.learning.setEnabled(false));
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.isPlaying).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.currentStepIndex).toBe(first.stepIndex);
    expect(result.current.learning.session.outcomes[first.id].status).toBe("revealed");
    act(() => result.current.pause());
    act(() => result.current.learning.setEnabled(true));
    act(() => result.current.jumpToStart());
    act(() => result.current.next());
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.learning.session.answered).toBe(0);
  });

  it("keeps submitted scores across toggles and marks all crossed normal-mode checkpoints unscored", () => {
    const { result } = setup();
    act(() => result.current.next());
    act(() => result.current.learning.submit(result.current.learning.activeQuestion!.correctChoice));
    act(() => result.current.learning.setEnabled(false));
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.jumpToEnd());
    act(() => result.current.learning.setEnabled(true));
    expect(result.current.learning.session.correct).toBe(1);
    expect(Object.values(result.current.learning.session.outcomes).every((outcome) => outcome.status === "answered" || outcome.status === "revealed")).toBe(true);
    act(() => result.current.jumpToStart());
    act(() => result.current.jumpToEnd());
    expect(result.current.learning.activeQuestion).toBeNull();
    expect(result.current.learning.session.correct).toBe(1);
  });

  it("cancels stale autoplay timers on seek, reset, and speed changes", () => {
    const { result, rerender } = setup("bubble", true);
    act(() => vi.advanceTimersByTime(50));
    act(() => result.current.seek(0));
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.learning.activeQuestion).toBeNull();
    act(() => result.current.toggle());
    rerender({ speed: 300 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.learning.activeQuestion).toBeNull();
    act(() => result.current.reset());
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.currentStepIndex).toBe(-1);
  });

  it("completes after all checkpoints are handled and supports zero-question runs", () => {
    const { result } = setup();
    for (let attempts = 0; attempts < 12 && !result.current.isComplete; attempts++) {
      act(() => result.current.jumpToEnd());
      if (result.current.learning.activeQuestion) {
        act(() => result.current.learning.skip());
        act(() => result.current.learning.continuePlayback());
      }
    }
    expect(result.current.learning.isComplete).toBe(true);
    expect(result.current.learning.session.skipped).toBe(result.current.learning.session.questions.length);
    const zeroQuestions = setup("fibonacci_0");
    act(() => zeroQuestions.result.current.jumpToEnd());
    expect(zeroQuestions.result.current.learning.isComplete).toBe(true);
    expect(zeroQuestions.result.current.learning.accuracy).toBeNull();
  });

  it("leaves unsupported and ordinary playback operational", () => {
    vi.useFakeTimers();
    const sample = run("bubble");
    const ordinary = renderHook(() => useStepPlayback<LearningStep>(100));
    act(() => ordinary.result.current.load(sample.steps));
    act(() => vi.advanceTimersByTime(100));
    expect(ordinary.result.current.currentStepIndex).toBe(1);
    expect(ordinary.result.current.isPlaying).toBe(true);
    const unsupported = renderHook(() => useLearningPlayback<LearningStep>(100, "quick_sort"));
    act(() => { unsupported.result.current.learning.setEnabled(true); unsupported.result.current.load(sample.steps); });
    act(() => vi.advanceTimersByTime(100));
    expect(unsupported.result.current.currentStepIndex).toBe(1);
    expect(unsupported.result.current.learning.enabled).toBe(false);
    expect(unsupported.result.current.learning.activeQuestion).toBeNull();
  });
});

describe("learning best score", () => {
  beforeEach(() => localStorage.clear());

  function finish(result: ReturnType<typeof setup>["result"], choose: (question: LearningQuestion) => number) {
    for (let attempts = 0; attempts < 12 && !result.current.learning.isComplete; attempts++) {
      act(() => result.current.jumpToEnd());
      const question = result.current.learning.activeQuestion;
      if (!question) continue;
      act(() => result.current.learning.submit(choose(question)));
      act(() => result.current.learning.continuePlayback());
    }
    expect(result.current.learning.isComplete).toBe(true);
  }

  it("saves a finished session's score and keeps the best one", () => {
    const { result } = setup();
    act(() => result.current.next());
    act(() => result.current.learning.submit(result.current.learning.activeQuestion!.correctChoice));
    expect(result.current.learning.bestScore).toBeNull();
    act(() => result.current.learning.continuePlayback());
    finish(result, (question) => question.correctChoice);
    const total = result.current.learning.session.questions.length;
    expect(result.current.learning.bestScore).toEqual({ correct: total, answered: total });
    expect(JSON.parse(localStorage.getItem(BEST_SCORES_STORAGE_KEY)!)).toEqual({ bubble_sort: { correct: total, answered: total } });
    act(() => result.current.restart());
    finish(result, (question) => (question.correctChoice + 1) % question.choices.length);
    expect(result.current.learning.session.correct).toBe(0);
    expect(result.current.learning.bestScore).toEqual({ correct: total, answered: total });
  });

  it("reads saved best scores per algorithm on a new page load", () => {
    localStorage.setItem(BEST_SCORES_STORAGE_KEY, JSON.stringify({ bubble_sort: { correct: 3, answered: 4 } }));
    expect(renderHook(() => useLearningPlayback<LearningStep>(100, "bubble_sort")).result.current.learning.bestScore).toEqual({ correct: 3, answered: 4 });
    expect(renderHook(() => useLearningPlayback<LearningStep>(100, "selection_sort")).result.current.learning.bestScore).toBeNull();
  });

  it("keeps the best score in memory when storage is unavailable", () => {
    const store = createBestScoreStore(() => { throw new DOMException("Storage is disabled.", "SecurityError"); });
    const { result } = setup("selection", false, store);
    expect(result.current.learning.bestScore).toBeNull();
    finish(result, (question) => question.correctChoice);
    const total = result.current.learning.session.questions.length;
    expect(result.current.learning.bestScore).toEqual({ correct: total, answered: total });
    expect(localStorage.getItem(BEST_SCORES_STORAGE_KEY)).toBeNull();
  });
});
