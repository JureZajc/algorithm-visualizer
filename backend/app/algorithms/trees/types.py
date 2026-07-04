from typing import Literal, NotRequired, TypeAlias, TypedDict


TreeAlgorithm = Literal[
    "bst_insert",
    "avl_insert",
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
    "balance_check",
    "imbalance",
    "rotate",
    "done",
]
RotationType = Literal["left", "right", "left_right", "right_left"]

TreeValue: TypeAlias = int
TreeResult: TypeAlias = dict[str, object]


class TreeNode(TypedDict):
    """A binary tree node snapshot."""

    value: TreeValue
    left: "TreeNode | None"
    right: "TreeNode | None"
    height: NotRequired[int]
    balance_factor: NotRequired[int]


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
    imbalanced_node: NotRequired[TreeValue | None]
    rotation_type: NotRequired[RotationType | None]
    rotation_nodes: NotRequired[list[TreeValue]]


def clone_tree(node: TreeNode | None) -> TreeNode | None:
    """Create an independent recursive tree snapshot."""

    if node is None:
        return None
    cloned: TreeNode = {
        "value": node["value"],
        "left": clone_tree(node["left"]),
        "right": clone_tree(node["right"]),
    }
    if "height" in node:
        cloned["height"] = node["height"]
    if "balance_factor" in node:
        cloned["balance_factor"] = node["balance_factor"]
    return cloned


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
    imbalanced_node: TreeValue | None = None,
    rotation_type: RotationType | None = None,
    rotation_nodes: list[TreeValue] | None = None,
) -> TreeStep:
    """Create a tree step with independent copies of mutable values."""

    step: TreeStep = {
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
    if imbalanced_node is not None:
        step["imbalanced_node"] = imbalanced_node
    if rotation_type is not None:
        step["rotation_type"] = rotation_type
    if rotation_nodes is not None:
        step["rotation_nodes"] = rotation_nodes.copy()
    return step
