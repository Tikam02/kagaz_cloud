#!/usr/bin/env python3
"""
One-time migration: encrypt all existing (plaintext) files on disk.

Usage:
    ENCRYPTION_KEY=your-secret-key python encrypt_existing.py

This reads every Document row, checks whether the file is already encrypted
(by trying to decrypt; if it fails, the file is plaintext), then encrypts it.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.models import db, Document
from app.crypto import encrypt_file, is_encryption_enabled

app = create_app()

with app.app_context():
    if not is_encryption_enabled():
        print("ERROR: ENCRYPTION_KEY is not set. Export it first.")
        sys.exit(1)

    docs = Document.query.all()
    upload_folder = app.config["UPLOAD_FOLDER"]
    encrypted = 0
    skipped = 0
    missing = 0

    for doc in docs:
        fpath = os.path.join(upload_folder, doc.file_path)
        if not os.path.exists(fpath):
            print(f"  SKIP (missing): {doc.id} - {doc.title}")
            missing += 1
            continue

        # Check if already encrypted by trying to decrypt
        from app.crypto import decrypt_file
        try:
            decrypt_file(fpath, doc.user_id)
            print(f"  SKIP (already encrypted): {doc.id} - {doc.title}")
            skipped += 1
            continue
        except Exception:
            pass  # not encrypted yet — proceed

        encrypt_file(fpath, doc.user_id)
        encrypted += 1
        print(f"  ENCRYPTED: {doc.id} - {doc.title}")

    print(f"\nDone. Encrypted: {encrypted}, Skipped: {skipped}, Missing: {missing}")
