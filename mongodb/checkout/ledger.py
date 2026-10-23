from datetime import datetime, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..connection import checkouts


def find_active_for_project(project_id: str, session=None) -> list[dict]:
    return list(checkouts().find({"projectId": project_id, "status": "active"}, session=session))


def held_quantity(project_id: str, hardware_id: str, session=None) -> int:
    total = 0
    for doc in checkouts().find(
        {"projectId": project_id, "hardwareId": hardware_id, "status": "active"},
        session=session,
    ):
        total += doc["quantity"]
    return total


def _next_checkout_id(session=None) -> str:
    last = checkouts().find_one(
        {"checkoutId": {"$regex": r"^CHK[0-9]+$"}},
        sort=[("checkoutId", -1)],
        session=session,
    )
    n = int(last["checkoutId"][3:]) + 1 if last else 1
    return f"CHK{n:03d}"


def insert_active(
    user_id: str, project_id: str, hardware_id: str, quantity: int, session=None
) -> dict:
    while True:
        checkout_id = _next_checkout_id(session=session)
        try:
            result = checkouts().insert_one(
                {
                    "checkoutId": checkout_id,
                    "userId": user_id,
                    "projectId": project_id,
                    "hardwareId": hardware_id,
                    "quantity": quantity,
                    "checkedOutAt": datetime.now(timezone.utc),
                    "checkedInAt": None,
                    "status": "active",
                },
                session=session,
            )
        except DuplicateKeyError:
            continue
        return checkouts().find_one({"_id": result.inserted_id}, session=session)


def complete_quantity(project_id: str, hardware_id: str, quantity: int, session=None) -> int:
    """Mark active rows completed FIFO until `quantity` is checked in. Returns units completed."""
    remaining = quantity
    cursor = checkouts().find(
        {"projectId": project_id, "hardwareId": hardware_id, "status": "active"},
        session=session,
    ).sort("checkedOutAt", 1)

    for doc in cursor:
        if remaining <= 0:
            break
        held = doc["quantity"]
        now = datetime.now(timezone.utc)
        if held <= remaining:
            checkouts().update_one(
                {"_id": doc["_id"], "status": "active"},
                {"$set": {"status": "completed", "checkedInAt": now}},
                session=session,
            )
            remaining -= held
        else:
            checkouts().find_one_and_update(
                {"_id": doc["_id"], "status": "active", "quantity": {"$gt": remaining}},
                {"$inc": {"quantity": -remaining}},
                return_document=ReturnDocument.AFTER,
                session=session,
            )
            remaining = 0

    return quantity - remaining
