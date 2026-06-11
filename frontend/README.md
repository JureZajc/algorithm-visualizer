# Algorithm Visualizer Frontend

Next.js frontend for animating the sorting steps produced by the FastAPI backend.

## Local development

Start the backend from `backend/`:

```bash
uv run uvicorn app.main:app --reload
```

Then start the frontend from `frontend/`:

```bash
npm run dev
```

The frontend uses `http://127.0.0.1:8000` by default. To use another backend URL,
set `NEXT_PUBLIC_API_URL` before starting or building the app.
