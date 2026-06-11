import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

SUPPORTED_ALGORITHMS = [
    "bubble_sort",
    "selection_sort",
    "insertion_sort",
    "merge_sort",
    "quick_sort",
    "heap_sort",
    "shell_sort",
    "cocktail_shaker_sort",
    "gnome_sort",
    "comb_sort",
    "counting_sort",
]

EXPECTED_ALGORITHMS = {
    "sorting": [
        {"id": "bubble_sort", "label": "Bubble Sort"},
        {"id": "selection_sort", "label": "Selection Sort"},
        {"id": "insertion_sort", "label": "Insertion Sort"},
        {"id": "merge_sort", "label": "Merge Sort"},
        {"id": "quick_sort", "label": "Quick Sort"},
        {"id": "heap_sort", "label": "Heap Sort"},
        {"id": "shell_sort", "label": "Shell Sort"},
        {"id": "cocktail_shaker_sort", "label": "Cocktail Shaker Sort"},
        {"id": "gnome_sort", "label": "Gnome Sort"},
        {"id": "comb_sort", "label": "Comb Sort"},
        {"id": "counting_sort", "label": "Counting Sort"},
    ],
    "searching": [
        {"id": "linear_search", "label": "Linear Search"},
        {"id": "binary_search", "label": "Binary Search"},
    ],
}


def test_root_module_reexports_canonical_app() -> None:
    from main import app as compatibility_app

    assert compatibility_app is app


def test_algorithms_endpoint() -> None:
    response = client.get("/algorithms")

    assert response.status_code == 200
    assert response.json() == EXPECTED_ALGORITHMS


@pytest.mark.parametrize("algorithm", SUPPORTED_ALGORITHMS)
def test_sorting_steps_endpoint(algorithm: str) -> None:
    numbers = [5, 3, 8, 1]

    response = client.post(
        "/sorting/steps",
        json={"numbers": numbers, "algorithm": algorithm},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["initial"] == numbers
    assert body["steps"]
    assert body["steps"][-1]["type"] == "done"
    assert body["steps"][-1]["array"] == sorted(numbers)
    assert body["step_count"] == len(body["steps"])


def test_sorting_steps_endpoint_rejects_unsupported_algorithm() -> None:
    response = client.post(
        "/sorting/steps",
        json={"numbers": [3, 2, 1], "algorithm": "radix_sort"},
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("algorithm", "numbers", "target", "outcome"),
    [
        ("linear_search", [4, 2, 7, 2], 7, "found"),
        ("linear_search", [4, 2, 7, 2], 9, "not_found"),
        ("binary_search", [2, 4, 7, 9], 7, "found"),
        ("binary_search", [2, 4, 7, 9], 3, "not_found"),
    ],
)
def test_searching_steps_endpoint(
    algorithm: str,
    numbers: list[int],
    target: int,
    outcome: str,
) -> None:
    response = client.post(
        "/searching/steps",
        json={"numbers": numbers, "algorithm": algorithm, "target": target},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["algorithm"] == algorithm
    assert body["target"] == target
    assert body["initial"] == numbers
    assert body["steps"]
    assert outcome in {step["type"] for step in body["steps"]}
    assert body["steps"][-1]["type"] == "done"
    assert body["step_count"] == len(body["steps"])


def test_searching_steps_endpoint_rejects_unsupported_algorithm() -> None:
    response = client.post(
        "/searching/steps",
        json={"numbers": [1, 2, 3], "algorithm": "jump_search", "target": 2},
    )

    assert response.status_code == 422


def test_binary_search_endpoint_rejects_unsorted_input() -> None:
    response = client.post(
        "/searching/steps",
        json={
            "numbers": [3, 1, 2],
            "algorithm": "binary_search",
            "target": 2,
        },
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Binary search requires numbers sorted in ascending order."
    }
