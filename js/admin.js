// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Main admin dashboard initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    auth.onAuthStateChanged(user => {
        const loginContainer = document.getElementById('login-container');
        const adminDashboard = document.getElementById('admin-dashboard');
        
        if (user) {
            // User is authenticated
            loginContainer.classList.add('d-none');
            adminDashboard.classList.remove('d-none');
            loadAdminContent();
            
            // Setup admin navigation
            document.getElementById('admin-nav').innerHTML = `
                <span class="navbar-text me-3">Logged in as: ${user.email}</span>
                <button class="btn btn-outline-danger" onclick="logout()">Logout</button>
            `;
        } else {
            // User is not authenticated
            loginContainer.classList.remove('d-none');
            adminDashboard.classList.add('d-none');
        }
    });

    // Setup login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Login successful!', 'success');
        } catch (error) {
            showToast(`Login failed: ${error.message}`, 'danger');
        }
    });

    // Setup password reset
    document.getElementById('resetPassword').addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt('Enter your email to reset password:');
        if (email) {
            auth.sendPasswordResetEmail(email)
                .then(() => showToast('Password reset email sent!', 'success'))
                .catch(error => showToast(`Error: ${error.message}`, 'danger'));
        }
    });
});

// Load all admin content
async function loadAdminContent() {
    try {
        await Promise.all([
            loadMachines(),
            loadBookings(),
            loadSettings()
        ]);
        
        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error("Error loading admin content:", error);
        showToast('Failed to load admin content', 'danger');
    }
}

// Load machines from Firestore
async function loadMachines() {
    try {
        const snapshot = await db.collection("machines").get();
        const container = document.getElementById('machinesList');
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="alert alert-info">No machines found</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            container.innerHTML += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${data.name}</h5>
                            <p class="card-text">${data.description || 'No description available'}</p>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-primary edit-machine" data-id="${doc.id}">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-danger delete-machine" data-id="${doc.id}">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading machines:", error);
        showToast('Failed to load machines', 'danger');
    }
}

