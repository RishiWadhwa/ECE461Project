import pytest

# Same shape as the hardware documents in the Atlas "haas" database.
HW_SETS = [
    {"hardwareId": "HWSET001", "name": "HWSet1", "capacity": 100, "available": 100, "checkedOut": 0, "status": "available"},
    {"hardwareId": "HWSET002", "name": "HWSet2", "capacity": 100, "available": 100, "checkedOut": 0, "status": "available"},
]

@pytest.fixture
def hw(db):
    db["hardware"].insert_many([dict(doc) for doc in HW_SETS])
    return db

def create_project(client, owner="alice", project="PROJ1234"):
    r = client.post("/create_project", json={"userID": owner, "projectID": project, "name": "Test", "description": ""})
    assert r.status_code == 200
    return project

def check_out(client, qty, user="alice", project="PROJ1234", hw_set="HWSet1"):
    return client.post("/check_out", json={"userID": user, "projectID": project, "hwSet": hw_set, "quantity": qty})

def check_in(client, qty, user="alice", project="PROJ1234", hw_set="HWSet1"):
    return client.post("/check_in", json={"userID": user, "projectID": project, "hwSet": hw_set, "quantity": qty})

def hardware_doc(db, name="HWSet1"):
    return db["hardware"].find_one({"name": name})

def held(db, project="PROJ1234", hardware_id="HWSET001"):
    return db["projects"].find_one({"projectId": project})["checkedOut"].get(hardware_id, 0)

def assert_counts_add_up(db):
    """For each set: capacity == available + every project's holdings, and hardware.checkedOut matches them."""
    for doc in db["hardware"].find():
        held_total = sum(p["checkedOut"].get(doc["hardwareId"], 0) for p in db["projects"].find())
        assert doc["available"] + held_total == doc["capacity"]
        assert doc["checkedOut"] == held_total


# ---- reading hardware ----

def test_get_all_hw_names(client, hw):
    r = client.get("/get_all_hw_names")
    assert r.status_code == 200
    assert sorted(r.get_json()["names"]) == ["HWSet1", "HWSet2"]

def test_get_hw_info(client, hw):
    r = client.get("/get_hw_info?name=HWSet1")
    assert r.status_code == 200
    assert r.get_json() == {"name": "HWSet1", "capacity": 100, "available": 100}

@pytest.mark.parametrize("query, status", [("", 400), ("?name=", 400), ("?name=HWSet9", 404)])
def test_get_hw_info_errors(client, hw, query, status):
    assert client.get("/get_hw_info" + query).status_code == status


# ---- check-out ----

def test_check_out_updates_set_and_project(client, hw):
    create_project(client)
    r = check_out(client, 30)
    assert r.status_code == 200
    assert r.get_json() == {"name": "HWSet1", "capacity": 100, "available": 70}
    assert hardware_doc(hw)["checkedOut"] == 30
    assert held(hw) == 30
    assert_counts_add_up(hw)

def test_check_out_whole_capacity(client, hw):
    create_project(client)
    assert check_out(client, 100).get_json()["available"] == 0
    assert_counts_add_up(hw)

def test_check_out_more_than_available_is_409_and_changes_nothing(client, hw):
    create_project(client)
    check_out(client, 80)
    r = check_out(client, 21)
    assert r.status_code == 409
    assert hardware_doc(hw)["available"] == 20
    assert held(hw) == 80
    assert_counts_add_up(hw)

def test_check_out_unavailable_set_is_409(client, hw):
    create_project(client)
    hw["hardware"].update_one({"name": "HWSet1"}, {"$set": {"status": "maintenance"}})
    assert check_out(client, 1).status_code == 409
    assert hardware_doc(hw)["available"] == 100

def test_project_limit_rolls_back_the_set(client, hw):
    """A project may hold at most 100 of a set. When that fails, the set's numbers must be put back."""
    hw["hardware"].update_one({"name": "HWSet1"}, {"$set": {"capacity": 200, "available": 200}})
    create_project(client)
    assert check_out(client, 100).status_code == 200
    assert check_out(client, 1).status_code == 409
    doc = hardware_doc(hw)
    assert (doc["available"], doc["checkedOut"]) == (100, 100)
    assert held(hw) == 100

def test_member_can_check_out(client, hw):
    create_project(client)
    assert client.post("/join_project", json={"userID": "bobby", "projectID": "PROJ1234"}).status_code == 200
    assert check_out(client, 5, user="bobby").status_code == 200

