# Algorithm Visualizer UX/UI Audit and Implementation Plan

**Audit date:** 2026-07-10

## Status

- Audit completed
- Implementation not started
- Current branch: `feature/ui-polish`

## Audit Summary

### What currently works well

- The desktop design has a clean educational identity, strong typography, restrained color, and consistent rounded card styling.
- The branch already establishes useful shared foundations: `Panel`, `Button`, `FormField`, alerts, status badges, legends, visualization headers, and unified step controls.
- Core controls generally have labels, visible focus treatment, disabled states, inline validation, and 44px action-button heights.
- Running, paused, complete, invalid, loading, and error states are represented with both color and text.
- Tables use semantic markup and sticky headers; wide tables, trees, Sudoku, and grids are generally contained rather than overflowing the document.
- Pseudocode highlighting, metadata, statistics, result summaries, presets, custom inputs, and editors remain clearly connected to each visualization.
- Desktop and laptop layouts are effective from approximately 1024px upward.

### Most important problems

- At 320px, category navigation occupies 202px and exposes abbreviated accessible names such as “DP” and “BT.” Playback controls occupy 260px and a large step count causes page-level horizontal overflow.
- Metadata appears before the core visualization. On mobile, the visualization can begin around 1,700–2,100px down the page.
- High-frequency `aria-live` regions announce step descriptions and counters during autoplay, potentially overwhelming screen-reader users.
- The custom graph placement canvas is pointer-only. A 15×15 maze produces 225 tab stops; Sudoku produces 81. Maze and Sudoku cells measure only 32–34px.
- Large visualizations are technically contained but not always usable:
  - A capacity-50 DP table requires roughly 11× horizontal scrolling, without an explicit scroll affordance.
  - A 31-node degenerate tree compresses nodes until they are extremely small.
  - A 31-bucket hash table adds about 2,000–2,250px to the visualization.
  - The 15×15 maze grid risks overlapping tracks because cell minimum widths exceed zero-minimum grid tracks.
- “Playing” and “Running” are used for the same state. Completed playback leaves a disabled button labelled “Resume.” Generic “Reset” is ambiguous beside “Reset maze” and “Reset puzzle.”
- Some control panels and visualization sections lack accessible landmark names. Hash buckets are generic `div` elements, while SVGs expose only broad image labels.
- Maze tool selection is visual-only because the buttons lack `aria-pressed`.
- The green “API-backed steps” badge looks like live service health even when the API is unavailable.
- Metadata displays raw category names such as `dynamic_programming` and `hash_tables`.
- Legend colors are centrally inferred from label strings and do not always match the actual visualization, notably Searching’s “Inspect” state and action-dependent graph/tree colors.
- Empty and initial states differ substantially: Compare has a dedicated empty state, arrays and DP show previews, while Trees presents a mostly blank canvas.
- Small 0.65rem labels and some `slate-400` text are visually weaker than the rest of the interface.

### Inconsistencies between categories

- Sorting names its control panel as a region, while most other category control panels remain unnamed sections.
- Sorting, Searching, DP, Backtracking, Graph, Trees, and Hash Tables use similar control layouts but repeat local implementations for speed fields, selectors, action rows, validation, and reset actions.
- Supporting sidebar widths vary between 260px and 300px.
- “Playing” in step controls and “Running” in visualization headers describe the same state.
- Reset semantics differ or become ambiguous in editor-heavy categories.
- Initial states range from useful previews to a blank tree canvas.
- Compare uses the shared `EmptyState`, while visualization categories use unrelated empty-state treatments.
- Legends use shared label-to-color inference even where category rendering uses different colors.
- Category metadata badges expose raw backend identifiers in some categories.
- Speed ranges differ for valid algorithm-specific reasons, but their presentation is repeated rather than standardized.

### Accessibility issues

