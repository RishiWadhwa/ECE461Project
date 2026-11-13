# Hardware routes. Numbers in comments refer to the TA's test plan.
# Every test asks for the `hardware` fixture, so HWSet1 and HWSet2 start at 100 available.
import os

import pytest

# mongomock's find_one_and_update(..., projection=...) returns None when the updated document no longer
# matches the filter (e.g. available drops below the requested quantity), although real MongoDB returns it.
# Tests that hit that case only run against a real server (set TEST_MONGO_URI).
needs_real_mongo = pytest.mark.skipif(
    os.environ.get("TEST_MONGO_URI") is None,
    reason="mongomock returns None from find_one_and_update once the filter stops matching",
)


@pytest.fixture
def member(api, hardware):
    """alice signed up and owns PROJ1234, so she can check hardware in and out."""
    api.sign_up()
    api.create_project()


# 7, 8 and 9
@pytest.mark.parametrize("hw", ["HWSet1", "HWSet2"])
def test_check_out_reduces_available(api, member, hw):
    r = api.check_out(hw, 10)
    assert r.status_code == 200
    assert r.get_json()["available"] == 90
    assert api.available(hw) == 90


def test_check_out_one_set_leaves_the_other_alone(api, member):
    api.check_out("HWSet1", 10)
    assert api.available("HWSet2") == 100


# 10
def test_check_out_more_than_available_is_409(api, member):
    r = api.check_out("HWSet1", 101)
    assert r.status_code == 409
    assert api.available("HWSet1") == 100


@needs_real_mongo
def test_check_out_exactly_all_units(api, member):
    assert api.check_out("HWSet1", 100).status_code == 200
    assert api.available("HWSet1") == 0
    assert api.check_out("HWSet1", 1).status_code == 409


@pytest.mark.parametrize("qty", [0, -5, 2.5, "3", True])
def test_check_out_rejects_bad_quantity(api, member, qty):
    assert api.check_out("HWSet1", qty).status_code == 400
    assert api.available("HWSet1") == 100


def test_check_out_unknown_set_is_404(api, member):
    assert api.check_out("HWSet9", 1).status_code == 404


# 11, 12 and 19
def test_check_in_increases_available(api, member):
    api.check_out("HWSet1", 10)
    r = api.check_in("HWSet1", 1)
    assert r.status_code == 200
    assert r.get_json()["available"] == 91
    assert api.available("HWSet1") == 91


def test_check_in_more_than_checked_out_is_409(api, member):
    api.check_out("HWSet1", 10)
    assert api.check_in("HWSet1", 11).status_code == 409
    assert api.available("HWSet1") == 90


# 17: authorization
def test_non_member_cannot_check_out(api, member):
    api.sign_up(user="tauser1")
    r = api.check_out("HWSet1", 5, user="tauser1")
    assert r.status_code == 403
    assert api.available("HWSet1") == 100


def test_non_member_cannot_check_in(api, member):
    api.check_out("HWSet1", 10)
    api.sign_up(user="tauser1")
    assert api.check_in("HWSet1", 5, user="tauser1").status_code == 403
    assert api.available("HWSet1") == 90


# 18 and 19
def test_member_can_check_in_units_another_member_checked_out(api, member):
    api.check_out("HWSet2", 20)
    api.sign_up(user="tauser1")
    api.join_project("tauser1")
    r = api.check_in("HWSet2", 5, user="tauser1")
    assert r.status_code == 200
    assert api.available("HWSet2") == 85
