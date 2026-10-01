import { describe, expect, it } from "vitest";
import { generateQuestions, supportsLearning } from "@/learning/question-generator";
import { selectCheckpoints } from "@/learning/checkpoint-selector";
import { question } from "@/learning/types";
import { run, runs } from "./learning-fixtures";

describe("question generation", () => {
  it.each(Object.keys(runs))("generates deterministic, valid questions for backend run %s", (name) => {
    const { algorithm, steps, context } = run(name);
    const questions = generateQuestions(algorithm, steps, context);
    expect(questions).toEqual(generateQuestions(algorithm, steps, context));
    expect(new Set(questions.map((item) => item.id)).size).toBe(questions.length);
    for (const item of questions) {
      expect(item.stepIndex).toBeGreaterThan(0);
      expect(item.stepIndex).toBeLessThan(steps.length);
      expect(item.choices.length).toBeGreaterThanOrEqual(2);
      expect(new Set(item.choices).size).toBe(item.choices.length);
      expect(item.choices[item.correctChoice]).toBeTruthy();
      expect(item.prompt).toBeTruthy();
      expect(item.explanation).toBeTruthy();
    }
  });

  it.each(["bubble", "binary_right", "bst_insert", "bst_search", "bfs", "fibonacci_8", "n_queens"])("provides checkpoints for supported algorithm %s", (name) => {
    const { algorithm, steps, context } = run(name);
    expect(selectCheckpoints(generateQuestions(algorithm, steps, context), steps.length).length).toBeGreaterThan(0);
  });

  it("distinguishes duplicate values by index and predicts swap, comparison, and completion", () => {
    const sample = run("bubble");
    const questions = generateQuestions(sample.algorithm, sample.steps);
    const answers = questions.filter((item) => item.kind === "next-operation").map((item) => item.choices[item.correctChoice]);
    expect(answers.some((answer) => answer.startsWith("Swap indices"))).toBe(true);
    expect(answers).toContain("Compare the next adjacent pair");
    expect(questions.some((item) => item.prompt.includes("2 at index 0 and 2 at index 1"))).toBe(true);
    const sorted = run("bubble_sorted");
    expect(generateQuestions(sorted.algorithm, sorted.steps).at(-1)?.choices).toContain("Finish sorting");
    expect(generateQuestions(sorted.algorithm, sorted.steps).at(-1)?.correctChoice).toBe(2);
  });

  it.each([['binary_right', 1], ['binary_left', 0], ['binary_found', 2], ['binary_absent', 3]] as const)("predicts search transitions for %s", (name, correct) => {
    const sample = run(name);
    const questions = generateQuestions(sample.algorithm, sample.steps, sample.context);
    expect(questions.some((item) => item.correctChoice === correct)).toBe(true);
    expect(questions.every((item) => item.prompt.includes(`Target: ${sample.context.target}.`))).toBe(true);
  });

  it("requires captured search context instead of reading description text", () => {
    const sample = run("binary_right");
    expect(generateQuestions(sample.algorithm, sample.steps)).toEqual([]);
    for (const step of sample.steps) step.description = "unrelated text";
    expect(generateQuestions(sample.algorithm, sample.steps, sample.context)[0].correctChoice).toBe(1);
  });

  it("inserts duplicate BST values on the right and compares search targets", () => {
    const insert = run("bst_insert");
    const equal = generateQuestions(insert.algorithm, insert.steps).find((item) => item.prompt.includes("Insert 3:") && item.prompt.includes("node 3"));
    expect(equal?.correctChoice).toBe(1);
    expect(equal?.explanation).toContain("equal to");
    const search = run("bst_search");
    expect(generateQuestions(search.algorithm, search.steps).map((item) => item.correctChoice)).toEqual([2, 1]);
  });

  it("uses FIFO queue order even when node labels are in a different order", () => {
    const sample = run("bfs");
    const questions = generateQuestions(sample.algorithm, sample.steps, sample.context);
    const dequeues = questions.filter((item) => item.kind === "dequeue-node");
    expect(dequeues.map((item) => item.choices[item.correctChoice])).toEqual(["Node A", "Node B", "Node C", "Node D"]);
    expect(questions.some((item) => item.kind === "enqueue-node")).toBe(true);
    expect(generateQuestions(sample.algorithm, sample.steps, { nodes: ["A"] })).toEqual([]);
  });

  it("uses Fibonacci entry numbers rather than wrapped display coordinates", () => {
    const sample = run("fibonacci_15");
    const questions = generateQuestions(sample.algorithm, sample.steps);
    const computed = questions.find((item) => item.kind === "computed-value" && item.prompt.includes("F(13)"));
    expect(computed?.choices[computed.correctChoice]).toBe("233");
    const dependencies = questions.find((item) => item.kind === "dependencies" && item.prompt.includes("F(13)"));
    expect(dependencies?.choices[dependencies.correctChoice]).toBe("F(11) and F(12)");
    expect(generateQuestions("fibonacci", run("fibonacci_0").steps)).toEqual([]);
    expect(generateQuestions("fibonacci", run("fibonacci_1").steps)).toEqual([]);
  });

  it("predicts safe and conflicting N-Queens attempts before their revealing snapshots", () => {
    const sample = run("n_queens");
    const questions = generateQuestions(sample.algorithm, sample.steps);
    const candidates = questions.filter((item) => item.kind === "candidate-validity");
    expect(candidates.some((item) => item.correctChoice === 0)).toBe(true);
    expect(candidates.some((item) => item.correctChoice === 1)).toBe(true);
    expect(questions.some((item) => item.kind === "backtrack")).toBe(true);
    expect(candidates[0].stepIndex).toBe(1);
    expect(candidates[0].prompt).toContain("row 1, column 1");
  });

  it("handles unsupported, empty, and insufficient-context runs", () => {
    expect(supportsLearning("quick_sort")).toBe(false);
    expect(supportsLearning("toString")).toBe(false);
    expect(generateQuestions("quick_sort", run("bubble").steps)).toEqual([]);
    expect(generateQuestions("bubble_sort", [])).toEqual([]);
    expect(question("bubble_sort", 1, "test", "Prompt", ["same", "same"], 0, "Explanation")).toBeNull();
  });
});

