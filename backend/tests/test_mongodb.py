"""Unit tests for the mongodb/ data layer, called directly rather than through the routes."""
from datetime import datetime, timedelta, timezone

import pytest

from mongodb.checkout import ledger
from mongodb.project.writes import add_member, insert_project
from mongodb.user import encryption
from mongodb.user.queries import find_user, insert_user

KEY = "2026-11-11 12:00:00"


# ---- project writes ----

def test_insert_project_holds_zero_of_every_set(db):
    db["hardware"].insert_many([{"hardwareId": "HWSET001"}, {"hardwareId": "HWSET002"}])
    project = insert_project("alice", "PROJ1234", "desc", "Rover")
    assert project["checkedOut"] == {"HWSET001": 0, "HWSET002": 0}
    assert project["ownerId"] == "alice" and project["members"] == ["alice"]

def test_insert_project_without_a_name_uses_the_id(db):
    assert insert_project("alice", "PROJ1234", "desc")["name"] == "PROJ1234"

def test_add_member_twice_lists_them_once(db):
    insert_project("alice", "PROJ1234", "desc")
    add_member("PROJ1234", "bobby")
    assert add_member("PROJ1234", "bobby")["members"] == ["alice", "bobby"]

def test_add_member_to_unknown_project_is_none(db):
    assert add_member("PROJ9999", "bobby") is None


# ---- encryption.py (custom time-keyed cipher) ----

def test_encrypt_then_decrypt_round_trips():
    secret = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"
    assert encryption.custom_decrypt(encryption.custom_encrypt(secret, KEY), KEY) == secret

def test_encryption_is_randomized():
    assert encryption.custom_encrypt("same", KEY) != encryption.custom_encrypt("same", KEY)

def test_ciphertext_does_not_contain_the_plaintext():
    assert "hunter2" not in encryption.custom_encrypt("hunter2", KEY)

def test_wrong_key_is_rejected():
    blob = encryption.custom_encrypt("secret", KEY)
    with pytest.raises(ValueError):
        encryption.custom_decrypt(blob, "2026-11-11 12:00:01")

def test_modified_ciphertext_is_rejected():
    blob = encryption.custom_encrypt("secret", KEY)
    tampered = blob[:-4] + ("AAAA" if blob[-4:] != "AAAA" else "BBBB")
    with pytest.raises(ValueError):
        encryption.custom_decrypt(tampered, KEY)

@pytest.mark.parametrize("bad", ["not base64!!", "QUJD"])
def test_garbage_ciphertext_is_rejected(bad):
    with pytest.raises(ValueError):
        encryption.custom_decrypt(bad, KEY)

@pytest.mark.parametrize("key", ["2026-11-11", "2026-11-11T12:00:00", "", "2026-13-40 99:99:99"])
def test_malformed_key_is_rejected(key):
    with pytest.raises(ValueError):
        encryption.custom_encrypt("secret", key)

def test_format_key_uses_utc():
    central = timezone(timedelta(hours=-6))
    assert encryption.format_key(datetime(2026, 11, 11, 6, 0, 0, tzinfo=central)) == KEY
    assert encryption.format_key(datetime(2026, 11, 11, 12, 0, 0)) == KEY   # naive counts as UTC


# ---- user storage (mongodb/user/queries.py) ----

def test_insert_then_find_user_returns_the_original_hash(db):
    insert_user("alice", "$argon2id$hash")
    assert find_user("alice")["passwordHash"] == "$argon2id$hash"

def test_stored_hash_is_encrypted(db):
    insert_user("alice", "$argon2id$hash")
    assert db["users"].find_one({"userId": "alice"})["passwordHash"] != "$argon2id$hash"

def test_find_unknown_user_is_none(db):
    assert find_user("nobody") is None


# ---- checkout ledger (mongodb/checkout/ledger.py) ----

def row(checkout_id, project, hardware, qty, minutes, status="active"):
    return {"checkoutId": checkout_id, "projectId": project, "hardwareId": hardware, "quantity": qty, "status": status,
            "checkedOutAt": datetime(2026, 11, 11, tzinfo=timezone.utc) + timedelta(minutes=minutes)}

def test_checkout_ids_count_up(db):
    first = ledger.insert_active("alice", "PROJ1234", "HWSET001", 5)
    second = ledger.insert_active("alice", "PROJ1234", "HWSET001", 3)
    assert (first["checkoutId"], second["checkoutId"]) == ("CHK001", "CHK002")

def test_held_quantity_counts_only_active_rows_for_that_project_and_set(db):
    db["checkouts"].insert_many([
        row("CHK001", "PROJ1234", "HWSET001", 5, 0),
        row("CHK002", "PROJ1234", "HWSET001", 3, 1),
        row("CHK003", "PROJ1234", "HWSET001", 7, 2, status="completed"),
        row("CHK004", "PROJ1234", "HWSET002", 9, 3),
        row("CHK005", "PROJ9999", "HWSET001", 4, 4),
    ])
    assert ledger.held_quantity("PROJ1234", "HWSET001") == 8

def test_complete_quantity_closes_oldest_rows_first(db):
    db["checkouts"].insert_many([row("CHK001", "PROJ1234", "HWSET001", 5, 0),
                                 row("CHK002", "PROJ1234", "HWSET001", 3, 1)])
    assert ledger.complete_quantity("PROJ1234", "HWSET001", 6) == 6
    oldest, newest = db["checkouts"].find_one({"checkoutId": "CHK001"}), db["checkouts"].find_one({"checkoutId": "CHK002"})
    assert oldest["status"] == "completed"
    assert (newest["status"], newest["quantity"]) == ("active", 2)

def test_complete_quantity_stops_at_what_is_held(db):
    db["checkouts"].insert_one(row("CHK001", "PROJ1234", "HWSET001", 2, 0))
    assert ledger.complete_quantity("PROJ1234", "HWSET001", 5) == 2

@pytest.mark.xfail(strict=True, reason="Bug: checkout IDs are compared as text, and 'CHK999' sorts after 'CHK1000', "
                                       "so the next ID after CHK1000 is computed as CHK1000 again")
def test_checkout_ids_keep_counting_past_999(db):
    db["checkouts"].insert_many([row("CHK999", "P", "H", 1, 0), row("CHK1000", "P", "H", 1, 1)])
    assert ledger._next_checkout_id() == "CHK1001"
