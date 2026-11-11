from flask import Blueprint, jsonify, request
from .errors import ApiError
from mongodb.connection import get_db
from mongodb.hardware.stock import release, reserve

bp = Blueprint("hardware", __name__)


@bp.get("/get_all_hw_names")
def get_all_hw_names():
    collection = get_db()["hardware"]
    documents = collection.find({}, {"_id": 0, "name": 1})
    names = [document["name"] for document in documents]
    return jsonify({"names": names})


@bp.get("/get_hw_info")
def get_hw_info():
    name = request.args.get("name", "").strip()
    if not name:
        raise ApiError(400, "A name is required to get hardware info.")
    hw = get_db()["hardware"]
    document = hw.find_one({"name": name}, {"_id": 0, "name": 1, "capacity": 1, "available": 1})
    if document is None:
        raise ApiError(404, f"Hardware with name '{name}' not found")

    return jsonify(document)


@bp.post("/check_out")
def check_out():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(400, "Request body must be a JSON object")

    user_id = data.get("userID")
    project_id = data.get("projectID")
    hw_set = data.get("hwSet")
    quantity = data.get("quantity")

    if not isinstance(user_id, str) or not user_id.strip():
        raise ApiError(400, "userID is required")
    if not isinstance(project_id, str) or not project_id.strip():
        raise ApiError(400, "projectID is required")
    if not isinstance(hw_set, str) or not hw_set.strip():
        raise ApiError(400, "hwSet is required")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ApiError(400, "quantity must be a positive integer")

    user_id = user_id.strip()
    project_id = project_id.strip().upper()
    hw_set = hw_set.strip()

    db = get_db()

    project = db["projects"].find_one({"projectId": project_id})
    if project is None:
        raise ApiError(404, f"Project with ID '{project_id}' not found")

    if (user_id != project.get("ownerId")) and (user_id not in project.get("members", [])):
        raise ApiError(403, f"You are not a member of project {project_id}")

    hardware_doc = db["hardware"].find_one({"name": hw_set}, {"_id": 0, "hardwareId": 1, "name": 1})

    if hardware_doc is None:
        raise ApiError(404, "Hardware set not found")

    updated = reserve(hardware_doc["hardwareId"], quantity, project_id)
    if updated is None:
        raise ApiError(409, "Not enough hardware available")

    return jsonify(_hardware_response(updated))


@bp.post("/check_in")
def check_in():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(400, "Request body must be a JSON object")

    user_id = data.get("userID")
    project_id = data.get("projectID")
    hw_set = data.get("hwSet")
    quantity = data.get("quantity")

    if not isinstance(user_id, str) or not user_id.strip():
        raise ApiError(400, "userID is required")
    if not isinstance(project_id, str) or not project_id.strip():
        raise ApiError(400, "projectID is required")
    if not isinstance(hw_set, str) or not hw_set.strip():
        raise ApiError(400, "hwSet is required")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ApiError(400, "quantity must be a positive integer")

    user_id = user_id.strip()
    project_id = project_id.strip().upper()
    hw_set = hw_set.strip()

    db = get_db()

    project = db["projects"].find_one({"projectId": project_id})
    if project is None:
        raise ApiError(404, f"Project with ID '{project_id}' not found")

    if (
        user_id != project.get("ownerId")
        and user_id not in project.get("members", [])
    ):
        raise ApiError(403, f"You are not a member of project {project_id}")

    hardware_doc = db["hardware"].find_one(
        {"name": hw_set},
        {"_id": 0, "hardwareId": 1, "name": 1},
    )

    if hardware_doc is None:
        raise ApiError(404, "Hardware set not found")

    updated = release(hardware_doc["hardwareId"], quantity, project_id)
    if updated is None:
        raise ApiError(409, "This project does not have that many units checked out")

    return jsonify(_hardware_response(updated))


def _hardware_response(document: dict) -> dict:
    return {
        "name": document["name"],
        "capacity": document["capacity"],
        "available": document["available"],
    }