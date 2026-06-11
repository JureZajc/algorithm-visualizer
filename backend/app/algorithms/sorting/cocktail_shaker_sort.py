from app.algorithms.types import AlgorithmStep, create_step


def cocktail_shaker_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort with alternating left-to-right and right-to-left bubble passes."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []
    start = 0
    end = len(array) - 1
    swapped = True

    while swapped and start < end:
        swapped = False
        for index in range(start, end):
            steps.append(
                create_step(
                    "compare",
                    [index, index + 1],
                    array,
                    f"Compare {array[index]} and {array[index + 1]}.",
                )
            )
            if array[index] > array[index + 1]:
                array[index], array[index + 1] = array[index + 1], array[index]
                swapped = True
                steps.append(
                    create_step(
                        "swap",
                        [index, index + 1],
                        array,
                        f"Swap indices {index} and {index + 1}.",
                    )
                )

        if not swapped:
            break

        swapped = False
        end -= 1
        for index in range(end, start, -1):
            steps.append(
                create_step(
                    "compare",
                    [index - 1, index],
                    array,
                    f"Compare {array[index - 1]} and {array[index]}.",
                )
            )
            if array[index - 1] > array[index]:
                array[index - 1], array[index] = array[index], array[index - 1]
                swapped = True
                steps.append(
                    create_step(
                        "swap",
                        [index - 1, index],
                        array,
                        f"Swap indices {index - 1} and {index}.",
                    )
                )
        start += 1

    steps.append(
        create_step("done", [], array, "Cocktail shaker sort is complete.")
    )
    return steps