- Mobile category buttons expose abbreviated accessible names because their full labels are hidden and no explicit full `aria-label` is supplied.
- Step descriptions and counters are live regions that update on every autoplay step.
- Several `Panel` sections have no heading association or accessible name, so they do not form useful landmarks.
- Alerts use polite live regions but do not consistently distinguish errors from status updates.
- Maze tools lack `aria-pressed`, making the selected editing mode unavailable to assistive technology.
- The custom graph placement surface has no role, accessible name, or keyboard focus.
- The maze can add 225 buttons to the tab order and Sudoku adds 81 text inputs, with no roving focus or arrow-key grid navigation.
- Editable maze cells are 32px and Sudoku cells are 34px at 320px.
- Speed and step range inputs have a 16px rendered interaction height.
- Graph node removal and edge removal buttons are below the preferred 44px target.
- Graph and tree SVGs have broad image labels but do not directly associate the current textual step or state summary.
- Hash-table buckets are visually structured but expose little list/table semantics.
- Important states are generally not color-only because legends and descriptions exist; however, inconsistent legend colors weaken that protection.
- The shared visible focus ring is strong and should be preserved.

### Responsive-layout risks

- At 320px, navigation requires four rows and full category names are hidden.
- At 320px, playback uses three button rows and its status/count header can create page-level horizontal overflow.
- On mobile, metadata and tall control panels push the visualization multiple screens below the navigation.
- At 320px, graph SVGs scale to approximately 260px wide while retaining a 360px minimum height, reducing node and label clarity.
- A capacity-50 DP table is safely contained, but its 2,740px table width sits inside a 252px scroller without an explicit overflow cue.
- A completed 31-node degenerate BST uses a `2436 × 2710` view box but renders in a 650px-wide SVG, making nodes extremely small.
- A size-31 separate-chaining hash view is approximately 2,250px tall; the equivalent probing grid is approximately 1,998px tall.
- At 320px, a 15×15 maze uses 32px cells and grid tracks that can conflict with the cells’ minimum widths.
- Sudoku is contained by horizontal scrolling, but its editable cells remain 34px.
- At 768px, navigation becomes a reasonable two-row layout, but category controls can still exceed 500px in height.
- At 1024px and wider, navigation, playback controls, sidebar layout, and visualization sizing are generally sound.

### Repeated components that should be standardized

- Panel/card shell and semantic landmark behavior
- Control panel shell
- Section header and eyebrow text
- Form field and conditional helper/error message
- Speed/range field
- Action row
- Status badge
- Alert and inline validation message
- Empty visualization state
- Visualization header
- Explicit legend item
- Result summary
- Overflow frame and scroll affordance
- Step controls
- Visualization workspace and support rail

### Low-risk improvements

- Supply full navigation labels and accessible names.
- Replace the technical API badge with neutral educational copy.
- Humanize category identifiers.
- Name control and visualization landmarks.
- Stop reserving empty helper-message rows.
- Increase range and delete-button hit areas.
- Rename reset and destructive actions.
- Add `aria-pressed` to maze tools.
- Correct legend colors and Fibonacci wrapped-slot numbering.
- Wrap step counters and long result summaries.
- Add focusable, labelled overflow frames and visible overflow hints.
- Cap large hash-table viewport height.

### Changes that would be too risky or broad for this effort

- Backend or API changes
- Algorithm or visualization-step behavior changes
- A new UI component library
- A complete visual redesign
- Replacing playback state management with a new state machine
- URL routing, deep-linking, or persistence of every editor state
- A canvas rendering-engine rewrite
- A full pan/zoom framework
- Visualization virtualization
- Removing algorithms, editors, presets, pseudocode, metadata, or manual controls

## Likely File Groups

### Core UI

- `frontend/components/algorithm-visualizer.tsx`
- `frontend/components/ui-primitives.tsx`
- `frontend/app/globals.css`

### Playback

- `frontend/components/step-controls.tsx`
- `frontend/hooks/use-step-playback.ts`
- `frontend/components/visualizer-panel.tsx`

### Supporting panels

- `frontend/components/algorithm-metadata-panel.tsx`
- `frontend/components/pseudocode-panel.tsx`
- `frontend/components/visualizer-stats.tsx`

### Category shells

- `frontend/components/sorting-visualizer.tsx`
- `frontend/components/sorting-comparison.tsx`
- `frontend/components/searching-visualizer.tsx`
- `frontend/components/graph-visualizer.tsx`
- `frontend/components/dynamic-programming-visualizer.tsx`
- `frontend/components/backtracking-visualizer.tsx`
- `frontend/components/trees-visualizer.tsx`
- `frontend/components/hash-tables-visualizer.tsx`

