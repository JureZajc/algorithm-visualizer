# Algorithm Visualizer Frontend

Next.js frontend that animates the steps produced by the FastAPI backend for
all seven categories: sorting, searching, hash tables, trees, graph/pathfinding,
dynamic programming, and backtracking. A Compare mode runs several sorting
algorithms on the same input.

## Features

- Sorting: bar visualizations for all eleven sorting algorithms, with presets,
  random arrays, and custom input
- Compare: two to four sorting algorithms on one array, with step, comparison,
  swap, and overwrite counts
- Searching: Linear and Binary Search with found and not-found states
- Hash tables: insert and search for separate chaining and linear probing, with
  controls for the values, table size, and search target
- Trees: BST insert and search, AVL insert with rotations, and inorder,
  preorder, and postorder traversals, with the search path or visit order
  beside the tree
- Graph/pathfinding: SVG visualizations for BFS, DFS, Dijkstra, A*,
  Topological Sort, Kruskal, and Prim on weighted, directed, or undirected
  presets, including a directed acyclic graph
- Custom graph editor with editable weights and endpoints, and JSON import,
  copy, and export
- Live path costs and A* heuristics, topological order and cycle status, plus
  MST candidates, accepted edges, and total weight
- Dynamic programming: tables for Fibonacci, Coin Change, 0/1 Knapsack, LCS,
  Edit Distance, and Grid Unique Paths, with the active cell and the cells it
  depends on highlighted
- Backtracking: N-Queens on a chessboard, an editable maze for the maze solver,
  Permutations and Subsets as a growing result list, and an editable Sudoku
  grid, each with sample presets
- Playback shared by every category: play, pause, previous, next, first, last,
  replay, reset, seek, speed, elapsed time, and step progress
- Pseudocode with the active line highlighted, and an algorithm overview with
  complexities and notes from `GET /algorithms`
- Optional Learning mode with prediction checkpoints and session scores for a
  subset of algorithms. The supported algorithms and the rules are listed under
  [Interactive learning](../README.md#interactive-learning) in the root README.

## Local development

From the repository root, install dependencies and start both servers:

```bash
python scripts/dev.py setup
python scripts/dev.py dev
```

The helper prefers frontend port `3000` and backend port `8000`, selects the next
available port when needed, and prints the actual URLs. It sets
`NEXT_PUBLIC_API_URL` and backend CORS to match the selected ports. Press `Ctrl+C`
to stop both servers.

To start just the frontend from the repository root:

```bash
python scripts/dev.py frontend
```

The frontend uses `http://127.0.0.1:8000` by default. To use another backend URL,
set `NEXT_PUBLIC_API_URL` before starting or building the app.

Open the frontend URL printed by the helper. The available controls change with
the selected algorithm: graph algorithms adapt the start, target, directed, and
MST controls; dynamic programming algorithms adapt numeric, list, string, item,
and grid inputs; hash table operations show a target field for searches and a
chaining or probing layout.

From the `frontend` directory, lint, test, and build with:

```bash
npm run lint
npm test
npm run build
```

`npm run test:e2e` runs the Playwright smoke tests in `e2e/`. It needs the
backend dependencies installed and Chromium installed once with
`npx playwright install chromium`; see Validation in the
[root README](../README.md#validation).

This project uses Next.js 16, which differs from earlier versions. Read
[AGENTS.md](AGENTS.md) and the guides in `node_modules/next/dist/docs/` before
changing framework code.

## Layout

```text
frontend/
├── app/           # Root layout, the single page, and global styles
├── components/    # Category visualizers, visualization surfaces, playback, and shared UI
├── e2e/           # Playwright smoke tests, one per category
├── hooks/         # Step playback and Learning mode playback
├── learning/      # Learning mode question strategies, checkpoint selection, and sessions
├── lib/           # API client, input presets, and input parsing and validation
├── types/         # Request and response types for each category
└── tests/         # Vitest tests and fixtures
```

Each category has a `*-visualizer.tsx` component that owns its inputs, request,
and layout, and plays the returned steps with the shared hook in
`hooks/use-step-playback.ts`. Learning mode adds checkpoint gating on top of
that timeline while keeping session state separate. To support another
algorithm in Learning mode, add a strategy in `learning/` that builds questions
from the algorithm's existing backend steps, and register it in
`learning/question-generator.ts`.
