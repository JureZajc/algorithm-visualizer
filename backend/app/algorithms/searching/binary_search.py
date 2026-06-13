from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def binary_search_steps(numbers: list[int], target: int) -> list[AlgorithmStep]:
    """Search a sorted array by repeatedly halving the search interval."""

    array = numbers.copy()
    if array != sorted(array):
        raise ValueError("Binary search requires numbers sorted in ascending order.")

    steps: list[AlgorithmStep] = []
    left = 0
    right = len(array) - 1

    while left <= right:
        middle = (left + right) // 2
        steps.append(
            create_step(
                "compare",
                [middle],
                array,
                f"Compare {array[middle]} with target {target}.",
            )
        )

        if array[middle] == target:
            steps.append(
                create_step(
                    "found",
                    [middle],
                    array,
                    f"Found {target} at index {middle}.",
                )
            )
            break
        if array[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    else:
        steps.append(
            create_step(
                "not_found",
                [],
                array,
                f"Target {target} is not in the array.",
            )
        )

    steps.append(create_step("done", [], array, "Binary search is complete."))
    return apply_pseudocode_lines(
        steps,
        {"compare": 3, "found": 4, "not_found": 7, "done": 8},
    )
