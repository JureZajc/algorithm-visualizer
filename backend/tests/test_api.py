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
]


def test_root_module_reexports_canonical_app() -> None:
    from main import app as compatibility_app

    assert compatibility_app is app


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
        json={"numbers": [3, 2, 1], "algorithm": "heap_sort"},
    )

    assert response.status_code == 422
