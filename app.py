import os
import streamlit as st

from src.pdf_loader import load_pdf
from src.chunking import create_chunks
from src.embeddings import get_embeddings
from src.vector_db import create_vector_db
from src.retriever import get_retriever

from src.rag_chain import (
    build_llm,
    ask_question,
    summarize_document,
    generate_flashcards,
    generate_quiz,
    research_analysis
)

from src.utils import export_chat

st.set_page_config(
    page_title="DocMind",
    page_icon="📚",
    layout="wide"
)

# ==========================================
# Session State
# ==========================================

if "messages" not in st.session_state:
    st.session_state.messages = []

if "llm" not in st.session_state:
    st.session_state.llm = None

if "retriever" not in st.session_state:
    st.session_state.retriever = None

if "docs_loaded" not in st.session_state:
    st.session_state.docs_loaded = False

# ==========================================
# Header
# ==========================================

st.title("📚 DocMind")
st.markdown(
    "### AI-Powered Document Intelligence Assistant"
)

# ==========================================
# Sidebar
# ==========================================

st.sidebar.title("⚙️ Controls")

model_name = st.sidebar.selectbox(
    "Select Model",
    [
        "llama3",
        "mistral",
        "gemma"
    ]
)

uploaded_files = st.sidebar.file_uploader(
    "Upload PDF Files",
    type=["pdf"],
    accept_multiple_files=True
)

if st.sidebar.button("🗑 Clear Chat"):
    st.session_state.messages = []
    st.rerun()

if st.sidebar.button("📤 Export Chat"):

    filename, content = export_chat(
        st.session_state.messages
    )

    st.sidebar.download_button(
        label="Download Chat",
        data=content,
        file_name=filename,
        mime="text/plain"
    )

# ==========================================
# PDF Processing
# ==========================================

if uploaded_files and not st.session_state.docs_loaded:

    with st.spinner("Processing PDFs..."):

        all_docs = []

        os.makedirs(
            "uploads",
            exist_ok=True
        )

        for file in uploaded_files:

            file_path = os.path.join(
                "uploads",
                file.name
            )

            with open(
                file_path,
                "wb"
            ) as f:

                f.write(
                    file.getbuffer()
                )

            docs = load_pdf(file_path)

            all_docs.extend(docs)

        chunks = create_chunks(all_docs)

        embeddings = get_embeddings()

        vectordb = create_vector_db(
            chunks,
            embeddings
        )

        retriever = get_retriever(
            vectordb
        )

        st.session_state.retriever = retriever

        st.session_state.llm = build_llm(
            model_name
        )

        st.session_state.docs_loaded = True

    st.sidebar.success(
        "Documents Processed Successfully"
    )

# ==========================================
# Tabs
# ==========================================

chat_tab, summary_tab, study_tab, research_tab = st.tabs(
    [
        "💬 Chat",
        "📄 Summary",
        "🎓 Study Assistant",
        "🔬 Research Assistant"
    ]
)

# ==========================================
# CHAT TAB
# ==========================================

with chat_tab:

    for message in st.session_state.messages:

        with st.chat_message(
            message["role"]
        ):

            st.markdown(
                message["content"]
            )

    question = st.chat_input(
        "Ask a question about your documents..."
    )

    if question:

        st.session_state.messages.append(
            {
                "role": "user",
                "content": question
            }
        )

        with st.chat_message("user"):
            st.markdown(question)

        if (
            st.session_state.llm is None
            or
            st.session_state.retriever is None
        ):

            answer = (
                "Please upload PDF documents first."
            )

            with st.chat_message(
                "assistant"
            ):
                st.markdown(answer)

        else:

            with st.chat_message(
                "assistant"
            ):

                with st.spinner(
                    "Thinking..."
                ):

                    response = ask_question(
                        st.session_state.llm,
                        st.session_state.retriever,
                        question
                    )

                    answer = response["answer"]

                    st.markdown(answer)

                    st.session_state.messages.append(
                        {
                            "role": "assistant",
                            "content": answer
                        }
                    )

                    st.divider()

                    st.subheader(
                        "📚 Sources"
                    )

                    for idx, doc in enumerate(
                        response["sources"],
                        start=1
                    ):

                        page = doc.metadata.get(
                            "page",
                            "Unknown"
                        )

                        source = doc.metadata.get(
                            "source",
                            "Unknown"
                        )

                        with st.expander(
                            f"Source {idx} | Page {page}"
                        ):

                            st.write(
                                f"Document: {source}"
                            )

                            st.write(
                                doc.page_content
                            )

# ==========================================
# SUMMARY TAB
# ==========================================

with summary_tab:

    st.header(
        "📄 Document Summary"
    )

    if st.button(
        "Generate Summary"
    ):

        if (
            st.session_state.llm
            and
            st.session_state.retriever
        ):

            with st.spinner(
                "Generating summary..."
            ):

                summary = summarize_document(
                    st.session_state.llm,
                    st.session_state.retriever
                )

                st.markdown(summary)

                st.download_button(
                    "⬇ Download Summary",
                    summary,
                    "summary.txt"
                )

# ==========================================
# STUDY TAB
# ==========================================

with study_tab:

    st.header(
        "🎓 Study Assistant"
    )

    col1, col2 = st.columns(2)

    with col1:

        if st.button(
            "Generate Flashcards"
        ):

            result = generate_flashcards(
                st.session_state.llm,
                st.session_state.retriever
            )

            st.markdown(result)

    with col2:

        if st.button(
            "Generate Quiz"
        ):

            result = generate_quiz(
                st.session_state.llm,
                st.session_state.retriever
            )

            st.markdown(result)

# ==========================================
# RESEARCH TAB
# ==========================================

with research_tab:

    st.header(
        "🔬 Research Assistant"
    )

    if st.button(
        "Analyze Research Paper"
    ):

        result = research_analysis(
            st.session_state.llm,
            st.session_state.retriever
        )

        st.markdown(result)