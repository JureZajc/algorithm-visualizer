from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def comb_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by comparing shrinking gaps before a final bubble pass."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []
    gap = len(array)
    swapped = True

    while gap > 1 or swapped:
        gap = max(1, (gap * 10) // 13)
        swapped = False

        for index in range(0, len(array) - gap):
            next_index = index + gap
            steps.append(
                create_step(
                    "compare",
                    [index, next_index],
                    array,
                    f"Compare values with a gap of {gap}.",
                )
            )
            if array[index] > array[next_index]:
                array[index], array[next_index] = array[next_index], array[index]
                swapped = True
                steps.append(
                    create_step(
                        "swap",
                        [index, next_index],
                        array,
                        f"Swap indices {index} and {next_index}.",
                    )
                )

    steps.append(create_step("done", [], array, "Comb sort is complete."))
    return apply_pseudocode_lines(steps, {"compare": 2, "swap": 3, "done": 5})
