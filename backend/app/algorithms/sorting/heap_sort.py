from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def heap_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by building a max heap and moving its root to the end."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    def heapify(heap_size: int, root_index: int) -> None:
        steps.append(
            create_step(
                "heapify",
                [root_index],
                array,
                f"Restore the heap below index {root_index}.",
            )
        )
        largest_index = root_index
        left_index = 2 * root_index + 1
        right_index = left_index + 1

        for child_index in (left_index, right_index):
            if child_index < heap_size:
                steps.append(
                    create_step(
                        "compare",
                        [largest_index, child_index],
                        array,
                        f"Compare heap values at indices {largest_index} and {child_index}.",
                    )
                )
                if array[child_index] > array[largest_index]:
                    largest_index = child_index

        if largest_index != root_index:
            array[root_index], array[largest_index] = (
                array[largest_index],
                array[root_index],
            )
            steps.append(
                create_step(
                    "swap",
                    [root_index, largest_index],
                    array,
                    f"Swap indices {root_index} and {largest_index}.",
                )
            )
            heapify(heap_size, largest_index)

    for root_index in range(len(array) // 2 - 1, -1, -1):
        heapify(len(array), root_index)

    for end_index in range(len(array) - 1, 0, -1):
        array[0], array[end_index] = array[end_index], array[0]
        steps.append(
            create_step(
                "swap",
                [0, end_index],
                array,
                f"Move the largest remaining value to index {end_index}.",
                4,
            )
        )
        heapify(end_index, 0)

    steps.append(create_step("done", [], array, "Heap sort is complete."))
    return apply_pseudocode_lines(
        steps,
        {"heapify": 5, "compare": 2, "swap": 3, "done": 6},
    )
