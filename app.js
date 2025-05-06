// Debugging Firestore Connection
console.log("Initializing Firebase...");

const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (err) {
  console.error("Firebase initialization error:", err);
}

const db = firebase.firestore();

// Test Firestore connection
db.collection("test").doc("test").get()
  .then(() => console.log("Firestore connection successful"))
  .catch(err => console.error("Firestore error:", err));

// Load Machines
function loadMachines() {
  console.log("Loading machines...");
  db.collection("machines").get()
    .then((snapshot) => {
      console.log(`Found ${snapshot.size} machines`);
      const container = document.getElementById("machine-list");
      container.innerHTML = "";
      
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log("Machine:", doc.id, data);
        container.innerHTML += `
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h5>${data.name || "Unnamed Machine"}</h5>
                <button onclick="window.openBookingModal('${doc.id}', '${data.name || ""}')" 
                        class="btn btn-primary">
                  Book Now
                </button>
              </div>
            </div>
          </div>
        `;
      });
    })
    .catch(err => {
      console.error("Error loading machines:", err);
      document.getElementById("machine-list").innerHTML = `
        <div class="alert alert-danger">
          Failed to load machines. Check console for details.
        </div>
      `;
    });
}

// Make function globally available
window.openBookingModal = function(machineId, machineName) {
  console.log("Opening modal for:", machineName);
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  
  document.getElementById("modal-title").textContent = `Book ${machineName}`;
  
  db.collection("formFields").get()
    .then((snapshot) => {
      const container = document.getElementById("dynamic-fields");
      container.innerHTML = "";
      
      snapshot.forEach(doc => {
        const field = doc.data();
        container.innerHTML += `
          <div class="mb-3">
            <label>${field.label || "Field"}</label>
            <input type="text" class="form-control" id="field-${doc.id}" required>
          </div>
        `;
      });

      document.getElementById("booking-form").onsubmit = (e) => {
        e.preventDefault();
        const bookingData = {
          machineId,
          machineName,
          date: new Date().toISOString()
        };

        snapshot.forEach(doc => {
          bookingData[doc.id] = document.getElementById(`field-${doc.id}`).value;
        });

        db.collection("bookings").add(bookingData)
          .then(() => {
            alert("Booking successful!");
            modal.hide();
            loadMachines();
          })
          .catch(err => {
            console.error("Booking failed:", err);
            alert("Booking failed. See console for details.");
          });
      };
      
      modal.show();
    })
    .catch(err => {
      console.error("Error loading form fields:", err);
      alert("Failed to load booking form");
    });
};

// Initialize
window.onload = () => {
  console.log("Page loaded");
  loadMachines();
};
