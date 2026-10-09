from datetime import datetime, timezone

from ..connection import users


def insert_user(user_id: str, password_hash: str) -> dict:
    """POST /register — backend hashes first, then this inserts. Unique userId is the index."""
    result = users().insert_one(
        {
            "userId": user_id,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc),
        }
    )
    return users().find_one({"_id": result.inserted_id})


def find_user(user_id: str) -> dict | None:
    """POST /login — pull the stored hash for the backend to compare."""
    return users().find_one({"userId": user_id})
