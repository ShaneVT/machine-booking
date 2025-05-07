function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) {
    console.error('Booking form not found');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const startTime = new Date(document.getElementById('start-time').value);
      if (isNaN(startTime.getTime())) throw new Error('Invalid start time');

      await db.collection('bookings').add({
        machine: document.getElementById('machine').value,
        userName: document.getElementById('user-name').value,
        startTime: firebase.firestore.Timestamp.fromDate(startTime),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert('Booking successful!');
      form.reset();
    } catch (error) {
      console.error('Booking error:', error);
      alert(`Error: ${error.message}`);
    }
  });
}

// Wait for Firebase and DOM
document.addEventListener('DOMContentLoaded', () => {
  if (window.db) {
    initBookingForm();
  } else {
    window.addEventListener('firebaseReady', initBookingForm);
  }
});
