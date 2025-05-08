// ======================
// Authentication Handler
// ======================
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  
  // Exit if no login form on this page
  if (!loginForm) return;

  // Form submission handler
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form elements
    const emailInput = loginForm['email'];
    const passwordInput = loginForm['password'];
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const errorDisplay = document.getElementById('login-error') || createErrorDisplay(loginForm);

    try {
      // Validate inputs
      if (!emailInput.value || !passwordInput.value) {
        throw new Error('Please fill in all fields');
      }

      // Set loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      // Firebase authentication
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(
        emailInput.value.trim(),
        passwordInput.value
      );

      // Redirect after successful login
      window.location.href = './booking.html';

    } catch (error) {
      // Handle errors
      errorDisplay.textContent = error.message;
      errorDisplay.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // Helper function to create error display if none exists
  function createErrorDisplay(form) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'login-error';
    errorDiv.className = 'error-message';
    form.prepend(errorDiv);
    return errorDiv;
  }
});
