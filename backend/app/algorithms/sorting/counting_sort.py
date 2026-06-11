from app.algorithms.types import AlgorithmStep, create_step


def counting_sort_steps(numbers: list[int]) -> list[AlgorithmStep]:
    """Sort integers by counting occurrences, including negative values."""

    array = numbers.copy()
    steps: list[AlgorithmStep] = []

    if array:
        minimum = min(array)
        counts = [0] * (max(array) - minimum + 1)

        for value in array:
            counts[value - minimum] += 1

        write_index = 0
        for offset, count in enumerate(counts):
            value = offset + minimum
            for _ in range(count):
                array[write_index] = value
                steps.append(
                    create_step(
                        "overwrite",
                        [write_index],
                        array,
                        f"Write counted value {value} to index {write_index}.",
                    )
                )
                write_index += 1

    steps.append(create_step("done", [], array, "Counting sort is complete."))
    return steps
