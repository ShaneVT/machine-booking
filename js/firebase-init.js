// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// Initialize Firebase with comprehensive error handling
(function initializeFirebase() {
  try {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not detected. Load Firebase scripts first.');
    }

    // Initialize only once
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('🔥 Firebase successfully initialized');
    }

    // Make available globally
    window.firebaseApp = firebase.app();
    window.firebaseAuth = firebase.auth();
    window.firebaseFirestore = firebase.firestore();

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    alert('Critical error: Firebase failed to initialize. Please try again later.');
  }
})();
