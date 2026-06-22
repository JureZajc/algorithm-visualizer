from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def edit_distance_steps(text_a: str, text_b: str) -> list[DynamicProgrammingStep]:
    """Compute Levenshtein edit distance between two strings."""

    table = [[0 for _ in range(len(text_b) + 1)] for _ in range(len(text_a) + 1)]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            table,
            "Create a table for converting prefixes of the source to the target.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]

    for row in range(1, len(text_a) + 1):
        table[row][0] = row
        steps.append(
            create_dynamic_programming_step(
                "initialize",
                table,
                f"Deleting {row} source characters costs {row}.",
                active_cell=(row, 0),
                pseudocode_line=2,
            )
        )

    for column in range(1, len(text_b) + 1):
        table[0][column] = column
        steps.append(
            create_dynamic_programming_step(
                "initialize",
                table,
                f"Inserting {column} target characters costs {column}.",
                active_cell=(0, column),
                pseudocode_line=2,
            )
        )

    for row, char_a in enumerate(text_a, start=1):
        for column, char_b in enumerate(text_b, start=1):
            related_cells = [
                (row - 1, column),
                (row, column - 1),
                (row - 1, column - 1),
            ]
            steps.append(
                create_dynamic_programming_step(
                    "compare",
                    table,
                    f"Compare {char_a!r} with {char_b!r}.",
                    active_cell=(row, column),
                    related_cells=related_cells,
                    pseudocode_line=5,
                )
            )

            if char_a == char_b:
                table[row][column] = table[row - 1][column - 1]
                steps.append(
                    create_dynamic_programming_step(
                        "skip",
                        table,
                        "Characters match, so no edit is needed.",
                        active_cell=(row, column),
                        related_cells=[(row - 1, column - 1)],
                        pseudocode_line=5,
                    )
                )
            else:
                delete_cost = table[row - 1][column]
                insert_cost = table[row][column - 1]
                replace_cost = table[row - 1][column - 1]
                table[row][column] = 1 + min(
                    delete_cost,
                    insert_cost,
                    replace_cost,
                )
                steps.append(
                    create_dynamic_programming_step(
                        "choose",
                        table,
                        f"Choose the cheapest edit; cost becomes {table[row][column]}.",
                        active_cell=(row, column),
                        related_cells=related_cells,
                        pseudocode_line=6,
                    )
                )

    result = table[-1][-1]
    steps.append(
        create_dynamic_programming_step(
            "done",
            table,
            f"Edit distance from {text_a!r} to {text_b!r} is {result}.",
            active_cell=(len(text_a), len(text_b)),
            pseudocode_line=7,
            result=result,
        )
    )
    return steps
