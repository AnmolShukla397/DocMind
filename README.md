# DocMind

DocMind is a private document research studio. Add source files to a library, ask questions, inspect the passages behind each answer, and turn reading into summaries, flashcards, quizzes, and research notes.

The new web app combines a React and Three.js interface with a FastAPI backend. The original Streamlit app and `src/` modules remain available for anyone using the earlier workflow.

## Run the web app

Requires Python 3.10+. The completed ZIP already includes the built frontend. Unzip it, then run these commands from the directory containing `DocMind`:

```bash
cd DocMind
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-web.txt
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**. Create an account in the browser. The backend creates `data/runtime/docmind.sqlite3` and stores uploaded files under `data/runtime/files/`. These paths are ignored by Git. The app works immediately in **evidence mode**, which extracts relevant source sentences without a model.

On Windows, activate the virtual environment with `.venv\Scripts\activate`. To rebuild the frontend from source, use Node.js 20+ and run `cd web`, `npm ci`, and `npm run build`. For live frontend development, run `npm run dev` inside `web/` while the API server is running. Vite proxies `/api` to port 8000.

## Enable local AI

Install [Ollama](https://ollama.com/), then run:

```bash
ollama pull llama3
ollama pull nomic-embed-text
ollama serve
```

When the models are available, DocMind stores local embeddings for new uploads, combines vector and full-text retrieval, and asks Ollama to compose cited answers. Without Ollama or when generation fails, it uses the evidence-only fallback. Documents uploaded before the embedding model was available remain searchable by full text; re-upload them to add embeddings.

Optional environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DOCMIND_DB_PATH` | `data/runtime/docmind.sqlite3` | SQLite database location |
| `DOCMIND_FILES_PATH` | `data/runtime/files/` | Original document storage |
| `DOCMIND_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server |
| `DOCMIND_CHAT_MODEL` | `llama3` | Chat model name |
| `DOCMIND_EMBED_MODEL` | `nomic-embed-text` | Embedding model name |
| `DOCMIND_SECURE_COOKIE` | automatic on HTTPS | Set to `1` behind a TLS proxy |

Scanned PDFs and PNG/JPG images require the `tesseract` command with English language data. Selectable-text PDFs, DOCX, TXT, and Markdown work without OCR. The upload limit is 15 MB per file, 120 PDF pages, 40 documents per library, and 50 libraries per account.

## What the web app includes

- A responsive, cinematic research story built around a continuous 3D source exhibit: textured records, a low-frequency shader atmosphere, a scan beam, drag and pointer response, three scroll-directed compositions, and interactive question-to-passage demonstrations. The account screen and research studio share its graphite, paper, and mineral-green visual system.
- A stable four-tool preview, a closing section explaining account controls, and public Privacy, Terms, and Accessibility pages. The privacy page describes the included app; the operator of a deployed instance is responsible for its hosting and backups.
- Browser signup and login, salted password hashes, rate-limited failed attempts, HttpOnly session cookies, idle expiry, account export and deletion.
- Private libraries, original-file storage, PDF/DOCX/text/Markdown/image extraction, page-aware chunks, SQLite FTS5 indexing, and optional Ollama embeddings.
- Source-labelled answers and a passage inspector linking to the original file. If retrieval finds no evidence, DocMind says so. Generated text with invalid source labels or numbers absent from its cited passages falls back to extractive evidence.
- Persistent conversations, source-backed summary, flashcards, quiz, research analysis, and Markdown downloads. Overview tools sample the beginning, middle, and end of long documents within the model's context budget.
- Keyboard-accessible controls, visible focus states, loading and error feedback, mobile navigation, and reduced-motion support.

The workbench is intended for a local or trusted installation. Use HTTPS and set `DOCMIND_SECURE_COOKIE=1` when deploying behind a reverse proxy. The files and database are stored on the server running DocMind, so choose that host according to your privacy needs. Automated answer citations point to retrieved passages; review the original before relying on a conclusion.

## Tests

```bash
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
cd web
npm run test:e2e
```

The browser test uses Chrome by default and starts the API on port 8765 if it is not running. Set `DOCMIND_BROWSER_CHANNEL` to another installed Playwright browser channel or `DOCMIND_PYTHON` to the Python binary containing the backend dependencies.

## Original Streamlit app

The previous UI is still available:

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

It uses the original `src/` implementation and its dependencies. The new web app uses the separate, leaner `requirements-web.txt` stack and a new account-scoped database.

## Project map

```text
app.py                  Original Streamlit entry point
src/                    Original document helpers
backend/api.py          FastAPI routes and session protection
backend/store.py        SQLite accounts, libraries, files and full-text index
backend/documents.py    Extraction, OCR and chunking
backend/rag.py          Retrieval, Ollama integration and evidence tools
web/src/                React interface, motion and 3D scene
tests/                  Backend workflow and isolation tests
web/e2e/                Browser workflow tests
```
