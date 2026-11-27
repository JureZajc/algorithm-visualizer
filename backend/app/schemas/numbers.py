"""Integer arrays: the shared input of sorting and searching."""

from typing import Annotated

from pydantic import BaseModel, Field, model_validator


# Step responses snapshot the full state per step, so inputs stay small.
MAX_ARRAY_LENGTH = 50
MAX_ARRAY_VALUE = 1_000_000

ArrayValue = Annotated[int, Field(ge=-MAX_ARRAY_VALUE, le=MAX_ARRAY_VALUE)]
ArrayValues = Annotated[list[ArrayValue], Field(max_length=MAX_ARRAY_LENGTH)]


class GenerateRequest(BaseModel):
    size: int = Field(default=20, ge=0, le=MAX_ARRAY_LENGTH)
    min_value: ArrayValue = 1
    max_value: ArrayValue = 100

    @model_validator(mode="after")
    def validate_value_range(self) -> "GenerateRequest":
        if self.min_value > self.max_value:
            raise ValueError("min_value must not be greater than max_value.")
        return self


class RandomNumbersResponse(BaseModel):
    numbers: list[int]
