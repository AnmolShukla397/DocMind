import os
import io
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from backend.api import create_app
from backend.documents import extract_pages, make_chunks
from backend.store import Store


class OfflineModel:
    def status(self):
        return {"connected": False, "chat_ready": False, "embed_ready": False,
                "chat_model": "offline", "embed_model": "offline"}

    def embed(self, texts):
        return None

    def generate(self, prompt):
        return None


class LocalModel(OfflineModel):
    def status(self):
        return {"connected": True, "chat_ready": True, "embed_ready": True,
                "chat_model": "test-chat", "embed_model": "test-embed"}

    def embed(self, texts):
        return [[1.0, 0.0] if "water" in text.lower() else [0.0, 1.0] for text in texts]

    def generate(self, prompt):
        return "Water quality improved by 28 percent [1]."


class DocMindWebTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        os.environ["DOCMIND_FILES_PATH"] = str(Path(self.temp.name) / "files")
        self.store = Store(Path(self.temp.name) / "docmind.sqlite3")
        self.alice = TestClient(create_app(self.store, OfflineModel()))
        self.bob = TestClient(create_app(self.store, OfflineModel()))

    def tearDown(self):
        self.alice.close()
        self.bob.close()
        os.environ.pop("DOCMIND_FILES_PATH", None)
        self.temp.cleanup()

    def signup(self, client, name, email):
        response = client.post("/api/auth/signup", json={"name": name, "email": email, "password": "correct-horse-44"})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def upload(self, client, collection_id):
        response = client.post(f"/api/collections/{collection_id}/documents", files={
            "file": ("research.txt", b"The river study measured a 28 percent improvement in water quality after three filtration trials. The authors recommend further seasonal monitoring to validate the result.", "text/plain")
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_private_document_workflow_and_tools(self):
        self.signup(self.alice, "Alice Smith", "alice@example.com")
        collection = self.alice.get("/api/collections").json()[0]
        document = self.upload(self.alice, collection["id"])
        self.assertEqual(document["chunk_count"], 1)

        answer = self.alice.post(f"/api/collections/{collection['id']}/ask", json={
            "question": "What improvement did the river study measure?"
        })
        self.assertEqual(answer.status_code, 200, answer.text)
        self.assertIn("28 percent improvement", answer.json()["answer"])
        self.assertEqual(answer.json()["sources"][0]["filename"], "research.txt")
        self.assertIn("[1]", answer.json()["answer"])
        self.assertEqual(len(self.alice.get(f"/api/collections/{collection['id']}/messages").json()), 2)

        no_evidence = self.alice.post(f"/api/collections/{collection['id']}/ask", json={
            "question": "What does the study say about lunar geology?"
        })
        self.assertEqual(no_evidence.json()["answer_mode"], "no evidence")

        for kind in ("summary", "flashcards", "quiz", "research"):
            result = self.alice.post(f"/api/collections/{collection['id']}/tools/{kind}")
            self.assertEqual(result.status_code, 200, result.text)
            self.assertTrue(result.json()["answer"])
            self.assertTrue(result.json()["sources"])

        original = self.alice.get(f"/api/documents/{document['id']}/file")
        self.assertEqual(original.status_code, 200)
        self.assertIn(b"river study", original.content)
        self.assertEqual(self.alice.delete(f"/api/documents/{document['id']}").status_code, 200)
        self.assertEqual(self.alice.get(f"/api/documents/{document['id']}/file").status_code, 404)
        self.assertEqual(self.store.search_fts(self.alice.get('/api/auth/session').json()['id'], collection['id'], 'river'), [])

    def test_account_isolation_and_authentication(self):
        self.assertEqual(self.alice.get("/api/collections").status_code, 401)
        self.assertEqual(self.alice.post("/api/auth/signup", json={"name": "X", "email": "bad", "password": "short"}).status_code, 422)
        self.signup(self.alice, "Alice Smith", "alice@example.com")
        self.signup(self.bob, "Bob Jones", "bob@example.com")
        collection = self.alice.get("/api/collections").json()[0]
        document = self.upload(self.alice, collection["id"])
        self.assertEqual(self.bob.get(f"/api/collections/{collection['id']}/documents").status_code, 404)
        self.assertEqual(self.bob.get(f"/api/documents/{document['id']}/file").status_code, 404)
        self.assertEqual(self.bob.delete(f"/api/documents/{document['id']}").status_code, 404)
        self.assertEqual(self.bob.post(f"/api/collections/{collection['id']}/ask", json={"question": "What is measured?"}).status_code, 404)
        self.assertEqual(len(self.bob.get("/api/collections").json()), 1)
        self.assertEqual(self.alice.post("/api/auth/logout").status_code, 200)
        self.assertEqual(self.alice.get("/api/auth/session").status_code, 401)
        self.assertEqual(self.alice.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.alice.post("/api/auth/login", json={"email": "alice@example.com", "password": "correct-horse-44"}).status_code, 200)
        self.assertEqual(self.alice.request("DELETE", "/api/account", json={"password": "wrong"}).status_code, 403)
        self.assertEqual(self.alice.request("DELETE", "/api/account", json={"password": "correct-horse-44"}).status_code, 200)
        self.assertEqual(self.alice.get("/api/auth/session").status_code, 401)

    def test_pdf_and_docx_keep_readable_passages(self):
        import fitz
        from docx import Document

        pdf = fitz.open()
        page = pdf.new_page()
        page.insert_text((70, 90), "The coastal survey recorded seven turtle nests during the spring count.")
        pdf_bytes = pdf.tobytes()
        pdf.close()
        pages, mime = extract_pages("coastal.pdf", pdf_bytes)
        self.assertEqual(mime, "application/pdf")
        self.assertIn("seven turtle nests", pages[0][1])
        self.assertEqual(make_chunks(pages)[0]["page"], 1)

        document = Document()
        document.add_paragraph("The same coastal survey used weekly observation transects.")
        buffer = io.BytesIO()
        document.save(buffer)
        docx_pages, _ = extract_pages("coastal.docx", buffer.getvalue())
        self.assertIn("weekly observation transects", docx_pages[0][1])

    def test_hybrid_retrieval_and_generated_citations(self):
        client = TestClient(create_app(self.store, LocalModel()))
        try:
            self.signup(client, "Model Tester", "model@example.com")
            collection = client.get("/api/collections").json()[0]
            item = self.upload(client, collection["id"])
            self.assertEqual(item["embedding_mode"], "Ollama")
            response = client.post(f"/api/collections/{collection['id']}/ask", json={
                "question": "What happened to water quality?"
            })
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["retrieval_mode"], "hybrid")
            self.assertEqual(response.json()["answer_mode"], "Ollama")
            self.assertEqual(response.json()["sources"][0]["label"], "[1]")
        finally:
            client.close()


if __name__ == "__main__":
    unittest.main()
