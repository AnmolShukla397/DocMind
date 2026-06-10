def research_summary(chain):

    prompt = """
    Extract:

    Objectives
    Methodology
    Results
    Conclusions
    """

    result = chain.invoke(
        {"question": prompt}
    )

    return result["answer"]