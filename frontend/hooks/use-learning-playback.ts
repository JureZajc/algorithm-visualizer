"use client";

import { useCallback, useRef, useState } from "react";

import { useStepPlayback, type PlaybackGuard } from "@/hooks/use-step-playback";
import { selectCheckpoints } from "@/learning/checkpoint-selector";
import { generateQuestions, supportsLearning } from "@/learning/question-generator";
import { createSession, sessionAccuracy, sessionReducer, type SessionAction } from "@/learning/session";
import type { LearningRunContext, LearningStep } from "@/learning/types";

export function useLearningPlayback<T extends LearningStep>(speed: number, algorithm: string) {
  const [enabled, setEnabledState] = useState(false);
  const enabledRef = useRef(false);
  const [session, setSession] = useState(createSession);
  const sessionRef = useRef(createSession());
  const runAlgorithmRef = useRef<string | null>(null);

  // Update the event-time state immediately so rapid clicks cannot score twice
  // or race a pending playback timer before React renders the next frame.
  const updateSession = useCallback((action: SessionAction) => {
    sessionRef.current = sessionReducer(sessionRef.current, action);
    setSession(sessionRef.current);
  }, []);

  const guard = useCallback<PlaybackGuard>(({ fromIndex, toIndex, source }) => {
    const current = sessionRef.current;
    if (toIndex <= fromIndex) {
      if (toIndex < fromIndex) updateSession({ type: "dismiss" });
      return { index: toIndex, blocked: false };
    }
    if (!enabledRef.current || !runAlgorithmRef.current || !supportsLearning(runAlgorithmRef.current)) {
      updateSession({ type: "reveal", throughIndex: toIndex });
      return { index: toIndex, blocked: false };
    }
    if (current.activeId) return { index: fromIndex, blocked: true };
    const checkpoint = current.questions.find((question) => question.stepIndex > fromIndex &&
      question.stepIndex <= toIndex && !current.outcomes[question.id]);
    if (!checkpoint) return { index: toIndex, blocked: false };
    updateSession({ type: "open", id: checkpoint.id, autoplay: source === "autoplay" });
    return { index: checkpoint.stepIndex - 1, blocked: true };
  }, [updateSession]);

  const playback = useStepPlayback<T>(speed, guard);
  const supported = supportsLearning(algorithm);

  function load(steps: T[], autoplay = true, context: LearningRunContext = {}) {
    runAlgorithmRef.current = algorithm;
    const capturedContext = { ...context, nodes: context.nodes ? [...context.nodes] : undefined };
    updateSession({ type: "reset", questions: selectCheckpoints(generateQuestions(algorithm, steps, capturedContext), steps.length) });
    playback.load(steps, autoplay);
  }

  function reset() {
    runAlgorithmRef.current = null;
    updateSession({ type: "reset" });
    playback.reset();
  }

  function restart() {
    updateSession({ type: "reset", questions: sessionRef.current.questions });
    playback.restart();
  }

  function setEnabled(next: boolean) {
    if (!supported) return;
    const resume = !next && sessionRef.current.activeId !== null && sessionRef.current.resumeAutoplay;
    enabledRef.current = next;
    setEnabledState(next);
    updateSession({ type: "dismiss" });
    updateSession({ type: "reveal", throughIndex: playback.currentStepIndex });
    if (resume) playback.play();
  }

  function continuePlayback() {
    const current = sessionRef.current;
    const question = current.questions.find((item) => item.id === current.activeId);
    if (!question || !current.outcomes[question.id]) return;
    const resume = current.resumeAutoplay;
    updateSession({ type: "dismiss" });
    playback.seek(question.stepIndex);
    if (resume && question.stepIndex < playback.steps.length - 1) playback.play();
  }

  const activeQuestion = session.questions.find((question) => question.id === session.activeId) ?? null;
  const blocked = enabled && supported && activeQuestion !== null;
  return {
    ...playback,
    load, reset, restart,
    toggle: () => { if (!enabledRef.current || sessionRef.current.activeId === null) playback.toggle(); },
    play: () => { if (!enabledRef.current || sessionRef.current.activeId === null) playback.play(); },
    learning: {
      enabled: enabled && supported,
      supported,
      blocked,
      session,
      activeQuestion,
      outcome: activeQuestion ? session.outcomes[activeQuestion.id] : undefined,
      accuracy: sessionAccuracy(session),
      isComplete: enabled && supported && playback.isComplete && !activeQuestion,
      setEnabled,
      submit: (choice: number) => {
        if (sessionRef.current.activeId) updateSession({ type: "answer", id: sessionRef.current.activeId, choice });
      },
      skip: () => {
        if (sessionRef.current.activeId) updateSession({ type: "skip", id: sessionRef.current.activeId });
      },
      continuePlayback,
    },
  };
}

export type LearningControls = ReturnType<typeof useLearningPlayback>["learning"];
