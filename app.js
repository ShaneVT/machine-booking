// app.js
import {
  collection, addDoc, onSnapshot, getDocs, query, orderBy,
  updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

import { db } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const els = {
    modeSelect:      document.getElementById('mode-selection'),
    loginPrompt:     document.getElementById('login-prompt'),
    adminSection:    document.getElementById('admin-section'),
    logSection:      document.getElementById('log-section'),
    auditSection:    document.getElementById('audit-section'),
    userSection:     document.getElementById('user-section'),
    pwInput:         document.getElementById('pw-input'),
    pwError:         document.getElementById('pw-error'),
    machineInput:    document.getElementById('machine-name-input'),
    machinesList:    document.getElementById('machines-list'),
    logBody:         document.getElementById('log-table-body'),
    auditBody:       document.getElementById('audit-table-body'),
    bookingForm:     document.getElementById('booking-form'),
    bookingList:     document.getElementById('booking-list'),
    bookingDetail:   document.getElementById('booking-detail')
  };

  let unsubscribers = [];
  const hideAll = () => {
    Object.values(els).forEach(el => el && el.classList?.add('hidden'));
    unsubscribers.forEach(fn => fn());
    unsubscribers = [];
  };
  const show = el => el.classList.remove('hidden');

  // start on mode select
  hideAll(); show(els.modeSelect);

  // —— Admin flow ——  
  document.getElementById('admin-btn').onclick = () => {
    hideAll(); show(els.loginPrompt);
    els.pwInput.value = '';
    els.pwError.textContent = '';
  };
  document.getElementById('pw-cancel').onclick = () => {
    hideAll(); show(els.modeSelect);
  };
  document.getElementById('pw-submit').onclick = () => {
    if (els.pwInput.value !== ADMIN_PASS) {
      els.pwError.textContent = 'Incorrect password';
      return;
    }
    hideAll(); show(els.adminSection);

    // realtime machines list
    const unsub = onSnapshot(
      collection(db, 'machines'),
      snap => {
        els.machinesList.innerHTML = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          els.machinesList.appendChild(li);
        });
      }
    );
    unsubscribers.push(unsub);
  };
  document.getElementById('admin-back').onclick = () => {
    hideAll(); show(els.modeSelect);
  };
  document.getElementById('add-machine-btn').onclick = async () => {
    const name = els.machineInput.value.trim();
    if (!name) return;
    await addDoc(collection(db, 'machines'), { name });
    els.machineInput.value = '';
  };

  // —— View Logs ——  
  document.getElementById('view-logs-btn').onclick = async () => {
    hideAll(); show(els.logSection);

    const filterAndRender = async () => {
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db, 'bookings'));
      els.logBody.innerHTML = '';
      snap.forEach(d => {
        const b = d.data();
        const sd = new Date(b.start);
        if (
          (!from || sd.toISOString().slice(0,10) >= from) &&
          (!to   || sd.toISOString().slice(0,10) <= to)
        ) {
          const tr = document.createElement('tr');
          [
            b.machine, b.user,
            sd.toLocaleString(), new Date(b.end).toLocaleString(),
            b.physical ? '✔' : '✘',
            b.recipe   ? '✔' : '✘',
            b.pressure || '',
            b.completed ? '✔' : '✘'
          ].forEach(txt => {
            const td = document.createElement('td');
            td.textContent = txt;
            tr.appendChild(td);
          });
          const actionTd = document.createElement('td');
          // Delete
          const del = document.createElement('button');
          del.textContent = 'Delete';
          del.onclick = async () => {
            await deleteDoc(doc(db, 'bookings', d.id));
            filterAndRender();
          };
          // Complete
          const comp = document.createElement('button');
          comp.textContent = 'Complete';
          comp.onclick = async () => {
            await updateDoc(doc(db, 'bookings', d.id), {
              completed: true,
              completedTime: Date.now()
            });
            filterAndRender();
          };
          actionTd.append(del, comp);
          tr.appendChild(actionTd);

          els.logBody.appendChild(tr);
        }
      });
    };

    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick = () => window.print();
    await filterAndRender();
  };
  document.getElementById('log-back-btn').onclick = () => {
    hideAll(); show(els.adminSection);
  };

  // —— Audit Log ——  
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll(); show(els.auditSection);
    const unsub = onSnapshot(
      query(collection(db, 'audit'), orderBy('time')),
      snap => {
        els.auditBody.innerHTML = '';
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
          els.auditBody.appendChild(tr);
        });
      }
    );
    unsubscribers.push(unsub);
  };
  document.getElementById('audit-back-btn').onclick = () => {
    hideAll(); show(els.adminSection);
  };

  // —— User flow (booking) ——  
  document.getElementById('user-btn').onclick = () => {
    hideAll(); show(els.userSection);

    // machines menu
    const unsubM = onSnapshot(
      collection(db, 'machines'),
      snap => {
        const ul = document.getElementById('user-machines');
        ul.innerHTML = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          li.onclick = () => {
            document.getElementById('booking-machine-name').textContent = d.data().name;
            show(els.bookingForm);
          };
          ul.appendChild(li);
        });
      }
    );
    unsubscribers.push(unsubM);

    // active bookings list
    const unsubB = onSnapshot(
      query(collection(db, 'bookings'), orderBy('start')),
      snap => {
        els.bookingList.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine} — ${b.user} (${new Date(b.start).toLocaleString()} → ${new Date(b.end).toLocaleString()})`;
          li.onclick = () => openDetail(d.id, b);
          els.bookingList.appendChild(li);
        });
      }
    );
    unsubscribers.push(unsubB);
  };
  document.getElementById('user-back').onclick = () => {
    hideAll(); show(els.modeSelect);
  };

  // ——— Booking form submit ———
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const start   = document.getElementById('booking-start').value;
    const end     = document.getElementById('booking-end').value;
    if (!user || !email || !start || !end || end <= start) {
      document.getElementById('booking-error').textContent = 'Fill all fields and ensure end > start';
      return;
    }
    // **prevent double-booking on same machine**:
    const bs = await getDocs(query(
      collection(db,'bookings'),
      orderBy('start')
    ));
    for (let d of bs.docs) {
      const b = d.data();
      if (b.machine === machine && !b.completed) {
        // overlap?
        if (!(end <= b.start || start >= b.end)) {
          document.getElementById('booking-error').textContent = 'Time conflict on this machine';
          return;
        }
      }
    }

    // all good → save
    await addDoc(collection(db, 'bookings'), {
      machine, user, email,
      start, end,
      physical: false,
      recipe: false,
      pressure: null,
      completed: false
    });

    // reset form
    ['booking-name','booking-email','booking-start','booking-end'].forEach(id => {
      document.getElementById(id).value = '';
    });
    els.bookingForm.classList.add('hidden');
  };

  // ——— Booking detail popup ———
  window.openDetail = (id, b) => {
    const d = els.bookingDetail;
    d.classList.remove('hidden');
    d.innerHTML = `
      <h4>Details</h4>
      <p><strong>Machine:</strong> ${b.machine}</p>
      <p><strong>User:</strong> ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>
        Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${['1','2','3','4'].map(n =>
            `<option value="${n}" ${b.recipeUsed===n?'selected':''}>${n}</option>`
          ).join('')}
        </select>
      </label>
      <label>Pressure:
        <input type="number" id="inp-pr" value="${b.pressure||''}"/>
      </label>
      <div>
        <button id="btn-save">Save</button>
        <button id="btn-complete">Complete</button>
        <button id="btn-delete">Delete</button>
        <button id="btn-close">Close</button>
      </div>
    `;

    d.querySelector('#btn-close').onclick = () => d.classList.add('hidden');
    d.querySelector('#btn-save').onclick = async () => {
      const phys = d.querySelector('#chk-phys').checked;
      const rec  = d.querySelector('#chk-rec').checked;
      const used = d.querySelector('#sel-rec').value;
      const pres = d.querySelector('#inp-pr').value;
      await updateDoc(doc(db, 'bookings', id), {
        physical: phys,
        recipe: rec,
        recipeUsed: used||null,
        pressure: pres||null,
        physicalTime: phys ? Date.now() : b.physicalTime,
        recipeTime: rec ? Date.now() : b.recipeTime,
        pressureTime: pres ? Date.now() : b.pressureTime
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-complete').onclick = async () => {
      await updateDoc(doc(db, 'bookings', id), {
        completed: true,
        completedTime: Date.now()
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-delete').onclick = async () => {
      await deleteDoc(doc(db, 'bookings', id));
      d.classList.add('hidden');
    };
  };
});
