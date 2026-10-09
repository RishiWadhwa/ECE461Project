import os
from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database


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
