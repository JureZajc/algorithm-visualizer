from app.algorithms.types import AlgorithmStep, create_step


def merge_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by recursively dividing the array and merging sorted sections."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    def merge_sort(left: int, right: int) -> None:
        if left >= right:
            return

        middle = (left + right) // 2
        steps.append(
            create_step(
                "partition",
                [left, middle, right],
                array,
                f"Split indices {left} through {right} at index {middle}.",
            )
        )

        merge_sort(left, middle)
        merge_sort(middle + 1, right)
        merge(left, middle, right)

    def merge(left: int, middle: int, right: int) -> None:
        left_values = array[left : middle + 1]
        right_values = array[middle + 1 : right + 1]
        left_index = 0
        right_index = 0
        merged_values: list[int] = []

        while left_index < len(left_values) and right_index < len(right_values):
            original_left_index = left + left_index
            original_right_index = middle + 1 + right_index
            steps.append(
                create_step(
                    "compare",
                    [original_left_index, original_right_index],
                    array,
                    (
                        f"Compare {left_values[left_index]} and "
                        f"{right_values[right_index]}."
                    ),
                )
            )

            if left_values[left_index] <= right_values[right_index]:
                merged_values.append(left_values[left_index])
                left_index += 1
            else:
                merged_values.append(right_values[right_index])
                right_index += 1

        merged_values.extend(left_values[left_index:])
        merged_values.extend(right_values[right_index:])

        for offset, value in enumerate(merged_values):
            target_index = left + offset
            array[target_index] = value
            steps.append(
                create_step(
                    "overwrite",
                    [target_index],
                    array,
                    f"Write {value} to index {target_index}.",
                )
            )

        steps.append(
            create_step(
                "merge",
                list(range(left, right + 1)),
                array,
                f"Indices {left} through {right} are now merged.",
            )
        )

    merge_sort(0, len(array) - 1)
    steps.append(create_step("done", [], array, "Merge sort is complete."))
    return steps
