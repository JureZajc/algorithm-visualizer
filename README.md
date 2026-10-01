# Algorithm Visualizer

An interactive educational application for understanding algorithms through step-by-step visualization. Instead of only seeing the final answer, you can follow each comparison, traversal, table update, recursive choice, and data-structure change as it happens.

![Algorithm Visualizer showing Bubble Sort in progress with playback controls and synchronized pseudocode](docs/images/algorithm-visualizer-overview.png)

## Overview

Algorithm Visualizer pairs a FastAPI backend with a Next.js frontend. The backend turns an algorithm run into an ordered series of execution states; the frontend animates those states alongside the matching pseudocode, explanation, complexity information, and live run details.

The project spans arrays, hash tables, trees, graphs, dynamic programming, and backtracking, making it both a learning tool and a full-stack portfolio project.

## Features

- Follow an algorithm automatically or move one step at a time with play, pause, previous, next, first, last, restart, reset, seek, and speed controls.
- Enable Learning mode to predict algorithm behavior before selected execution steps, receive feedback, and track your score and streak.
- See the active pseudocode line, current operation, progress, elapsed time, result, and algorithm-specific state together.
- Review descriptions, best/average/worst time complexity, space complexity, and implementation notes for every algorithm.
- Start quickly with curated examples, generate random arrays, or enter problem-specific values manually.
- Compare two to four sorting algorithms on the same input using step, comparison, swap, overwrite, and average-complexity metrics.
- Explore graph traversals, shortest paths, topological ordering, and minimum spanning trees on weighted presets or a custom graph.
- Build custom directed or undirected graphs, edit edge weights, choose endpoints, and import, copy, or export graph JSON.
- Watch dedicated array, table, grid, chessboard, tree, graph, hash-bucket, and probing visualizations rather than a one-size-fits-all animation.

### Interactive learning

Learning mode supports Bubble Sort, Binary Search, BST Insert, BST Search, BFS,
Fibonacci DP, and N-Queens. Enable it within the visualizer before starting a run:

```text
Run visualization → pause at a learning checkpoint → predict the next step
                 → receive feedback → Continue to reveal the step
```

Runs include up to eight checkpoints. Play, Next, Last, and forward seeking stop
before unanswered checkpoints. Submit an answer or skip, then press Continue;
autoplay resumes only if it was playing before the question. Previous and First
let you revisit earlier steps without earning points again.

Accuracy counts submitted answers only. Skipping awards no points and resets the
current streak. Restart/Replay starts a fresh learning session; pausing preserves
it. Turning Learning mode off keeps your score, but checkpoints passed with the
mode off cannot subsequently earn points. All progress stays in memory for the
current run. Other algorithms continue to support normal visualization.

## Supported Algorithms

The metadata catalog and API currently expose 41 algorithms across seven categories.

| Category | Algorithms |
| --- | --- |
| Sorting | Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort, Heap Sort, Shell Sort, Cocktail Shaker Sort, Gnome Sort, Comb Sort, Counting Sort |
| Searching | Linear Search, Binary Search |
| Hash Tables | Insert — Separate Chaining, Search — Separate Chaining, Insert — Linear Probing, Search — Linear Probing |
| Trees | BST Insert, AVL Tree Insert, BST Search, Inorder Traversal, Preorder Traversal, Postorder Traversal |
| Graph / Pathfinding | Breadth-First Search, Depth-First Search, Dijkstra's Algorithm, A* Search, Topological Sort, Kruskal's Minimum Spanning Tree, Prim's Minimum Spanning Tree |
| Dynamic Programming | Fibonacci DP, Coin Change, 0/1 Knapsack, Longest Common Subsequence, Edit Distance, Grid Unique Paths |
| Backtracking | N-Queens, Maze Solver, Permutations, Subsets, Sudoku Solver |

Binary Search uses an ascending array. Dijkstra and A* require non-negative weights, Topological Sort runs on a directed graph, and the minimum-spanning-tree algorithms run on an undirected graph. The interface applies or explains these constraints when you switch algorithms.

## Showcase

### Compare sorting algorithms

Run multiple algorithms against one shared array and compare the work each one performs.

![Sorting comparison showing Bubble Sort, Selection Sort, and Insertion Sort metrics with a step-count chart](docs/images/sorting-comparison.png)

### Explore weighted graphs

Follow Dijkstra's distance updates while the active frontier, edge weights, path costs, and pseudocode remain visible.

![Dijkstra visualization on a weighted graph with an active frontier node and synchronized pseudocode](docs/images/graph-visualization.png)

### Build a custom graph

Create nodes and edges, edit weights and run settings, then share the graph through JSON import and export.

![Custom graph editor populated with nodes, weighted edges, endpoints, and import-export controls](docs/images/graph-editor.png)

### Inspect dynamic programming tables

See the active cell and its dependencies as a table is filled from smaller subproblems.

