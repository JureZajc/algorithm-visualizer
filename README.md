# Algorithm Visualizer

Algorithm Visualizer is an open-source learning project that generates
step-by-step algorithm states in a FastAPI backend and animates them in a
Next.js frontend.

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

## API

The backend exposes these main routes:

- `GET /algorithms` lists supported sorting and searching algorithms.
- `POST /numbers/random` generates an array of random integers.
- `POST /sorting/steps` generates visualization steps for a sorting algorithm.
- `POST /searching/steps` generates visualization steps for a search.

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

Every visualization step contains a step `type`, active `indices`, an array
snapshot, and a human-readable `description`. Responses also include the
initial array and total step count.

## Run in WSL

Run all commands inside Ubuntu WSL from the repository at
`/home/jure/projekti/algorithm-visualizer`.

### Backend

```bash
cd /home/jure/projekti/algorithm-visualizer/backend
uv run uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive documentation is
available at `http://127.0.0.1:8000/docs`.

Run backend tests and lint checks with:

```bash
cd /home/jure/projekti/algorithm-visualizer/backend
uv run pytest
uv run ruff check .
```

### Frontend

```bash
cd /home/jure/projekti/algorithm-visualizer/frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3000` and expects the backend
on port 8000 by default.
