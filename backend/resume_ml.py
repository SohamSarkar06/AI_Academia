import pdfplumber
import spacy
from sentence_transformers import SentenceTransformer, util
from skills_db import SKILLS

# ================= LOAD MODELS (FAST & SAFE) =================

# ⚡ FAST spaCy model
nlp = spacy.load("en_core_web_sm")

# ⚡ FAST embedding model (already light)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Precompute skill embeddings ONCE
skill_embeddings = embedder.encode(
    SKILLS,
    convert_to_tensor=True,
    normalize_embeddings=True
)

# ================= PDF TEXT EXTRACTION =================

def extract_text_from_pdf(file):
    text_parts = []
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            txt = page.extract_text()
            if txt:
                text_parts.append(txt)
    return " ".join(text_parts)

# ================= SKILL EXTRACTION (FAST + SAFE) =================

def extract_skills_ml(text: str):
    if not text or len(text) < 50:
        return []

    found = set()
    text_l = text.lower()

    # 1️⃣ Direct keyword match (very fast)
    for skill in SKILLS:
        if skill.lower() in text_l:
            found.add(skill)

    # 2️⃣ ML semantic expansion (controlled)
    doc = nlp(text[:3000])  # 🔥 LIMIT TEXT SIZE

    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.lower().strip()

        if len(chunk_text) < 3:
            continue

        chunk_emb = embedder.encode(
            chunk_text,
            convert_to_tensor=True,
            normalize_embeddings=True
        )

        sims = util.cos_sim(chunk_emb, skill_embeddings)[0]

        for idx, score in enumerate(sims):
            if score > 0.6:
                found.add(SKILLS[idx])

    return sorted(found)

# ================= QUALIFICATION =================

def extract_qualification(text: str):
    t = text.lower()
    if "phd" in t:
        return "PhD"
    if "master" in t or "m.tech" in t or "msc" in t:
        return "Master's"
    if "b.tech" in t or "bachelor" in t or "bsc" in t:
        return "Bachelor's"
    return "Not detected"

# ================= ATS SCORE (FAST) =================

def calculate_ats(text: str, skills: list):
    score = 0
    t = text.lower()

    score += min(len(skills) * 4, 40)

    for section in ["skills", "projects", "education", "experience"]:
        if section in t:
            score += 6

    if extract_qualification(text) != "Not detected":
        score += 12

    if "project" in t:
        score += 8

    if 1200 <= len(text) <= 3500:
        score += 10

    return min(score, 100)
