from langchain_community.vectorstores import Chroma
import tempfile


def create_vector_db(chunks, embeddings):
    temp_dir = tempfile.mkdtemp()

    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=temp_dir
    )

    return vectordb