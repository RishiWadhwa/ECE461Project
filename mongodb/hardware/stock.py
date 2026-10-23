from pymongo import ReturnDocument

from ..connection import hardware


def reserve(hardware_id: str, quantity: int, session=None) -> dict | None:
    """POST /check-out stock step. None if missing or not enough available."""
    return hardware().find_one_and_update(
        {
            "hardwareId": hardware_id,
            "status": "available",
            "available": {"$gte": quantity},
        },
        {"$inc": {"available": -quantity, "checkedOut": quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )


def release(hardware_id: str, quantity: int, session=None) -> dict | None:
    """POST /check-in stock step. None if the set is missing or held qty is too small."""
    return hardware().find_one_and_update(
        {
            "hardwareId": hardware_id,
            "checkedOut": {"$gte": quantity},
        },
        {"$inc": {"available": quantity, "checkedOut": -quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )
