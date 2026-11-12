from __future__ import annotations

import io
import re
import shutil
import subprocess
from pathlib import Path

MAX_FILE_BYTES = 15 * 1024 * 1024
MAX_PAGES = 120
MAX_TEXT_CHARS = 1_500_000
MAX_OCR_PAGES = 8
ALLOWED = {".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg"}


def safe_name(filename: str) -> str:
    name = filename.replace("\\", "/").split("/")[-1]
    name = "".join(char for char in name if char.isprintable()).strip()
    return name[:140] or "Untitled document"


def clean_text(value: str) -> str:
    value = value.replace("\x00", " ").replace("\r", "\n")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", value)
    return value.strip()


def _ocr(image: bytes) -> str:
    if not shutil.which("tesseract"):
        raise ValueError("This file needs OCR. Install Tesseract to read scanned pages or upload selectable text.")
    try:
        result = subprocess.run(
            ["tesseract", "stdin", "stdout", "-l", "eng", "--psm", "3"],
            input=image, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45, check=False
        )
    except subprocess.TimeoutExpired as exc:
        raise ValueError("OCR timed out. Try a clearer or smaller document.") from exc
    if result.returncode:
        raise ValueError("OCR could not read this image. Try a clearer scan.")
    return clean_text(result.stdout.decode("utf-8", errors="replace"))


def extract_pages(filename: str, content: bytes) -> tuple[list[tuple[int, str]], str]:
    if not content:
        raise ValueError("The selected file is empty.")
    if len(content) > MAX_FILE_BYTES:
        raise ValueError("Files must be 15 MB or smaller.")
    extension = Path(safe_name(filename)).suffix.lower()
    if extension not in ALLOWED:
        raise ValueError("Upload PDF, DOCX, TXT, MD, PNG, or JPG files.")

    pages: list[tuple[int, str]] = []
    if extension == ".pdf":
        if not content.startswith(b"%PDF"):
            raise ValueError("This file does not appear to be a valid PDF.")
        try:
            import fitz
            document = fitz.open(stream=content, filetype="pdf")
            if document.page_count > MAX_PAGES:
                raise ValueError(f"PDFs may have at most {MAX_PAGES} pages.")
            ocr_count = 0
            for index, page in enumerate(document):
                text = clean_text(page.get_text("text", sort=True))
                if len(text) < 35:
                    ocr_count += 1
                    if ocr_count > MAX_OCR_PAGES:
                        raise ValueError(f"Only the first {MAX_OCR_PAGES} scanned pages can be OCRed per PDF.")
                    image = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).tobytes("png")
                    text = _ocr(image)
                if text:
                    pages.append((index + 1, text))
            document.close()
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError("Could not read the PDF. Check that it is not encrypted or damaged.") from exc
        mime = "application/pdf"
    elif extension == ".docx":
        if not content.startswith(b"PK"):
            raise ValueError("This file does not appear to be a valid DOCX.")
        try:
            from docx import Document
            document = Document(io.BytesIO(content))
            parts = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
            for table in document.tables:
                for row in table.rows:
                    parts.append(" | ".join(cell.text.strip() for cell in row.cells))
            text = clean_text("\n".join(parts))
        except Exception as exc:
            raise ValueError("Could not read the DOCX. Check that it is not damaged.") from exc
        pages = [(1, text)] if text else []
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif extension in {".png", ".jpg", ".jpeg"}:
        text = _ocr(content)
        pages = [(1, text)] if text else []
        mime = "image/png" if extension == ".png" else "image/jpeg"
    else:
        text = clean_text(content.decode("utf-8-sig", errors="replace"))
        pages = [(1, text)] if text else []
        mime = "text/markdown" if extension == ".md" else "text/plain"

    if not pages:
        raise ValueError("No readable text was found. Try a clearer scan or a text-based file.")
    if sum(len(text) for _, text in pages) > MAX_TEXT_CHARS:
        raise ValueError("The extracted text is too large. Split the document and upload each part.")
    return pages, mime


def make_chunks(pages: list[tuple[int, str]], size: int = 1100, overlap: int = 180) -> list[dict]:
    chunks: list[dict] = []
    for page_number, content in pages:
        text = clean_text(content)
        start = 0
        while start < len(text):
            end = min(start + size, len(text))
            if end < len(text):
                break_at = max(text.rfind("\n\n", start + 550, end), text.rfind(". ", start + 550, end))
                if break_at > start + 550:
                    end = break_at + (2 if text[break_at:break_at + 2] == ". " else 0)
                else:
                    space = text.rfind(" ", start + 700, end)
                    if space > start + 700:
                        end = space
            part = text[start:end].strip()
            if part:
                chunks.append({"page": page_number, "ordinal": len(chunks) + 1, "text": part})
            if end >= len(text):
                break
            start = max(start + 1, end - overlap)
    return chunks
