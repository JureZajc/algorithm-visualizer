# Algorithm Visualizer API

The FastAPI backend validates visualization inputs and returns ordered execution states for the frontend to animate. Start it from the repository root with:

```bash
python scripts/dev.py backend
```

The helper prefers `http://127.0.0.1:8000`, selecting the next available port if
`8000` is occupied. Use the backend and API docs URLs it prints. To start both
the frontend and backend with matching URL and CORS configuration, run
`python scripts/dev.py dev` instead. The examples below use the preferred port;
substitute the printed backend URL when a fallback is selected.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | API welcome response |
| `GET` | `/algorithms` | Metadata, complexities, notes, pseudocode, and input limits |
| `POST` | `/numbers/random` | Generate a bounded random integer array |
| `POST` | `/sorting/steps` | Generate sorting execution states |
| `POST` | `/searching/steps` | Generate linear or binary search states |
| `POST` | `/hash-tables/steps` | Generate separate-chaining or linear-probing states |
| `POST` | `/trees/steps` | Generate BST, AVL insertion, search, or traversal states |
| `POST` | `/graph/steps` | Generate traversal, shortest-path, topological-sort, or MST states |
| `POST` | `/dynamic-programming/steps` | Generate dynamic-programming table states |
| `POST` | `/backtracking/steps` | Generate backtracking search states |

## Response Conventions

Step-generation responses identify the selected algorithm, repeat the normalized input where useful, return an ordered `steps` array, and include `step_count`.

Each step contains the state fields needed by its visualization plus a human-readable `description`. Most steps also include a 1-based `pseudocode_line`, which the frontend uses to highlight the corresponding line from the metadata catalog.

Every request, `input`, and step `result` has a typed schema in the OpenAPI document. Dynamic programming and backtracking have one request schema per algorithm, selected by `algorithm`, and backtracking also has one response schema per algorithm.

Complexity values describe the algorithms themselves; they do not include the additional snapshots retained for animation.

## Algorithm Metadata

`GET /algorithms` groups metadata by category. A catalog item has this shape:

```json
{
  "id": "bubble_sort",
  "label": "Bubble Sort",
  "name": "Bubble Sort",
  "category": "sorting",
  "description": "Repeatedly compares neighboring values and swaps pairs that are out of order.",
  "time_complexity": {
    "best": "O(n)",
    "average": "O(n²)",
    "worst": "O(n²)"
  },
  "space_complexity": "O(1)",
  "notes": ["Stable and in-place."],
  "pseudocode": [
    "for each pass through the unsorted values",
    "  compare each adjacent pair",
    "  if the left value is larger, swap the pair",
    "  stop early if the pass made no swaps",
    "return the sorted array"
  ],
  "limits": {
    "numbers": {
      "minimum": null,
      "maximum": null,
      "min_length": null,
      "max_length": null,
      "min_items": null,
      "max_items": 50,
      "items": {
        "minimum": -1000000,
        "maximum": 1000000,
        "min_length": null,
        "max_length": null,
        "min_items": null,
        "max_items": null,
        "items": null
      }
    }
  }
}
```

`label` is retained as a compatibility alias for `name`.

`limits` maps each bounded request field to its bounds. `minimum` and `maximum` bound a number, `min_length` and `max_length` count the characters of a string, `min_items` and `max_items` count the items of a list, and `items` bounds each item of a list. A `null` bound does not apply, and a field without bounds is left out. The limits are read from the request models that enforce them, so they always match the OpenAPI schema. Rules that relate two fields, such as matching Knapsack lists or unique tree values, are described in the sections below.

## Arrays

Generate random values:

```json
{
  "size": 12,
  "min_value": 5,
  "max_value": 100
}
```

Generate sorting steps:

```json
{
  "numbers": [5, 3, 8, 1],
  "algorithm": "heap_sort"
}
```

Generate searching steps:

```json
{
  "numbers": [1, 3, 5, 7, 9],
  "algorithm": "binary_search",
  "target": 7
}
```

Array requests accept at most 50 values, each between -1,000,000 and 1,000,000; random generation accepts a `size` from 0 to 50 and requires `min_value` to be at most `max_value`. Binary Search requires an ascending input array; an unsorted request is rejected with HTTP 422.

## Hash Tables

```json
{
  "algorithm": "hash_insert_chaining",
  "values": [12, 22, 32, 5],
  "table_size": 10
}
```

```json
{
  "algorithm": "hash_search_linear_probing",
  "values": [12, 22, 32, 5],
  "table_size": 10,
  "target": 32
}
```

Keys may be integers or strings of up to 32 characters. Integers hash with `key % table_size`; strings hash by summing character codes modulo the table size. Search results report whether the target was found and which buckets were visited.

## Trees

```json
{
  "algorithm": "bst_search",
  "values": [8, 3, 10, 1, 6, 14, 4, 7, 13],
  "target": 7
}
```

Tree requests accept 1 to 31 unique integers. Supported operations are `bst_insert`, `avl_insert`, `bst_search`, `inorder_traversal`, `preorder_traversal`, and `postorder_traversal`. Tree snapshots use recursive `{ "value", "left", "right" }` nodes.

## Graphs

```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 2 },
    { "source": "B", "target": "D", "weight": 3 },
    { "source": "A", "target": "C", "weight": 1 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "dijkstra",
  "directed": false
}
```

A* additionally accepts optional non-negative heuristic values keyed by node:

