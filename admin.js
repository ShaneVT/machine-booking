// Admin Functions
document.addEventListener('DOMContentLoaded', () => {
  // Machines Tab
  document.getElementById('add-machine').addEventListener('click', () => {
    const name = prompt('Enter machine name:');
    if (name) db.collection("machines").add({ name });
  });

  // Fields Tab
  document.getElementById('add-field').addEventListener('click', () => {
    const label = prompt('Enter field label:');
    if (label) db.collection("formFields").add({ label });
  });

  // Load Data
  loadAdminData();
});

function loadAdminData() {
  // Load Machines
  db.collection("machines").onSnapshot(snapshot => {
    const container = document.getElementById("machine-list");
    container.innerHTML = snapshot.docs.map(doc => `
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5>${doc.data().name}</h5>
            <button onclick="deleteDocument('machines', '${doc.id}')" 
                    class="btn btn-danger btn-sm">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join("");
  });

  // Load Fields
  db.collection("formFields").onSnapshot(snapshot => {
    document.getElementById("field-list").innerHTML = snapshot.docs.map(doc => `
      <div class="card mb-2">
        <div class="card-body">
          <h6>${doc.data().label}</h6>
          <button onclick="deleteDocument('formFields', '${doc.id}')" 
                  class="btn btn-danger btn-sm">
            Delete
          </button>
        </div>
      </div>
    `).join("");
  });

  // Load Bookings
  db.collection("bookings").onSnapshot(snapshot => {
    const tbody = document.getElementById("booking-log");
    tbody.innerHTML = snapshot.docs.map(doc => {
      const data = doc.data();
      return `
        <tr>
          <td>${data.machineName}</td>
          <td>${data.user}</td>
          <td>${new Date(data.date).toLocaleString()}</td>
          <td>
            <button onclick="deleteDocument('bookings', '${doc.id}')" 
                    class="btn btn-danger btn-sm">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");
  });
}

function deleteDocument(collection, id) {
  if (confirm("Are you sure you want to delete this?")) {
    db.collection(collection).doc(id).delete();
  }
}

// Export to CSV
document.getElementById('export-btn').addEventListener('click', () => {
  db.collection("bookings").get().then(snapshot => {
    let csv = "Machine,User,Date\n";
    snapshot.forEach(doc => {
      const data = doc.data();
      csv += `"${data.machineName}","${data.user}","${new Date(data.date).toLocaleString()}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
  });
});

// Make functions global
window.deleteDocument = deleteDocument;
