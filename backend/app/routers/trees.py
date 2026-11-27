from fastapi import APIRouter, HTTPException

from app.algorithms.trees import TREES_ALGORITHMS
from app.schemas.trees import TreeRequest, TreeResponse


router = APIRouter(prefix="/trees")


@router.post("/steps", response_model=TreeResponse)
def tree_steps(request: TreeRequest) -> TreeResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = TREES_ALGORITHMS[request.algorithm](**algorithm_input)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return TreeResponse(
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
    )
