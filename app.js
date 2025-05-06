import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  getDocs, updateDoc, doc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

import { firebaseConfig } from './firebase.js';  // <-- your config export

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
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
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  const show = el => el.classList.remove('hidden');

  hideAll();
  show(modeSelect);

  // — Admin Login Flow —
  document.getElementById('admin-btn').onclick = () => {
    hideAll();
    show(loginPrompt);
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-error').textContent = '';
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

    // realtime machines list
    subs.machines = onSnapshot(
      collection(db, 'machines'),
      snap => {
        const ul = document.getElementById('machines-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          // allow delete
          const del = document.createElement('span');
          del.textContent = '✖';
          del.classList.add('delete-btn');
          del.onclick = async () => {
            await deleteDoc(doc(db, 'machines', d.id));
          };
          li.append(del);
          ul.append(li);
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

  // — View Logs —
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll();
    show(logSec);
    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    filterAndRender();
  };
  document.getElementById('log-back-btn').onclick = () => {
    hideAll();
    show(adminSec);
  };

  // — View Audit —
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll();
    show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db, 'audit'), orderBy('time')),
      snap => {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [
            new Date(a.time).toLocaleString(),
            a.user, a.action, a.details
          ].forEach(txt => {
            const td = document.createElement('td');
            td.textContent = txt;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }
    );
  };
  document.getElementById('audit-back-btn').onclick = () => {
    hideAll();
    show(adminSec);
  };

  // — Weekly View (Admin) —
  document.getElementById('view-weekly-btn').onclick = async () => {
    const body = document.getElementById('weekly-body');
    const snap = await getDocs(collection(db, 'bookings'));
    drawWeekly(body, snap.docs.map(d => d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // — User Flow —
  document.getElementById('user-btn').onclick = () => {
    hideAll();
    show(userSec);

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
            document.getElementById('booking-form').classList.remove('hidden');
          };
          ul.appendChild(li);
        });
      }
    );

    subs.bookingsU = onSnapshot(
      query(collection(db, 'bookings'), orderBy('start')),
      snap => {
        const ul = document.getElementById('booking-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${b.start} → ${b.end})`;
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

  // — Submit Booking —
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const start   = document.getElementById('booking-start').value;
    const end     = document.getElementById('booking-end').value;
    if (!user || !email || !start || !end || end <= start) {
      document.getElementById('booking-error').textContent =
        'Fill all fields & ensure end is after start.';
      return;
    }
    await addDoc(collection(db, 'bookings'), {
      machine, user, email, start, end, physical: false,
      recipe: false, pressure: '', completed: false
    });
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // — Detail / Edit Popup —
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User: ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe   ?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${['1','2','3','4'].map(n =>
            `<option value="${n}" ${b.recipeUsed===n?'selected':''}>${n}</option>`
          ).join('')}
        </select>
      </label>
      <label>Pressure:
        <input id="inp-pr" type="number" value="${b.pressure||''}"/>
      </label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.querySelector('#btn-close').onclick    = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick      = async () => {
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        recipe:    rec,
        recipeUsed: used,
        pressure:  pres,
        physicalTime: phys?Date.now():b.physicalTime,
        recipeTime:   rec?Date.now():b.recipeTime,
        pressureTime: pres?Date.now():b.pressureTime
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-complete').onclick  = async () => {
      await updateDoc(doc(db,'bookings',id), {
        completed: true,
        completedTime: Date.now()
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-delete').onclick    = async () => {
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };

  // — filterAndRender as discussed above —
  async function filterAndRender() {
    const fromVal = document.getElementById('log-date-start').value;
    const toVal   = document.getElementById('log-date-end').value;
    const fromDate = fromVal ? new Date(fromVal) : null;
    const toDate   = toVal   ? new Date(toVal)   : null;

    const snap = await getDocs(collection(db, 'bookings'));
    const rows = [];
    snap.forEach(d => {
      const b = d.data();
      const sd = b.start && b.start.toDate
        ? b.start.toDate()
        : new Date(b.start);
      const ed = b.end   && b.end.toDate
        ? b.end.toDate()
        : new Date(b.end);
      if (!(sd instanceof Date) || isNaN(sd) || !(ed instanceof Date) || isNaN(ed)) return;
      if ((fromDate && sd < fromDate) || (toDate && sd > toDate)) return;
      rows.push({ id: d.id, ...b, startDate: sd, endDate: ed });
    });

    const tbody = document.getElementById('log-table-body');
    tbody.innerHTML = '';
    rows.forEach(b => {
      const tr = document.createElement('tr');
      [
        b.machine,
        b.user,
        b.startDate.toISOString().slice(0,16).replace('T',' '),
        b.endDate  .toISOString().slice(0,16).replace('T',' '),
        b.physical ? '✔':'✘',
        b.recipe   ? '✔':'✘',
        b.pressure || '',
        b.completed? '✔':'✘'
      ].forEach(txt => {
        const td = document.createElement('td');
        td.textContent = txt;
        tr.appendChild(td);
      });
      // actions
      const actTd = document.createElement('td');
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
      actTd.append(del, comp);
      tr.appendChild(actTd);

      tbody.appendChild(tr);
    });
  }

  // — drawWeekly as discussed above —
  function drawWeekly(bodyEl, bookings) {
    const slots = {};
    bookings.forEach(b => {
      const sd = b.start && b.start.toDate
        ? b.start.toDate()
        : new Date(b.start);
      const ed = b.end   && b.end.toDate
        ? b.end.toDate()
        : new Date(b.end);
      if (!(sd instanceof Date) || isNaN(sd) || !(ed instanceof Date) || isNaN(ed)) return;

      for (let dt = new Date(sd); dt < ed; dt.setHours(dt.getHours()+1)) {
        const day = dt.getDay(); // 0=Sun…6=Sat
        const hr  = dt.getHours();
        if (day >= 1 && day <= 7 && hr >= 9 && hr < 17) {
          slots[`${day}-${hr}`] = b.user;
        }
      }
    });

    bodyEl.innerHTML = '';
    for (let h = 9; h < 17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);

      for (let d = 1; d <= 7; d++) {
        const td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`] || '';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }
});
