# Next Improvements

**Review date:** 2026-11-17

**Reviewed at:** commit `06a3a22` on `fix/validation-audit-license`

This document lists what to work on next, in priority order. It comes from reading the code and from measurements taken on the review date. Each item states what was observed, where, and what to change.

The starting point is healthy. `python scripts/dev.py check` passes at this commit: Ruff, 355 backend tests, ESLint, 76 frontend tests, and the production build.

[improvement-tasks.md](improvement-tasks.md) splits these items into tasks that can run in parallel.

## Priorities

| # | Improvement | Why | Effort |
| --- | --- | --- | --- |
| 1 | Shrink backtracking step payloads | The built-in Sudoku preset returns a 118 MB response | Small to medium |
| 2 | Bring CI up to the local check and add static checks | ESLint, formatting, and backend types are unguarded on pull requests | Small |
| 3 | Finish UX audit Phase 1 | Three of nine items are done; the open ones are mostly accessibility | Medium |
| 4 | Test the frontend beyond Learning mode | Every frontend test targets Learning mode | Medium |
| 5 | Give the API contract a single source of truth | Types, labels, and input limits are copied by hand into the frontend | Medium |
| 6 | Extract shared visualizer logic | Seven category components repeat the same run, validation, and slider code | Medium |
| 7 | Publish a hosted demo | The project has no live link | Medium |
| 8 | Product features | Shareable URLs, keyboard playback, wider Learning mode | Varies |
| 9 | Housekeeping | Leftover scaffolding and stale documentation | Small |

Items 1 and 2 are small and should go first. Item 7 depends on item 1. Items 5 and 6 are refactors and are safer once item 4 has added tests.

## 1. Shrink backtracking step payloads

**Problem.** Three inputs that the interface allows produce responses of 64 to 118 MB. One of them is the only Sudoku preset, so pressing Start on the default Sudoku view downloads and parses 118 MB of JSON. The API sends responses uncompressed.

| Request | Steps | Response | Gzipped |
| --- | ---: | ---: | ---: |
| Sudoku, "Classic puzzle" preset | 79,464 | 118.3 MB | 2.5 MB |
| Permutations, 6 values (the maximum) | 12,056 | 116.8 MB | 12.9 MB |
| Subsets, 10 values (the maximum) | 5,118 | 64.4 MB | 4.4 MB |
| Sudoku, empty board | 6,703 | 8.8 MB | 0.2 MB |
| Largest of everything else: Kruskal, 30 nodes and 200 edges | 401 | 2.3 MB | 0.04 MB |

Sizes are response-body bytes measured through FastAPI's `TestClient`; the gzip column uses compression level 5. The Sudoku response took 2.3 seconds to generate and serialize in-process. The worst-case inputs measured for sorting, trees, hash tables, graphs, dynamic programming, N-Queens, and the maze all stayed at or below 2.3 MB.

**Cause.** The steps repeat data that never changes or that the frontend could rebuild.

- Sudoku: every step carries the board three times (`grid`, `result.board`, and `result.initial_board`) plus `result.fixed_cells`. These four fields are 83% of the response. `initial_board` and `fixed_cells` are identical in every step, and `result.board` duplicates `grid`.
- Permutations and subsets: every step re-sends `result.generated`, the full list of results found so far. It is 97% of both responses and grows quadratically with the number of results.

**Proposed change.**

1. Add `GZipMiddleware` in `backend/app/main.py`. This is one line and takes the Sudoku response from 118 MB to 2.5 MB on the wire. The browser still parses the full body, so it is not enough on its own.
2. Sudoku: return `initial_board` and `fixed_cells` once at the response level and drop `result.board`. `frontend/components/sudoku-grid.tsx` reads them from each step today and would read them from the run instead. This removes about 60% of the response.
3. Permutations and subsets: send only the result that a `solution_found` step adds, and let `frontend/components/backtracking-list-visualizer.tsx` accumulate the list up to the current step. `generated_count` is already sent per step.
4. Decide how long a Sudoku run should be. After step 2 the preset is still roughly 48 MB, because 79,464 full-grid snapshots are large by nature. At the fastest speed setting (80 ms) that run takes about 1 hour 46 minutes to play. The simple fix is a lower `MAX_SUDOKU_STEPS` plus a preset puzzle that brute force solves quickly; an easier puzzle tried during this review finished in 626 steps and 1 MB. The alternative is to send one changed cell per step and rebuild the board in the frontend, which keeps long runs but is a larger change.
5. Add a backend test that asserts an upper bound on response size for the worst-case input of each endpoint, so a new algorithm cannot reintroduce the problem.

## 2. Bring CI up to the local check and add static checks

**Problem.** `.github/workflows/ci.yml` runs less than `python scripts/dev.py check`, and neither enforces formatting or backend types.

