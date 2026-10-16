from datetime import datetime, timezone

from pymongo import ReturnDocument

from ..connection import projects


def insert_project(user_id: str, project_id: str, description: str, name: str | None = None) -> dict:
    """POST /create-project — unique projectId is the index. Owner is also the first member."""
    result = projects().insert_one(
        {
            "projectId": project_id,
            "name": name if name else project_id,
            "description": description,
            "ownerId": user_id,
            "members": [user_id],
            "createdAt": datetime.now(timezone.utc),
        }
    )
    return projects().find_one({"_id": result.inserted_id})


def add_member(project_id: str, user_id: str) -> dict | None:
    """POST /join-project — $addToSet so a duplicate member is a no-op."""
    return projects().find_one_and_update(
        {"projectId": project_id},
        {"$addToSet": {"members": user_id}},
        return_document=ReturnDocument.AFTER,
    )
