// Admin Dashboard Functions
function initAdmin() {
  // Load machines
  loadAdminMachines();
  
  // Load bookings
  loadAdminBookings();
  
  // Load form fields
  loadFormFields();
  
  // Add logout button
  document.getElementById('admin-nav').innerHTML += `
    <button class="btn btn-danger ms-2" onclick="logout()">Logout</button>
  `;
}

function loadAdminMachines() {
  db.collection("machines").onSnapshot(snapshot => {
    const container = document.getElementById('admin-machines');
    container.innerHTML = `
      <h3>Machines</h3>
      <button class="btn btn-success mb-3" onclick="showAddMachineModal()">
        Add Machine
      </button>
      <div class="row" id="machine-list"></div>
    `;
    
    const list = document.getElementById('machine-list');
    list.innerHTML = snapshot.docs.map(doc => `
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5>${doc.data().name}</h5>
            <p>${doc.data().description || ''}</p>
            <button class="btn btn-sm btn-primary" onclick="editMachine('${doc.id}')">
              Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteMachine('${doc.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  });
}

function loadAdminBookings() {
  db.collection("bookings").orderBy("startTime", "desc").onSnapshot(snapshot => {
    const container = document.getElementById('admin-bookings');
    container.innerHTML = `
      <h3>Bookings</h3>
      <div class="mb-3">
        <input type="text" id="booking-search" class="form-control" placeholder="Search...">
      </div>
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
          <tbody id="booking-list"></tbody>
        </table>
      </div>
    `;
    
    document.getElementById('booking-search').addEventListener('input', function() {
      filterBookings(this.value.toLowerCase());
    });
    
    renderBookings(snapshot.docs);
  });
}

function renderBookings(docs) {
  const list = document.getElementById('booking-list');
  list.innerHTML = docs.map(doc => {
    const data = doc.data();
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    
    return `
      <tr>
        <td>${data.machineName}</td>
        <td>
          ${start.toLocaleDateString()}<br>
          ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}
        </td>
        <td>${data.user}</td>
        <td>
          <select class="form-select status-select" data-id="${doc.id}">
            <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="approved" ${data.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
        <td>
          <button class="btn btn-sm btn-info" onclick="viewBookingDetails('${doc.id}')">
            View
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteBooking('${doc.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Add status change handlers
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', function() {
      db.collection("bookings").doc(this.dataset.id)
        .update({ status: this.value });
    });
  });
}

function filterBookings(query) {
  const rows = document.querySelectorAll('#booking-list tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

// Make functions global
window.initAdmin = initAdmin;
window.logout = function() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'admin.html';
  });
};
window.viewBookingDetails = function(bookingId) {
  // Similar to showBookingDetails in app.js
};
window.deleteBooking = function(bookingId) {
  if (confirm('Delete this booking?')) {
    db.collection("bookings").doc(bookingId).delete();
  }
};
window.showAddMachineModal = function() {
  // Machine form modal implementation
};
window.editMachine = function(machineId) {
  // Machine edit form implementation
};
window.deleteMachine = function(machineId) {
  if (confirm('Delete this machine?')) {
    db.collection("machines").doc(machineId).delete();
  }
};
