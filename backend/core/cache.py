"""In-process async cache layer.

Provides a lightweight TTL-based LRU cache for expensive queries
(analytics overview, candidate counts, etc.) so the dashboard stays
snappy when managing 1000s of candidates.

This uses an in-process dictionary cache. If Redis is available
(REDIS_URL in env), it will use Redis instead for shared caching
across multiple workers.

Usage:
    from backend.core.cache import cache_get, cache_set, cache_invalidate

    data = await cache_get("analytics:overview:user123")
    if data is None:
        data = await compute_expensive_analytics()
        await cache_set("analytics:overview:user123", data, ttl=60)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import OrderedDict
from typing import Any

logger = logging.getLogger(__name__)

# ── In-process LRU cache with TTL ─────────────────────────────────

_MAX_ENTRIES = 2048


class _TTLCache:
    """Thread-safe TTL-based LRU cache (in-process fallback)."""

    def __init__(self, max_size: int = _MAX_ENTRIES):
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._max_size = max_size
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._data[key]
                return None
            # Move to end (LRU)
            self._data.move_to_end(key)
            return value

    async def set(self, key: str, value: Any, ttl: int = 60) -> None:
        async with self._lock:
            expires_at = time.monotonic() + ttl
            self._data[key] = (expires_at, value)
            self._data.move_to_end(key)
            # Evict oldest if over limit
            while len(self._data) > self._max_size:
                self._data.popitem(last=False)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)

    async def delete_pattern(self, prefix: str) -> int:
        """Delete all keys that start with prefix."""
        async with self._lock:
            to_delete = [k for k in self._data if k.startswith(prefix)]
            for k in to_delete:
                del self._data[k]
            return len(to_delete)

    async def flush(self) -> None:
        async with self._lock:
            self._data.clear()


# ── Redis backend (optional) ──────────────────────────────────────

_redis_client = None
_redis_available = False


def _try_init_redis() -> bool:
    """Attempt to connect to Redis. Returns True if successful."""
    global _redis_client, _redis_available
    try:
        import os
        redis_url = os.environ.get("REDIS_URL", "")
        if not redis_url:
            return False

        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        _redis_available = True
        logger.info("Redis cache connected: %s", redis_url[:30] + "…")
        return True
    except Exception as e:
        logger.info("Redis not available, using in-process cache: %s", e)
        _redis_available = False
        return False


# Initialize on import
_try_init_redis()

# Fallback in-process cache (always available)
_local_cache = _TTLCache()


# ── Public API ────────────────────────────────────────────────────


async def cache_get(key: str) -> Any | None:
    """Get a cached value by key. Returns None on miss."""
    # Try Redis first
    if _redis_available and _redis_client:
        try:
            raw = await _redis_client.get(key)
            if raw is not None:
                return json.loads(raw)
            return None
        except Exception:
            pass  # Fallback to local

    return await _local_cache.get(key)


async def cache_set(key: str, value: Any, ttl: int = 60) -> None:
    """Set a cached value with TTL in seconds."""
    # Try Redis
    if _redis_available and _redis_client:
        try:
            await _redis_client.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception:
            pass

    await _local_cache.set(key, value, ttl=ttl)


async def cache_invalidate(prefix: str) -> None:
    """Invalidate all cache keys starting with prefix."""
    if _redis_available and _redis_client:
        try:
            cursor = 0
            while True:
                cursor, keys = await _redis_client.scan(cursor, match=f"{prefix}*", count=100)
                if keys:
                    await _redis_client.delete(*keys)
                if cursor == 0:
                    break
            return
        except Exception:
            pass

    await _local_cache.delete_pattern(prefix)


async def cache_flush() -> None:
    """Clear all cached data."""
    if _redis_available and _redis_client:
        try:
            await _redis_client.flushdb()
            return
        except Exception:
            pass
    await _local_cache.flush()
