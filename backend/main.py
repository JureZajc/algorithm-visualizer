from fastapi import FastAPI
from pydantic import BaseModel
from random import randint

from app.algorithms.sorting import bubble_sort_steps, selection_sort_steps

app = FastAPI(title="Algorithm Visualizer API")


class GenerateRequest(BaseModel):
    size: int = 20
    min_value: int = 1
    max_value: int = 100


class SortRequest(BaseModel):
    numbers: list[int]
    algorithm: str


@app.get("/")
def root():
    return {"message": "Algorithm Visualizer API"}


@app.post("/numbers/random")
def random_numbers(request: GenerateRequest):
    numbers = [
        randint(request.min_value, request.max_value)
        for _ in range(request.size)
    ]
    return {"numbers": numbers}


@app.post("/sorting/steps")
def sorting_steps(request: SortRequest):
    if request.algorithm == "bubble_sort":
        steps = bubble_sort_steps(request.numbers)
    elif request.algorithm == "selection_sort":
        steps = selection_sort_steps(request.numbers)
    else:
        return {"error": "Unsupported algorithm"}

    return {
        "algorithm": request.algorithm,
        "initial": request.numbers,
        "steps": steps,
        "step_count": len(steps),
    }
