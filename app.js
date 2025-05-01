// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query,
  orderBy, getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect   = document.getElementById('mode-selection');
  const loginPrompt  = document.getElementById('login-prompt');
  const adminSec     = document.getElementById('admin-section');
  const logSec       = document.getElementById('log-section');
  const auditSec     = document.getElementById('audit-section');
  const userSec      = document.getElementById('user-section');
  const weeklyView   = document.getElementById('weekly-view');
  const userWeekly   = document.getElementById('user-weekly-view');

  let subs = {};

  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec, weeklyView, userWeekly]
      .forEach(el => el.classList.add('hidden'));
    // unsubscribe any real-time listeners
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }

  // start on mode select
  hideAll();
  show(modeSelect);

  // ——— Admin flow ———
  document.getElementById('admin-btn').onclick = () => {
    hideAll();
    show(loginPrompt);
  };
  document.getElementById('pw-cancel').onclick = () => {
    hideAll();
    show(modeSelect);
  };
  document.getElementById('pw-submit').onclick = () => {
    const pw = document.getElementById('pw-input').value;
    if (pw !== ADMIN_PASS) {
      document.getElementById('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(adminSec);

    // live machines list
    subs.machines = onSnapshot(collection(db, 'machines'), snap => {
      const ul = document.getElementById('machines-list');
      ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        // allow removal
        const del = document.createElement('span');
        del.textContent = ' [×]';
        del.classList.add('delete-btn');
        del.onclick = async () => {
          await deleteDoc(doc(db, 'machines', d.id));
        };
        li.appendChild(del);
        ul.appendChild(li);
      });
    });
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

  // ——— Logs ———
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll();
    show(logSec);

    async function filterAndRender() {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db, 'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b  = d.data();
        const sd = new Date(b.start);
        const day = sd.toISOString().slice(0,10);
        if (( !from || day >= from ) && ( !to || day <= to )) {
          rows.push({ id: d.id, ...b });
        }
      });

      const tbody = document.getElementById('log-table-body');
      tbody.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        [
          b.machine, b.user,
          new Date(b.start).toLocaleString(),
          new Date(b.end).toLocaleString(),
          b.physical? '✔':'✘',
          b.recipe?   '✔':'✘',
          b.pressure || '',
          b.completed? '✔':'✘'
        ].forEach(txt => {
          const td = document.createElement('td');
          td.textContent = txt;
          tr.appendChild(td);
        });
        // actions
        const act = document.createElement('td');
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db,'bookings',b.id));
          filterAndRender();
        };
        const comp = document.createElement('button');
        comp.textContent = 'Complete';
        comp.onclick = async () => {
          await updateDoc(doc(db,'bookings',b.id), {
            completed: true,
            completedTime: Date.now()
          });
          filterAndRender();
        };
        act.append(del, comp);
        tr.appendChild(act);

        tbody.appendChild(tr);
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

  // ——— Audit ———
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll();
    show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tb = document.getElementById('audit-table-body');
        tb.innerHTML = '';
        snap.forEach(d => {
          const a  = d.data();
          const tr = document.createElement('tr');
          [
            new Date(a.time).toLocaleString(),
            a.user, a.action, a.details
          ].forEach(txt => {
            const td = document.createElement('td');
            td.textContent = txt;
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

  // ——— Weekly Schedule ———
  function drawWeekly(bodyEl, bookings) {
    // map slot → user
    const slots = {};
    bookings.forEach(b => {
      // start/end as Date
      const sd = b.start.toDate ? b.start.toDate() : new Date(b.start);
      const ed = b.end  .toDate ? b.end.toDate()   : new Date(b.end);
      if (isNaN(sd) || isNaN(ed) || ed <= sd) return;

      const day       = sd.getDay();               // 0=Sun…6=Sat
      const startHour = sd.getHours();
      const endHour   = ed.getHours() + (ed.getMinutes()>0 ? 1 : 0);

      for (let hr = startHour; hr < endHour; hr++) {
        if (day >= 1 && day <= 7 && hr >= 9 && hr < 17) {
          slots[`${day}-${hr}`] = b.user;
        }
      }
    });

    bodyEl.innerHTML = '';
    for (let hr = 9; hr < 17; hr++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${hr}:00`;
      tr.appendChild(th);

      for (let d = 1; d <= 7; d++) {
        const td = document.createElement('td');
        const key = `${d}-${hr}`;
        if (slots[key]) td.textContent = slots[key];
        tr.appendChild(td);
      }

      bodyEl.appendChild(tr);
    }
  }

  document.getElementById('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(
      document.getElementById('weekly-body'),
      snap.docs.map(d => d.data())
    );
    weeklyView.classList.toggle('hidden');
  };

  // ——— User flow ———
  document.getElementById('user-btn').onclick = () => {
    hideAll();
    show(userSec);

    // machines list
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

    // active bookings
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        const ul = document.getElementById('booking-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${new Date(b.start).toLocaleString()}→${new Date(b.end).toLocaleString()})`;
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
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(
      document.getElementById('user-weekly-body'),
      snap.docs.map(d => d.data())
    );
    userWeekly.classList.toggle('hidden');
  };

  // ——— Booking form submit ———
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
    // prevent double-booking on same machine/hour
    const snap = await getDocs(query(
      collection(db,'bookings'),
      orderBy('start')
    ));
    const conflict = snap.docs.some(d => {
      const b = d.data();
      if (b.machine !== machine || b.completed) return false;
      const a1 = new Date(b.start), a2 = new Date(b.end);
      const n1 = new Date(start), n2 = new Date(end);
      return !(n2 <= a1 || n1 >= a2);
    });
    if (conflict) {
      document.getElementById('booking-error').textContent =
        'That slot is already booked.';
      return;
    }

    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end,
      physical: false, recipe: false, pressure: '',
      completed: false
    });

    // reset & hide
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // ——— Detail/Edit popup ———
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p><strong>Machine:</strong> ${b.machine}</p>
      <p><strong>User:</strong> ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          <option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>Pressure:
        <input id="inp-pr" type="number" value="${b.pressure||''}" />
      </label>
      <div style="margin-top:10px;">
        <button id="btn-save">Save</button>
        <button id="btn-complete">Complete</button>
        <button id="btn-delete">Delete</button>
        <button id="btn-close">Close</button>
      </div>
    `;

    detail.querySelector('#btn-close').onclick    = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick     = async () => {
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        recipe:    rec,
        recipeUsed: used,
        pressure:   pres,
        physicalTime: phys? Date.now() : b.physicalTime,
        recipeTime:   rec? Date.now() : b.recipeTime,
        pressureTime: pres? Date.now() : b.pressureTime
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
    detail.querySelector('#btn-delete').onclick   = async () => {
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };

});