describe("checkpoint selection", () => {
  const candidate = (index: number, kind = "comparison") => question("test", index, kind, "Prompt", ["a", "b"], 0, "Explanation")!;

  it("caps a long run at eight evenly distributed, spaced checkpoints without mutating candidates", () => {
    const candidates = Array.from({ length: 99 }, (_, i) => candidate(i + 1));
    const before = structuredClone(candidates);
    const selected = selectCheckpoints(candidates, 100);
    expect(selected).toHaveLength(8);
    expect(selected).toEqual(selectCheckpoints([...candidates].reverse(), 100));
    expect(selected[0].stepIndex).toBe(1);
    expect(selected.at(-1)!.stepIndex).toBeGreaterThan(80);
    expect(selected.slice(1).every((item, i) => item.stepIndex - selected[i].stepIndex >= 3)).toBe(true);
    expect(candidates).toEqual(before);
  });

  it("prefers a less-used question kind inside a bin", () => {
    const selected = selectCheckpoints([candidate(1), candidate(12), candidate(15, "swap")], 81);
    expect(selected.map((item) => item.stepIndex)).toEqual([1, 15]);
  });

  it("enforces spacing in short runs and rejects out-of-range steps", () => {
    expect(selectCheckpoints([candidate(1), candidate(2), candidate(3), candidate(4), candidate(8)], 5).map((item) => item.stepIndex)).toEqual([1, 4]);
    expect(selectCheckpoints([], 0)).toEqual([]);
    expect(selectCheckpoints([candidate(1)], 1)).toEqual([]);
  });
});
