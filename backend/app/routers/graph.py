from fastapi import APIRouter, HTTPException

from app.algorithms.graph import graph_algorithm_steps
from app.schemas.graph import GraphRequest, GraphResponse


router = APIRouter(prefix="/graph")


@router.post("/steps", response_model=GraphResponse)
def graph_steps(request: GraphRequest) -> GraphResponse:
    try:
        steps = graph_algorithm_steps(
            request.algorithm,
            request.nodes,
            request.graph_edges(),
            request.start,
            request.target,
            request.directed,
            request.heuristics,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return GraphResponse(
        algorithm=request.algorithm,
        nodes=request.nodes.copy(),
        edges=[edge.model_copy(deep=True) for edge in request.edges],
        start=request.start,
        target=request.target,
        directed=request.directed,
        heuristics=request.heuristics.copy() if request.heuristics else None,
        steps=steps,
        step_count=len(steps),
    )
