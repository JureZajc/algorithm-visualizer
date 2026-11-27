import type {
  AlgorithmsResponse,
} from "@/types/algorithm";
import type {
  BacktrackingRequest,
  BacktrackingResponse,
} from "@/types/backtracking";
import type {
  DynamicProgrammingRequest,
  DynamicProgrammingResponse,
} from "@/types/dynamic-programming";
import type {
  RandomNumbersResponse,
  SortingAlgorithm,
  SortingStepsResponse,
} from "@/types/sorting";
import type { GraphRequest, GraphResponse } from "@/types/graph";
import type {
  HashTableRequest,
  HashTableResponse,
} from "@/types/hash-tables";
import type {
  SearchingAlgorithm,
  SearchingStepsResponse,
} from "@/types/searching";
import type { TreeRequest, TreeResponse } from "@/types/trees";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });

  if (!response.ok) {
    throw new Error(`The backend returned status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

// Aborting `signal` cancels the request; fetch then rejects with the abort reason.
async function postJson<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = `The backend returned status ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string | unknown[] };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((item) => {
            if (
              typeof item === "object" &&
              item !== null &&
              "msg" in item &&
              typeof item.msg === "string"
            ) {
              return item.msg;
            }
            return String(item);
          })
          .join(" ");
      }
    } catch {
      // Keep the status-based message when the backend did not return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function fetchAlgorithms(signal?: AbortSignal): Promise<AlgorithmsResponse> {
  return getJson<AlgorithmsResponse>("/algorithms", signal);
}

export function fetchSearchingSteps(
  numbers: number[],
  algorithm: SearchingAlgorithm,
  target: number,
  signal?: AbortSignal,
): Promise<SearchingStepsResponse> {
  return postJson<SearchingStepsResponse>(
    "/searching/steps",
    { numbers, algorithm, target },
    signal,
  );
}

export function fetchGraphSteps(
  request: GraphRequest,
  signal?: AbortSignal,
): Promise<GraphResponse> {
  return postJson<GraphResponse>("/graph/steps", request, signal);
}

export function fetchDynamicProgrammingSteps(
  request: DynamicProgrammingRequest,
  signal?: AbortSignal,
): Promise<DynamicProgrammingResponse> {
  return postJson<DynamicProgrammingResponse>(
    "/dynamic-programming/steps",
    request,
    signal,
  );
}

export function fetchBacktrackingSteps(
  request: BacktrackingRequest,
  signal?: AbortSignal,
): Promise<BacktrackingResponse> {
  return postJson<BacktrackingResponse>("/backtracking/steps", request, signal);
}

export function fetchTreeSteps(
  request: TreeRequest,
  signal?: AbortSignal,
): Promise<TreeResponse> {
  return postJson<TreeResponse>("/trees/steps", request, signal);
}

export function fetchHashTableSteps(
  request: HashTableRequest,
  signal?: AbortSignal,
): Promise<HashTableResponse> {
  return postJson<HashTableResponse>("/hash-tables/steps", request, signal);
}

export function generateRandomNumbers(
  size: number,
  signal?: AbortSignal,
): Promise<RandomNumbersResponse> {
  return postJson<RandomNumbersResponse>(
    "/numbers/random",
    { size, min_value: 5, max_value: 100 },
    signal,
  );
}

export function fetchSortingSteps(
  numbers: number[],
  algorithm: SortingAlgorithm,
  signal?: AbortSignal,
): Promise<SortingStepsResponse> {
  return postJson<SortingStepsResponse>(
    "/sorting/steps",
    { numbers, algorithm },
    signal,
  );
}
