# Algorithm Visualizer

Algorithm Visualizer is an open-source learning project that generates
step-by-step algorithm states in a FastAPI backend and animates them in a
Next.js frontend. Each supported algorithm includes a learning-focused
explanation and pseudocode panel whose active line follows the current
visualization step.

## Supported algorithms

### Sorting

- Bubble Sort
- Selection Sort
- Insertion Sort
- Merge Sort
- Quick Sort
- Heap Sort
- Shell Sort
- Cocktail Shaker Sort
- Gnome Sort
- Comb Sort
- Counting Sort

### Searching

- Linear Search
- Binary Search

Binary search requires its input array to already be sorted in ascending
order. The API returns HTTP 422 for unsorted input.

### Graph / Pathfinding

- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Dijkstra's Algorithm
- A* Search
- Topological Sort
- Kruskal's Minimum Spanning Tree
- Prim's Minimum Spanning Tree

The frontend includes curated weighted graph presets, a custom graph editor,
and dedicated SVG states for traversal, shortest-path, topological-order, and
minimum-spanning-tree algorithms. Controls adapt to each algorithm: pathfinding
uses start and target nodes, Topological Sort uses a directed graph, Prim uses a
start node, and both MST algorithms use undirected edges. A* displays generated
admissible heuristics, while Dijkstra and A* display live path costs.
Topological results, candidate and accepted MST edges, and total forest weight
are shown alongside the animation.

### Dynamic Programming

- Fibonacci DP
- Coin Change
- 0/1 Knapsack
- Longest Common Subsequence
- Edit Distance
- Grid Unique Paths

Dynamic programming visualizations use tables or grids with an active cell,
related dependency cells, synchronized pseudocode, and the final computed
result. Coin Change uses unlimited coins and displays impossible states as
`inf`.

## API

The backend exposes these main routes:

- `GET /algorithms` lists supported sorting, searching, graph, and dynamic
  programming algorithms with descriptions, complexity bounds, notes or
  limitations, and ordered pseudocode.
- `POST /numbers/random` generates an array of random integers.
- `POST /sorting/steps` generates visualization steps for a sorting algorithm.
- `POST /searching/steps` generates visualization steps for a search.
- `POST /graph/steps` generates graph algorithm visualization steps.
- `POST /dynamic-programming/steps` generates dynamic programming table steps.

Each item returned by `GET /algorithms` has this shape:

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

`label` is retained as a compatibility alias for `name`. Complexity values
describe the algorithms themselves and do not include the extra snapshots kept
for step-by-step animation.

Sorting request example:

```json
{
  "numbers": [5, 3, 8, 1],
  "algorithm": "heap_sort"
}
```

Searching request example:

```json
{
  "numbers": [1, 3, 5, 7, 9],
  "algorithm": "binary_search",
  "target": 7
}
```

Graph request example:

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

A* accepts optional heuristic values keyed by node. Missing heuristic values
default to zero, which makes it behave like Dijkstra's algorithm:

```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "D", "weight": 2 },
    { "source": "A", "target": "C", "weight": 4 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "a_star",
  "directed": false,
  "heuristics": { "A": 2, "B": 1, "C": 3, "D": 0 }
}
```

Topological sort requires a directed graph. A cycle produces a
`cycle_detected` step followed by `done`:

```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "A", "target": "C", "weight": 1 },
    { "source": "B", "target": "D", "weight": 1 },
    { "source": "C", "target": "D", "weight": 1 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "topological_sort",
  "directed": true
}
```

Kruskal treats edges as undirected and ignores `start`, `target`, and
`directed` while preserving those fields in the shared API contract:

```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "C", "weight": 2 },
    { "source": "C", "target": "D", "weight": 3 },
    { "source": "A", "target": "D", "weight": 8 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "kruskal",
  "directed": false
}
```

Prim also treats edges as undirected and uses `start` as its first node:

```json
{
  "nodes": ["A", "B", "C", "D"],
  "edges": [
    { "source": "A", "target": "B", "weight": 1 },
    { "source": "B", "target": "C", "weight": 2 },
    { "source": "C", "target": "D", "weight": 3 },
    { "source": "A", "target": "D", "weight": 8 }
  ],
  "start": "A",
  "target": "D",
  "algorithm": "prim",
  "directed": false
}
```

