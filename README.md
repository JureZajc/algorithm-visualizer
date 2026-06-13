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

The frontend includes curated weighted graph presets and dedicated SVG states
for traversal, shortest-path, topological-order, and minimum-spanning-tree
algorithms. Controls adapt to each algorithm: pathfinding uses start and target
nodes, Topological Sort uses a directed graph, Prim uses a start node, and both
MST algorithms use undirected edges. A* displays generated admissible
heuristics, while Dijkstra and A* display live path costs. Topological results,
candidate and accepted MST edges, and total forest weight are shown alongside
the animation.

## API

The backend exposes these main routes:

- `GET /algorithms` lists supported sorting, searching, and graph algorithms with
  descriptions, complexity bounds, notes or limitations, and ordered pseudocode.
- `POST /numbers/random` generates an array of random integers.
- `POST /sorting/steps` generates visualization steps for a sorting algorithm.
- `POST /searching/steps` generates visualization steps for a search.
- `POST /graph/steps` generates graph algorithm visualization steps.

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

Every visualization step contains its existing state fields and may also
include a 1-based `pseudocode_line`. The frontend uses that number to highlight
the matching line while the animation plays. Older clients can ignore the
additive field, and steps without it remain valid. Responses also include the
initial input and total step count.

The pseudocode panel stays synchronized across sorting, searching, and graph
visualizers, pairing highlighted algorithm steps with the existing descriptions,
complexity details, notes, and live data-structure state.

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

Open `http://localhost:3000`, choose **Graph / Pathfinding**, select a preset
and algorithm, configure the available start/target/direction controls, and
click **Start visualization**. Playback can be paused, resumed, reset, and
slowed down while the side panel reports algorithm-specific state.

Run the production frontend check with:

```bash
cd frontend
npm run build
```
