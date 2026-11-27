from fastapi import APIRouter

from app.algorithms.sorting import SORTING_ALGORITHMS
from app.schemas.sorting import SortRequest, SortResponse


router = APIRouter(prefix="/sorting")


@router.post("/steps", response_model=SortResponse)
def sorting_steps(request: SortRequest) -> SortResponse:
    initial = request.numbers.copy()
    steps = SORTING_ALGORITHMS[request.algorithm](request.numbers)

    return SortResponse(
        algorithm=request.algorithm,
        initial=initial,
        steps=steps,
        step_count=len(steps),
    )
