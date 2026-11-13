"""The error format the frontend relies on: api.ts reads body.error from every failed response, and treats
502/503/504 as "server offline". These tests check the backend keeps to that for every kind of failure."""
import pytest
from pymongo.errors import ServerSelectionTimeoutError

from backend import hw_routes
from backend.app import MAX_BODY_BYTES
from mongodb import connection


def assert_json_error(r, status):
    assert r.status_code == status
    assert r.is_json, f"expected a JSON error body, got {r.content_type}"
    assert isinstance(r.get_json().get("error"), str) and r.get_json()["error"]

def test_unknown_route_is_json_404(client):
    assert_json_error(client.get("/no_such_route"), 404)

def test_wrong_method_is_json_405(client):
    assert_json_error(client.get("/login"), 405)

def test_oversized_body_is_json_413(client):
    r = client.post("/add_user", data="x" * (MAX_BODY_BYTES + 1), content_type="application/json")
    assert_json_error(r, 413)

def test_non_json_body_is_json_400(client):
    r = client.post("/login", data="userID=alice", content_type="application/x-www-form-urlencoded")
    assert_json_error(r, 400)

@pytest.mark.parametrize("method, path, body", [
    ("post", "/login", {"userID": "alice", "password": "password123"}),
    ("post", "/add_user", {"userID": "alice", "password": "password123"}),
    ("get", "/get_all_hw_names", None),
    ("get", "/get_user_projects_list?userID=alice", None),
])
def test_unreachable_database_is_503(client, monkeypatch, method, path, body):
    """503 is what turns the frontend's status light red and starts its retry loop."""
    def down():
        raise ServerSelectionTimeoutError("no servers available")
    monkeypatch.setattr(connection, "get_client", down)
    r = getattr(client, method)(path, json=body)
    assert_json_error(r, 503)

def test_unexpected_crash_is_500_without_details(client, monkeypatch):
    def broken():
        raise RuntimeError("secret internal detail")
    monkeypatch.setattr(hw_routes, "get_db", broken)
    r = client.get("/get_all_hw_names")
    assert_json_error(r, 500)
    assert "secret internal detail" not in r.get_data(as_text=True)

def test_crash_does_not_echo_the_password(client, monkeypatch):
    """Auth requests carry plaintext passwords, so an error must never repeat the request back."""
    def broken():
        raise RuntimeError("boom")
    from backend import auth_routes
    monkeypatch.setattr(auth_routes, "get_db", broken)
    r = client.post("/add_user", json={"userID": "alice", "password": "hunter2hunter2"})
    assert r.status_code == 500
    assert "hunter2hunter2" not in r.get_data(as_text=True)
