export type TreeAlgorithm =
  | "bst_insert"
  | "avl_insert"
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
  | "balance_check"
  | "imbalance"
  | "rotate"
  | "done";

export type TreeRotationType =
  | "left"
  | "right"
  | "left_right"
  | "right_left";

export interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
  height?: number;
  balance_factor?: number;
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
  imbalanced_node?: number | null;
  rotation_type?: TreeRotationType | null;
  rotation_nodes?: number[];
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
  avl_insert: "AVL Tree Insert",
  bst_search: "BST Search",
  inorder_traversal: "Inorder Traversal",
  preorder_traversal: "Preorder Traversal",
  postorder_traversal: "Postorder Traversal",
};
