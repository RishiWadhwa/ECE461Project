from datetime import datetime, timezone

from pymongo import ReturnDocument

from ..connection import hardware, projects


def _checked_out_zeros() -> dict[str, int]:
    """One 0 per hardware set, so a new project holds nothing."""
    checked_out: dict[str, int] = {}
    for doc in hardware().find({}, {"hardwareId": 1, "_id": 0}):
        hardware_id = doc.get("hardwareId")
        if isinstance(hardware_id, str):
            checked_out[hardware_id] = 0
    return checked_out


def insert_project(user_id: str, project_id: str, description: str, name: str | None = None) -> dict:
    """POST /create-project — unique projectId is the index. Owner is also the first member."""
    result = projects().insert_one(
        {
            "projectId": project_id,
            "name": name if name else project_id,
            "description": description,
            "ownerId": user_id,
            "members": [user_id],
            "checkedOut": _checked_out_zeros(),
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
