// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadMachines();
  loadBookings();
  setupFormListeners();
});

// Load all machines from Firestore
function loadMachines() {
  db.collection("machines").onSnapshot((querySnapshot) => {
    const tableBody = document.querySelector("#machines-table tbody");
    tableBody.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const machine = doc.data();
      const row = `
        <tr>
          <td>${machine.name}</td>
          <td>${machine.description}</td>
          <td>
            <button class="delete-btn" data-id="${doc.id}">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
    
    // Add delete button handlers
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", deleteMachine);
    });
  });
}

// Load all bookings from Firestore
function loadBookings() {
  db.collection("bookings").onSnapshot((querySnapshot) => {
    const tableBody = document.querySelector("#bookings-table tbody");
    tableBody.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      const row = `
        <tr>
          <td>${booking.machine}</td>
          <td>${new Date(booking.time).toLocaleString()}</td>
          <td>
            <button class="delete-btn" data-id="${doc.id}">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
    
    // Add delete button handlers
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", deleteBooking);
    });
  });
}

// Handle form submission for new machines
function setupFormListeners() {
  document.getElementById("add-machine-form").addEventListener("submit", function(e) {
    e.preventDefault();
    
    const name = document.getElementById("machine-name").value;
    const desc = document.getElementById("machine-desc").value;
    
    db.collection("machines").add({
      name: name,
      description: desc
    })
    .then(() => {
      alert("Machine added successfully!");
      e.target.reset();
    })
    .catch(error => {
      alert("Error adding machine: " + error.message);
    });
  });
}

// Delete a machine
function deleteMachine(e) {
  if (confirm("Delete this machine permanently?")) {
    db.collection("machines").doc(e.target.dataset.id).delete()
      .catch(error => alert("Error deleting: " + error.message));
  }
}

// Delete a booking
function deleteBooking(e) {
  if (confirm("Delete this booking?")) {
    db.collection("bookings").doc(e.target.dataset.id).delete()
      .catch(error => alert("Error deleting: " + error.message));
  }
}
