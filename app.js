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
const auth = firebase.auth();

// Global Variables
let calendar;
let currentUser = null;

// Initialize Calendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    dateClick: function(info) {
      openBookingModal(info.dateStr);
    },
    eventClick: function(info) {
      showBookingDetails(info.event.id);
    },
    events: function(fetchInfo, successCallback, failureCallback) {
      db.collection("bookings").get()
        .then(snapshot => {
          const events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: `${data.machineName} (${data.user})`,
              start: data.startTime,
              end: data.endTime,
              backgroundColor: data.status === 'approved' ? '#28a745' : 
                            data.status === 'pending' ? '#ffc107' : '#dc3545'
            };
          });
          successCallback(events);
        })
        .catch(err => failureCallback(err));
    }
  });
  calendar.render();
}

// Load Machines
function loadMachines() {
  return db.collection("machines").get()
    .then(snapshot => {
      const select = document.getElementById('machine-select');
      select.innerHTML = snapshot.docs.map(doc => 
        `<option value="${doc.id}">${doc.data().name}</option>`
      ).join('');
      return snapshot;
    });
}

// Open Booking Modal
function openBookingModal(date = '') {
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  
  if (date) {
    document.getElementById('booking-date').value = date;
  }
  
  loadMachines().then(() => {
    document.getElementById('machine-select').addEventListener('change', function() {
      loadMachineDetails(this.value);
    });
    
    // Trigger first load
    if (document.getElementById('machine-select').value) {
      loadMachineDetails(document.getElementById('machine-select').value);
    }
  });
  
  document.getElementById('booking-form').onsubmit = function(e) {
    e.preventDefault();
    submitBooking();
  };
  
  modal.show();
}

// Load Machine Details and Custom Fields
function loadMachineDetails(machineId) {
  const detailsContainer = document.getElementById('machine-details');
  const fieldsContainer = document.getElementById('dynamic-fields');
  
  db.collection("machines").doc(machineId).get()
    .then(doc => {
      const data = doc.data();
      detailsContainer.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5>${data.name}</h5>
            <p>${data.description || ''}</p>
            <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
          </div>
        </div>
      `;
      
      // Load custom fields for this machine
      if (data.fields && data.fields.length) {
        fieldsContainer.innerHTML = data.fields.map(field => `
          <div class="mb-3">
            <label class="form-label">${field.label}${field.required ? '*' : ''}</label>
            ${field.type === 'textarea' ? 
              `<textarea class="form-control" id="field-${field.id}" ${field.required ? 'required' : ''}></textarea>` :
              `<input type="${field.type || 'text'}" class="form-control" id="field-${field.id}" ${field.required ? 'required' : ''}>`
            }
          </div>
        `).join('');
      } else {
        fieldsContainer.innerHTML = '<p>No additional information required</p>';
      }
    });
}

// Submit Booking
function submitBooking() {
  const machineId = document.getElementById('machine-select').value;
  const date = document.getElementById('booking-date').value;
  const startTime = document.getElementById('start-time').value;
  const duration = document.getElementById('duration').value;
  
  const startDateTime = new Date(`${date}T${startTime}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);
  
  // Get machine name
  db.collection("machines").doc(machineId).get()
    .then(machineDoc => {
      const machineName = machineDoc.data().name;
      
      // Check for conflicts
      return db.collection("bookings")
        .where("machineId", "==", machineId)
        .where("status", "in", ["approved", "pending"])
        .get()
        .then(snapshot => {
          const conflict = snapshot.docs.some(doc => {
            const booking = doc.data();
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            return startDateTime < bookingEnd && endDateTime > bookingStart;
          });
          
          if (conflict) {
            throw new Error("This time slot is already booked!");
          }
          
          // Collect custom fields
          const customFields = {};
          if (machineDoc.data().fields) {
            machineDoc.data().fields.forEach(field => {
              customFields[field.id] = document.getElementById(`field-${field.id}`).value;
            });
          }
          
          // Create booking
          return db.collection("bookings").add({
            machineId,
            machineName,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            duration: parseFloat(duration),
            user: currentUser ? currentUser.email : 'Guest',
            status: 'pending',
            ...customFields,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
    })
    .then(() => {
      alert("Booking submitted successfully!");
      document.getElementById('bookingModal').querySelector('.btn-close').click();
      calendar.refetchEvents();
    })
    .catch(err => {
      alert(`Error: ${err.message}`);
      console.error(err);
    });
}

// Show Booking Details
function showBookingDetails(bookingId) {
  db.collection("bookings").doc(bookingId).get()
    .then(doc => {
      const data = doc.data();
      const modal = document.getElementById('detailsModal');
      
      modal.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Booking Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <h4>${data.machineName}</h4>
                  <p><strong>Date:</strong> ${new Date(data.startTime).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> ${new Date(data.startTime).toLocaleTimeString()} - 
                                          ${new Date(data.endTime).toLocaleTimeString()}</p>
                  <p><strong>Status:</strong> <span class="badge bg-${data.status === 'approved' ? 'success' : 
                                                      data.status === 'pending' ? 'warning' : 'danger'}">
                                          ${data.status}</span></p>
                  <p><strong>Booked by:</strong> ${data.user}</p>
                </div>
                <div class="col-md-6">
                  <h5>Additional Information</h5>
                  ${Object.entries(data)
                    .filter(([key]) => !['machineId', 'machineName', 'startTime', 
                                       'endTime', 'status', 'user', 'createdAt'].includes(key))
                    .map(([key, value]) => `
                      <p><strong>${key}:</strong> ${value || 'N/A'}</p>
                    `).join('')}
                </div>
              </div>
              ${currentUser && currentUser.email === data.user ? `
                <div class="mt-4">
                  <button class="btn btn-danger" onclick="cancelBooking('${doc.id}')">
                    Cancel Booking
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      
      new bootstrap.Modal(modal).show();
    });
}

// Initialize App
function initApp() {
  initCalendar();
  loadMachines();
  
  // New booking button
  document.getElementById('calendar').insertAdjacentHTML('beforebegin', `
    <button class="btn btn-primary mb-3" onclick="openBookingModal()">
      New Booking
    </button>
  `);
  
  // Auth state listener
  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      document.getElementById('admin-btn').classList.add('d-none');
      document.getElementById('user-view-btn').classList.remove('d-none');
    }
  });
  
  // Navigation buttons
  document.getElementById('admin-btn').addEventListener('click', () => {
    window.location.href = 'admin.html';
  });
  
  document.getElementById('user-view-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'index.html';
    });
  });
}

// Make functions global
window.openBookingModal = openBookingModal;
window.showBookingDetails = showBookingDetails;
window.cancelBooking = function(bookingId) {
  if (confirm('Are you sure you want to cancel this booking?')) {
    db.collection("bookings").doc(bookingId).delete()
      .then(() => {
        alert('Booking cancelled');
        document.querySelector('[data-bs-dismiss="modal"]').click();
        calendar.refetchEvents();
      });
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
