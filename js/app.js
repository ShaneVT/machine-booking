// ======================
// Booking System Handler
// ======================
document.addEventListener('DOMContentLoaded', function() {
  const bookingForm = document.getElementById('booking-form');
  
  // Exit if no booking form on this page
  if (!bookingForm) return;

  // Form submission handler
  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form elements
    const machineSelect = bookingForm['machine'];
    const timeInput = bookingForm['time'];
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const errorDisplay = document.getElementById('booking-error') || createErrorDisplay(bookingForm);

    try {
      // Validate inputs
      if (!machineSelect.value || !timeInput.value) {
        throw new Error('Please select a machine and time slot');
      }

      // Verify user is logged in
      if (!firebaseAuth.currentUser) {
        throw new Error('You must be logged in to make a booking');
      }

      // Set loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      // Create booking in Firestore
      await firebaseFirestore.collection('bookings').add({
        machine: machineSelect.value,
        time: timeInput.value,
        userId: firebaseAuth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Success handling
      bookingForm.reset();
      showSuccessMessage('Booking confirmed!');

    } catch (error) {
      // Error handling
      errorDisplay.textContent = error.message;
      errorDisplay.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
    }
  });

  function createErrorDisplay(form) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'booking-error';
    errorDiv.className = 'error-message';
    form.prepend(errorDiv);
    return errorDiv;
  }

  function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    bookingForm.prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }
});
