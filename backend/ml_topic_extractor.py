from keybert import KeyBERT
from sentence_transformers import SentenceTransformer

# Universal academic embedding model
embedder = SentenceTransformer("all-MiniLM-L6-v2")
kw_model = KeyBERT(model=embedder)

def extract_topics(text: str, top_n=6):
    keywords = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 3),
        stop_words="english",
        top_n=top_n
    )
    return [k[0] for k in keywords]
