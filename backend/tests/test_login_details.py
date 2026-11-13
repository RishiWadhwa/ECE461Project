"""Login and registration details beyond test_auth.py: input handling and security-relevant behavior."""
import pytest

def register(client, user="alice", pw="correcthorse"):
    return client.post("/add_user", json={"userID": user, "password": pw})

def login(client, user="alice", pw="correcthorse"):
    return client.post("/login", json={"userID": user, "password": pw})

def test_unknown_user_and_wrong_password_look_the_same(client):
    """Different answers would let anyone find out which userIDs exist."""
    register(client)
    unknown, wrong = login(client, user="nobody"), login(client, pw="wrongwrong")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.get_json() == wrong.get_json()

def test_user_id_is_trimmed_on_register_and_login(client, db):
    assert register(client, user="  alice  ").get_json() == {"userID": "alice"}
    assert db["users"].find_one({"userId": "alice"}) is not None
    assert login(client, user="  alice  ").status_code == 200

def test_user_ids_are_case_sensitive(client):
    """Current behavior: 'Alice' is a different account from 'alice'. Change this test if the team decides otherwise."""
    register(client)
    assert login(client, user="ALICE").status_code == 401
    assert register(client, user="Alice").status_code == 201

def test_password_is_not_trimmed(client):
    """Spaces are part of the password, so '  pass word  ' and 'pass word' are different passwords."""
    register(client, pw="  pass word  ")
    assert login(client, pw="  pass word  ").status_code == 200
    assert login(client, pw="pass word").status_code == 401

def test_password_is_stored_as_an_argon2_hash(client, db):
    register(client)
    stored = db["users"].find_one({"userId": "alice"})["passwordHash"]
    assert stored.startswith("$argon2")

def test_same_password_gives_different_hashes(client, db):
    """Each hash has its own random salt, so two users with the same password are not visible in the database."""
    register(client, user="alice")
    register(client, user="bobby")
    alice = db["users"].find_one({"userId": "alice"})["passwordHash"]
    bobby = db["users"].find_one({"userId": "bobby"})["passwordHash"]
    assert alice != bobby

def test_login_response_contains_only_the_user_id(client):
    register(client)
    assert login(client).get_json() == {"userID": "alice"}

@pytest.mark.parametrize("body", [
    {"password": "correcthorse"},
    {"userID": "alice"},
    {"userID": "   ", "password": "correcthorse"},
    {"userID": 5, "password": "correcthorse"},
    {"userID": "alice", "password": 12345678},
    ["alice", "correcthorse"],
])
def test_login_rejects_bad_input(client, body):
    r = client.post("/login", json=body)
    assert r.status_code == 400
    assert "error" in r.get_json()

def test_duplicate_registration_is_rejected_by_the_index_too(client, db, monkeypatch):
    """Two registrations racing can both pass the 'already exists?' check. The unique index must still stop the
    second insert. Simulated by making the check miss, as it would for the second of two simultaneous requests."""
    register(client)
    real_find_one = db["users"].find_one.__func__
    monkeypatch.setattr(type(db["users"]), "find_one", lambda self, *a, **k: None if self.name == "users" else real_find_one(self, *a, **k))
    assert register(client).status_code == 409
