# Project routes. Numbers in comments refer to the TA's test plan.


# 4
def test_create_project(api):
    api.sign_up()
    r = api.create_project()
    assert r.status_code == 200
    assert r.get_json()["projectID"] == "PROJ1234"
    assert api.projects_of("alice") == ["PROJ1234"]


# 5 and 16
def test_create_with_existing_id_is_409(api):
    api.sign_up()
    api.create_project()
    api.sign_up(user="tauser1")
    r = api.create_project(user="tauser1")
    assert r.status_code == 409
    assert api.projects_of("tauser1") == []


def test_project_id_is_case_insensitive(api):
    api.sign_up()
    api.create_project(project="PROJ1234")
    assert api.create_project(project="proj1234").status_code == 409


# 6 and 17
def test_join_existing_project(api):
    api.sign_up()
    api.create_project()
    api.sign_up(user="tauser1")
    r = api.join_project("tauser1")
    assert r.status_code == 200
    assert api.projects_of("tauser1") == ["PROJ1234"]


def test_join_unknown_project_is_404(api):
    api.sign_up()
    assert api.join_project("alice", project="PROJ9999").status_code == 404


def test_join_twice_is_409(api):
    api.sign_up()
    api.create_project()
    assert api.join_project("alice").status_code == 409
