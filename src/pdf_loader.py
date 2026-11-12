from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document

from typing import List

def load_pdf(pdf_path: str) -> List[Document]:
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()
    return pages