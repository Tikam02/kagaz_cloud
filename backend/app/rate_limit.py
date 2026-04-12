"""
In-memory rate limiter using a sliding-window counter.

Designed for lightweight use (share-link password attempts).
For production at scale, swap with Redis-backed limiter.
"""

import time
import threading
from functools import wraps
from flask import request, jsonify

_lock = threading.Lock()
_buckets: dict[str, list[float]] = {}


def _cleanup(key: str, window: float) -> None:
    """Remove timestamps older than *window* seconds."""
    cutoff = time.monotonic() - window
    _buckets[key] = [t for t in _buckets.get(key, []) if t > cutoff]


def is_rate_limited(key: str, max_attempts: int = 5, window: float = 300.0) -> bool:
    """Return True if *key* has exceeded *max_attempts* in the last *window* seconds."""
    now = time.monotonic()
    with _lock:
        _cleanup(key, window)
        hits = _buckets.setdefault(key, [])
        if len(hits) >= max_attempts:
            return True
        hits.append(now)
        return False


def rate_limit(max_attempts: int = 5, window: float = 300.0, key_func=None):
    """
    Decorator that returns 429 when a client exceeds the rate limit.

    *key_func*  – callable(flask.Request) -> str  (default: client IP)
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            k = key_func(request) if key_func else request.remote_addr or "unknown"
            if is_rate_limited(k, max_attempts, window):
                return jsonify({"error": "Too many attempts. Please try again later."}), 429
            return fn(*args, **kwargs)
        return wrapper
    return decorator
