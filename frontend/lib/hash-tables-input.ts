import type { HashKey, HashTableStrategy } from "@/types/hash-tables";

export type ParsedValues =
  | { ok: true; values: HashKey[] }
  | { ok: false; error: string };

export type ParsedTableSize =
  | { ok: true; tableSize: number }
  | { ok: false; error: string };

export type ParsedTarget =
  | { ok: true; target: HashKey | null }
  | { ok: false; error: string };

export function validateHashValues(raw: string): ParsedValues {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter 1 to 31 comma-separated keys." };
  }

  const parts = raw.split(",").map((part) => part.trim());
  if (parts.some((part) => part.length === 0)) {
    return { ok: false, error: "Use commas between keys without empty entries." };
  }
  if (parts.length < 1 || parts.length > 31) {
    return { ok: false, error: "Enter 1 to 31 keys." };
  }

  try {
    return { ok: true, values: parts.map(parseHashKey) };
  } catch (parseError) {
    return {
      ok: false,
      error: parseError instanceof Error ? parseError.message : "Invalid key input.",
    };
  }
}

export function validateTableSize(raw: string): ParsedTableSize {
  const tableSize = Number(raw.trim());
  if (!Number.isInteger(tableSize)) {
    return { ok: false, error: "Enter a whole number table size." };
  }
  if (tableSize < 2 || tableSize > 31) {
    return { ok: false, error: "Table size must be between 2 and 31." };
  }
  return { ok: true, tableSize };
}

export function validateTarget(raw: string, isSearch: boolean): ParsedTarget {
  if (!isSearch) {
    return { ok: true, target: null };
  }
  if (raw.trim().length === 0) {
    return { ok: false, error: "Enter a target key." };
  }
  try {
    return { ok: true, target: parseHashKey(raw.trim()) };
  } catch (parseError) {
    return {
      ok: false,
      error: parseError instanceof Error ? parseError.message : "Invalid target key.",
    };
  }
}

export function validateLinearCapacity(
  strategy: HashTableStrategy,
  values: ParsedValues,
  tableSize: ParsedTableSize,
) {
  if (
    strategy === "linear_probing" &&
    values.ok &&
    tableSize.ok &&
    values.values.length > tableSize.tableSize
  ) {
    return "Linear probing needs at least one slot per value.";
  }
  return null;
}

export function parseHashKey(raw: string): HashKey {
  const value = raw.trim();
  if (/^[+-]?\d+$/.test(value)) {
    const numericValue = Number(value);
    if (!Number.isSafeInteger(numericValue)) {
      throw new Error("Integer keys must fit safely in JavaScript.");
    }
    return numericValue;
  }
  return value;
}