- ESLint runs locally but not in CI. The README already notes this.
- CI lints only `backend/`. The local command also lints `scripts/dev.py`.
- No formatter is enforced. `ruff format --check` would reformat 18 of the 64 Python files in `backend/`.
- `backend/pyproject.toml` has no Ruff configuration, so only the default rules run. Enabling `I`, `B`, `UP`, `SIM`, `N`, and `RUF` reports 41 findings, of which 31 are auto-fixable import ordering. `B`, `N`, and `RUF` are already clean.
- No type checker runs on the backend. mypy reports 23 errors in 11 files. They are annotation mismatches, such as a `dict[str, int]` passed where `dict[str, int | float]` is expected, or a plain `str` passed where a step-type `Literal` is expected. None was confirmed as a runtime bug.
- Nothing updates dependencies automatically. `npm audit` reports 7 moderate findings, all from one `minimatch` advisory reached through the ESLint toolchain. `npm audit --omit=dev` is clean. `npm audit fix` does not clear the seven; pull request #33 found that the current `@typescript-eslint` release still depends on the affected range, so the fix needs an `overrides` entry.

**Proposed change.**

1. Add `npm run lint` to the frontend job and lint `../scripts` in the backend job, so CI matches the local check.
2. Format the backend once, then add `ruff format --check` to CI and to `scripts/dev.py`.
3. Add a `[tool.ruff.lint]` section that selects the rule sets above.
4. Fix the 23 mypy errors, add mypy to the `dev` dependency group, and run it in CI.
5. Add `.github/dependabot.yml` covering npm, uv, and GitHub Actions.

## 3. Finish UX audit Phase 1

**Problem.** `docs/ux-ui-audit.md` still says "Implementation not started", but part of Phase 1 has shipped. The table records what the code shows today.

| # | Audit item | Status | What remains |
| --- | --- | --- | --- |
| 1 | Compact, fully named navigation | Done | |
| 2 | Visualization before metadata | Done | |
| 3 | Shared visual primitives | Open | `ControlPanel`, `RangeField`, `ActionRow`, `ResultSummary`, and `OverflowFrame` do not exist. `Panel` always renders a `<section>`. The side rail is 260px in four categories and 300px in three. |
| 4 | Forms and actions | Partial | "Reset run" is in place. `FormField` still reserves an empty message row. Range inputs keep the browser's default hit area. Graph remove buttons are 28px and 36px. |
| 5 | Compact, complete playback | Done | |
| 6 | Validation, errors, and announcements | Open | `Alert` and `InlineMessage` use `aria-live="polite"`; nothing uses `role="alert"` or `aria-busy`. The step counter and the step description are live regions that fire on every autoplay tick. |
| 7 | Headers, legends, empty states, results | Open | `Legend` still maps label strings to colors. The metadata badge prints raw identifiers such as `dynamic_programming`. Trees has no empty state. |
| 8 | Wide visualizations | Partial | The DP table and the grids scroll inside their container. The tree SVG still shrinks to the container width, the hash view has no height cap, nothing shows a scroll hint, and maze and Sudoku cells have a 32px minimum. |
| 9 | Keyboard and semantics | Open | Navigation names are done. Maze tools have no `aria-pressed`, the grids have no roving focus or arrow keys, and graph node placement is click-only. |

The status reflects the points checked in the code. Sub-points that are not listed were not re-tested in a browser.

**Proposed change.** Do items 6 and 9 first, because they block screen-reader and keyboard users. Then do items 4, 7, and 8. Item 3 overlaps with item 6 of this document and can be done there. Update the status section of `docs/ux-ui-audit.md` as items land.

## 4. Test the frontend beyond Learning mode

**Problem.** The frontend has 76 tests in five files, and all five target Learning mode. The following have no tests:

- Input parsing and validation inside each category component.
- Graph JSON import (`parseGraphJson` in `frontend/components/graph-visualizer.tsx`).
- Error-message mapping in `frontend/lib/api.ts`.
- Compare mode and Hash Tables.

No test runs the frontend against the real backend. The one test that renders the visualizers mocks `@/lib/api`, so a backend change that breaks the interface still passes CI.

**Proposed change.**

1. Move the pure parsing and validation helpers out of the component files into `frontend/lib/` and unit-test them. This also prepares item 6.
2. Add one Playwright smoke test per category that starts both servers, runs the default input, and steps to the end. Add an axe scan to the same tests to hold the gains from item 3.

## 5. Give the API contract a single source of truth

**Problem.** The frontend restates what the backend already defines.

