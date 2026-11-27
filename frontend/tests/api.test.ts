import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAlgorithms, fetchSortingSteps, generateRandomNumbers } from "@/lib/api";

const fetchMock = vi.fn<typeof fetch>();

function respond(status: number, body: () => Promise<unknown>) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: body } as Response);
}

function respondWithJson(status: number, body: unknown) {
  respond(status, async () => body);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("API requests", () => {
  it("posts JSON and returns the parsed response", async () => {
    const payload = { algorithm: "bubble_sort", step_count: 0, steps: [] };
    respondWithJson(200, payload);
    await expect(fetchSortingSteps([3, 1, 2], "bubble_sort")).resolves.toEqual(payload);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/sorting\/steps$/);
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(String(init?.body))).toEqual({ numbers: [3, 1, 2], algorithm: "bubble_sort" });
  });

  it("asks the backend for random numbers between 5 and 100", async () => {
    respondWithJson(200, { numbers: [5, 6, 7, 8, 9] });
    await generateRandomNumbers(5);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ size: 5, min_value: 5, max_value: 100 });
  });

  it("passes the abort signal on POST requests", async () => {
    const controller = new AbortController();
    respondWithJson(200, { numbers: [5, 6, 7, 8, 9] });
    await generateRandomNumbers(5, controller.signal);
    respondWithJson(200, { algorithm: "bubble_sort", step_count: 0, steps: [] });
    await fetchSortingSteps([3, 1, 2], "bubble_sort", controller.signal);
    expect(fetchMock.mock.calls.map(([, init]) => init?.signal)).toEqual([controller.signal, controller.signal]);
  });

  it("rejects when the signal aborts the request", async () => {
    const controller = new AbortController();
    const abort = new DOMException("The operation was aborted.", "AbortError");
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(abort));
    }));
    const request = fetchSortingSteps([1], "bubble_sort", controller.signal);
    controller.abort();
    await expect(request).rejects.toBe(abort);
  });

  it("passes the abort signal on GET requests", async () => {
    const controller = new AbortController();
    respondWithJson(200, { sorting: [] });
    await fetchAlgorithms(controller.signal);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/algorithms$/);
    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });
});

describe("API error messages", () => {
  it("shows a string detail as it is", async () => {
    respondWithJson(422, { detail: "Sudoku search exceeded 10000 steps." });
    await expect(fetchSortingSteps([1], "bubble_sort")).rejects.toThrow(new Error("Sudoku search exceeded 10000 steps."));
  });

  it("joins the messages of a validation error list", async () => {
    respondWithJson(422, {
      detail: [
        { type: "too_short", loc: ["body", "numbers"], msg: "List should have at least 1 item after validation, not 0" },
        { type: "enum", loc: ["body", "algorithm"], msg: "Input should be 'bubble_sort' or 'quick_sort'" },
        "Plain message",
      ],
    });
    await expect(fetchSortingSteps([], "bubble_sort")).rejects.toThrow(
      new Error("List should have at least 1 item after validation, not 0 Input should be 'bubble_sort' or 'quick_sort' Plain message"),
    );
  });

  it("falls back to the status code when the detail is missing or unusable", async () => {
    respondWithJson(400, { message: "No detail field" });
    await expect(fetchSortingSteps([1], "bubble_sort")).rejects.toThrow(new Error("The backend returned status 400."));
    respondWithJson(400, { detail: { code: 7 } });
    await expect(fetchSortingSteps([1], "bubble_sort")).rejects.toThrow(new Error("The backend returned status 400."));
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    respond(502, () => Promise.reject(new SyntaxError("Unexpected token '<'")));
    await expect(fetchSortingSteps([1], "bubble_sort")).rejects.toThrow(new Error("The backend returned status 502."));
  });

  it("reports the status code for failed GET requests", async () => {
    respondWithJson(503, { detail: "Not used for GET requests" });
    await expect(fetchAlgorithms()).rejects.toThrow(new Error("The backend returned status 503."));
  });

  it("lets network failures through unchanged", async () => {
    const failure = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValueOnce(failure);
    await expect(fetchSortingSteps([1], "bubble_sort")).rejects.toBe(failure);
  });
});
