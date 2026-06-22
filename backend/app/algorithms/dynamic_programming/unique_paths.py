from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def unique_paths_steps(rows: int, cols: int) -> list[DynamicProgrammingStep]:
    """Count grid paths moving only right or down."""

    table = [[0 for _ in range(cols)] for _ in range(rows)]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            table,
            "Create a grid for counting paths to each cell.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]

    for row in range(rows):
        table[row][0] = 1
        steps.append(
            create_dynamic_programming_step(
                "initialize",
                table,
                "There is one way to reach cells in the first column.",
                active_cell=(row, 0),
                pseudocode_line=2,
            )
        )

    for column in range(1, cols):
        table[0][column] = 1
        steps.append(
            create_dynamic_programming_step(
                "initialize",
                table,
                "There is one way to reach cells in the first row.",
                active_cell=(0, column),
                pseudocode_line=2,
            )
        )

    for row in range(1, rows):
        for column in range(1, cols):
            related_cells = [(row - 1, column), (row, column - 1)]
            steps.append(
                create_dynamic_programming_step(
                    "compare",
                    table,
                    "Read paths from the cell above and the cell to the left.",
                    active_cell=(row, column),
                    related_cells=related_cells,
                    pseudocode_line=5,
                )
            )
            table[row][column] = table[row - 1][column] + table[row][column - 1]
            steps.append(
                create_dynamic_programming_step(
                    "update",
                    table,
                    f"Store {table[row][column]} paths for this grid cell.",
                    active_cell=(row, column),
                    related_cells=related_cells,
                    pseudocode_line=5,
                )
            )

    result = table[-1][-1]
    steps.append(
        create_dynamic_programming_step(
            "done",
            table,
            f"There are {result} unique paths through a {rows} by {cols} grid.",
            active_cell=(rows - 1, cols - 1),
            pseudocode_line=6,
            result=result,
        )
    )
    return steps
