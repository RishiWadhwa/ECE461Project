import pytest

HW_SETS = [
    {"hardwareId": "HWSET001", "name": "HWSet1", "capacity": 100, "available": 100, "checkedOut": 0, "status": "available"},
    {"hardwareId": "HWSET002", "name": "HWSet2", "capacity": 100, "available": 100, "checkedOut": 0, "status": "available"},
]

@pytest.fixture
def hw(db):
    db["hardware"].insert_many([dict(doc) for doc in HW_SETS])
    return db

def create(client, owner="alice", project="PROJ1234", name="Rover", description="Mars rover"):
    return client.post("/create_project",
                       json={"userID": owner, "projectID": project, "name": name, "description": description})

def join(client, user="bobby", project="PROJ1234"):
    return client.post("/join_project", json={"userID": user, "projectID": project})

def stored(db, project="PROJ1234"):
    return db["projects"].find_one({"projectId": project})


# ---- create ----

def test_create_returns_the_project(client, hw):
    r = create(client)
    assert r.status_code == 200
    assert r.get_json() == {"projectID": "PROJ1234", "name": "Rover", "description": "Mars rover"}

def test_creator_is_owner_and_first_member(client, hw):
    create(client)
    doc = stored(hw)
    assert doc["ownerId"] == "alice"
    assert doc["members"] == ["alice"]

def test_new_project_holds_nothing_of_every_set(client, hw):
    create(client)
    assert stored(hw)["checkedOut"] == {"HWSET001": 0, "HWSET002": 0}

def test_project_id_is_stored_uppercase(client, hw):
    assert create(client, project="proj1234").get_json()["projectID"] == "PROJ1234"
    assert stored(hw, "PROJ1234") is not None

def test_duplicate_project_is_409(client, hw):
    create(client)
    r = create(client, owner="bobby")
    assert r.status_code == 409
    assert stored(hw)["ownerId"] == "alice"

def test_duplicate_differing_only_in_case_is_409(client, hw):
    create(client, project="PROJ1234")
    assert create(client, project="proj1234").status_code == 409

def test_description_may_be_empty(client, hw):
    assert create(client, description="").status_code == 200

@pytest.mark.parametrize("project", ["PROJ12", "PRJ12345", "ABCD1234", "PROJ12AB", "PROJ-1234"])
def test_create_rejects_bad_project_ids(client, hw, project):
    assert create(client, project=project).status_code == 400

@pytest.mark.parametrize("body", [
    {"projectID": "PROJ1234", "name": "Rover", "description": ""},                     # missing userID
    {"userID": "alice", "name": "Rover", "description": ""},                           # missing projectID
    {"userID": "alice", "projectID": "PROJ1234", "description": ""},                   # missing name
    {"userID": "alice", "projectID": "PROJ1234", "name": "   ", "description": ""},    # blank name
    {"userID": "alice", "projectID": "PROJ1234", "name": "Rover", "description": 5},   # description not a string
    {"userID": "ab", "projectID": "PROJ1234", "name": "Rover", "description": ""},     # userID too short
    ["not", "an", "object"],
])
def test_create_rejects_bad_body(client, hw, body):
    r = client.post("/create_project", json=body)
    assert r.status_code == 400
    assert "error" in r.get_json()


# ---- join ----

def test_join_adds_member(client, hw):
    create(client)
    r = join(client)
    assert r.status_code == 200
    assert r.get_json()["projectID"] == "PROJ1234"
    assert stored(hw)["members"] == ["alice", "bobby"]

def test_join_twice_is_409_and_not_listed_twice(client, hw):
    create(client)
    join(client)
    assert join(client).status_code == 409
    assert stored(hw)["members"].count("bobby") == 1

def test_owner_joining_own_project_is_409(client, hw):
    create(client)
    assert join(client, user="alice").status_code == 409

def test_join_unknown_project_is_404(client, hw):
    assert join(client, project="PROJ9999").status_code == 404

def test_join_is_case_insensitive(client, hw):
    create(client)
    assert join(client, project="proj1234").status_code == 200


# ---- list and info ----

def test_user_sees_only_their_projects(client, hw):
    create(client, owner="alice", project="PROJ1111")
    create(client, owner="bobby", project="PROJ2222")
    join(client, user="alice", project="PROJ2222")
    create(client, owner="carol", project="PROJ3333")
    r = client.get("/get_user_projects_list?userID=alice")
    assert r.status_code == 200
    assert sorted(p["projectID"] for p in r.get_json()["projects"]) == ["PROJ1111", "PROJ2222"]

def test_user_with_no_projects_gets_empty_list(client, hw):
    r = client.get("/get_user_projects_list?userID=nobody1")
    assert r.status_code == 200
    assert r.get_json() == {"projects": []}

def test_project_list_items_have_the_fields_the_frontend_uses(client, hw):
    create(client)
    item = client.get("/get_user_projects_list?userID=alice").get_json()["projects"][0]
    assert set(item) == {"projectID", "name", "description"}

def test_project_info_includes_members(client, hw):
    create(client)
    join(client)
    r = client.get("/get_project_info?projectID=PROJ1234")
    assert r.status_code == 200
    assert r.get_json() == {"projectID": "PROJ1234", "name": "Rover", "description": "Mars rover",
                            "members": ["alice", "bobby"]}

def test_project_info_unknown_is_404(client, hw):
    assert client.get("/get_project_info?projectID=PROJ9999").status_code == 404

@pytest.mark.parametrize("query", ["", "?projectID=", "?projectID=BAD"])
def test_project_info_rejects_bad_id(client, hw, query):
    assert client.get("/get_project_info" + query).status_code == 400


# ---- known bugs: these fail today, and fail loudly once fixed so the marker gets removed ----

@pytest.mark.xfail(strict=True, reason="Bug: 'PROJ123' matches PROJ + 3 digits as the error message promises, "
                                       "but the separate 8-character minimum rejects it")
def test_proj_with_3_digits_is_accepted(client, hw):
    assert create(client, project="PROJ123").status_code == 200

@pytest.mark.xfail(strict=True, reason="Bug: add_user accepts any characters, but the project routes only accept "
                                       "letters and digits, so a user like 'john.doe' can register but never use projects")
def test_every_registered_user_can_create_a_project(client, hw):
    assert client.post("/add_user", json={"userID": "john.doe", "password": "password123"}).status_code == 201
    assert create(client, owner="john.doe").status_code == 200
