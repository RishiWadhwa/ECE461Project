from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from flask import Blueprint, jsonify, request
from mongodb.connection import get_db
from pymongo.errors import DuplicateKeyError

from .errors import ApiError

bp = Blueprint("auth", __name__)
password_hasher = PasswordHasher()


@bp.post("/login")
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(400, "Request body must be JSON")

    user_id = data.get("userID")
    password = data.get("password")

    # check the id and pass are present
    if not isinstance(user_id, str) or not user_id.strip():
        raise ApiError(400, "A user ID is required.")
    if not isinstance(password, str) or not password:
        raise ApiError(400, "A password is required.")

    user_id = user_id.strip()
    user = get_db()["users"].find_one({"userId": user_id})

    if user is None:
        raise ApiError(401, "Invalid user ID or password.")

    # python's version of a try-catch
    try:
        password_hasher.verify(user["passwordHash"], password)
    except VerifyMismatchError:
        raise ApiError(401, "Invalid user ID or password.") 

    return jsonify({"userID": user_id})

@bp.post("/add_user")
def add_user():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        raise ApiError(400, "Request body must be JSON")

    user_id = data.get("userID")
    password = data.get("password")

    if not isinstance(user_id, str) or not user_id.strip():
        raise ApiError(400, "A user ID is required.")
    if not isinstance(password, str) or not password:
        raise ApiError(400, "A password is required.")

    user_id = user_id.strip()
    if len(user_id) < 3:
        raise ApiError(400, "user ID must be at least 3 characters.")
    if len(password) < 8:
        raise (ApiError(400, "Passwords must be at least 8 characters."))

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