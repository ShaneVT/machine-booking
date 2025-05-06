// app.js
import { db } from './firebase.js';
import {
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

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect = document.getElementById('mode-selection');
  const loginPrompt = document.getElementById('login-prompt');
  const adminSec = document.getElementById('admin-section');
  const logSec = document.getElementById('log-section');
  const auditSec = document.getElementById('audit-section');
  const userSec = document.getElementById('user-section');
  let subs = {};

  const hideAll = () => {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(el => el.classList.add('hidden'));
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  };
  const show = el => el.classList.remove('hidden');

  // Initial
  hideAll();
  show(modeSelect);

  // --- Admin Login Flow ---
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

    // realtime machines list
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
  };

  // --- View Logs ---
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll();
    show(logSec);

    const filterAndRender = async () => {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db, 'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const date = new Date(b.start).toISOString().slice(0, 10);
        if ((!from || date >= from) && (!to || date <= to)) {
          rows.push({ id: d.id, ...b });
        }
      });
      const tbody = document.getElementById('log-table-body');
      tbody.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        [b.machine, b.user,
         new Date(b.start).toLocaleString(),
         new Date(b.end).toLocaleString(),
         b.physical ? '✔' : '✘',
         b.recipe   ? '✔' : '✘',
         b.pressure || '',
         b.completed? '✔' : '✘'
        ].forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        const actionTd = document.createElement('td');
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db, 'bookings', b.id));
          filterAndRender();
        };
        const comp = document.createElement('button');
        comp.textContent = 'Complete';
        comp.onclick = async () => {
          await updateDoc(doc(db, 'bookings', b.id), {
            completed: true,
            completedTime: Date.now()
          });
          filterAndRender();
        };
        actionTd.append(del, comp);
        tr.appendChild(actionTd);
        tbody.appendChild(tr);
      });
    };

    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    filterAndRender();
  };
  document.getElementById('log-back-btn').onclick = () => {
    hideAll();
    show(adminSec);
  };

  // --- Audit Log ---
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll();
    show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [new Date(a.time).toLocaleString(), a.user, a.action, a.details]
            .forEach(val => {
              const td = document.createElement('td');
              td.textContent = val;
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

  // --- Weekly View Helper ---
  function drawWeekly(bodyEl, bookings) {
    bodyEl.innerHTML = '';
    const slots = {};
    bookings.forEach(b => {
      const sd = b.start.toDate ? b.start.toDate() : new Date(b.start);
      const ed = b.end  .toDate ? b.end.toDate()   : new Date(b.end);
      let cur = new Date(sd);
      while (cur < ed) {
        const d = cur.getDay(); // 0=Sun…6=Sat
        const h = cur.getHours();
        if (d>=1 && d<=7 && h>=9 && h<17) {
          slots[`${d}-${h}`] = b.user;
        }
        cur.setHours(cur.getHours()+1);
      }
    });
    for (let h = 9; h < 17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for (let d = 1; d <= 7; d++) {
        const td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`]||'';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }

  document.getElementById('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(document.getElementById('weekly-body'), snap.docs.map(d=>d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // --- User Side ---
  document.getElementById('user-btn').onclick = () => {
    hideAll();
    show(userSec);

    // Machines list
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

    // Your active bookings
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        const ul = document.getElementById('booking-list');
        ul.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${new Date(b.start).toLocaleString()} → ${new Date(b.end).toLocaleString()})`;
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
    drawWeekly(document.getElementById('user-weekly-body'), snap.docs.map(d=>d.data()));
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };

  // --- Booking Submission ---
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
    // reset form
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => document.getElementById(id).value = '');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // --- Detail / Edit pane ---
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User:    ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value=""></option>
          <option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;

    detail.querySelector('#btn-close').onclick = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick = async () => {
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        recipe: rec,
        recipeUsed: used,
        pressure: pres,
        physicalTime: phys ? Date.now() : b.physicalTime,
        recipeTime:  rec ? Date.now() : b.recipeTime,
        pressureTime: pres ? Date.now() : b.pressureTime
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
});