![Longest Common Subsequence table with active and related cells highlighted beside pseudocode](docs/images/dynamic-programming.png)

### Follow backtracking decisions

Watch recursive choices, conflicts, removals, and solutions on visual problem state such as an N-Queens board.

![N-Queens visualization paused on a queen placement with the corresponding pseudocode line highlighted](docs/images/backtracking-visualization.png)

## How It Works

```text
Algorithm + input selected in the browser
                    ↓
             Next.js frontend
                    ↓ HTTP
              FastAPI backend
                    ↓
        Ordered execution-state snapshots
                    ↓
Visualization + pseudocode + run details
```

The frontend owns input controls, presets, playback, and the specialized visual components. The backend validates requests, executes the selected algorithm, and returns snapshots with descriptions and, where applicable, a 1-based pseudocode line. The frontend uses those snapshots as a timeline that can be played or inspected in either direction.

The sorting comparison mode requests the same input for each selected algorithm and summarizes their returned steps. Graph presets and custom-graph editing live in the frontend; graph execution and validation remain in the backend.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Quality | pytest, Ruff, ESLint, Vitest, Next.js production builds |
| Tooling | uv, npm, Python development script, GitHub Actions |

## Local Development

### Prerequisites

- Python 3.12 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js with npm (CI currently uses Node.js 22)

From the repository root, install the locked backend and frontend dependencies:

```bash
python scripts/dev.py setup
```

Start the complete application with the recommended development command:

```bash
python scripts/dev.py dev
```

This starts both the Next.js frontend and FastAPI backend. Ports `3000` and
`8000` are preferred; if either is occupied, the helper selects the next available
port and prints the actual frontend, backend, and API docs URLs. It also sets
`NEXT_PUBLIC_API_URL` to the selected backend URL and configures CORS for the
selected frontend origin. Press `Ctrl+C` to stop both servers. If either server
exits unexpectedly, the helper stops the other server as well.

To run the servers individually, use separate terminals:

```bash
# Terminal 1 — FastAPI
python scripts/dev.py backend
```

```bash
# Terminal 2 — Next.js
python scripts/dev.py frontend
```

Each command also selects an available port and prints its URL. When running
them individually, the frontend defaults to `http://127.0.0.1:8000`; if the
backend selects a different port, set `NEXT_PUBLIC_API_URL` in the frontend's
environment to the printed backend URL before starting it. The standalone
backend helper allows HTTP frontend origins on `localhost` and `127.0.0.1` at
other ports.

If your system exposes Python as `python3`, replace `python` in the commands above:

```bash
python3 scripts/dev.py setup
python3 scripts/dev.py dev
```

<details>
<summary>Run each project manually</summary>

```bash
cd backend
uv run uvicorn app.main:app --reload
```

```bash
cd frontend
npm run dev
```

Manual commands do not use the helper's port selection or coordinated URL/CORS
configuration. Set `NEXT_PUBLIC_API_URL` for a custom backend URL and
`CORS_ORIGINS` (comma-separated exact origins) for a custom frontend origin.
Without development overrides, backend CORS retains the two port-3000 loopback
origins; deployments can set `CORS_ORIGINS` to their frontend origin.

</details>

## Validation

Validate with the dependencies already installed:

```bash
python scripts/dev.py check
```

This runs Ruff for the backend and development helper, pytest (including development workflow tests), then ESLint, frontend tests, and a production build. To synchronize both projects from their lockfiles before running the same checks, use:

```bash
python scripts/dev.py check-clean
```

CI runs Ruff and pytest for the backend plus frontend tests and a production build on pushes and pull requests to `master`; the local `check` command additionally runs ESLint.

## API

The FastAPI service exposes the algorithm metadata catalog, random-number generation, and one step-generation endpoint for each visualization family:

- `GET /algorithms`
- `POST /numbers/random`
- `POST /sorting/steps`
- `POST /searching/steps`
- `POST /hash-tables/steps`
- `POST /trees/steps`
- `POST /graph/steps`
- `POST /dynamic-programming/steps`
- `POST /backtracking/steps`

Use the interactive OpenAPI interface at the API docs URL printed by the development helper (`http://127.0.0.1:8000/docs` when the preferred port is available). Request examples and response conventions are documented in [docs/api.md](docs/api.md).

## Project Structure

```text
algorithm-visualizer/
├── backend/          # FastAPI app, algorithm implementations, and tests
├── frontend/         # Next.js interface and visualization components
├── docs/             # Supporting documentation and showcase images
├── scripts/          # Cross-project development workflow
├── .github/          # Continuous integration configuration
└── README.md
```

## Documentation

- [API guide and request examples](docs/api.md)
- [UX/UI audit](docs/ux-ui-audit.md)

## About

Algorithm Visualizer is an open-source learning and portfolio project focused on making algorithm execution observable, explorable, and easier to reason about. Contributions and issue reports are welcome through the GitHub repository.
