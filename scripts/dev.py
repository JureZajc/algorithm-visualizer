#!/usr/bin/env python3
"""Run common Algorithm Visualizer development tasks."""

import sys


if sys.version_info < (3, 12):
    print("Error: Python 3.12 or newer is required.", file=sys.stderr)
    raise SystemExit(1)


import argparse
import errno
import os
import shutil
import signal
import socket
import subprocess
import time
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
    "dev": ("uv", "npm"),
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
    subparsers.add_parser(
        "dev", help="Start both development servers with available ports."
    )
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
        ("uv", "run", "--no-sync", "ruff", "check", ".", "../scripts"),
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
    frontend_tests = Step(
        "Frontend: running tests",
        ("npm", "test"),
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
        return (backend_ruff, backend_tests, frontend_lint, frontend_tests, frontend_build)
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
            frontend_tests,
            frontend_build,
        )
    raise ValueError(f"Unknown task: {command}")


def find_available_port(preferred: int) -> int:
    """Probe the same IPv4 loopback interface used by both development servers."""
    for port in range(preferred, 65536):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            # Windows otherwise permits binding a port owned by a reusable socket.
            if os.name == "nt":
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            try:
                probe.bind(("127.0.0.1", port))
            except OSError as error:
                if error.errno not in {errno.EADDRINUSE, errno.EACCES}:
                    raise
            else:
                return port
    raise OSError(f"No available development port at or above {preferred}.")


def select_port(preferred: int) -> int:
    port = find_available_port(preferred)
    if port != preferred:
        print(f"Port {preferred} is already in use; using {port}.", flush=True)
    return port


def server_step(command: str, port: int) -> Step:
    if command == "backend":
        return Step(
            "Backend",
            (
                "uv",
                "run",
                "uvicorn",
                "app.main:app",
                "--reload",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ),
            BACKEND_DIRECTORY,
        )
    return Step(
        "Frontend",
        ("npm", "run", "dev", "--", "--hostname", "127.0.0.1", "--port", str(port)),
        FRONTEND_DIRECTORY,
    )


