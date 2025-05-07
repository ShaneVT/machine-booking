// Auth state management
auth.onAuthStateChanged(user => {
  const adminBtn = document.getElementById('admin-btn');
  const userViewBtn = document.getElementById('user-view-btn');
  
  if (user) {
    // User is logged in
    if (adminBtn) adminBtn.classList.add('d-none');
    if (userViewBtn) userViewBtn.classList.remove('d-none');
  } else {
    // User is logged out
    if (adminBtn) adminBtn.classList.remove('d-none');
    if (userViewBtn) userViewBtn.classList.add('d-none');
    
    // Protect admin pages
    if (window.location.pathname.includes('admin.html')) {
      window.location.href = 'index.html';
    }
  }
});

// Admin login function
window.adminLogin = async (email, password) => {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    return true;
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + error.message);
    return false;
  }
};

// Logout function
window.logout = () => {
  auth.signOut()
    .then(() => window.location.reload())
    .catch(error => console.error("Logout error:", error));
};
