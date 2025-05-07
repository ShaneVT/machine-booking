document.getElementById('booking-form').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!document.getElementById('start-time').value || !document.getElementById('end-time').value) {
    alert("Please select both start and end times");
    return;
  }
  
  db.collection("bookings").add({
    machine: document.getElementById('machine').value,
    userName: document.getElementById('user-name').value,
    userEmail: document.getElementById('user-email').value,
    startTime: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('start-time').value)),
    endTime: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('end-time').value)),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "confirmed"
  }).then(function() {
    alert("Booked successfully!");
    e.target.reset();
  }).catch(function(error) {
    alert("Error: " + error.message);
  });
});
