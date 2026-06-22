from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def knapsack_steps(
    weights: list[int],
    values: list[int],
    capacity: int,
) -> list[DynamicProgrammingStep]:
    """Solve 0/1 knapsack with a bottom-up table."""

    item_weights = weights.copy()
    item_values = values.copy()
    table = [[0 for _ in range(capacity + 1)] for _ in range(len(item_weights) + 1)]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            table,
            "Create a table with one row per item prefix and one column per capacity.",
            active_cell=(0, 0),
            pseudocode_line=1,
        )
    ]

    for item_index, (weight, value) in enumerate(
        zip(item_weights, item_values, strict=True),
        start=1,
    ):
        for current_capacity in range(capacity + 1):
            related_cells = [(item_index - 1, current_capacity)]
            if weight <= current_capacity:
                related_cells.append((item_index - 1, current_capacity - weight))

            steps.append(
                create_dynamic_programming_step(
                    "compare",
                    table,
                    (
                        f"Consider item {item_index} with weight {weight} "
                        f"and value {value} at capacity {current_capacity}."
                    ),
                    active_cell=(item_index, current_capacity),
                    related_cells=related_cells,
                    pseudocode_line=4,
                )
            )

            without_item = table[item_index - 1][current_capacity]
            with_item = (
                table[item_index - 1][current_capacity - weight] + value
                if weight <= current_capacity
                else -1
            )
            if with_item > without_item:
                table[item_index][current_capacity] = with_item
                step_type = "choose"
                description = (
                    f"Include item {item_index}; best value becomes {with_item}."
                )
                pseudocode_line = 5
            else:
                table[item_index][current_capacity] = without_item
                step_type = "skip"
                description = (
                    f"Skip item {item_index}; keep value {without_item}."
                )
                pseudocode_line = 6

            steps.append(
                create_dynamic_programming_step(
                    step_type,
                    table,
                    description,
                    active_cell=(item_index, current_capacity),
                    related_cells=related_cells,
                    pseudocode_line=pseudocode_line,
                )
            )

    result = table[-1][capacity]
    steps.append(
        create_dynamic_programming_step(
            "done",
            table,
            f"Best achievable value at capacity {capacity} is {result}.",
            active_cell=(len(item_weights), capacity),
            pseudocode_line=7,
            result=result,
        )
    )
    return steps
