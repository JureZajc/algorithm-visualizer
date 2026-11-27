import importlib
import sys
from collections.abc import Callable, Iterator
from types import ModuleType

import pytest

from app import main


DEPLOYMENT_VARIABLES = (
    "RATE_LIMIT_REQUESTS",
    "RATE_LIMIT_WINDOW_SECONDS",
    "RATE_LIMIT_TRUSTED_PROXIES",
    "STEP_CACHE_MAX_MB",
)


@pytest.fixture
def configure_main(
    monkeypatch: pytest.MonkeyPatch,
) -> Iterator[Callable[..., ModuleType]]:
    """Return a function that rebuilds app.main under the given settings.

    Unset deployment settings take their defaults. The module is rebuilt with
    the original environment afterwards, so other tests see the default app.
    """

    def configure(**environment: str) -> ModuleType:
        for name in DEPLOYMENT_VARIABLES:
            monkeypatch.delenv(name, raising=False)
        for name, value in environment.items():
            monkeypatch.setenv(name, value)
        return importlib.reload(main)

    yield configure
    monkeypatch.undo()
    importlib.reload(main)


@pytest.fixture
def frequent_thread_switches() -> Iterator[None]:
    """Switch threads as often as possible, so that races show up in tests."""

    interval = sys.getswitchinterval()
    sys.setswitchinterval(1e-6)
    yield
    sys.setswitchinterval(interval)
