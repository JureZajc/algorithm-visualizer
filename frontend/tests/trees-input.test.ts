import { describe, expect, it } from "vitest";
import { validateTarget, validateTreeValues } from "@/lib/trees-input";

describe("tree values", () => {
  it("accepts 1 to 31 unique integers", () => {
    expect(validateTreeValues("8, 3, 10, 1, 6, 14, 4, 7, 13")).toEqual({ ok: true, values: [8, 3, 10, 1, 6, 14, 4, 7, 13] });
    expect(validateTreeValues(" -5,0 , 5 ")).toEqual({ ok: true, values: [-5, 0, 5] });
    const thirtyOne = Array.from({ length: 31 }, (_, index) => index + 1);
    expect(validateTreeValues(thirtyOne.join(","))).toEqual({ ok: true, values: thirtyOne });
  });

  it.each([
    ["", "Enter 1 to 31 comma-separated integer values."],
    ["   ", "Enter 1 to 31 comma-separated integer values."],
    ["1,,2", "Use commas between values without empty entries."],
    ["1, 2,", "Use commas between values without empty entries."],
    ["1, a", "Tree values must be numbers, like 10, 20, 30."],
    ["1.5", "Tree values must be numbers, like 10, 20, 30."],
    [Array.from({ length: 32 }, (_, index) => index).join(","), "Enter 1 to 31 values."],
    ["4, 2, 4", "Tree values must be unique. Duplicate value: 4."],
  ])("rejects %j", (raw, error) => {
    expect(validateTreeValues(raw)).toEqual({ ok: false, error });
  });
});

describe("tree search target", () => {
  it("ignores the target unless the algorithm searches", () => {
    expect(validateTarget("not a number", false)).toEqual({ ok: true, target: null });
  });

  it("requires an integer target for a search", () => {
    expect(validateTarget("7", true)).toEqual({ ok: true, target: 7 });
    expect(validateTarget("-2", true)).toEqual({ ok: true, target: -2 });
    for (const raw of ["", " ", "1.5", "seven"]) {
      expect(validateTarget(raw, true)).toEqual({ ok: false, error: "Enter an integer target value." });
    }
  });
});
