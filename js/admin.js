// ======================
// Admin Dashboard Handler
// ======================
document.addEventListener('DOMContentLoaded', async function() {
  // Verify admin status
  if (!await verifyAdmin()) {
    window.location.href = './index.html';
    return;
  }

  // Load all bookings
  await loadBookings();
  
  // Setup realtime updates
  setupRealtimeUpdates();
  
  // Initialize UI event listeners
  initAdminUI();
});

async function verifyAdmin() {
  try {
    // Wait for auth state
    await new Promise(resolve => {
      const unsubscribe = firebaseAuth.onAuthStateChanged(user => {
        unsubscribe();
        if (!user) {
          alert('Please login to access admin panel');
          resolve(false);
        } else {
          // Check if user is admin
          const doc = await firebaseFirestore.collection('admins').doc(user.uid).get();
          resolve(doc.exists);
        }
      });
    });
  } catch (error) {
    console.error('Admin verification failed:', error);
    return false;
  }
}

async function loadBookings() {
  try {
    const bookingsTable = document.getElementById('bookings-table');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    loadingIndicator.style.display = 'block';
    bookingsTable.innerHTML = '';
    
    const snapshot = await firebaseFirestore.collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    if (snapshot.empty) {
      bookingsTable.innerHTML = '<tr><td colspan="5">No bookings found</td></tr>';
      return;
    }
    
    snapshot.forEach(doc => {
      const booking = doc.data();
      const row = `
        <tr>
          <td>${doc.id}</td>
          <td>${booking.machine}</td>
          <td>${new Date(booking.time).toLocaleString()}</td>
          <td>${booking.userId}</td>
          <td>
            <button class="delete-btn" data-id="${doc.id}">Delete</button>
          </td>
        </tr>
      `;
      bookingsTable.innerHTML += row;
    });
    
  } catch (error) {
    console.error('Failed to load bookings:', error);
    alert('Failed to load bookings: ' + error.message);
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

function setupRealtimeUpdates() {
  return firebaseFirestore.collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot(snapshot => {
      // Handle realtime updates
      loadBookings();
    }, error => {
      console.error('Realtime updates error:', error);
    });
}

function initAdminUI() {
  // Delete booking handler
  document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('delete-btn')) {
      if (!confirm('Are you sure you want to delete this booking?')) return;
      
      try {
        await firebaseFirestore.collection('bookings')
          .doc(e.target.dataset.id)
          .delete();
      } catch (error) {
        alert('Failed to delete booking: ' + error.message);
      }
    }
  });
  
  // Logout handler
  document.getElementById('logout-btn').addEventListener('click', () => {
    firebaseAuth.signOut()
      .then(() => window.location.href = './index.html');
  });
}
