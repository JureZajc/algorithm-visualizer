import type {
  RandomNumbersResponse,
  SortingAlgorithm,
  SortingStepsResponse,
} from "@/types/sorting";
import type { GraphRequest, GraphResponse } from "@/types/graph";
import type {
  SearchingAlgorithm,
  SearchingStepsResponse,
} from "@/types/searching";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `The backend returned status ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the status-based message when the backend did not return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function fetchSearchingSteps(
  numbers: number[],
  algorithm: SearchingAlgorithm,
  target: number,
): Promise<SearchingStepsResponse> {
  return postJson<SearchingStepsResponse>("/searching/steps", {
    numbers,
    algorithm,
    target,
  });
}

export function fetchGraphSteps(request: GraphRequest): Promise<GraphResponse> {
  return postJson<GraphResponse>("/graph/steps", request);
}

export function generateRandomNumbers(size: number): Promise<RandomNumbersResponse> {
  return postJson<RandomNumbersResponse>("/numbers/random", {
    size,
    min_value: 5,
    max_value: 100,
  });
}

export function fetchSortingSteps(
  numbers: number[],
  algorithm: SortingAlgorithm,
): Promise<SortingStepsResponse> {
  return postJson<SortingStepsResponse>("/sorting/steps", {
    numbers,
    algorithm,
  });
}
