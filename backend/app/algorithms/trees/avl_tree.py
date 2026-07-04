from typing import Literal

from app.algorithms.trees.types import (
    RotationType,
    TreeNode,
    TreeStep,
    TreeValue,
    clone_tree,
    create_tree_step,
)


ChildKey = Literal["left", "right"]


def avl_insert_steps(values: list[int]) -> list[TreeStep]:
    """Build an AVL tree while showing height updates and rotations."""

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
        path_nodes: list[TreeNode] = []
        path_values: list[TreeValue] = []

        while current is not None:
            path_nodes.append(current)
            path_values.append(current["value"])
            child_key: ChildKey = "left" if value < current["value"] else "right"
            direction = "left" if child_key == "left" else "right"
            steps.append(
                create_tree_step(
                    "compare",
                    root,
                    f"Compare {value} with {current['value']} and move {direction}.",
                    current_node=current["value"],
                    target=value,
                    path=path_values,
                    pseudocode_line=2,
                )
            )

            child = current[child_key]
            if child is None:
                current[child_key] = _node(value)
                path_nodes.append(current[child_key])
                path_values.append(value)
                steps.append(
                    create_tree_step(
                        "insert",
                        root,
                        f"Insert {value} as the {child_key} child of {current['value']}.",
                        current_node=value,
                        target=value,
                        path=path_values,
                        pseudocode_line=2,
                    )
                )
                break
            current = child

        for index in range(len(path_nodes) - 2, -1, -1):
            node = path_nodes[index]
            _update_node(node)
            balance_factor = node["balance_factor"]
            steps.append(
                create_tree_step(
                    "balance_check",
                    root,
                    (
                        f"Update node {node['value']} to height {node['height']} "
                        f"with balance factor {balance_factor}."
                    ),
                    current_node=node["value"],
                    target=value,
                    path=path_values,
                    pseudocode_line=4,
                )
            )

            if abs(balance_factor) <= 1:
                continue

            rotation_type = _rotation_type(node, value)
            rotation_nodes = _rotation_nodes(node, rotation_type)
            steps.append(
                create_tree_step(
                    "imbalance",
                    root,
                    (
                        f"Node {node['value']} is imbalanced with balance factor "
                        f"{balance_factor}; prepare a {_rotation_label(rotation_type)} rotation."
                    ),
                    current_node=node["value"],
                    target=value,
                    path=path_values,
                    pseudocode_line=5,
                    imbalanced_node=node["value"],
                    rotation_type=rotation_type,
                    rotation_nodes=rotation_nodes,
                )
            )

            parent = path_nodes[index - 1] if index > 0 else None
            root = _rebalance(
                root,
                parent,
                node,
                rotation_type,
                rotation_nodes,
                path_values,
                value,
                steps,
            )
            break

    _refresh_tree(root)
    result = {
        "root": clone_tree(root),
        "values": values.copy(),
        "inorder": _inorder_values(root),
        "height": _height(root),
        "balanced": _is_balanced(root),
    }
    steps.append(
        create_tree_step(
            "done",
            root,
            "AVL insertion is complete.",
            visited=_inorder_values(root),
            result=result,
            pseudocode_line=10,
        )
    )
    return steps


def _rebalance(
    root: TreeNode | None,
    parent: TreeNode | None,
    node: TreeNode,
    rotation_type: RotationType,
    rotation_nodes: list[TreeValue],
    path_values: list[TreeValue],
    target: TreeValue,
    steps: list[TreeStep],
) -> TreeNode | None:
    if rotation_type == "left":
        new_subtree = _rotate_left(node)
        root = _replace_subtree(root, parent, node, new_subtree)
        _refresh_tree(root)
        steps.append(
            _rotation_step(
                root,
                "Apply a left rotation to restore AVL balance.",
                new_subtree,
                target,
                path_values,
                rotation_type,
                rotation_nodes,
                6,
            )
        )
        return root

    if rotation_type == "right":
        new_subtree = _rotate_right(node)
        root = _replace_subtree(root, parent, node, new_subtree)
        _refresh_tree(root)
        steps.append(
            _rotation_step(
                root,
                "Apply a right rotation to restore AVL balance.",
                new_subtree,
                target,
                path_values,
                rotation_type,
                rotation_nodes,
                7,
            )
        )
        return root

    if rotation_type == "left_right":
        left_child = node["left"]
        if left_child is None:
            return root
        node["left"] = _rotate_left(left_child)
        _refresh_tree(root)
        steps.append(
            _rotation_step(
                root,
                "First rotate left on the left child for the left-right case.",
                node["left"],
                target,
                path_values,
                rotation_type,
                rotation_nodes,
                8,
            )
        )
        new_subtree = _rotate_right(node)
        root = _replace_subtree(root, parent, node, new_subtree)
        _refresh_tree(root)
        steps.append(
            _rotation_step(
                root,
                "Then rotate right on the imbalanced node to finish the left-right rotation.",
                new_subtree,
                target,
                path_values,
                rotation_type,
                rotation_nodes,
                8,
            )
        )
        return root

    right_child = node["right"]
    if right_child is None:
        return root
    node["right"] = _rotate_right(right_child)
    _refresh_tree(root)
    steps.append(
        _rotation_step(
            root,
            "First rotate right on the right child for the right-left case.",
            node["right"],
            target,
            path_values,
            rotation_type,
            rotation_nodes,
            9,
        )
    )
    new_subtree = _rotate_left(node)
    root = _replace_subtree(root, parent, node, new_subtree)
    _refresh_tree(root)
    steps.append(
        _rotation_step(
            root,
            "Then rotate left on the imbalanced node to finish the right-left rotation.",
            new_subtree,
            target,
            path_values,
            rotation_type,
            rotation_nodes,
            9,
        )
    )
    return root


