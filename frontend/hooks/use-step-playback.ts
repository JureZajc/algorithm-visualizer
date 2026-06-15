"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useStepPlayback<T>(speed: number) {
  const [steps, setSteps] = useState<T[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const accumulatedTimeRef = useRef(0);
  const playStartedAtRef = useRef<number | null>(null);

  const pause = useCallback(() => {
    if (playStartedAtRef.current !== null) {
      accumulatedTimeRef.current += performance.now() - playStartedAtRef.current;
      playStartedAtRef.current = null;
      setElapsedMs(accumulatedTimeRef.current);
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (playStartedAtRef.current === null) {
      playStartedAtRef.current = performance.now();
    }
    setIsPlaying(true);
  }, []);

  const reset = useCallback(() => {
    playStartedAtRef.current = null;
    accumulatedTimeRef.current = 0;
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setElapsedMs(0);
  }, []);

  const load = useCallback(
    (nextSteps: T[], autoplay = true) => {
      playStartedAtRef.current = null;
      accumulatedTimeRef.current = 0;
      setElapsedMs(0);
      setSteps(nextSteps);
      setCurrentStepIndex(nextSteps.length > 0 ? 0 : -1);
      setIsPlaying(false);

      if (autoplay && nextSteps.length > 1) {
        playStartedAtRef.current = performance.now();
        setIsPlaying(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      if (playStartedAtRef.current !== null) {
        setElapsedMs(
          accumulatedTimeRef.current +
            performance.now() -
            playStartedAtRef.current,
        );
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    if (currentStepIndex >= steps.length - 1) {
      pause();
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentStepIndex((index) => index + 1);
    }, speed);

    return () => window.clearTimeout(timer);
  }, [currentStepIndex, isPlaying, pause, speed, steps.length]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else if (steps.length > 0 && currentStepIndex < steps.length - 1) play();
  }, [currentStepIndex, isPlaying, pause, play, steps.length]);

  const seek = useCallback(
    (index: number) => {
      if (steps.length === 0) return;
      pause();
      setCurrentStepIndex(Math.min(steps.length - 1, Math.max(0, index)));
    },
    [pause, steps.length],
  );

  const previous = useCallback(() => {
    seek(currentStepIndex - 1);
  }, [currentStepIndex, seek]);

  const next = useCallback(() => {
    seek(currentStepIndex + 1);
  }, [currentStepIndex, seek]);

  const jumpToStart = useCallback(() => {
    seek(0);
  }, [seek]);

  const jumpToEnd = useCallback(() => {
    seek(steps.length - 1);
  }, [seek, steps.length]);

  return {
    steps,
    currentStep: currentStepIndex >= 0 ? steps[currentStepIndex] : null,
    currentStepIndex,
    isPlaying,
    isComplete: steps.length > 0 && currentStepIndex === steps.length - 1,
    elapsedMs,
    load,
    reset,
    toggle,
    seek,
    previous,
    next,
    jumpToStart,
    jumpToEnd,
  };
}
