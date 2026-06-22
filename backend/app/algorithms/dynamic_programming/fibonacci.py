from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def fibonacci_steps(n: int) -> list[DynamicProgrammingStep]:
    """Build Fibonacci values bottom-up."""

    table = [[0 for _ in range(n + 1)]]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            table,
            "Create a table for Fibonacci values from 0 through n.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]

    if n >= 1:
        table[0][1] = 1
        steps.append(
            create_dynamic_programming_step(
                "initialize",
                table,
                "Set the base value F(1) to 1.",
                active_cell=(0, 1),
                related_cells=[(0, 0)],
                pseudocode_line=2,
            )
        )

    for index in range(2, n + 1):
        related_cells = [(0, index - 1), (0, index - 2)]
        steps.append(
            create_dynamic_programming_step(
                "compare",
                table,
                (
                    f"Read F({index - 1}) and F({index - 2}) before "
                    f"computing F({index})."
                ),
                active_cell=(0, index),
                related_cells=related_cells,
                pseudocode_line=3,
            )
        )
        table[0][index] = table[0][index - 1] + table[0][index - 2]
        steps.append(
            create_dynamic_programming_step(
                "update",
                table,
                f"Store F({index}) = {table[0][index]}.",
                active_cell=(0, index),
                related_cells=related_cells,
                pseudocode_line=4,
            )
        )

    steps.append(
        create_dynamic_programming_step(
            "done",
            table,
            f"Fibonacci number F({n}) is {table[0][n]}.",
            active_cell=(0, n),
            pseudocode_line=5,
            result=table[0][n],
        )
    )
    return steps
