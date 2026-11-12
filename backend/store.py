from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "runtime" / "docmind.sqlite3"
IDLE_SECONDS = 30 * 60
SESSION_SECONDS = 8 * 60 * 60
PASSWORD_ITERATIONS = 310_000


def uid() -> str:
    return uuid4().hex


def now() -> int:
    return int(time.time())


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        kind, rounds, salt, digest = stored.split("$")
        if kind != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(candidate, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class Store:
    def __init__(self, db_path: str | Path | None = None):
        self.path = Path(db_path or os.getenv("DOCMIND_DB_PATH") or DEFAULT_DB)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.files = Path(os.getenv("DOCMIND_FILES_PATH") or self.path.parent / "files")
        self.files.mkdir(parents=True, exist_ok=True)
        self._init()

    def connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        return db

    def _init(self) -> None:
        with self.connect() as db:
            db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS users(
              id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
              password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions(
              token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS login_failures(
              email TEXT NOT NULL, attempted_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS login_failures_email ON login_failures(email, attempted_at);
            CREATE TABLE IF NOT EXISTS collections(
              id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS collections_user ON collections(user_id, updated_at DESC);
            CREATE TABLE IF NOT EXISTS documents(
              id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
              filename TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
              page_count INTEGER NOT NULL, chunk_count INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS documents_collection ON documents(collection_id, user_id);
            CREATE TABLE IF NOT EXISTS chunks(
              id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
              document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
              page INTEGER NOT NULL, ordinal INTEGER NOT NULL, text TEXT NOT NULL,
              embedding TEXT
            );
            CREATE INDEX IF NOT EXISTS chunks_collection ON chunks(collection_id, user_id);
            CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(text, content='chunks', content_rowid='rowid', tokenize='porter unicode61');
            CREATE TRIGGER IF NOT EXISTS chunk_insert AFTER INSERT ON chunks BEGIN
              INSERT INTO chunk_fts(rowid,text) VALUES(new.rowid,new.text);
            END;
            CREATE TRIGGER IF NOT EXISTS chunk_delete AFTER DELETE ON chunks BEGIN
              INSERT INTO chunk_fts(chunk_fts,rowid,text) VALUES('delete',old.rowid,old.text);
            END;
            CREATE TRIGGER IF NOT EXISTS chunk_update AFTER UPDATE ON chunks BEGIN
              INSERT INTO chunk_fts(chunk_fts,rowid,text) VALUES('delete',old.rowid,old.text);
              INSERT INTO chunk_fts(rowid,text) VALUES(new.rowid,new.text);
            END;
            CREATE TABLE IF NOT EXISTS messages(
              id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
              role TEXT NOT NULL CHECK(role IN ('user','assistant')),
              body TEXT NOT NULL, sources TEXT NOT NULL DEFAULT '[]',
              answer_mode TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS messages_collection ON messages(collection_id, user_id, created_at);
            """)

    def create_user(self, email: str, name: str, password: str) -> dict:
        user = {"id": uid(), "email": email.lower().strip(), "name": name.strip(), "created_at": now()}
        with self.connect() as db:
            db.execute("INSERT INTO users VALUES(?,?,?,?,?)", (user["id"], user["email"], user["name"], hash_password(password), user["created_at"]))
            collection = self._new_collection(db, user["id"], "My library")
        user["collections"] = [collection]
        return user

    def get_user(self, user_id: str) -> dict | None:
        with self.connect() as db:
            row = db.execute("SELECT id,email,name,created_at FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None

    def authenticate(self, email: str, password: str) -> dict | None:
        email = email.lower().strip()
        cutoff = now() - 15 * 60
        with self.connect() as db:
            db.execute("DELETE FROM login_failures WHERE attempted_at<?", (cutoff,))
            failed = db.execute("SELECT COUNT(*) FROM login_failures WHERE email=?", (email,)).fetchone()[0]
            if failed >= 6:
                raise ValueError("Too many attempts. Try again in 15 minutes.")
            row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            if not row or not verify_password(password, row["password_hash"]):
                db.execute("INSERT INTO login_failures VALUES(?,?)", (email, now()))
                return None
            db.execute("DELETE FROM login_failures WHERE email=?", (email,))
            return {key: row[key] for key in ("id", "email", "name", "created_at")}

    def new_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(36)
        with self.connect() as db:
            db.execute("DELETE FROM sessions WHERE user_id=? AND created_at<?", (user_id, now() - SESSION_SECONDS))
            db.execute("INSERT INTO sessions VALUES(?,?,?,?)", (token_hash(token), user_id, now(), now()))
        return token

    def session_user(self, token: str | None) -> dict | None:
        if not token:
            return None
        with self.connect() as db:
            row = db.execute("""
              SELECT users.id,users.email,users.name,users.created_at,
                     sessions.created_at AS session_started,sessions.last_seen
              FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=?
            """, (token_hash(token),)).fetchone()
            if not row:
                return None
            if now() - row["last_seen"] > IDLE_SECONDS or now() - row["session_started"] > SESSION_SECONDS:
                db.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(token),))
                return None
            if now() - row["last_seen"] > 30:
                db.execute("UPDATE sessions SET last_seen=? WHERE token_hash=?", (now(), token_hash(token)))
            return {key: row[key] for key in ("id", "email", "name", "created_at")}

    def logout(self, token: str | None) -> None:
        if token:
            with self.connect() as db:
                db.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(token),))

    def _new_collection(self, db: sqlite3.Connection, user_id: str, title: str) -> dict:
        item = {"id": uid(), "user_id": user_id, "title": title.strip(), "created_at": now(), "updated_at": now()}
        db.execute("INSERT INTO collections VALUES(?,?,?,?,?)", tuple(item.values()))
        return item

    def create_collection(self, user_id: str, title: str) -> dict:
        with self.connect() as db:
            return self._new_collection(db, user_id, title)

    def collections(self, user_id: str) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("""
              SELECT c.*, (SELECT COUNT(*) FROM documents d WHERE d.collection_id=c.id) AS document_count
              FROM collections c WHERE c.user_id=? ORDER BY c.updated_at DESC
            """, (user_id,)).fetchall()
        return [dict(row) for row in rows]

    def collection(self, user_id: str, collection_id: str) -> dict | None:
        with self.connect() as db:
            row = db.execute("SELECT * FROM collections WHERE id=? AND user_id=?", (collection_id, user_id)).fetchone()
        return dict(row) if row else None

    def rename_collection(self, user_id: str, collection_id: str, title: str) -> bool:
        with self.connect() as db:
            result = db.execute("UPDATE collections SET title=?,updated_at=? WHERE id=? AND user_id=?", (title.strip(), now(), collection_id, user_id))
        return result.rowcount > 0

    def delete_collection(self, user_id: str, collection_id: str) -> bool:
        with self.connect() as db:
            documents = db.execute("SELECT id FROM documents WHERE user_id=? AND collection_id=?", (user_id, collection_id)).fetchall()
            result = db.execute("DELETE FROM collections WHERE user_id=? AND id=?", (user_id, collection_id))
        if result.rowcount:
            for document in documents:
                self.file_path(user_id, document["id"]).unlink(missing_ok=True)
        return result.rowcount > 0

    def file_path(self, user_id: str, document_id: str) -> Path:
        folder = self.files / user_id
        folder.mkdir(parents=True, exist_ok=True)
        return folder / document_id

    def documents(self, user_id: str, collection_id: str) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("SELECT * FROM documents WHERE user_id=? AND collection_id=? ORDER BY created_at DESC", (user_id, collection_id)).fetchall()
        return [dict(row) for row in rows]

    def document(self, user_id: str, document_id: str) -> dict | None:
        with self.connect() as db:
            row = db.execute("SELECT * FROM documents WHERE user_id=? AND id=?", (user_id, document_id)).fetchone()
        return dict(row) if row else None

    def save_document(self, user_id: str, collection_id: str, filename: str, mime: str, content: bytes, pages: list[tuple[int, str]], chunks: list[dict]) -> dict:
        document_id = uid()
        item = {"id": document_id, "user_id": user_id, "collection_id": collection_id, "filename": filename,
                "mime": mime, "bytes": len(content), "page_count": len(pages), "chunk_count": len(chunks), "created_at": now()}
        path = self.file_path(user_id, document_id)
        path.write_bytes(content)
        try:
            with self.connect() as db:
                db.execute("INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?)", tuple(item.values()))
                db.executemany("INSERT INTO chunks VALUES(?,?,?,?,?,?,?,?)", [
                    (uid(), user_id, collection_id, document_id, chunk["page"], chunk["ordinal"], chunk["text"],
                     json.dumps(chunk["embedding"]) if chunk.get("embedding") else None) for chunk in chunks
                ])
                db.execute("UPDATE collections SET updated_at=? WHERE id=? AND user_id=?", (now(), collection_id, user_id))
        except Exception:
            path.unlink(missing_ok=True)
            raise
        return item

    def delete_document(self, user_id: str, document_id: str) -> bool:
        with self.connect() as db:
            result = db.execute("DELETE FROM documents WHERE user_id=? AND id=?", (user_id, document_id))
        if result.rowcount:
            self.file_path(user_id, document_id).unlink(missing_ok=True)
        return result.rowcount > 0

    def chunks(self, user_id: str, collection_id: str) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("""
              SELECT ch.*,d.filename FROM chunks ch JOIN documents d ON d.id=ch.document_id
              WHERE ch.user_id=? AND ch.collection_id=? ORDER BY d.created_at,ch.ordinal
            """, (user_id, collection_id)).fetchall()
        return [dict(row) for row in rows]

    def search_fts(self, user_id: str, collection_id: str, match: str, limit: int = 30) -> list[str]:
        with self.connect() as db:
            rows = db.execute("""
              SELECT ch.id FROM chunk_fts f
              JOIN chunks ch ON ch.rowid=f.rowid
              WHERE chunk_fts MATCH ? AND ch.user_id=? AND ch.collection_id=?
              ORDER BY bm25(chunk_fts) LIMIT ?
            """, (match, user_id, collection_id, limit)).fetchall()
        return [row["id"] for row in rows]

    def messages(self, user_id: str, collection_id: str) -> list[dict]:
        with self.connect() as db:
            rows = db.execute("SELECT * FROM messages WHERE user_id=? AND collection_id=? ORDER BY created_at,id", (user_id, collection_id)).fetchall()
        return [{**dict(row), "sources": json.loads(row["sources"])} for row in rows]

    def add_message(self, user_id: str, collection_id: str, role: str, body: str, sources: list | None = None, answer_mode: str = "") -> dict:
        item = {"id": uid(), "user_id": user_id, "collection_id": collection_id, "role": role,
                "body": body, "sources": sources or [], "answer_mode": answer_mode, "created_at": now()}
        with self.connect() as db:
            db.execute("INSERT INTO messages VALUES(?,?,?,?,?,?,?,?)",
                       (item["id"], user_id, collection_id, role, body, json.dumps(item["sources"]), answer_mode, item["created_at"]))
            db.execute("UPDATE collections SET updated_at=? WHERE id=? AND user_id=?", (now(), collection_id, user_id))
        return item

    def clear_messages(self, user_id: str, collection_id: str) -> None:
        with self.connect() as db:
            db.execute("DELETE FROM messages WHERE user_id=? AND collection_id=?", (user_id, collection_id))
