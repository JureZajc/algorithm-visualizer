from copy import deepcopy

import pytest

from app.algorithms.metadata import ALGORITHM_METADATA
from app.algorithms.trees import (
    bst_insert_steps,
    bst_search_steps,
    inorder_traversal_steps,
    postorder_traversal_steps,
    preorder_traversal_steps,
)
from app.algorithms.trees.types import TreeNode, TreeStep


VALUES = [8, 3, 10, 1, 6, 14, 4, 7, 13]
EXPECTED_TREE: TreeNode = {
    "value": 8,
    "left": {
        "value": 3,
        "left": {"value": 1, "left": None, "right": None},
        "right": {
            "value": 6,
            "left": {"value": 4, "left": None, "right": None},
            "right": {"value": 7, "left": None, "right": None},
        },
    },
    "right": {
        "value": 10,
        "left": None,
        "right": {
            "value": 14,
            "left": {"value": 13, "left": None, "right": None},
            "right": None,
        },
    },
}
STEP_KEYS = {
    "type",
    "tree",
    "current_node",
    "target",
    "visited",
    "path",
    "result",
    "description",
    "pseudocode_line",
}
PSEUDOCODE_LENGTHS = {item.id: len(item.pseudocode) for item in ALGORITHM_METADATA}


@pytest.mark.parametrize(
    ("algorithm_id", "steps"),
    [
        ("bst_insert", bst_insert_steps(VALUES)),
        ("bst_search", bst_search_steps(VALUES, 7)),
        ("inorder_traversal", inorder_traversal_steps(VALUES)),
        ("preorder_traversal", preorder_traversal_steps(VALUES)),
        ("postorder_traversal", postorder_traversal_steps(VALUES)),
    ],
)
def test_tree_algorithm_contract(
    algorithm_id: str,
    steps: list[TreeStep],
) -> None:
    assert steps
    assert steps[-1]["type"] == "done"

    for step in steps:
        assert set(step) == STEP_KEYS
        assert isinstance(step["visited"], list)
        assert isinstance(step["path"], list)
        assert step["description"]
        assert step["pseudocode_line"] is not None
        assert 1 <= step["pseudocode_line"] <= PSEUDOCODE_LENGTHS[algorithm_id]


def test_bst_insert_creates_expected_tree_and_inorder_result() -> None:
    values = VALUES.copy()
    original = values.copy()

    steps = bst_insert_steps(values)

    assert values == original
    assert steps[-1]["tree"] == EXPECTED_TREE
    assert steps[-1]["result"] == {
        "root": EXPECTED_TREE,
        "values": VALUES,
        "inorder": sorted(VALUES),
    }


def test_bst_search_finds_existing_value() -> None:
    steps = bst_search_steps(VALUES, 7)

    assert steps[-2]["type"] == "found"
    assert steps[-2]["result"] == {
        "found": True,
        "target": 7,
        "path": [8, 3, 6, 7],
    }
    assert steps[-1]["result"] == steps[-2]["result"]


def test_bst_search_returns_not_found_for_missing_value() -> None:
    steps = bst_search_steps(VALUES, 5)

    assert steps[-2]["type"] == "not_found"
    assert steps[-2]["result"] == {
        "found": False,
        "target": 5,
        "path": [8, 3, 6, 4],
    }
    assert steps[-1]["result"] == steps[-2]["result"]


def test_inorder_traversal_returns_sorted_values() -> None:
    steps = inorder_traversal_steps(VALUES)

    assert steps[-1]["result"] == {"order": sorted(VALUES)}
    assert steps[-1]["visited"] == sorted(VALUES)


def test_preorder_traversal_returns_expected_order() -> None:
    steps = preorder_traversal_steps(VALUES)

    assert steps[-1]["result"] == {
        "order": [8, 3, 1, 6, 4, 7, 10, 14, 13],
    }


def test_postorder_traversal_returns_expected_order() -> None:
    steps = postorder_traversal_steps(VALUES)

    assert steps[-1]["result"] == {
        "order": [1, 4, 7, 6, 3, 13, 14, 10, 8],
    }


def test_tree_step_states_are_independent_copies() -> None:
    steps = bst_insert_steps(VALUES)
    first_tree = deepcopy(steps[0]["tree"])

    assert len({id(step["visited"]) for step in steps}) == len(steps)
    assert len({id(step["path"]) for step in steps}) == len(steps)
    assert steps[0]["tree"] == first_tree
    assert steps[0]["tree"] != steps[-1]["tree"]
