// Use the globally available auth instance
const auth = window.firebaseAuth || firebase.auth();

// Admin Login Function
function adminLogin(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => userCredential.user)
    .catch(error => {
      console.error("Login error:", error);
      throw error;
    });
}

// Logout Function
function logout() {
  return auth.signOut()
    .catch(error => {
      console.error("Logout error:", error);
      throw error;
    });
}

// Password Reset Function
function sendPasswordReset(email) {
  return auth.sendPasswordResetEmail(email)
    .catch(error => {
      console.error("Password reset error:", error);
      throw error;
    });
}

// Auth State Listener
function initAuthStateListener(callback) {
  return auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    if (callback) callback(user);
  });
}

// Initialize Auth System
function initAuth() {
  // Setup login form if it exists
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      
      adminLogin(email, password)
        .then(() => {
          showToast('Login successful!', 'success');
          if (window.location.pathname.includes('admin.html')) {
            window.location.reload();
          }
        })
        .catch(error => {
          showToast(`Login failed: ${error.message}`, 'danger');
        });
    });
  }

  // Setup logout buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('logout-btn')) {
      logout().then(() => {
        showToast('Logged out successfully', 'success');
        if (window.location.pathname.includes('admin.html')) {
          window.location.href = 'index.html';
        }
      });
    }
  });

  // Setup password reset
  const resetLink = document.getElementById('reset-password');
  if (resetLink) {
    resetLink.addEventListener('click', function(e) {
      e.preventDefault();
      const email = prompt('Enter your email address to reset password:');
      if (email) {
        sendPasswordReset(email)
          .then(() => showToast('Password reset email sent!', 'success'))
          .catch(error => showToast(`Error: ${error.message}`, 'danger'));
      }
    });
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
    </div>
  `;
  
  const toastContainer = document.getElementById('toast-container') || document.body;
  toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => toast.remove(), 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);
