def summarize_document(chain):

    prompt = """
    Create:

    1. Executive Summary
    2. Key Takeaways
    3. Important Concepts
    """

    result = chain.invoke({"question": prompt})

    return result["answer"]