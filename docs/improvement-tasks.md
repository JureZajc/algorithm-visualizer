# Improvement Tasks

**Written:** 2026-11-17, against commit `06a3a22`

This file splits the items in [improvement.md](improvement.md) into 13 tasks that subagents can run. Each task is a self-contained brief: an agent needs this file, the section of `improvement.md` that the task names, and nothing else.

## Can everything run in parallel?

No. The work fits into four waves. Tasks inside a wave run in parallel; a wave starts when the previous one is merged.

Three places force the ordering:

- **The seven category components** (`frontend/components/*-visualizer.tsx`). Five of the nine items change them, so those tasks run one wave after another.
- **`backend/app/main.py`.** Items 1, 5, and 7 all change it, and item 5 splits it into several files.
- **The formatter.** `ruff format` rewrites 18 Python files, including four that item 1 changes. It runs last, when no other backend task is open.

| Wave | Tasks that run in parallel | Starts when |
| --- | --- | --- |
| 1 | T1 payloads, T2 CI and type checks, T3 shared accessibility layer, T4 Learning mode coverage, T5 housekeeping | Prerequisites are done |
| 2 | T6 accessible surfaces, T7 frontend tests, T8 backend API contract | Wave 1 is merged |
| 3 | T9 shared visualizer logic, T10 demo readiness | Wave 2 is merged |
| 4 | T11 generated API types, T12 shareable URLs, T13 formatting and lint rules | Wave 3 is merged |

## Prerequisites

Every task branches from an up-to-date `master` that contains this file and `improvement.md`. An agent in a git worktree sees only committed files.

## Between waves

The coordinator, not the agents, does the following after each wave:

1. Merge the wave's branches into `master`.
2. Run `python scripts/dev.py check-clean` on the merged `master`. Two branches that each pass can still break each other.
3. Start the next wave from the new `master`.

## Rules for every task

1. Work in your own git worktree, on the branch that the task names, created from the current `master`. A new worktree has no installed dependencies, so run `python scripts/dev.py setup` in it first.
2. Read the section of `improvement.md` that the task names before you change anything. It holds the evidence and the measurements. Confirm that the problem still exists; the code may have moved since the review.
3. Change only the files under **Owns**. If the task cannot be finished without editing another file, stop and say so in your report instead of editing it.
4. Before writing frontend code, read `frontend/AGENTS.md`. This Next.js version has breaking changes, and the guides are in `frontend/node_modules/next/dist/docs/`.
5. Match the surrounding code. Add a dependency only when the task names one.
6. A task is done when `python scripts/dev.py check` passes and every **Done when** point holds. If something fails and you cannot fix it, report the output as it is.
7. Commit to your branch with a message in the style of the existing history, for example "Bound API inputs, cap Sudoku search". Do not add co-author trailers or tool attribution. Do not push and do not open a pull request.
8. End with a report: what changed, what you verified and how, what you skipped, and anything a later task needs to know.

## Wave 1

### T1. Shrink backtracking payloads

- **Source:** item 1. **Branch:** `fix/backtracking-payloads`
- **Owns:** `backend/app/algorithms/backtracking/` (`sudoku_solver.py`, `permutations.py`, `subsets.py`, `types.py`); in `backend/app/main.py` only the middleware setup and the backtracking models; `backend/tests/test_backtracking.py`, `backend/tests/test_api.py`, new `backend/tests/test_payload_size.py`; `frontend/types/backtracking.ts`, `frontend/components/sudoku-grid.tsx`, `frontend/components/backtracking-list-visualizer.tsx`, `frontend/lib/backtracking-presets.ts`; in `frontend/components/backtracking-visualizer.tsx` only the code that reads step results and passes data to those two views; the backtracking section of `docs/api.md`.
- **Do:**
  1. Add `GZipMiddleware` with a moderate compression level.
  2. Sudoku: send `initial_board` and `fixed_cells` once per response instead of in every step, and remove `result.board`, which duplicates `grid`. The frontend keeps only `steps` in playback state today, so the visualizer must hold the run-level data itself.
  3. Permutations and subsets: stop sending `result.generated` in every step. A `solution_found` step carries the one result it adds, and the frontend builds the list from the steps up to the current index. Seeking backward and forward must give the same list as playing through.
  4. Sudoku length: set `MAX_SUDOKU_STEPS` to 10,000. Replace the "Classic puzzle" preset and `DEFAULT_SUDOKU_BOARD` with one valid puzzle that brute force solves in fewer than 2,000 steps. Keep the HTTP 422 response for puzzles over the limit.
  5. Add a test that sends the largest input each step endpoint allows and asserts that the response body is at most 10 MB uncompressed. Item 1 names the inputs that were largest at review time.
