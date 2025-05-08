// Initialize Firebase
if (!firebase.apps.length) {
  const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
let calendar;

// Safe date conversion
function safeConvertTimestamp(timestamp) {
  try {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date(); // Fallback to current date
  } catch (e) {
    console.error("Date conversion error:", e);
    return new Date(); // Fallback to current date
  }
}

// Initialize calendar with proper date handling
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error("Calendar element not found");
    return;
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    events: async function(fetchInfo, successCallback) {
      try {
        const bookings = await db.collection("bookings").get();
        const events = bookings.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: `${data.machineName || 'Unknown'} (${data.userName || 'Anonymous'})`,
            start: safeConvertTimestamp(data.start),
            end: safeConvertTimestamp(data.end),
            backgroundColor: '#28a745',
            extendedProps: {
              rawData: data // Store original data for debugging
            }
          };
        });
        successCallback(events);
      } catch (error) {
        console.error("Error loading bookings:", error);
        successCallback([]); // Return empty array on error
      }
    },
    eventClick: function(info) {
      if (confirm(`Delete booking for ${info.event.title}?`)) {
        db.collection("bookings").doc(info.event.id).delete()
          .catch(error => alert("Error deleting booking: " + error.message));
      }
    }
  });
  calendar.render();
}

// Load machines (unchanged from previous version)
async function loadMachines() {
  try {
    const querySnapshot = await db.collection("machines").get();
    const tableBody = document.querySelector("#machines-table tbody");
    
    if (!tableBody) {
      console.error("Machines table body not found");
      return;
    }
    
    tableBody.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const machine = doc.data();
      const row = `
        <tr>
          <td>${machine.name}</td>
          <td>${machine.description}</td>
          <td>${machine.location || '-'}</td>
          <td>${machine.capacity || '-'}</td>
          <td>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${doc.id}">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", deleteMachine);
    });
  } catch (error) {
    console.error("Error loading machines:", error);
  }
}

// Add new machine (unchanged from previous version)
document.getElementById("add-machine-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const name = form.querySelector("#machine-name")?.value;
  const desc = form.querySelector("#machine-desc")?.value;
  const location = form.querySelector("#machine-location")?.value;
  const capacity = form.querySelector("#machine-capacity")?.value;
  
  if (!name || !desc || !location || !capacity) {
    alert("Please fill all fields");
    return;
  }
  
  try {
    await db.collection("machines").add({
      name: name,
      description: desc,
      location: location,
      capacity: capacity,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Machine added successfully!");
    form.reset();
    loadMachines();
  } catch (error) {
    alert("Error adding machine: " + error.message);
  }
});

// Delete machine (unchanged from previous version)
async function deleteMachine(e) {
  if (!confirm("Delete this machine and all its bookings?")) return;
  
  try {
    const machineId = e.target.dataset.id;
    
    const bookings = await db.collection("bookings")
      .where("machineId", "==", machineId)
      .get();
    
    const batch = db.batch();
    bookings.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    await db.collection("machines").doc(machineId).delete();
    
    loadMachines();
    calendar.refetchEvents();
  } catch (error) {
    alert("Error deleting: " + error.message);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initCalendar();
  loadMachines();
});
