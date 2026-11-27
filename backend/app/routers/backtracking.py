from collections.abc import Mapping

from fastapi import APIRouter, HTTPException

from app.algorithms.backtracking import BACKTRACKING_ALGORITHMS
from app.algorithms.backtracking.sudoku_solver import sudoku_run
from app.schemas.backtracking import (
    BACKTRACKING_RESPONSE_MODELS,
    BacktrackingRequest,
    BacktrackingResponse,
    SudokuSolverRequest,
)


router = APIRouter(prefix="/backtracking")


@router.post("/steps", response_model=BacktrackingResponse)
def backtracking_steps(request: BacktrackingRequest) -> BacktrackingResponse:
    algorithm_input = request.algorithm_input()

    try:
        steps = BACKTRACKING_ALGORITHMS[request.algorithm](**algorithm_input)
        # Sudoku sends the board data that every step shares once per run.
        run: Mapping[str, object] = (
            sudoku_run(request.board)
            if isinstance(request, SudokuSolverRequest)
            else {}
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return BACKTRACKING_RESPONSE_MODELS[request.algorithm](
        algorithm=request.algorithm,
        input=algorithm_input,
        steps=steps,
        step_count=len(steps),
        **run,
    )
