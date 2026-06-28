export type TreeAlgorithm =
  | "bst_insert"
  | "bst_search"
  | "inorder_traversal"
  | "preorder_traversal"
  | "postorder_traversal";

export type TreeStepType =
  | "compare"
  | "insert"
  | "visit"
  | "found"
  | "not_found"
  | "traverse"
  | "done";

export interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

export interface TreeStep {
  type: TreeStepType;
  tree: TreeNode | null;
  current_node: number | null;
  target: number | null;
  visited: number[];
  path: number[];
  result: Record<string, unknown> | null;
  description: string;
  pseudocode_line: number | null;
}

export interface TreeRequest {
  algorithm: TreeAlgorithm;
  values: number[];
  target?: number | null;
}

export interface TreeResponse {
  algorithm: TreeAlgorithm;
  input: Record<string, unknown>;
  steps: TreeStep[];
  step_count: number;
}

export const TREE_ALGORITHM_LABELS: Record<TreeAlgorithm, string> = {
  bst_insert: "BST Insert",
  bst_search: "BST Search",
  inorder_traversal: "Inorder Traversal",
  preorder_traversal: "Preorder Traversal",
  postorder_traversal: "Postorder Traversal",
};
