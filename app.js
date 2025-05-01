import { db } from './firebase.js';
import {
  collection, addDoc, onSnapshot, getDocs, query, where,
  updateDoc, deleteDoc, doc, orderBy
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect    = document.getElementById('mode-selection');
  const loginPrompt   = document.getElementById('login-prompt');
  const adminSec      = document.getElementById('admin-section');
  const logSec        = document.getElementById('log-section');
  const auditSec      = document.getElementById('audit-section');
  const userSec       = document.getElementById('user-section');
  const pwInput       = document.getElementById('pw-input');
  const pwError       = document.getElementById('pw-error');

  let subs = {};
  function hideAll() {
    [ modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec ]
      .forEach(el => el.classList.add('hidden'));
    // Unsubscribe any realtime listeners
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  function show(el){ el.classList.remove('hidden'); }

  // draw weekly helper
  function drawWeekly(bodyEl, bookings) {
    bodyEl.innerHTML = '';
    // build a set of occupied slots
    const slots = {};
    bookings.forEach(b => {
      const s = new Date(b.start), d = s.getDay(), h = s.getHours();
      if (h >= 9 && h < 17) slots[`${d}-${h}`] = true;
    });
    for (let hr = 9; hr < 17; hr++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${hr}:00`;
      tr.appendChild(th);
      // Monday=1 … Sunday=7 (0=Sunday → place at end)
      for (let day = 1; day <= 7; day++) {
        const td = document.createElement('td');
        td.textContent = slots[`${day}-${hr}`] ? 'X' : '';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }

  // INITIAL
  hideAll();
  show(modeSelect);

  // --- ADMIN LOGIN FLOW ---
  document.getElementById('admin-btn').onclick = () => {
    hideAll();
    pwInput.value = ''; pwError.textContent = '';
    show(loginPrompt);
  };
  document.getElementById('pw-cancel').onclick = () => {
    hideAll(); show(modeSelect);
  };
  document.getElementById('pw-submit').onclick = () => {
    if (pwInput.value !== ADMIN_PASS) {
      pwError.textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(adminSec);
    // realtime machines list
    subs.machines = onSnapshot(collection(db,'machines'), snap => {
      const ul = document.getElementById('machines-list');
      ul.textContent = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        // allow deletion
        const del = document.createElement('span');
        del.textContent = ' 🗑';
        del.style.cursor = 'pointer';
        del.onclick = async () => {
          await deleteDoc(doc(db,'machines',d.id));
        };
        li.appendChild(del);
        ul.appendChild(li);
      });
    });
  };
  document.getElementById('admin-back').onclick = () => {
    hideAll(); show(modeSelect);
  };
  document.getElementById('add-machine-btn').onclick = async () => {
    const name = document.getElementById('machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db,'machines'),{ name });
    document.getElementById('machine-name-input').value = '';
  };

  // --- VIEW LOGS ---
  document.getElementById('view-logs-btn').onclick = async () => {
    hideAll(); show(logSec);
    const render = async () => {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const day = new Date(b.start).toISOString().slice(0,10);
        if ((!from || day >= from) && (!to || day <= to)) {
          rows.push({ id: d.id, ...b });
        }
      });
      const tbody = document.getElementById('log-table-body');
      tbody.textContent = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        [ b.machine, b.user,
          new Date(b.start).toLocaleString(),
          new Date(b.end).toLocaleString(),
          b.physical?'✔':'✘',
          b.recipe?'✔':'✘',
          b.pressure||'',
          b.completed?'✔':'✘'
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
          render();
        };
        const comp = document.createElement('button');
        comp.textContent = 'Complete';
        comp.onclick = async () => {
          await updateDoc(doc(db,'bookings',b.id), {
            completed: true,
            completedTime: Date.now()
          });
          render();
        };
        act.append(del, comp);
        tr.appendChild(act);

        tbody.appendChild(tr);
      });
    };
    document.getElementById('filter-logs-btn').onclick = render;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    render();
  };
  document.getElementById('log-back-btn').onclick = () => {
    hideAll(); show(adminSec);
  };

  // --- VIEW AUDIT ---
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tbody = document.getElementById('audit-table-body');
        tbody.textContent = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(),
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
    hideAll(); show(adminSec);
  };

  // --- WEEKLY VIEW (Admin) ---
  document.getElementById('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(
      document.getElementById('weekly-body'),
      snap.docs.map(d=>d.data())
    );
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // --- USER PANEL ---
  document.getElementById('user-btn').onclick = () => {
    hideAll(); show(userSec);

    // machines to pick from
    subs.machinesU = onSnapshot(collection(db,'machines'), snap => {
      const ul = document.getElementById('user-machines');
      ul.textContent = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = () => {
          document.getElementById('booking-machine-name').textContent = d.data().name;
          document.getElementById('booking-form').classList.remove('hidden');
        };
        ul.appendChild(li);
      });
    });

    // your active bookings
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        const ul = document.getElementById('booking-list');
        ul.textContent = '';
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
    hideAll(); show(modeSelect);
  };

  // --- USER WEEKLY VIEW ---
  document.getElementById('user-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(
      document.getElementById('user-weekly-body'),
      snap.docs.map(d=>d.data())
    );
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };

  // --- SUBMIT BOOKING (with double-book check) ---
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const startV  = document.getElementById('booking-start').value;
    const endV    = document.getElementById('booking-end').value;
    const errDiv  = document.getElementById('booking-error');
    errDiv.textContent = '';

    if (!user || !email || !startV || !endV || endV <= startV) {
      errDiv.textContent = 'Fill all fields and ensure End > Start.';
      return;
    }

    const sDate = new Date(startV), eDate = new Date(endV);

    // prevent double booking
    const q = query(collection(db,'bookings'), where('machine','==',machine));
    const snap = await getDocs(q);
    for (let d of snap.docs) {
      const b = d.data();
      const os = new Date(b.start), oe = new Date(b.end);
      if (sDate < oe && eDate > os) {
        errDiv.textContent = 'That slot is already booked.';
        return;
      }
    }

    await addDoc(collection(db,'bookings'), {
      machine, user, email, start: startV, end: endV,
      physical: false, recipe: false, pressure: null,
      completed: false
    });

    // reset form
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id=>document.getElementById(id).value='');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // --- DETAIL / EDIT DIALOG ---
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p><strong>Machine:</strong> ${b.machine}</p>
      <p><strong>User:</strong>    ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          <option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>Pressure: <input type="number" id="inp-pr" value="${b.pressure||''}"/></label>
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
        recipe:   rec,
        recipeUsed: used,
        pressure: pres,
        physicalTime: phys ? Date.now() : b.physicalTime,
        recipeTime:   rec ? Date.now() : b.recipeTime,
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
