from flask import Blueprint

from .errors import ApiError

bp = Blueprint("projects", __name__)


@bp.get("/get_user_projects_list")
def get_user_projects_list():
    raise ApiError(501, "Not implemented yet")


@bp.get("/get_project_info")
def get_project_info():
    raise ApiError(501, "Not implemented yet")


@bp.post("/create_project")
def create_project():
    raise ApiError(501, "Not implemented yet")


@bp.post("/join_project")
def join_project():
    raise ApiError(501, "Not implemented yet")