### Wide and editable surfaces

- `frontend/components/graph-canvas.tsx`
- `frontend/components/tree-canvas.tsx`
- `frontend/components/dynamic-programming-table.tsx`
- `frontend/components/backtracking-grid.tsx`
- `frontend/components/sudoku-grid.tsx`
- `frontend/components/hash-table-view.tsx`
- `frontend/components/graph-editor.tsx`

## Phase 1 — Safe, High-Impact UI/UX Improvements

- [ ] **1. Compact, fully named navigation**

  **Concrete problem:** Mobile navigation uses four rows and abbreviated visible and accessible names. The technical API badge resembles a service-health indicator.

  **Affected areas:** Header and category navigation.

  **Proposed change:** Use a single horizontally scrollable, scroll-snap row below 640px with full labels, a visible overflow affordance, and full `aria-label` values. Retain the 4×2 tablet and 8×1 desktop grids. Replace the API badge with neutral educational copy such as “Interactive step by step.”

  **Priority:** High

  **Implementation risk:** Low

  **Likely files:** Core UI.

- [ ] **2. Prioritize the visualization in page order**

  **Concrete problem:** Full metadata pushes the principal visualization multiple screens below the controls on mobile and below the fold on common laptops.

  **Affected areas:** All visualizer categories except Compare.

  **Proposed change:** Standardize the order as controls → visualization with pseudocode/stats → algorithm overview. Keep metadata fully available below the workspace and rename it “Algorithm overview.” Make complexity cards two columns on narrow screens.

  **Priority:** High

  **Implementation risk:** Low–Medium

  **Likely files:** Category shells and Supporting panels.

- [ ] **3. Complete the shared visual primitives**

  **Concrete problem:** Repeated speed fields, control panels, action rows, result boxes, and overflow wrappers still use local class strings. `Panel` always renders a semantic `section`, even when unnamed.

  **Affected areas:** All categories and shared panels.

  **Proposed change:** Add focused primitives for `ControlPanel`, `SectionHeader`, `RangeField`, `ActionRow`, `ResultSummary`, and `OverflowFrame`. Allow `Panel` to render an appropriate element or require an accessible name for sections. Standardize sidebar width, padding, radii, border, shadow, label size, and minimum readable text color.

  **Priority:** High

  **Implementation risk:** Low–Medium

  **Likely files:** Core UI, Playback, Supporting panels, and Category shells.

- [ ] **4. Standardize forms and actions**

  **Concrete problem:** Empty `FormField` message rows waste vertical space. Range inputs have only a 16px hit area. “Reset” and destructive clears are ambiguous. Graph delete buttons are 28–36px.

  **Affected areas:** All control panels, graph editor, maze tools, and Sudoku tools.

  **Proposed change:** Render helper/error space only when content exists. Give speed and step sliders a 44px interaction box. Rename playback reset to “Reset run.” Keep input-specific resets explicit. Apply the danger variant to clear/remove actions and increase delete buttons to 44px. Preserve each algorithm’s existing ranges and validation rules.

  **Priority:** High

  **Implementation risk:** Low

  **Likely files:** Core UI, Playback, Category shells, and Graph editor.

- [ ] **5. Make playback compact and complete**

  **Concrete problem:** At 320px, playback uses three button rows and overflows with large step counts. Completed playback shows disabled “Resume.” “Playing” conflicts with “Running.”

  **Affected areas:** Shared playback controls and playback hook.

  **Proposed change:** At narrow widths, render one five-column row with visible labels “First,” “Prev,” “Play/Pause,” “Next,” and “Last,” while retaining full accessible names. Let the step/status header wrap. Use “Running” everywhere. Add a small `restart()` hook action so completion exposes an enabled “Replay” button that resets elapsed time and replays loaded steps without another API request.

  **Priority:** Critical

  **Implementation risk:** Low–Medium

  **Likely files:** Playback.

