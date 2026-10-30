from ..connection import projects


def find_project(project_id: str) -> dict | None:
    """GET /get-project-info and join-project existence check."""
    return projects().find_one({"projectId": project_id})


def find_projects_for_user(user_id: str) -> list[dict]:
    """GET /get-user-projects — empty list if the user is on no projects."""
    return list(projects().find({"members": user_id}))
