from app.algorithms.backtracking.types import (
    BacktrackingResult,
    BacktrackingStep,
    BacktrackingStepType,
    create_backtracking_step,
)


def subsets_steps(values: list[str]) -> list[BacktrackingStep]:
    """Generate all subsets with include/exclude backtracking."""

    items = values.copy()
    partial: list[str] = []
    generated: list[list[str]] = []
    steps: list[BacktrackingStep] = [
        _create_list_step(
            "try",
            items,
            partial,
            len(generated),
            "Start with an empty subset.",
            depth=0,
            decision="start",
            pseudocode_line=1,
        )
    ]

    def backtrack(index: int) -> None:
        if index == len(items):
            generated.append(partial.copy())
            subset_label = ", ".join(partial) if partial else "empty set"
            steps.append(
                _create_list_step(
                    "solution_found",
                    items,
                    partial,
                    len(generated),
                    f"Record subset: {subset_label}.",
                    depth=index,
                    decision="record",
                    pseudocode_line=2,
                    generated_item=partial,
                )
            )
            return

        item = items[index]
        steps.append(
            _create_list_step(
                "try",
                items,
                partial,
                len(generated),
                f"Decide whether to include {item!r}.",
                depth=index,
                active_item=item,
                active_index=index,
                decision="decide",
                pseudocode_line=4,
            )
        )

        partial.append(item)
        steps.append(
            _create_list_step(
                "choose",
                items,
                partial,
                len(generated),
                f"Include {item!r} in the current subset.",
                depth=index + 1,
                active_item=item,
                active_index=index,
                decision="include",
                pseudocode_line=5,
            )
        )
        backtrack(index + 1)

        removed = partial.pop()
        steps.append(
            _create_list_step(
                "unchoose",
                items,
                partial,
                len(generated),
                f"Remove {removed!r} before exploring the exclude branch.",
                depth=index,
                active_item=removed,
                active_index=index,
                decision="unchoose",
                pseudocode_line=6,
            )
        )

        steps.append(
            _create_list_step(
                "try",
                items,
                partial,
                len(generated),
                f"Exclude {item!r} and continue.",
                depth=index + 1,
                active_item=item,
                active_index=index,
                decision="exclude",
                pseudocode_line=7,
            )
        )
        backtrack(index + 1)

    backtrack(0)
    steps.append(
        create_backtracking_step(
            "done",
            [],
            f"Generated {len(generated)} subsets.",
            pseudocode_line=8,
            result={
                "values": items.copy(),
                "subsets": [subset.copy() for subset in generated],
                "count": len(generated),
            },
        )
    )
    return steps


def _create_list_step(
    step_type: BacktrackingStepType,
    values: list[str],
    partial: list[str],
    generated_count: int,
    description: str,
    *,
    depth: int,
    decision: str,
    pseudocode_line: int,
    active_item: str | None = None,
    active_index: int | None = None,
    generated_item: list[str] | None = None,
) -> BacktrackingStep:
    # Steps do not repeat the results found so far: a solution_found step
    # carries the one result it adds, and clients rebuild the list from those.
    result: BacktrackingResult = {
        "values": values.copy(),
        "partial": partial.copy(),
        "active_item": active_item,
        "active_index": active_index,
        "depth": depth,
        "decision": decision,
        "generated_count": generated_count,
    }
    if generated_item is not None:
        result["generated_item"] = generated_item.copy()
    return create_backtracking_step(
        step_type,
        [],
        description,
        pseudocode_line=pseudocode_line,
        result=result,
    )
