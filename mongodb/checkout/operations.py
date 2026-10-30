from ..connection import get_client
from ..hardware.stock import release, reserve
from ..project.queries import find_project
from .ledger import complete_quantity, held_quantity, insert_active


def check_out(project_id: str, hardware_id: str, quantity: int, user_id: str | None = None) -> dict | None:
    """POST /check-out — decrement stock, insert an active checkout row."""
    project = find_project(project_id)
    if project is None:
        return None
    actor = user_id if user_id is not None else project["ownerId"]

    with get_client().start_session() as session:
        with session.start_transaction():
            hw = reserve(hardware_id, quantity, session=session)
            if hw is None:
                return None
            row = insert_active(actor, project_id, hardware_id, quantity, session=session)
            return {"hardware": hw, "checkout": row}


def check_in(project_id: str, hardware_id: str, quantity: int) -> dict | None:
    """POST /check-in — complete held rows, then return stock."""
    if held_quantity(project_id, hardware_id) < quantity:
        return None

    with get_client().start_session() as session:
        with session.start_transaction():
            completed = complete_quantity(project_id, hardware_id, quantity, session=session)
            if completed != quantity:
                return None
            hw = release(hardware_id, quantity, session=session)
            if hw is None:
                return None
            return {"hardware": hw, "completed": completed}
