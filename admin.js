// Use the globally available instances
const auth = window.firebaseAuth || firebase.auth();
const db = window.firebaseDb || firebase.firestore();

// Admin Dashboard Functions
function initAdminDashboard() {
  // Check authentication
  auth.onAuthStateChanged(user => {
    if (!user && window.location.pathname.includes('admin.html')) {
      window.location.href = 'index.html';
      return;
    }

    // Load admin content
    loadMachines();
    loadBookings();
    setupEventListeners();
  });
}

// ... rest of your admin.js functions remain the same ...

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminDashboard);
