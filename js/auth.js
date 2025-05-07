import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

// Auth state listener
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  
  if (user) {
    // User is signed in
    if (path.includes('admin.html') && !user.email.endsWith('@admin.com')) {
      window.location.href = 'index.html';
    }
  } else {
    // No user signed in
    if (path.includes('admin.html')) {
      window.location.href = 'login.html';
    }
  }
});

// Login function
window.login = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return true;
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
};

// Logout function
window.logout = async () => {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Logout error:", error);
  }
};
