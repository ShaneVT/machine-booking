function initAdminPage() {
  // Auth check
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Load bookings
    db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const tbody = document.querySelector('#bookings-table tbody');
        tbody.innerHTML = '';
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          tbody.innerHTML += `
            <tr>
              <td>${data.machine}</td>
              <td>${data.userName}</td>
              <td>${data.startTime.toDate().toLocaleString()}</td>
              <td><button data-id="${doc.id}" class="delete-btn">Delete</button></td>
            </tr>
          `;
        });

        // Add delete handlers
        document.querySelectorAll('.delete-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (confirm('Delete this booking?')) {
              db.collection('bookings').doc(btn.dataset.id).delete();
            }
          });
        });
      });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      auth.signOut().then(() => {
        window.location.href = 'index.html';
      });
    });
  });
}

// Wait for Firebase and DOM
document.addEventListener('DOMContentLoaded', () => {
  if (window.db && window.auth) {
    initAdminPage();
  } else {
    window.addEventListener('firebaseReady', initAdminPage);
  }
});
