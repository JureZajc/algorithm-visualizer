import errno
import importlib.util
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from types import SimpleNamespace
from unittest.mock import MagicMock, call

import pytest


spec = importlib.util.spec_from_file_location(
    "development_helper", Path(__file__).resolve().parents[2] / "scripts" / "dev.py"
)
dev = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = dev
spec.loader.exec_module(dev)


@pytest.mark.parametrize("occupied", [0, 1, 3])
def test_find_available_port_uses_first_available(monkeypatch, occupied):
    probes = [MagicMock() for _ in range(occupied + 1)]
    for probe in probes:
        probe.__enter__.return_value = probe
    for probe in probes[:-1]:
        probe.bind.side_effect = OSError(errno.EADDRINUSE, "Address in use")
    factory = MagicMock(side_effect=probes)
    monkeypatch.setattr(dev.socket, "socket", factory)

    assert dev.find_available_port(8000) == 8000 + occupied
    for offset, probe in enumerate(probes):
        probe.bind.assert_called_once_with(("127.0.0.1", 8000 + offset))
        probe.__exit__.assert_called_once()


def test_find_available_port_detects_a_real_listener(monkeypatch):
    real_socket = socket.socket
    with real_socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        preferred = listener.getsockname()[1]
        if preferred == 65535:
            pytest.skip("The allocated listener has no higher port to probe")
        # Only the occupied candidate uses a real socket. The adjacent port is
        # mocked so the test never depends on it being free on this machine.
        available = MagicMock()
        available.__enter__.return_value = available
        monkeypatch.setattr(
            dev.socket,
            "socket",
            MagicMock(
                side_effect=[real_socket(socket.AF_INET, socket.SOCK_STREAM), available]
            ),
        )
        assert dev.find_available_port(preferred) == preferred + 1
        available.bind.assert_called_once_with(("127.0.0.1", preferred + 1))


def test_find_available_port_reports_exhaustion(monkeypatch):
    probe = MagicMock()
    probe.__enter__.return_value = probe
    probe.bind.side_effect = OSError(errno.EADDRINUSE, "Address in use")
    monkeypatch.setattr(dev.socket, "socket", MagicMock(return_value=probe))
    with pytest.raises(OSError, match="No available development port"):
        dev.find_available_port(65535)


def test_find_available_port_propagates_unexpected_socket_errors(monkeypatch):
    probe = MagicMock()
    probe.__enter__.return_value = probe
    probe.bind.side_effect = OSError(errno.ENOBUFS, "No buffer space")
    monkeypatch.setattr(dev.socket, "socket", MagicMock(return_value=probe))
    with pytest.raises(OSError, match="No buffer space"):
        dev.find_available_port(8000)


def test_select_port_announces_fallback(monkeypatch, capsys):
    monkeypatch.setattr(dev, "find_available_port", lambda _: 8002)
    assert dev.select_port(8000) == 8002
    assert "Port 8000 is already in use; using 8002." in capsys.readouterr().out


@pytest.mark.parametrize("command,port", [("backend", 8002), ("frontend", 3003)])
def test_server_commands_use_explicit_selected_port(command, port):
    step = dev.server_step(command, port)
    assert step.command[-2:] == ("--port", str(port))
    if command == "backend":
        assert step.command[:5] == ("uv", "run", "uvicorn", "app.main:app", "--reload")
        assert step.working_directory == dev.BACKEND_DIRECTORY
    else:
        assert step.command[:4] == ("npm", "run", "dev", "--")
        assert step.working_directory == dev.FRONTEND_DIRECTORY


def test_combined_command_wires_urls_and_exact_cors(monkeypatch, capsys):
    ports = MagicMock(side_effect=[8002, 3003])
    run = MagicMock(return_value=130)
    monkeypatch.setattr(dev, "select_port", ports)
    monkeypatch.setattr(dev, "run_servers", run)
    monkeypatch.setenv("NEXT_PUBLIC_API_URL", "http://old.example")
    monkeypatch.setenv("ALGORITHM_VISUALIZER_DEV_CORS", "1")

    assert dev.run_development("dev") == 130
    assert ports.call_args_list == [call(8000), call(3000)]
    (backend, backend_env), (frontend, frontend_env) = run.call_args.args[0]
    assert backend.command[-1] == "8002"
    assert frontend.command[-1] == "3003"
    assert frontend_env["NEXT_PUBLIC_API_URL"] == "http://127.0.0.1:8002"
    assert backend_env["CORS_ORIGINS"] == "http://localhost:3003,http://127.0.0.1:3003"
    assert "ALGORITHM_VISUALIZER_DEV_CORS" not in backend_env
    assert os.environ["NEXT_PUBLIC_API_URL"] == "http://old.example"
    output = capsys.readouterr().out
    assert "Frontend:  http://localhost:3003" in output
    assert "Backend:   http://127.0.0.1:8002" in output
    assert "API docs:  http://127.0.0.1:8002/docs" in output
    assert "Press Ctrl+C to stop both servers." in output


