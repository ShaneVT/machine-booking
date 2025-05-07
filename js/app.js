document.addEventListener('DOMContentLoaded', function() {
  // Debug check
  console.log("DOM loaded - app.js running");
  
  var form = document.getElementById('booking-form');
  if (!form) {
    console.error("Error: Booking form not found");
    return;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log("Form submission started");

    try {
      // Validate inputs
      var startTime = new Date(document.getElementById('start-time').value);
      if (isNaN(startTime.getTime())) throw new Error("Invalid start time");

      // Create booking
      db.collection("bookings").add({
        machine: document.getElementById('machine').value,
        userName: document.getElementById('user-name').value,
        startTime: firebase.firestore.Timestamp.fromDate(startTime),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function() {
        alert("Booking successful!");
        form.reset();
      }).catch(function(error) {
        console.error("Firestore error:", error);
        alert("Error: " + error.message);
      });

    } catch (error) {
      console.error("Validation error:", error);
      alert(error.message);
    }
  });
});
