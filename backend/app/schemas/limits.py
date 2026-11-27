"""Input limits as served by GET /algorithms.

Limits are declared once, as `Field` constraints on the request models. This
module reads them back from each model's JSON schema, so the catalog, the
OpenAPI schema, and request validation cannot disagree.
"""

from functools import cache
from typing import Any

from pydantic import BaseModel


class InputLimit(BaseModel):
    """Bounds on one request field. A null bound does not apply."""

    # Numbers.
    minimum: int | None = None
    maximum: int | None = None
    # Strings, in characters.
    min_length: int | None = None
    max_length: int | None = None
    # Lists, in items.
    min_items: int | None = None
    max_items: int | None = None
    # Bounds on each item of a list.
    items: "InputLimit | None" = None


_BOUNDS = {
    "minimum": "minimum",
    "maximum": "maximum",
    "minLength": "min_length",
    "maxLength": "max_length",
    "minItems": "min_items",
    "maxItems": "max_items",
}
# Constraints that InputLimit cannot express. A request model that uses one
# fails here, so a limit is never left out of the catalog by accident.
_UNSUPPORTED = {
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "pattern",
    "uniqueItems",
    "minProperties",
    "maxProperties",
}


@cache
def request_limits(model: type[BaseModel]) -> dict[str, InputLimit]:
    """Return the bounded fields of a request model, keyed by field name."""

    schema = model.model_json_schema()
    definitions = schema.get("$defs", {})
    limits: dict[str, InputLimit] = {}
    for name, field_schema in schema["properties"].items():
        limit = _field_limit(field_schema, definitions)
        if limit is not None:
            limits[name] = limit
    return limits


def _field_limit(
    schema: dict[str, Any],
    definitions: dict[str, Any],
) -> InputLimit | None:
    bounds: dict[str, int] = {}
    items: InputLimit | None = None
    # A nullable or union field lists its types under anyOf. Each bound
    # applies to one JSON type, so the bounds of all branches combine.
    for option in schema.get("anyOf", [schema]):
        if "$ref" in option:
            option = definitions[option["$ref"].rsplit("/", 1)[-1]]
        unsupported = _UNSUPPORTED & set(option)
        if unsupported:
            raise ValueError(
                f"Input limit {min(unsupported)!r} cannot be listed in the catalog."
            )
        for keyword, name in _BOUNDS.items():
            if keyword in option:
                bounds[name] = option[keyword]
        if "items" in option:
            items = _field_limit(option["items"], definitions)

    if not bounds and items is None:
        return None
    return InputLimit(**bounds, items=items)
