import importlib

import pytest
from starlette.testclient import TestClient

import app.main as main


@pytest.mark.parametrize(
    "origins,development,origin,allowed",
    [
        (None, False, "http://localhost:3000", True),
        (None, False, "http://localhost:3001", False),
        (
            "http://localhost:3003,http://127.0.0.1:3003",
            False,
            "http://localhost:3003",
            True,
        ),
        (
            "http://localhost:3003,http://127.0.0.1:3003",
            False,
            "http://127.0.0.1:3003",
            True,
        ),
        ("http://localhost:3003", False, "http://localhost:3000", False),
        ("http://localhost:3003", False, "http://localhost:3004", False),
        (None, True, "http://localhost:3009", True),
        (None, True, "http://127.0.0.1:3009", True),
        (None, True, "https://localhost:3009", False),
        (None, True, "http://localhost.evil.example:3009", False),
        (None, True, "http://192.168.1.10:3009", False),
        (None, True, "http://evil.example:3009", False),
        ("https://visualizer.example", False, "https://visualizer.example", True),
    ],
)
def test_cors_origins_are_scoped(monkeypatch, origins, development, origin, allowed):
    try:
        with monkeypatch.context() as environment:
            environment.delenv("CORS_ORIGINS", raising=False)
            environment.delenv("ALGORITHM_VISUALIZER_DEV_CORS", raising=False)
            if origins is not None:
                environment.setenv("CORS_ORIGINS", origins)
            if development:
                environment.setenv("ALGORITHM_VISUALIZER_DEV_CORS", "1")
            application = importlib.reload(main).app
            with TestClient(application) as client:
                response = client.options(
                    "/algorithms",
                    headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
                )
            assert response.status_code == (200 if allowed else 400)
            assert response.headers.get("access-control-allow-origin") == (
                origin if allowed else None
            )
    finally:
        importlib.reload(main)
