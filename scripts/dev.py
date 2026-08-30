#!/usr/bin/env python3
"""Run common Algorithm Visualizer development tasks."""

import sys


if sys.version_info < (3, 12):
    print("Error: Python 3.12 or newer is required.", file=sys.stderr)
    raise SystemExit(1)


import argparse
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIRECTORY = REPOSITORY_ROOT / "backend"
FRONTEND_DIRECTORY = REPOSITORY_ROOT / "frontend"


@dataclass(frozen=True)
class Step:
    label: str
    command: tuple[str, ...]
    working_directory: Path


COMMAND_TOOLS = {
    "setup": ("uv", "npm"),
    "check": ("uv", "npm"),
    "check-clean": ("uv", "npm"),
    "backend": ("uv",),
    "frontend": ("npm",),
}


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run Algorithm Visualizer development tasks."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser(
        "setup", help="Install or synchronize backend and frontend dependencies."
    )
    subparsers.add_parser(
        "check", help="Validate the project with currently installed dependencies."
    )
    subparsers.add_parser(
        "check-clean", help="Synchronize locked dependencies and validate the project."
    )
    subparsers.add_parser("backend", help="Start the FastAPI development server.")
    subparsers.add_parser("frontend", help="Start the Next.js development server.")
    return parser


def validate_tools(command: str) -> bool:
    for tool in COMMAND_TOOLS[command]:
        if shutil.which(tool) is None:
            print(f"Error: {tool} was not found on PATH.", file=sys.stderr)
            if tool == "uv":
                print("Install uv and ensure it is available on PATH.", file=sys.stderr)
            else:
                print(
                    "Install Node.js with npm and ensure npm is available on PATH.",
                    file=sys.stderr,
                )
            return False
    return True


def require_installed_dependencies() -> bool:
    if not (BACKEND_DIRECTORY / ".venv").is_dir():
        print("Backend dependencies are not installed.", file=sys.stderr)
        print("Run:\n\n  python scripts/dev.py setup", file=sys.stderr)
        return False
    if not (FRONTEND_DIRECTORY / "node_modules").is_dir():
        print("Frontend dependencies are not installed.", file=sys.stderr)
        print("Run:\n\n  python scripts/dev.py setup", file=sys.stderr)
        return False
    return True


def steps_for(command: str) -> tuple[Step, ...]:
    backend_ruff = Step(
        "Backend: running Ruff",
        ("uv", "run", "--no-sync", "ruff", "check", "."),
        BACKEND_DIRECTORY,
    )
    backend_tests = Step(
        "Backend: running tests",
        ("uv", "run", "--no-sync", "pytest"),
        BACKEND_DIRECTORY,
    )
    frontend_lint = Step(
        "Frontend: running lint",
        ("npm", "run", "lint"),
        FRONTEND_DIRECTORY,
    )
    frontend_build = Step(
        "Frontend: running build",
        ("npm", "run", "build"),
        FRONTEND_DIRECTORY,
    )

    if command == "setup":
        return (
            Step(
                "Backend: synchronizing dependencies",
                ("uv", "sync"),
                BACKEND_DIRECTORY,
            ),
            Step(
                "Frontend: installing locked dependencies",
                ("npm", "ci"),
                FRONTEND_DIRECTORY,
            ),
        )
    if command == "check":
        return (backend_ruff, backend_tests, frontend_lint, frontend_build)
    if command == "check-clean":
        return (
            Step(
                "Backend: synchronizing locked dependencies",
                ("uv", "sync", "--frozen"),
                BACKEND_DIRECTORY,
            ),
            backend_ruff,
            backend_tests,
            Step(
                "Frontend: installing locked dependencies",
                ("npm", "ci"),
                FRONTEND_DIRECTORY,
            ),
            frontend_lint,
            frontend_build,
        )
    if command == "backend":
        return (
            Step(
                "Backend: starting development server",
                ("uv", "run", "uvicorn", "app.main:app", "--reload"),
                BACKEND_DIRECTORY,
            ),
        )
    return (
        Step(
            "Frontend: starting development server",
            ("npm", "run", "dev"),
            FRONTEND_DIRECTORY,
        ),
    )


def run_steps(steps: tuple[Step, ...]) -> int:
    for step in steps:
        print(f"==> {step.label}", flush=True)
        try:
            result = subprocess.run(step.command, cwd=step.working_directory)
        except OSError as error:
            print(f"Error: could not run {step.command[0]}: {error}", file=sys.stderr)
            return 1
        if result.returncode != 0:
            return result.returncode
    return 0


def main() -> int:
    args = create_parser().parse_args()

    if not validate_tools(args.command):
        return 1
    if args.command == "check" and not require_installed_dependencies():
        return 1

    try:
        return run_steps(steps_for(args.command))
    except KeyboardInterrupt:
        print()
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
