from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def insertion_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by inserting each value into the sorted section to its left."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    for index in range(1, len(array)):
        value_to_insert = array[index]
        position = index - 1

        while position >= 0:
            steps.append(
                create_step(
                    "compare",
                    [position, position + 1],
                    array,
                    f"Compare {array[position]} with {value_to_insert}.",
                )
            )

            if array[position] <= value_to_insert:
                break

            array[position + 1] = array[position]
            steps.append(
                create_step(
                    "overwrite",
                    [position + 1],
                    array,
                    f"Shift {array[position]} one position to the right.",
                )
            )
            position -= 1

        insertion_index = position + 1
        if insertion_index != index:
            array[insertion_index] = value_to_insert
            steps.append(
                create_step(
                    "overwrite",
                    [insertion_index],
                    array,
                    f"Insert {value_to_insert} at index {insertion_index}.",
                    4,
                )
            )

    steps.append(create_step("done", [], array, "Insertion sort is complete."))
    return apply_pseudocode_lines(
        steps,
        {"compare": 2, "overwrite": 3, "done": 5},
    )
