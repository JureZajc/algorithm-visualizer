from typing import Literal, NotRequired, TypeAlias, TypedDict, cast

from pydantic import ConfigDict, with_config


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
# The algorithms build results as plain dicts. TreeStepResult describes their
# shapes, and the API validates every step against it.
TreeResult: TypeAlias = dict[str, object]

# An undeclared key fails validation instead of being dropped from a response.
_EXACT_KEYS = ConfigDict(extra="forbid")


class TreeNode(TypedDict):
    """A binary tree node snapshot."""

    value: TreeValue
    left: "TreeNode | None"
    right: "TreeNode | None"
    height: NotRequired[int]
    balance_factor: NotRequired[int]


@with_config(_EXACT_KEYS)
class BstInsertResult(TypedDict):
    """Result of a BST insert run: the final tree and its inorder values."""

    root: TreeNode | None
    values: list[TreeValue]
    inorder: list[TreeValue]


@with_config(_EXACT_KEYS)
class AvlInsertResult(TypedDict):
    """Result of an AVL insert run, with the final height and balance check."""

    root: TreeNode | None
    values: list[TreeValue]
    inorder: list[TreeValue]
    height: int
    balanced: bool


@with_config(_EXACT_KEYS)
class BstSearchResult(TypedDict):
    """Result of a BST search: whether the target was found and the path."""

    found: bool
    target: TreeValue
    path: list[TreeValue]


@with_config(_EXACT_KEYS)
class TraversalResult(TypedDict):
    """Result of an inorder, preorder, or postorder traversal."""

    order: list[TreeValue]


TreeStepResult: TypeAlias = (
    BstInsertResult | AvlInsertResult | BstSearchResult | TraversalResult
)


class TreeStep(TypedDict):
    """A single visual state produced by a tree algorithm."""

    type: TreeStepType
    tree: TreeNode | None
    current_node: TreeValue | None
    target: TreeValue | None
    visited: list[TreeValue]
    path: list[TreeValue]
    result: TreeStepResult | None
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
        "result": (cast(TreeStepResult, result.copy()) if result is not None else None),
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
