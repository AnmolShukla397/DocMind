from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .documents import MAX_FILE_BYTES, extract_pages, make_chunks, safe_name
from .rag import Ollama, answer_question, embed_chunks, run_tool
from .store import Store, verify_password

ROOT = Path(__file__).resolve().parents[1]
COOKIE = "docmind_session"


class SignUp(BaseModel):
    name: str
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


class Named(BaseModel):
    title: str


class Question(BaseModel):
    question: str


class DeleteAccount(BaseModel):
    password: str


def create_app(store: Store | None = None, ollama: Ollama | None = None) -> FastAPI:
    db = store or Store()
    engine = ollama or Ollama()
    app = FastAPI(title="DocMind", version="2.0")
    app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
                       allow_credentials=True, allow_methods=["GET", "POST", "PATCH", "DELETE"],
                       allow_headers=["Content-Type"])

    def current_user(request: Request) -> dict:
        user = db.session_user(request.cookies.get(COOKIE))
        if not user:
            raise HTTPException(401, "Your session expired. Please sign in again.")
        return user

    def owned_collection(user_id: str, collection_id: str) -> dict:
        collection = db.collection(user_id, collection_id)
        if not collection:
            raise HTTPException(404, "Collection not found.")
        return collection

    def set_cookie(response: Response, request: Request, token: str) -> None:
        secure = request.url.scheme == "https" or os.getenv("DOCMIND_SECURE_COOKIE") == "1"
        response.set_cookie(COOKIE, token, httponly=True, secure=secure, samesite="strict",
                            max_age=8 * 60 * 60, path="/")

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "service": "DocMind"}

    @app.get("/api/status")
    def status(user: dict = Depends(current_user)) -> dict:
        return engine.status()

    @app.post("/api/auth/signup")
    def signup(payload: SignUp, request: Request, response: Response) -> dict:
        email = payload.email.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(422, "Enter a valid email address.")
        if len(payload.name.strip()) < 2 or len(payload.name.strip()) > 80:
            raise HTTPException(422, "Enter your name (2–80 characters).")
        if len(payload.password) < 8 or len(payload.password) > 256:
            raise HTTPException(422, "Use a password of 8–256 characters.")
        try:
            user = db.create_user(email, payload.name, payload.password)
        except sqlite3.IntegrityError as exc:
            raise HTTPException(409, "An account with that email already exists.") from exc
        set_cookie(response, request, db.new_session(user["id"]))
        return {"id": user["id"], "email": user["email"], "name": user["name"]}

    @app.post("/api/auth/login")
    def login(payload: Login, request: Request, response: Response) -> dict:
        try:
            user = db.authenticate(payload.email, payload.password)
        except ValueError as exc:
            raise HTTPException(429, str(exc)) from exc
        if not user:
            raise HTTPException(401, "Email or password was not recognized.")
        set_cookie(response, request, db.new_session(user["id"]))
        return user

    @app.post("/api/auth/logout")
    def logout(request: Request, response: Response) -> dict:
        db.logout(request.cookies.get(COOKIE))
        response.delete_cookie(COOKIE, path="/")
        return {"ok": True}

    @app.get("/api/auth/session")
    def session(user: dict = Depends(current_user)) -> dict:
        return user

    @app.get("/api/collections")
    def collections(user: dict = Depends(current_user)) -> list[dict]:
        return db.collections(user["id"])

    @app.post("/api/collections")
    def new_collection(payload: Named, user: dict = Depends(current_user)) -> dict:
        title = payload.title.strip()
        if not 2 <= len(title) <= 80:
            raise HTTPException(422, "Give the collection a name of 2–80 characters.")
        if len(db.collections(user["id"])) >= 50:
            raise HTTPException(422, "An account can hold up to 50 collections.")
        return db.create_collection(user["id"], title)

    @app.patch("/api/collections/{collection_id}")
    def rename_collection(collection_id: str, payload: Named, user: dict = Depends(current_user)) -> dict:
        title = payload.title.strip()
        if not 2 <= len(title) <= 80:
            raise HTTPException(422, "Give the collection a name of 2–80 characters.")
        if not db.rename_collection(user["id"], collection_id, title):
            raise HTTPException(404, "Collection not found.")
        return db.collection(user["id"], collection_id) or {}

    @app.delete("/api/collections/{collection_id}")
    def delete_collection(collection_id: str, user: dict = Depends(current_user)) -> dict:
        if not db.delete_collection(user["id"], collection_id):
            raise HTTPException(404, "Collection not found.")
        return {"ok": True}

    @app.get("/api/collections/{collection_id}/documents")
    def documents(collection_id: str, user: dict = Depends(current_user)) -> list[dict]:
        owned_collection(user["id"], collection_id)
        return db.documents(user["id"], collection_id)

    @app.post("/api/collections/{collection_id}/documents")
    async def upload_document(collection_id: str, file: UploadFile = File(...), user: dict = Depends(current_user)) -> dict:
        owned_collection(user["id"], collection_id)
        if len(db.documents(user["id"], collection_id)) >= 40:
            raise HTTPException(422, "A collection can hold up to 40 documents.")
        content = await file.read(MAX_FILE_BYTES + 1)
        filename = safe_name(file.filename or "Untitled")
        try:
            pages, mime = extract_pages(filename, content)
            chunks = make_chunks(pages)
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        if len(chunks) > 1500:
            raise HTTPException(422, "This document creates too many passages. Split it into smaller parts.")
        embedded = embed_chunks(chunks, engine)
        item = db.save_document(user["id"], collection_id, filename, mime, content, pages, chunks)
        return {**item, "embedding_mode": "Ollama" if embedded else "keyword index"}

    @app.delete("/api/documents/{document_id}")
    def delete_document(document_id: str, user: dict = Depends(current_user)) -> dict:
        if not db.delete_document(user["id"], document_id):
            raise HTTPException(404, "Document not found.")
        return {"ok": True}

    @app.get("/api/documents/{document_id}/file")
    def original_document(document_id: str, user: dict = Depends(current_user)):
        document = db.document(user["id"], document_id)
        if not document:
            raise HTTPException(404, "Document not found.")
        path = db.file_path(user["id"], document_id)
        if not path.exists():
            raise HTTPException(404, "The original file is unavailable.")
        return FileResponse(path, media_type=document["mime"], filename=document["filename"],
                            content_disposition_type="inline")

    @app.get("/api/collections/{collection_id}/messages")
    def messages(collection_id: str, user: dict = Depends(current_user)) -> list[dict]:
        owned_collection(user["id"], collection_id)
        return db.messages(user["id"], collection_id)

    @app.delete("/api/collections/{collection_id}/messages")
    def clear_messages(collection_id: str, user: dict = Depends(current_user)) -> dict:
        owned_collection(user["id"], collection_id)
        db.clear_messages(user["id"], collection_id)
        return {"ok": True}

    @app.post("/api/collections/{collection_id}/ask")
    def ask(collection_id: str, payload: Question, user: dict = Depends(current_user)) -> dict:
        owned_collection(user["id"], collection_id)
        question = payload.question.strip()
        if not 3 <= len(question) <= 800:
            raise HTTPException(422, "Ask a question of 3–800 characters.")
        history = db.messages(user["id"], collection_id)
        db.add_message(user["id"], collection_id, "user", question)
        result = answer_question(db, user["id"], collection_id, question, history[-6:], engine)
        result["message"] = db.add_message(user["id"], collection_id, "assistant", result["answer"],
                                            result["sources"], result["answer_mode"])
        return result

    @app.post("/api/collections/{collection_id}/tools/{kind}")
    def tool(collection_id: str, kind: str, user: dict = Depends(current_user)) -> dict:
        owned_collection(user["id"], collection_id)
        if kind not in {"summary", "flashcards", "quiz", "research"}:
            raise HTTPException(404, "Tool not found.")
        return run_tool(db, user["id"], collection_id, kind, engine)

    @app.get("/api/account/export")
    def account_export(user: dict = Depends(current_user)) -> dict:
        collections = db.collections(user["id"])
        return {"profile": user, "collections": [
            {**item, "documents": db.documents(user["id"], item["id"]),
             "messages": db.messages(user["id"], item["id"])} for item in collections
        ]}

    @app.delete("/api/account")
    def delete_account(payload: DeleteAccount, response: Response, user: dict = Depends(current_user)) -> dict:
        with db.connect() as connection:
            row = connection.execute("SELECT password_hash FROM users WHERE id=?", (user["id"],)).fetchone()
            if not row or not verify_password(payload.password, row["password_hash"]):
                raise HTTPException(403, "Password was not recognized.")
            document_ids = [item["id"] for item in connection.execute("SELECT id FROM documents WHERE user_id=?", (user["id"],))]
            connection.execute("DELETE FROM users WHERE id=?", (user["id"],))
        for document_id in document_ids:
            db.file_path(user["id"], document_id).unlink(missing_ok=True)
        response.delete_cookie(COOKIE, path="/")
        return {"ok": True}

    dist = ROOT / "web" / "dist"
    if dist.exists():
        def frontend_file(path: Path) -> FileResponse:
            headers = {"Cache-Control": "no-store"} if path.name == "index.html" else None
            return FileResponse(path, headers=headers)

        @app.get("/{full_path:path}")
        def frontend(full_path: str):
            if full_path.startswith("api/"):
                raise HTTPException(404, "Not found.")
            requested = (dist / full_path).resolve()
            if requested.is_file() and requested.is_relative_to(dist.resolve()):
                return frontend_file(requested)
            if "." in Path(full_path).name:
                raise HTTPException(404, "Asset not found.")
            return frontend_file(dist / "index.html")

    return app


app = create_app()
