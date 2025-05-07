// Admin Authentication
function initAdminAuth() {
  const loginForm = document.getElementById('admin-login-form');
  if (!loginForm) return;
  
  loginForm.onsubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(() => {
        // Success - load admin dashboard
        loadAdminDashboard();
      })
      .catch(err => {
        alert(`Login failed: ${err.message}`);
        console.error(err);
      });
  };
}

// Load Admin Dashboard
function loadAdminDashboard() {
  const adminDashboard = document.getElementById('admin-dashboard');
  
  fetch('admin-dashboard.html')
    .then(response => response.text())
    .then(html => {
      adminDashboard.innerHTML = html;
      adminDashboard.classList.remove('d-none');
      document.querySelector('.admin-auth').classList.add('d-none');
      
      // Initialize admin scripts
      if (window.initAdmin) {
        window.initAdmin();
      }
    });
}

// Initialize auth
document.addEventListener('DOMContentLoaded', function() {
  // For admin page
  if (document.getElementById('admin-login-form')) {
    initAdminAuth();
  }
  
  // For main page
  if (document.getElementById('admin-btn')) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        document.getElementById('admin-btn').classList.add('d-none');
        document.getElementById('user-view-btn').classList.remove('d-none');
      }
    });
  }
});
