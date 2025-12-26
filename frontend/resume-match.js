const resumeInput = document.getElementById("resumeInput");
const jobInput = document.getElementById("jobInput");
const analyzeBtn = document.getElementById("analyzeBtn");

const resumeSkillsEl = document.getElementById("resumeSkills");
const missingSkillsEl = document.getElementById("missingSkills");
const atsScoreEl = document.getElementById("atsScore");
const atsCard = document.getElementById("atsCard");
const qualificationEl = document.getElementById("qualification"); // ✅ ADDED

let extractedSkills = [];
let atsValue = null;
let resumeUploaded = false;
let analysisCompleted = false;

/* ===============================
   FETCH WITHOUT LYING TO USER
================================ */
function fetchWithSoftTimeout(url, options, softMs = 15000, hardMs = 60000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    options.signal = controller.signal;

    const hardTimer = setTimeout(() => {
      controller.abort();
      reject(new Error("HARD_TIMEOUT"));
    }, hardMs);

    const softTimer = setTimeout(() => {
      resumeSkillsEl.innerHTML =
        "<li style='color:#aaa'>Still processing…</li>";
    }, softMs);

    fetch(url, options)
      .then(res => {
        clearTimeout(softTimer);
        clearTimeout(hardTimer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(softTimer);
        clearTimeout(hardTimer);
        reject(err);
      });
  });
}

/* ===============================
   PDF TEXT EXTRACTION (MANUAL)
================================ */
async function extractPdfText(file) {
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(it => it.str).join(" ").toLowerCase() + " ";
  }
  return text;
}

/* ===============================
   QUALIFICATION DETECTION (RULE-BASED)
================================ */
function detectQualification(text) {
  if (text.includes("phd")) return "PhD";

  if (
    text.includes("master") ||
    text.includes("m.tech") ||
    text.includes("mtech") ||
    text.includes("m.sc") ||
    text.includes("msc") ||
    text.includes("mba")
  ) return "Master’s";

  if (
    text.includes("bachelor") ||
    text.includes("b.tech") ||
    text.includes("btech") ||
    text.includes("b.sc") ||
    text.includes("bsc")
  ) return "Bachelor’s";

  if (text.includes("diploma")) return "Diploma";

  return "Not detected";
}

/* ===============================
   RESUME UPLOAD
================================ */
resumeInput.addEventListener("change", async () => {
  const file = resumeInput.files[0];
  if (!file) return;

  resumeUploaded = true;
  analysisCompleted = false;

  resumeSkillsEl.innerHTML = "<li>Analyzing resume…</li>";
  atsScoreEl.textContent = "Processing";
  missingSkillsEl.innerHTML = "<li>—</li>";
  qualificationEl.textContent = "Detecting…"; // ✅ ADDED

  const formData = new FormData();
  formData.append("file", file);

  try {
    // ✅ MANUAL QUALIFICATION EXTRACTION
    const pdfText = await extractPdfText(file);
    qualificationEl.textContent = detectQualification(pdfText);

    const res = await fetchWithSoftTimeout(
      "http://localhost:8000/analyze-resume",
      { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error("SERVER_ERROR");

    const data = await res.json();
    extractedSkills = data.skills || [];
    atsValue = data.ats_score ?? 0;
    analysisCompleted = true;

    resumeSkillsEl.innerHTML = "";

    if (extractedSkills.length === 0) {
      resumeSkillsEl.innerHTML = "<li>No skills detected</li>";
    } else {
      extractedSkills.forEach(skill => {
        const li = document.createElement("li");
        li.textContent = skill;
        resumeSkillsEl.appendChild(li);
      });
    }

  } catch (err) {
    if (err.message === "HARD_TIMEOUT") {
      resumeSkillsEl.innerHTML =
        "<li style='color:red'>Resume analysis failed</li>";
      atsScoreEl.textContent = "—";
    }
    // ⚠️ soft timeout does NOT fail
  }
});

/* ===============================
   ATS CLICK (ONLY WHEN READY)
================================ */
atsCard.addEventListener("click", () => {
  if (!resumeUploaded) {
    atsScoreEl.textContent = "Upload resume";
    return;
  }

  if (!analysisCompleted) {
    atsScoreEl.textContent = "Processing";
    return;
  }

  atsScoreEl.textContent = atsValue + "%";
});

/* ===============================
   JOB MATCH
================================ */
analyzeBtn.addEventListener("click", async () => {
  if (!resumeUploaded) {
    alert("Please upload resume first");
    return;
  }

  if (!analysisCompleted) {
    alert("Resume still processing. Please wait.");
    return;
  }

  const jobText = jobInput.value.trim();
  if (!jobText) {
    alert("Paste job description");
    return;
  }

  missingSkillsEl.innerHTML = "<li>Matching…</li>";

  try {
    const res = await fetch("http://localhost:8000/match-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_skills: extractedSkills,
        job_text: jobText
      })
    });

    if (!res.ok) throw new Error();

    const data = await res.json();
    const missing = data.missing_skills || [];

    missingSkillsEl.innerHTML = "";

    if (missing.length === 0) {
      missingSkillsEl.innerHTML = "<li>No missing skills 🎉</li>";
    } else {
      missing.forEach(skill => {
        const li = document.createElement("li");
        li.textContent = skill;
        missingSkillsEl.appendChild(li);
      });
    }

  } catch {
    missingSkillsEl.innerHTML =
      "<li style='color:red'>Job match failed</li>";
  }
});
