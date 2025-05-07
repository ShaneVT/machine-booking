// Admin Dashboard Functions
const initAdminDashboard = () => {
  // Check authentication
  const user = firebase.auth().currentUser;
  if (!user) {
    window.location.href = 'admin.html';
    return;
  }

  // Load admin content
  loadMachines();
  loadBookings();
  setupEventListeners();
};

const loadMachines = () => {
  const db = firebase.firestore();
  db.collection("machines").onSnapshot(snapshot => {
    const container = document.getElementById('machines-container');
    if (!container) return;
    
    container.innerHTML = `
      <h3>Machines</h3>
      <button class="btn btn-success mb-3" id="add-machine-btn">
        Add New Machine
      </button>
      <div class="row" id="machines-list"></div>
    `;
    
    const list = document.getElementById('machines-list');
    list.innerHTML = snapshot.docs.map(doc => `
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5>${doc.data().name}</h5>
            <p class="text-muted">${doc.id}</p>
            <button class="btn btn-sm btn-primary edit-machine" data-id="${doc.id}">
              Edit
            </button>
            <button class="btn btn-sm btn-danger delete-machine" data-id="${doc.id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  });
};

const loadBookings = () => {
  const db = firebase.firestore();
  db.collection("bookings").orderBy("startTime", "desc").onSnapshot(snapshot => {
    const container = document.getElementById('bookings-container');
    if (!container) return;
    
    container.innerHTML = `
      <h3>Bookings</h3>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Machine</th>
              <th>Date/Time</th>
              <th>User</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="bookings-list"></tbody>
        </table>
      </div>
    `;
    
    const list = document.getElementById('bookings-list');
    list.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      
      return `
        <tr>
          <td>${data.machineName}</td>
          <td>
            ${start.toLocaleDateString()} ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </td>
          <td>${data.user}</td>
          <td>
            <select class="form-select booking-status" data-id="${doc.id}">
              <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="approved" ${data.status === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </td>
          <td>
            <button class="btn btn-sm btn-info view-booking" data-id="${doc.id}">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  });
};

const setupEventListeners = () => {
  // Add machine button
  document.addEventListener('click', (e) => {
    if (e.target.id === 'add-machine-btn') {
      showMachineModal();
    }
    
    // Edit machine buttons
    if (e.target.classList.contains('edit-machine')) {
      const machineId = e.target.dataset.id;
      showMachineModal(machineId);
    }
    
    // Delete machine buttons
    if (e.target.classList.contains('delete-machine')) {
      const machineId = e.target.dataset.id;
      deleteMachine(machineId);
    }
    
    // Booking status changes
    if (e.target.classList.contains('booking-status')) {
      const bookingId = e.target.dataset.id;
      const newStatus = e.target.value;
      updateBookingStatus(bookingId, newStatus);
    }
  });
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminDashboard);
