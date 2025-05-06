// ===== ADMIN FUNCTIONS =====
// 1. Manage Machines
document.getElementById("add-machine").addEventListener("click", () => {
    const name = prompt("Enter machine name:");
    if (name) db.collection("machines").add({ name });
});

// 2. Manage Form Fields
document.getElementById("add-field").addEventListener("click", () => {
    const label = prompt("Field label (e.g., 'Project Name'):");
    if (label) db.collection("formFields").add({ label });
});

// 3. Export to PDF
document.getElementById("export-pdf").addEventListener("click", exportToPDF);

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Machine Booking Log", 10, 10);
    // Add table logic here
    doc.save("bookings.pdf");
}
