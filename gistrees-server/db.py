# /opt/gistrees-server/db.py
import os
import psycopg2
from contextlib import contextmanager
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://gistrees:art@127.0.0.1:5432/gistrees"
)

@contextmanager
def db_cursor():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
            conn.commit()
    finally:
        conn.close()
