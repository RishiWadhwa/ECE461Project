import re

from flask import Blueprint, jsonify, request
from pymongo.errors import DuplicateKeyError

from mongodb.project.queries import find_project, find_projects_for_user
from mongodb.project.writes import add_member, insert_project

from .errors import ApiError

bp = Blueprint("projects", __name__)


def _body() -> dict:
    body = request.get_json(silent=True)
    
    if not isinstance(body, dict):
        raise ApiError(400, "Request body must be a JSON object")
    
    return body


def _string(data, field: str, *, allow_empty: bool = False) -> str:
    value = data.get(field)
    if not isinstance(value, str):
        raise ApiError(400, f"{field} must be a string")
    
    value = value.strip()

    if not allow_empty and not value:
        raise ApiError(400, f"{field} is required")
    
    return value


def _user_id(data) -> str:
    user_id = _string(data, "userID")

    if len(user_id) < 3 or re.fullmatch(r"[a-zA-Z0-9]+", user_id) is None:
        raise ApiError(400, "UserID must contain at least 3 letters or digits")
    
    return user_id


def _project_id(data) -> str:
    project_id = _string(data, "projectID")

    if len(project_id) < 8:
        raise ApiError(400, "Project ID must be at least 8 characters")
    
    if re.fullmatch(r"[a-zA-Z0-9]+", project_id) is None:
        raise ApiError(400, "Project ID can only contain letters and digits")
    
    return project_id


def _project_response(project: dict, *, include_members: bool = False) -> dict:
    result = {
        "projectID": project["projectId"],
        "name": project["name"],
        "description": project["description"],
    }
    if include_members:
        result["members"] = project["members"]

    return result


@bp.get("/get_user_projects_list")
def get_user_projects_list():
    user_id = _user_id(request.args)
    projects = find_projects_for_user(user_id)

    return jsonify({"projects": [_project_response(project) for project in projects]})


@bp.get("/get_project_info")
def get_project_info():
    project_id = _project_id(request.args)
    project = find_project(project_id)

    if project is None:
        raise ApiError(404, "Project not found")
    
    return jsonify(_project_response(project, include_members=True))


@bp.post("/create_project")
def create_project():
    body = _body()
    user_id = _user_id(body)
    project_id = _project_id(body)
    name = _string(body, "name")
    description = _string(body, "description", allow_empty=True)

    if find_project(project_id) is not None:
        raise ApiError(409, f'Project ID "{project_id}" is already taken')
    
    try:
        project = insert_project(user_id, project_id, description, name)
    except DuplicateKeyError:
        raise ApiError(409, f'Project ID "{project_id}" is already taken') from None
    
    return jsonify(_project_response(project))


@bp.post("/join_project")
def join_project():
    body = _body()
    user_id = _user_id(body)
    project_id = _project_id(body)
    project = find_project(project_id)

    if project is None:
        raise ApiError(404, f'No project with ID "{project_id}"')
    
    if user_id in project["members"]:
        raise ApiError(409, "You are already part of this project")

    project = add_member(project_id, user_id)
    if project is None:
        raise ApiError(404, f'No project with ID "{project_id}"')
    
    return jsonify(_project_response(project))