- **Don't:** restructure `main.py` (T8) or change other algorithms.
- **Done when:** the size test passes; your report repeats the table from item 1 with the new numbers; Sudoku, permutations, and subsets play, seek, and replay correctly, covered by tests.

### T2. CI parity and type checks

- **Source:** item 2, except formatting and new lint rules (T13). **Branch:** `chore/ci-static-checks`
- **Owns:** `.github/workflows/ci.yml`, new `.github/dependabot.yml`, `backend/pyproject.toml`, `backend/uv.lock`, `scripts/dev.py`, `backend/tests/test_dev.py`, `frontend/package.json`, `frontend/package-lock.json`, new `.nvmrc`, the Validation section of `README.md`. Annotation-only edits in the files that mypy flags: `dynamic_programming/coin_change.py` and `knapsack.py`; `graph/a_star.py`, `breadth_first_search.py`, `depth_first_search.py`, `dijkstra.py`, `kruskal.py`, and `topological_sort.py`; `hash_tables/hash_tables.py`; `trees/avl_tree.py` and `binary_search_tree.py`; and the `types.py` beside them.
- **Do:**
  1. CI: add `npm run lint` to the frontend job, and lint `../scripts` in the backend job.
  2. Add mypy to the `dev` group with a `[tool.mypy]` section. Fix the errors (23 at review time) by changing annotations only. Run mypy in CI and in `python scripts/dev.py check`.
  3. Add Dependabot for npm in `/frontend`, uv in `/backend`, and GitHub Actions.
  4. Try to clear the dev-only `minimatch` advisory. `npm audit fix` does not resolve it; it needs an `overrides` entry in `package.json`. Keep the override only if `npm run lint` still passes with it, and otherwise leave the advisory and say so.
  5. Pin Node.js 22: `.nvmrc`, `engines` in `package.json`, and `@types/node` at `^22`.
  6. Replace the placeholder `description` in `pyproject.toml`.
- **Don't:** run `ruff format`, sort imports, or enable new Ruff rules. Do not change runtime behavior in the algorithm files.
- **Done when:** mypy reports no errors; `npm audit --omit=dev` reports none, and the report states what `npm audit` still lists; the README sentence about what CI runs is accurate. The workflow cannot run locally, so say in your report that the YAML was checked by reading.

### T3. Shared accessibility layer

- **Source:** item 3 (audit items 4 and 6, and the category badge from 7) and the keyboard and motion points of item 8. **Branch:** `feature/a11y-shared-layer`
- **Owns:** `frontend/components/ui-primitives.tsx`, `step-controls.tsx`, `visualizer-panel.tsx`, `algorithm-metadata-panel.tsx`, `pseudocode-panel.tsx`; `frontend/app/globals.css`; new `frontend/hooks/use-playback-shortcuts.ts`; new tests; the checkbox for audit item 6 in `docs/ux-ui-audit.md`; one feature bullet in `README.md`.
- **Do:**
  1. `Alert` and error messages use `role="alert"`; loading and playback-state messages use `role="status"`.
  2. Stop announcing during autoplay. The step counter and the step description are announced after a manual step, on pause, and on completion, and not on each autoplay tick.
  3. Set `aria-busy` on the visualization panel while steps load.
  4. `FormField` renders its message row only when there is a message.
  5. The metadata badge shows a readable category name, not `dynamic_programming`.
  6. Keyboard playback: Space for play and pause, Left and Right for previous and next, Home and End for first and last. Ignore the keys while focus is in an input, select, textarea, or button, and while Learning mode blocks playback.
  7. Honor `prefers-reduced-motion` in `globals.css`.
- **Don't:** change the props of any exported component in a way that needs a call-site edit; other tasks own the call sites. Leave `Legend` and `Panel` as they are (T9).
- **Done when:** tests cover the roles, the autoplay silence, and each shortcut.

