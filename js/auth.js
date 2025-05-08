/**
 * Authentication Module
 * Handles login form functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  // Check if login form exists on this page
  const loginForm = document.getElementById('login-form');
  if (!loginForm) {
    console.log('ℹ️ No login form detected on this page');
    return;
  }

  console.log('🔐 Initializing login form...');

  // Form submission handler
  loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    try {
      // Get form values
      const email = loginForm['email'].value.trim();
      const password = loginForm['password'].value;

      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      // Firebase authentication
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      console.log('✅ Login successful:', userCredential.user.email);
      
      // Redirect to booking page
      window.location.href = './booking.html';

    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Show error to user
      const errorElement = document.getElementById('login-error');
      if (errorElement) {
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
      }
      
      // Reset form button
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  });
});
