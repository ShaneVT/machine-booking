// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Toast notification function
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '10px 20px';
  toast.style.background = isError ? '#ff4444' : '#4CAF50';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '1000';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Booking submission
const submitBooking = async (event) => {
  event.preventDefault();
  
  try {
    // Get form values
    const machine = document.getElementById('machine').value;
    const startTimeInput = document.getElementById('start-time').value;
    const endTimeInput = document.getElementById('end-time').value;
    const userName = document.getElementById('user-name').value;
    const userEmail = document.getElementById('user-email').value;

    // Validate inputs
    if (!machine || !startTimeInput || !endTimeInput || !userName || !userEmail) {
      showToast('Please fill all fields', true);
      return;
    }

    // Create Date objects
    const startTime = new Date(startTimeInput);
    const endTime = new Date(endTimeInput);

    // Validate dates
    if (isNaN(startTime.getTime()) {
      showToast('Invalid start time', true);
      return;
    }
    if (isNaN(endTime.getTime())) {
      showToast('Invalid end time', true);
      return;
    }
    if (endTime <= startTime) {
      showToast('End time must be after start time', true);
      return;
    }

    // Check for existing bookings
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("machine", "==", machine),
      where("startTime", "<", endTime),
      where("endTime", ">", startTime)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      showToast('Time slot already booked', true);
      return;
    }

    // Add new booking
    await addDoc(bookingsRef, {
      machine,
      startTime,
      endTime,
      userName,
      userEmail,
      status: "confirmed",
      createdAt: new Date()
    });

    // Success
    showToast('Booking successful!');
    event.target.reset();

  } catch (error) {
    console.error("Booking error:", error);
    showToast(`Booking failed: ${error.message}`, true);
  }
};

// Initialize form
document.getElementById('booking-form').onsubmit = submitBooking;
