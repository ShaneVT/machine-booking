import {
  collection, addDoc, onSnapshot, query, orderBy,
  getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from './firebase.js';

// Inject UI into root
const root = document.getElementById('root');
root.innerHTML = `
  <h1>Machine Booking System</h1>
  <div id="mode-selection">
    <button id="admin-btn">Admin</button>
    <button id="user-btn">User</button>
  </div>
  <div id="login-prompt" class="hidden">
    <h3>Admin Login</h3>
    <input type="password" id="pw-input" placeholder="Password" />
    <button id="pw-submit">Login</button>
    <button id="pw-cancel">Cancel</button>
    <div id="pw-error" style="color:red;"></div>
  </div>
  <section id="admin-section" class="hidden">
    <h2>Admin Panel</h2>
    <button id="admin-back">Back</button>
    <h3>Manage Machines</h3>
    <input type="text" id="machine-name-input" placeholder="Machine name" />
    <button id="add-machine-btn">Add Machine</button>
    <ul id="machines-list"></ul>
    <h3>Reports</h3>
    <button id="view-logs-btn">View Logs</button>
    <button id="view-audit-btn">View Audit</button>
    <button id="view-weekly-btn">Toggle Weekly View</button>
    <div id="weekly-view" class="hidden">
      <h3>Weekly Schedule (9–17h)</h3>
      <table>
        <thead>
          <tr><th>Hour</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>
        </thead>
        <tbody id="weekly-body"></tbody>
      </table>
    </div>
  </section>
  <section id="log-section" class="hidden">
    <h3>Usage Logs</h3>
    <button id="log-back-btn">Back</button>
    <label>From: <input type="date" id="log-date-start" /></label>
    <label>To:   <input type="date" id="log-date-end"   /></label>
    <button id="filter-logs-btn">Filter</button>
    <button id="export-pdf-btn">Export PDF</button>
    <table>
      <thead>
        <tr><th>Machine</th><th>User</th><th>Start</th><th>End</th><th>Phys</th><th>Rec</th><th>Pres</th><th>Done</th><th>Actions</th></tr>
      </thead>
      <tbody id="log-table-body"></tbody>
    </table>
  </section>
  <section id="audit-section" class="hidden">
    <h3>Audit Log</h3>
    <button id="audit-back-btn">Back</button>
    <table>
      <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
      <tbody id="audit-table-body"></tbody>
    </table>
  </section>
  <section id="user-section" class="hidden">
    <h2>User Booking</h2>
    <button id="user-back">Back</button>
    <h3>Select Machine</h3>
    <ul id="user-machines"></ul>
    <button id="user-weekly-btn">Toggle Weekly View</button>
    <div id="user-weekly-view" class="hidden">
      <h3>Your Weekly (9–17h)</h3>
      <table>
        <thead><tr><th>Hour</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr></thead>
        <tbody id="user-weekly-body"></tbody>
      </table>
    </div>
    <div id="booking-form" class="hidden">
      <h3>Book: <span id="booking-machine-name"></span></h3>
      <label>Name:  <input type="text" id="booking-name"  /></label>
      <label>Email: <input type="email" id="booking-email" /></label>
      <label>Start: <input type="datetime-local" id="booking-start"/></label>
      <label>End:   <input type="datetime-local" id="booking-end"  /></label>
      <button id="submit-booking-btn">Submit</button>
      <div id="booking-error" style="color:red;"></div>
    </div>
    <h3>Your Active Bookings</h3>
    <ul id="booking-list"></ul>
    <div id="booking-detail" class="hidden"></div>
  </section>
`;

// Main logic
```js
// ... Bind DOMContentLoaded and all handlers exactly as previous long code ...
