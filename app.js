import {
  collection, addDoc, onSnapshot, query, orderBy,
  getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from './firebase.js';

// Rendered UI template
const root = document.getElementById('root');
root.innerHTML = `
  <h1>Machine Booking System</h1>
  <div id="mode-selection">
    <button id="admin-btn">Admin</button>
    <button id="user-btn">User</button>
  </div>
  <!-- Login, Admin, Logs, Audit, User sections will be injected -->
  <div id="login-prompt" class="hidden">…</div>
  <section id="admin-section" class="hidden">…</section>
  <section id="log-section" class="hidden">…</section>
  <section id="audit-section" class="hidden">…</section>
  <section id="user-section" class="hidden">…</section>
`;

// After injecting markup above, bind all event handlers in DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  // Cache DOM elements
  const modeSelect   = document.getElementById('mode-selection');
  const loginPrompt  = document.getElementById('login-prompt');
  const adminSec     = document.getElementById('admin-section');
  const logSec       = document.getElementById('log-section');
  const auditSec     = document.getElementById('audit-section');
  const userSec      = document.getElementById('user-section');
  let subs = {};

  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(el => el.classList.add('hidden'));
    Object.values(subs).forEach(u => u && u());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }

  // Initial state
  hideAll();
  show(modeSelect);

  // ** Submit Booking Handler **
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const start   = document.getElementById('booking-start').value;
    const end     = document.getElementById('booking-end').value;
    if (!user || !email || !start || !end || end <= start) {
      document.getElementById('booking-error').textContent =
        'Fill all fields and ensure end is after start.';
      return;
    }
    await addDoc(collection(db,'bookings'), { machine, user, email, start, end, completed: false });
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // … Bind Admin, Logs, Audit, Weekly, User, Detail/Edit handlers exactly as spec …
});
