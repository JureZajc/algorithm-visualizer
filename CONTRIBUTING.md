# Contributing

Thanks for helping improve Algorithm Visualizer. Bug reports, fixes, and
improvements are welcome. Before starting a large change, open an issue so the
approach can be agreed first.

## Setup

You need Python 3.12 or newer, [uv](https://docs.astral.sh/uv/), and Node.js 22
with npm, the version CI uses. From the repository root:

```bash
python scripts/dev.py setup
python scripts/dev.py dev
```

`setup` installs the locked backend and frontend dependencies. `dev` starts both
servers and prints their URLs. If your system exposes Python as `python3`, use
that instead. [backend/README.md](backend/README.md) and
[frontend/README.md](frontend/README.md) describe each project.

## Check your change

Run the full check before you open a pull request:

```bash
python scripts/dev.py check
```

It runs the backend and frontend static checks and tests, then a production
build of the frontend. `python scripts/dev.py check-clean` runs the same checks
after reinstalling both projects from their lockfiles, which is closer to what
CI does.

CI also runs Playwright smoke tests, one per category, in a separate job. If
your change touches a visualizer's controls or results, run them locally with
`npm run test:e2e` from `frontend`; the
[Validation section](README.md#validation) explains the one-time browser
install.

Add or update tests for the behavior you change. If you change a request or
response, update [docs/api.md](docs/api.md) as well.

## Branches and commits

Branch from `master` and name the branch after the kind of change:

- `feature/` for new behavior, for example `feature/hash-table-visualizer`
- `fix/` for bug fixes, for example `fix/api-input-limits`
- `chore/` for tooling, dependencies, and cleanup
- `docs/` for documentation only

Write commit subjects in the imperative mood, in sentence case, without a
trailing period, and without a type prefix. Keep them short and name what
changed, for example "Add AVL insert visualization" or "Bound API inputs, cap
Sudoku search". Keep each commit focused on one change.

Open the pull request against `master` and describe what changed and how you
verified it. CI must pass before merging.

## Reporting issues

Use the bug report or feature request template when you
[open an issue](https://github.com/JureZajc/algorithm-visualizer/issues/new/choose).
For a bug, include the category, the algorithm, the input, and what you
expected to see.
