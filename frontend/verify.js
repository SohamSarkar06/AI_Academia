


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyCHIDINcpdA4whJbkNyA8y8yrXyS_PgNSc",
  authDomain: "aiforacademia.firebaseapp.com",
  projectId: "aiforacademia"
});

const auth = getAuth(app);

reload.onclick = async () => {
  await auth.currentUser.reload();
  if (auth.currentUser.emailVerified) {
    location.href = "username.html";
  } else {
    alert("Email not verified yet");
  }
};
