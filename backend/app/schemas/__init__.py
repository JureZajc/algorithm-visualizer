"""Request and response models, one module per category."""

from pydantic import BaseModel

from app.schemas.backtracking import BACKTRACKING_REQUEST_MODELS
from app.schemas.dynamic_programming import DYNAMIC_PROGRAMMING_REQUEST_MODELS
from app.schemas.graph import GRAPH_REQUEST_MODELS
from app.schemas.hash_tables import HASH_TABLES_REQUEST_MODELS
from app.schemas.searching import SEARCHING_REQUEST_MODELS
from app.schemas.sorting import SORTING_REQUEST_MODELS
from app.schemas.trees import TREES_REQUEST_MODELS


# The request model that validates each algorithm's input, by algorithm id.
ALGORITHM_REQUEST_MODELS: dict[str, type[BaseModel]] = {
    **SORTING_REQUEST_MODELS,
    **SEARCHING_REQUEST_MODELS,
    **HASH_TABLES_REQUEST_MODELS,
    **TREES_REQUEST_MODELS,
    **GRAPH_REQUEST_MODELS,
    **DYNAMIC_PROGRAMMING_REQUEST_MODELS,
    **BACKTRACKING_REQUEST_MODELS,
}

__all__ = ["ALGORITHM_REQUEST_MODELS"]
