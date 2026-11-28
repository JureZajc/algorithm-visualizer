import { binarySearchQuestion, bubbleSortQuestion, insertionSortQuestion, linearSearchQuestion, selectionSortQuestion } from "./arrays";
import { nQueensQuestion } from "./backtracking";
import { fibonacciQuestion } from "./dynamic-programming";
import { bfsQuestion, dfsQuestion } from "./graph";
import { hashTableQuestion } from "./hash-tables";
import { treeQuestion } from "./trees";
import type { LearningQuestion, LearningRunContext, LearningStep } from "./types";

type Strategy = (steps: readonly LearningStep[], index: number, context: LearningRunContext) => LearningQuestion | null;

const strategies: Record<string, Strategy> = {
  bubble_sort: bubbleSortQuestion,
  selection_sort: selectionSortQuestion,
  insertion_sort: insertionSortQuestion,
  linear_search: linearSearchQuestion,
  binary_search: binarySearchQuestion,
  bst_insert: (steps, index) => treeQuestion("bst_insert", steps, index),
  bst_search: (steps, index) => treeQuestion("bst_search", steps, index),
  bfs: bfsQuestion,
  dfs: dfsQuestion,
  fibonacci: fibonacciQuestion,
  n_queens: nQueensQuestion,
  hash_insert_chaining: (steps, index) => hashTableQuestion("hash_insert_chaining", steps, index),
  hash_search_chaining: (steps, index) => hashTableQuestion("hash_search_chaining", steps, index),
  hash_insert_linear_probing: (steps, index) => hashTableQuestion("hash_insert_linear_probing", steps, index),
  hash_search_linear_probing: (steps, index) => hashTableQuestion("hash_search_linear_probing", steps, index),
};

export function supportsLearning(algorithm: string): boolean {
  return Object.hasOwn(strategies, algorithm);
}

export function generateQuestions(algorithm: string, steps: readonly LearningStep[], context: LearningRunContext = {}): LearningQuestion[] {
  if (!supportsLearning(algorithm)) return [];
  const questions: LearningQuestion[] = [];
  for (let index = 1; index < steps.length; index++) {
    const candidate = strategies[algorithm](steps, index, context);
    if (candidate) questions.push(candidate);
  }
  return questions;
}
