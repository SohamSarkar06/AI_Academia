import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  runTransaction,
  serverTimestamp
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
const usernameInput = document.getElementById("username");
const saveBtn = document.getElementById("saveUsername");
const error = document.getElementById("error");

let currentUser = null;

// ================= AUTH GUARD =================
onAuthStateChanged(auth, (user) => {
  if (!user || !user.emailVerified) {
    location.href = "index.html";
    return;
  }
  currentUser = user;
});

// ================= SAVE USERNAME =================
saveBtn.addEventListener("click", async () => {
  const uname = usernameInput.value.trim().toLowerCase();

  if (!uname) {
    error.textContent = "Username cannot be empty";
    return;
  }

  if (!currentUser) {
    error.textContent = "Auth not ready. Try again.";
    return;
  }

  saveBtn.disabled = true;
  error.textContent = "";

  try {
    await runTransaction(db, async (tx) => {
      const unameRef = doc(db, "usernames", uname);
      const userRef = doc(db, "users", currentUser.uid);

      const unameSnap = await tx.get(unameRef);
      if (unameSnap.exists()) {
        throw new Error("Username already taken");
      }

      // Reserve username
      tx.set(unameRef, {
        uid: currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Save user profile
      tx.set(userRef, {
        username: uname,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

    // ✅ SUCCESS → DASHBOARD
    location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    error.textContent = err.message;
    saveBtn.disabled = false;
  }
});
