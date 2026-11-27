from random import randint

from fastapi import APIRouter

from app.schemas.numbers import GenerateRequest, RandomNumbersResponse


router = APIRouter()


@router.post("/numbers/random", response_model=RandomNumbersResponse)
def random_numbers(request: GenerateRequest) -> RandomNumbersResponse:
    numbers = [
        randint(request.min_value, request.max_value) for _ in range(request.size)
    ]
    return RandomNumbersResponse(numbers=numbers)
