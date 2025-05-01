// app.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot,
  getDocs, query, orderBy, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// ← Your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// helper to normalize whatever you stored as start/end
function toJSDate(val) {
  if (!val) return new Date();
  if (typeof val === 'string')        return new Date(val);
  if (val instanceof Date)            return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date();
}

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect = el('mode-selection'),
        loginPrompt= el('login-prompt'),
        adminSec   = el('admin-section'),
        logSec     = el('log-section'),
        auditSec   = el('audit-section'),
        userSec    = el('user-section');

  let subs = {};

  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec].forEach(c => c.classList.add('hidden'));
    // unsubscribe all realtime listeners
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }

  // initial
  hideAll(); show(modeSelect);

  // Admin / Login Flow
  el('admin-btn').onclick = () => { hideAll(); show(loginPrompt); };
  el('pw-cancel').onclick = () => { hideAll(); show(modeSelect); };
  el('pw-submit').onclick = () => {
    if (el('pw-input').value !== ADMIN_PASS) {
      el('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll(); show(adminSec);

    // machines list
    subs.machines = onSnapshot(collection(db,'machines'), snap => {
      const ul = el('machines-list'); ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        // allow delete
        const del = document.createElement('span');
        del.textContent = ' 🗑';
        del.style.color = 'red';
        del.style.cursor = 'pointer';
        del.onclick = async () => {
          await deleteDoc(doc(db,'machines',d.id));
        };
        li.append(del);
        ul.append(li);
      });
    });
  };
  el('admin-back').onclick = () => { hideAll(); show(modeSelect); };
  el('add-machine-btn').onclick = async () => {
    const name = el('machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db,'machines'), { name });
    el('machine-name-input').value = '';
  };

  // Usage Logs
  el('view-logs-btn').onclick = () => {
    hideAll(); show(logSec);

    async function filterAndRender() {
      const from = el('log-date-start').value;
      const to   = el('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = { id: d.id, ...d.data() };
        const day = toJSDate(b.start).toISOString().slice(0,10);
        if ((!from||day>=from) && (!to||day<=to)) rows.push(b);
      });

      const tbody = el('log-table-body'); tbody.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        [
          b.machine,
          b.user,
          toJSDate(b.start).toLocaleString(),
          toJSDate(b.end).toLocaleString(),
          b.physical?'✔':'✘',
          b.recipe  ?'✔':'✘',
          b.pressure||'',
          b.completed?'✔':'✘'
        ].forEach(txt => {
          const td = document.createElement('td'); td.textContent = txt; tr.append(td);
        });
        // actions
        const actTd = document.createElement('td');
        const del = document.createElement('button'); del.textContent='Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db,'bookings',b.id));
          filterAndRender();
        };
        const comp = document.createElement('button'); comp.textContent='Complete';
        comp.onclick = async () => {
          await updateDoc(doc(db,'bookings',b.id),{ completed:true, completedTime:Date.now() });
          filterAndRender();
        };
        actTd.append(del,comp);
        tr.append(actTd);
        tbody.append(tr);
      });
    }

    el('filter-logs-btn').onclick = filterAndRender;
    el('export-pdf-btn').onclick = () => window.print();
    filterAndRender();
  };
  el('log-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // Audit Log
  el('view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tbody = el('audit-table-body'); tbody.innerHTML = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(), a.user, a.action, a.details ]
            .forEach(txt => { const td=document.createElement('td'); td.textContent=txt; tr.append(td); });
          tbody.append(tr);
        });
      }
    );
  };
  el('audit-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // Weekly View (Admin)
  async function drawWeekly(body, data) {
    body.innerHTML = '';
    const slots = {};
    data.forEach(b => {
      const d0 = toJSDate(b.start);
      const key = `${d0.getDay()}-${d0.getHours()}`;
      if (d0.getHours()>=9 && d0.getHours()<17) slots[key] = true;
    });
    for (let h=9; h<17; h++) {
      const tr = document.createElement('tr');
      tr.append(td=`<th>${h}:00</th>`);
      for (let d=1; d<=7; d++) {
        const td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`]?'X':'';
        tr.append(td);
      }
      body.append(tr);
    }
  }
  el('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    await drawWeekly(el('weekly-body'), snap.docs.map(d=>d.data()));
    el('weekly-view').classList.toggle('hidden');
  };

  // User Mode
  el('user-btn').onclick = () => {
    hideAll(); show(userSec);
    subs.machinesU = onSnapshot(collection(db,'machines'), snap => {
      const ul = el('user-machines'); ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = () => {
          el('booking-machine-name').textContent = d.data().name;
          el('booking-form').classList.remove('hidden');
        };
        ul.append(li);
      });
    });
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        const ul = el('booking-list'); ul.innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${toJSDate(b.start).toLocaleString()}→${toJSDate(b.end).toLocaleString()})`;
          li.onclick = () => openDetail(d.id,b);
          ul.append(li);
        });
      }
    );
  };
  el('user-back').onclick = () => { hideAll(); show(modeSelect); };

  // User Weekly
  el('user-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    await drawWeekly(el('user-weekly-body'), snap.docs.map(d=>d.data()));
    el('user-weekly-view').classList.toggle('hidden');
  };

  // Submit Booking
  el('submit-booking-btn').onclick = async () => {
    const machine = el('booking-machine-name').textContent,
          user    = el('booking-name').value.trim(),
          email   = el('booking-email').value.trim(),
          start   = el('booking-start').value,
          end     = el('booking-end').value;
    if (!user||!email||!start||!end||end<=start) {
      el('booking-error').textContent = 'Complete all fields; end must be after start';
      return;
    }
    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end,
      physical:false, recipe:false, pressure:'',
      completed:false
    });
    // reset
    ['booking-name','booking-email','booking-start','booking-end'].forEach(id=>el(id).value='');
    el('booking-form').classList.add('hidden');
  };

  // Detail/Edit
  window.openDetail = async (id, b) => {
    const detail = el('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User: ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  ${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe:
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
    detail.querySelector('#btn-close').onclick = () => detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), {
        physical: detail.querySelector('#chk-phys').checked,
        recipe:   detail.querySelector('#chk-rec').checked,
        recipeUsed: detail.querySelector('#sel-rec').value,
        pressure: detail.querySelector('#inp-pr').value,
        physicalTime: detail.querySelector('#chk-phys').checked?Date.now():b.physicalTime,
        recipeTime:   detail.querySelector('#chk-rec').checked?Date.now():b.recipeTime,
        pressureTime: detail.querySelector('#inp-pr').value?Date.now():b.pressureTime
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

  // small helper
  function el(id){ return document.getElementById(id); }
});


  window.openDetail=(id,b)=>{const detail=document.getElementById('booking-detail');detail.classList.remove('hidden');detail.innerHTML=`<h4>Details</h4><p>Machine: ${b.machine}</p><p>User: ${b.user}</p><label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label><label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label><label>Recipe Used:<select id="sel-rec"><option value=""></option><option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option><option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option><option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option><option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option></select></label><label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label><button id="btn-save">Save</button><button id="btn-complete">Complete</button><button id="btn-delete">Delete</button><button id="btn-close">Close</button>`;detail.querySelector('#btn-close').onclick=()=>detail.classList.add('hidden');detail.querySelector('#btn-save').onclick=async()=>{const phys=detail.querySelector('#chk-phys').checked;const rec=detail.querySelector('#chk-rec').checked;const used=detail.querySelector('#sel-rec').value;const pres=detail.querySelector('#inp-pr').value;await updateDoc(doc(db,'bookings',id),{physical:phys,recipe:rec,recipeUsed:used,pressure:pres,physicalTime:phys?Date.now():b.physicalTime,recipeTime:rec?Date.now():b.recipeTime,pressureTime:pres?Date.now():b.pressureTime});detail.classList.add('hidden');};detail.querySelector('#btn-complete').onclick=async()=>{await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});detail.classList.add('hidden');};detail.querySelector('#btn-delete').onclick=async()=>{await deleteDoc(doc(db,'bookings',id));detail.classList.add('hidden');};};
