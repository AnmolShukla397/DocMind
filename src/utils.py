import datetime


def export_chat(messages):

    filename = (
        f"chat_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    )

    content = ""

    for msg in messages:
        content += (
            f"{msg['role'].upper()}:\n"
            f"{msg['content']}\n\n"
        )

    return filename, content