def _rotation_step(
    root: TreeNode | None,
    description: str,
    current_node: TreeNode | None,
    target: TreeValue,
    path_values: list[TreeValue],
    rotation_type: RotationType,
    rotation_nodes: list[TreeValue],
    pseudocode_line: int,
) -> TreeStep:
    return create_tree_step(
        "rotate",
        root,
        description,
        current_node=current_node["value"] if current_node is not None else None,
        target=target,
        path=path_values,
        pseudocode_line=pseudocode_line,
        rotation_type=rotation_type,
        rotation_nodes=rotation_nodes,
    )


def _node(value: TreeValue) -> TreeNode:
    return {
        "value": value,
        "left": None,
        "right": None,
        "height": 1,
        "balance_factor": 0,
    }


def _height(node: TreeNode | None) -> int:
    if node is None:
        return 0
    return node.get("height", 1)


def _update_node(node: TreeNode) -> None:
    left_height = _height(node["left"])
    right_height = _height(node["right"])
    node["height"] = max(left_height, right_height) + 1
    node["balance_factor"] = left_height - right_height


def _refresh_tree(node: TreeNode | None) -> int:
    if node is None:
        return 0
    left_height = _refresh_tree(node["left"])
    right_height = _refresh_tree(node["right"])
    node["height"] = max(left_height, right_height) + 1
    node["balance_factor"] = left_height - right_height
    return node["height"]


def _rotate_left(node: TreeNode) -> TreeNode:
    pivot = node["right"]
    if pivot is None:
        return node
    transfer = pivot["left"]
    pivot["left"] = node
    node["right"] = transfer
    _update_node(node)
    _update_node(pivot)
    return pivot


def _rotate_right(node: TreeNode) -> TreeNode:
    pivot = node["left"]
    if pivot is None:
        return node
    transfer = pivot["right"]
    pivot["right"] = node
    node["left"] = transfer
    _update_node(node)
    _update_node(pivot)
    return pivot


def _replace_subtree(
    root: TreeNode | None,
    parent: TreeNode | None,
    old_child: TreeNode,
    new_child: TreeNode,
) -> TreeNode | None:
    if parent is None:
        return new_child
    if parent["left"] is old_child:
        parent["left"] = new_child
    else:
        parent["right"] = new_child
    return root


def _rotation_type(node: TreeNode, inserted_value: TreeValue) -> RotationType:
    if node["balance_factor"] > 1:
        left_child = node["left"]
        if left_child is not None and inserted_value > left_child["value"]:
            return "left_right"
        return "right"

    right_child = node["right"]
    if right_child is not None and inserted_value < right_child["value"]:
        return "right_left"
    return "left"


def _rotation_nodes(node: TreeNode, rotation_type: RotationType) -> list[TreeValue]:
    nodes = [node["value"]]
    if rotation_type in {"right", "left_right"} and node["left"] is not None:
        nodes.append(node["left"]["value"])
        if rotation_type == "right" and node["left"]["left"] is not None:
            nodes.append(node["left"]["left"]["value"])
        if rotation_type == "left_right" and node["left"]["right"] is not None:
            nodes.append(node["left"]["right"]["value"])
    if rotation_type in {"left", "right_left"} and node["right"] is not None:
        nodes.append(node["right"]["value"])
        if rotation_type == "left" and node["right"]["right"] is not None:
            nodes.append(node["right"]["right"]["value"])
        if rotation_type == "right_left" and node["right"]["left"] is not None:
            nodes.append(node["right"]["left"]["value"])
    return nodes


def _rotation_label(rotation_type: RotationType) -> str:
    return rotation_type.replace("_", "-")


def _inorder_values(node: TreeNode | None) -> list[TreeValue]:
    if node is None:
        return []
    return [
        *_inorder_values(node["left"]),
        node["value"],
        *_inorder_values(node["right"]),
    ]


def _is_balanced(node: TreeNode | None) -> bool:
    if node is None:
        return True
    return (
        abs(node.get("balance_factor", 0)) <= 1
        and _is_balanced(node["left"])
        and _is_balanced(node["right"])
    )
