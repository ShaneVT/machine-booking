import { getFirestore, collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();
const db = getFirestore();

// Load bookings
async function loadBookings() {
  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));
    const bookingsTable = document.getElementById('bookings-table');
    const tbody = bookingsTable.querySelector('tbody');
    tbody.innerHTML = '';

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${data.machine}</td>
        <td>${data.userName}</td>
        <td>${data.userEmail}</td>
        <td>${data.startTime.toDate().toLocaleString()}</td>
        <td>${data.endTime.toDate().toLocaleString()}</td>
        <td>${data.status}</td>
        <td>
          <button class="delete-btn" data-id="${doc.id}">Delete</button>
        </td>
      `;
      
      tbody.appendChild(row);
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        if (confirm('Are you sure you want to delete this booking?')) {
          await deleteDoc(doc(db, "bookings", e.target.dataset.id));
          loadBookings();
        }
      });
    });

  } catch (error) {
    console.error("Error loading bookings:", error);
    alert('Failed to load bookings: ' + error.message);
  }
}

// Initialize admin page
document.addEventListener('DOMContentLoaded', () => {
  // Check admin status
  if (!auth.currentUser || !auth.currentUser.email.endsWith('@admin.com')) {
    window.location.href = 'index.html';
    return;
  }

  // Load bookings
  loadBookings();

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
  });
});
