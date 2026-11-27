import { CATALOG_LIMITS } from "@/types/generated/catalog";

// Every tree algorithm takes the same request, so any one's limits apply.
const VALUE_LIMITS = CATALOG_LIMITS.trees.bst_insert.values;

export type ParsedValues =
  | { ok: true; values: number[] }
  | { ok: false; error: string };

export type ParsedTarget =
  | { ok: true; target: number | null }
  | { ok: false; error: string };

export function validateTreeValues(raw: string): ParsedValues {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: `Enter ${VALUE_LIMITS.min_items} to ${VALUE_LIMITS.max_items} comma-separated integer values.` };
  }

  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) {
    return { ok: false, error: "Use commas between values without empty entries." };
  }

  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isInteger(value))) {
    return { ok: false, error: "Tree values must be numbers, like 10, 20, 30." };
  }
  if (values.length < VALUE_LIMITS.min_items || values.length > VALUE_LIMITS.max_items) {
    return { ok: false, error: `Enter ${VALUE_LIMITS.min_items} to ${VALUE_LIMITS.max_items} values.` };
  }

  const seen = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) {
      return { ok: false, error: `Tree values must be unique. Duplicate value: ${value}.` };
    }
    seen.add(value);
  }
  return { ok: true, values };
}

export function validateTarget(raw: string, isSearch: boolean): ParsedTarget {
  if (!isSearch) {
    return { ok: true, target: null };
  }

  const target = Number(raw);
  if (raw.trim().length === 0 || !Number.isInteger(target)) {
    return { ok: false, error: "Enter an integer target value." };
  }
  return { ok: true, target };
}
