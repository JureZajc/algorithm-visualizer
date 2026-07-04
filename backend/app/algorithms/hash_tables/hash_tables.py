from app.algorithms.hash_tables.types import (
    HashKey,
    HashTableSnapshot,
    HashTableStep,
    create_hash_table,
    create_hash_table_step,
)


def hash_insert_chaining_steps(
    values: list[HashKey],
    table_size: int,
) -> list[HashTableStep]:
    """Insert keys into a hash table that resolves collisions with chains."""

    table = create_hash_table(table_size, "separate_chaining")
    steps: list[HashTableStep] = []

    for key in values:
        hash_index = hash_key(key, table_size)
        bucket = table["buckets"][hash_index]
        visited = [hash_index]

        steps.append(
            create_hash_table_step(
                "hash",
                table,
                key,
                f"Hash {key} to bucket {hash_index}.",
                hash_index=hash_index,
                pseudocode_line=2,
            )
        )
        steps.append(
            create_hash_table_step(
                "inspect_bucket",
                table,
                key,
                f"Inspect bucket {hash_index}.",
                hash_index=hash_index,
                active_bucket=hash_index,
                visited_buckets=visited,
                pseudocode_line=3,
            )
        )

        if bucket["items"]:
            steps.append(
                create_hash_table_step(
                    "collision",
                    table,
                    key,
                    f"Bucket {hash_index} already has {len(bucket['items'])} item(s), so chain {key}.",
                    hash_index=hash_index,
                    active_bucket=hash_index,
                    active_item=bucket["items"][0],
                    visited_buckets=visited,
                    pseudocode_line=4,
                )
            )

        bucket["items"].append(key)
        steps.append(
            create_hash_table_step(
                "insert",
                table,
                key,
                f"Insert {key} into bucket {hash_index}.",
                hash_index=hash_index,
                active_bucket=hash_index,
                active_item=key,
                visited_buckets=visited,
                pseudocode_line=5,
            )
        )

    result = _insert_result(table, values)
    steps.append(
        create_hash_table_step(
            "done",
            table,
            values[-1],
            "Hash insert with separate chaining is complete.",
            result=result,
            pseudocode_line=6,
        )
    )
    return steps


def hash_search_chaining_steps(
    values: list[HashKey],
    table_size: int,
    target: HashKey,
) -> list[HashTableStep]:
    """Search for a key in a hash table that uses separate chaining."""

    table = _build_chaining_table(values, table_size)
    hash_index = hash_key(target, table_size)
    bucket = table["buckets"][hash_index]
    visited = [hash_index]
    steps: list[HashTableStep] = [
        create_hash_table_step(
            "hash",
            table,
            target,
            f"Hash target {target} to bucket {hash_index}.",
            hash_index=hash_index,
            pseudocode_line=1,
        ),
        create_hash_table_step(
            "inspect_bucket",
            table,
            target,
            f"Inspect bucket {hash_index}.",
            hash_index=hash_index,
            active_bucket=hash_index,
            visited_buckets=visited,
            pseudocode_line=2,
        ),
    ]
    result: dict[str, object] | None = None

    for item_index, item in enumerate(bucket["items"]):
        steps.append(
            create_hash_table_step(
                "compare",
                table,
                target,
                f"Compare {item} with target {target}.",
                hash_index=hash_index,
                active_bucket=hash_index,
                active_item=item,
                visited_buckets=visited,
                pseudocode_line=3,
            )
        )
        if item == target:
            result = {
                "found": True,
                "target": target,
                "bucket": hash_index,
                "index": item_index,
                "visited_buckets": visited.copy(),
            }
            steps.append(
                create_hash_table_step(
                    "found",
                    table,
                    target,
                    f"Found {target} in bucket {hash_index}.",
                    hash_index=hash_index,
                    active_bucket=hash_index,
                    active_item=item,
                    visited_buckets=visited,
                    result=result,
                    pseudocode_line=4,
                )
            )
            break

    if result is None:
        result = {
            "found": False,
            "target": target,
            "bucket": hash_index,
            "visited_buckets": visited.copy(),
        }
        steps.append(
            create_hash_table_step(
                "not_found",
                table,
                target,
                f"Target {target} is not in bucket {hash_index}.",
                hash_index=hash_index,
                active_bucket=hash_index,
                visited_buckets=visited,
                result=result,
                pseudocode_line=5,
            )
        )

    steps.append(
        create_hash_table_step(
            "done",
            table,
            target,
            "Hash search with separate chaining is complete.",
            hash_index=hash_index,
            visited_buckets=visited,
            result=result,
            pseudocode_line=6,
        )
    )
    return steps


