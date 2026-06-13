from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def linear_search_steps(numbers: list[int], target: int) -> list[AlgorithmStep]:
    """Search each value from left to right until the target is found."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    for index, value in enumerate(array):
        steps.append(
            create_step(
                "compare",
                [index],
                array,
                f"Compare {value} with target {target}.",
            )
        )
        if value == target:
            steps.append(
                create_step(
                    "found",
                    [index],
                    array,
                    f"Found {target} at index {index}.",
                )
            )
            break
    else:
        steps.append(
            create_step(
                "not_found",
                [],
                array,
                f"Target {target} is not in the array.",
            )
        )

    steps.append(create_step("done", [], array, "Linear search is complete."))
    return apply_pseudocode_lines(
        steps,
        {"compare": 2, "found": 3, "not_found": 4, "done": 5},
    )
