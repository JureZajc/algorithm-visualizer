from typing import NotRequired, TypedDict, get_args

from pydantic import BaseModel, ConfigDict, Field, model_validator, with_config

from app.algorithms.trees.types import TreeAlgorithm, TreeStep


MAX_TREE_VALUES = 31


@with_config(ConfigDict(extra="forbid"))
class TreeInput(TypedDict):
    values: list[int]
    # BST search only.
    target: NotRequired[int]


class TreeRequest(BaseModel):
    algorithm: TreeAlgorithm
    values: list[int] = Field(min_length=1, max_length=MAX_TREE_VALUES)
    target: int | None = None

    @model_validator(mode="after")
    def validate_algorithm_input(self) -> "TreeRequest":
        """Validate unique BST values and algorithm-specific fields."""

        if len(self.values) != len(set(self.values)):
            raise ValueError("values must contain unique values.")
        if self.algorithm == "bst_search" and self.target is None:
            raise ValueError("BST search requires a target value.")
        return self

    def algorithm_input(self) -> TreeInput:
        if self.algorithm == "bst_search" and self.target is not None:
            return {"values": self.values.copy(), "target": self.target}
        return {"values": self.values.copy()}


class TreeResponse(BaseModel):
    algorithm: TreeAlgorithm
    input: TreeInput
    steps: list[TreeStep]
    step_count: int


TREES_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    algorithm: TreeRequest for algorithm in get_args(TreeAlgorithm)
}