### T4. Learning mode coverage

- **Source:** item 8, "Wider Learning mode". **Branch:** `feature/learning-mode-coverage`
- **Owns:** `frontend/learning/`, `frontend/hooks/use-learning-playback.ts`, `frontend/components/learning-panel.tsx`, the learning tests and fixtures in `frontend/tests/`, the "Interactive learning" section of `README.md`.
- **Do:**
  1. Add question strategies for Selection Sort, Insertion Sort, Linear Search, and DFS, following the existing strategies. Every question must be derived from the steps alone and have exactly one correct choice.
  2. Add fixtures produced by the real backend functions, and say in your report how you produced them.
  3. Store a best score per algorithm in `localStorage` and show it in the learning panel. Storage can be unavailable, so the panel must work without it.
- **Don't:** add Hash Tables; it needs a category-component change. Do not edit `frontend/README.md` (T5).
- **Done when:** each new strategy has tests like the existing ones, and the integration test still finds an unsupported algorithm to check the disabled state.

### T5. Housekeeping

- **Source:** item 9, except the `pyproject.toml` and `package.json` points (T2). **Branch:** `chore/housekeeping`
- **Owns:** `backend/README.md`, `frontend/README.md`, the `description` in `frontend/app/layout.tsx`, `frontend/public/`, new `CONTRIBUTING.md`, new `.github/ISSUE_TEMPLATE/`, the Status section and the checkboxes for audit items 1, 2, and 5 in `docs/ux-ui-audit.md`.
- **Do:**
  1. Write `backend/README.md`: what the service is, how to run it, how to test it, and where the algorithms live.
  2. Make `frontend/README.md` and the page description cover all seven categories. Link to the root README for the Learning mode algorithm list instead of repeating it.
  3. Delete the five starter SVG files in `frontend/public/` after confirming that nothing references them.
  4. Add a short `CONTRIBUTING.md` (setup, `python scripts/dev.py check`, branch and commit style) and bug and feature issue templates.
  5. Update the audit's Status section and tick items 1, 2, and 5, which have shipped.
- **Done when:** the production build passes without the SVG files.

## Wave 2

### T6. Accessible visualization surfaces

- **Source:** item 3 (audit items 8 and 9). **Branch:** `feature/a11y-surfaces`. **Needs:** T1, T3.
- **Owns:** `frontend/components/backtracking-grid.tsx`, `sudoku-grid.tsx`, `graph-canvas.tsx`, `graph-editor.tsx`, `tree-canvas.tsx`, `hash-table-view.tsx`, `dynamic-programming-table.tsx`; new `frontend/components/overflow-frame.tsx`; new tests; the checkbox for audit item 8 in `docs/ux-ui-audit.md`.
- **Do:**
  1. Build `OverflowFrame`: focusable, labelled, with a "Scroll to explore" hint that appears only when the content overflows. Use it for the DP table, the tree, the grids, and the hash view.
  2. Render the tree at its computed size inside a two-axis scroller, so nodes keep their size on a 31-node degenerate tree.
  3. Cap the hash view's height with internal scrolling, and show the bucket or slot count. Give buckets list semantics.
  4. Maze and Sudoku: explicit grid tracks, 44px editable cells, and one tab stop per grid with arrow-key movement.
  5. Graph: make the placement surface focusable, and let Enter or Space place the pending node at the next free position through the existing `onCanvasClick` callback. Make the remove buttons 44px.
- **Don't:** change props in a way that needs a call-site edit. Leave `aria-pressed` on the maze tools to T9; those buttons are in a category component.
- **Done when:** tests cover roving focus in both grids and keyboard node placement; the large cases in the audit's verification list were checked in a browser and the report says what was seen.

### T7. Frontend tests beyond Learning mode

