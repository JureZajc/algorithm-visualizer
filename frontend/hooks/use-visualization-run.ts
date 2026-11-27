"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a run waits for the backend before it gives up. */
export const RUN_TIMEOUT_MS = 30_000;

export function runTimeoutMessage(timeoutMs: number) {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000));
  return `The backend did not respond within ${seconds} seconds. Check that it is running, then try again.`;
}

export interface RunOptions<T> {
  /** Sends the request. Pass the signal on to fetch, so that cancelling the run stops the request. */
  request: (signal: AbortSignal) => Promise<T>;
  /** Applies the response. It is never called for a run that was cancelled or replaced. */
  onSuccess: (response: T) => void;
  /** Runs when the run starts, before the request is sent; for example, resetting playback. */
  onStart?: () => void;
  /** Shown when the request fails without a message of its own. */
  errorMessage: string;
}

/**
 * Owns the request behind a visualization run: its loading and error state, cancellation,
 * and a timeout. Starting a run cancels the one in flight, and so does unmounting. A cancelled
 * run reports no error and never applies its response, so it cannot overwrite a newer run.
 * After `timeoutMs` the wait ends with an error message, even if the request ignores its signal.
 */
export function useVisualizationRun(timeoutMs = RUN_TIMEOUT_MS) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      activeRef.current?.abort();
      activeRef.current = null;
    },
    [],
  );

  const start = useCallback(
    async <T>({ request, onSuccess, onStart, errorMessage }: RunOptions<T>) => {
      activeRef.current?.abort();
      const controller = new AbortController();
      activeRef.current = controller;
      const isCurrent = () => activeRef.current === controller;

      setError(null);
      setIsLoading(true);
      onStart?.();

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(runTimeoutMessage(timeoutMs))), timeoutMs);
      });

      try {
        const response = await Promise.race([request(controller.signal), timeout]);
        if (isCurrent()) onSuccess(response);
      } catch (caught) {
        if (!isCurrent()) return;
        // After a timeout the request may still be open; stop it.
        controller.abort();
        setError(caught instanceof Error && caught.message ? caught.message : errorMessage);
      } finally {
        clearTimeout(timer);
        if (isCurrent()) {
          activeRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [timeoutMs],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isLoading, error, start, clearError };
}

export type VisualizationRun = ReturnType<typeof useVisualizationRun>;
