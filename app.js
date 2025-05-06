// app.js
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// ———— FIREBASE INITIALIZATION (only once) ————
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// ———— DOM & STATE SETUP ————
document.addEventListener("DOMContentLoaded", () => {
  const ADMIN_PASS = "0404";
  const modeSelect   = document.getElementById("mode-selection");
  const loginPrompt  = document.getElementById("login-prompt");
  const adminSec     = document.getElementById("admin-section");
  const logSec       = document.getElementById("log-section");
  const auditSec     = document.getElementById("audit-section");
  const userSec      = document.getElementById("user-section");
  let subs = {};

  const hideAll = () => {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec].forEach(el => el.classList.add("hidden"));
    // unsubscribe
    Object.values(subs).forEach(fn => fn && fn());
    subs = {};
  };
  const show = el => el.classList.remove("hidden");
  hideAll();
  show(modeSelect);

  // ———— ADMIN FLOW ————
  document.getElementById("admin-btn").onclick = () => {
    hideAll(); show(loginPrompt);
  };
  document.getElementById("pw-cancel").onclick = () => {
    hideAll(); show(modeSelect);
  };
  document.getElementById("pw-submit").onclick = () => {
    const pw = document.getElementById("pw-input").value;
    if (pw !== ADMIN_PASS) {
      document.getElementById("pw-error").textContent = "Incorrect password";
      return;
    }
    hideAll();
    show(adminSec);
    // realtime machines list
    subs.machines = onSnapshot(collection(db, "machines"), snap => {
      const ul = document.getElementById("machines-list");
      ul.innerHTML = "";
      snap.forEach(d => {
        const li = document.createElement("li");
        li.textContent = d.data().name;
        // remove-machine on click
        li.onclick = async () => {
          await deleteDoc(doc(db, "machines", d.id));
        };
        ul.appendChild(li);
      });
    });
  };
  document.getElementById("admin-back").onclick = () => {
    hideAll(); show(modeSelect);
  };
  document.getElementById("add-machine-btn").onclick = async () => {
    const name = document.getElementById("machine-name-input").value.trim();
    if (!name) return;
    await addDoc(collection(db, "machines"), { name });
    document.getElementById("machine-name-input").value = "";
  };

  // ———— VIEW LOGS ————
  document.getElementById("view-logs-btn").onclick = () => {
    hideAll(); show(logSec);
    const filterAndRender = async () => {
      const from = document.getElementById("log-date-start").value;
      const to   = document.getElementById("log-date-end").value;
      const snap = await getDocs(collection(db, "bookings"));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const day = new Date(b.start).toISOString().slice(0, 10);
        if (( !from || day >= from) && (!to || day <= to)) {
          rows.push({ id: d.id, ...b });
        }
      });
      const tb = document.getElementById("log-table-body");
      tb.innerHTML = "";
      rows.forEach(b => {
        const tr = document.createElement("tr");
        [b.machine, b.user,
         new Date(b.start).toLocaleString(),
         new Date(b.end).toLocaleString(),
         b.physical ? "✔" : "✘",
         b.recipe   ? "✔" : "✘",
         b.pressure || "",
         b.completed ? "✔" : "✘"
        ].forEach(txt => {
          const td = document.createElement("td");
          td.textContent = txt;
          tr.appendChild(td);
        });
        const actTd = document.createElement("td");
        // delete
        const del = document.createElement("button");
        del.textContent = "Delete";
        del.onclick = async () => {
          await deleteDoc(doc(db, "bookings", b.id));
          filterAndRender();
        };
        // complete
        const comp = document.createElement("button");
        comp.textContent = "Complete";
        comp.onclick = async () => {
          await updateDoc(doc(db, "bookings", b.id), { completed: true, completedTime: Date.now() });
          filterAndRender();
        };
        actTd.append(del, comp);
        tr.appendChild(actTd);
        tb.appendChild(tr);
      });
    };
    document.getElementById("filter-logs-btn").onclick = filterAndRender;
    document.getElementById("export-pdf-btn").onclick  = () => window.print();
    filterAndRender();
  };
  document.getElementById("log-back-btn").onclick = () => {
    hideAll(); show(adminSec);
  };

  // ———— VIEW AUDIT ————
  document.getElementById("view-audit-btn").onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db, "audit"), orderBy("time")),
      snap => {
        const tb = document.getElementById("audit-table-body");
        tb.innerHTML = "";
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement("tr");
          [
            new Date(a.time).toLocaleString(),
            a.user, a.action, a.details
          ].forEach(txt => {
            const td = document.createElement("td");
            td.textContent = txt;
            tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
      }
    );
  };
  document.getElementById("audit-back-btn").onclick = () => {
    hideAll(); show(adminSec);
  };

  // ———— WEEKLY VIEW ————
  function drawWeekly(body, data) {
    body.innerHTML = "";
    const slots = {};
    data.forEach(b => {
      const sd = b.start.toDate ? b.start.toDate() : new Date(b.start);
      const ed = b.end.toDate   ? b.end.toDate()   : new Date(b.end);
      let cur = new Date(sd);
      while (cur < ed) {
        const d = cur.getDay(), h = cur.getHours();
        if (d >= 1 && d <= 7 && h >= 9 && h < 17) {
          slots[`${d}-${h}`] = b.user;
        }
        cur.setHours(cur.getHours()+1);
      }
    });
    for (let h = 9; h < 17; h++) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for (let d = 1; d <= 7; d++) {
        const td = document.createElement("td");
        td.textContent = slots[`${d}-${h}`] || "";
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }
  document.getElementById("view-weekly-btn").onclick = async () => {
    const snap = await getDocs(collection(db, "bookings"));
    drawWeekly(
      document.getElementById("weekly-body"),
      snap.docs.map(d => d.data())
    );
    document.getElementById("weekly-view").classList.toggle("hidden");
  };

  // ———— USER FLOW ————
  // pick user or admin
  document.getElementById("user-btn").onclick = () => {
    hideAll(); show(userSec);
    // machines list
    subs.machinesU = onSnapshot(collection(db, "machines"), snap => {
      const ul = document.getElementById("user-machines");
      ul.innerHTML = "";
      snap.forEach(d => {
        const li = document.createElement("li");
        li.textContent = d.data().name;
        li.onclick = () => {
          document.getElementById("booking-machine-name").textContent = d.data().name;
          show(document.getElementById("booking-form"));
        };
        ul.appendChild(li);
      });
    });
    // your bookings
    subs.bookingsU = onSnapshot(
      query(collection(db, "bookings"), orderBy("start")),
      snap => {
        const ul = document.getElementById("booking-list");
        ul.innerHTML = "";
        snap.forEach(d => {
          const b = d.data();
          if (!b.completed) {
            const li = document.createElement("li");
            li.textContent = `${b.machine}: ${b.user} (${new Date(b.start).toLocaleString()} → ${new Date(b.end).toLocaleString()})`;
            li.onclick = () => openDetail(d.id, b);
            ul.appendChild(li);
          }
        });
      }
    );
  };
  document.getElementById("user-back").onclick = () => {
    hideAll(); show(modeSelect);
  };
  document.getElementById("user-weekly-btn").onclick = async () => {
    const snap = await getDocs(collection(db, "bookings"));
    drawWeekly(
      document.getElementById("user-weekly-body"),
      snap.docs.map(d => d.data())
    );
    document.getElementById("user-weekly-view").classList.toggle("hidden");
  };

  // submit booking
  document.getElementById("submit-booking-btn").onclick = async () => {
    const machine = document.getElementById("booking-machine-name").textContent;
    const user    = document.getElementById("booking-name").value.trim();
    const email   = document.getElementById("booking-email").value.trim();
    const start   = document.getElementById("booking-start").value;
    const end     = document.getElementById("booking-end").value;
    if (!user || !email || !start || !end || end <= start) {
      return document.getElementById("booking-error").textContent =
        "Fill all fields and ensure end is after start.";
    }
    // no double-book for this machine
    const snap = await getDocs(
      query(collection(db, "bookings"), orderBy("start"))
    );
    for (let d of snap.docs) {
      const b = d.data();
      if (b.machine === machine) {
        if (!(end <= b.start || start >= b.end)) {
          return document.getElementById("booking-error").textContent =
            "Time clash—please choose another slot.";
        }
      }
    }
    await addDoc(collection(db, "bookings"), {
      machine, user, email, start, end,
      physical: false, recipe: false,
      completed: false
    });
    ["booking-name","booking-email","booking-start","booking-end"]
      .forEach(id => document.getElementById(id).value = "");
    document.getElementById("booking-form").classList.add("hidden");
  };

  // detail / edit panel
  window.openDetail = (id, b) => {
    const detail = document.getElementById("booking-detail");
    detail.classList.remove("hidden");
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User:    ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?"checked":""}/> Physical</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe?"checked":""}/> Recipe</label>
      <label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||""}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.querySelector("#btn-close").onclick = () => detail.classList.add("hidden");
    detail.querySelector("#btn-save").onclick = async () => {
      const phys = detail.querySelector("#chk-phys").checked;
      const rec  = detail.querySelector("#chk-rec").checked;
      const pres = detail.querySelector("#inp-pr").value;
      await updateDoc(doc(db, "bookings", id), {
        physical: phys,
        recipe:   rec,
        pressure: pres,
        physicalTime: phys ? Date.now() : b.physicalTime,
        recipeTime:   rec ? Date.now() : b.recipeTime,
        pressureTime: pres ? Date.now() : b.pressureTime
      });
      detail.classList.add("hidden");
    };
    detail.querySelector("#btn-complete").onclick = async () => {
      await updateDoc(doc(db, "bookings", id), {
        completed: true, completedTime: Date.now()
      });
      detail.classList.add("hidden");
    };
    detail.querySelector("#btn-delete").onclick = async () => {
      await deleteDoc(doc(db, "bookings", id));
      detail.classList.add("hidden");
    };
  };
});
