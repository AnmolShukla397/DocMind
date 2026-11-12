import os
import tempfile
import unittest
from pathlib import Path

from backend.rag import _context, _has_supported_citations, _overview_sources, answer_question
from backend.store import Store


class ModelWithWrongNumber:
    def embed(self, texts):
        return None

    def generate(self, prompt):
        return "The trial improved completion time by 80 percent [1]."


class RagQualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        os.environ["DOCMIND_FILES_PATH"] = str(Path(self.temp.name) / "files")
        self.store = Store(Path(self.temp.name) / "docmind.sqlite3")
        user = self.store.create_user("reader@example.com", "Reader", "correct-horse-44")
        self.user_id = user["id"]
        self.collection_id = user["collections"][0]["id"]

    def tearDown(self):
        os.environ.pop("DOCMIND_FILES_PATH", None)
        self.temp.cleanup()

    def test_overview_samples_the_end_of_long_documents(self):
        chunks = [{"page": index, "ordinal": index,
                   "text": f"Section {index} describes an observation from the study."}
                  for index in range(1, 13)]
        self.store.save_document(self.user_id, self.collection_id, "study.txt", "text/plain",
                                 b"study", [(index, chunk["text"]) for index, chunk in enumerate(chunks, 1)], chunks)
        sources = _overview_sources(self.store, self.user_id, self.collection_id)
        self.assertEqual(len(sources), 8)
        self.assertEqual(sources[0]["page"], 1)
        self.assertEqual(sources[-1]["page"], 12)

    def test_context_keeps_every_source_within_budget(self):
        sources = [{"label": f"[{index}]", "filename": "study.txt", "page": index,
                    "text": "evidence " * 300} for index in range(1, 9)]
        context = _context(sources)
        self.assertLessEqual(len(context), 12_000)
        self.assertIn("[8] study.txt", context)

    def test_unsupported_numbers_fall_back_to_source_text(self):
        chunks = [{"page": 1, "ordinal": 1,
                   "text": "The trial improved completion time by 28 percent compared with baseline."}]
        self.store.save_document(self.user_id, self.collection_id, "trial.txt", "text/plain",
                                 b"trial", [(1, chunks[0]["text"])], chunks)
        result = answer_question(self.store, self.user_id, self.collection_id,
                                 "What percent improvement did the trial show?", [], ModelWithWrongNumber())
        self.assertEqual(result["answer_mode"], "evidence extract")
        self.assertIn("28 percent", result["answer"])
        self.assertNotIn("80 percent", result["answer"])
        self.assertFalse(_has_supported_citations("The result was 28 percent [2].", result["sources"]))


if __name__ == "__main__":
    unittest.main()
