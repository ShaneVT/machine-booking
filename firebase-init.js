// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getFirestore }       from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Replace these values with your Firebase project’s credentials:
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",            // ← Must be your actual projectId
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