- [ ] **6. Fix validation, error, and announcement behavior**

  **Concrete problem:** Error semantics are polite generic live regions, while descriptions and step counters update live on every autoplay tick. Loading state is not consistently exposed with `aria-busy`.

  **Affected areas:** Alerts, inline validation, visualizer headers, and playback controls.

  **Proposed change:** Use `role="alert"` for validation/API failures and `role="status"` for loading and playback-state changes. Stop announcing every animation frame; only announce loading, running, paused, complete, invalid, error, and manual step changes. Add `aria-busy` to loading control/visualization regions. Keep helper text connected through `aria-describedby`.

  **Priority:** Critical

  **Implementation risk:** Low

  **Likely files:** Core UI, Playback, and Category shells.

- [ ] **7. Align headers, legends, empty states, and results**

  **Concrete problem:** Raw category identifiers appear in metadata, legends can disagree with actual colors, and initial states are inconsistent. Long results can strain narrow headers.

  **Affected areas:** Metadata, visualization panel, Searching, Graph, Trees, DP, and Compare.

  **Proposed change:** Format category labels as human-readable text. Change legends to explicit `{ label, tone }` items instead of label-to-class inference. Ensure Searching’s Inspect color matches the bars and add a consistent active outline for graph/tree current actions. Reuse a compact visualization empty state for Trees and unavailable data. Ensure result summaries wrap and show item counts before long arrays. Correct Fibonacci compact-table slot numbering across wrapped rows.

  **Priority:** High

  **Implementation risk:** Low–Medium

  **Likely files:** Core UI, Supporting panels, Playback, and relevant category/surface files.

- [ ] **8. Make wide visualizations intentionally scrollable**

  **Concrete problem:** DP is contained but lacks a scroll cue; graph content becomes too small; large trees compress; hash views become thousands of pixels tall; dense grids can overlap.

  **Affected areas:** Graph, Trees, DP, Maze, Sudoku, and Hash Tables.

  **Proposed change:** Use the shared focusable `OverflowFrame` with an accessible label, focus ring, and “Scroll to explore” hint only when overflow exists. Give graph SVGs a readable minimum width. Render trees at their calculated dimensions inside a max-height two-axis scroller so nodes retain size. Cap hash-table view height with internal vertical scrolling and show bucket/slot count. Use explicit grid tracks; editable maze/Sudoku cells get 44px tracks and horizontal containment. Preserve sticky DP headers.

  **Priority:** Critical

  **Implementation risk:** Medium

  **Likely files:** Wide and editable surfaces.

- [ ] **9. Finish keyboard and semantic accessibility**

  **Concrete problem:** Mobile nav names are abbreviated; visualization/control sections are often unnamed; maze tools lack selection state; grid editors create 81–225 tab stops; graph placement is pointer-only.

  **Affected areas:** Navigation, all control/visualization panels, graph editor, maze, Sudoku, SVG visualizations, and hash visualizations.

  **Proposed change:** Give every mode its full accessible name and every control/visualization panel an `aria-labelledby` heading. Add `aria-pressed` to maze tools. Implement roving `tabIndex` plus arrow-key navigation for editable grids, leaving one grid cell in the normal tab order. Make the graph placement surface focusable and allow Enter/Space to place a pending node at the next deterministic free position. Link graph/tree SVGs to the current textual step description and give hash buckets list semantics and descriptive labels. Preserve the existing global focus ring.

  **Priority:** Critical

  **Implementation risk:** Medium

  **Likely files:** Core UI, Playback, Graph editor, and Wide and editable surfaces.

## Phase 2 — Optional Deeper Component Cleanup

Phase 2 is optional and should begin only after Phase 1 passes the responsive and accessibility verification matrix.

### 1. Extract a category workspace shell

**Concrete problem:** Seven categories repeat the same control, error, visualization, metadata, pseudocode, and stats arrangement.

**Affected areas:** Sorting, Searching, Graph, DP, Backtracking, Trees, and Hash Tables.

**Proposed change:** Introduce a slot-based `VisualizerWorkspace` and `VisualizerSupportRail`. Migrate one category at a time without moving algorithm state or API calls.

**Priority:** Optional

**Implementation risk:** Medium

**Likely files:** Category shells, Playback, and Supporting panels.

### 2. Extract repeated configurable fields

**Concrete problem:** Algorithm/preset selectors, number fields, speed controls, validation wrappers, and action rows are duplicated with minor variations.

