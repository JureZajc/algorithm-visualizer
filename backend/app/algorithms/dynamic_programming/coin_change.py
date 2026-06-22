from app.algorithms.dynamic_programming.types import (
    DynamicProgrammingCell,
    DynamicProgrammingStep,
    create_dynamic_programming_step,
)


def _display_table(
    table: list[list[int]],
    impossible_value: int,
) -> list[list[DynamicProgrammingCell]]:
    return [
        ["inf" if value >= impossible_value else value for value in row]
        for row in table
    ]


def coin_change_steps(coins: list[int], amount: int) -> list[DynamicProgrammingStep]:
    """Find the minimum number of coins needed for an amount."""

    coin_values = coins.copy()
    impossible_value = amount + 1
    table = [
        [0 if current_amount == 0 else impossible_value for current_amount in range(amount + 1)]
        for _ in range(len(coin_values) + 1)
    ]
    steps: list[DynamicProgrammingStep] = [
        create_dynamic_programming_step(
            "initialize",
            _display_table(table, impossible_value),
            "Set amount 0 to 0 coins and all other amounts to infinity.",
            active_cell=(0, 0),
            pseudocode_line=2,
        )
    ]

    for row, coin in enumerate(coin_values, start=1):
        for current_amount in range(1, amount + 1):
            related_cells = [(row - 1, current_amount)]
            if current_amount >= coin:
                related_cells.append((row, current_amount - coin))

            steps.append(
                create_dynamic_programming_step(
                    "compare",
                    _display_table(table, impossible_value),
                    (
                        f"Compare amount {current_amount} without coin {coin} "
                        "against using that coin."
                    ),
                    active_cell=(row, current_amount),
                    related_cells=related_cells,
                    pseudocode_line=5,
                )
            )

            without_coin = table[row - 1][current_amount]
            with_coin = (
                table[row][current_amount - coin] + 1
                if current_amount >= coin
                else impossible_value
            )
            table[row][current_amount] = min(without_coin, with_coin)
            chose_coin = with_coin < without_coin
            step_type = "choose" if chose_coin else "skip"
            description = (
                f"Use coin {coin}; {current_amount} needs {with_coin} coins."
                if chose_coin
                else f"Keep the previous best for amount {current_amount}."
            )
            steps.append(
                create_dynamic_programming_step(
                    step_type,
                    _display_table(table, impossible_value),
                    description,
                    active_cell=(row, current_amount),
                    related_cells=related_cells,
                    pseudocode_line=6,
                )
            )

    best = table[-1][amount]
    result: int | str = best if best < impossible_value else "not possible"
    steps.append(
        create_dynamic_programming_step(
            "done",
            _display_table(table, impossible_value),
            f"Minimum coins for amount {amount}: {result}.",
            active_cell=(len(coin_values), amount),
            pseudocode_line=7,
            result=result,
        )
    )
    return steps