def hash_insert_linear_probing_steps(
    values: list[HashKey],
    table_size: int,
) -> list[HashTableStep]:
    """Insert keys into a hash table that resolves collisions by probing."""

    table = create_hash_table(table_size, "linear_probing")
    steps: list[HashTableStep] = []

    for key in values:
        hash_index = hash_key(key, table_size)
        visited: list[int] = []
        steps.append(
            create_hash_table_step(
                "hash",
                table,
                key,
                f"Hash {key} to slot {hash_index}.",
                hash_index=hash_index,
                pseudocode_line=2,
            )
        )

        for offset in range(table_size):
            bucket_index = (hash_index + offset) % table_size
            bucket = table["buckets"][bucket_index]
            visited.append(bucket_index)

            if offset == 0:
                steps.append(
                    create_hash_table_step(
                        "inspect_bucket",
                        table,
                        key,
                        f"Inspect slot {bucket_index}.",
                        hash_index=hash_index,
                        active_bucket=bucket_index,
                        active_item=_first_item(bucket),
                        visited_buckets=visited,
                        pseudocode_line=3,
                    )
                )
            else:
                steps.append(
                    create_hash_table_step(
                        "probe",
                        table,
                        key,
                        f"Probe slot {bucket_index}.",
                        hash_index=hash_index,
                        active_bucket=bucket_index,
                        active_item=_first_item(bucket),
                        visited_buckets=visited,
                        pseudocode_line=5,
                    )
                )

            if bucket["items"]:
                steps.append(
                    create_hash_table_step(
                        "collision",
                        table,
                        key,
                        f"Slot {bucket_index} holds {bucket['items'][0]}, so continue probing.",
                        hash_index=hash_index,
                        active_bucket=bucket_index,
                        active_item=bucket["items"][0],
                        visited_buckets=visited,
                        pseudocode_line=4,
                    )
                )
                continue

            bucket["items"].append(key)
            steps.append(
                create_hash_table_step(
                    "insert",
                    table,
                    key,
                    f"Insert {key} into slot {bucket_index}.",
                    hash_index=hash_index,
                    active_bucket=bucket_index,
                    active_item=key,
                    visited_buckets=visited,
                    pseudocode_line=6,
                )
            )
            break
        else:
            raise ValueError("Linear probing table is full.")

    result = _insert_result(table, values)
    steps.append(
        create_hash_table_step(
            "done",
            table,
            values[-1],
            "Hash insert with linear probing is complete.",
            result=result,
            pseudocode_line=7,
        )
    )
    return steps