**Affected areas:** DP, Backtracking, Graph, Trees, Hash Tables, and Searching.

**Proposed change:** Add typed field components and shared parsing helpers while leaving category-specific request creation and validation limits in place.

**Priority:** Optional

**Implementation risk:** Medium

**Likely files:** Category shells, Core UI, and a new frontend validation helper.

### 3. Refine category-specific visual semantics

**Concrete problem:** Graph/tree action colors change by step type, large canvases need better orientation, and hash/DP state descriptions remain terse.

**Affected areas:** Graph, Trees, Hash Tables, and DP.

**Proposed change:** Stabilize semantic state tokens, add compact textual state summaries, and optionally add simple “Fit” and “Actual size” controls. Do not introduce a canvas engine or rewrite layout algorithms.

**Priority:** Optional

**Implementation risk:** Medium

**Likely files:** Wide and editable surfaces and relevant category types where necessary.

### 4. Improve comparison presentation

**Concrete problem:** Compare is polished but structurally separate, and its bar chart is visual-only beyond adjacent text values.

**Affected areas:** Compare.

**Proposed change:** Reuse shared section/result primitives, add an accessible chart description, and improve large-input summaries with total count and truncation disclosure.

**Priority:** Optional

**Implementation risk:** Low

**Likely files:** `frontend/components/sorting-comparison.tsx` and Core UI.

## Shared Interfaces Expected to Change

These are internal frontend interfaces only:

- `Legend` should accept explicit legend item objects instead of string-to-color lookup.
- `StepControls` should receive an `onReplay`/`onRestart` callback and expose compact responsive labels.
- `useStepPlayback` should add a narrowly scoped `restart()` method; existing loading, seek, and playback behavior remains unchanged.
- `Panel` and `VisualizationPanel` should support correct landmark elements, IDs, `aria-labelledby`, and busy/status semantics.
- `GraphCanvas` should receive the pending-node label and keyboard placement callback.
- Grid components should manage roving focus without changing their cell-update contracts.

No backend type, request body, response shape, API route, or algorithm result changes are planned.

## Verification and Acceptance Criteria

- Run `npm run lint` and `npm run build`.
- Test every category at 320, 390, 768, 1024, and 1440px.
- Confirm no page-level horizontal overflow at 320px; intentional visualization overflow must remain inside labelled, keyboard-focusable scrollers.
- Verify initial, invalid, loading, running, paused, completed, replayed, reset, API-error, and metadata-error states.
- Verify large cases: 50 sorting values, capacity-50 DP, 15×15 maze, Sudoku, 31-node sorted BST, 31-slot hash table, and custom graph editor.
- Confirm category labels remain full for screen readers, navigation focus stays visible, sliders work with arrow keys, and all normal actions are reachable without a pointer.
- Confirm maze/Sudoku use one tab stop per grid with arrow-key movement and 44px editable cells.
- Confirm graph node placement is possible with keyboard alone.
- Confirm autoplay does not announce every step; pause, completion, validation, and manual steps remain announced.
- Check contrast for normal text, badges, validation, active pseudocode, visualization states, and focus rings. Important text should not rely on `slate-400` or sub-12px sizing.
- Recheck every legend against the rendered state colors and verify all states retain text or shape cues in addition to color.

## Explicitly Deferred Items

- Backend or API changes
- Algorithm or visualization-step behavior changes
- A new component library or full visual redesign
- Replacing playback state management with a new state machine
- URL routing, deep-linking, or persistence of every category’s editor state
- A canvas rendering-engine rewrite, full pan/zoom framework, or visualization virtualization
- Removing features, algorithms, editors, pseudocode, metadata, manual controls, or current presets

## Assumptions

- Phase 1 remains incremental and retains Tailwind CSS with statically discoverable class names.
- Existing animation speeds, input limits, API contracts, and autoplay defaults remain unchanged, except for explicit replay and reduced announcement noise.
- Phase 2 is optional and should begin only after Phase 1 passes the responsive and accessibility matrix.
- No backend logic, algorithm behavior, or API contracts will change.
- No UI component library will be added.
- No automatic commit or push is part of implementation.
