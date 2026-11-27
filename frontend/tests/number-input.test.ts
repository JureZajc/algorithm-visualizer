import { describe, expect, it } from "vitest";
import { parseInteger, requireRange } from "@/lib/number-input";

describe("number input", () => {
  it("parses trimmed whole numbers, including negatives", () => {
    expect(parseInteger(" 12 ", "n")).toBe(12);
    expect(parseInteger("-3", "n")).toBe(-3);
    expect(parseInteger("1e2", "n")).toBe(100);
  });

  it("rejects values that are not whole numbers", () => {
    for (const raw of ["1.5", "abc", "1,2", "NaN", "Infinity"]) {
      expect(() => parseInteger(raw, "Amount")).toThrow("Amount must be a whole number.");
    }
  });

  it("accepts the bounds of a range and rejects values outside it", () => {
    expect(requireRange(0, "n", 0, 40)).toBe(0);
    expect(requireRange(40, "n", 0, 40)).toBe(40);
    expect(() => requireRange(-1, "n", 0, 40)).toThrow("n must be between 0 and 40.");
    expect(() => requireRange(41, "n", 0, 40)).toThrow("n must be between 0 and 40.");
  });
});
