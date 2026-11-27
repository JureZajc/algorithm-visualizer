from fastapi import APIRouter, HTTPException

from app.algorithms.dynamic_programming import DYNAMIC_PROGRAMMING_ALGORITHMS
from app.schemas.dynamic_programming import (
    DynamicProgrammingRequest,
    DynamicProgrammingResponse,
)


router = APIRouter(prefix="/dynamic-programming")


@router.post("/steps", response_model=DynamicProgrammingResponse)
def dynamic_programming_steps(
    request: DynamicProgrammingRequest,
) -> DynamicProgrammingResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = DYNAMIC_PROGRAMMING_ALGORITHMS[request.algorithm](
            **algorithm_input,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return DynamicProgrammingResponse(
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
    )