- `frontend/types/*.ts` are hand-written mirrors of the backend's `TypedDict` and Pydantic models.
- Algorithm labels exist twice, for example `ALGORITHM_LABELS` in `frontend/types/sorting.ts` and `name` in `backend/app/algorithms/metadata.py`.
- Input limits exist twice. Permutations up to 6, subsets up to 10, maze 2 to 15, and Fibonacci 0 to 40 appear in both `backend/app/main.py` and the frontend components.
- `DynamicProgrammingRequest` and `BacktrackingRequest` are single models in which every field is optional, and the responses use `input: dict[str, object]` and `result: dict[str, object]`. The generated OpenAPI schema therefore cannot say which fields an algorithm needs or returns, and `docs/api.md` fills the gap in prose.
- `backend/app/main.py` is 749 lines and holds every request model, validator, and route.

**Proposed change.**

1. Model the DP and backtracking requests as discriminated unions on `algorithm`, with one model per algorithm and the limits declared as `Field` constraints. Give the step `result` payloads typed models.
2. Generate the frontend types from the OpenAPI schema, for example with `openapi-typescript`, and fail CI when the generated file is stale.
3. Serve labels and limits from `/algorithms` so the frontend reads them instead of repeating them.
4. Split `main.py` into one router and one schema module per category while these models are being changed.

Item 1 of this document changes the backtracking response shape. Doing it before this item avoids generating types twice.

## 6. Extract shared visualizer logic

**Problem.** The category components are large and repeat each other. `backtracking-visualizer.tsx` is 1,006 lines, `dynamic-programming-visualizer.tsx` is 852, and `graph-visualizer.tsx` is 590.

- The "start a run" sequence appears in all seven categories and in Compare: clear the error, set loading, reset playback, fetch, load, catch, and clear loading.
- The speed slider is written out seven times with ranges that differ slightly, from 80–1000 ms in Sorting to 120–1200 ms in Trees.
- `validateCountDraft` exists in three files, `validateTarget` in three, `formatResult` in three, and `parseInteger` and `requireRange` in two.
- Requests cannot be cancelled and have no timeout. `postJson` in `frontend/lib/api.ts` takes no `AbortSignal`. If the backend stalls, the view stays on "Loading steps..." with its controls disabled, and nothing in the app ends the wait.

**Proposed change.**

1. Add a `useVisualizationRun` hook that owns loading, error, cancellation, and a timeout, and use it in every category.
2. Add a `RangeField` primitive and use it for all seven speed sliders.
3. Share the parsing helpers moved in item 4.
4. Add the slot-based `VisualizerWorkspace` shell that Phase 2 of the UX audit describes, and migrate one category at a time.

## 7. Publish a hosted demo

**Problem.** The repository has no deployment configuration, and the README links no live version. For a learning tool and portfolio project, a link that people can open is worth more than screenshots.

**Proposed change.** Host the frontend and the backend separately. The only page already prerenders as static content, so the frontend needs no server-side features, and `CORS_ORIGINS` and `NEXT_PUBLIC_API_URL` already support separate origins. Before the API is public:

- Finish item 1. A 118 MB response is tolerable on localhost and not over the internet.
- Add a `Dockerfile` for the backend.
- Add rate limiting. Step generation is synchronous and CPU-bound, so a few concurrent worst-case requests can occupy a small instance.
- Cache step responses in the backend, keyed by request body. The output is deterministic for a given input.
- Add the demo link to the top of the README.

## 8. Product features

These are ordered by value for the effort.

- **Shareable, restorable state.** `frontend/components/algorithm-visualizer.tsx` renders only the active category, so switching category discards the previous category's input and run, and a reload resets everything. Nothing is stored in the URL. Put the category, algorithm, and input in the query string so that a specific run can be linked. The UX audit deferred this.
- **Keyboard playback.** There are no playback shortcuts. Add Space for play and pause, the arrow keys for previous and next, and Home and End for first and last.
- **Wider Learning mode.** Learning mode covers 7 of 41 algorithms, and Hash Tables does not use the learning hook at all. Selection Sort, Insertion Sort, and Linear Search are the closest to the existing array strategies, and DFS is the closest to the BFS strategy. Scores are lost when a run restarts, so a per-algorithm best score in `localStorage` would give learners a reason to return.
- **Motion and theme.** Nothing honors `prefers-reduced-motion`, and `globals.css` declares `color-scheme: light` only.
- **More algorithms.** This is the lowest priority, because the catalog is already broad. The most useful additions fill gaps in what exists: Bellman–Ford, since neither shortest-path algorithm here accepts negative weights; deletion for BST and AVL; and deletion with tombstones for linear probing.

## 9. Housekeeping

- `backend/README.md` is empty, and `backend/pyproject.toml` still has `description = "Add your description here"`.
- `frontend/README.md` and the page description in `frontend/app/layout.tsx` list five categories and omit trees and backtracking.
- `frontend/public/` holds five SVG files from the Next.js starter that nothing references: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, and `window.svg`.
- `@types/node` is `^20` while CI runs Node.js 22, and nothing pins the Node.js version for contributors (`engines` or `.nvmrc`).
- The README invites contributions, but there is no `CONTRIBUTING.md` or issue template.
