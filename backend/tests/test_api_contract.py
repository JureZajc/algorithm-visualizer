"""The API contract: request and response models, OpenAPI, and catalog limits."""

import json
from collections.abc import Callable
from typing import Annotated, get_args

import pytest
from pydantic import BaseModel, Field, TypeAdapter
from starlette.testclient import TestClient

from app.algorithms.backtracking import BACKTRACKING_ALGORITHMS
from app.algorithms.backtracking.sudoku_solver import DEFAULT_SUDOKU_BOARD
from app.algorithms.backtracking.types import BacktrackingAlgorithm
from app.algorithms.dynamic_programming import DYNAMIC_PROGRAMMING_ALGORITHMS
from app.algorithms.dynamic_programming.types import DynamicProgrammingAlgorithm
from app.algorithms.hash_tables import HASH_TABLE_ALGORITHMS
from app.algorithms.metadata import ALGORITHM_METADATA
from app.algorithms.trees import TREES_ALGORITHMS
from app.main import app
from app.schemas import ALGORITHM_REQUEST_MODELS
from app.schemas.backtracking import BacktrackingRequest
from app.schemas.dynamic_programming import DynamicProgrammingRequest
from app.schemas.hash_tables import HashTableRequest
from app.schemas.limits import request_limits
from app.schemas.trees import TreeRequest


client = TestClient(app)


@pytest.mark.parametrize(
    ("path", "algorithms"),
    [
        ("/dynamic-programming/steps", get_args(DynamicProgrammingAlgorithm)),
        ("/backtracking/steps", get_args(BacktrackingAlgorithm)),
    ],
)
def test_openapi_has_a_request_schema_per_algorithm(
    path: str,
    algorithms: tuple[str, ...],
) -> None:
    schema = app.openapi()
    body = schema["paths"][path]["post"]["requestBody"]["content"]["application/json"]
    mapping = body["schema"]["discriminator"]["mapping"]

    assert body["schema"]["discriminator"]["propertyName"] == "algorithm"
    assert set(mapping) == set(algorithms)
    assert len(set(mapping.values())) == len(algorithms)
    for algorithm, reference in mapping.items():
        component = schema["components"]["schemas"][reference.rsplit("/", 1)[-1]]
        assert component["properties"]["algorithm"]["const"] == algorithm


def test_openapi_has_a_response_schema_per_backtracking_algorithm() -> None:
    schema = app.openapi()
    response = schema["paths"]["/backtracking/steps"]["post"]["responses"]["200"]
    mapping = response["content"]["application/json"]["schema"]["discriminator"][
        "mapping"
    ]

    assert set(mapping) == set(get_args(BacktrackingAlgorithm))
    sudoku = schema["components"]["schemas"]["SudokuSolverResponse"]
    assert {"initial_board", "fixed_cells"} <= set(sudoku["required"])


@pytest.mark.parametrize(
    ("algorithm", "path", "expected_input"),
    [
        ("fibonacci", "/dynamic-programming/steps", {"n": 8}),
        (
            "coin_change",
            "/dynamic-programming/steps",
            {"coins": [1, 3, 4], "amount": 6},
        ),
        (
            "knapsack",
            "/dynamic-programming/steps",
            {"weights": [2, 3, 4, 5], "values": [3, 4, 5, 6], "capacity": 5},
        ),
        ("lcs", "/dynamic-programming/steps", {"text_a": "ABCDEF", "text_b": "ACE"}),
        (
            "edit_distance",
            "/dynamic-programming/steps",
            {"text_a": "kitten", "text_b": "sitting"},
        ),
        ("unique_paths", "/dynamic-programming/steps", {"rows": 3, "cols": 7}),
        ("n_queens", "/backtracking/steps", {"size": 4}),
        (
            "maze_solver",
            "/backtracking/steps",
            {"rows": 7, "cols": 7, "preset": "classic"},
        ),
        ("permutations", "/backtracking/steps", {"values": ["A", "B", "C"]}),
        ("subsets", "/backtracking/steps", {"values": ["A", "B", "C"]}),
        ("sudoku_solver", "/backtracking/steps", {"board": DEFAULT_SUDOKU_BOARD}),
    ],
)
def test_algorithm_defaults_fill_missing_fields(
    algorithm: str,
    path: str,
    expected_input: dict[str, object],
) -> None:
    response = client.post(path, json={"algorithm": algorithm})

    assert response.status_code == 200
    assert response.json()["input"] == expected_input


def test_every_algorithm_has_a_request_model_and_limits() -> None:
    assert set(ALGORITHM_REQUEST_MODELS) == {item.id for item in ALGORITHM_METADATA}
    for item in ALGORITHM_METADATA:
        model = ALGORITHM_REQUEST_MODELS[item.id]
        assert item.id in get_args(model.model_fields["algorithm"].annotation)
        assert item.limits
        assert item.limits == request_limits(model)


def _limits(body: dict[str, list[dict[str, object]]], algorithm: str) -> object:
    items = [item for category in body.values() for item in category]
    return next(item["limits"] for item in items if item["id"] == algorithm)


