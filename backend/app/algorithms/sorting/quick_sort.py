from app.algorithms.types import AlgorithmStep, apply_pseudocode_lines, create_step


def quick_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort by partitioning values around a pivot and sorting each side."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    def quick_sort(low: int, high: int) -> None:
        if low >= high:
            return

        pivot_index = partition(low, high)
        quick_sort(low, pivot_index - 1)
        quick_sort(pivot_index + 1, high)

    def partition(low: int, high: int) -> int:
        pivot_value = array[high]
        smaller_index = low
        steps.append(
            create_step(
                "partition",
                [low, high],
                array,
                f"Partition indices {low} through {high} around pivot {pivot_value}.",
            )
        )

        for index in range(low, high):
            steps.append(
                create_step(
                    "compare",
                    [index, high],
                    array,
                    f"Compare {array[index]} with pivot {pivot_value}.",
                )
            )

            if array[index] <= pivot_value:
                if smaller_index != index:
                    array[smaller_index], array[index] = (
                        array[index],
                        array[smaller_index],
                    )
                    steps.append(
                        create_step(
                            "swap",
                            [smaller_index, index],
                            array,
                            f"Swap indices {smaller_index} and {index}.",
                        )
                    )
                smaller_index += 1

        if smaller_index != high:
            array[smaller_index], array[high] = array[high], array[smaller_index]
            steps.append(
                create_step(
                    "swap",
                    [smaller_index, high],
                    array,
                    f"Move pivot {pivot_value} to index {smaller_index}.",
                )
            )

        steps.append(
            create_step(
                "partition",
                [smaller_index],
                array,
                f"Pivot {pivot_value} is fixed at index {smaller_index}.",
                4,
            )
        )
        return smaller_index

    quick_sort(0, len(array) - 1)
    steps.append(create_step("done", [], array, "Quick sort is complete."))
    return apply_pseudocode_lines(
        steps,
        {"partition": 1, "compare": 2, "swap": 3, "done": 6},
    )
