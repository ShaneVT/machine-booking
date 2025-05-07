// Load Firebase SDKs if not already loaded
if (typeof firebase === 'undefined') {
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"><\/script>');
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"><\/script>');
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"><\/script>');
  document.write('<script>window.firebaseLoaded = true<\/script>');
}

// Initialize Firebase
function initializeFirebase() {
  const firebaseConfig = {
    apiKey: "AIzaSyBx3LxJX5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y",
    authDomain: "machine-booking.firebaseapp.com",
    projectId: "machine-booking",
    storageBucket: "machine-booking.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.firestore();
  window.auth = firebase.auth();
}

// Wait for Firebase to load
if (window.firebaseLoaded) {
  initializeFirebase();
} else {
  window.addEventListener('firebaseLoaded', initializeFirebase);
}
