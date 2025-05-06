// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

import { firebaseConfig } from './firebase.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const els = {
    modeSelect:   document.getElementById('mode-selection'),
    loginPrompt:  document.getElementById('login-prompt'),
    adminSec:     document.getElementById('admin-section'),
    logSec:       document.getElementById('log-section'),
    auditSec:     document.getElementById('audit-section'),
    userSec:      document.getElementById('user-section'),
  };
  let subs = {};

  function hideAll() {
    Object.values(els).forEach(e => e.classList.add('hidden'));
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }

  // initial
  hideAll(); show(els.modeSelect);

  // Admin flow
  document.getElementById('admin-btn').onclick = () => { hideAll(); show(els.loginPrompt); };
  document.getElementById('pw-cancel').onclick = () => { hideAll(); show(els.modeSelect); };
  document.getElementById('pw-submit').onclick = () => {
    if (document.getElementById('pw-input').value !== ADMIN_PASS) {
      document.getElementById('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll(); show(els.adminSec);
    // live machine list
    subs.machines = onSnapshot(collection(db, 'machines'), snap => {
      const ul = document.getElementById('machines-list');
      ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        // allow delete:
        const btnX = document.createElement('span');
        btnX.textContent = ' ✖';
        btnX.style.cursor = 'pointer';
        btnX.onclick = async () => { await deleteDoc(doc(db,'machines',d.id)); };
        li.appendChild(btnX);
        ul.appendChild(li);
      });
    });
  };
  document.getElementById('admin-back').onclick = () => { hideAll(); show(els.modeSelect); };
  document.getElementById('add-machine-btn').onclick = async () => {
    const name = document.getElementById('machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db,'machines'), { name });
    document.getElementById('machine-name-input').value = '';
  };

  // ─── Usage Logs ───────────
  document.getElementById('view-logs-btn').onclick = async () => {
    hideAll(); show(els.logSec);
    const render = async () => {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const dt = new Date(b.start).toISOString().slice(0,10);
        if ((!from||dt>=from) && (!to||dt<=to)) rows.push({ id: d.id, ...b });
      });
      const tbody = document.getElementById('log-table-body');
      tbody.innerHTML = '';
      rows.sort((a,b)=>new Date(a.start)-new Date(b.start)).forEach(b => {
        const tr = document.createElement('tr');
        [ b.machine, b.user, b.start, b.end,
          b.physical?'✔':'✘',
          b.recipe?'✔':'✘',
          b.pressure||'',
          b.completed?'✔':'✘'
        ].forEach(v => {
          const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
        });
        const actions = document.createElement('td');
        const del = document.createElement('button'); del.textContent='Delete';
        del.onclick = async() => { await deleteDoc(doc(db,'bookings',b.id)); render(); };
        const comp = document.createElement('button'); comp.textContent='Complete';
        comp.onclick = async() => { await updateDoc(doc(db,'bookings',b.id), { completed:true, completedTime:Date.now() }); render(); };
        actions.append(del, comp);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
    };
    document.getElementById('filter-logs-btn').onclick = render;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    render();
  };
  document.getElementById('log-back-btn').onclick = () => { hideAll(); show(els.adminSec); };

  // ─── Audit Log ───────────
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll(); show(els.auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tb = document.getElementById('audit-table-body');
        tb.innerHTML = '';
        snap.forEach(d => {
          const a = d.data(), tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(), a.user, a.action, a.details ]
            .forEach(v=>{ const td=document.createElement('td'); td.textContent=v; tr.appendChild(td); });
          tb.appendChild(tr);
        });
      }
    );
  };
  document.getElementById('audit-back-btn').onclick = () => { hideAll(); show(els.adminSec); };

  // ─── Weekly View helper ───────────
  function drawWeekly(bodyEl, bookings) {
    bodyEl.innerHTML = '';
    // build a map of [machine-day-hour] => user
    const slots = {};
    bookings.forEach(b => {
      const start = new Date(b.start);
      const end   = new Date(b.end);
      if (isNaN(start)||isNaN(end)) return;
      for (let t = new Date(start); t < end; t.setHours(t.getHours()+1)) {
        const d = t.getDay(); // 1..7 (Sun=0)
        const h = t.getHours();
        if (d>=1 && d<=7 && h>=9 && h<17) {
          slots[`${d}-${h}`] = b.user;
        }
      }
    });
    for (let h = 9; h < 17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for (let dow = 1; dow <= 7; dow++) {
        const td = document.createElement('td');
        td.textContent = slots[`${dow}-${h}`] || '';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }

  document.getElementById('view-weekly-btn').onclick = async () => {
    const body = document.getElementById('weekly-body');
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // ─── User flow ───────────
  document.getElementById('user-btn').onclick = () => {
    hideAll(); show(els.userSec);

    // machine list for user
    subs.machinesU = onSnapshot(collection(db,'machines'), snap => {
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
    });

    // active bookings list
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
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
  document.getElementById('user-back').onclick = () => { hideAll(); show(els.modeSelect); };

  document.getElementById('user-weekly-btn').onclick = async () => {
    const body = document.getElementById('user-weekly-body');
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };

  // ─── Booking submit ───────────
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const start   = document.getElementById('booking-start').value;
    const end     = document.getElementById('booking-end').value;

    // validation
    if (!user||!email||!start||!end||end<=start) {
      document.getElementById('booking-error').textContent =
        'Please fill all fields and ensure end > start.';
      return;
    }

    // prevent double booking on same machine/time overlap
    const overlapQ = query(
      collection(db,'bookings'),
      where('machine','==',machine)
    );
    const existing = await getDocs(overlapQ);
    const newStart = new Date(start), newEnd = new Date(end);
    for (let d of existing.docs) {
      const b = d.data();
      const s = new Date(b.start), e = new Date(b.end);
      if (newStart < e && newEnd > s) {
        document.getElementById('booking-error').textContent =
          'That time slot is already booked.';
        return;
      }
    }

    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end,
      physical: false, recipe: false, pressure: '',
      completed: false
    });

    // clear
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id=>document.getElementById(id).value='');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // ─── Detail / edit drawer ───────────
  window.openDetail = (id,b) => {
    const detail = document.getElementById('booking-detail');
    detail.innerHTML = `
      <h4>Details</h4>
      <p><strong>Machine:</strong> ${b.machine}</p>
      <p><strong>User:</strong> ${b.user}</p>
      <label>
        <input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/>
        Physical Cleaning
      </label>
      <label>
        <input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/>
        Recipe Cleaning
      </label>
      <label>
        Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${[1,2,3,4].map(n=>
            `<option value="${n}" ${b.recipeUsed==n?'selected':''}>${n}</option>`
          ).join('')}
        </select>
      </label>
      <label>
        Pressure:
        <input type="number" id="inp-pr" value="${b.pressure||''}"/>
      </label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.classList.remove('hidden');

    detail.querySelector('#btn-close').onclick = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick = async () => {
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        physicalTime: phys?Date.now():b.physicalTime,
        recipe: rec,
        recipeUsed: used,
        recipeTime: rec?Date.now():b.recipeTime,
        pressure: pres,
        pressureTime: pres?Date.now():b.pressureTime,
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-complete').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), { completed:true, completedTime:Date.now() });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-delete').onclick = async () => {
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };
});
