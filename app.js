// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ===== USER FUNCTIONS =====
function loadMachines() {
  db.collection("machines").get()
    .then((snapshot) => {
      const container = document.getElementById("machine-list");
      container.innerHTML = snapshot.docs.map(doc => `
        <div class="col-md-4 mb-3">
          <div class="card">
            <div class="card-body">
              <h5>${doc.data().name}</h5>
              <button onclick="openBookingModal('${doc.id}', '${doc.data().name}')" 
                      class="btn btn-primary">
                Book Now
              </button>
            </div>
          </div>
        </div>
      `).join("");
    })
    .catch(err => console.error("Error loading machines:", err));
}

function openBookingModal(machineId, machineName) {
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  document.getElementById("modal-title").textContent = `Book ${machineName}`;
  
  db.collection("formFields").get()
    .then((snapshot) => {
      const fieldsContainer = document.getElementById("dynamic-fields");
      fieldsContainer.innerHTML = snapshot.docs.map(doc => `
        <div class="mb-3">
          <label>${doc.data().label}</label>
          <input type="text" class="form-control" id="field-${doc.id}" required>
        </div>
      `).join("");

      document.getElementById("booking-form").onsubmit = (e) => {
        e.preventDefault();
        const bookingData = {
          machineId,
          machineName,
          date: new Date().toISOString(),
          user: localStorage.getItem('user') || 'Anonymous'
        };

        snapshot.docs.forEach(doc => {
          bookingData[doc.id] = document.getElementById(`field-${doc.id}`).value;
        });

        db.collection("bookings").add(bookingData)
          .then(() => {
            alert("Booking successful!");
            modal.hide();
            loadMachines();
          })
          .catch(err => alert("Error: " + err.message));
      };
      
      modal.show();
    });
}

// Initialize
if (document.getElementById('machine-list')) {
  window.onload = loadMachines;
  window.openBookingModal = openBookingModal;
}
