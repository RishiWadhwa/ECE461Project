from flask import Blueprint

from .errors import ApiError

bp = Blueprint("hardware", __name__)


@bp.get("/get_all_hw_names")
def get_all_hw_names():
    raise ApiError(501, "Not implemented yet")


@bp.get("/get_hw_info")
def get_hw_info():
    raise ApiError(501, "Not implemented yet")


@bp.post("/check_out")
def check_out():
    raise ApiError(501, "Not implemented yet")


@bp.post("/check_in")
def check_in():
    raise ApiError(501, "Not implemented yet")
