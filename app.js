// Firebase config (verified correct)
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

// Test connection
db.collection("test").doc("test").set({test: true})
  .then(() => console.log("Firestore connection working"))
  .catch(err => console.error("Firestore error:", err));

// Load Machines
function loadMachines() {
  db.collection("machines").get()
    .then((snapshot) => {
      const container = document.getElementById("machine-list");
      container.innerHTML = snapshot.docs.map(doc => `
        <div class="col-md-4">
          <div class="card">
            <div class="card-body">
              <h5>${doc.data().name || "Machine"}</h5>
              <button onclick="window.bookMachine('${doc.id}', '${doc.data().name || ""}')" 
                      class="btn btn-primary">
                Book Now
              </button>
            </div>
          </div>
        </div>
      `).join("");
    })
    .catch(err => {
      console.error("Error loading machines:", err);
      document.getElementById("machine-list").innerHTML = `
        <div class="alert alert-danger">
          Error loading machines. Check console.
        </div>
      `;
    });
}

// Booking function
window.bookMachine = function(machineId, machineName) {
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  document.getElementById("modal-title").textContent = `Book ${machineName}`;
  
  db.collection("formFields").get()
    .then((snapshot) => {
      document.getElementById("dynamic-fields").innerHTML = snapshot.docs.map(doc => `
        <div class="mb-3">
          <label>${doc.data().label || "Field"}</label>
          <input type="text" class="form-control" id="field-${doc.id}" required>
        </div>
      `).join("");

      document.getElementById("booking-form").onsubmit = (e) => {
        e.preventDefault();
        const booking = {
          machineId,
          machineName,
          date: new Date().toISOString(),
          ...Object.fromEntries(snapshot.docs.map(doc => 
            [doc.id, document.getElementById(`field-${doc.id}`).value]
          )
        };
        
        db.collection("bookings").add(booking)
          .then(() => {
            alert("Booked successfully!");
            modal.hide();
            loadMachines();
          })
          .catch(err => alert("Booking failed: " + err.message));
      };
      
      modal.show();
    });
};

// Initialize
window.onload = loadMachines;