@pytest.mark.parametrize("command,port", [("backend", 8001), ("frontend", 3001)])
def test_individual_commands(monkeypatch, command, port):
    monkeypatch.setattr(dev, "select_port", lambda _: port)
    run = MagicMock(return_value=130)
    monkeypatch.setattr(dev, "run_servers", run)
    monkeypatch.setenv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8009")

    assert dev.run_development(command) == 130
    [(step, environment)] = run.call_args.args[0]
    assert step.command[-1] == str(port)
    if command == "backend":
        assert environment["ALGORITHM_VISUALIZER_DEV_CORS"] == "1"
    else:
        assert environment["NEXT_PUBLIC_API_URL"] == "http://127.0.0.1:8009"


@pytest.mark.parametrize("exit_code,expected", [(7, 7), (0, 1), (-15, 1)])
def test_unexpected_exit_stops_all_servers(monkeypatch, exit_code, expected):
    backend, frontend = MagicMock(), MagicMock()
    backend.poll.return_value = exit_code
    frontend.poll.return_value = None
    monkeypatch.setattr(
        dev.subprocess, "Popen", MagicMock(side_effect=[backend, frontend])
    )
    monkeypatch.setattr(dev, "WindowsJob", MagicMock())
    cleanup = MagicMock()
    monkeypatch.setattr(dev, "stop_servers", cleanup)

    assert (
        dev.run_servers(
            [
                (dev.server_step("backend", 8001), {}),
                (dev.server_step("frontend", 3001), {}),
            ]
        )
        == expected
    )
    assert cleanup.call_args.args[0] == [backend, frontend]


def test_startup_failure_stops_already_started_server(monkeypatch):
    backend = MagicMock()
    monkeypatch.setattr(
        dev.subprocess,
        "Popen",
        MagicMock(side_effect=[backend, OSError("Launch failed")]),
    )
    monkeypatch.setattr(dev, "WindowsJob", MagicMock())
    cleanup = MagicMock()
    monkeypatch.setattr(dev, "stop_servers", cleanup)

    assert (
        dev.run_servers(
            [
                (dev.server_step("backend", 8001), {}),
                (dev.server_step("frontend", 3001), {}),
            ]
        )
        == 1
    )
    assert cleanup.call_args.args[0] == [backend]


def test_ctrl_c_stops_all_servers(monkeypatch):
    process = MagicMock()
    process.poll.side_effect = KeyboardInterrupt
    monkeypatch.setattr(dev.subprocess, "Popen", MagicMock(return_value=process))
    monkeypatch.setattr(dev, "WindowsJob", MagicMock())
    cleanup = MagicMock()
    monkeypatch.setattr(dev, "stop_servers", cleanup)

    assert dev.run_servers([(dev.server_step("backend", 8001), {})]) == 130
    assert cleanup.call_args.args[0] == [process]


def test_cleanup_kills_remaining_windows_process(monkeypatch):
    # Exercise the Windows branch on every platform, including assignment failure.
    monkeypatch.setattr(dev, "os", SimpleNamespace(name="nt"))
    monkeypatch.setattr(dev.signal, "CTRL_BREAK_EVENT", 1, raising=False)
    process = MagicMock()
    process.poll.return_value = None
    process.wait.side_effect = [subprocess.TimeoutExpired("server", 5), 0]
    job = MagicMock()

    dev.stop_servers([process], job)
    process.send_signal.assert_called_once_with(signal.CTRL_BREAK_EVENT)
    job.close.assert_called_once()
    process.kill.assert_called_once()


def test_cleanup_reaches_posix_group_even_after_leader_exits(monkeypatch):
    fake_os = SimpleNamespace(name="posix", killpg=MagicMock())
    monkeypatch.setattr(dev, "os", fake_os)
    monkeypatch.setattr(dev.signal, "SIGKILL", 9, raising=False)
    process = MagicMock(pid=12345)
    process.poll.return_value = 1

    dev.stop_servers([process], None)
    assert fake_os.killpg.call_args_list == [
        call(12345, signal.SIGTERM),
        call(12345, signal.SIGKILL),
    ]


def test_real_descendant_cleanup_after_leader_exit(tmp_path):
    marker = tmp_path / "child-port"
    child_code = (
        "import socket, pathlib, sys, time; "
        "s = socket.socket(); s.bind(('127.0.0.1', 0)); s.listen(); "
        "pathlib.Path(sys.argv[1]).write_text(str(s.getsockname()[1])); "
        "time.sleep(30)"
    )
    parent_code = (
        "import pathlib, subprocess, sys, time\n"
        f"subprocess.Popen([sys.executable, '-c', {child_code!r}, sys.argv[1]])\n"
        "deadline = time.monotonic() + 5\n"
        "while not pathlib.Path(sys.argv[1]).exists():\n"
        "    if time.monotonic() > deadline: sys.exit(8)\n"
        "    time.sleep(0.01)\n"
        "sys.exit(7)\n"
    )
    step = dev.Step(
        "Test server", (sys.executable, "-c", parent_code, str(marker)), tmp_path
    )

    assert dev.run_servers([(step, os.environ.copy())]) == 7
    port = int(marker.read_text())
    deadline = time.monotonic() + 2
    while True:
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) != 0:
                break
        assert time.monotonic() < deadline, "Descendant server was left running"
        time.sleep(0.01)


@pytest.mark.parametrize("command", dev.COMMAND_TOOLS)
def test_cli_accepts_existing_commands_and_dev(command):
    assert dev.create_parser().parse_args([command]).command == command
