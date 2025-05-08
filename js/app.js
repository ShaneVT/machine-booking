/**
 * Booking Module
 * Handles machine booking functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if booking form exists
  const bookingForm = document.getElementById('booking-form');
  if (!bookingForm) {
    console.log('ℹ️ No booking form detected on this page');
    return;
  }

  console.log('🛠️ Initializing booking form...');

  // Form submission handler
  bookingForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    try {
      // Get form values
      const machine = bookingForm['machine'].value;
      const time = bookingForm['time'].value;
      const userId = firebaseAuth.currentUser?.uid;

      // Validate inputs
      if (!machine || !time) {
        throw new Error('Please select a machine and time');
      }
      if (!userId) {
        throw new Error('You must be logged in to make a booking');
      }

      // Show loading state
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      // Create booking document
      await firebaseFirestore.collection('bookings').add({
        machine: machine,
        time: time,
        userId: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log('✅ Booking successful');
      alert('Your booking has been confirmed!');
      bookingForm.reset();

    } catch (error) {
      console.error('❌ Booking error:', error);
      
      // Show error to user
      const errorElement = document.getElementById('booking-error');
      if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
      }
      
      // Reset button
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Book Machine';
      }
    }
  });
});
