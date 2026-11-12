import json

def export_chat(history):

    with open(
        "chat_exports/chat_history.json",
        "w"
    ) as f:
        json.dump(history, f, indent=4)