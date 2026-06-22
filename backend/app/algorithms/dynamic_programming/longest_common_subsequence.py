from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def _reconstruct_lcs(text_a: str, text_b: str, table: list[list[int]]) -> str:
    row = len(text_a)
    column = len(text_b)
    letters: list[str] = []

    while row > 0 and column > 0:
        if text_a[row - 1] == text_b[column - 1]:
            letters.append(text_a[row - 1])
            row -= 1
            column -= 1
        elif table[row - 1][column] >= table[row][column - 1]:
            row -= 1
        else:
            column -= 1

    return "".join(reversed(letters))


def lcs_steps(text_a: str, text_b: str) -> list[DynamicProgrammingStep]:
    """Find a longest common subsequence of two strings."""

    table = [[0 for _ in range(len(text_b) + 1)] for _ in range(len(text_a) + 1)]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            table,
            "Create a table for prefixes of both strings.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]

    for row, char_a in enumerate(text_a, start=1):
        for column, char_b in enumerate(text_b, start=1):
            steps.append(
                create_dynamic_programming_step(
                    "compare",
                    table,
                    f"Compare {char_a!r} with {char_b!r}.",
                    active_cell=(row, column),
                    related_cells=[(row - 1, column - 1)],
                    pseudocode_line=4,
                )
            )

            if char_a == char_b:
                table[row][column] = table[row - 1][column - 1] + 1
                steps.append(
                    create_dynamic_programming_step(
                        "update",
                        table,
                        f"Characters match; extend the diagonal to {table[row][column]}.",
                        active_cell=(row, column),
                        related_cells=[(row - 1, column - 1)],
                        pseudocode_line=4,
                    )
                )
            else:
                top = table[row - 1][column]
                left = table[row][column - 1]
                table[row][column] = max(top, left)
                steps.append(
                    create_dynamic_programming_step(
                        "choose",
                        table,
                        f"Characters differ; keep the longer prefix length {table[row][column]}.",
                        active_cell=(row, column),
                        related_cells=[(row - 1, column), (row, column - 1)],
                        pseudocode_line=5,
                    )
                )

    result = _reconstruct_lcs(text_a, text_b, table)
    steps.append(
        create_dynamic_programming_step(
            "done",
            table,
            f"Longest common subsequence: {result!r}.",
            active_cell=(len(text_a), len(text_b)),
            pseudocode_line=7,
            result=result,
        )
    )
    return steps
