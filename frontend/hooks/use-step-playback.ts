"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PlaybackTransition {
  fromIndex: number;
  toIndex: number;
  source: "autoplay" | "seek";
}

export type PlaybackGuard = (transition: PlaybackTransition) => { index: number; blocked: boolean };

export function useStepPlayback<T>(speed: number, guard?: PlaybackGuard) {
  const [steps, setSteps] = useState<T[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const accumulatedTimeRef = useRef(0);
  const playStartedAtRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const pause = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
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
    pause();
    playStartedAtRef.current = null;
    accumulatedTimeRef.current = 0;
    setSteps([]);
    setCurrentStepIndex(-1);
    setIsPlaying(false);
    setElapsedMs(0);
  }, [pause]);

  const restart = useCallback(() => {
    if (steps.length === 0) return;
    pause();
    accumulatedTimeRef.current = 0;
    setElapsedMs(0);
    setCurrentStepIndex(0);
    playStartedAtRef.current = steps.length > 1 ? performance.now() : null;
    setIsPlaying(steps.length > 1);
  }, [pause, steps.length]);

  const load = useCallback(
    (nextSteps: T[], autoplay = true) => {
      pause();
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
    [pause],
  );

  const transition = useCallback((toIndex: number, source: PlaybackTransition["source"]) => {
    const result = guard?.({ fromIndex: currentStepIndex, toIndex, source });
    if (result?.blocked) pause();
    setCurrentStepIndex(result?.index ?? toIndex);
  }, [currentStepIndex, guard, pause]);

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
      advanceTimerRef.current = null;
      transition(currentStepIndex + 1, "autoplay");
    }, speed);
    advanceTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (advanceTimerRef.current === timer) advanceTimerRef.current = null;
    };
  }, [currentStepIndex, isPlaying, pause, speed, steps.length, transition]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else if (steps.length > 0 && currentStepIndex < steps.length - 1) play();
  }, [currentStepIndex, isPlaying, pause, play, steps.length]);

  const seek = useCallback(
    (index: number) => {
      if (steps.length === 0) return;
      pause();
      transition(Math.min(steps.length - 1, Math.max(0, index)), "seek");
    },
    [pause, steps.length, transition],
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
    pause,
    play,
    load,
    reset,
    restart,
    toggle,
    seek,
    previous,
    next,
    jumpToStart,
    jumpToEnd,
  };
}
