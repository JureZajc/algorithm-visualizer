from typing import Literal, TypeAlias, TypedDict


TreeAlgorithm = Literal[
    "bst_insert",
    "bst_search",
    "inorder_traversal",
    "preorder_traversal",
    "postorder_traversal",
]

TreeStepType = Literal[
    "compare",
    "insert",
    "visit",
    "found",
    "not_found",
    "traverse",
    "done",
]

TreeValue: TypeAlias = int
TreeResult: TypeAlias = dict[str, object]


class TreeNode(TypedDict):
    """A binary tree node snapshot."""

    value: TreeValue
    left: "TreeNode | None"
    right: "TreeNode | None"


class TreeStep(TypedDict):
    """A single visual state produced by a tree algorithm."""

    type: TreeStepType
    tree: TreeNode | None
    current_node: TreeValue | None
    target: TreeValue | None
    visited: list[TreeValue]
    path: list[TreeValue]
    result: TreeResult | None
    description: str
    pseudocode_line: int | None


def clone_tree(node: TreeNode | None) -> TreeNode | None:
    """Create an independent recursive tree snapshot."""

    if node is None:
        return None
    return {
        "value": node["value"],
        "left": clone_tree(node["left"]),
        "right": clone_tree(node["right"]),
    }


def create_tree_step(
    step_type: TreeStepType,
    tree: TreeNode | None,
    description: str,
    *,
    current_node: TreeValue | None = None,
    target: TreeValue | None = None,
    visited: list[TreeValue] | None = None,
    path: list[TreeValue] | None = None,
    result: TreeResult | None = None,
    pseudocode_line: int | None = None,
) -> TreeStep:
    """Create a tree step with independent copies of mutable values."""

    return {
        "type": step_type,
        "tree": clone_tree(tree),
        "current_node": current_node,
        "target": target,
        "visited": (visited or []).copy(),
        "path": (path or []).copy(),
        "result": result.copy() if result is not None else None,
        "description": description,
        "pseudocode_line": pseudocode_line,
    }
