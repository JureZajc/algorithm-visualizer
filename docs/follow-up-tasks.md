# Follow-up Tasks

**Written:** 2026-11-28, against commit `04ff324`

All 13 tasks in [improvement-tasks.md](improvement-tasks.md) and every Phase 1 item of the [UX audit](ux-ui-audit.md) have shipped. This file plans the next five tasks: the blocked frontend dependency update, Hash Tables in Learning mode, and Phase 2 items 2 to 4 of the UX audit. Each task is a self-contained brief: an agent needs this file, the files it names, and nothing else.

## Order

The work runs in three waves. Tasks inside a wave run in parallel; a wave starts when the previous one is merged.

| Wave | Tasks that run in parallel | Starts when |
| --- | --- | --- |
| 1 | F1 dependency updates | Now |
| 2 | F2 Hash Tables in Learning mode, F3 category visual semantics, F4 Compare presentation | F1 is merged |
| 3 | F5 shared form fields | Wave 2 is merged |

Three things force the ordering:

- **F1 changes the test runner.** Vitest 4 → 5 may need edits in test files, which every other task adds to. It runs alone, first.
- **F5 touches every control panel**, including `hash-tables-visualizer.tsx` (F2) and `sorting-comparison.tsx` (F4). It runs last.
- **`docs/ux-ui-audit.md`.** F3, F4, and F5 each finish a Phase 2 item, and all three would edit the same Status line. The coordinator updates it instead (see below).

## Between waves

The coordinator, not the agents, does the following after each wave:

1. Merge the wave's branches into `master`.
2. Run `python scripts/dev.py check-clean` and `cd frontend && npm run test:e2e` on the merged `master`. Two branches that each pass can still break each other.
3. After F1: close Dependabot PR #65 with a comment that links F1's pull request, unless Dependabot has already closed it.
4. After F3, F4, and F5: update the Phase 2 line in the Status section of `docs/ux-ui-audit.md` with the item that shipped.
5. Start the next wave from the new `master`.

## Rules for every task

1. Work in your own git worktree, on the branch that the task names, created from the current `master`. A new worktree has no installed dependencies, so run `python scripts/dev.py setup` in it first.
2. Use Node.js 24, the version in `.nvmrc`. With fnm, run `fnm use` in the repository.
3. Read the files the task names before you change anything, and confirm that the problem still exists; the code may have moved since this was written.
4. Change only the files under **Owns**. If the task cannot be finished without editing another file, stop and say so in your report instead of editing it.
5. Before writing frontend code, read `frontend/AGENTS.md`. This Next.js version has breaking changes, and the guides are in `frontend/node_modules/next/dist/docs/`.
6. Match the surrounding code: the primitives in `frontend/components/ui-primitives.tsx`, the parsing modules in `frontend/lib/`, and the test style in `frontend/tests/` and `frontend/e2e/`. Add a dependency only when the task names one.
7. A task is done when `python scripts/dev.py check` passes, `npm run test:e2e` passes in `frontend/` (it runs axe on every category and fails on serious and critical findings), and every **Done when** point holds. If something fails and you cannot fix it, report the output as it is. `test:e2e` replaces `frontend/.next`, so run `npm run build` again before `npm run start`.
8. Commit to your branch with messages in the style of the existing history, for example "Give the step slider a 44px hit area". Do not add co-author trailers or tool attribution. Do not push and do not open a pull request.
9. End with a report: what changed, what you verified and how, what you skipped, and anything a later task needs to know.

## Wave 1

### F1. Frontend dependency updates

