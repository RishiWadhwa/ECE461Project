"""Tests that need a real MongoDB server: many requests at the same instant, and transactions.
mongomock can do neither reliably, so these are skipped unless TEST_MONGO_URI is set (see conftest.py).
Transactions also need the server to be a replica set; Atlas clusters are."""
import os
from concurrent.futures import ThreadPoolExecutor

import pytest

from mongodb.checkout import operations

pytestmark = pytest.mark.skipif(os.environ.get("TEST_MONGO_URI") is None,
                                reason="needs a real MongoDB: set TEST_MONGO_URI")

THREADS = 20

@pytest.fixture
def hw(db):
    db["hardware"].insert_one({"hardwareId": "HWSET001", "name": "HWSet1", "capacity": 10, "available": 10,
                               "checkedOut": 0, "status": "available"})
    return db

def create_project(client, owner, project):
    r = client.post("/create_project", json={"userID": owner, "projectID": project, "name": "T", "description": ""})
    assert r.status_code == 200

def run_at_once(client, requests):
    """Sends every request from its own thread and test client, so they reach the server together."""
    app = client.application
    def send(req):
        method, path, body = req
        return getattr(app.test_client(), method)(path, json=body).status_code
    with ThreadPoolExecutor(max_workers=THREADS) as pool:
        return list(pool.map(send, requests))


# ---- concurrency through the routes ----

def test_simultaneous_check_outs_never_oversell(client, hw):
    create_project(client, "alice", "PROJ1234")
    body = {"userID": "alice", "projectID": "PROJ1234", "hwSet": "HWSet1", "quantity": 1}
    statuses = run_at_once(client, [("post", "/check_out", body)] * THREADS)
    assert statuses.count(200) == 10
    assert statuses.count(409) == THREADS - 10
    doc = hw["hardware"].find_one({"name": "HWSet1"})
    assert (doc["available"], doc["checkedOut"]) == (0, 10)
    assert hw["projects"].find_one({"projectId": "PROJ1234"})["checkedOut"]["HWSET001"] == 10

def test_simultaneous_check_ins_never_return_more_than_held(client, hw):
    create_project(client, "alice", "PROJ1234")
    body = {"userID": "alice", "projectID": "PROJ1234", "hwSet": "HWSet1", "quantity": 1}
    assert client.post("/check_out", json={**body, "quantity": 5}).status_code == 200
    statuses = run_at_once(client, [("post", "/check_in", body)] * THREADS)
    assert statuses.count(200) == 5
    doc = hw["hardware"].find_one({"name": "HWSet1"})
    assert (doc["available"], doc["checkedOut"]) == (10, 0)

def test_simultaneous_registrations_of_one_id_create_one_user(client, db):
    body = {"userID": "alice", "password": "password123"}
    statuses = run_at_once(client, [("post", "/add_user", body)] * THREADS)
    assert statuses.count(201) == 1
    assert statuses.count(409) == THREADS - 1
    assert db["users"].count_documents({"userId": "alice"}) == 1

def test_simultaneous_project_creation_creates_one_project(client, hw):
    statuses = run_at_once(client, [("post", "/create_project",
                                     {"userID": f"user{i:04d}", "projectID": "PROJ1234", "name": "T", "description": ""})
                                    for i in range(THREADS)])
    assert statuses.count(200) == 1
    assert hw["projects"].count_documents({"projectId": "PROJ1234"}) == 1

def test_simultaneous_joins_are_all_recorded(client, hw):
    create_project(client, "alice", "PROJ1234")
    statuses = run_at_once(client, [("post", "/join_project", {"userID": f"user{i:04d}", "projectID": "PROJ1234"})
                                    for i in range(THREADS)])
    assert statuses.count(200) == THREADS
    assert len(hw["projects"].find_one({"projectId": "PROJ1234"})["members"]) == THREADS + 1


# ---- the transactional path (mongodb/checkout/operations.py) ----

def test_transactional_check_out_writes_set_project_and_ledger(client, hw):
    create_project(client, "alice", "PROJ1234")
    result = operations.check_out("PROJ1234", "HWSET001", 4, user_id="alice")
    assert result["hardware"]["available"] == 6
    assert result["checkout"]["quantity"] == 4
    assert hw["projects"].find_one({"projectId": "PROJ1234"})["checkedOut"]["HWSET001"] == 4

def test_failed_transactional_check_out_changes_nothing(client, hw):
    create_project(client, "alice", "PROJ1234")
    assert operations.check_out("PROJ1234", "HWSET001", 11, user_id="alice") is None
    assert hw["hardware"].find_one({"name": "HWSet1"})["available"] == 10
    assert hw["checkouts"].count_documents({}) == 0

def test_transactional_check_in_returns_units_and_closes_rows(client, hw):
    create_project(client, "alice", "PROJ1234")
    operations.check_out("PROJ1234", "HWSET001", 4, user_id="alice")
    result = operations.check_in("PROJ1234", "HWSET001", 4)
    assert result["hardware"]["available"] == 10
    assert result["completed"] == 4
    assert hw["checkouts"].count_documents({"status": "active"}) == 0

def test_transactional_check_in_of_more_than_held_is_refused(client, hw):
    create_project(client, "alice", "PROJ1234")
    operations.check_out("PROJ1234", "HWSET001", 2, user_id="alice")
    assert operations.check_in("PROJ1234", "HWSET001", 3) is None
    assert hw["hardware"].find_one({"name": "HWSet1"})["available"] == 8
