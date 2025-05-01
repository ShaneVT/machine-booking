import {
  initializeApp
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// your own config from Firebase console here:
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';

  // sections
  const modeSelect   = el('mode-selection');
  const loginPrompt  = el('login-prompt');
  const adminSec     = el('admin-section');
  const logSec       = el('log-section');
  const auditSec     = el('audit-section');
  const userSec      = el('user-section');

  // helpers
  let subs = {};
  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(e => e.classList.add('hidden'));
    // unsubscribe
    Object.values(subs).forEach(fn => fn && fn());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }
  function el(id)     { return document.getElementById(id); }

  hideAll(); show(modeSelect);

  // —— Admin mode ——  
  el('admin-btn').onclick = () => { hideAll(); show(loginPrompt); };
  el('pw-cancel').onclick= () => { hideAll(); show(modeSelect); };

  el('pw-submit').onclick = () => {
    if (el('pw-input').value !== ADMIN_PASS) {
      el('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll(); show(adminSec);

    // realtime machines list
    subs.machines = onSnapshot(
      collection(db, 'machines'),
      snap => {
        const ul = el('machines-list'); ul.textContent = '';
        snap.forEach(d => {
          const li = document.createElement('li');
          li.textContent = d.data().name;
          // allow delete
          const X = document.createElement('span');
          X.textContent = ' ✖'; X.style.color='red';
          X.onclick = async () => {
            await deleteDoc(doc(db,'machines',d.id));
          };
          li.append(X);
          ul.append(li);
        });
      }
    );
  };

  el('admin-back').onclick = () => { hideAll(); show(modeSelect); };
  el('add-machine-btn').onclick = async () => {
    const nm = el('machine-name-input').value.trim();
    if (!nm) return;
    await addDoc(collection(db,'machines'), { name: nm });
    el('machine-name-input').value = '';
  };

  // —— Usage Logs ——  
  el('view-logs-btn').onclick = () => {
    hideAll(); show(logSec);

    async function render() {
      const from = el('log-date-start').value;
      const to   = el('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];

      snap.forEach(d => {
        const b = d.data();
        // normalize start
        let sd = b.start && b.start.toDate
          ? b.start.toDate()
          : new Date(b.start);
        if (isNaN(sd)) return;
        const day = sd.toISOString().slice(0,10);
        if ((from && day < from) || (to && day > to)) return;
        rows.push({ id: d.id, ...b, _sd: sd });
      });

      const tb = el('log-table-body'); tb.textContent = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        // normalize end
        let ed = b.end && b.end.toDate
          ? b.end.toDate()
          : new Date(b.end);
        const cols = [
          b.machine,
          b.user,
          b._sd.toLocaleString(),
          isNaN(ed) ? '' : ed.toLocaleString(),
          b.physical?'✔':'✘',
          b.recipe  ?'✔':'✘',
          b.pressure||'',
          b.completed?'✔':'✘'
        ];
        cols.forEach(txt => {
          const td = document.createElement('td');
          td.textContent = txt;
          tr.append(td);
        });
        const act = document.createElement('td');
        const dB = document.createElement('button');
        dB.textContent='Delete';
        dB.onclick = async()=>{ await deleteDoc(doc(db,'bookings',b.id)); render(); };
        const cB = document.createElement('button');
        cB.textContent='Complete';
        cB.onclick = async()=>{ 
          await updateDoc(doc(db,'bookings',b.id), {
            completed:true, completedTime:Date.now()
          });
          render();
        };
        act.append(dB,cB);
        tr.append(act);
        tb.append(tr);
      });
    }

    el('filter-logs-btn').onclick = render;
    el('export-pdf-btn').onclick = ()=>window.print();
    render();
  };
  el('log-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // —— Audit ——  
  el('view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tb = el('audit-table-body'); tb.textContent = '';
        snap.forEach(d=>{
          const a = d.data();
          const tr = document.createElement('tr');
          [new Date(a.time).toLocaleString(), a.user, a.action, a.details]
            .forEach(txt=>{
              const td = document.createElement('td');
              td.textContent = txt;
              tr.append(td);
            });
          tb.append(tr);
        });
      }
    );
  };
  el('audit-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // —— Weekly view (shared) ——  
  function drawWeekly(body, data) {
    body.textContent = '';
    const slots = {};
    data.forEach(b => {
      let sd = b.start && b.start.toDate
        ? b.start.toDate()
        : new Date(b.start);
      if (isNaN(sd)) return;
      const d = sd.getDay(), h = sd.getHours();
      if (h>=9 && h<17) slots[`${d}-${h}`] = true;
    });
    for (let h=9; h<17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.append(th);
      for (let d=1; d<=7; d++) {
        const td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`] ? 'X' : '';
        tr.append(td);
      }
      body.append(tr);
    }
  }
  el('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(el('weekly-body'), snap.docs.map(d=>d.data()));
    el('weekly-view').classList.toggle('hidden');
  };

  // —— User mode ——  
  el('user-btn').onclick = () => {
    hideAll(); show(userSec);

    subs.machinesU = onSnapshot(
      collection(db,'machines'),
      snap => {
        const ul = el('user-machines'); ul.textContent = '';
        snap.forEach(d=>{
          const li = document.createElement('li');
          li.textContent = d.data().name;
          li.onclick = () => {
            el('booking-machine-name').textContent = d.data().name;
            el('booking-form').classList.remove('hidden');
          };
          ul.append(li);
        });
      }
    );

    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        const ul = el('booking-list'); ul.textContent = '';
        snap.forEach(d=>{
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${b.start}→${b.end})`;
          li.onclick = () => openDetail(d.id,b);
          ul.append(li);
        });
      }
    );
  };
  el('user-back').onclick = () => { hideAll(); show(modeSelect); };

  el('user-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(el('user-weekly-body'), snap.docs.map(d=>d.data()));
    el('user-weekly-view').classList.toggle('hidden');
  };

  // —— Booking submission ——  
  el('submit-booking-btn').onclick = async () => {
    const machine = el('booking-machine-name').textContent;
    const user    = el('booking-name').value.trim();
    const email   = el('booking-email').value.trim();
    const start   = el('booking-start').value;
    const end     = el('booking-end').value;
    if (!user||!email||!start||!end||end<=start) {
      el('booking-error').textContent =
        'Fill all fields and ensure end is after start.';
      return;
    }
    // prevent double booking
    const snap = await getDocs(
      query(collection(db,'bookings'),
            orderBy('start'))
    );
    const conflict = snap.docs.some(d=>{
      const b = d.data();
      return b.machine===machine &&
        !(end <= b.start || start >= b.end);
    });
    if (conflict) {
      el('booking-error').textContent =
        'Time slot already booked.';
      return;
    }

    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end,
      physical:false, recipe:false, pressure:null,
      completed:false
    });

    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id=> el(id).value='');
    el('booking-form').classList.add('hidden');
  };

  // —— Detail/edit panel ——  
  window.openDetail = (id,b) => {
    const d = el('booking-detail');
    d.classList.remove('hidden');
    d.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User:    ${b.user}</p>
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
          <option></option>
          <option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>
        Pressure:
        <input type="number" id="inp-pr" value="${b.pressure||''}" />
      </label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    d.querySelector('#btn-close').onclick = () => d.classList.add('hidden');
    d.querySelector('#btn-save').onclick = async () => {
      const phys = d.querySelector('#chk-phys').checked;
      const rec  = d.querySelector('#chk-rec').checked;
      const used = d.querySelector('#sel-rec').value;
      const pres = d.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id), {
        physical: phys,
        recipe:   rec,
        recipeUsed: used,
        pressure: pres||null,
        physicalTime: phys?Date.now():b.physicalTime,
        recipeTime:   rec?Date.now():b.recipeTime,
        pressureTime: pres?Date.now():b.pressureTime
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-complete').onclick = async () => {
      await updateDoc(doc(db,'bookings',id), {
        completed:true, completedTime:Date.now()
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-delete').onclick = async () => {
      await deleteDoc(doc(db,'bookings',id));
      d.classList.add('hidden');
    };
  };
});
