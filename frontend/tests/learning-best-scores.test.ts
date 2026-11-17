import { beforeEach, describe, expect, it, vi } from "vitest";
import { BEST_SCORES_STORAGE_KEY, createBestScoreStore, isBetterScore, parseBestScores } from "@/learning/best-scores";

describe("best scores", () => {
  beforeEach(() => localStorage.clear());

  it("ranks scores by correct answers, then by accuracy", () => {
    expect(isBetterScore({ correct: 0, answered: 1 }, null)).toBe(true);
    expect(isBetterScore({ correct: 0, answered: 0 }, null)).toBe(false);
    expect(isBetterScore({ correct: 4, answered: 8 }, { correct: 3, answered: 3 })).toBe(true);
    expect(isBetterScore({ correct: 3, answered: 3 }, { correct: 3, answered: 4 })).toBe(true);
    expect(isBetterScore({ correct: 3, answered: 4 }, { correct: 3, answered: 4 })).toBe(false);
    expect(isBetterScore({ correct: 2, answered: 2 }, { correct: 3, answered: 4 })).toBe(false);
    expect(isBetterScore({ correct: 5, answered: 4 }, null)).toBe(false);
  });

  it("ignores unreadable and invalid saved data", () => {
    expect(parseBestScores(null).size).toBe(0);
    expect(parseBestScores("not json").size).toBe(0);
    expect(parseBestScores("[1, 2]").size).toBe(0);
    const scores = parseBestScores(JSON.stringify({
      bubble_sort: { correct: 1, answered: 2 },
      selection_sort: { correct: 3, answered: 2 },
      insertion_sort: { correct: -1, answered: 2 },
      linear_search: { correct: 1.5, answered: 2 },
      dfs: "3 / 4",
    }));
    expect([...scores]).toEqual([["bubble_sort", { correct: 1, answered: 2 }]]);
  });

  it("saves improvements to localStorage, notifies subscribers, and reads them in a new store", () => {
    const store = createBestScoreStore(() => localStorage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.record("dfs", { correct: 2, answered: 3 })).toBe(true);
    expect(store.record("dfs", { correct: 1, answered: 1 })).toBe(false);
    expect(store.get("dfs")).toEqual({ correct: 2, answered: 3 });
    expect(store.get("bfs")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.record("dfs", { correct: 3, answered: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(BEST_SCORES_STORAGE_KEY)!)).toEqual({ dfs: { correct: 3, answered: 3 } });
    expect(createBestScoreStore(() => localStorage).get("dfs")).toEqual({ correct: 3, answered: 3 });
  });

  it("returns the same score object until it changes", () => {
    const store = createBestScoreStore(() => localStorage);
    store.record("dfs", { correct: 1, answered: 2 });
    expect(store.get("dfs")).toBe(store.get("dfs"));
  });

  it("works in memory when storage cannot be opened", () => {
    const store = createBestScoreStore(() => { throw new DOMException("Storage is disabled.", "SecurityError"); });
    expect(store.get("dfs")).toBeNull();
    expect(store.record("dfs", { correct: 1, answered: 2 })).toBe(true);
    expect(store.get("dfs")).toEqual({ correct: 1, answered: 2 });
    expect(createBestScoreStore(() => null).get("dfs")).toBeNull();
  });

  it("keeps saved scores and new ones in memory when storage is full", () => {
    localStorage.setItem(BEST_SCORES_STORAGE_KEY, JSON.stringify({ bfs: { correct: 4, answered: 5 }, dfs: { correct: 1, answered: 2 } }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Storage is full.", "QuotaExceededError"); });
    const store = createBestScoreStore(() => localStorage);
    expect(store.record("dfs", { correct: 2, answered: 2 })).toBe(true);
    expect(store.get("dfs")).toEqual({ correct: 2, answered: 2 });
    expect(store.get("bfs")).toEqual({ correct: 4, answered: 5 });
    expect(store.record("dfs", { correct: 3, answered: 4 })).toBe(true);
    expect(store.get("dfs")).toEqual({ correct: 3, answered: 4 });
  });
});
