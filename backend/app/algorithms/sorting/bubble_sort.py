from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def bubble_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by repeatedly swapping neighboring values that are out of order."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    for pass_index in range(len(array)):
        swapped = False

        for index in range(len(array) - pass_index - 1):
            next_index = index + 1
            steps.append(
                create_step(
                    "compare",
                    [index, next_index],
                    array,
                    f"Compare {array[index]} and {array[next_index]}.",
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

        if not swapped:
            break

    steps.append(create_step("done", [], array, "Bubble sort is complete."))
    return apply_pseudocode_lines(steps, {"compare": 2, "swap": 3, "done": 5})