// Load bookings from Firestore
async function loadBookings() {
    try {
        const snapshot = await db.collection("bookings")
            .orderBy("startTime", "desc")
            .get();
        
        const container = document.getElementById('bookingsList');
        container.innerHTML = '';
        
        if (snapshot.empty) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">No bookings found</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const start = new Date(data.startTime);
            const end = new Date(data.endTime);
            
            container.innerHTML += `
                <tr>
                    <td>${data.machineName}</td>
                    <td>
                        ${start.toLocaleDateString()}<br>
                        ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                        ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td>${data.user}</td>
                    <td>
                        <select class="form-select form-select-sm booking-status" data-id="${doc.id}">
                            <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${data.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info view-booking" data-id="${doc.id}">
                            <i class="bi bi-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-danger delete-booking" data-id="${doc.id}">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading bookings:", error);
        showToast('Failed to load bookings', 'danger');
    }
}

// Load system settings
async function loadSettings() {
    try {
        const doc = await db.collection("settings").doc("businessHours").get();
        if (doc.exists) {
            document.getElementById('businessHoursStart').value = doc.data().start || '08:00';
            document.getElementById('businessHoursEnd').value = doc.data().end || '17:00';
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        showToast('Failed to load settings', 'danger');
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Add machine button
    document.getElementById('addMachineBtn').addEventListener('click', () => showMachineModal());
    
    // Machine edit/delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-machine')) {
            const machineId = e.target.closest('.edit-machine').dataset.id;
            showMachineModal(machineId);
        }
        
        if (e.target.closest('.delete-machine')) {
            const machineId = e.target.closest('.delete-machine').dataset.id;
            deleteMachine(machineId);
        }
    });
    
    // Booking status changes
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('booking-status')) {
            updateBookingStatus(e.target.dataset.id, e.target.value);
        }
    });
    
    // Booking view/delete buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.view-booking')) {
            const bookingId = e.target.closest('.view-booking').dataset.id;
            viewBookingDetails(bookingId);
        }
        
        if (e.target.closest('.delete-booking')) {
            const bookingId = e.target.closest('.delete-booking').dataset.id;
            deleteBooking(bookingId);
        }
    });
    
    // Booking search
    document.getElementById('bookingSearch').addEventListener('input', filterBookings);
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    
    // Machine form
    document.getElementById('machineForm').addEventListener('submit', saveMachine);
    document.getElementById('addFieldBtn').addEventListener('click', addCustomField);
}

// Show machine modal for add/edit
async function showMachineModal(machineId = null) {
    const modal = new bootstrap.Modal(document.getElementById('machineModal'));
    const form = document.getElementById('machineForm');
    const title = document.getElementById('machineModalTitle');
    
    if (machineId) {
        // Edit existing machine
        title.textContent = 'Edit Machine';
        form.reset();
        document.getElementById('machineId').value = machineId;
        
        try {
            const doc = await db.collection("machines").doc(machineId).get();
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('machineName').value = data.name;
                document.getElementById('machineDescription').value = data.description || '';
                
                // Load custom fields
                const fieldsContainer = document.getElementById('machineCustomFields');
                fieldsContainer.innerHTML = '';
                
                if (data.fields && data.fields.length) {
                    data.fields.forEach((field, index) => {
                        fieldsContainer.innerHTML += createCustomFieldHtml(field, index);
                    });
                }
            }
        } catch (error) {
            console.error("Error loading machine:", error);
            showToast('Failed to load machine details', 'danger');
        }
    } else {
        // Add new machine
        title.textContent = 'Add Machine';
        form.reset();
        document.getElementById('machineCustomFields').innerHTML = '';
    }
    
    modal.show();
}

// Create HTML for a custom field
function createCustomFieldHtml(field, index) {
    return `
        <div class="card mb-2 field-item" data-index="${index}">
            <div class="card-body">
                <div class="row g-2">
                    <div class="col-md-5">
                        <input type="text" class="form-control field-label" 
                               value="${field.label || ''}" placeholder="Field Label" required>
                    </div>
                    <div class="col-md-5">
                        <select class="form-select field-type">
                            <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                            <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                            <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Text Area</option>
                            <option value="select" ${field.type === 'select' ? 'selected' : ''}>Dropdown</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-sm btn-danger w-100 remove-field">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="form-check mt-2">
                    <input class="form-check-input field-required" type="checkbox" 
                           ${field.required ? 'checked' : ''}>
                    <label class="form-check-label">Required</label>
                </div>
            </div>
        </div>
    `;
}

// Add a new custom field to machine form
function addCustomField() {
    const fieldsContainer = document.getElementById('machineCustomFields');
    const index = fieldsContainer.querySelectorAll('.field-item').length;
    
    fieldsContainer.insertAdjacentHTML('beforeend', createCustomFieldHtml({}, index));
    
    // Add event listener to remove button
    const newField = fieldsContainer.lastElementChild;
    newField.querySelector('.remove-field').addEventListener('click', function() {
        this.closest('.field-item').remove();
    });
}

// Save machine to Firestore
async function saveMachine(e) {
    e.preventDefault();
    
    const machineId = document.getElementById('machineId').value;
    const name = document.getElementById('machineName').value;
    const description = document.getElementById('machineDescription').value;
    
    // Collect custom fields
    const fields = [];
    document.querySelectorAll('.field-item').forEach(item => {
        fields.push({
            id: `field_${Math.random().toString(36).substr(2, 9)}`,
            label: item.querySelector('.field-label').value,
            type: item.querySelector('.field-type').value,
            required: item.querySelector('.field-required').checked
        });
    });
    
    try {
        const machineData = {
            name,
            description,
            fields,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (machineId) {
            // Update existing machine
            await db.collection("machines").doc(machineId).update(machineData);
            showToast('Machine updated successfully', 'success');
        } else {
            // Add new machine
            machineData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("machines").add(machineData);
            showToast('Machine added successfully', 'success');
        }
        
        loadMachines();
        bootstrap.Modal.getInstance(document.getElementById('machineModal')).hide();
    } catch (error) {
        console.error("Error saving machine:", error);
        showToast('Failed to save machine', 'danger');
    }
}

// Delete machine from Firestore
async function deleteMachine(machineId) {
    if (!confirm('Are you sure you want to delete this machine? This cannot be undone.')) return;
    
    try {
        await db.collection("machines").doc(machineId).delete();
        showToast('Machine deleted successfully', 'success');
        loadMachines();
    } catch (error) {
        console.error("Error deleting machine:", error);
        showToast('Failed to delete machine', 'danger');
    }
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
    try {
        await db.collection("bookings").doc(bookingId).update({
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Booking status updated', 'success');
    } catch (error) {
        console.error("Error updating booking status:", error);
        showToast('Failed to update booking status', 'danger');
    }
}

// View booking details
async function viewBookingDetails(bookingId) {
    try {
        const doc = await db.collection("bookings").doc(bookingId).get();
        if (!doc.exists) throw new Error("Booking not found");
        
        const data = doc.data();
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        
        const modal = new bootstrap.Modal(document.createElement('div'));
        modal._element.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Booking Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Machine:</strong> ${data.machineName}</p>
                                <p><strong>Date:</strong> ${start.toLocaleDateString()}</p>
                                <p><strong>Time:</strong> ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}</p>
                                <p><strong>Status:</strong> <span class="badge bg-${data.status === 'approved' ? 'success' : data.status === 'pending' ? 'warning' : 'danger'}">${data.status}</span></p>
                                <p><strong>User:</strong> ${data.user}</p>
                                <p><strong>Created:</strong> ${new Date(data.createdAt?.seconds * 1000).toLocaleString()}</p>
                            </div>
                            <div class="col-md-6">
                                <h5>Additional Information</h5>
                                ${Object.entries(data)
                                    .filter(([key]) => !['machineId', 'machineName', 'startTime', 'endTime', 'status', 'user', 'createdAt', 'updatedAt'].includes(key))
                                    .map(([key, value]) => `<p><strong>${key}:</strong> ${value || 'N/A'}</p>`)
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal._element);
        modal.show();
    } catch (error) {
        console.error("Error viewing booking details:", error);
        showToast('Failed to load booking details', 'danger');
    }
}

// Delete booking from Firestore
async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking? This cannot be undone.')) return;
    
    try {
        await db.collection("bookings").doc(bookingId).delete();
        showToast('Booking deleted successfully', 'success');
        loadBookings();
    } catch (error) {
        console.error("Error deleting booking:", error);
        showToast('Failed to delete booking', 'danger');
    }
}

// Filter bookings based on search input
function filterBookings() {
    const searchTerm = document.getElementById('bookingSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#bookingsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Save system settings
async function saveSettings(e) {
    e.preventDefault();
    
    try {
        await db.collection("settings").doc("businessHours").set({
            start: document.getElementById('businessHoursStart').value,
            end: document.getElementById('businessHoursEnd').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Settings saved successfully', 'success');
    } catch (error) {
        console.error("Error saving settings:", error);
        showToast('Failed to save settings', 'danger');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize Bootstrap toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    // Remove toast after it hides
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1100';
    document.body.appendChild(container);
    return container;
}

// Logout function
window.logout = async function() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'success');
        setTimeout(() => window.location.href = 'admin.html', 1000);
    } catch (error) {
        console.error("Error logging out:", error);
        showToast('Failed to logout', 'danger');
    }
};
