# Algorithm Visualizer Frontend

Next.js frontend for animating sorting, searching, and graph/pathfinding steps
produced by the FastAPI backend.

## Features

- Sorting visualizations for all algorithms exposed by the backend
- Linear and Binary Search with found and not-found states
- SVG graph visualizations for BFS, DFS, Dijkstra, A*, Topological Sort,
  Kruskal, and Prim
- Weighted, directed, and undirected graph rendering with curated presets,
  including a directed acyclic graph
- Start, pause, resume, reset, animation speed, elapsed time, and step progress
- Algorithm-aware controls for pathfinding, topological ordering, and MSTs
- Live path costs and A* heuristics, topological order and cycle status, plus
  MST candidates, accepted edges, and total weight

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

On macOS, open `http://localhost:3000` and select **Graph / Pathfinding**. The
available controls change with the selected algorithm: Topological Sort is
always directed, Kruskal and Prim are always undirected, and Kruskal hides the
unused start and target controls. A* derives admissible heuristics from the
selected preset's node positions and edge weights.

Run a production build with:

```bash
npm run build
```
