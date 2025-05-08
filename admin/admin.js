// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Fix permissions error by enabling offline persistence
db.enablePersistence()
  .catch((err) => {
    console.log("Persistence failed: " + err.code);
  });

// Load machines
function loadMachines() {
  db.collection("machines").get()
    .then((querySnapshot) => {
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
      
      // Add delete handlers
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", deleteMachine);
      });
    })
    .catch((error) => {
      console.log("Error loading machines:", error);
    });
}

// Load bookings
function loadBookings() {
  db.collection("bookings").get()
    .then((querySnapshot) => {
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
      
      // Add delete handlers
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", deleteBooking);
      });
    })
    .catch((error) => {
      console.log("Error loading bookings:", error);
    });
}

// Add new machine
document.getElementById("add-machine-form").addEventListener("submit", (e) => {
  e.preventDefault();
  
  const name = document.getElementById("machine-name").value;
  const desc = document.getElementById("machine-desc").value;
  
  db.collection("machines").add({
    name: name,
    description: desc
  })
  .then(() => {
    alert("Machine added!");
    e.target.reset();
  })
  .catch((error) => {
    alert("Error adding machine: " + error.message);
  });
});

// Delete machine
function deleteMachine(e) {
  if (confirm("Delete this machine?")) {
    db.collection("machines").doc(e.target.dataset.id).delete()
      .catch((error) => {
        alert("Error deleting: " + error.message);
      });
  }
}

// Delete booking
function deleteBooking(e) {
  if (confirm("Delete this booking?")) {
    db.collection("bookings").doc(e.target.dataset.id).delete()
      .catch((error) => {
        alert("Error deleting: " + error.message);
      });
  }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  loadMachines();
  loadBookings();
});