- **Source:** item 4. **Branch:** `chore/frontend-tests`. **Needs:** T1, T2.
- **Owns:** new modules under `frontend/lib/`; in the seven category components, `sorting-comparison.tsx`, and `visualizer-controls.tsx`, only the removal of local parsing and validation helpers and the imports that replace them; new tests in `frontend/tests/`; new `frontend/e2e/` and Playwright configuration; `frontend/vitest.config.mts`; `frontend/package.json` and its lockfile; a new job in `.github/workflows/ci.yml`.
- **Do:**
  1. Move the pure parsing and validation helpers out of the components into `frontend/lib/`. Move them without rewriting. Merge two copies only when they are identical.
  2. Unit-test the moved helpers, `parseGraphJson`, and the error mapping in `frontend/lib/api.ts`.
  3. Add Playwright (`@playwright/test`) with one smoke test per category, including Compare and Hash Tables: start both servers, run the default input, step to the end, and check the result. Exclude `e2e/` from Vitest.
  4. Run the smoke tests in CI as a separate job.
- **Don't:** change component behavior or layout. Leave the axe scan to T9.
- **Done when:** the smoke tests pass against the real backend, and no component file defines a helper that now lives in `lib/`.

### T8. Backend API contract

- **Source:** item 5, backend half. **Branch:** `chore/api-contract-backend`. **Needs:** T1, T2.
- **Owns:** `backend/app/main.py` and the new `backend/app/routers/` and `backend/app/schemas/` it is split into; the `types.py` files under `backend/app/algorithms/`; `backend/app/algorithms/metadata.py`; `backend/tests/`; `docs/api.md`.
- **Do:**
  1. Replace `DynamicProgrammingRequest` and `BacktrackingRequest` with discriminated unions on `algorithm`: one model per algorithm, limits as `Field` constraints, current defaults kept.
  2. Give step `result` payloads and response `input` typed models.
  3. Define each input limit once and expose the limits in `GET /algorithms` as an added field.
  4. Split `main.py` into one router and one schema module per category. `app.main:app` must still import.
- **Don't:** break the wire format. The frontend does not change in this task, so every request it sends today must still validate, and responses may gain fields but not lose or rename them.
- **Done when:** the existing API tests pass without edits to their requests or expected JSON; the OpenAPI schema shows a separate request schema per algorithm; mypy is clean; the report gives the Sudoku worst-case response time before and after, because typed models add validation work.

## Wave 3

### T9. Shared visualizer logic

- **Source:** item 6, and item 3 (audit items 3, 4, 7, and 9 at category level). **Branch:** `chore/shared-visualizer-logic`. **Needs:** T3, T6, T7.
- **Owns:** the seven category components, `sorting-comparison.tsx`, `visualizer-controls.tsx`; `frontend/lib/api.ts`; `frontend/components/ui-primitives.tsx` and `visualizer-panel.tsx`; new `frontend/hooks/use-visualization-run.ts`; tests; `frontend/e2e/`; the remaining checkboxes in `docs/ux-ui-audit.md`.
- **Do:**
  1. Add `useVisualizationRun`: it owns loading and error state, cancels the previous request when a new run starts or the component unmounts, and ends the wait after a timeout with a clear message. `postJson` accepts an `AbortSignal`.
  2. Add `RangeField` with a 44px hit area and use it for all seven speed sliders. Keep each category's range, step, and default.
  3. `Legend` takes explicit `{ label, tone }` items. Fix the colors that do not match the visualization, starting with "Inspect" in Searching.
  4. Category-level accessibility: `aria-pressed` on the maze tools, a named landmark for every control and visualization panel, one side-rail width, and an empty state for Trees.
  5. Add the `VisualizerWorkspace` shell from Phase 2 of the audit and migrate one category per commit, running the check after each.
  6. Add an axe scan to the Playwright smoke tests that fails on serious and critical violations.
- **Don't:** change request bodies, validation limits, or playback behavior.
- **Done when:** no category component contains its own run sequence or speed slider; the smoke tests and the axe scan pass.

### T10. Demo readiness

- **Source:** item 7. **Branch:** `feature/demo-readiness`. **Needs:** T1, T8.
- **Owns:** new `backend/Dockerfile` and `backend/.dockerignore`; new modules under `backend/app/` for rate limiting and caching, and their registration; `backend/tests/`; `backend/pyproject.toml` and `backend/uv.lock` if a dependency is added; new `docs/deployment.md`; a Deployment section in `README.md`.
- **Do:**
  1. Write a `Dockerfile` that installs from `uv.lock`, runs as a non-root user, and serves `app.main:app` on `$PORT`.
  2. Rate-limit the step endpoints per client, configured through environment variables and off by default for local development. Prefer a small in-process limiter; if you add a dependency, justify it in the report.
  3. Cache step responses in process, keyed by path and request body, with a bounded size. Do not cache `/numbers/random`.
  4. Add `GET /health`.
  5. Write `docs/deployment.md`: environment variables, how to build and run the container, and how to build the frontend with `NEXT_PUBLIC_API_URL`.
