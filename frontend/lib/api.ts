import type {
  RandomNumbersResponse,
  SortingAlgorithm,
  SortingStepsResponse,
} from "@/types/sorting";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`The backend returned status ${response.status}.`);
  }

  return response.json() as Promise<T>;
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
