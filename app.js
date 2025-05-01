// app.js
import { 
  initializeApp 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot,
  getDocs, updateDoc, deleteDoc, doc, query, orderBy
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// --- configure your Firebase project here ---
const firebaseConfig = {
  apiKey: "AIzaSyBuJv6jHOOnzvnHHoX9t_b3mTYeMK10tCM",
  authDomain: "machine-booking-3c611.firebaseapp.com",
  projectId: "machine-booking-3c611",
  storageBucket: "machine-booking-3c611.firebasestorage.app",
  messagingSenderId: "417259615223",
  appId: "1:417259615223:web:8535395de07d7bce0db4f2"
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// wait until DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';
  const modeSelect   = el('mode-selection');
  const loginPrompt  = el('login-prompt');
  const adminSec     = el('admin-section');
  const logSec       = el('log-section');
  const auditSec     = el('audit-section');
  const userSec      = el('user-section');
  let subs = {};

  function el(id){ return document.getElementById(id); }
  function hideAll(){
    [modeSelect, loginPrompt, adminSec, logSec, auditSec, userSec]
      .forEach(x=>x.classList.add('hidden'));
    // unsubscribe any real-time listeners
    Object.values(subs).forEach(unsub=>unsub && unsub());
    subs = {};
  }
  function show(x){ x.classList.remove('hidden'); }

  // initial
  hideAll(); show(modeSelect);

  // Admin flow
  el('admin-btn').onclick = ()=>{ hideAll(); show(loginPrompt); };
  el('pw-cancel').onclick= ()=>{ hideAll(); show(modeSelect); };
  el('pw-submit').onclick= ()=>{
    if(el('pw-input').value !== ADMIN_PASS){
      el('pw-error').textContent='Incorrect password';
      return;
    }
    hideAll(); show(adminSec);
    subs.machines = onSnapshot(
      collection(db,'machines'),
      snap => {
        const ul = el('machines-list'); ul.innerHTML='';
        snap.forEach(d=>{
          const li = document.createElement('li');
          li.textContent = d.data().name;
          // allow deletion
          const del = document.createElement('span');
          del.textContent=' ✖';
          del.style.color='red'; del.style.cursor='pointer';
          del.onclick = ()=> deleteDoc(doc(db,'machines',d.id));
          li.appendChild(del);
          ul.appendChild(li);
        });
      }
    );
  };
  el('admin-back').onclick= ()=>{ hideAll(); show(modeSelect); };
  el('add-machine-btn').onclick = async ()=>{
    const name = el('machine-name-input').value.trim();
    if(!name) return;
    await addDoc(collection(db,'machines'),{ name });
    el('machine-name-input').value='';
  };

  // View Logs
  el('view-logs-btn').onclick = ()=> {
    hideAll(); show(logSec);
    async function filterAndRender(){
      const from = el('log-date-start').value;
      const to   = el('log-date-end').value;
      const snap = await getDocs(collection(db,'bookings'));
      const rows = [];
      snap.forEach(d=>{
        const b = d.data();
        const day = b.start.slice(0,10);
        if((!from||day>=from) && (!to||day<=to))
          rows.push({ id: d.id, ...b });
      });
      const tbody = el('log-table-body');
      tbody.innerHTML='';
      rows.forEach(b=>{
        const tr = document.createElement('tr');
        [b.machine,b.user,b.start,b.end,
         b.physical?'✔':'✘',b.recipe?'✔':'✘',
         b.pressure||'', b.completed?'✔':'✘']
        .forEach(txt=>{
          const td = document.createElement('td');
          td.textContent = txt; tr.appendChild(td);
        });
        const actTd = document.createElement('td');
        const del = btn('Delete',async ()=>{
          await deleteDoc(doc(db,'bookings',b.id));
          filterAndRender();
        });
        const comp = btn('Complete',async ()=>{
          await updateDoc(doc(db,'bookings',b.id),{
            completed:true,
            completedTime:Date.now()
          });
          filterAndRender();
        });
        actTd.append(del, comp);
        tr.appendChild(actTd);
        tbody.appendChild(tr);
      });
    }
    el('filter-logs-btn').onclick = filterAndRender;
    el('export-pdf-btn').onclick = ()=> window.print();
    filterAndRender();
  };
  el('log-back-btn').onclick = ()=>{ hideAll(); show(adminSec); };

  // View Audit
  el('view-audit-btn').onclick = ()=> {
    hideAll(); show(auditSec);
    subs.audit = onSnapshot(
      query(collection(db,'audit'), orderBy('time')),
      snap=>{
        const tb = el('audit-table-body'); tb.innerHTML='';
        snap.forEach(d=>{
          const a = d.data();
          const tr = document.createElement('tr');
          [ new Date(a.time).toLocaleString(),
            a.user, a.action, a.details ]
          .forEach(txt=>{
            const td = document.createElement('td');
            td.textContent = txt; tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
      }
    );
  };
  el('audit-back-btn').onclick = ()=>{ hideAll(); show(adminSec); };

  // Weekly view helper
  function drawWeekly(body, data){
    body.innerHTML='';
    const slots = {};
    data.forEach(b=>{
      const d0 = new Date(b.start), day=d0.getDay(), hr=d0.getHours();
      if(hr>=9 && hr<17) slots[`${day}-${hr}`]=true;
    });
    for(let h=9;h<17;h++){
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent=`${h}:00`; tr.appendChild(th);
      for(let d=1;d<=7;d++){
        const td = document.createElement('td');
        td.textContent= slots[`${d}-${h}`]?'X':'';
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }
  el('view-weekly-btn').onclick = async ()=>{
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(el('weekly-body'), snap.docs.map(d=>d.data()));
    el('weekly-view').classList.toggle('hidden');
  };

  // User flow
  el('user-btn').onclick = ()=>{
    hideAll(); show(userSec);
    subs.machinesU = onSnapshot(
      collection(db,'machines'),
      snap=>{
        const ul = el('user-machines'); ul.innerHTML='';
        snap.forEach(d=>{
          const li = document.createElement('li');
          li.textContent = d.data().name;
          li.onclick = ()=>{
            el('booking-machine-name').textContent = d.data().name;
            el('booking-form').classList.remove('hidden');
          };
          ul.appendChild(li);
        });
      }
    );
    subs.bookingsU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap=>{
        const ul = el('booking-list'); ul.innerHTML='';
        snap.forEach(d=>{
          const b = d.data();
          if(b.completed) return;
          const li = document.createElement('li');
          li.textContent = `${b.machine}: ${b.user} (${b.start}→${b.end})`;
          li.onclick = ()=> openDetail(d.id, b);
          ul.appendChild(li);
        });
      }
    );
  };
  el('user-back').onclick = ()=>{ hideAll(); show(modeSelect); };
  el('user-weekly-btn').onclick = async ()=>{
    const snap = await getDocs(collection(db,'bookings'));
    drawWeekly(el('user-weekly-body'), snap.docs.map(d=>d.data()));
    el('user-weekly-view').classList.toggle('hidden');
  };

  // Booking submit
  el('submit-booking-btn').onclick = async ()=>{
    const machine = el('booking-machine-name').textContent;
    const user    = el('booking-name').value.trim();
    const email   = el('booking-email').value.trim();
    const start   = el('booking-start').value;
    const end     = el('booking-end').value;
    if(!user||!email||!start||!end || end<=start){
      el('booking-error').textContent='Fill all fields and ensure end is after start.';
      return;
    }
    // double‐booking check
    const all = await getDocs(collection(db,'bookings'));
    if(all.docs.some(d=>{
      const b=d.data();
      return b.machine===machine &&
        !(new Date(end)<=new Date(b.start) ||
          new Date(start)>=new Date(b.end));
    })){
      el('booking-error').textContent='Time slot already booked.';
      return;
    }
    await addDoc(collection(db,'bookings'),{
      machine, user, email, start, end,
      physical:false, recipe:false, pressure:'', completed:false
    });
    // reset
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id=>el(id).value='');
    el('booking-form').classList.add('hidden');
  };

  // detail popup
  window.openDetail = (id,b)=>{
    const d = el('booking-detail');
    d.classList.remove('hidden');
    d.innerHTML = `
      <h4>Details</h4>
      <p>${b.machine} — ${b.user}</p>
      <label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical</label>
      <label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe</label>
      <label>Recipe Used:
        <select id="sel-rec">
          <option value="">--</option>
          ${[1,2,3,4].map(n=>`<option${b.recipeUsed==n?' selected':''} value="${n}">${n}</option>`).join('')}
        </select>
      </label>
      <label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    d.querySelector('#btn-close').onclick = ()=>d.classList.add('hidden');
    d.querySelector('#btn-save').onclick = async ()=>{
      const phys = d.querySelector('#chk-phys').checked;
      const rec  = d.querySelector('#chk-rec').checked;
      const used = d.querySelector('#sel-rec').value;
      const pr   = d.querySelector('#inp-pr').value;
      await updateDoc(doc(db,'bookings',id),{
        physical:phys,
        recipe:rec,
        recipeUsed:used,
        pressure:pr,
        physicalTime: phys?Date.now():b.physicalTime,
        recipeTime:   rec?Date.now():b.recipeTime,
        pressureTime: pr? Date.now():b.pressureTime
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-complete').onclick = async ()=>{
      await updateDoc(doc(db,'bookings',id),{
        completed:true,
        completedTime:Date.now()
      });
      d.classList.add('hidden');
    };
    d.querySelector('#btn-delete').onclick = async ()=>{
      await deleteDoc(doc(db,'bookings',id));
      d.classList.add('hidden');
    };
  };

  // helper to create a button element
  function btn(text, fn){
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = fn;
    return b;
  }
});


  window.openDetail=(id,b)=>{const detail=document.getElementById('booking-detail');detail.classList.remove('hidden');detail.innerHTML=`<h4>Details</h4><p>Machine: ${b.machine}</p><p>User: ${b.user}</p><label><input type="checkbox" id="chk-phys" ${b.physical?'checked':''}/> Physical Cleaning</label><label><input type="checkbox" id="chk-rec" ${b.recipe?'checked':''}/> Recipe Cleaning</label><label>Recipe Used:<select id="sel-rec"><option value=""></option><option value="1" ${b.recipeUsed==='1'?'selected':''}>1</option><option value="2" ${b.recipeUsed==='2'?'selected':''}>2</option><option value="3" ${b.recipeUsed==='3'?'selected':''}>3</option><option value="4" ${b.recipeUsed==='4'?'selected':''}>4</option></select></label><label>Pressure: <input id="inp-pr" type="number" value="${b.pressure||''}"/></label><button id="btn-save">Save</button><button id="btn-complete">Complete</button><button id="btn-delete">Delete</button><button id="btn-close">Close</button>`;detail.querySelector('#btn-close').onclick=()=>detail.classList.add('hidden');detail.querySelector('#btn-save').onclick=async()=>{const phys=detail.querySelector('#chk-phys').checked;const rec=detail.querySelector('#chk-rec').checked;const used=detail.querySelector('#sel-rec').value;const pres=detail.querySelector('#inp-pr').value;await updateDoc(doc(db,'bookings',id),{physical:phys,recipe:rec,recipeUsed:used,pressure:pres,physicalTime:phys?Date.now():b.physicalTime,recipeTime:rec?Date.now():b.recipeTime,pressureTime:pres?Date.now():b.pressureTime});detail.classList.add('hidden');};detail.querySelector('#btn-complete').onclick=async()=>{await updateDoc(doc(db,'bookings',id),{completed:true,completedTime:Date.now()});detail.classList.add('hidden');};detail.querySelector('#btn-delete').onclick=async()=>{await deleteDoc(doc(db,'bookings',id));detail.classList.add('hidden');};};
