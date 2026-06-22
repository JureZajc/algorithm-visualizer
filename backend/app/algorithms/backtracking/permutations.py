from app.algorithms.backtracking.types import (
    BacktrackingResult,
    BacktrackingStep,
    BacktrackingStepType,
    create_backtracking_step,
)


def permutations_steps(values: list[str]) -> list[BacktrackingStep]:
    """Generate all permutations with choose/unchoose backtracking."""

    items = values.copy()
    used = [False for _ in items]
    partial: list[str] = []
    generated: list[list[str]] = []
    steps: list[BacktrackingStep] = [
        _create_list_step(
            "try",
            items,
            partial,
            generated,
            "Start with an empty permutation.",
            depth=0,
            pseudocode_line=1,
        )
    ]

    def backtrack(depth: int) -> None:
        if len(partial) == len(items):
            generated.append(partial.copy())
            steps.append(
                _create_list_step(
                    "solution_found",
                    items,
                    partial,
                    generated,
                    f"Completed permutation: {', '.join(partial)}.",
                    depth=depth,
                    pseudocode_line=2,
                )
            )
            return

        for index, item in enumerate(items):
            steps.append(
                _create_list_step(
                    "try",
                    items,
                    partial,
                    generated,
                    f"Consider {item!r} for position {depth + 1}.",
                    depth=depth,
                    active_item=item,
                    active_index=index,
                    used=used,
                    pseudocode_line=4,
                )
            )
            if used[index]:
                continue

            used[index] = True
            partial.append(item)
            steps.append(
                _create_list_step(
                    "choose",
                    items,
                    partial,
                    generated,
                    f"Choose {item!r} for the current permutation.",
                    depth=depth + 1,
                    active_item=item,
                    active_index=index,
                    used=used,
                    pseudocode_line=5,
                )
            )

            backtrack(depth + 1)

            removed = partial.pop()
            used[index] = False
            steps.append(
                _create_list_step(
                    "unchoose",
                    items,
                    partial,
                    generated,
                    f"Unchoose {removed!r} and try another option.",
                    depth=depth,
                    active_item=removed,
                    active_index=index,
                    used=used,
                    pseudocode_line=7,
                )
            )

    backtrack(0)
    steps.append(
        create_backtracking_step(
            "done",
            [],
            f"Generated {len(generated)} permutations.",
            pseudocode_line=8,
            result={
                "values": items.copy(),
                "permutations": [permutation.copy() for permutation in generated],
                "count": len(generated),
            },
        )
    )
    return steps


def _create_list_step(
    step_type: BacktrackingStepType,
    values: list[str],
    partial: list[str],
    generated: list[list[str]],
    description: str,
    *,
    depth: int,
    pseudocode_line: int,
    active_item: str | None = None,
    active_index: int | None = None,
    used: list[bool] | None = None,
) -> BacktrackingStep:
    result: BacktrackingResult = {
        "values": values.copy(),
        "partial": partial.copy(),
        "active_item": active_item,
        "active_index": active_index,
        "depth": depth,
        "used": used.copy() if used is not None else [],
        "generated": [item.copy() for item in generated],
        "generated_count": len(generated),
    }
    return create_backtracking_step(
        step_type,
        [],
        description,
        pseudocode_line=pseudocode_line,
        result=result,
    )
