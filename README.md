# 📚 DocMind

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10+-blue)
![LangChain](https://img.shields.io/badge/LangChain-RAG-green)
![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-black)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Database-orange)
![Streamlit](https://img.shields.io/badge/Streamlit-Frontend-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

### AI-Powered Document Intelligence Assistant using Retrieval-Augmented Generation (RAG)

Upload PDFs, chat with documents, generate summaries, create flashcards, extract research insights, and retrieve accurate answers with source citations using local LLMs.

</div>

---

## 🚀 Overview

DocMind is a production-ready AI-powered Document Intelligence Assistant that enables users to interact with PDF documents using natural language. Built using Retrieval-Augmented Generation (RAG), it combines semantic search, vector databases, and local Large Language Models to deliver accurate, context-aware responses grounded in uploaded documents.

The application supports multiple PDF uploads, conversational question answering, document summarization, study assistance, research analysis, source citations, and chat memory.

---

## ✨ Features

### Core Features

- 📄 Multi-PDF Upload Support
- 🔍 Semantic Search
- 🤖 RAG-based Question Answering
- 📚 Source Citations
- 💬 Chat History & Conversation Memory
- 🧠 Embedding Generation
- 🗄️ Chroma Vector Database
- ⚡ Local LLM Inference with Ollama
- 🎯 Multiple LLM Support

### Advanced Features

#### 📑 Document Summarization

Generate:

- Executive Summary
- Key Takeaways
- Important Concepts

#### 🎓 Study Assistant

Generate:

- Flashcards
- Quiz Questions
- Practice Questions
- Learning Notes

#### 🔬 Research Assistant

Extract:

- Objectives
- Methodology
- Results
- Conclusions

#### 📚 Citation Viewer

Display:

- Source Document
- Page Number
- Retrieved Chunk
- Supporting Evidence

#### 🤖 Multiple LLM Support

Choose from:

- Llama 3
- Mistral
- Gemma

#### 💾 Export Features

- Export Chat History
- Download Summaries
- Save Conversations

---

## 🏗️ Architecture

```text
                ┌──────────────────┐
                │    PDF Upload    │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Text Extraction  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Document Chunking│
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Embedding Model  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │    ChromaDB      │
                │ Vector Database  │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │    Retriever     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Context Injection│
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │   Ollama LLM     │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Final Response   │
                └──────────────────┘
```

---

## 📂 Project Structure

```text
DocMind/

│
├── app.py
├── requirements.txt
├── README.md
├── .env
├── .gitignore
│
├── data/
├── uploads/
├── vectorstore/
├── chat_exports/
│
├── assets/
│   ├── architecture.png
│   ├── screenshot1.png
│   └── screenshot2.png
│
├── docs/
│   └── project_report.pdf
│
└── src/
    │
    ├── pdf_loader.py
    ├── chunking.py
    ├── embeddings.py
    ├── vector_db.py
    ├── retriever.py
    ├── rag_chain.py
    ├── summarizer.py
    ├── study_assistant.py
    ├── research_assistant.py
    ├── memory.py
    ├── exporter.py
    ├── logger.py
    └── utils.py
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/DocMind.git

cd DocMind
```

### Create Virtual Environment

#### Windows

```bash
python -m venv venv

venv\Scripts\activate
```

#### Mac/Linux

```bash
python3 -m venv venv

source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Install Ollama

Download and install Ollama:

https://ollama.com

Verify installation:

```bash
ollama --version
```

### Pull Required Models

```bash
ollama pull llama3

ollama pull mistral

ollama pull gemma

ollama pull nomic-embed-text
```

### Configure Environment

Create a `.env` file:

```env
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_DB_PATH=vectorstore
```

---

## ▶️ Running the Application

Start Ollama:

```bash
ollama serve
```

Run Streamlit:

```bash
streamlit run app.py
```

Application will run at:

```text
http://localhost:8501
```

---

## 🖥️ User Workflow

1. Upload one or more PDF documents.
2. Text is extracted from PDFs.
3. Documents are chunked intelligently.
4. Embeddings are generated.
5. Chunks are stored in ChromaDB.
6. User asks a question.
7. Retriever finds relevant chunks.
8. Context is sent to the selected LLM.
9. AI generates an answer with citations.

---

## 🎯 Example Prompts

### General Questions

```text
Summarize this document.
```

```text
What are the key findings?
```

```text
Explain this report in simple terms.
```

### Study Mode

```text
Generate 20 flashcards from this PDF.
```

```text
Create a quiz from this document.
```

```text
What concepts should I study?
```

### Research Mode

```text
Extract the methodology used in this paper.
```

```text
What are the research objectives?
```

```text
Summarize the conclusions.
```

---

## 📸 Screenshots

### Home Page

_Add Screenshot Here_

### Chat Interface

_Add Screenshot Here_

### Citation Viewer

_Add Screenshot Here_

### Summary Panel

_Add Screenshot Here_

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|----------|
| Python | Backend Development |
| LangChain | RAG Orchestration |
| Ollama | Local LLM Inference |
| ChromaDB | Vector Database |
| Streamlit | Frontend Development |
| PyPDF | PDF Processing |
| Sentence Transformers | Embedding Generation |

---

## 🚀 Future Improvements

- Hybrid Search (BM25 + Vector Search)
- Re-ranking Pipeline
- OCR Support for Scanned PDFs
- Multi-modal PDF Understanding
- Docker Support
- FastAPI Backend
- User Authentication
- Cloud Deployment
- Knowledge Graph Generation
- Voice Assistant Integration
- Mobile Responsive UI
- Real-time Streaming Responses

---

## 📈 Skills Demonstrated

### Artificial Intelligence

- Retrieval-Augmented Generation (RAG)
- Large Language Models (LLMs)
- Semantic Search
- Vector Embeddings
- Natural Language Processing

### Software Engineering

- Modular Architecture
- Object-Oriented Programming
- Error Handling
- Logging
- Deployment

### Data Science

- Information Retrieval
- Vector Similarity Search
- Text Analytics
- Knowledge Extraction

### Full Stack Development

- Backend Development
- Frontend Development
- Database Integration
- AI System Design

---

## 💼 Resume Description

### Short Version

Built DocMind, an AI-powered Document Intelligence Assistant using LangChain, Ollama, ChromaDB, and Streamlit. Implemented Retrieval-Augmented Generation (RAG), semantic search, source citation tracking, document summarization, and conversational question answering over PDF documents.

### Detailed Version

Developed a production-grade AI Document Intelligence Assistant capable of processing multiple PDF documents and enabling natural language interaction using Retrieval-Augmented Generation (RAG). Integrated LangChain, ChromaDB, Ollama, and Streamlit to build an end-to-end system featuring semantic search, source-aware question answering, document summarization, research extraction, flashcard generation, quiz generation, and conversational memory.

---

## 🌟 Key Highlights

- Multi-PDF Document Chat
- Local LLM Deployment using Ollama
- Retrieval-Augmented Generation (RAG)
- ChromaDB Vector Search
- Study Assistant Features
- Research Paper Analysis
- Source Citation Tracking
- Conversation Memory
- Production-Ready Modular Architecture

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Anmol Shukla**

GitHub: https://github.com/yourusername

LinkedIn: https://linkedin.com/in/yourprofile

Email: your.email@example.com

---

⭐ If you found this project useful, consider giving it a star on GitHub.