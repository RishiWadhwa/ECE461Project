from ..connection import hardware


def find_all_hardware() -> list[dict]:
    """GET /get-hw-info — every set with capacity and available."""
    return list(hardware().find())


def find_hardware(hardware_id: str) -> dict | None:
    return hardware().find_one({"hardwareId": hardware_id})
