# Algorithm Visualizer API

The FastAPI backend validates visualization inputs and returns ordered execution states for the frontend to animate. Start it from the repository root with:

```bash
python scripts/dev.py backend
```

The API is served at `http://127.0.0.1:8000`, with interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | API welcome response |
| `GET` | `/algorithms` | Metadata, complexities, notes, and pseudocode |
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
  ]
}
```

`label` is retained as a compatibility alias for `name`.

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

Binary Search requires an ascending input array; an unsorted request is rejected with HTTP 422.

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

Keys may be integers or strings. Integers hash with `key % table_size`; strings hash by summing character codes modulo the table size. Search results report whether the target was found and which buckets were visited.

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

Missing A* heuristic values default to zero. Topological Sort requires a directed graph. Dijkstra and A* require non-negative weights. Kruskal and Prim operate on undirected graphs.

## Dynamic Programming

The request fields vary by algorithm. For example, 0/1 Knapsack uses:

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

Other algorithms use `n` for Fibonacci, `coins` and `amount` for Coin Change, `text_a` and `text_b` for Edit Distance, or `rows` and `cols` for Grid Unique Paths.

## Backtracking

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

Backtracking also supports `maze_solver`, `subsets`, and `sudoku_solver`. Maze requests can use deterministic presets or a custom grid with start and end coordinates. Sudoku requests accept a 9 × 9 board.

## Validation Errors

Invalid input is returned through FastAPI's standard HTTP 422 validation response. Algorithm-specific checks include array bounds and ordering, unique tree values, graph references and weight constraints, bounded dynamic-programming inputs, and well-formed backtracking boards or grids.

For the exact current schema, use the generated OpenAPI interface at `http://127.0.0.1:8000/docs`.
