import { describe, expect, it } from "vitest";
import * as searching from "@/lib/searching-input";
import * as sorting from "@/lib/sorting-input";

describe("sorting count", () => {
  it("accepts 5 to 50 values", () => {
    expect(sorting.validateCountDraft("5")).toEqual({ error: null, value: 5 });
    expect(sorting.validateCountDraft(" 50 ")).toEqual({ error: null, value: 50 });
  });

  it("explains out-of-range and non-integer counts", () => {
    for (const raw of ["4", "51", "", "0"]) {
      expect(sorting.validateCountDraft(raw)).toEqual({ error: "Random values must be between 5 and 50.", value: null });
    }
    for (const raw of ["7.5", "ten"]) {
      expect(sorting.validateCountDraft(raw)).toEqual({ error: "Enter a whole number from 5 to 50.", value: null });
    }
  });
});

describe("searching count and target", () => {
  it("accepts 5 to 40 values", () => {
    expect(searching.validateCountDraft("5")).toEqual({ error: null, value: 5 });
    expect(searching.validateCountDraft("40")).toEqual({ error: null, value: 40 });
    expect(searching.validateCountDraft("41")).toEqual({ error: "Random values must be between 5 and 40.", value: null });
    expect(searching.validateCountDraft("x")).toEqual({ error: "Enter a whole number from 5 to 40.", value: null });
  });

  it("accepts any integer target and rejects fractions and text", () => {
    expect(searching.validateTarget(" 67 ")).toEqual({ error: null, target: 67 });
    expect(searching.validateTarget("-3")).toEqual({ error: null, target: -3 });
    for (const raw of ["1.5", "abc"]) {
      expect(searching.validateTarget(raw)).toEqual({ error: "Enter an integer target value.", target: null });
    }
  });

  it("reads an empty target as 0, as the component did before the move", () => {
    expect(searching.validateTarget("")).toEqual({ error: null, target: 0 });
  });
});
