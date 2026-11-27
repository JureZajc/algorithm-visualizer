import { CATALOG_LIMITS } from "@/types/generated/catalog";

// Every sorting algorithm takes the same request, so any one's limit applies.
const MAX_COUNT = CATALOG_LIMITS.sorting.bubble_sort.numbers.max_items;

export function validateCountDraft(rawValue: string) {
  const value = Number(rawValue.trim());
  if (!Number.isInteger(value)) {
    return { error: `Enter a whole number from 5 to ${MAX_COUNT}.`, value: null };
  }
  if (value < 5 || value > MAX_COUNT) {
    return { error: `Random values must be between 5 and ${MAX_COUNT}.`, value: null };
  }
  return { error: null, value };
}
