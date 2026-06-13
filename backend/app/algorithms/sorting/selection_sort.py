from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def selection_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by selecting the smallest remaining value for each position."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    for start_index in range(len(array)):
        minimum_index = start_index

        for index in range(start_index + 1, len(array)):
            steps.append(
                create_step(
                    "compare",
                    [minimum_index, index],
                    array,
                    f"Compare {array[minimum_index]} and {array[index]}.",
                )
            )

            if array[index] < array[minimum_index]:
                minimum_index = index

        if minimum_index != start_index:
            array[start_index], array[minimum_index] = (
                array[minimum_index],
                array[start_index],
            )
            steps.append(
                create_step(
                    "swap",
                    [start_index, minimum_index],
                    array,
                    f"Move the smallest remaining value to index {start_index}.",
                )
            )

    steps.append(create_step("done", [], array, "Selection sort is complete."))
    return apply_pseudocode_lines(steps, {"compare": 3, "swap": 5, "done": 6})
