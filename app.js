// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, getDocs, updateDoc, doc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { firebaseConfig } from './firebase.js';  // your firebase.js must `export const firebaseConfig = { … };`

// init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect = $('#mode-selection'),
        loginPrompt = $('#login-prompt'),
        adminSec    = $('#admin-section'),
        logSec      = $('#log-section'),
        auditSec    = $('#audit-section'),
        userSec     = $('#user-section'),
        pwInput     = $('#pw-input'),
        pwError     = $('#pw-error');

  let subs = {};
  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec].forEach(el => el.classList.add('hidden'));
    // unsubscribe
    Object.values(subs).forEach(u => u && u());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }
  function $(id) { return document.getElementById(id); }

  // boot
  hideAll();
  show(modeSelect);

  // — Admin flow —
  $('#admin-btn').onclick = () => { hideAll(); show(loginPrompt); };
  $('#pw-cancel').onclick = () => { hideAll(); show(modeSelect); };

  $('#pw-submit').onclick = async () => {
    if (pwInput.value !== ADMIN_PASS) {
      pwError.textContent = 'Incorrect password';
      return;
    }
    hideAll(); show(adminSec);

    // live machines list
    subs.machines = onSnapshot(collection(db, 'machines'), snap => {
      let ul = $('#machines-list'); ul.innerHTML = '';
      snap.forEach(d => {
        let li = document.createElement('li'),
            rm = document.createElement('span');
        li.textContent = d.data().name;
        // remove-button
        rm.textContent = '🗑';
        rm.style.cursor = 'pointer';
        rm.onclick = () => deleteDoc(doc(db, 'machines', d.id));
        li.appendChild(rm);
        ul.appendChild(li);
      });
    });
  };

  $('#admin-back').onclick = () => { hideAll(); show(modeSelect); };
  $('#add-machine-btn').onclick = async () => {
    let name = $('#machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db, 'machines'), { name });
    $('#machine-name-input').value = '';
  };

  // — Logs —
  $('#view-logs-btn').onclick = () => {
    hideAll(); show(logSec);

    async function filterAndRender() {
      const from = $('#log-date-start').value;
      const to   = $('#log-date-end').value;
      let snap = await getDocs(collection(db, 'bookings'));
      let rows = [];
      snap.forEach(d => {
        let b = d.data();
        let day = new Date(b.start).toISOString().slice(0,10);
        if (( !from || day >= from ) && ( !to || day <= to )) {
          rows.push({ id: d.id, ...b });
        }
      });
      let tbody = $('#log-table-body'); tbody.innerHTML = '';
      rows.forEach(b => {
        let tr = document.createElement('tr'),
            fields = [
              b.machine, b.user,
              new Date(b.start).toLocaleString(),
              new Date(b.end).toLocaleString(),
              b.physical?'✔':'✘',
              b.recipe?'✔':'✘',
              b.pressure||'',
              b.completed?'✔':'✘'
            ];
        fields.forEach(v => {
          let td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
        });
        let act = document.createElement('td'),
            del = document.createElement('button'),
            comp = document.createElement('button');
        del.textContent = 'Delete'; comp.textContent = 'Complete';
        del.onclick = async () => { await deleteDoc(doc(db,'bookings',b.id)); filterAndRender(); };
        comp.onclick = async () => {
          await updateDoc(doc(db,'bookings',b.id), { completed:true, completedTime: Date.now() });
          filterAndRender();
        };
        act.append(del, comp); tr.appendChild(act);
        tbody.appendChild(tr);
      });
    }

    $('#filter-logs-btn').onclick = filterAndRender;
    $('#export-pdf-btn').onclick = () => window.print();
    filterAndRender();
  };
  $('#log-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // — Audit —
  $('#view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(query(collection(db,'audit'), orderBy('time')), snap => {
      let tb = $('#audit-table-body'); tb.innerHTML = '';
      snap.forEach(d => {
        let a = d.data(), tr = document.createElement('tr');
        [ new Date(a.time).toLocaleString(), a.user, a.action, a.details ]
          .forEach(v => { let td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        tb.appendChild(tr);
      });
    });
  };
  $('#audit-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // — Weekly renderer (shared) —
  function drawWeekly(bodyEl, bookings) {
    let slots = {};
    bookings.forEach(b => {
      let sd = (b.start.toDate ? b.start.toDate() : new Date(b.start));
      let ed = (b.end.toDate ? b.end.toDate() : new Date(b.end));
      if (isNaN(sd)||isNaN(ed)) return;
      let name = b.user;
      for (let t = new Date(sd); t < ed; t.setHours(t.getHours()+1)) {
        let d = t.getDay(), h = t.getHours();
        if (d>=1&&d<=7&&h>=9&&h<17) slots[`${d}-${h}`] = name;
      }
    });
    bodyEl.innerHTML = '';
    for (let h=9; h<17; h++) {
      let tr = document.createElement('tr'),
          th = document.createElement('th');
      th.textContent = `${h}:00`; tr.appendChild(th);
      for (let d=1; d<=7; d++) {
        let td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`] || '';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }

  $('#view-weekly-btn').onclick = async () => {
    let body = $('#weekly-body'),
        snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    $('#weekly-view').classList.toggle('hidden');
  };

  // — User flow —
  $('#user-btn').onclick = () => {
    hideAll(); show(userSec);

    subs.machinesU = onSnapshot(collection(db,'machines'), snap => {
      let ul = $('#user-machines'); ul.innerHTML = '';
      snap.forEach(d => {
        let li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = () => {
          $('#booking-machine-name').textContent = d.data().name;
          show($('#booking-form'));
        };
        ul.appendChild(li);
      });
    });

    subs.bookingsU = onSnapshot(query(collection(db,'bookings'), orderBy('start')), snap => {
      let ul = $('#booking-list'); ul.innerHTML = '';
      snap.forEach(d => {
        let b = d.data();
        if (b.completed) return;
        if (b.machine !== $('#booking-machine-name').textContent) return;
        let li = document.createElement('li');
        li.textContent = `${b.machine}: ${b.user} (${new Date(b.start).toLocaleString()}→${new Date(b.end).toLocaleString()})`;
        li.onclick = () => openDetail(d.id, b);
        ul.appendChild(li);
      });
    });
  };
  $('#user-back').onclick = () => { hideAll(); show(modeSelect); };

  $('#user-weekly-btn').onclick = async () => {
    let body = $('#user-weekly-body'),
        snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    $('#user-weekly-view').classList.toggle('hidden');
  };

  // — Submit booking —
  $('#submit-booking-btn').onclick = async () => {
    let machine = $('#booking-machine-name').textContent,
        user    = $('#booking-name').value.trim(),
        email   = $('#booking-email').value.trim(),
        start   = $('#booking-start').value,
        end     = $('#booking-end').value,
        err     = $('#booking-error');
    err.textContent = '';
    if (!user||!email||!start||!end|| end<=start) {
      err.textContent = 'Please fill all fields & ensure End > Start.';
      return;
    }
    // check double-booking same machine
    let snap = await getDocs(query(collection(db,'bookings'), orderBy('start')));
    for (let d of snap.docs) {
      let b = d.data();
      if (b.machine!==machine||b.completed) continue;
      if (!( new Date(end) <= new Date(b.start) || new Date(start) >= new Date(b.end) )) {
        err.textContent = 'That slot is already booked.';
        return;
      }
    }
    await addDoc(collection(db,'bookings'), { machine, user, email, start, end, completed:false });
    ['booking-name','booking-email','booking-start','booking-end'].forEach(id=>$(id).value='');
    $('#booking-form').classList.add('hidden');
  };

  // — Detail/Edit modal —
  window.openDetail = (id,b) => {
    let detail = $('#booking-detail');
    detail.innerHTML = `
      <h4>Details</h4>
      <p><strong>Machine:</strong> ${b.machine}</p>
      <p><strong>User:</strong> ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${[1,2,3,4].map(n=>`<option value="${n}" ${b.recipeUsed==n?'selected':''}>${n}</option>`).join('')}
        </select>
      </label>
      <label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.classList.remove('hidden');

    $('#btn-close').onclick = () => detail.classList.add('hidden');
    $('#btn-save').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), {
        physical: $('#chk-phys').checked,
        recipe:   $('#chk-rec').checked,
        recipeUsed: $('#sel-rec').value,
        pressure: $('#inp-pr').value,
        physicalTime: $('#chk-phys').checked ? Date.now() : b.physicalTime,
        recipeTime:   $('#chk-rec').checked  ? Date.now() : b.recipeTime,
        pressureTime: $('#inp-pr').value     ? Date.now() : b.pressureTime,
      });
      detail.classList.add('hidden');
    };
    $('#btn-complete').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), { completed:true, completedTime: Date.now() });
      detail.classList.add('hidden');
    };
    $('#btn-delete').onclick = async () => {
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };
});
