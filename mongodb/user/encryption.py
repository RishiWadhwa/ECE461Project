"""
Encrypting a stored password hash using a time-based encryption algorithm

The key is the account's creation time as a UTC string, ``YYYY-MM-DD HH:MM:SS``
(``KEY_FORMAT``). That string is the TOTP shared secret. The moving factor is
the same instant as a Unix-second counter, packed the way HOTP packs its
counter (8-byte big-endian). HMAC-SHA256 of those two values is the symmetric
key. TOTP would shorten that digest to a decimal code; a cipher needs the
full digest, so the digest is kept.

The cipher is a stream: a PNRG nonce, an HMAC keystream in counter mode,
then an HMAC tag over the nonce and ciphertext. Decrypt rejects a different
second or a modified blob. The result is standard base64 so it can be stored
in the ``passwordHash`` string field.
"""

import base64
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timezone
import sys

KEY_FORMAT = "%Y-%m-%d %H:%M:%S"
_KEY_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\Z")
_NONCE_LEN = 16
_TAG_LEN = 32


def format_key(moment: datetime) -> str:
    """UTC key string for ``moment``. Naive values are treated as UTC."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    else:
        moment = moment.astimezone(timezone.utc)
    return moment.strftime(KEY_FORMAT)


def _derive_key(key: str) -> bytes:
    if not isinstance(key, str) or _KEY_PATTERN.fullmatch(key) is None:
        raise ValueError(f"key must match {KEY_FORMAT} (UTC)")
    try:
        stamp = datetime.strptime(key, KEY_FORMAT).replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError(f"key must match {KEY_FORMAT} (UTC)") from exc
    counter = int(stamp.timestamp()).to_bytes(8, "big")
    return hmac.new(key.encode("ascii"), counter, hashlib.sha256).digest()


def _apply_keystream(derived: bytes, nonce: bytes, data: bytes) -> bytes:
    out = bytearray()
    offset = 0
    block = 0
    while offset < len(data):
        keystream = hmac.new(
            derived,
            nonce + block.to_bytes(4, "big"),
            hashlib.sha256,
        ).digest()
        chunk = data[offset : offset + len(keystream)]
        out.extend(byte ^ keystream[i] for i, byte in enumerate(chunk))
        offset += len(chunk)
        block += 1
    return bytes(out)


def custom_encrypt(phrase: str, key: str) -> str:
    """Encrypt ``phrase`` under the creation-time key. Returns base64 text."""
    if not isinstance(phrase, str):
        raise TypeError("phrase must be a str")
    derived = _derive_key(key)
    nonce = secrets.token_bytes(_NONCE_LEN)
    ciphertext = _apply_keystream(derived, nonce, phrase.encode("utf-8"))
    tag = hmac.new(derived, nonce + ciphertext, hashlib.sha256).digest()
    return base64.b64encode(nonce + ciphertext + tag).decode("ascii")


def custom_decrypt(phrase: str, key: str) -> str:
    """Decrypt a value from ``custom_encrypt``. Raises ``ValueError`` on failure."""
    if not isinstance(phrase, str):
        raise TypeError("phrase must be a str")
    try:
        raw = base64.b64decode(phrase, validate=True)
    except ValueError as exc:
        raise ValueError("ciphertext is not valid base64") from exc
    if len(raw) < _NONCE_LEN + _TAG_LEN:
        raise ValueError("ciphertext is too short")
    nonce = raw[:_NONCE_LEN]
    tag = raw[-_TAG_LEN:]
    ciphertext = raw[_NONCE_LEN:-_TAG_LEN]
    derived = _derive_key(key)
    expected = hmac.new(derived, nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("decryption failed")
    return _apply_keystream(derived, nonce, ciphertext).decode("utf-8")

# only for demo
if __name__ == "__main__":
    created_at = datetime.now(timezone.utc).replace(microsecond=0)
    password = "I love ECE!"
    print(password)

    derived = _derive_key(format_key(created_at))
    print(sys.getsizeof(created_at), sys.getsizeof(format_key(created_at)), len(derived), "\n",  derived)
    
    password = custom_encrypt(password, format_key(created_at))
    print(password)
    
    password = custom_decrypt(password, format_key(created_at))
    print(password)

