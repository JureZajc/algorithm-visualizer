from typing import Any


def bubble_sort_steps(numbers: list[int]) -> list[dict[str, Any]]:
    arr = numbers.copy()
    steps = []

    n = len(arr)

    for i in range(n):
        for j in range(0, n - i - 1):
            steps.append({
                "type": "compare",
                "indices": [j, j + 1],
                "array": arr.copy(),
            })

            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]

                steps.append({
                    "type": "swap",
                    "indices": [j, j + 1],
                    "array": arr.copy(),
                })

    steps.append({
        "type": "done",
        "indices": [],
        "array": arr.copy(),
    })

    return steps


def selection_sort_steps(numbers: list[int]) -> list[dict[str, Any]]:
    arr = numbers.copy()
    steps = []

    n = len(arr)

    for i in range(n):
        min_index = i

        for j in range(i + 1, n):
            steps.append({
                "type": "compare",
                "indices": [min_index, j],
                "array": arr.copy(),
            })

            if arr[j] < arr[min_index]:
                min_index = j

        if min_index != i:
            arr[i], arr[min_index] = arr[min_index], arr[i]

            steps.append({
                "type": "swap",
                "indices": [i, min_index],
                "array": arr.copy(),
            })

    steps.append({
        "type": "done",
        "indices": [],
        "array": arr.copy(),
    })

    return steps