def hash_search_linear_probing_steps(
    values: list[HashKey],
    table_size: int,
    target: HashKey,
) -> list[HashTableStep]:
    """Search for a key in a hash table that uses linear probing."""

    table = _build_linear_table(values, table_size)
    hash_index = hash_key(target, table_size)
    visited: list[int] = []
    steps: list[HashTableStep] = [
        create_hash_table_step(
            "hash",
            table,
            target,
            f"Hash target {target} to slot {hash_index}.",
            hash_index=hash_index,
            pseudocode_line=1,
        )
    ]
    result: dict[str, object] | None = None

    for offset in range(table_size):
        bucket_index = (hash_index + offset) % table_size
        bucket = table["buckets"][bucket_index]
        visited.append(bucket_index)
        step_type = "inspect_bucket" if offset == 0 else "probe"
        pseudocode_line = 2 if offset == 0 else 5
        description = (
            f"Inspect slot {bucket_index}."
            if offset == 0
            else f"Probe slot {bucket_index}."
        )

        steps.append(
            create_hash_table_step(
                step_type,
                table,
                target,
                description,
                hash_index=hash_index,
                active_bucket=bucket_index,
                active_item=_first_item(bucket),
                visited_buckets=visited,
                pseudocode_line=pseudocode_line,
            )
        )

        if not bucket["items"]:
            result = {
                "found": False,
                "target": target,
                "bucket": bucket_index,
                "visited_buckets": visited.copy(),
            }
            steps.append(
                create_hash_table_step(
                    "not_found",
                    table,
                    target,
                    f"Slot {bucket_index} is empty, so {target} is not in the table.",
                    hash_index=hash_index,
                    active_bucket=bucket_index,
                    visited_buckets=visited,
                    result=result,
                    pseudocode_line=6,
                )
            )
            break

        item = bucket["items"][0]
        steps.append(
            create_hash_table_step(
                "compare",
                table,
                target,
                f"Compare {item} with target {target}.",
                hash_index=hash_index,
                active_bucket=bucket_index,
                active_item=item,
                visited_buckets=visited,
                pseudocode_line=3,
            )
        )
        if item == target:
            result = {
                "found": True,
                "target": target,
                "bucket": bucket_index,
                "visited_buckets": visited.copy(),
            }
            steps.append(
                create_hash_table_step(
                    "found",
                    table,
                    target,
                    f"Found {target} in slot {bucket_index}.",
                    hash_index=hash_index,
                    active_bucket=bucket_index,
                    active_item=item,
                    visited_buckets=visited,
                    result=result,
                    pseudocode_line=4,
                )
            )
            break

    if result is None:
        result = {
            "found": False,
            "target": target,
            "bucket": None,
            "visited_buckets": visited.copy(),
        }
        steps.append(
            create_hash_table_step(
                "not_found",
                table,
                target,
                f"Every slot was probed, so {target} is not in the table.",
                hash_index=hash_index,
                visited_buckets=visited,
                result=result,
                pseudocode_line=6,
            )
        )

    steps.append(
        create_hash_table_step(
            "done",
            table,
            target,
            "Hash search with linear probing is complete.",
            hash_index=hash_index,
            visited_buckets=visited,
            result=result,
            pseudocode_line=7,
        )
    )
    return steps


def hash_key(key: HashKey, table_size: int) -> int:
    """Hash integers by modulo and strings by their character code sum."""

    if isinstance(key, int):
        return key % table_size
    return sum(ord(character) for character in key) % table_size


def _build_chaining_table(
    values: list[HashKey],
    table_size: int,
) -> HashTableSnapshot:
    table = create_hash_table(table_size, "separate_chaining")
    for key in values:
        table["buckets"][hash_key(key, table_size)]["items"].append(key)
    return table


def _build_linear_table(
    values: list[HashKey],
    table_size: int,
) -> HashTableSnapshot:
    table = create_hash_table(table_size, "linear_probing")
    for key in values:
        hash_index = hash_key(key, table_size)
        for offset in range(table_size):
            bucket = table["buckets"][(hash_index + offset) % table_size]
            if not bucket["items"]:
                bucket["items"].append(key)
                break
        else:
            raise ValueError("Linear probing table is full.")
    return table


def _first_item(bucket: dict[str, object]) -> HashKey | None:
    items = bucket["items"]
    if isinstance(items, list) and items:
        item = items[0]
        if isinstance(item, int | str):
            return item
    return None


def _insert_result(
    table: HashTableSnapshot,
    values: list[HashKey],
) -> dict[str, object]:
    return {
        "strategy": table["strategy"],
        "table_size": table["size"],
        "values": values.copy(),
        "load_factor": len(values) / table["size"],
    }
