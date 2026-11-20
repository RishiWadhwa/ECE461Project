import os
from typing import Callable, TypeVar
from functools import lru_cache
from pathlib import Path

import pymongo
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.client_session import ClientSession

T = TypeVar("T")

def secure_indexes() -> None:
    """Safe to execute on every start: mongodb ignores an index that already exists."""
    users().create_index("userId", unique=True)
    projects().create_index("projectId", unique=True)

def _load_dotenv() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


_load_dotenv()


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    uri = os.environ["MONGO_URI"]
    return MongoClient(uri)


def get_db() -> Database:
    return get_client()[os.environ.get("MONGO_DB", "haas")]

def ping() -> None:
    """GET /health. Raises ConnectionFailure if the database does not answer.
    The 2-second cap keeps a down database from holding the request for pymongo's default 30 seconds."""
    with pymongo.timeout(2):
        get_client().admin.command("ping")

def run_in_transaction(work: Callable[[ClientSession], T]) -> T:
    with get_client().start_session() as session:
        return session.with_transaction(work)

def users():
    return get_db()["users"]


def projects():
    return get_db()["projects"]


def hardware():
    return get_db()["hardware"]


def checkouts():
    return get_db()["checkouts"]
