from datetime import datetime, timezone

from argon2 import PasswordHasher
from flask import Blueprint, jsonify, request
from mongodb.connection import get_db
from pymongo.errors import DuplicateKeyError

from .errors import ApiError

bp = Blueprint("auth", __name__)
password_hasher = PasswordHasher()


@bp.post("/login")
def login():
    raise ApiError(501, "Not implemented yet")


@bp.post("/add_user")
def add_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(400, "Request body must be JSON")

    user_id = data.get("userID")
    password = data.get("password")

    if not isinstance(user_id, str) or not user_id.strip():
        raise ApiError(400, "userID is required")
    if not isinstance(password, str) or not password:
        raise ApiError(400, "password is required")

    user_id = user_id.strip()
    users = get_db()["users"]

    if users.find_one({"userId": user_id}):
        raise ApiError(409, "That user ID already exists")

    password_hash = password_hasher.hash(password)

    try:
        users.insert_one({
            "userId": user_id,
            "passwordHash": password_hash,
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        raise ApiError(409, "That user ID already exists")

    return jsonify({"userID": user_id}), 201