- **Source:** Dependabot PR #65, which fails CI. **Branch:** `chore/frontend-dependency-updates`
- **Owns:** `.github/dependabot.yml`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vitest.config.mts`, and test files only where Vitest 5 needs an API change.
- **Background:** #65 groups four updates. `npm ci` fails on it with ERESOLVE, so no check runs.
  - `@axe-core/playwright` 4.12.1 → 4.14.1 is fine.
  - Vitest 4.1.12 → 5.1.2 should install. Its peers are Vite `^6.4 || ^7 || ^8` (8.3.8 is installed) and `@types/node` `^22 || >=24`.
  - TypeScript 5 → 7 is blocked. `openapi-typescript` 7.13.0, the latest, needs `typescript ^5.x`, and `typescript-eslint` 8.74.0, which `eslint-config-next` 16.4.6 depends on, needs `typescript >=4.8.4 <6.1.0`.
  - ESLint 9 → 10 is blocked. `eslint-config-next` depends on `eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0, and `eslint-plugin-jsx-a11y` 6.10.2, whose `eslint` peer ranges stop at `^9`.
- **Do:**
  1. In `.github/dependabot.yml`, add `typescript` and `eslint` to the npm `ignore` list for `version-update:semver-major`, next to the existing `@types/node` rule. The comment must name the packages that block each one, so a later reader knows when to lift the rule.
  2. Update `@axe-core/playwright` to `^4.14.1` and `vitest` to `^5`, with npm on Node.js 24. Keep `typescript` at `^5` and `eslint` at `^9`.
  3. Read the Vitest 5 migration notes and change `vitest.config.mts` and the tests only where Vitest 5 requires it. Tests must keep what they assert.
- **Don't:** force TypeScript 7 or ESLint 10 with `--force`, `--legacy-peer-deps`, or `overrides`.
- **Done when:** `python scripts/dev.py check-clean` passes, which starts from a fresh `npm ci`; vitest runs the same number of tests as before (438 at writing) and the e2e suite the same number (20); `npm ci` prints no ERESOLVE; and the report lists every change Vitest 5 needed.

## Wave 2

### F2. Hash Tables in Learning mode

- **Source:** "Not scheduled" in `improvement-tasks.md`; it waited for T9, which has merged. **Branch:** `feature/learning-hash-tables`. **Needs:** F1.
- **Owns:** new `frontend/learning/hash-tables.ts`; `frontend/learning/question-generator.ts`; the `LearningStep` union in `frontend/learning/types.ts`; in `frontend/components/hash-tables-visualizer.tsx`, only the playback hook, the `learningBlocked` prop on `StepControls`, and the `notices` slot; `frontend/tests/fixtures/learning-runs.json`; new or existing learning tests in `frontend/tests/`; the "Interactive learning" section of `README.md`.
- **Background:** Learning mode covers 11 algorithms through strategies in `frontend/learning/`, registered in `question-generator.ts`. `selectCheckpoints` then picks up to eight questions per run, spread out and varied by `kind`. Hash Tables still uses `useStepPlayback`. `trees-visualizer.tsx` shows the wiring to copy: `useLearningPlayback`, `learningBlocked={playback.learning.blocked}`, and `<LearningPanel>` in `notices`. Best scores are stored per algorithm by `learning/best-scores.ts` and need no change.
- **Do:**
  1. Read the four step functions in `backend/app/algorithms/hash_tables/hash_tables.py` and the `HashTableStep` type in `frontend/types/hash-tables.ts`. Write the strategies against the step sequences the backend actually produces.
  2. Add strategies for `hash_insert_chaining`, `hash_search_chaining`, `hash_insert_linear_probing`, and `hash_search_linear_probing`. Build every question with the `question()` helper in `learning/types.ts`. Each question must be answerable from the steps before it, and have exactly one correct choice. Candidate kinds:
     - **Hash bucket.** Before a `hash` step, ask which bucket the key lands in. The answer is the step's `hash_index`, which is the key modulo `table.size`. Ask this only for integer keys: string keys hash by the sum of their character codes, which is not a fair mental calculation.
     - **Chaining collision.** After `inspect_bucket` in a chaining insert, ask whether the key is chained after existing keys or placed in an empty bucket.
     - **Next probe.** After an occupied slot in linear probing, ask which slot is checked next.
     - **Search outcome.** Ask whether the search finds the target in the inspected bucket, or stops at an empty slot.

     Skip any candidate that would be ambiguous. Fewer questions are better than a question with two defensible answers.
  3. Wire `hash-tables-visualizer.tsx` to `useLearningPlayback` as `trees-visualizer.tsx` does.
  4. Add fixtures to `learning-runs.json`, produced by the real backend functions: a chaining insert with a collision, a chaining search hit and miss, a probing insert that wraps around the end of the table, a probing search miss, and an insert with string keys. Say in your report exactly how you produced them.
  5. Add Hash Tables to the supported list in the README's "Interactive learning" section.
