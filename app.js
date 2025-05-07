// Use the globally available instances
const auth = window.firebaseAuth || firebase.auth();
const db = window.firebaseDb || firebase.firestore();

// Initialize Calendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    // ... your existing calendar config ...
  });
  calendar.render();
  return calendar;
}

// Initialize App
function initApp() {
  // Initialize components
  initCalendar();
  loadMachines();
  
  // Setup auth state listener
  auth.onAuthStateChanged(user => {
    const adminBtn = document.getElementById('admin-btn');
    const userViewBtn = document.getElementById('user-view-btn');
    
    if (user) {
      if (adminBtn) adminBtn.classList.add('d-none');
      if (userViewBtn) userViewBtn.classList.remove('d-none');
    } else {
      if (adminBtn) adminBtn.classList.remove('d-none');
      if (userViewBtn) userViewBtn.classList.add('d-none');
    }
  });

  // Setup navigation buttons
  const adminBtn = document.getElementById('admin-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      window.location.href = 'admin.html';
    });
  }

  const userViewBtn = document.getElementById('user-view-btn');
  if (userViewBtn) {
    userViewBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        window.location.href = 'index.html';
      });
    });
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
