from collections.abc import Iterator
from threading import Lock

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import get_settings

_pool: ConnectionPool | None = None
_lock = Lock()


def _get_pool() -> ConnectionPool:
    """Opens the pool on first use, so the app starts even without a database."""
    global _pool
    with _lock:
        if _pool is None:
            if not get_settings().database_url:
                raise RuntimeError("DATABASE_URL is not set (see backend/.env.example)")
            pool = ConnectionPool(
                get_settings().database_url,
                min_size=1,
                max_size=5,
                # Rows come back as dicts. prepare_threshold=None keeps it working
                # behind the Supabase pooler.
                kwargs={"row_factory": dict_row, "prepare_threshold": None},
                open=False,
            )
            try:
                pool.open(wait=True, timeout=20)
            except Exception:
                pool.close()
                raise
            _pool = pool
        return _pool


def close_pool() -> None:
    global _pool
    with _lock:
        if _pool is not None:
            _pool.close()
            _pool = None


def get_conn() -> Iterator[Connection]:
    """FastAPI dependency: one connection per request. It commits when the request
    succeeds and rolls back when it fails."""
    with _get_pool().connection() as conn:
        yield conn