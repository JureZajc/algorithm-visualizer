from fastapi import APIRouter, HTTPException

from app.algorithms.hash_tables import HASH_TABLE_ALGORITHMS
from app.schemas.hash_tables import HashTableRequest, HashTableResponse


router = APIRouter(prefix="/hash-tables")


@router.post("/steps", response_model=HashTableResponse)
def hash_table_steps(request: HashTableRequest) -> HashTableResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = HASH_TABLE_ALGORITHMS[request.algorithm](**algorithm_input)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return HashTableResponse(
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
    )