Graph steps share the original pathfinding fields and also include `result`
for topological order, `frontier_edges` for Prim candidates, `mst_edges` for
accepted spanning-forest edges, and `total_weight` for the current forest.

Dynamic Programming request example:

```json
{
  "algorithm": "coin_change",
  "coins": [1, 3, 4],
  "amount": 6
}
```

The dynamic programming endpoint accepts algorithm-specific fields: `n` for
Fibonacci, `coins` and `amount` for Coin Change, `weights`, `values`, and
`capacity` for Knapsack, `text_a` and `text_b` for LCS and Edit Distance, and
`rows` and `cols` for Grid Unique Paths.

Dynamic programming steps have this shape:

```json
{
  "type": "update",
  "table": [[0, 1, 1, 2]],
  "active_cell": [0, 3],
  "related_cells": [[0, 2], [0, 1]],
  "description": "Store F(3) = 2.",
  "pseudocode_line": 4,
  "result": null
}
```

`active_cell` and `related_cells` use zero-based `[row, column]` coordinates.
The final `done` step contains the canonical `result`.

Every visualization step contains its existing state fields and may also
include a 1-based `pseudocode_line`. The frontend uses that number to highlight
the matching line while the animation plays. Older clients can ignore the
additive field, and steps without it remain valid. Responses also include the
initial input and total step count.

The pseudocode panel stays synchronized across sorting, searching, graph, and
dynamic programming visualizers, pairing highlighted algorithm steps with the
existing descriptions, complexity details, notes, and live data-structure state.

## Sample presets

Each visualizer includes frontend-only sample presets for quickly loading useful
inputs. Sorting examples cover common data shapes and array sizes, searching
examples cover successful and unsuccessful target positions plus binary search,
graph examples cover paths, weights, disconnected components, cycles,
topological sorting, minimum spanning trees, and A* search, and dynamic
programming examples cover one-dimensional, string, item, coin, and grid
tables. Selecting a preset updates the current input while leaving the existing
manual controls available.

## Custom graph editor

Choose **Custom graph** from the Graph menu to build a graph for the current
browser session:

1. Enter a unique node ID, click **Add node**, then click the SVG canvas to
   place it.
2. Choose two existing nodes, enter a numeric weight, and click **Add edge**.
3. Edit weights directly in the edge list, or remove edges and nodes with their
   remove buttons. Removing a node also removes its connected edges.
4. Choose directed or undirected mode and select the start and target nodes.
5. Select an algorithm and click **Start visualization**.

Node IDs cannot be empty or duplicated. Edges must connect two different
existing nodes, and weights must be finite numbers. Negative weights can be
stored for algorithms that support them, but Dijkstra and A* clearly block the
run because they require non-negative weights. Topological Sort temporarily
runs the graph as directed, while Kruskal and Prim temporarily run it as
undirected; the editor preserves the user's graph type choice for other
algorithms. Switching to a preset does not discard the custom draft.

### Importing and exporting custom graphs

The custom graph editor can save and load graphs as JSON. Use **Export JSON**
to download the current custom graph, or **Copy JSON** to place the same JSON on
the clipboard for sharing. To load a graph, paste JSON into the import box and
click **Load JSON**. The saved JSON includes nodes, edges, node positions,
directed mode, the selected start node, and the selected target node.

## Local development on macOS

Run the backend and frontend in separate Terminal tabs from the repository
root. Install Python dependencies through `uv` and frontend dependencies with
`npm install` before the first run.

### Backend

```bash
cd backend
uv run uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive documentation is
available at `http://127.0.0.1:8000/docs`.

Run backend tests and lint checks with:

```bash
cd backend
uv run ruff check .
uv run pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3000` and expects the backend
on port 8000 by default.

Open `http://localhost:3000`, choose a visualizer mode, select a preset or edit
the inputs, and click **Start visualization**. Playback can be paused, resumed,
reset, and slowed down while the side panel reports algorithm-specific state.

Run the production frontend check with:

```bash
cd frontend
npm run build
```