def test_non_member_is_403(client, hw):
    create_project(client)
    assert check_out(client, 5, user="mallory").status_code == 403
    assert hardware_doc(hw)["available"] == 100

def test_project_id_is_case_insensitive(client, hw):
    create_project(client)
    assert check_out(client, 5, project="proj1234").status_code == 200
    assert held(hw) == 5

@pytest.mark.parametrize("project, hw_set", [("PROJ9999", "HWSet1"), ("PROJ1234", "HWSet9")])
def test_check_out_unknown_project_or_set_is_404(client, hw, project, hw_set):
    create_project(client)
    assert check_out(client, 1, project=project, hw_set=hw_set).status_code == 404

@pytest.mark.parametrize("quantity", [0, -3, 2.5, "5", True, None])
def test_check_out_rejects_bad_quantity(client, hw, quantity):
    create_project(client)
    assert check_out(client, quantity).status_code == 400
    assert hardware_doc(hw)["available"] == 100

@pytest.mark.parametrize("body", [
    {"projectID": "PROJ1234", "hwSet": "HWSet1", "quantity": 1},  # missing userID
    {"userID": "alice", "hwSet": "HWSet1", "quantity": 1},        # missing projectID
    {"userID": "alice", "projectID": "PROJ1234", "quantity": 1},  # missing hwSet
    ["not", "an", "object"],
])
def test_check_out_rejects_bad_body(client, hw, body):
    create_project(client)
    assert client.post("/check_out", json=body).status_code == 400


# ---- check-in ----

def test_check_in_returns_units(client, hw):
    create_project(client)
    check_out(client, 30)
    r = check_in(client, 10)
    assert r.status_code == 200
    assert r.get_json()["available"] == 80
    assert held(hw) == 20
    assert_counts_add_up(hw)

def test_check_in_everything(client, hw):
    create_project(client)
    check_out(client, 30)
    assert check_in(client, 30).get_json()["available"] == 100
    assert held(hw) == 0
    assert_counts_add_up(hw)

def test_check_in_more_than_held_is_409_and_changes_nothing(client, hw):
    create_project(client)
    check_out(client, 10)
    assert check_in(client, 11).status_code == 409
    assert hardware_doc(hw)["available"] == 90
    assert held(hw) == 10
    assert_counts_add_up(hw)

def test_check_in_with_nothing_held_is_409(client, hw):
    create_project(client)
    assert check_in(client, 1).status_code == 409
    assert hardware_doc(hw)["available"] == 100

def test_project_cannot_return_another_projects_units(client, hw):
    """The bug that per-project accounting fixed: B must not be able to check in units A holds."""
    create_project(client, owner="alice", project="PROJ1111")
    create_project(client, owner="bobby", project="PROJ2222")
    assert check_out(client, 40, user="alice", project="PROJ1111").status_code == 200
    assert check_in(client, 10, user="bobby", project="PROJ2222").status_code == 409
    assert held(hw, project="PROJ1111") == 40
    assert held(hw, project="PROJ2222") == 0
    assert_counts_add_up(hw)

def test_sets_are_tracked_separately(client, hw):
    create_project(client)
    check_out(client, 10, hw_set="HWSet1")
    assert check_in(client, 1, hw_set="HWSet2").status_code == 409
    assert check_out(client, 5, hw_set="HWSet2").status_code == 200
    assert (held(hw, hardware_id="HWSET001"), held(hw, hardware_id="HWSET002")) == (10, 5)
    assert_counts_add_up(hw)

def test_check_in_non_member_is_403(client, hw):
    create_project(client)
    check_out(client, 5)
    assert check_in(client, 5, user="mallory").status_code == 403
    assert held(hw) == 5

@pytest.mark.parametrize("quantity", [0, -1, 1.5, "1", False])
def test_check_in_rejects_bad_quantity(client, hw, quantity):
    create_project(client)
    check_out(client, 5)
    assert check_in(client, quantity).status_code == 400
    assert held(hw) == 5


# ---- a full session ----

def test_two_projects_share_the_pool(client, hw):
    create_project(client, owner="alice", project="PROJ1111")
    create_project(client, owner="bobby", project="PROJ2222")
    assert check_out(client, 60, user="alice", project="PROJ1111").status_code == 200
    assert check_out(client, 50, user="bobby", project="PROJ2222").status_code == 409   # only 40 left
    assert check_out(client, 40, user="bobby", project="PROJ2222").status_code == 200
    assert check_in(client, 60, user="alice", project="PROJ1111").status_code == 200
    assert hardware_doc(hw)["available"] == 60
    assert_counts_add_up(hw)
