// ======================
// Firebase Configuration
// ======================
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// ======================
// Firebase Initialization
// ======================
(function initFirebase() {
  try {
    // 1. Verify Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded! Check script loading order.');
    }

    // 2. Initialize only once
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('🔥 Firebase successfully initialized');
    }

    // 3. Expose necessary Firebase modules
    window.firebaseAuth = firebase.auth();
    window.firebaseFirestore = firebase.firestore();
    window.firebaseApp = firebase.app();

  } catch (error) {
    console.error('❌ FATAL: Firebase init failed:', error);
    
    // Show error to user if possible
    if (typeof document !== 'undefined') {
      const errorDiv = document.createElement('div');
      errorDiv.style = "position:fixed;top:0;left:0;right:0;background:red;color:white;padding:1rem;z-index:9999";
      errorDiv.textContent = `System Error: ${error.message}`;
      document.body.prepend(errorDiv);
    }
  }
})();
