from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def normalize_topics(topics):
    if len(topics) <= 1:
        return topics

    embeddings = embedder.encode(topics)

    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=1.1
    )
    labels = clustering.fit_predict(embeddings)

    clusters = {}
    for topic, label in zip(topics, labels):
        clusters.setdefault(label, []).append(topic)

    # Pick representative topic per cluster
    normalized = [min(cluster, key=len) for cluster in clusters.values()]
    return normalized
