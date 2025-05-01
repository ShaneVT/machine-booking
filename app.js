// app.js
import {
  collection, addDoc, onSnapshot, query, orderBy,
  getDocs, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from './firebase.js';

// 1) Inject all the HTML structure into #root
const root = document.getElementById('root');
root.innerHTML = `
  <!-- Mode Selection -->
  <div id="mode-selection">
    <button id="admin-btn">Admin</button>
    <button id="user-btn">User</button>
  </div>

  <!-- Admin Login -->
  <div id="login-prompt" class="hidden">
    <h3>Admin Login</h3>
    <input type="password" id="pw-input" placeholder="Password" />
    <button id="pw-submit">Login</button>
    <button id="pw-cancel">Cancel</button>
    <div id="pw-error" style="color:red;"></div>
  </div>

  <!-- Admin Panel -->
  <section id="admin-section" class="hidden">
    <h2>Admin Panel</h2>
    <button id="admin-back">Back</button>
    <h3>Manage Machines</h3>
    <input type="text" id="machine-name-input" placeholder="Machine name" />
    <button id="add-machine-btn">Add Machine</button>
    <ul id="machines-list"></ul>
    <h3>Reports</h3>
    <button id="view-logs-btn">View Logs</button>
    <button id="view-audit-btn">View Audit</button>
    <button id="view-weekly-btn">Toggle Weekly View</button>
    <div id="weekly-view" class="hidden">
      <h3>Weekly Schedule (9–17h)</h3>
      <table>
        <thead>
          <tr><th>Hour</th><th>Mon</th><th>Tue</th><th>Wed</th>
              <th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>
        </thead>
        <tbody id="weekly-body"></tbody>
      </table>
    </div>
  </section>

  <!-- Usage Logs -->
  <section id="log-section" class="hidden">
    <h3>Usage Logs</h3>
    <button id="log-back-btn">Back</button>
    <label>From: <input type="date" id="log-date-start" /></label>
    <label>To:   <input type="date" id="log-date-end"   /></label>
    <button id="filter-logs-btn">Filter</button>
    <button id="export-pdf-btn">Export PDF</button>
    <table>
      <thead>
        <tr><th>Machine</th><th>User</th><th>Start</th><th>End</th>
            <th>Phys✓</th><th>Rec✓</th><th>Pressure</th><th>Done✓</th><th>Actions</th></tr>
      </thead>
      <tbody id="log-table-body"></tbody>
    </table>
  </section>

  <!-- Audit Log -->
  <section id="audit-section" class="hidden">
    <h3>Audit Log</h3>
    <button id="audit-back-btn">Back</button>
    <table>
      <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
      <tbody id="audit-table-body"></tbody>
    </table>
  </section>

  <!-- User Booking -->
  <section id="user-section" class="hidden">
    <h2>User Booking</h2>
    <button id="user-back">Back</button>
    <h3>Select Machine</h3>
    <ul id="user-machines"></ul>
    <button id="user-weekly-btn">Toggle Weekly View</button>
    <div id="user-weekly-view" class="hidden">
      <h3>Your Weekly Schedule (9–17h)</h3>
      <table>
        <thead>
          <tr><th>Hour</th><th>Mon</th><th>Tue</th><th>Wed</th>
              <th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>
        </thead>
        <tbody id="user-weekly-body"></tbody>
      </table>
    </div>
    <div id="booking-form" class="hidden">
      <h3>Book: <span id="booking-machine-name"></span></h3>
      <label>Name:  <input type="text" id="booking-name"  /></label>
      <label>Email: <input type="email" id="booking-email" /></label>
      <label>Start: <input type="datetime-local" id="booking-start"/></label>
      <label>End:   <input type="datetime-local" id="booking-end"  /></label>
      <button id="submit-booking-btn">Submit</button>
      <div id="booking-error" style="color:red;"></div>
    </div>
    <h3>Your Active Bookings</h3>
    <ul id="booking-list"></ul>
    <div id="booking-detail" class="hidden"></div>
  </section>
`;


// 2) Bind all handlers inside one DOMContentLoaded
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
    [ modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec ]
      .forEach(el => el.classList.add('hidden'));
    Object.values(subs).forEach(u => u && u());
    subs = {};
  }
  function show(el) { el.classList.remove('hidden'); }

  // initial
  hideAll();
  show(modeSelect);


  //
  //  Admin Login → Panel
  //
  document.getElementById('admin-btn').onclick = () => { hideAll(); show(loginPrompt); };
  document.getElementById('pw-cancel').onclick = () => { hideAll(); show(modeSelect); };
  document.getElementById('pw-submit').onclick = () => {
    if (document.getElementById('pw-input').value !== ADMIN_PASS) {
      document.getElementById('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(adminSec);

    // real-time machines list
    subs.machines = onSnapshot(collection(db,'machines'), snap => {
      const ul = document.getElementById('machines-list');
      ul.innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        ul.appendChild(li);
      });
    });
  };
  document.getElementById('admin-back').onclick = () => { hideAll(); show(modeSelect); };
  document.getElementById('add-machine-btn').onclick = async () => {
    const inp = document.getElementById('machine-name-input');
    const name = inp.value.trim(); if (!name) return;
    await addDoc(collection(db,'machines'), { name });
    inp.value = '';
  };


  //
  //  Usage Logs (Admin)
  //
  document.getElementById('view-logs-btn').onclick = () => {
    hideAll(); show(logSec);

    async function filterAndRender(){
      const from = document.getElementById('log-date-start').value;
      const to   = document.getElementById('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d => {
        const b = d.data();
        const date = b.start.slice(0,10);
        if ((!from||date>=from) && (!to||date<=to)) {
          rows.push({ id: d.id, ...b });
        }
      });
      const tbody = document.getElementById('log-table-body');
      tbody.innerHTML = '';
      rows.forEach(b => {
        const tr = document.createElement('tr');
        [ b.machine, b.user, b.start, b.end,
          b.physical?'✔':'✘', b.recipe?'✔':'✘',
          b.pressure||'', b.completed?'✔':'✘' ]
        .forEach(v=>{
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
        // Actions
        const act = document.createElement('td');
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db,'bookings',b.id));
          filterAndRender();
        };
        const comp = document.createElement('button');
        comp.textContent = 'Complete';
        comp.onclick = async ()=>{
          await updateDoc(doc(db,'bookings',b.id),{ completed:true, completedTime:Date.now() });
          filterAndRender();
        };
        act.appendChild(del);
        act.appendChild(comp);
        tr.appendChild(act);

        tbody.appendChild(tr);
      });
    }

    document.getElementById('filter-logs-btn').onclick = filterAndRender;
    document.getElementById('export-pdf-btn').onclick = ()=>window.print();
    filterAndRender();
  };
  document.getElementById('log-back-btn').onclick = () => { hideAll(); show(adminSec); };


  //
  //  Audit Log (Admin)
  //
  document.getElementById('view-audit-btn').onclick = () => {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap => {
        const tbody = document.getElementById('audit-table-body');
        tbody.innerHTML ='';
        snap.forEach(d => {
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(), a.user, a.action, a.details ]
            .forEach(v => {
              const td = document.createElement('td');
              td.textContent = v;
              tr.appendChild(td);
            });
          tbody.appendChild(tr);
        });
      }
    );
  };
  document.getElementById('audit-back-btn').onclick = () => { hideAll(); show(adminSec); };


  //
  //  Weekly View helper
  //
  function drawWeekly(body, data){
    body.innerHTML = '';
    const slots = {};
    data.forEach(b=>{
      const day = new Date(b.start).getDay();
      const hr  = new Date(b.start).getHours();
      if(hr>=9 && hr<17) slots[day+'-'+hr]=true;
    });
    for(let h=9; h<17; h++){
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for(let d=1; d<=7; d++){
        const td = document.createElement('td');
        td.textContent = slots[d+'-'+h]?'X':'';
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  document.getElementById('view-weekly-btn').onclick = async ()=>{
    const body = document.getElementById('weekly-body');
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    document.getElementById('weekly-view').classList.toggle('hidden');
  };


  //
  //  User Flow
  //
  document.getElementById('user-btn').onclick = () => {
    hideAll(); show(userSec);

    // machines list
    subs.machinesU = onSnapshot(collection(db,'machines'), snap=>{
      const ul = document.getElementById('user-machines');
      ul.innerHTML = '';
      snap.forEach(d=>{
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = ()=>{
          document.getElementById('booking-machine-name').textContent = d.data().name;
          show(document.getElementById('booking-form'));
        };
        ul.appendChild(li);
      });
    });

    // active bookings
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap=>{
        const ul = document.getElementById('booking-list');
        ul.innerHTML = '';
        snap.forEach(d=>{
          const b = d.data();
          if(b.completed) return;  // skip done
          const li = document.createElement('li');
          li.textContent = \`\${b.machine}: \${b.user} (\${b.start}→\${b.end})\`;
          li.onclick = ()=> openDetail(d.id, b);
          ul.appendChild(li);
        });
      }
    );
  };
  document.getElementById('user-back').onclick = () => { hideAll(); show(modeSelect); };

  document.getElementById('user-weekly-btn').onclick = async ()=>{
    const body = document.getElementById('user-weekly-body');
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(body, snap.docs.map(d=>d.data()));
    document.getElementById('user-weekly-view').classList.toggle('hidden');
  };


  //
  //  Detail / Edit Pane for User Bookings
  //
  window.openDetail = (id, b) => {
    const detail = document.getElementById('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = \`
      <h4>Details</h4>
      <p>Machine: \${b.machine}</p>
      <p>User: \${b.user}</p>
      <label><input type="checkbox" id="chk-phys" \${b.physical?'checked':''}/> Physical Cleaning</label>
      <label><input type="checkbox" id="chk-rec"  \${b.recipe?'checked':''}/> Recipe Cleaning</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          <option value="1" \${b.recipeUsed==='1'?'selected':''}>1</option>
          <option value="2" \${b.recipeUsed==='2'?'selected':''}>2</option>
          <option value="3" \${b.recipeUsed==='3'?'selected':''}>3</option>
          <option value="4" \${b.recipeUsed==='4'?'selected':''}>4</option>
        </select>
      </label>
      <label>Pressure:<input id="inp-pr" type="number" value="\${b.pressure||''}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    \`;

    detail.querySelector('#btn-close').onclick = ()=>detail.classList.add('hidden');

    detail.querySelector('#btn-save').onclick = async ()=>{
      const phys = detail.querySelector('#chk-phys').checked;
      const rec  = detail.querySelector('#chk-rec').checked;
      const used = detail.querySelector('#sel-rec').value;
      const pres = detail.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id),{
        physical:phys,
        recipe:rec,
        recipeUsed:used,
        pressure:pres,
        physicalTime: phys? Date.now(): b.physicalTime,
        recipeTime:   rec? Date.now(): b.recipeTime,
        pressureTime: pres? Date.now(): b.pressureTime
      });
      detail.classList.add('hidden');
    };

    detail.querySelector('#btn-complete').onclick = async ()=>{
      await updateDoc(doc(db,'bookings',id), { completed:true, completedTime:Date.now() });
      detail.classList.add('hidden');
    };

    detail.querySelector('#btn-delete').onclick = async ()=>{
      await deleteDoc(doc(db,'bookings',id));
      detail.classList.add('hidden');
    };
  };

});
