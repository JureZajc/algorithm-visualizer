import { describe, expect, it } from "vitest";
import { generateQuestions, supportsLearning } from "@/learning/question-generator";
import { selectCheckpoints } from "@/learning/checkpoint-selector";
import { question } from "@/learning/types";
import type { HashTableStep } from "@/types/hash-tables";
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

  it.each(["bubble", "selection", "insertion", "linear_found", "binary_right", "bst_insert", "bst_search", "bfs", "dfs", "fibonacci_8", "n_queens",
    "hash_chaining_insert", "hash_chaining_found", "hash_probing_insert_wrap", "hash_probing_absent"])("provides checkpoints for supported algorithm %s", (name) => {
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

  it.each(["selection", "insertion", "linear_found", "linear_absent", "dfs", "hash_chaining_insert", "hash_probing_absent"])("derives %s questions from step state, not descriptions or pseudocode lines", (name) => {
    const sample = run(name);
    const expected = generateQuestions(sample.algorithm, sample.steps, sample.context);
    for (const step of sample.steps) {
      step.description = "unrelated text";
      delete step.pseudocode_line;
    }
    expect(generateQuestions(sample.algorithm, sample.steps, sample.context)).toEqual(expected);
  });

  it("tracks the Selection Sort minimum, keeps the first of equal values, and places it without equal distractors", () => {
    const sample = run("selection");
    const questions = generateQuestions(sample.algorithm, sample.steps);
    const candidates = questions.filter((item) => item.kind === "minimum-candidate");
    expect(candidates.some((item) => item.correctChoice === 0)).toBe(true);
    expect(candidates.some((item) => item.correctChoice === 1)).toBe(true);
    const tie = candidates.find((item) => item.prompt.includes("minimum is 1 at index 1") && item.prompt.includes("1 at index 3"));
    expect(tie?.choices[tie.correctChoice]).toBe("Index 1 (1)");
    const placements = questions.filter((item) => item.kind === "place-minimum");
    expect(placements.map((item) => item.stepIndex)).toEqual([5, 10, 14, 18]);
    expect(placements[0].choices).toEqual(["3 at index 0", "1 at index 1", "4 at index 2", "2 at index 5"]);
    expect(placements[0].correctChoice).toBe(1);
    expect(placements.at(-1)?.choices).toEqual(["5 at index 4", "4 at index 5"]);
    // A pass whose minimum is already in place ends without a swap, so it asks nothing.
    expect(questions.some((item) => item.stepIndex === 17)).toBe(false);
    const sorted = run("selection_sorted");
    expect(generateQuestions(sorted.algorithm, sorted.steps).map((item) => item.kind)).toEqual(["minimum-candidate"]);
  });

  it("follows the value Insertion Sort is inserting across shifts", () => {
    const sample = run("insertion");
    const questions = generateQuestions(sample.algorithm, sample.steps);
    const decisions = questions.filter((item) => item.kind === "shift-or-stop");
    // After a shift, the inserted value's slot holds a copy of the shifted value.
    expect(decisions.map((item) => item.prompt.split(":")[0])).toEqual(
      ["Inserting 1", "Inserting 4", "Inserting 1", "Inserting 1", "Inserting 1", "Inserting 5", "Inserting 2", "Inserting 2", "Inserting 2", "Inserting 2"]);
    expect(decisions.filter((item) => item.correctChoice === 0).map((item) => item.stepIndex)).toEqual([1, 5, 7, 12, 14, 16]);
    const equal = decisions.find((item) => item.stepIndex === 9);
    expect(equal?.prompt).toBe("Inserting 1: it was compared with 1 at index 0. What happens next?");
    expect(equal?.choices[equal.correctChoice]).toBe("Stop shifting: 1 belongs at index 1");
    expect(decisions.find((item) => item.stepIndex === 4)?.explanation).toContain("where it already is");
    const nextValues = questions.filter((item) => item.kind === "next-value");
    expect(nextValues.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([[3, "4 at index 2"], [10, "5 at index 4"]]);
    const sorted = run("insertion_sorted");
    expect(generateQuestions(sorted.algorithm, sorted.steps).map((item) => item.correctChoice)).toEqual([1, 1]);
    // The second 5 would also be "5", so it is not offered next to the one being inserted.
    const duplicates = run("insertion_duplicates");
    const next = generateQuestions(duplicates.algorithm, duplicates.steps).find((item) => item.kind === "next-value");
    expect(next?.choices).toEqual(["1 at index 0", "3 at index 1", "5 at index 2"]);
    expect(next?.correctChoice).toBe(2);
  });

  it.each([["linear_found", [0, 0, 1]], ["linear_first", [1]], ["linear_absent", [0, 0, 2]]] as const)("predicts linear search actions for %s", (name, answers) => {
    const sample = run(name);
    const questions = generateQuestions(sample.algorithm, sample.steps, sample.context);
    expect(questions.map((item) => item.correctChoice)).toEqual(answers);
    expect(questions.every((item) => item.prompt.startsWith(`Target: ${sample.context.target}.`))).toBe(true);
    expect(generateQuestions(sample.algorithm, sample.steps)).toEqual([]);
  });

  it("uses LIFO stack order for DFS and predicts which neighbors are pushed", () => {
    const sample = run("dfs");
    const questions = generateQuestions(sample.algorithm, sample.steps, sample.context);
    const pops = questions.filter((item) => item.kind === "pop-node");
    expect(pops.map((item) => item.choices[item.correctChoice])).toEqual(["Node A", "Node B"]);
    // C sits below B on the stack: the node a queue would take is offered as a distractor.
    expect(pops[1].choices).toContain("Node C");
    const decisions = questions.filter((item) => item.kind === "push-decision");
    expect(decisions.map((item) => item.choices[item.correctChoice].split(" ")[0])).toEqual(["Push", "Push", "Push", "Skip", "Push", "Skip", "Skip"]);
    expect(decisions.find((item) => item.prompt.includes("D → C"))?.explanation).toContain("already on the stack");
    expect(decisions.find((item) => item.prompt.includes("B → A"))?.explanation).toContain("already visited");
    const withoutLabels = generateQuestions(sample.algorithm, sample.steps, { nodes: ["A"] });
    expect(withoutLabels.some((item) => item.kind === "pop-node")).toBe(false);
    expect(withoutLabels.filter((item) => item.kind === "push-decision")).toEqual(decisions);
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

  it.each([
    ["hash_chaining_insert", ["chain-or-place", "hash-bucket"]],
    ["hash_string_insert", ["chain-or-place"]],
    ["hash_probing_insert_wrap", ["hash-bucket", "next-probe"]],
    ["hash_chaining_found", ["search-outcome"]],
    ["hash_probing_absent", ["next-probe", "search-outcome"]],
  ] as const)("asks only the hash table questions that fit %s", (name, kinds) => {
    const sample = run(name);
    expect([...new Set(generateQuestions(sample.algorithm, sample.steps).map((item) => item.kind))].sort()).toEqual(kinds);
  });

  it("asks which bucket an integer key hashes to, and never for string or negative keys", () => {
    const chaining = run("hash_chaining_insert");
    const buckets = generateQuestions(chaining.algorithm, chaining.steps).filter((item) => item.kind === "hash-bucket");
    // The first key is hashed at step 0, before any checkpoint can open.
    expect(buckets.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([[3, "Bucket 2"], [7, "Bucket 2"], [11, "Bucket 5"]]);
    expect(buckets[0].prompt).toBe("22 is hashed next. The table has 10 buckets. Which bucket does 22 hash to?");
    expect(buckets[0].choices).toEqual(["Bucket 1", "Bucket 2", "Bucket 3", "Bucket 4"]);
    expect(buckets[1].explanation).toContain("32 mod 10 = 2, because 32 = 3 × 10 + 2.");
    const probing = run("hash_probing_insert_wrap");
    const slots = generateQuestions(probing.algorithm, probing.steps).filter((item) => item.kind === "hash-bucket");
    expect(slots.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([[3, "Slot 4"], [8, "Slot 4"], [15, "Slot 3"]]);
    // "cat" and "act" hash by their character-code sums, which is no fair mental calculation.
    const strings = run("hash_string_insert");
    expect(generateQuestions(strings.algorithm, strings.steps).some((item) => item.kind === "hash-bucket")).toBe(false);
    // The backend floors negative keys (-8 mod 10 = 2), where JavaScript's remainder is -8.
    const negative = run("hash_chaining_insert");
    (negative.steps[3] as HashTableStep).key = -8;
    expect(generateQuestions(negative.algorithm, negative.steps).some((item) => item.stepIndex === 3)).toBe(false);
  });

  it("predicts whether a chaining insert starts a bucket or extends its chain", () => {
    const sample = run("hash_chaining_insert");
    const chains = generateQuestions(sample.algorithm, sample.steps).filter((item) => item.kind === "chain-or-place");
    expect(chains.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([
      [2, "As the first key in bucket 2"], [5, "Appended to the chain in bucket 2"], [9, "Appended to the chain in bucket 2"], [13, "As the first key in bucket 5"]]);
    expect(chains[2].prompt).toBe("Bucket 2 has been inspected for 32. How is 32 stored?");
    expect(chains[2].explanation).toContain("already holds 12, 22");
    const strings = run("hash_string_insert");
    expect(generateQuestions(strings.algorithm, strings.steps).map((item) => [item.stepIndex, item.correctChoice])).toEqual([[2, 0], [5, 1], [9, 0]]);
  });

  it("predicts the next linear probe, wrapping from the last slot to slot 0", () => {
    const insert = run("hash_probing_insert_wrap");
    const inserts = generateQuestions(insert.algorithm, insert.steps).filter((item) => item.kind === "next-probe");
    expect(inserts.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([[6, "Slot 0"], [11, "Slot 0"], [13, "Slot 1"]]);
    expect(inserts[0].prompt).toBe("Slot 4 already holds 4, so 9 cannot go there. Which slot does linear probing check next?");
    expect(inserts[0].choices).toEqual(["Slot 0", "Slot 1", "Slot 3", "Slot 4"]);
    expect(inserts[0].explanation).toContain("wraps around to slot 0");
    const search = run("hash_probing_absent");
    const searches = generateQuestions(search.algorithm, search.steps).filter((item) => item.kind === "next-probe");
    expect(searches.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual([[3, "Slot 0"], [5, "Slot 1"], [7, "Slot 2"]]);
    expect(searches[0].prompt).toBe("Slot 4 holds 4, not 19. Which slot does linear probing check next?");
  });

  it.each([
    ["hash_chaining_found", [[2, "It finds 32 in bucket 2"]]],
    ["hash_chaining_absent", [[2, "It stops: 42 is not in the table"]]],
    ["hash_chaining_empty_bucket", [[2, "It stops: 7 is not in the table"]]],
    ["hash_probing_found", [[2, "It checks the next slot"], [4, "It checks the next slot"], [6, "It finds 14 in slot 1"]]],
    ["hash_probing_absent", [[2, "It checks the next slot"], [4, "It checks the next slot"], [6, "It checks the next slot"], [8, "It stops: 19 is not in the table"]]],
    // Slot 1 is the full table's last unprobed slot: the search ends there without an empty slot, so it is not asked.
    ["hash_probing_full", [[2, "It checks the next slot"]]],
  ] as const)("predicts the search outcome at each inspected slot for %s", (name, answers) => {
    const sample = run(name);
    const outcomes = generateQuestions(sample.algorithm, sample.steps).filter((item) => item.kind === "search-outcome");
    expect(outcomes.map((item) => [item.stepIndex, item.choices[item.correctChoice]])).toEqual(answers);
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
