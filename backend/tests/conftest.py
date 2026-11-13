import os

import mongomock
import pytest

# Set TEST_MONGO_URI to run against a real MongoDB; without it the tests use an in-memory mongomock client.
# mongomock has no transactions, so check_out/check_in tests will need a real server.
TEST_MONGO_URI = os.environ.get("TEST_MONGO_URI")
os.environ["MONGO_URI"] = TEST_MONGO_URI or "mongodb://unused"
os.environ["MONGO_DB"] = "haas_test"

from backend.app import create_app
from mongodb import connection
from mongodb.connection import get_db

@pytest.fixture
def db(monkeypatch):
    if TEST_MONGO_URI is None:
        fake_client = mongomock.MongoClient()
        monkeypatch.setattr(connection, "get_client", lambda: fake_client)
    database = get_db()
    assert database.name == "haas_test"
    for name in database.list_collection_names():
        database.drop_collection(name)
    database["users"].create_index("userId", unique=True)
    database["projects"].create_index("projectId", unique=True)
    return database

@pytest.fixture
def client(db):
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()

@pytest.fixture
def hardware(db):
    for hw_id, name in [("HW1", "HWSet1"), ("HW2", "HWSet2")]:
        db["hardware"].insert_one({
            "hardwareId": hw_id,
            "name": name,
            "capacity": 100,
            "available": 100,
            "checkedOut": 0,
            "status": "available",
        })

class Api:
    """Thin wrapper over the Flask test client: one method per route the TA's test plan uses.
    Defaults are a valid user ("alice") and project ("PROJ1234"), so tests only spell out what differs."""

    def __init__(self, client):
        self.client = client

    def sign_up(self, user="alice", pw="correcthorse"):
        return self.client.post("/add_user", json={"userID": user, "password": pw})

    def login(self, user="alice", pw="correcthorse"):
        return self.client.post("/login", json={"userID": user, "password": pw})

    def create_project(self, user="alice", project="PROJ1234", name="Test", description=""):
        return self.client.post("/create_project", json={
            "userID": user, "projectID": project, "name": name, "description": description,
        })

    def join_project(self, user, project="PROJ1234"):
        return self.client.post("/join_project", json={"userID": user, "projectID": project})

    def projects_of(self, user="alice"):
        r = self.client.get("/get_user_projects_list", query_string={"userID": user})
        return [p["projectID"] for p in r.get_json()["projects"]]

    def check_out(self, hw, qty, user="alice", project="PROJ1234"):
        return self.client.post("/check_out", json={
            "userID": user, "projectID": project, "hwSet": hw, "quantity": qty,
        })

    def check_in(self, hw, qty, user="alice", project="PROJ1234"):
        return self.client.post("/check_in", json={
            "userID": user, "projectID": project, "hwSet": hw, "quantity": qty,
        })

    def available(self, hw):
        return self.client.get("/get_hw_info", query_string={"name": hw}).get_json()["available"]


@pytest.fixture
def api(client):
    return Api(client)
