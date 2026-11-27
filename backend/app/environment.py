"""Read deployment settings from environment variables."""

import os


def integer_setting(name: str, default: int, minimum: int = 0) -> int:
    """Return an integer environment variable, or `default` when it is unset.

    A blank value counts as unset. An invalid value stops the application at
    startup, so a mistyped limit never turns a protection off silently.
    """

    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    error = f"{name} must be an integer of at least {minimum}, not {raw!r}."
    try:
        value = int(raw)
    except ValueError:
        raise ValueError(error) from None
    if value < minimum:
        raise ValueError(error)
    return value
