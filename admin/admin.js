// Initialize Firebase if not already initialized
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

// Initialize calendar
function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    plugins: [FullCalendar.dayGridPlugin, FullCalendar.interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    dateClick: function(info) {
      alert('Clicked on: ' + info.dateStr);
    },
    events: async function(fetchInfo, successCallback) {
      const bookings = await db.collection("bookings")
        .where("start", ">=", fetchInfo.start)
        .where("end", "<=", fetchInfo.end)
        .get();
      
      const events = bookings.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: `${data.machine} (${data.userName})`,
          start: data.start.toDate(),
          end: data.end.toDate(),
          extendedProps: {
            description: `Booked by ${data.userName} for ${data.duration} hours`
          }
        };
      });
      
      successCallback(events);
    },
    eventClick: function(info) {
      if (confirm(`Delete booking for ${info.event.title}?`)) {
        db.collection("bookings").doc(info.event.id).delete();
      }
    }
  });
  
  calendar.render();
}

// Load machines
async function loadMachines() {
  const querySnapshot = await db.collection("machines").get();
  const tableBody = document.querySelector("#machines-table tbody");
  tableBody.innerHTML = "";
  
  querySnapshot.forEach((doc) => {
    const machine = doc.data();
    const row = `
      <tr>
        <td>${machine.name}</td>
        <td>${machine.description}</td>
        <td>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${doc.id}">Delete</button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
  
  // Add delete handlers
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", deleteMachine);
  });
}

// Add new machine
document.getElementById("add-machine-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("machine-name").value;
  const desc = document.getElementById("machine-desc").value;
  
  try {
    await db.collection("machines").add({
      name: name,
      description: desc,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Machine added successfully!");
    e.target.reset();
    loadMachines();
  } catch (error) {
    alert("Error adding machine: " + error.message);
  }
});

// Delete machine
async function deleteMachine(e) {
  if (confirm("Delete this machine and all its bookings?")) {
    try {
      // Delete machine
      await db.collection("machines").doc(e.target.dataset.id).delete();
      
      // Delete related bookings
      const bookings = await db.collection("bookings")
        .where("machineId", "==", e.target.dataset.id)
        .get();
      
      const batch = db.batch();
      bookings.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      loadMachines();
      calendar.refetchEvents();
    } catch (error) {
      alert("Error deleting: " + error.message);
    }
  }
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initCalendar();
  loadMachines();
});
