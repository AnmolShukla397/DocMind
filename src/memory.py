# src/memory.py

import streamlit as st


def initialize_chat_memory():
    """
    Initialize Streamlit session state for chat memory.
    """
    if "messages" not in st.session_state:
        st.session_state.messages = []# src/memory.py

