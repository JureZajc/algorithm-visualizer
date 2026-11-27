from fastapi import APIRouter, HTTPException

from app.algorithms.searching import SEARCHING_ALGORITHMS
from app.schemas.searching import SearchRequest, SearchResponse


router = APIRouter(prefix="/searching")


@router.post("/steps", response_model=SearchResponse)
def searching_steps(request: SearchRequest) -> SearchResponse:
    initial = request.numbers.copy()

    try:
        steps = SEARCHING_ALGORITHMS[request.algorithm](
            request.numbers,
            request.target,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return SearchResponse(
        algorithm=request.algorithm,
        target=request.target,
        initial=initial,
        steps=steps,
        step_count=len(steps),
    )
