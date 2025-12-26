from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# -------- EXISTING FEATURES --------
from summarizer import summarize_text
from ai_intent import extract_academic_intent
from web_search import search_study_material

# -------- RESUME ML --------
from resume_ml import (
    extract_text_from_pdf,
    extract_skills_ml,
    calculate_ats
)

# -------- APP INIT --------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- MODELS --------
class PDFText(BaseModel):
    text: str

class JobPayload(BaseModel):
    resume_skills: list
    job_text: str

# -------- ROUTES --------

@app.post("/summarize")
def summarize(payload: PDFText):
    if len(payload.text) < 300:
        return {"points": ["PDF text too short or unreadable"]}

    points = summarize_text(payload.text)
    return {"points": points}


@app.post("/ai-chat")
def ai_chat(payload: PDFText):
    intent = extract_academic_intent(payload.text)
    resources = search_study_material(intent["search_query"])
    return {
        "intent": intent,
        "resources": resources
    }


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    try:
        text = extract_text_from_pdf(file.file)

        if not text or len(text) < 50:
            return {
                "skills": [],
                "ats_score": 0
            }

        skills = extract_skills_ml(text)
        ats = calculate_ats(text, skills)

        return {
            "skills": skills,
            "ats_score": ats
        }

    except Exception as e:
        # 🔥 NEVER crash frontend
        return {
            "skills": [],
            "ats_score": 0
        }

from skills_db import SKILLS
@app.post("/match-job")
async def match_job(payload: JobPayload):
    resume_skills = payload.resume_skills
    job_text = payload.job_text.lower()

    job_skills = []
    for skill in SKILLS:
        if skill.lower() in job_text:
            job_skills.append(skill)

    missing_skills = [
        skill for skill in job_skills
        if skill not in resume_skills
    ]

    return {
        "missing_skills": sorted(set(missing_skills))
    }