- **Don't:** change the backend, `hash-table-view.tsx` (F3), or the control panel's fields (F5).
- **Done when:**
  - Each new question kind has tests against the fixtures, like the existing strategy tests, which assert the single correct choice.
  - The string-key run produces no hash-bucket questions.
  - An integration test shows Learning mode enabled for Hash Tables and playback stopping at a checkpoint.
  - The existing disabled-state test still finds an unsupported algorithm.

### F3. Category visual semantics (UX audit Phase 2, item 3)

- **Source:** `docs/ux-ui-audit.md`, Phase 2 item 3. **Branch:** `feature/visual-semantics`. **Needs:** F1.
- **Owns:** `frontend/components/graph-canvas.tsx`, `tree-canvas.tsx`, `action-halo.tsx`, `hash-table-view.tsx`, `dynamic-programming-table.tsx`, and `overflow-frame.tsx`; new component files for the summaries; only the legend constants (`LEGENDS` and the items above it) in `graph-visualizer.tsx` and `trees-visualizer.tsx`; new tests.
- **Background:** The graph and tree legends list "Current" as amber, but the current node's fill and its `ActionHalo` take the step type's color: sky for `visit`, violet for `enqueue` and `push`, fuchsia for `relax`, emerald for `accept_edge`, and so on (`GRAPH_STEP_CLASSES` and `TREE_STEP_CLASSES`). On step 5 of BFS on the "Simple path" graph, the current node is violet while the legend says amber. The hash and DP views describe their state only through the step description.
- **Do:**
  1. **Stable current-action token.** Draw the current action in one tone, amber, to match the "Current" legend item: the halo always, and the active fill unless a state fill (visited, frontier, path) is more useful. Keep the state colors that legends already list. Every color an algorithm can draw must appear in that algorithm's legend; add an item where a step-type color stays and its legend lacks it. Add a test that fails when a step type draws a tone missing from its algorithm's legend.
  2. **Compact state summaries.** Add one line of visible text under each surface, built only from the current step's existing fields, for example:
     - graph: "Queue: B, C · Visited: A"
     - tree: "Path: 8 → 3 → 6"
     - hash table: "Bucket 2: 12, 22, 32 (3 keys)"
     - DP table: the active cell and the cells it reads

     Do not add live regions. The panel already announces the step description only when playback rests, and a summary must not add announcements during autoplay.
  3. **Optional: Fit and Actual size** controls for the graph and tree frames, so a large drawing can be seen whole. Do this only if it stays small; otherwise skip it and say so.
- **Don't:** change the backend or the step shapes, rewrite a layout algorithm, or add a canvas library. Do not edit `hash-tables-visualizer.tsx` (F2) or `dynamic-programming-visualizer.tsx`; leave the hash and DP legends as they are.
- **Done when:** tests cover the legend check and each summary; the report includes what you saw in a browser during a BFS run, a Dijkstra run, an AVL rotation, and a probing insert.

### F4. Compare presentation (UX audit Phase 2, item 4)