class WindowsJob:
    """Keep npm/Next and Uvicorn/reloader descendants in a kill-on-close job."""

    def __init__(self) -> None:
        import ctypes
        from ctypes import wintypes

        class BasicLimits(ctypes.Structure):
            _fields_ = [
                ("ProcessTime", ctypes.c_longlong),
                ("JobTime", ctypes.c_longlong),
                ("LimitFlags", wintypes.DWORD),
                ("MinWorkingSet", ctypes.c_size_t),
                ("MaxWorkingSet", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class ExtendedLimits(ctypes.Structure):
            _fields_ = [
                ("Basic", BasicLimits),
                ("IoCounters", ctypes.c_ulonglong * 6),
                ("ProcessMemoryLimit", ctypes.c_size_t),
                ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t),
                ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        self.api = ctypes.WinDLL("kernel32", use_last_error=True)
        self.api.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        self.api.CreateJobObjectW.restype = wintypes.HANDLE
        self.api.SetInformationJobObject.argtypes = [
            wintypes.HANDLE,
            ctypes.c_int,
            ctypes.c_void_p,
            wintypes.DWORD,
        ]
        self.api.SetInformationJobObject.restype = wintypes.BOOL
        self.api.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        self.api.AssignProcessToJobObject.restype = wintypes.BOOL
        self.api.CloseHandle.argtypes = [wintypes.HANDLE]
        self.api.CloseHandle.restype = wintypes.BOOL
        self.handle = self.api.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = ExtendedLimits()
        limits.Basic.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not self.api.SetInformationJobObject(
            self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)
        ):
            error = ctypes.WinError(ctypes.get_last_error())
            self.close()
            raise error

    def assign(self, process: subprocess.Popen) -> None:
        import ctypes

        if not self.api.AssignProcessToJobObject(self.handle, int(process._handle)):
            raise ctypes.WinError(ctypes.get_last_error())

    def close(self) -> None:
        if self.handle:
            self.api.CloseHandle(self.handle)
            self.handle = None


def stop_servers(processes: list[subprocess.Popen], job: WindowsJob | None) -> None:
    """Signal whole process groups, then enforce a bounded shutdown."""
    for process in processes:
        try:
            if os.name == "nt":
                if process.poll() is None:
                    process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                # The group can still contain children after its leader exits.
                os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except OSError:
            # Forced cleanup below also handles unavailable Windows consoles.
            pass
    deadline = time.monotonic() + 5
    for process in processes:
        try:
            process.wait(timeout=max(0, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            pass
    if job is not None:
        job.close()
    elif os.name != "nt":
        for process in processes:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    for process in processes:
        if process.poll() is None:
            # Also covers failure to assign a newly launched Windows process.
            process.kill()
        process.wait()


def run_servers(servers: list[tuple[Step, dict[str, str]]]) -> int:
    processes: list[subprocess.Popen] = []
    job = None
    try:
        if os.name == "nt":
            job = WindowsJob()
        for step, environment in servers:
            command = (
                shutil.which(step.command[0]) or step.command[0],
                *step.command[1:],
            )
            process = subprocess.Popen(
                command,
                cwd=step.working_directory,
                env=environment,
                start_new_session=os.name != "nt",
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                if os.name == "nt"
                else 0,
            )
            processes.append(process)
            if job is not None:
                job.assign(process)
        while True:
            for (step, _), process in zip(servers, processes):
                code = process.poll()
                if code is not None:
                    print(
                        f"{step.label} exited unexpectedly (status {code}).",
                        file=sys.stderr,
                    )
                    return code if code > 0 else 1
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nStopping development servers...", flush=True)
        return 130
    except OSError as error:
        print(f"Error: could not start development servers: {error}", file=sys.stderr)
        return 1
    finally:
        # A second Ctrl+C must not interrupt cleanup and leave child processes.
        previous = signal.signal(signal.SIGINT, signal.SIG_IGN)
        try:
            stop_servers(processes, job)
        finally:
            signal.signal(signal.SIGINT, previous)


def run_development(command: str) -> int:
    backend_env = os.environ.copy()
    frontend_env = os.environ.copy()
    servers = []
    if command == "dev":
        print("==> Starting Algorithm Visualizer\n", flush=True)
    if command in {"backend", "dev"}:
        backend_port = select_port(8000)
        backend_url = f"http://127.0.0.1:{backend_port}"
        backend_env["ALGORITHM_VISUALIZER_DEV_CORS"] = "1"
        servers.append((server_step("backend", backend_port), backend_env))
    if command in {"frontend", "dev"}:
        frontend_port = select_port(3000)
        print(f"Frontend:  http://localhost:{frontend_port}", flush=True)
        servers.append((server_step("frontend", frontend_port), frontend_env))
    if command == "dev":
        frontend_env["NEXT_PUBLIC_API_URL"] = backend_url
        backend_env.pop("ALGORITHM_VISUALIZER_DEV_CORS", None)
        backend_env["CORS_ORIGINS"] = (
            f"http://localhost:{frontend_port},http://127.0.0.1:{frontend_port}"
        )
    if command in {"backend", "dev"}:
        print(f"Backend:   {backend_url}\nAPI docs:  {backend_url}/docs", flush=True)
    print(
        "\nPress Ctrl+C to stop "
        + ("both servers." if command == "dev" else "the server."),
        flush=True,
    )
    return run_servers(servers)


def run_steps(steps: tuple[Step, ...]) -> int:
    for step in steps:
        print(f"==> {step.label}", flush=True)
        try:
            command = (
                shutil.which(step.command[0]) or step.command[0],
                *step.command[1:],
            )
            result = subprocess.run(command, cwd=step.working_directory)
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
        if args.command in {"backend", "frontend", "dev"}:
            return run_development(args.command)
        return run_steps(steps_for(args.command))
    except OSError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print()
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
