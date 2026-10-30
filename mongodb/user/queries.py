from datetime import datetime, timezone

from ..connection import users
from .encryption import custom_decrypt, custom_encrypt, format_key


def insert_user(user_id: str, password_hash: str) -> dict:
    """POST /register — backend hashes first, then this inserts. Unique userId is the index.

    The encryption key is ``createdAt`` at one-second resolution. That same instant
    is what ``find_user`` formats back into the key, so the stored clock value has
    to be truncated before insert. The returned document still holds the ciphertext.
    """
    created_at = datetime.now(timezone.utc).replace(microsecond=0)
    result = users().insert_one(
        {
            "userId": user_id,
            "passwordHash": custom_encrypt(password_hash, format_key(created_at)),
            "createdAt": created_at,
        }
    )
    return users().find_one({"_id": result.inserted_id})


def find_user(user_id: str) -> dict | None:
    """POST /login — pull the stored hash for the backend to compare."""
    identified_user = users().find_one({"userId": user_id})
    if identified_user is None:
        return None
    identified_user["passwordHash"] = custom_decrypt(identified_user["passwordHash"], format_key(identified_user["createdAt"]))
    return identified_user
