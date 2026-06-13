from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def gnome_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by swapping backward until each value is in order."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []
    index = 1

    while index < len(array):
        steps.append(
            create_step(
                "compare",
                [index - 1, index],
                array,
                f"Compare {array[index - 1]} and {array[index]}.",
            )
        )
        if array[index - 1] <= array[index]:
            index += 1
        else:
            array[index - 1], array[index] = array[index], array[index - 1]
            steps.append(
                create_step(
                    "swap",
                    [index - 1, index],
                    array,
                    f"Swap indices {index - 1} and {index}.",
                )
            )
            index = max(1, index - 1)

    steps.append(create_step("done", [], array, "Gnome sort is complete."))
    return apply_pseudocode_lines(steps, {"compare": 1, "swap": 3, "done": 5})
