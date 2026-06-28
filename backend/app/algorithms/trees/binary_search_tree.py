from collections.abc import Callable

from app.algorithms.trees.types import (
    TreeNode,
    TreeStep,
    TreeValue,
    clone_tree,
    create_tree_step,
)


def bst_insert_steps(values: list[int]) -> list[TreeStep]:
    """Build a binary search tree while showing each comparison and insertion."""

    root: TreeNode | None = None
    steps: list[TreeStep] = []

    for value in values:
        if root is None:
            root = _node(value)
            steps.append(
                create_tree_step(
                    "insert",
                    root,
                    f"Insert {value} as the root node.",
                    current_node=value,
                    path=[value],
                    pseudocode_line=2,
                )
            )
            continue

        current = root
        path: list[TreeValue] = []
        while current is not None:
            path.append(current["value"])
            direction = "left" if value < current["value"] else "right"
            steps.append(
                create_tree_step(
                    "compare",
                    root,
                    f"Compare {value} with {current['value']} and move {direction}.",
                    current_node=current["value"],
                    target=value,
                    path=path,
                    pseudocode_line=3,
                )
            )

            child_key = "left" if value < current["value"] else "right"
            child = current[child_key]
            if child is None:
                current[child_key] = _node(value)
                path.append(value)
                steps.append(
                    create_tree_step(
                        "insert",
                        root,
                        f"Insert {value} as the {child_key} child of {current['value']}.",
                        current_node=value,
                        target=value,
                        path=path,
                        pseudocode_line=5,
                    )
                )
                break
            current = child

    result = {
        "root": clone_tree(root),
        "values": values.copy(),
        "inorder": _inorder_values(root),
    }
    steps.append(
        create_tree_step(
            "done",
            root,
            "BST insertion is complete.",
            visited=_inorder_values(root),
            result=result,
            pseudocode_line=6,
        )
    )
    return steps


def bst_search_steps(values: list[int], target: int) -> list[TreeStep]:
    """Search a binary search tree for a target value."""

    root = build_bst(values)
    steps: list[TreeStep] = []
    current = root
    path: list[TreeValue] = []
    result: dict[str, object] | None = None

    while current is not None:
        path.append(current["value"])
        steps.append(
            create_tree_step(
                "compare",
                root,
                f"Compare target {target} with node {current['value']}.",
                current_node=current["value"],
                target=target,
                path=path,
                pseudocode_line=2,
            )
        )

        if current["value"] == target:
            result = {"found": True, "target": target, "path": path.copy()}
            steps.append(
                create_tree_step(
                    "found",
                    root,
                    f"Found {target} in the tree.",
                    current_node=current["value"],
                    target=target,
                    path=path,
                    result=result,
                    pseudocode_line=4,
                )
            )
            break

        if target < current["value"]:
            current = current["left"]
        else:
            current = current["right"]
    else:
        result = {"found": False, "target": target, "path": path.copy()}
        steps.append(
            create_tree_step(
                "not_found",
                root,
                f"Target {target} is not in the tree.",
                target=target,
                path=path,
                result=result,
                pseudocode_line=7,
            )
        )

    steps.append(
        create_tree_step(
            "done",
            root,
            "BST search is complete.",
            target=target,
            path=path,
            result=result,
            pseudocode_line=8,
        )
    )
    return steps


def inorder_traversal_steps(values: list[int]) -> list[TreeStep]:
    """Traverse a binary search tree in left-root-right order."""

    return _traversal_steps(
        values,
        "inorder",
        "Inorder traversal is complete.",
        _inorder_traverse,
    )


def preorder_traversal_steps(values: list[int]) -> list[TreeStep]:
    """Traverse a binary search tree in root-left-right order."""

    return _traversal_steps(
        values,
        "preorder",
        "Preorder traversal is complete.",
        _preorder_traverse,
    )


def postorder_traversal_steps(values: list[int]) -> list[TreeStep]:
    """Traverse a binary search tree in left-right-root order."""

    return _traversal_steps(
        values,
        "postorder",
        "Postorder traversal is complete.",
        _postorder_traverse,
    )


