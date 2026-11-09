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