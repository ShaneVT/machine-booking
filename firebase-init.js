// Initialize Firebase only once
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded');
} else if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
    authDomain: "machine-booking-3c611.firebaseapp.com",
    projectId: "machine-booking-3c611",
    storageBucket: "machine-booking-3c611.appspot.com",
    messagingSenderId: "417259615223",
    appId: "1:417259615223:web:8535395de07d7bce0db4f2"
  };
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
}

// Export services
const auth = firebase.auth();
const db = firebase.firestore();

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.firebaseAuth = auth;
  window.firebaseDb = db;
}