def build_bst(values: list[int]) -> TreeNode | None:
    """Build a binary search tree without emitting steps."""

    root: TreeNode | None = None
    for value in values:
        root = _insert_value(root, value)
    return root


def _node(value: int) -> TreeNode:
    return {"value": value, "left": None, "right": None}


def _insert_value(root: TreeNode | None, value: int) -> TreeNode:
    if root is None:
        return _node(value)

    current = root
    while True:
        if value < current["value"]:
            if current["left"] is None:
                current["left"] = _node(value)
                break
            current = current["left"]
        else:
            if current["right"] is None:
                current["right"] = _node(value)
                break
            current = current["right"]
    return root


def _traversal_steps(
    values: list[int],
    traversal_name: str,
    done_description: str,
    visit: Callable[
        [TreeNode | None, TreeNode | None, list[TreeStep], list[TreeValue], list[TreeValue]],
        None,
    ],
) -> list[TreeStep]:
    root = build_bst(values)
    steps: list[TreeStep] = []
    visited: list[TreeValue] = []
    visit(root, root, steps, visited, [])
    result = {"order": visited.copy()}
    steps.append(
        create_tree_step(
            "done",
            root,
            done_description,
            visited=visited,
            result=result,
            pseudocode_line=6,
        )
    )
    if not steps[:-1]:
        steps[0]["description"] = f"{traversal_name.title()} traversal is complete."
    return steps


def _inorder_traverse(
    root: TreeNode | None,
    node: TreeNode | None,
    steps: list[TreeStep],
    visited: list[TreeValue],
    path: list[TreeValue],
) -> None:
    if node is None:
        return

    current_path = [*path, node["value"]]
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the left subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=2,
        )
    )
    _inorder_traverse(root, node["left"], steps, visited, current_path)
    _visit_node(root, node, steps, visited, current_path, 3)
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the right subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=4,
        )
    )
    _inorder_traverse(root, node["right"], steps, visited, current_path)


def _preorder_traverse(
    root: TreeNode | None,
    node: TreeNode | None,
    steps: list[TreeStep],
    visited: list[TreeValue],
    path: list[TreeValue],
) -> None:
    if node is None:
        return

    current_path = [*path, node["value"]]
    _visit_node(root, node, steps, visited, current_path, 2)
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the left subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=3,
        )
    )
    _preorder_traverse(root, node["left"], steps, visited, current_path)
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the right subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=4,
        )
    )
    _preorder_traverse(root, node["right"], steps, visited, current_path)


def _postorder_traverse(
    root: TreeNode | None,
    node: TreeNode | None,
    steps: list[TreeStep],
    visited: list[TreeValue],
    path: list[TreeValue],
) -> None:
    if node is None:
        return

    current_path = [*path, node["value"]]
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the left subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=2,
        )
    )
    _postorder_traverse(root, node["left"], steps, visited, current_path)
    steps.append(
        create_tree_step(
            "traverse",
            root,
            f"Move to the right subtree of {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=current_path,
            pseudocode_line=3,
        )
    )
    _postorder_traverse(root, node["right"], steps, visited, current_path)
    _visit_node(root, node, steps, visited, current_path, 4)


def _visit_node(
    root: TreeNode | None,
    node: TreeNode,
    steps: list[TreeStep],
    visited: list[TreeValue],
    path: list[TreeValue],
    pseudocode_line: int,
) -> None:
    visited.append(node["value"])
    steps.append(
        create_tree_step(
            "visit",
            root,
            f"Visit node {node['value']}.",
            current_node=node["value"],
            visited=visited,
            path=path,
            pseudocode_line=pseudocode_line,
        )
    )


def _inorder_values(node: TreeNode | None) -> list[TreeValue]:
    if node is None:
        return []
    return [
        *_inorder_values(node["left"]),
        node["value"],
        *_inorder_values(node["right"]),
    ]
