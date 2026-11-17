export interface BestScore {
  correct: number;
  answered: number;
}

export interface BestScoreStore {
  get(algorithm: string): BestScore | null;
  record(algorithm: string, score: BestScore): boolean;
  subscribe(listener: () => void): () => void;
}

export const BEST_SCORES_STORAGE_KEY = "algorithm-visualizer:learning-best-scores";

function isScore(value: unknown): value is BestScore {
  if (typeof value !== "object" || value === null) return false;
  const { correct, answered } = value as Record<string, unknown>;
  return Number.isSafeInteger(correct) && Number.isSafeInteger(answered) && (correct as number) >= 0 && (correct as number) <= (answered as number);
}

// More correct answers win; on a tie, fewer answered questions mean higher accuracy.
export function isBetterScore(candidate: BestScore, current: BestScore | null): boolean {
  if (!isScore(candidate) || candidate.answered === 0) return false;
  return !current || candidate.correct > current.correct || (candidate.correct === current.correct && candidate.answered < current.answered);
}

export function parseBestScores(raw: string | null): Map<string, BestScore> {
  const scores = new Map<string, BestScore>();
  if (!raw) return scores;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return scores;
    for (const [algorithm, value] of Object.entries(parsed)) {
      if (isScore(value)) scores.set(algorithm, { correct: value.correct, answered: value.answered });
    }
  } catch {
    // Unreadable data is treated as no saved scores.
  }
  return scores;
}

// Storage can be missing, blocked, or full. Once a read or write fails, scores are
// kept in memory for the rest of the page so the panel keeps working.
export function createBestScoreStore(getStorage: () => Storage | null): BestScoreStore {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null = null;
  let cached = new Map<string, BestScore>();
  let memory: Map<string, BestScore> | null = null;

  function read(): Map<string, BestScore> {
    if (memory) return memory;
    try {
      const raw = getStorage()?.getItem(BEST_SCORES_STORAGE_KEY) ?? null;
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cached = parseBestScores(raw);
      }
      return cached;
    } catch {
      memory = new Map(cached);
      return memory;
    }
  }

  function write(scores: Map<string, BestScore>) {
    if (memory) {
      memory = scores;
      return;
    }
    try {
      const storage = getStorage();
      if (!storage) throw new Error("Storage is unavailable.");
      const raw = JSON.stringify(Object.fromEntries(scores));
      storage.setItem(BEST_SCORES_STORAGE_KEY, raw);
      cachedRaw = raw;
      cached = scores;
    } catch {
      memory = scores;
    }
  }

  return {
    get: (algorithm) => read().get(algorithm) ?? null,
    record(algorithm, score) {
      const scores = read();
      if (!isBetterScore(score, scores.get(algorithm) ?? null)) return false;
      write(new Map(scores).set(algorithm, { correct: score.correct, answered: score.answered }));
      for (const listener of listeners) listener();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const bestScoreStore = createBestScoreStore(() => window.localStorage);
