from app.algorithms.types import AlgorithmStep, create_step


def shell_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort with insertion passes over progressively smaller gaps."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []
    gap = len(array) // 2

    while gap > 0:
        for index in range(gap, len(array)):
            value_to_insert = array[index]
            position = index

            while position >= gap:
                previous_index = position - gap
                steps.append(
                    create_step(
                        "compare",
                        [previous_index, position],
                        array,
                        f"Compare values {gap} positions apart.",
                    )
                )
                if array[previous_index] <= value_to_insert:
                    break

                array[position] = array[previous_index]
                steps.append(
                    create_step(
                        "overwrite",
                        [position],
                        array,
                        f"Shift {array[previous_index]} to index {position}.",
                    )
                )
                position -= gap

            if position != index:
                array[position] = value_to_insert
                steps.append(
                    create_step(
                        "overwrite",
                        [position],
                        array,
                        f"Insert {value_to_insert} at index {position}.",
                    )
                )

        gap //= 2

    steps.append(create_step("done", [], array, "Shell sort is complete."))
    return steps
