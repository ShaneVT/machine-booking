import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot,
  getDocs, query, orderBy, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.appspot.com",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect = document.getElementById('mode-selection');
  const loginPrompt= document.getElementById('login-prompt');
  const adminSec   = document.getElementById('admin-section');
  const logSec     = document.getElementById('log-section');
  const auditSec   = document.getElementById('audit-section');
  const userSec    = document.getElementById('user-section');
  const pwInput    = document.getElementById('pw-input');
  const pwError    = document.getElementById('pw-error');
  let subs = {};

  // Utility to hide/show
  function hideAll() {
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(el => el.classList.add('hidden'));
    Object.values(subs).forEach(unsub => unsub && unsub());
    subs = {};
  }
  const show = el => el.classList.remove('hidden');

  // Start on mode selection
  hideAll();
  show(modeSelect);

  // Admin flow
  document.getElementById('admin-btn').onclick = () => {
    hideAll();
    pwInput.value = '';
    pwError.textContent = '';
    show(loginPrompt);
  };
  document.getElementById('pw-cancel').onclick = () => { hideAll(); show(modeSelect); };
  document.getElementById('pw-submit').onclick = () => {
    if (pwInput.value !== ADMIN_PASS) {
      pwError.textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(adminSec);

    // Machines list realtime
    subs.machines = onSnapshot(collection(db, 'machines'), snap => {
      const ul = document.getElementById('machines-list');
      ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        const del = document.createElement('span');
        del.textContent = '×';
        del.className = 'delete-btn';
        del.onclick = async () => {
          await deleteDoc(doc(db, 'machines', d.id));
        };
        li.append(del);
        ul.append(li);
      });
    });
  };
  document.getElementById('admin-back').onclick = () => { hideAll(); show(modeSelect); };
  document.getElementById('add-machine-btn').onclick = async () => {
    const input = document.getElementById('machine-name-input');
    const name  = input.value.trim();
    if (!name) return;
    await addDoc(collection(db,'machines'), { name });
    input.value = '';
  };

  // View Logs
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll(); show(logSec);
    const filterAndRender = async () => {
      const fromVal = document.getElementById('log-date-start').value;
      const toVal   = document.getElementById('log-date-end').value;
      const snap    = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const startObj = b.start.toDate ? b.start.toDate() : new Date(b.start);
        const dt = startObj.toISOString().slice(0,10);
        if ((!fromVal || dt >= fromVal) && (!toVal || dt <= toVal)) {
          rows.push({ id: d.id, ...b });
        }
      });
      const tbody = document.getElementById('log-table-body');
      tbody.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        const startDisp = b.start.toDate
          ? b.start.toDate().toLocaleString()
          : new Date(b.start).toLocaleString();
        const endDisp   = b.end.toDate
          ? b.end.toDate().toLocaleString()
          : new Date(b.end).toLocaleString();
        [b.machine, b.user, startDisp, endDisp,
         b.physical?'✔':'✘', b.recipe?'✔':'✘', b.pressure||'', b.completed?'✔':'✘']
          .forEach(v=>{ const td=document.createElement('td'); td.textContent=v; tr.appendChild(td); });
        const actTd = document.createElement('td');
        const del = document.createElement('button'); del.textContent='Delete';
        del.onclick = async () => { await deleteDoc(doc(db,'bookings',b.id)); filterAndRender(); };
        const comp = document.createElement('button'); comp.textContent='Complete';
        comp.onclick= async()=>{ await updateDoc(doc(db,'bookings',b.id),{completed:true,completedTime:Date.now()}); filterAndRender(); };
        actTd.append(del, comp);
        tr.append(actTd);
        tbody.append(tr);
      });
    };
    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick  = () => window.print();
    filterAndRender();
  };
  document.getElementById('log-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // View Audit
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML = '';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(), a.user, a.action, a.details ]
            .forEach(v=>{ const td=document.createElement('td'); td.textContent=v; tr.append(td); });
          tbody.append(tr);
        });
      }
    );
  };
  document.getElementById('audit-back-btn').onclick = () => { hideAll(); show(adminSec); };

  // Weekly View for Admin
  const drawWeekly = (body, data) => {
    body.innerHTML = '';
    const slots = {};
    data.forEach(b => {
      const d   = b.start.toDate ? b.start.toDate() : new Date(b.start);
      const day = d.getDay();
      const hr  = d.getHours();
      if (hr>=9 && hr<17) slots[day+'-'+hr] = true;
    });
    for (let h=9; h<17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.textContent = h+':00'; tr.append(th);
      for(let d=1; d<=7; d++){
        const td = document.createElement('td');
        td.textContent = slots[d+'-'+h] ? 'X' : '';
        tr.append(td);
      }
      body.append(tr);
    }
  };
  document.getElementById('view-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(document.getElementById('weekly-body'), snap.docs.map(d=>d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };

  // User flow
  document.getElementById('user-btn').onclick = () => {
    hideAll(); show(userSec);
    subs.machinesU = onSnapshot(collection(db,'machines'), snap=>{
      const ul = document.getElementById('user-machines'); ul.innerHTML='';
      snap.forEach(d=>{
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = ()=>{
          document.getElementById('booking-machine-name').textContent = d.data().name;
          show(document.getElementById('booking-form'));
        };
        ul.append(li);
      });
    });
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap=>{
        const ul = document.getElementById('booking-list'); ul.innerHTML='';
        snap.forEach(d=>{
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          const dispStart = b.start.toDate?b.start.toDate().toLocaleString():new Date(b.start).toLocaleString();
          const dispEnd   = b.end.toDate?b.end.toDate().toLocaleString():new Date(b.end).toLocaleString();
          li.textContent = `${b.machine}: ${b.user} (${dispStart}→${dispEnd})`;
          li.onclick = ()=> window.openDetail(d.id, b);
          ul.append(li);
        });
      }
    );
  };
  document.getElementById('user-back').onclick = () => { hideAll(); show(modeSelect); };
  document.getElementById('user-weekly-btn').onclick = async()=>{
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(document.getElementById('user-weekly-body'), snap.docs.map(d=>d.data()));
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };

  // Booking submission
  document.getElementById('submit-booking-btn').onclick = async () => {
    const machine = document.getElementById('booking-machine-name').textContent;
    const user    = document.getElementById('booking-name').value.trim();
    const email   = document.getElementById('booking-email').value.trim();
    const start   = document.getElementById('booking-start').value;
    const end     = document.getElementById('booking-end').value;
    const errDiv  = document.getElementById('booking-error');
    errDiv.textContent = '';
    if (!user||!email||!start||!end|| end<=start) {
      errDiv.textContent = 'Fill all fields and ensure end is after start.';
      return;
    }
    await addDoc(collection(db,'bookings'),{
      machine, user, email,
      start: new Date(start).toISOString(),
      end:   new Date(end).toISOString(),
      physical:false, recipe:false, pressure:0,
      completed:false
    });
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id=>document.getElementById(id).value='');
    document.getElementById('booking-form').classList.add('hidden');
  };

  // Detail panel
  window.openDetail = (id,b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p>Machine: ${b.machine}</p>
      <p>User: ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical</label>
      <label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value=""></option>
          <option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>Pressure: <input type="number" id="inp-pr" value="${b.pressure||0}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.querySelector('#btn-close').onclick = ()=> detail.classList.add('hidden');
    detail.querySelector('#btn-save').onclick = async()=>{
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = +detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id),{
        physical:phys,
        recipe:rec,
        recipeUsed: used,
        pressure: pres,
        physicalTime: phys?Date.now():b.physicalTime,
        recipeTime:  rec?Date.now():b.recipeTime,
        pressureTime: pres?Date.now():b.pressureTime
      });
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-complete').onclick = async()=>{
      await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});
      detail.classList.add('hidden');
    };
    detail.querySelector('#btn-delete').onclick = async()=>{
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };
});


  window.openDetail=(id,b)=>{const detail=document.getElementById('booking-detail');detail.classList.remove('hidden');detail.innerHTML=`<h4>Details</h4><p>Machine: ${b.machine}</p><p>User: ${b.user}</p><label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label><label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label><label>Recipe Used:<select id="sel-rec"><option value=""></option><option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option><option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option><option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option><option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option></select></label><label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label><button id="btn-save">Save</button><button id="btn-complete">Complete</button><button id="btn-delete">Delete</button><button id="btn-close">Close</button>`;detail.querySelector('#btn-close').onclick=()=>detail.classList.add('hidden');detail.querySelector('#btn-save').onclick=async()=>{const phys=detail.querySelector('#chk-phys').checked;const rec=detail.querySelector('#chk-rec').checked;const used=detail.querySelector('#sel-rec').value;const pres=detail.querySelector('#inp-pr').value;await updateDoc(doc(db,'bookings',id),{physical:phys,recipe:rec,recipeUsed:used,pressure:pres,physicalTime:phys?Date.now():b.physicalTime,recipeTime:rec?Date.now():b.recipeTime,pressureTime:pres?Date.now():b.pressureTime});detail.classList.add('hidden');};detail.querySelector('#btn-complete').onclick=async()=>{await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});detail.classList.add('hidden');};detail.querySelector('#btn-delete').onclick=async()=>{await deleteDoc(doc(db,'bookings',id));detail.classList.add('hidden');};};
