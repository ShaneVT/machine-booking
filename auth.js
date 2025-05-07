// Firebase Authentication Handler
const auth = firebase.auth();

// Admin Login Function
const adminLogin = async (email, password) => {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Logout Function
const logout = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Password Reset Function
const sendPasswordReset = async (email) => {
  try {
    await auth.sendPasswordResetEmail(email);
    return true;
  } catch (error) {
    console.error("Password reset error:", error);
    throw error;
  }
};

// Auth State Listener
const initAuthStateListener = () => {
  auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    
    // Handle admin interface
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    
    if (user) {
      // User is logged in
      if (adminDashboard) adminDashboard.classList.remove('d-none');
      if (loginForm) loginForm.classList.add('d-none');
      
      // Update UI elements
      const adminNav = document.getElementById('admin-nav');
      if (adminNav) {
        adminNav.innerHTML += `
          <span class="navbar-text me-3">Logged in as: ${user.email}</span>
          <button class="btn btn-danger logout-btn">Logout</button>
        `;
      }
    } else {
      // User is logged out
      if (adminDashboard) adminDashboard.classList.add('d-none');
      if (loginForm) loginForm.classList.remove('d-none');
      
      // Protect admin pages
      if (window.location.pathname.includes('admin.html')) {
        window.location.href = 'index.html';
      }
    }
  });
};

// Initialize Auth System
const initAuth = () => {
  initAuthStateListener();
  
  // Admin login form handler
  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value;
      const password = document.getElementById('admin-password').value;
      
      try {
        await adminLogin(email, password);
        showToast('Login successful!', 'success');
      } catch (error) {
        showToast(`Login failed: ${error.message}`, 'danger');
      }
    });
  }
  
  // Logout button handlers
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('logout-btn')) {
      logout().then(() => {
        showToast('Logged out successfully', 'success');
        if (window.location.pathname.includes('admin.html')) {
          window.location.href = 'index.html';
        }
      });
    }
  });
  
  // Password reset handler
  const resetLink = document.getElementById('reset-password');
  if (resetLink) {
    resetLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = prompt('Enter your email address to reset password:');
      if (email) {
        try {
          await sendPasswordReset(email);
          showToast('Password reset email sent!', 'success');
        } catch (error) {
          showToast(`Error: ${error.message}`, 'danger');
        }
      }
    });
  }
};

// Toast notification helper
const showToast = (message, type = 'info') => {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  const toastContainer = document.getElementById('toast-container') || document.body;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);
