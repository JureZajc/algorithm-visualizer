import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RUN_TIMEOUT_MS, runTimeoutMessage, useVisualizationRun, type RunOptions } from "@/hooks/use-visualization-run";
import { fetchSortingSteps } from "@/lib/api";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** A request that waits for the test to settle it and records the signal it was given. */
function pendingRequest<T>() {
  const pending = deferred<T>();
  const request = { signal: null as AbortSignal | null, ...pending, send: (signal: AbortSignal) => {
    request.signal = signal;
    return pending.promise;
  } };
  return request;
}

function options<T>(overrides: Partial<RunOptions<T>> & Pick<RunOptions<T>, "request">): RunOptions<T> {
  return { onSuccess: vi.fn(), errorMessage: "Could not load steps.", ...overrides };
}

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useVisualizationRun", () => {
  it("loads, applies the response, and clears loading", async () => {
    const { result } = renderHook(() => useVisualizationRun());
    const request = pendingRequest<string>();
    const onStart = vi.fn();
    const onSuccess = vi.fn();

    let run!: Promise<void>;
    act(() => {
      run = result.current.start(options({ request: request.send, onStart, onSuccess }));
    });
    expect(result.current.isLoading).toBe(true);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(request.signal?.aborted).toBe(false);

    await act(async () => {
      request.resolve("steps");
      await run;
    });
    expect(onSuccess).toHaveBeenCalledWith("steps");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("shows the request's error message, or the fallback when it has none", async () => {
    const { result } = renderHook(() => useVisualizationRun());

    await act(() => result.current.start(options({ request: () => Promise.reject(new Error("Sudoku search exceeded 10000 steps.")) })));
    expect(result.current.error).toBe("Sudoku search exceeded 10000 steps.");
    expect(result.current.isLoading).toBe(false);

    await act(() => result.current.start(options({ request: () => Promise.reject("not an error") })));
    expect(result.current.error).toBe("Could not load steps.");

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("clears the previous error when a new run starts", async () => {
    const { result } = renderHook(() => useVisualizationRun());
    await act(() => result.current.start(options({ request: () => Promise.reject(new Error("Failed to fetch")) })));
    expect(result.current.error).toBe("Failed to fetch");

    const request = pendingRequest<string>();
    act(() => {
      void result.current.start(options({ request: request.send }));
    });
    expect(result.current.error).toBeNull();
  });

  it("cancels the previous request when a new run starts, and ignores its late outcome", async () => {
    const { result } = renderHook(() => useVisualizationRun());
    const first = pendingRequest<string>();
    const second = pendingRequest<string>();
    const firstSuccess = vi.fn();
    const secondSuccess = vi.fn();

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.start(options({ request: first.send, onSuccess: firstSuccess }));
    });
    act(() => {
      secondRun = result.current.start(options({ request: second.send, onSuccess: secondSuccess }));
    });
    expect(first.signal?.aborted).toBe(true);
    expect(second.signal?.aborted).toBe(false);

    // The cancelled request fails as fetch does; that is not an error, and loading continues.
    await act(async () => {
      first.reject(abortError());
      await firstRun;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      second.resolve("second steps");
      await secondRun;
    });
    expect(secondSuccess).toHaveBeenCalledWith("second steps");
    expect(firstSuccess).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("does not let a replaced request that ignores its signal overwrite the newer run", async () => {
    const { result } = renderHook(() => useVisualizationRun());
    const first = pendingRequest<string>();
    const second = pendingRequest<string>();
    const applied: string[] = [];

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.start(options({ request: first.send, onSuccess: (steps) => applied.push(steps) }));
    });
    act(() => {
      secondRun = result.current.start(options({ request: second.send, onSuccess: (steps) => applied.push(steps) }));
    });
    await act(async () => {
      second.resolve("newer");
      await secondRun;
    });
    await act(async () => {
      first.resolve("older");
      await firstRun;
    });

    expect(applied).toEqual(["newer"]);
    expect(result.current.isLoading).toBe(false);
  });

  it("cancels the request in flight on unmount and stays silent afterwards", async () => {
    const consoleError = vi.spyOn(console, "error");
    const { result, unmount } = renderHook(() => useVisualizationRun());
    const request = pendingRequest<string>();
    const onSuccess = vi.fn();

    let run!: Promise<void>;
    act(() => {
      run = result.current.start(options({ request: request.send, onSuccess }));
    });
    unmount();
    expect(request.signal?.aborted).toBe(true);

    request.reject(abortError());
    await run;
    expect(onSuccess).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("ends the wait after the timeout with a clear message and stops the request", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVisualizationRun());
    const request = pendingRequest<string>();
    const onSuccess = vi.fn();

    let run!: Promise<void>;
    act(() => {
      run = result.current.start(options({ request: request.send, onSuccess }));
    });

    await act(() => vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS - 1));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
      await run;
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(runTimeoutMessage(RUN_TIMEOUT_MS));
    expect(result.current.error).toBe("The backend did not respond within 30 seconds. Check that it is running, then try again.");
    expect(request.signal?.aborted).toBe(true);

    // A response that arrives after the timeout is dropped.
    await act(async () => {
      request.resolve("late steps");
      await Promise.resolve();
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toBe(runTimeoutMessage(RUN_TIMEOUT_MS));
  });

  it("does not time out a request that finishes in time", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useVisualizationRun(1_000));
    const request = pendingRequest<string>();

    let run!: Promise<void>;
    act(() => {
      run = result.current.start(options({ request: request.send }));
    });
    await act(async () => {
      request.resolve("steps");
      await run;
    });
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(result.current.error).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aborts the fetch behind a replaced run", async () => {
    const requests: RequestInit[] = [];
    const fetchMock = vi.fn<typeof fetch>((_url, init) => {
      requests.push(init ?? {});
      const signal = init?.signal;
      if (requests.length > 1) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ steps: ["second"] }) } as Response);
      }
      // Like fetch, the first request rejects with an AbortError once its signal aborts.
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(abortError()));
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useVisualizationRun());
    const onSuccess = vi.fn();
    const sortingRun = () => options({
      request: (signal) => fetchSortingSteps([3, 1, 2], "bubble_sort", signal),
      onSuccess,
    });

    let firstRun!: Promise<void>;
    act(() => {
      firstRun = result.current.start(sortingRun());
    });
    await act(async () => {
      const secondRun = result.current.start(sortingRun());
      await Promise.all([firstRun, secondRun]);
    });

    expect(requests).toHaveLength(2);
    expect(requests[0].signal?.aborted).toBe(true);
    expect(requests[1].signal?.aborted).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ steps: ["second"] });
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
