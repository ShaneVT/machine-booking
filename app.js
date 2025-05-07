// Add to the top with other Firebase initializations
const auth = firebase.auth();

// Add this to your initApp() function
auth.onAuthStateChanged(user => {
  const adminBtn = document.getElementById('admin-btn');
  const userViewBtn = document.getElementById('user-view-btn');
  
  if (user) {
    adminBtn.classList.add('d-none');
    userViewBtn.classList.remove('d-none');
  } else {
    adminBtn.classList.remove('d-none');
    userViewBtn.classList.add('d-none');
  }
});

// Update your admin button handler
document.getElementById('admin-btn').addEventListener('click', () => {
  window.location.href = 'admin.html';
});

// Add user view button handler
document.getElementById('user-view-btn').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
});
