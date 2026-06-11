from random import randint

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Algorithm Visualizer API")


class GenerateRequest(BaseModel):
    size: int = 20
    min_value: int = 1
    max_value: int = 100


@app.get("/")
def root():
    return {"message": "Algorithm Visualizer API is running"}


@app.post("/numbers/random")
def random_numbers(request: GenerateRequest):
    numbers = [
        randint(request.min_value, request.max_value)
        for _ in range(request.size)
    ]

    return {"numbers": numbers}
