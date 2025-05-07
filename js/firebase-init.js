// Initialize Firebase only once
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
    authDomain: "machine-booking-3c611.firebaseapp.com",
    projectId: "machine-booking-3c611",
    storageBucket: "machine-booking-3c611.appspot.com",
    messagingSenderId: "417259615223",
    appId: "1:417259615223:web:8535395de07d7bce0db4f2"
  };
  firebase.initializeApp(firebaseConfig);
}

// Make services available globally
window.db = firebase.firestore();
window.auth = firebase.auth();
