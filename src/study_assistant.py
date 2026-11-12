def generate_flashcards(chain):

    prompt = """
    Create 15 flashcards from document.
    """

    result = chain.invoke(
        {"question": prompt}
    )

    return result["answer"]


def generate_quiz(chain):

    prompt = """
    Generate 10 MCQ questions with answers.
    """

    result = chain.invoke(
        {"question": prompt}
    )

    return result["answer"]