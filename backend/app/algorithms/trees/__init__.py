from collections.abc import Callable

from app.algorithms.trees.binary_search_tree import (
    bst_insert_steps,
    bst_search_steps,
    inorder_traversal_steps,
    postorder_traversal_steps,
    preorder_traversal_steps,
)
from app.algorithms.trees.types import TreeAlgorithm, TreeStep


TreeFunction = Callable[..., list[TreeStep]]

TREES_ALGORITHMS: dict[TreeAlgorithm, TreeFunction] = {
    "bst_insert": bst_insert_steps,
    "bst_search": bst_search_steps,
    "inorder_traversal": inorder_traversal_steps,
    "preorder_traversal": preorder_traversal_steps,
    "postorder_traversal": postorder_traversal_steps,
}

__all__ = [
    "TREES_ALGORITHMS",
    "bst_insert_steps",
    "bst_search_steps",
    "inorder_traversal_steps",
    "postorder_traversal_steps",
    "preorder_traversal_steps",
]
