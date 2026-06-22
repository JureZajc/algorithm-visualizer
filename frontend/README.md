# Algorithm Visualizer Frontend

Next.js frontend for animating sorting, searching, graph/pathfinding, and
dynamic programming steps produced by the FastAPI backend.

## Features

- Sorting visualizations for all algorithms exposed by the backend
- Linear and Binary Search with found and not-found states
- SVG graph visualizations for BFS, DFS, Dijkstra, A*, Topological Sort,
  Kruskal, and Prim
- Dynamic programming table visualizations for Fibonacci, Coin Change,
  0/1 Knapsack, LCS, Edit Distance, and Grid Unique Paths
- Weighted, directed, and undirected graph rendering with curated presets,
  including a directed acyclic graph
- Start, pause, resume, reset, animation speed, elapsed time, and step progress
- Algorithm-aware controls for pathfinding, topological ordering, and MSTs
- Algorithm-aware controls for one-dimensional tables, string tables, item
  tables, and grid path counts
- Live path costs and A* heuristics, topological order and cycle status, plus
  MST candidates, accepted edges, and total weight
- Active and related dynamic programming cells with synchronized pseudocode
  highlighting and final result display

## Local development

Start the backend from `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

Then start the frontend from `frontend/`:

```bash
npm install
npm run dev
```

The frontend uses `http://127.0.0.1:8000` by default. To use another backend URL,
set `NEXT_PUBLIC_API_URL` before starting or building the app.

On macOS, open `http://localhost:3000`. The available controls change with the
selected algorithm. Graph algorithms adapt start, target, directed, and MST
controls. Dynamic Programming algorithms adapt numeric, list, string, and grid
inputs for the selected table.

Run a production build with:

```bash
npm run build
```
