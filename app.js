// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// ——— Your Firebase project settings ———
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// Initialize Firebase & Firestore once
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';

  // grab all of our sections/buttons
  const modeSelect   = document.getElementById('mode-selection');
  const loginPrompt  = document.getElementById('login-prompt');
  const adminSec     = document.getElementById('admin-section');
  const logSec       = document.getElementById('log-section');
  const auditSec     = document.getElementById('audit-section');
  const userSec      = document.getElementById('user-section');

  let subs = {};   // keep track of onSnapshot unsubscribers

  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(el => el.classList.add('hidden'));
    // unsubscribe any active real-time listeners
    Object.values(subs).forEach(u => u && u());
    subs = {};
  }
  function show(el) {
    el.classList.remove('hidden');
  }

  // start at mode selection
  hideAll();
  show(modeSelect);

  // —— Admin flow ——
  document.getElementById('admin-btn').onclick = () => {
    hideAll();
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-error').textContent = '';
    show(loginPrompt);
  };

  document.getElementById('pw-cancel').onclick = () => {
    hideAll();
    show(modeSelect);
  };

  document.getElementById('pw-submit').onclick = () => {
    if (document.getElementById('pw-input').value !== ADMIN_PASS) {
      document.getElementById('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(adminSec);

    // live-update your machines list
    subs.machines = onSnapshot(
      collection(db, 'machines'),
      snap => {
        const ul = document.getElementById('machines-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          ul.appendChild(li);
        });
      }
    );
  };

  document.getElementById('admin-back').onclick = () => {
    hideAll();
    show(modeSelect);
  };

  document.getElementById('add-machine-btn').onclick = async () => {
    const name = document.getElementById('machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db, 'machines'), { name });
    document.getElementById('machine-name-input').value = '';
  };

  // —— Usage Logs ——
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll();
    show(logSec);

    async function filterAndRender() {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db, 'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const dateOnly = b.start.slice(0, 10);
        if ((!from || dateOnly >= from) && (!to || dateOnly <= to)) {
          rows.push({ id: d.id, ...b });
        }
      });

      const tb = document.getElementById('log-table-body');
      tb.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        // columns: machine, user, start/end, cleaning flags, completed, actions
        [ b.machine,
          b.user,
          b.start,
          b.end,
          b.physical ? '✔' : '✘',
          b.recipe   ? '✔' : '✘',
          b.pressure || '',
          b.completed? '✔' : '✘'
        ].forEach(cell => {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        // Actions: Delete & Complete
        const act = document.createElement('td');
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db, 'bookings', b.id));
          filterAndRender();
        };
        const cmp = document.createElement('button');
        cmp.textContent = 'Complete';
        cmp.onclick = async () => {
          await updateDoc(doc(db, 'bookings', b.id), {
            completed: true,
            completedTime: Date.now()
          });
          filterAndRender();
        };
        act.append(del, cmp);
        tr.appendChild(act);

        tb.appendChild(tr);
      });
    }

    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    filterAndRender();
  };

  document.getElementById('log-back-btn').onclick = () => {
    hideAll();
    show(adminSec);
  };

  // —— Audit Log ——
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll();
    show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db, 'audit'), orderBy('time')),
      snap => {
        const tb = document.getElementById('audit-table-body');
        tb.innerHTML = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(),
            a.user,
            a.action,
            a.details
          ].forEach(v => {
            const td = document.createElement('td');
            td.textContent = v;
            tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
      }
    );
  };
  document.getElementById('audit-back-btn').onclick = () => {
    hideAll();
    show(adminSec);
  };

  // —— Weekly View Utility ——  
  function drawWeekly(body, bookings) {
    // bookings: array of { start, ... }. Mark any slot as “X”
    const slots = {};
    bookings.forEach(b => {
      const d = new Date(b.start);
      const day = d.getDay();   // 0–6, Sun–Sat
      const h   = d.getHours();
      if (h >= 9 && h < 17) slots[day+'-'+h] = true;
    });

    body.innerHTML = '';
    for (let h = 9; h < 17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for (let dow = 1; dow <= 7; dow++) {
        const td = document.createElement('td');
        td.textContent = slots[dow+'-'+h] ? 'X' : '';
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  document.getElementById('view-weekly-btn').onclick = async () => {
    const body = document.getElementById('weekly-body');
    const snap = await getDocs(collection(db, 'bookings'));
    drawWeekly(body, snap.docs.map(d => d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // —— User Flow ——
  document.getElementById('user-btn').onclick = () => {
    hideAll();
    show(userSec);

    // list machines
    subs.machinesU = onSnapshot(
      collection(db, 'machines'),
      snap => {
        const ul = document.getElementById('user-machines');
        ul.innerHTML = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          li.onclick = () => {
            document.getElementById('booking-machine-name').textContent = d.data().name;
            show(document.getElementById('booking-form'));
          };
          ul.appendChild(li);
        });
      }
    );

    // list **active** bookings
    subs.bookingsU = onSnapshot(
      query(collection(db, 'bookings'), orderBy('start')),
      snap => {
        const ul = document.getElementById('booking-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${b.start}→${b.end})`;
          li.onclick = () => openDetail(d.id, b);
          ul.appendChild(li);
        });
      }
    );
  };
  document.getElementById('user-back').onclick = () => {
    hideAll();
    show(modeSelect);
  };

  document.getElementById('user-weekly-btn').onclick = async () => {
    const body = document.getElementById('user-weekly-body');
    const snap = await getDocs(collection(db, 'bookings'));
    drawWeekly(body, snap.docs.map(d => d.data()));
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };

  // —— Detail / Edit Pane ——
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User:    ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${ [1,2,3,4].map(n => `<option value="${n}" ${b.recipeUsed==n?'selected':''}>${n}</option>`).join('') }
        </select>
      </label>
      <label>Pressure:
        <input id="inp-pr" type="number" value="${b.pressure||''}"/>
      </label>
      <div style="margin-top:10px">
        <button id="btn-save">Save</button>
        <button id="btn-complete">Complete</button>
        <button id="btn-delete">Delete</button>
        <button id="btn-close">Close</button>
      </div>
    `;

    detail.querySelector('#btn-close').onclick = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick = async () => {
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pr   = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        recipe: rec,
        recipeUsed: used,
        pressure: pr,
        physicalTime: phys? Date.now() : b.physicalTime,
        recipeTime:   rec? Date.now() : b.recipeTime,
        pressureTime: pr? Date.now() : b.pressureTime
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-complete').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), {
        completed: true,
        completedTime: Date.now()
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-delete').onclick = async () => {
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };

  // —— Submit booking form ——  
  document.getElementById('submit-booking-btn').onclick = async () => {
    console.log('Submit booking clicked');
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
    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end, completed: false
    });
    // reset
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('booking-form').classList.add('hidden');
  };
});

  window.openDetail=(id,b)=>{const detail=document.getElementById('booking-detail');detail.classList.remove('hidden');detail.innerHTML=`<h4>Details</h4><p>Machine: ${b.machine}</p><p>User: ${b.user}</p><label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label><label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label><label>Recipe Used:<select id="sel-rec"><option value=""></option><option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option><option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option><option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option><option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option></select></label><label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label><button id="btn-save">Save</button><button id="btn-complete">Complete</button><button id="btn-delete">Delete</button><button id="btn-close">Close</button>`;detail.querySelector('#btn-close').onclick=()=>detail.classList.add('hidden');detail.querySelector('#btn-save').onclick=async()=>{const phys=detail.querySelector('#chk-phys').checked;const rec=detail.querySelector('#chk-rec').checked;const used=detail.querySelector('#sel-rec').value;const pres=detail.querySelector('#inp-pr').value;await updateDoc(doc(db,'bookings',id),{physical:phys,recipe:rec,recipeUsed:used,pressure:pres,physicalTime:phys?Date.now():b.physicalTime,recipeTime:rec?Date.now():b.recipeTime,pressureTime:pres?Date.now():b.pressureTime});detail.classList.add('hidden');};detail.querySelector('#btn-complete').onclick=async()=>{await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});detail.classList.add('hidden');};detail.querySelector('#btn-delete').onclick=async()=>{await deleteDoc(doc(db,'bookings',id));detail.classList.add('hidden');};};
