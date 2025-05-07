// Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
  // Check auth state
  auth.onAuthStateChanged(user => {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    
    if (user) {
      // User is authenticated
      if (loginContainer) loginContainer.classList.add('d-none');
      if (adminDashboard) adminDashboard.classList.remove('d-none');
      loadAdminContent();
    } else {
      // User is not authenticated
      if (loginContainer) loginContainer.classList.remove('d-none');
      if (adminDashboard) adminDashboard.classList.add('d-none');
    }
  });

  // Handle login form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    const success = await adminLogin(email, password);
    if (success) {
      window.location.reload();
    }
  });
});

function loadAdminContent() {
  // Load your admin-specific content here
  console.log("Loading admin content...");
  
  // Example: Load machines
  db.collection("machines").get()
    .then(snapshot => {
      console.log("Machines:", snapshot.docs.map(doc => doc.data()));
    })
    .catch(error => {
      console.error("Error loading machines:", error);
    });
}
