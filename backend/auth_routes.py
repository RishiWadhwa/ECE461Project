from flask import Blueprint

from .errors import ApiError

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    raise ApiError(501, "Not implemented yet")


@bp.post("/add_user")
def add_user():
    raise ApiError(501, "Not implemented yet")
