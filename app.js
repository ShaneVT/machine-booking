// Firebase configuration
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

// Load machines from Firestore
function loadMachines() {
    db.collection("machines").get().then((snapshot) => {
        const container = document.getElementById("machine-list");
        container.innerHTML = "";
        
        snapshot.forEach(doc => {
            const machine = doc.data();
            container.innerHTML += `
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-body">
                            <h5>${machine.name || 'Unnamed Machine'}</h5>
                            <button onclick="openBookingModal('${doc.id}', '${machine.name || ''}')" 
                                    class="btn btn-primary">
                                Book Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }).catch(error => {
        console.error("Error loading machines:", error);
    });
}

// Open booking modal
function openBookingModal(machineId, machineName) {
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    document.getElementById("modal-title").textContent = `Book ${machineName}`;
    
    db.collection("formFields").get().then((snapshot) => {
        const fieldsContainer = document.getElementById("dynamic-fields");
        fieldsContainer.innerHTML = "";
        
        snapshot.forEach(doc => {
            const field = doc.data();
            fieldsContainer.innerHTML += `
                <div class="mb-3">
                    <label class="form-label">${field.label || 'Field'}</label>
                    <input type="text" class="form-control" id="field-${doc.id}" required>
                </div>
            `;
        });

        // Form submission
        document.getElementById("booking-form").onsubmit = (e) => {
            e.preventDefault();
            const bookingData = {
                machineId,
                machineName,
                date: new Date().toISOString()
            };

            // Add all field values
            snapshot.forEach(doc => {
                bookingData[doc.id] = document.getElementById(`field-${doc.id}`).value;
            });

            db.collection("bookings").add(bookingData)
                .then(() => {
                    alert("Booking successful!");
                    modal.hide();
                    loadMachines(); // Refresh list
                })
                .catch(error => {
                    console.error("Booking failed:", error);
                    alert("Booking failed. Please try again.");
                });
        };
    });

    modal.show();
}

// Initialize on page load
window.onload = loadMachines;
