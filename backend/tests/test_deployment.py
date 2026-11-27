import pytest
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.testclient import TestClient

from app.environment import integer_setting
from app.rate_limit import RateLimitMiddleware
from app.step_cache import StepCacheMiddleware


def test_health_reports_ok(configure_main) -> None:
    main = configure_main()

    with TestClient(main.app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "x-cache" not in response.headers


def test_middleware_runs_in_the_documented_order(configure_main) -> None:
    main = configure_main(RATE_LIMIT_REQUESTS="30")

    # Outermost first.
    assert [middleware.cls for middleware in main.app.user_middleware] == [
        GZipMiddleware,
        CORSMiddleware,
        RateLimitMiddleware,
        StepCacheMiddleware,
    ]


def test_only_step_endpoints_are_limited_and_cached(configure_main) -> None:
    main = configure_main()

    # STEP_PATHS is the value under test, not the expected constant.
    assert main.STEP_PATHS == {  # noqa: SIM300
        "/sorting/steps",
        "/searching/steps",
        "/graph/steps",
        "/dynamic-programming/steps",
        "/backtracking/steps",
        "/trees/steps",
        "/hash-tables/steps",
    }


def test_settings_take_their_defaults_when_unset_or_blank(monkeypatch) -> None:
    monkeypatch.delenv("STEP_CACHE_MAX_MB", raising=False)
    assert integer_setting("STEP_CACHE_MAX_MB", 64) == 64
    monkeypatch.setenv("STEP_CACHE_MAX_MB", "  ")
    assert integer_setting("STEP_CACHE_MAX_MB", 64) == 64
    monkeypatch.setenv("STEP_CACHE_MAX_MB", " 8 ")
    assert integer_setting("STEP_CACHE_MAX_MB", 64) == 8


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("RATE_LIMIT_REQUESTS", "ten"),
        ("RATE_LIMIT_REQUESTS", "-1"),
        ("RATE_LIMIT_REQUESTS", "2.5"),
        ("RATE_LIMIT_WINDOW_SECONDS", "0"),
        ("RATE_LIMIT_TRUSTED_PROXIES", "-1"),
        ("STEP_CACHE_MAX_MB", "lots"),
    ],
)
def test_an_invalid_setting_stops_the_application(configure_main, name, value) -> None:
    settings = {"RATE_LIMIT_REQUESTS": "30", name: value}

    with pytest.raises(ValueError, match=name):
        configure_main(**settings)
