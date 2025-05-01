// app.js

// 1) Bring in your initialized Firestore "db"…
import { db } from "./firebase-init.js";

// 2) …and only once pull in all the Firestore helpers you need:
import {
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// 3) Inject your entire UI into a single root container
const root = document.getElementById("root");
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
  <!-- (…all of your other sections here: admin, logs, audit, user, etc…) -->
`;

// 4) Cache your main sections
const modeSelect  = document.getElementById("mode-selection");
const loginPrompt = document.getElementById("login-prompt");
// …and the rest of your sections, e.g.
// const adminSec = document.getElementById("admin-section");
// const logSec   = document.getElementById("log-section");
// const auditSec = document.getElementById("audit-section");
// const userSec  = document.getElementById("user-section");

let subs = {};   // to hold any onSnapshot unsubscribe fns

const hideAll = () => {
  [ modeSelect, loginPrompt /*, adminSec, logSec, auditSec, userSec */ ]
    .forEach(el => el.classList.add("hidden"));
  // tear down any live listeners
  Object.values(subs).forEach(unsub => unsub && unsub());
  subs = {};
};

const show = el => el.classList.remove("hidden");

// start on the mode picker
hideAll();
show(modeSelect);

// — ADMIN BUTTONS —

document.getElementById("admin-btn").onclick = () => {
  hideAll();
  document.getElementById("pw-input").value = "";
  document.getElementById("pw-error").textContent = "";
  show(loginPrompt);
};

document.getElementById("pw-cancel").onclick = () => {
  hideAll();
  show(modeSelect);
};

document.getElementById("pw-submit").onclick = () => {
  const ADMIN_PASS = "0404";
  if (document.getElementById("pw-input").value !== ADMIN_PASS) {
    document.getElementById("pw-error").textContent = "Incorrect password";
    return;
  }
  hideAll();
  // show(adminSec);
  // wire up real-time machines list
  subs.machines = onSnapshot(
    collection(db, "machines"),
    snap => {
      const ul = document.getElementById("machines-list");
      ul.innerHTML = "";
      snap.forEach(d => {
        const li = document.createElement("li");
        li.textContent = d.data().name;
        ul.appendChild(li);
      });
    }
  );
};

// …then your other admin handlers (add-machine, view-logs, view-audit, weekly toggle, back, etc.)

// — LOGS, AUDIT, USER, WEEKLY VIEW —
// (Make sure each `onSnapshot` or `getDocs` lives in its own handler
// and you never re-`import` Firestore primitives again.)

// — BOOKING SUBMIT HANDLER —
// At the bottom, bind your submit button just once:
document.getElementById("submit-booking-btn").onclick = async () => {
  console.log("Submit booking clicked");
  const machine = document.getElementById("booking-machine-name").textContent;
  const user    = document.getElementById("booking-name").value.trim();
  const email   = document.getElementById("booking-email").value.trim();
  const start   = document.getElementById("booking-start").value;
  const end     = document.getElementById("booking-end").value;
  if (!user || !email || !start || !end || end <= start) {
    document.getElementById("booking-error").textContent =
      "Fill all fields and ensure end is after start.";
    return;
  }
  await addDoc(collection(db, "bookings"), {
    machine, user, email, start, end,
    completed: false
  });
  // reset & hide form
  [ "booking-name",
    "booking-email",
    "booking-start",
    "booking-end" ]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("booking-form")
          .classList.add("hidden");
};


  window.openDetail=(id,b)=>{const detail=document.getElementById('booking-detail');detail.classList.remove('hidden');detail.innerHTML=`<h4>Details</h4><p>Machine: ${b.machine}</p><p>User: ${b.user}</p><label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label><label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label><label>Recipe Used:<select id="sel-rec"><option value=""></option><option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option><option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option><option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option><option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option></select></label><label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label><button id="btn-save">Save</button><button id="btn-complete">Complete</button><button id="btn-delete">Delete</button><button id="btn-close">Close</button>`;detail.querySelector('#btn-close').onclick=()=>detail.classList.add('hidden');detail.querySelector('#btn-save').onclick=async()=>{const phys=detail.querySelector('#chk-phys').checked;const rec=detail.querySelector('#chk-rec').checked;const used=detail.querySelector('#sel-rec').value;const pres=detail.querySelector('#inp-pr').value;await updateDoc(doc(db,'bookings',id),{physical:phys,recipe:rec,recipeUsed:used,pressure:pres,physicalTime:phys?Date.now():b.physicalTime,recipeTime:rec?Date.now():b.recipeTime,pressureTime:pres?Date.now():b.pressureTime});detail.classList.add('hidden');};detail.querySelector('#btn-complete').onclick=async()=>{await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});detail.classList.add('hidden');};detail.querySelector('#btn-delete').onclick=async()=>{await deleteDoc(doc(db,'bookings',id));detail.classList.add('hidden');};};
});
