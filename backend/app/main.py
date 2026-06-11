from random import randint

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.algorithms.sorting import SORTING_ALGORITHMS
from app.algorithms.types import AlgorithmStep, SortingAlgorithm


app = FastAPI(title="Algorithm Visualizer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    size: int = 20
    min_value: int = 1
    max_value: int = 100


class SortRequest(BaseModel):
    numbers: list[int]
    algorithm: SortingAlgorithm


class SortResponse(BaseModel):
    algorithm: SortingAlgorithm
    initial: list[int]
    steps: list[AlgorithmStep]
    step_count: int


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Algorithm Visualizer API is running"}


@app.post("/numbers/random")
def random_numbers(request: GenerateRequest) -> dict[str, list[int]]:
    numbers = [
        randint(request.min_value, request.max_value)
        for _ in range(request.size)
    ]
    return {"numbers": numbers}


@app.post("/sorting/steps", response_model=SortResponse)
def sorting_steps(request: SortRequest) -> SortResponse:
    initial = request.numbers.copy()
    steps = SORTING_ALGORITHMS[request.algorithm](request.numbers)

    return SortResponse(
        algorithm=request.algorithm,
        initial=initial,
        steps=steps,
        step_count=len(steps),
    )