```json
{
  "nodes": ["A", "B", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "D", "weight": 2 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "a_star",
  "directed": false,
  "heuristics": { "A": 2, "B": 1, "D": 0 }
}
```

Graph requests accept at most 30 nodes and 200 edges, with non-empty node names of up to 20 characters. Edge weights and heuristic values must be finite numbers. Missing A* heuristic values default to zero. Topological Sort requires a directed graph. Dijkstra and A* require non-negative weights. Kruskal and Prim operate on undirected graphs.

## Dynamic Programming

Each algorithm has its own request schema, selected by `algorithm`. An omitted field takes its default, and fields that belong to another algorithm are ignored. The response's `input` repeats the fields the algorithm used.

| `algorithm` | Fields and defaults |
| --- | --- |
| `fibonacci` | `n` = 8 |
| `coin_change` | `coins` = `[1, 3, 4]`, `amount` = 6 |
| `knapsack` | `weights` = `[2, 3, 4, 5]`, `values` = `[3, 4, 5, 6]`, `capacity` = 5 |
| `lcs` | `text_a` = `"ABCDEF"`, `text_b` = `"ACE"` |
| `edit_distance` | `text_a` = `"kitten"`, `text_b` = `"sitting"` |
| `unique_paths` | `rows` = 3, `cols` = 7 |

For example, 0/1 Knapsack uses:

```json
{
  "algorithm": "knapsack",
  "weights": [2, 3, 4, 5],
  "values": [3, 4, 5, 6],
  "capacity": 5
}
```

Longest Common Subsequence uses:

```json
{
  "algorithm": "lcs",
  "text_a": "ABCDEF",
  "text_b": "ACE"
}
```

Knapsack requires `weights` and `values` of the same length. The bounds of every field are listed under `limits` in `GET /algorithms`.

## Backtracking

Each algorithm has its own request schema, selected by `algorithm`. An omitted field takes its default, and fields that belong to another algorithm are ignored.

| `algorithm` | Fields and defaults |
| --- | --- |
| `n_queens` | `size` = 4 |
| `maze_solver` | `rows` = 7, `cols` = 7, `preset` = `"classic"`; optional `grid`, `start`, `end` |
| `permutations` | `values` = `["A", "B", "C"]` |
| `subsets` | `values` = `["A", "B", "C"]` |
| `sudoku_solver` | `board` = the default puzzle, which brute force solves in 1,434 steps |

```json
{
  "algorithm": "n_queens",
  "size": 4
}
```

```json
{
  "algorithm": "permutations",
  "values": ["A", "B", "C"]
}
```

Maze requests can use deterministic presets or a custom `grid` of `rows` rows and `cols` cells, with `[row, column]` coordinates for `start` and `end`. The response's `input` lists `end` under `target`. Sudoku requests accept a 9 × 9 board; puzzles whose brute-force search exceeds 10,000 steps are rejected with HTTP 422. Permutation and subset values are trimmed and limited to 12 characters each.

The response schema also depends on `algorithm`: each one states the shape of its steps' `result`.

Steps do not repeat data that a client can keep or rebuild:

- **Sudoku.** The response carries `initial_board` (the normalized puzzle, with `.` for empty cells) and `fixed_cells` (the `[row, column]` positions of the givens) once, at the top level. Both are `null` for the other backtracking algorithms. Each step's `grid` holds the current board, and its `result` holds only `solved`, `solution`, `tried_value`, and `conflicts`.
- **Permutations and subsets.** Each step's `result` holds `generated_count`, the number of results found so far. A `solution_found` step also holds `generated_item`, the one result it adds. To show the results found up to a step, collect `generated_item` from the `solution_found` steps up to and including it. The final `done` step lists every result under `permutations` or `subsets`.

```json
{
  "algorithm": "sudoku_solver",
  "input": { "board": [["5", "3", ".", "…"], "…"] },
  "initial_board": [["5", "3", ".", "…"], "…"],
  "fixed_cells": [[0, 0], [0, 1], "…"],
  "steps": [
    {
      "type": "try",
      "grid": [["5", "3", ".", "…"], "…"],
      "active_cell": [0, 2],
      "related_cells": [[0, 7]],
      "description": "Try 1 at row 1, column 3.",
      "pseudocode_line": 3,
      "result": { "solved": false, "solution": [], "tried_value": "1", "conflicts": [[0, 7]] }
    },
    "…"
  ],
  "step_count": 1434
}
```

The example is abbreviated with `"…"`; it shows the default puzzle's first try.

## Validation Errors

Invalid input is rejected with HTTP 422 in one of two forms:

- A request that does not match its schema, including a value outside its `limits`, returns FastAPI's standard validation response: `detail` is a list of errors, each with a `loc` path, a `msg`, and a `type`. For dynamic programming and backtracking, the path names the algorithm, for example `["body", "fibonacci", "n"]`.
- A check that needs the algorithm itself returns `detail` as a single message, for example an unsorted Binary Search input, a negative Dijkstra weight, or a Sudoku puzzle with duplicate givens or more than 10,000 steps.

Checks that relate several fields use the first form, with a `msg` that starts with `Value error,`. They include unique tree values, graph references, matching Knapsack lists, and a custom maze grid that matches `rows` and `cols`.

For the exact current schema, use the generated OpenAPI interface at the API docs URL printed by the helper (`http://127.0.0.1:8000/docs` when the preferred port is available).
