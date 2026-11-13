from pymongo import ReturnDocument

from ..connection import hardware, projects

# projects.checkedOut values are capped at 100 by the collection validator.
_MAX_PER_SET = 100


def reserve(hardware_id: str, quantity: int, project_id: str, session=None) -> dict | None:
    """POST /check-out stock step. None if the set or project cannot take the units."""
    hw = hardware().find_one_and_update(
        {
            "hardwareId": hardware_id,
            "status": "available",
            "available": {"$gte": quantity},
        },
        {"$inc": {"available": -quantity, "checkedOut": quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    if hw is None:
        return None
    if _add_project_units(project_id, hardware_id, quantity, session) is None:
        _undo_hardware(hardware_id, quantity, session)
        return None
    return hw


def release(hardware_id: str, quantity: int, project_id: str, session=None) -> dict | None:
    """POST /check-in stock step. None if the set or project does not hold enough."""
    hw = hardware().find_one_and_update(
        {
            "hardwareId": hardware_id,
            "checkedOut": {"$gte": quantity},
        },
        {"$inc": {"available": quantity, "checkedOut": -quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )
    if hw is None:
        return None
    if _remove_project_units(project_id, hardware_id, quantity, session) is None:
        _undo_hardware(hardware_id, -quantity, session)
        return None
    return hw


def _add_project_units(project_id: str, hardware_id: str, quantity: int, session):
    field = f"checkedOut.{hardware_id}"
    # Missing key counts as 0, which insert_project writes for every set that exists then.
    fits = [{field: {"$lte": _MAX_PER_SET - quantity}}]
    if quantity <= _MAX_PER_SET:
        fits.append({field: {"$exists": False}})
    return projects().find_one_and_update(
        {"projectId": project_id, "$or": fits},
        {"$inc": {field: quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )


def _remove_project_units(project_id: str, hardware_id: str, quantity: int, session):
    field = f"checkedOut.{hardware_id}"
    return projects().find_one_and_update(
        {"projectId": project_id, field: {"$gte": quantity}},
        {"$inc": {field: -quantity}},
        return_document=ReturnDocument.AFTER,
        session=session,
    )


def _undo_hardware(hardware_id: str, available_delta: int, session) -> None:
    """Drop the hardware write if the project update did not happen."""
    if session is not None and session.in_transaction:
        session.abort_transaction()
        return
    hardware().update_one(
        {"hardwareId": hardware_id},
        {"$inc": {"available": available_delta, "checkedOut": -available_delta}},
        session=session,
    )
