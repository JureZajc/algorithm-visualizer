# Algorithm Visualizer Frontend

Next.js frontend for animating sorting, searching, and graph/pathfinding steps
produced by the FastAPI backend.

## Features

- Sorting visualizations for all algorithms exposed by the backend
- Linear and Binary Search with found and not-found states
- SVG graph visualizations for BFS, DFS, and Dijkstra
- Weighted and directed graph rendering with curated presets
- Start, pause, resume, reset, animation speed, elapsed time, and step progress
- Final path and live Dijkstra distance display

## Local development

Start the backend from `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

Then start the frontend from `frontend/`:

```bash
source /home/jure/.nvm/nvm.sh
nvm use 24.16.0
npm run dev
```

The frontend uses `http://127.0.0.1:8000` by default. To use another backend URL,
set `NEXT_PUBLIC_API_URL` before starting or building the app.

Run lint and a production build in WSL with:

```bash
source /home/jure/.nvm/nvm.sh
nvm use 24.16.0
npm run lint
npm run build
```
