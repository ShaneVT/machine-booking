// Load Firebase SDKs if not already loaded
if (typeof firebase === 'undefined') {
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"><\/script>');
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"><\/script>');
  document.write('<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"><\/script>');
  document.write('<script>window.firebaseLoaded = true<\/script>');
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
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
