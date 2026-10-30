import os
from functools import lru_cache
from pathlib import Path

from pymongo import MongoClient
from pymongo.database import Database


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


def users():
    return get_db()["users"]


def projects():
    return get_db()["projects"]


def hardware():
    return get_db()["hardware"]


def checkouts():
    return get_db()["checkouts"]
