function initLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) {
    console.error('Login form not found');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'admin.html';
    } catch (error) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message.replace('Firebase: ', '')}`);
    }
  });
}

// Wait for Firebase and DOM
document.addEventListener('DOMContentLoaded', () => {
  if (window.auth) {
    initLoginForm();
  } else {
    window.addEventListener('firebaseReady', initLoginForm);
  }
});