- **Source:** `docs/ux-ui-audit.md`, Phase 2 item 4. **Branch:** `feature/compare-presentation`. **Needs:** F1.
- **Owns:** `frontend/components/sorting-comparison.tsx`; additions to `frontend/components/ui-primitives.tsx` if a primitive is missing; new tests; the Compare expectations in `frontend/e2e/smoke.spec.ts` if the visible text changes.
- **Background:** Compare predates the shared primitives. It defines its own `Metric` (the same shape as `MetricTile`) and styles its own labels. Its step-count chart is visual, apart from the values printed beside the bars. `SharedInputPreview` shows the first 18 values and then "...", without saying how many values there are.
- **Do:**
  1. Replace local markup with the shared primitives where one fits: `MetricTile`, `ValueLabel`, `SubsectionHeading`, and `ResultSummary`.
  2. Give the chart a text equivalent, for example a summary linked by `aria-describedby` that names each algorithm's step count and the one with the fewest steps.
  3. Show the total count of the shared input, and say when values are hidden, for example "Showing 18 of 40 values".
- **Don't:** change request bodies, the URL state in `frontend/lib/url-state.ts`, or the comparison's results. Leave its form fields to F5.
- **Done when:** tests cover the chart description and the truncation text, and the Compare smoke test and its axe scans pass.

## Wave 3

### F5. Shared form fields (UX audit Phase 2, item 2)

- **Source:** `docs/ux-ui-audit.md`, Phase 2 item 2. **Branch:** `chore/shared-form-fields`. **Needs:** F2, F4.
- **Owns:** `frontend/components/ui-primitives.tsx`; the control panel markup in the seven category components, `sorting-comparison.tsx`, `visualizer-controls.tsx`, and `graph-editor.tsx`; new tests; selectors in existing tests that must change.
- **Background:** Every control panel spells out the same two patterns:
  - **Selects:** a `FormField` around a `<select className={inputClassName()}>`, with options mapped from a labels record or a preset list, often with a disabled "Choose a preset" placeholder.
  - **Validated inputs:** a `FormField` with `error`, `helperText`, and `messageId`, around an input that repeats `aria-describedby`, `aria-invalid`, and `inputClassName(hasError)`.

  At writing there were 21 `<select>` elements and 37 `inputClassName(` calls across nine files. `searching-visualizer.tsx` shows both patterns.
- **Do:**
  1. Add a `SelectField`: a label, a value, options as `{ value, label }` items, an optional placeholder option, `disabled`, and an `onChange` typed to the option values.
  2. Add an `InputField` that wraps `FormField` and wires `aria-describedby`, `aria-invalid`, and the message id through `useId` unless one is passed, and that forwards the input's other props.
  3. Migrate one category per commit, and run `python scripts/dev.py check` after each. Parsing stays in `frontend/lib/*-input.ts`, and limits, ranges, helper text, and error messages stay as they are.
- **Don't:** change validation, request bodies, or the URL state. Inline editors whose layout does not fit a labelled field, such as rows in the graph editor, may stay as they are; list them in the report.
- **Done when:** no control panel builds a labelled `<select>` or validated input by hand outside the exceptions in the report; tests cover label association, `aria-describedby`, and `aria-invalid` for both fields; and the e2e suite passes.

## Not scheduled

- **Deploying the demo and adding its link.** The owner still has to choose a host. `docs/deployment.md` covers the rest.
- **TypeScript 7 and ESLint 10.** Blocked upstream, as F1 records in `dependabot.yml`. Lift the ignore rules when `openapi-typescript`, `typescript-eslint`, and the plugins in `eslint-config-next` accept them.
- **New algorithms.** Bellman–Ford, BST and AVL deletion, and tombstones for linear probing. `improvement.md` ranks these lowest.
- **Dark theme.** It touches every component and has no evidence of demand.
- **10px playback buttons below 640px.** The one exception to the 12px minimum, recorded in the audit. Fixing it needs a different narrow layout for the five buttons.

## Decisions built into the tasks

Three tasks apply a default that the owner may want to change before the wave starts.

- **F1 holds TypeScript at 5 and ESLint at 9** with Dependabot ignore rules, instead of forcing the majors with `overrides`.
- **F2 asks hash-bucket questions only for integer keys.** String keys hash by character-code sum, which learners cannot reasonably compute.
- **F3 draws the current action in one amber tone**, instead of keeping a color per step type and listing every one in the legend.
