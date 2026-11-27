from fastapi import APIRouter

from app.algorithms.metadata import (
    AlgorithmsResponse,
    BACKTRACKING_ALGORITHM_METADATA,
    DYNAMIC_PROGRAMMING_ALGORITHM_METADATA,
    GRAPH_ALGORITHM_METADATA,
    HASH_TABLE_ALGORITHM_METADATA,
    SEARCHING_ALGORITHM_METADATA,
    SORTING_ALGORITHM_METADATA,
    TREES_ALGORITHM_METADATA,
)


router = APIRouter()


@router.get("/")
def root() -> dict[str, str]:
    return {"message": "Algorithm Visualizer API is running"}


@router.get("/algorithms", response_model=AlgorithmsResponse)
def algorithms() -> AlgorithmsResponse:
    return AlgorithmsResponse(
        sorting=SORTING_ALGORITHM_METADATA,
        searching=SEARCHING_ALGORITHM_METADATA,
        graph=GRAPH_ALGORITHM_METADATA,
        dynamic_programming=DYNAMIC_PROGRAMMING_ALGORITHM_METADATA,
        backtracking=BACKTRACKING_ALGORITHM_METADATA,
        trees=TREES_ALGORITHM_METADATA,
        hash_tables=HASH_TABLE_ALGORITHM_METADATA,
    )