def test_catalog_serves_input_limits() -> None:
    body = client.get("/algorithms").json()

    assert _limits(body, "bubble_sort") == {
        "numbers": {
            "minimum": None,
            "maximum": None,
            "min_length": None,
            "max_length": None,
            "min_items": None,
            "max_items": 50,
            "items": {
                "minimum": -1_000_000,
                "maximum": 1_000_000,
                "min_length": None,
                "max_length": None,
                "min_items": None,
                "max_items": None,
                "items": None,
            },
        }
    }
    assert _limits(body, "fibonacci")["n"]["minimum"] == 0
    assert _limits(body, "fibonacci")["n"]["maximum"] == 40
    for algorithm, maximum in (("permutations", 6), ("subsets", 10)):
        values = _limits(body, algorithm)["values"]
        assert (values["min_items"], values["max_items"]) == (1, maximum)
        assert values["items"]["max_length"] == 12
    maze = _limits(body, "maze_solver")
    assert (maze["rows"]["minimum"], maze["rows"]["maximum"]) == (2, 15)
    assert (maze["cols"]["minimum"], maze["cols"]["maximum"]) == (2, 15)
    assert _limits(body, "hash_insert_chaining")["table_size"]["maximum"] == 31
    assert _limits(body, "bfs")["nodes"]["max_items"] == 30


def _scalar_limit_cases() -> list[object]:
    cases: list[object] = []
    for item in ALGORITHM_METADATA:
        if item.category == "dynamic_programming":
            path = "/dynamic-programming/steps"
        elif item.category == "backtracking":
            path = "/backtracking/steps"
        else:
            continue
        for field, limit in item.limits.items():
            for bound, outside in (
                (limit.minimum, -1),
                (limit.maximum, 1),
            ):
                if bound is not None:
                    cases.append(
                        pytest.param(
                            path,
                            item.id,
                            field,
                            bound,
                            outside,
                            id=f"{item.id}-{field}-{bound}",
                        )
                    )
    return cases


@pytest.mark.parametrize(
    ("path", "algorithm", "field", "bound", "outside"),
    _scalar_limit_cases(),
)
def test_catalog_limits_are_the_enforced_limits(
    path: str,
    algorithm: str,
    field: str,
    bound: int,
    outside: int,
) -> None:
    at_bound = client.post(path, json={"algorithm": algorithm, field: bound})
    past_bound = client.post(
        path,
        json={"algorithm": algorithm, field: bound + outside},
    )

    assert at_bound.status_code == 200
    assert past_bound.status_code == 422


def test_request_limits_reject_constraints_the_catalog_cannot_list() -> None:
    class ExclusiveRequest(BaseModel):
        value: Annotated[int, Field(gt=0)]

    with pytest.raises(ValueError, match="exclusiveMinimum"):
        request_limits(ExclusiveRequest)


def _canonical(value: object) -> str:
    # Text keeps 1 and 1.0 apart, which compare equal once parsed.
    return json.dumps(value, sort_keys=True)


def _dynamic_programming_steps(payload: dict[str, object]) -> object:
    request = TypeAdapter(DynamicProgrammingRequest).validate_python(payload)
    algorithm = DYNAMIC_PROGRAMMING_ALGORITHMS[request.algorithm]
    return algorithm(**request.algorithm_input())


def _backtracking_steps(payload: dict[str, object]) -> object:
    request = TypeAdapter(BacktrackingRequest).validate_python(payload)
    return BACKTRACKING_ALGORITHMS[request.algorithm](**request.algorithm_input())


def _tree_steps(payload: dict[str, object]) -> object:
    request = TreeRequest.model_validate(payload)
    return TREES_ALGORITHMS[request.algorithm](**request.algorithm_input())


def _hash_table_steps(payload: dict[str, object]) -> object:
    request = HashTableRequest.model_validate(payload)
    return HASH_TABLE_ALGORITHMS[request.algorithm](**request.algorithm_input())


TREE_VALUES = [8, 3, 10, 1, 6, 14, 4, 7, 13]
CUSTOM_MAZE = [
    ["start", "empty", "wall"],
    ["wall", "empty", "empty"],
    ["empty", "wall", "end"],
]
CONTRACT_CASES = [
    *(
        ("/dynamic-programming/steps", {"algorithm": algorithm}, _dynamic_programming_steps)
        for algorithm in get_args(DynamicProgrammingAlgorithm)
    ),
    *(
        ("/backtracking/steps", {"algorithm": algorithm}, _backtracking_steps)
        for algorithm in get_args(BacktrackingAlgorithm)
    ),
    (
        "/backtracking/steps",
        {
            "algorithm": "maze_solver",
            "rows": 3,
            "cols": 3,
            "grid": CUSTOM_MAZE,
            "start": [0, 0],
            "end": [2, 2],
        },
        _backtracking_steps,
    ),
    *(
        (
            "/trees/steps",
            {"algorithm": algorithm, "values": TREE_VALUES, "target": 7},
            _tree_steps,
        )
        for algorithm in TREES_ALGORITHMS
    ),
    (
        "/trees/steps",
        {"algorithm": "bst_search", "values": TREE_VALUES, "target": 5},
        _tree_steps,
    ),
    *(
        (
            "/hash-tables/steps",
            {
                "algorithm": algorithm,
                "values": [12, "pear", 32, 5],
                "table_size": 10,
                "target": 32,
            },
            _hash_table_steps,
        )
        for algorithm in HASH_TABLE_ALGORITHMS
    ),
    # Probing wraps around a full table, so the result has no bucket.
    (
        "/hash-tables/steps",
        {
            "algorithm": "hash_search_linear_probing",
            "values": [1, 2, 3],
            "table_size": 3,
            "target": 4,
        },
        _hash_table_steps,
    ),
]


@pytest.mark.parametrize(
    ("path", "payload", "run_algorithm"),
    CONTRACT_CASES,
    ids=[f"{case[1]['algorithm']}-{index}" for index, case in enumerate(CONTRACT_CASES)],
)
def test_typed_responses_return_the_algorithm_steps_unchanged(
    path: str,
    payload: dict[str, object],
    run_algorithm: Callable[[dict[str, object]], object],
) -> None:
    response = client.post(path, json=payload)

    assert response.status_code == 200
    assert _canonical(response.json()["steps"]) == _canonical(run_algorithm(payload))
