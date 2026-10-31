import pytest

def register(client, user="alice", pw="correcthorse"):
    return client.post("/add_user", json={"userID": user, "password": pw})

def test_register_then_login(client):
    assert register(client).status_code == 201
    r = client.post("/login", json={"userID": "alice", "password": "correcthorse"})
    assert r.status_code == 200
    assert r.get_json() == {"userID": "alice"}

def test_password_not_stored_in_plaintext(client, db):
    register(client)
    assert "correcthorse" not in str(db["users"].find_one({"userId": "alice"}))

def test_wrong_password_is_401(client):
    register(client)
    r = client.post("/login", json={"userID": "alice", "password": "wrongwrong"})
    assert r.status_code == 401

def test_duplicate_user_is_409(client):
    register(client)
    assert register(client).status_code == 409

@pytest.mark.parametrize("body", [
    {"password": "correcthorse"},                      # missing userID
    {"userID": "abcd", "password": "correcthorse"},    # userID < 5
    {"userID": "a" * 17, "password": "correcthorse"},  # userID > 16
    {"userID": "alice", "password": "short"},          # password < 8
    {"userID": "alice", "password": "p" * 65},         # password > 64
    ["not", "an", "object"],
])
def test_add_user_rejects_bad_input(client, body):
    r = client.post("/add_user", json=body)
    assert r.status_code == 400
    assert "error" in r.get_json()

@pytest.mark.parametrize("user, pw", [
    ("abcde", "pass1234"),        # both at the minimum
    ("a" * 16, "p" * 64),         # both at the maximum
])
def test_add_user_accepts_length_limits(client, user, pw):
    assert register(client, user, pw).status_code == 201