"""
Per-user AES-256-GCM file encryption.

Each file is encrypted with a key derived from:
    MASTER_ENCRYPTION_KEY  +  user_id

Key derivation uses PBKDF2-HMAC-SHA256 (600 000 iterations).
Each encrypted file stores: 16-byte salt | 12-byte nonce | ciphertext+tag
"""

import io
import os
import hashlib
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from flask import current_app

logger = logging.getLogger(__name__)

_SALT_LEN = 16
_NONCE_LEN = 12
_KEY_LEN = 32   # AES-256
_KDF_ITERATIONS = 600_000


def _get_master_key() -> bytes:
    key = current_app.config.get("ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. "
            "Set the ENCRYPTION_KEY environment variable before enabling encryption."
        )
    return key.encode("utf-8")


def _derive_key(user_id: int, salt: bytes) -> bytes:
    """Derive a 256-bit key from the master key + user_id using PBKDF2."""
    raw = _get_master_key() + str(user_id).encode("ascii")
    return hashlib.pbkdf2_hmac("sha256", raw, salt, _KDF_ITERATIONS, dklen=_KEY_LEN)


# ── Public API ───────────────────────────────────────────────────────────────

def encrypt_file(src_path: str, user_id: int) -> None:
    """Encrypt *src_path* in-place for *user_id*."""
    salt = os.urandom(_SALT_LEN)
    nonce = os.urandom(_NONCE_LEN)
    key = _derive_key(user_id, salt)

    with open(src_path, "rb") as f:
        plaintext = f.read()

    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    with open(src_path, "wb") as f:
        f.write(salt + nonce + ciphertext)


def decrypt_file(src_path: str, user_id: int) -> io.BytesIO:
    """Return an in-memory BytesIO of the decrypted contents."""
    with open(src_path, "rb") as f:
        blob = f.read()

    salt = blob[:_SALT_LEN]
    nonce = blob[_SALT_LEN : _SALT_LEN + _NONCE_LEN]
    ciphertext = blob[_SALT_LEN + _NONCE_LEN :]

    key = _derive_key(user_id, salt)
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)

    buf = io.BytesIO(plaintext)
    buf.seek(0)
    return buf


def decrypt_file_to_path(src_path: str, user_id: int, dest_path: str) -> str:
    """Decrypt to a temporary file and return its path (caller must clean up)."""
    buf = decrypt_file(src_path, user_id)
    with open(dest_path, "wb") as f:
        f.write(buf.read())
    return dest_path


def is_encryption_enabled() -> bool:
    """Return True when encryption is configured."""
    return bool(current_app.config.get("ENCRYPTION_KEY"))
