# syntax=docker/dockerfile:1

# Build the virtual environment from uv.lock, then copy it into a clean image
# that has no uv and runs as an unprivileged user.
#
#   docker build -t algorithm-visualizer-api backend
#   docker run --rm -p 8000:8000 algorithm-visualizer-api
#
# See docs/deployment.md for the environment variables.

FROM python:3.12-slim-trixie AS build

COPY --from=ghcr.io/astral-sh/uv:0.13.10 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app
COPY pyproject.toml uv.lock ./
# --locked fails the build when uv.lock does not match pyproject.toml.
RUN uv sync --locked --no-dev --no-install-project
COPY app ./app
RUN python -m compileall -q app


FROM python:3.12-slim-trixie

RUN groupadd --system app \
    && useradd --system --gid app --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app
# Files stay owned by root, so the service cannot change its own code.
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/app ./app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

USER app
EXPOSE 8000

# Hosting platforms set PORT. exec makes Uvicorn PID 1, so it receives SIGTERM
# and shuts down gracefully. One process per container: the rate limiter and
# the cache live in the process.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\""]
