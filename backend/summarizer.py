from transformers import pipeline
import nltk
from nltk.tokenize import sent_tokenize

nltk.download("punkt")
nltk.download("punkt_tab")

# FAST + STRONG MODEL
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn",
    tokenizer="facebook/bart-large-cnn",
    device=-1  # CPU
)

MAX_CHUNK_WORDS = 350


def chunk_text(text):
    sentences = sent_tokenize(text)
    chunks = []
    current_chunk = []
    word_count = 0

    for sentence in sentences:
        words = sentence.split()

        if word_count + len(words) > MAX_CHUNK_WORDS:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            word_count = 0

        current_chunk.append(sentence)
        word_count += len(words)

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def summarize_text(text):
    chunks = chunk_text(text)

    bullets = []

    for chunk in chunks:
        try:
            summary = summarizer(
                chunk,
                max_length=90,
                min_length=40,
                do_sample=False
            )[0]["summary_text"]

            bullets.extend(sent_tokenize(summary))

        except Exception:
            continue

    # Remove duplicates & limit size
    unique = list(dict.fromkeys(bullets))
    return unique[:40]  # exam-friendly limit
