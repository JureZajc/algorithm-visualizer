import { describe, expect, it } from "vitest";
import {
  createDefaultRequest,
  createRequest,
  DEFAULT_FIELDS,
  dynamicProgrammingErrorField,
  formFieldsFromRequest,
  INITIAL_FORM,
  parseIntegerList,
  safeRequest,
  validateDynamicProgrammingForm,
  type DynamicProgrammingForm,
} from "@/lib/dynamic-programming-input";
import { DYNAMIC_PROGRAMMING_PRESETS } from "@/lib/dynamic-programming-presets";
import type { DynamicProgrammingAlgorithm } from "@/types/dynamic-programming";

const ALGORITHMS = Object.keys(DEFAULT_FIELDS) as DynamicProgrammingAlgorithm[];

function form(overrides: Partial<DynamicProgrammingForm> = {}): DynamicProgrammingForm {
  return { ...INITIAL_FORM, ...overrides };
}

describe("dynamic programming requests", () => {
  it("builds the request for each algorithm from the form", () => {
    expect(createRequest("fibonacci", form({ n: "12" }))).toEqual({ algorithm: "fibonacci", n: 12 });
    expect(createRequest("coin_change", form({ coins: " 1, 3 ,4, ", amount: "6" }))).toEqual({ algorithm: "coin_change", coins: [1, 3, 4], amount: 6 });
    expect(createRequest("knapsack", form({ weights: "2, 3", values: "0, 4", capacity: "5" }))).toEqual({ algorithm: "knapsack", weights: [2, 3], values: [0, 4], capacity: 5 });
    expect(createRequest("lcs", form({ textA: "ABCBDAB", textB: "" }))).toEqual({ algorithm: "lcs", text_a: "ABCBDAB", text_b: "" });
    expect(createRequest("edit_distance", form({ textA: "kitten", textB: "sitting" }))).toEqual({ algorithm: "edit_distance", text_a: "kitten", text_b: "sitting" });
    expect(createRequest("unique_paths", form({ rows: "1", cols: "12" }))).toEqual({ algorithm: "unique_paths", rows: 1, cols: 12 });
  });

  it("parses comma-separated integer lists", () => {
    expect(parseIntegerList("5, -2,0", "Values")).toEqual([5, -2, 0]);
    expect(() => parseIntegerList(" , ", "Coins")).toThrow("Coins must include at least one value.");
    expect(() => parseIntegerList("1, two", "Coins")).toThrow("Coins must be a whole number.");
  });

  it.each([
    ["fibonacci", { n: "41" }, "n must be between 0 and 40."],
    ["fibonacci", { n: "eight" }, "n must be a whole number."],
    ["coin_change", { coins: "" }, "Coins must include at least one value."],
    ["coin_change", { coins: "1, 2, 3, 4, 5, 6, 7, 8, 9" }, "Coins must include 1 to 8 values."],
    ["coin_change", { coins: "0, 2" }, "Coins must contain positive values."],
    ["coin_change", { amount: "51" }, "Amount must be between 0 and 50."],
    ["knapsack", { weights: "2, -1", values: "3, 4" }, "Weights must contain positive values."],
    ["knapsack", { weights: "2, 3", values: "3, -4" }, "Values must contain nonnegative values."],
    ["knapsack", { weights: "2, 3", values: "3" }, "Knapsack requires matching weights and values."],
    ["knapsack", { capacity: "-1" }, "Capacity must be between 0 and 50."],
    ["lcs", { textA: "ABCDEFGHIJKLM" }, "First string must be 12 characters or fewer."],
    ["lcs", { textB: "ABCDEFGHIJKLM" }, "Second string must be 12 characters or fewer."],
    ["edit_distance", { textA: "ABCDEFGHIJKLM" }, "Source string must be 12 characters or fewer."],
    ["edit_distance", { textB: "ABCDEFGHIJKLM" }, "Target string must be 12 characters or fewer."],
    ["unique_paths", { rows: "0" }, "Rows must be between 1 and 12."],
    ["unique_paths", { cols: "13" }, "Columns must be between 1 and 12."],
  ] as const)("rejects invalid %s input %j", (algorithm, overrides, message) => {
    expect(() => createRequest(algorithm, form(overrides))).toThrow(message);
  });

  it("maps validation errors to the field that caused them", () => {
    expect(validateDynamicProgrammingForm("fibonacci", form())).toEqual({});
    expect(validateDynamicProgrammingForm("fibonacci", form({ n: "99" }))).toEqual({ n: "n must be between 0 and 40." });
    expect(validateDynamicProgrammingForm("coin_change", form({ coins: "x" }))).toEqual({ coins: "Coins must be a whole number." });
    expect(validateDynamicProgrammingForm("knapsack", form({ values: "1" }))).toEqual({ form: "Knapsack requires matching weights and values." });
    expect(validateDynamicProgrammingForm("edit_distance", form({ textB: "x".repeat(13) }))).toEqual({ textB: "Target string must be 12 characters or fewer." });
    expect(validateDynamicProgrammingForm("unique_paths", form({ cols: "0" }))).toEqual({ cols: "Columns must be between 1 and 12." });
  });

  it("names a field for every message prefix", () => {
    expect([
      "n must", "Coins must", "Amount must", "Weights must", "Values must", "Capacity must",
      "First string must", "Source string must", "Second string must", "Target string must", "Rows must", "Columns must",
    ].map(dynamicProgrammingErrorField)).toEqual([
      "n", "coins", "amount", "weights", "values", "capacity", "textA", "textA", "textB", "textB", "rows", "cols",
    ]);
    expect(dynamicProgrammingErrorField("Knapsack requires matching weights and values.")).toBeNull();
  });

  it("falls back to the default request while the form is invalid", () => {
    for (const algorithm of ALGORITHMS) {
      expect(() => createDefaultRequest(algorithm)).not.toThrow();
    }
    expect(safeRequest("coin_change", form({ coins: "", amount: "7" }))).toEqual({ algorithm: "coin_change", coins: [1, 3, 4], amount: 6 });
    expect(safeRequest("unique_paths", form({ rows: "4" }))).toEqual({ algorithm: "unique_paths", rows: 4, cols: 7 });
  });

  it("round-trips every preset through the form", () => {
    for (const preset of DYNAMIC_PROGRAMMING_PRESETS) {
      const fields = formFieldsFromRequest(preset.request);
      expect(createRequest(preset.algorithm, form(fields))).toEqual({ algorithm: preset.algorithm, ...preset.request });
    }
  });
});
