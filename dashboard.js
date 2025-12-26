pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= FIREBASE INIT =================
const app = initializeApp({
  apiKey: "AIzaSyCHIDINcpdA4whJbkNyA8y8yrXyS_PgNSc",
  authDomain: "aiforacademia.firebaseapp.com",
  projectId: "aiforacademia"
});

const auth = getAuth(app);
const db = getFirestore(app);

// ================= DOM =================
const userInfo = document.getElementById("userInfo");
const pdfInput = document.getElementById("pdfInput");
const summarizeBtn = document.getElementById("summarizeBtn");
const summaryOutput = document.getElementById("summaryOutput");
const historyList = document.getElementById("historyList");

// ================= AUTH GUARD =================
onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  userInfo.textContent = `👤 ${snap.data().username}`;

  loadHistory(user.uid);
});

// ================= PDF → SUMMARY =================
summarizeBtn.onclick = async () => {
  const file = pdfInput.files[0];
  if (!file) {
    alert("Upload a PDF");
    return;
  }

  summarizeBtn.disabled = true;
  summaryOutput.innerHTML = "<li>⏳ Summarizing...</li>";

  const text = await extractTextFromPDF(file);
  const summaryPoints = await callAISummarizer(text);

  summaryOutput.innerHTML = "";
  summaryPoints.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    summaryOutput.appendChild(li);
  });

  // ✅ SAVE WITH FILE NAME + CLIENT TIME
  await addDoc(collection(db, "summaries"), {
    uid: auth.currentUser.uid,
    fileName: file.name,
    points: summaryPoints,
    createdAt: serverTimestamp(),
    clientTime: Date.now()
  });

  loadHistory(auth.currentUser.uid);
  summarizeBtn.disabled = false;
};

// ================= HISTORY LOADER =================
async function loadHistory(uid) {
  historyList.innerHTML = "<li>Loading...</li>";

  const q = query(
    collection(db, "summaries"),
    where("uid", "==", uid)
  );

  const snap = await getDocs(q);

  const docs = [];
  snap.forEach(d => docs.push(d.data()));

  // ✅ CLIENT-SIDE SORT (NEW FIRST)
  docs.sort((a, b) => (b.clientTime || 0) - (a.clientTime || 0));

  historyList.innerHTML = "";

  docs.forEach(data => {
    const li = document.createElement("li");

    const name = data.fileName ?? "Untitled PDF";
    const time = data.createdAt
      ? data.createdAt.toDate().toLocaleString()
      : "Earlier";

    li.textContent = `📄 ${name}`;
    li.title = `Summarized on ${time}`;

    li.onclick = () => {
      summaryOutput.innerHTML = "";
      data.points.forEach(p => {
        const item = document.createElement("li");
        item.textContent = p;
        summaryOutput.appendChild(item);
      });
    };

    historyList.appendChild(li);
  });

  if (!historyList.children.length) {
    historyList.innerHTML = "<li>No summaries yet</li>";
  }
}

// ================= PDF TEXT EXTRACT =================
async function extractTextFromPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(i => i.str).join(" ") + "\n";
  }

  return fullText;
}

// ================= AI CALL =================
async function callAISummarizer(text) {
  const res = await fetch("http://127.0.0.1:8000/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();
  return data.points;
}
 