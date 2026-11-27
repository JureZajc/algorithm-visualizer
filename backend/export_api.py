"""Write the API contract that the frontend types are generated from.

The script writes two files to frontend/types/generated/:

- openapi.json: the OpenAPI schema, which openapi-typescript turns into api.ts.
- catalog.ts: the algorithm labels and input limits that GET /algorithms serves.

Run `npm run generate:api` in frontend/ to write both and regenerate api.ts.
The output is deterministic, so CI can fail when the committed files are stale.
"""

import json
from pathlib import Path
from typing import Any

from app.main import app
from app.routers.catalog import algorithms

REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIRECTORY = REPOSITORY_ROOT / "frontend" / "types" / "generated"
CATALOG_HEADER = """\
/**
 * This file was generated from the backend's GET /algorithms catalog.
 * Do not edit it by hand. Run `npm run generate:api` in frontend/ instead.
 */
"""


def to_json(value: object, *, sort_keys: bool = False) -> str:
    return json.dumps(value, indent=2, sort_keys=sort_keys, ensure_ascii=False)


def catalog_module() -> str:
    """Return a TypeScript module with each algorithm's label and limits."""

    # A bound that does not apply is null; leaving it out keeps only real limits.
    catalog: dict[str, list[dict[str, Any]]] = algorithms().model_dump(
        mode="json", exclude_none=True
    )
    # The catalog lists algorithms in display order, and the forms list them in
    # the same order, so these mappings keep it.
    labels = {
        category: {entry["id"]: entry["label"] for entry in entries}
        for category, entries in catalog.items()
    }
    limits = {
        category: {entry["id"]: entry["limits"] for entry in entries}
        for category, entries in catalog.items()
    }
    return (
        f"{CATALOG_HEADER}\n"
        "/** Display labels, by category and algorithm id. */\n"
        f"export const CATALOG_LABELS = {to_json(labels)} as const;\n"
        "\n"
        "/** Input limits, by category, algorithm id, and request field. */\n"
        f"export const CATALOG_LIMITS = {to_json(limits)} as const;\n"
    )


def write(name: str, content: str) -> None:
    path = OUTPUT_DIRECTORY / name
    # A fixed newline keeps the files identical on Windows.
    path.write_text(content, encoding="utf-8", newline="\n")
    print(f"Wrote {path.relative_to(REPOSITORY_ROOT).as_posix()}")


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    # Key order means nothing in the schema; sorting it keeps the file stable
    # when the backend reorders models or fields.
    write("openapi.json", f"{to_json(app.openapi(), sort_keys=True)}\n")
    write("catalog.ts", catalog_module())


if __name__ == "__main__":
    main()
