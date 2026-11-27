import { describe, expect, it } from "vitest";
import {
  parseHashKey,
  validateHashValues,
  validateLinearCapacity,
  validateTableSize,
  validateTarget,
} from "@/lib/hash-tables-input";

describe("hash table keys", () => {
  it("reads integer keys as numbers and everything else as strings", () => {
    expect(parseHashKey(" 42 ")).toBe(42);
    expect(parseHashKey("-7")).toBe(-7);
    expect(parseHashKey("+4")).toBe(4);
    expect(parseHashKey("1.5")).toBe("1.5");
    expect(parseHashKey("apple")).toBe("apple");
    expect(() => parseHashKey("9007199254740993")).toThrow("Integer keys must fit safely in JavaScript.");
  });

  it("accepts 1 to 31 comma-separated keys", () => {
    expect(validateHashValues("12, 22, 32, 5")).toEqual({ ok: true, values: [12, 22, 32, 5] });
    expect(validateHashValues("apple, 7,apple")).toEqual({ ok: true, values: ["apple", 7, "apple"] });
    expect(validateHashValues(Array.from({ length: 31 }, (_, index) => index).join(","))).toMatchObject({ ok: true });
  });

  it.each([
    ["", "Enter 1 to 31 comma-separated keys."],
    ["  ", "Enter 1 to 31 comma-separated keys."],
    ["a,,b", "Use commas between keys without empty entries."],
    ["a, b, ", "Use commas between keys without empty entries."],
    [Array.from({ length: 32 }, (_, index) => index).join(","), "Enter 1 to 31 keys."],
    ["1, 9007199254740993", "Integer keys must fit safely in JavaScript."],
  ])("rejects %j", (raw, error) => {
    expect(validateHashValues(raw)).toEqual({ ok: false, error });
  });
});

describe("hash table size and target", () => {
  it("accepts table sizes from 2 to 31", () => {
    expect(validateTableSize("2")).toEqual({ ok: true, tableSize: 2 });
    expect(validateTableSize(" 31 ")).toEqual({ ok: true, tableSize: 31 });
    for (const raw of ["1", "32", ""]) {
      expect(validateTableSize(raw)).toEqual({ ok: false, error: "Table size must be between 2 and 31." });
    }
    for (const raw of ["2.5", "ten"]) {
      expect(validateTableSize(raw)).toEqual({ ok: false, error: "Enter a whole number table size." });
    }
  });

  it("parses a search target like a key and ignores it for inserts", () => {
    expect(validateTarget("", false)).toEqual({ ok: true, target: null });
    expect(validateTarget(" 32 ", true)).toEqual({ ok: true, target: 32 });
    expect(validateTarget("apple", true)).toEqual({ ok: true, target: "apple" });
    expect(validateTarget("  ", true)).toEqual({ ok: false, error: "Enter a target key." });
    expect(validateTarget("99999999999999999", true)).toEqual({ ok: false, error: "Integer keys must fit safely in JavaScript." });
  });

  it("needs one linear probing slot per key", () => {
    const fourKeys = validateHashValues("1, 2, 3, 4");
    expect(validateLinearCapacity("linear_probing", fourKeys, validateTableSize("3"))).toBe("Linear probing needs at least one slot per value.");
    expect(validateLinearCapacity("linear_probing", fourKeys, validateTableSize("4"))).toBeNull();
    expect(validateLinearCapacity("separate_chaining", fourKeys, validateTableSize("2"))).toBeNull();
    expect(validateLinearCapacity("linear_probing", validateHashValues(""), validateTableSize("2"))).toBeNull();
    expect(validateLinearCapacity("linear_probing", fourKeys, validateTableSize("x"))).toBeNull();
  });
});
