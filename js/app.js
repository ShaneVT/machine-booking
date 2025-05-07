document.addEventListener('DOMContentLoaded', () => {
    // Initialize calendar
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        dateClick: (info) => openBookingModal(info.dateStr),
        events: async (fetchInfo, successCallback) => {
            try {
                const snapshot = await firebaseDb.collection("bookings").get();
                const events = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.machineName,
                        start: data.startTime,
                        end: data.endTime,
                        backgroundColor: data.status === 'approved' ? '#28a745' : '#ffc107'
                    };
                });
                successCallback(events);
            } catch (error) {
                console.error("Error loading events:", error);
            }
        },
        eventClick: (info) => showBookingDetails(info.event.id)
    });
    calendar.render();

    // Load machines
    loadMachines();

    // Setup auth state display
    firebaseAuth.onAuthStateChanged(user => {
        const authStateEl = document.getElementById('auth-state');
        if (user) {
            authStateEl.innerHTML = `
                <span class="navbar-text me-2">Hello, ${user.email}</span>
                <button class="btn btn-outline-danger" onclick="logout()">Logout</button>
            `;
        } else {
            authStateEl.innerHTML = `
                <button class="btn btn-outline-primary" onclick="window.location.href='admin.html'">Admin Login</button>
            `;
        }
    });
});

async function loadMachines() {
    try {
        const snapshot = await firebaseDb.collection("machines").get();
        const machineSelect = document.createElement('select');
        machineSelect.className = 'form-select mb-3';
        machineSelect.id = 'machineSelect';
        
        snapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            machineSelect.appendChild(option);
        });
        
        const machineDetails = document.getElementById('machineDetails');
        machineDetails.innerHTML = '';
        machineDetails.appendChild(machineSelect);
        
        // Load machine details when selection changes
        machineSelect.addEventListener('change', () => loadMachineDetails(machineSelect.value));
    } catch (error) {
        console.error("Error loading machines:", error);
    }
}

async function loadMachineDetails(machineId) {
    try {
        const doc = await firebaseDb.collection("machines").doc(machineId).get();
        const detailsDiv = document.getElementById('machineDetails');
        
        detailsDiv.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>${doc.data().name}</h5>
                    <p>${doc.data().description || 'No description available'}</p>
                </div>
            </div>
        `;
        
        // Load custom fields if they exist
        if (doc.data().fields) {
            const customFields = document.getElementById('customFields');
            customFields.innerHTML = doc.data().fields.map(field => `
                <div class="mb-3">
                    <label class="form-label">${field.label}</label>
                    <input type="${field.type || 'text'}" class="form-control" 
                           id="field-${field.id}" ${field.required ? 'required' : ''}>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error("Error loading machine details:", error);
    }
}

function openBookingModal(date = '') {
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    
    if (date) {
        document.getElementById('bookingDate').value = date;
    }
    
    // Load machines if not already loaded
    if (!document.getElementById('machineSelect')) {
        loadMachines();
    }
    
    // Setup form submission
    document.getElementById('bookingForm').onsubmit = async (e) => {
        e.preventDefault();
        await submitBooking();
        modal.hide();
    };
    
    modal.show();
}

async function submitBooking() {
    try {
        const machineId = document.getElementById('machineSelect').value;
        const date = document.getElementById('bookingDate').value;
        const startTime = document.getElementById('startTime').value;
        const duration = document.getElementById('duration').value;
        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);
        
        // Get machine details
        const machineDoc = await firebaseDb.collection("machines").doc(machineId).get();
        const machineName = machineDoc.data().name;
        
        // Check for conflicts
        const conflicts = await firebaseDb.collection("bookings")
            .where("machineId", "==", machineId)
            .where("startTime", "<", endDateTime.toISOString())
            .where("endTime", ">", startDateTime.toISOString())
            .get();
        
        if (!conflicts.empty) {
            throw new Error("This time slot is already booked");
        }
        
        // Collect custom fields
        const customData = {};
        if (machineDoc.data().fields) {
            machineDoc.data().fields.forEach(field => {
                customData[field.id] = document.getElementById(`field-${field.id}`).value;
            });
        }
        
        // Create booking
        await firebaseDb.collection("bookings").add({
            machineId,
            machineName,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            duration: Number(duration),
            user: firebaseAuth.currentUser ? firebaseAuth.currentUser.email : 'guest',
            status: 'pending',
            ...customData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert("Booking submitted successfully!");
        window.location.reload();
    } catch (error) {
        console.error("Booking error:", error);
        alert(`Booking failed: ${error.message}`);
    }
}

async function showBookingDetails(bookingId) {
    try {
        const doc = await firebaseDb.collection("bookings").doc(bookingId).get();
        const data = doc.data();
        
        const modal = new bootstrap.Modal(document.createElement('div'));
        modal._element.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Booking Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Machine:</strong> ${data.machineName}</p>
                        <p><strong>Date:</strong> ${new Date(data.startTime).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${new Date(data.startTime).toLocaleTimeString()} - ${new Date(data.endTime).toLocaleTimeString()}</p>
                        <p><strong>Status:</strong> ${data.status}</p>
                        ${Object.entries(data)
                            .filter(([key]) => !['machineId', 'machineName', 'startTime', 'endTime', 'status', 'createdAt'].includes(key))
                            .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                            .join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal._element);
        modal.show();
    } catch (error) {
        console.error("Error loading booking details:", error);
    }
}

// Make functions available globally
window.openBookingModal = openBookingModal;
window.logout = async () => {
    try {
        await firebaseAuth.signOut();
        window.location.reload();
    } catch (error) {
        console.error("Logout error:", error);
    }
};