- **Don't:** deploy anything or create accounts. The owner chooses the host and adds the demo link.
- **Done when:** tests cover the limiter and the cache; the image builds and answers `/health`, or the report says that Docker was not available.

## Wave 4

### T11. Generated API types

- **Source:** item 5, frontend half. **Branch:** `chore/generated-api-types`. **Needs:** T7, T8, T9.
- **Owns:** `frontend/types/`; the limit constants in the `frontend/lib/` parsing modules; a new export script under `backend/`; `frontend/package.json` and its lockfile; a new step in `.github/workflows/ci.yml`.
- **Do:**
  1. Add a script that writes the backend's OpenAPI schema to a file, and generate TypeScript types from it with `openapi-typescript`.
  2. Make the files in `frontend/types/` re-export the generated types under their current names, so that no component import changes.
  3. Generate a constants module for algorithm labels and input limits from the backend's metadata, and make the current exports read from it, so that nothing is repeated by hand.
  4. Fail CI when the generated files are stale.
- **Don't:** edit components; T12 owns them in this wave. Format the new Python file with `ruff format`, because T13 adds the format check in parallel.
- **Done when:** the frontend builds with no hand-written copy of a backend type, label, or limit, and the stale check fails when a backend model changes.

### T12. Shareable URLs

- **Source:** item 8, "Shareable, restorable state". **Branch:** `feature/shareable-urls`. **Needs:** T9.
- **Owns:** `frontend/components/algorithm-visualizer.tsx`, the seven category components, `sorting-comparison.tsx`; new `frontend/lib/url-state.ts`; tests; one feature bullet in `README.md`.
- **Do:**
  1. Keep the category, the algorithm, and the input in the query string, updated without a navigation.
  2. On load, restore them through the existing parsers. An invalid or oversized value falls back to the default and never breaks the page.
  3. Remember each category's last input for the session, so that switching away and back restores it.
  4. Load the inputs but do not start a run automatically.
- **Don't:** edit `frontend/types/` or the parsing modules (T11). The home page must stay statically prerendered; check the route table in the build output.
- **Done when:** a copied URL reproduces the category, algorithm, and input in a new tab, for every category, covered by tests.

### T13. Formatting and lint rules

- **Source:** item 2, the part T2 left out. **Branch:** `chore/format-and-lint-rules`. **Needs:** every earlier backend task merged.
- **Owns:** formatting of every Python file under `backend/` and `scripts/`; the Ruff sections of `backend/pyproject.toml`; a format step in `.github/workflows/ci.yml`; `scripts/dev.py` and `backend/tests/test_dev.py`; new `.git-blame-ignore-revs`.
- **Do:**
  1. Run `ruff format` and commit the result alone. Record that commit in `.git-blame-ignore-revs`.
  2. Select the `I`, `B`, `UP`, `SIM`, `N`, and `RUF` rule sets and fix the findings in a second commit. If a rewrite changes how Pydantic treats a type alias, ignore that rule instead and say so.
  3. Add `ruff format --check` to CI and to `python scripts/dev.py check`.
- **Don't:** make any change that is not formatting or a lint fix.
- **Done when:** `ruff format --check` and `ruff check` pass, and all tests pass unchanged.

## Not scheduled

- **Deploying the demo and adding its link.** This needs a hosting account and a choice of host. T10 prepares everything else.
- **Dark theme.** It touches every component and has no evidence of demand.
- **New algorithms.** Item 8 ranks this lowest.
- **Hash Tables in Learning mode.** It needs a category-component change; add it after T9.

## Decisions built into the tasks

Two tasks apply a default that the owner may want to change before the wave starts.

- **T1 lowers the Sudoku limit to 10,000 steps and replaces the preset.** Puzzles that need more steps, including the current "Classic puzzle", will return an error. The alternative in item 1 keeps long runs by sending one changed cell per step, and costs more work.
- **T2 chooses mypy** as the backend type checker, because the review measured its findings.
