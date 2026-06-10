from langchain_ollama import ChatOllama


def build_llm(model_name: str):
    return ChatOllama(
        model=model_name,
        temperature=0
    )


def ask_question(llm, retriever, question: str):

    docs = retriever.invoke(question)

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
You are DocMind.

Answer ONLY from the provided context.

Context:
{context}

Question:
{question}

Answer:
"""

    response = llm.invoke(prompt)

    return {
        "answer": response.content,
        "sources": docs
    }


def summarize_document(llm, retriever):

    docs = retriever.invoke("Summarize the document")

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
Generate:

1. Summary
2. Executive Summary
3. Key Takeaways

Document:
{context}
"""

    return llm.invoke(prompt).content


def generate_flashcards(llm, retriever):

    docs = retriever.invoke("Important concepts")

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
Create 10 flashcards.

Format:

Q:
A:

Document:
{context}
"""

    return llm.invoke(prompt).content


def generate_quiz(llm, retriever):

    docs = retriever.invoke("Important concepts")

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
Generate 10 MCQs.

Include answers.

Document:
{context}
"""

    return llm.invoke(prompt).content


def research_analysis(llm, retriever):

    docs = retriever.invoke("Research paper")

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
Extract:

- Objectives
- Methodology
- Results
- Conclusions

Document:
{context}
"""

    return llm.invoke(prompt).content