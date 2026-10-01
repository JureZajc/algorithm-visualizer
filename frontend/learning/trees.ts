import { question, type LearningQuestion, type LearningStep } from "./types";

export function treeQuestion(algorithm: "bst_insert" | "bst_search", steps: readonly LearningStep[], index: number): LearningQuestion | null {
  const step = steps[index];
  if (!step || !("tree" in step) || step.type !== "compare" || step.target === null || step.current_node === null) return null;
  const target = step.target;
  const current = step.current_node;
  if (algorithm === "bst_insert") {
    return question(algorithm, index, "insert-direction",
      `Insert ${target}: which direction should insertion follow from node ${current}?`,
      ["Follow the left child", "Follow the right child", "Replace the root", "Finish without inserting"],
      target < current ? 0 : 1,
      target < current ? `${target} is smaller than ${current}, so insertion follows the left child.`
        : `${target} is ${target === current ? "equal to" : "larger than"} ${current}. This BST inserts equal or larger values along the right child.`);
  }
  return question(algorithm, index, "target-comparison",
    `Target: ${target}. How does it compare with node ${current}?`,
    ["The target is smaller", "The target is equal", "The target is larger"],
    target < current ? 0 : target === current ? 1 : 2,
    target === current ? "The target equals this node, so the search has found its value."
      : `${target} is ${target < current ? "smaller" : "larger"} than ${current}; the search follows the ${target < current ? "left" : "right"} child.`);
}
