import {
  collection, addDoc, onSnapshot, getDocs,
  query, orderBy, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_PASS = '0404';

  // --- elements helper ---
  const el = id => document.getElementById(id);
  const allSections = [
    el('mode-selection'),
    el('login-prompt'),
    el('admin-section'),
    el('log-section'),
    el('audit-section'),
    el('user-section')
  ];
  let subs = [];

  const hideAll = () => {
    allSections.forEach(s => s.classList.add('hidden'));
    subs.forEach(unsub => unsub());
    subs = [];
  };
  const show = section => section.classList.remove('hidden');

  // initial
  hideAll();
  show(el('mode-selection'));

  // --- Admin flow ---
  el('admin-btn').onclick = () => {
    hideAll();
    el('pw-input').value = '';
    el('pw-error').textContent = '';
    show(el('login-prompt'));
  };

  el('pw-cancel').onclick = () => {
    hideAll();
    show(el('mode-selection'));
  };

  el('pw-submit').onclick = () => {
    if (el('pw-input').value !== ADMIN_PASS) {
      el('pw-error').textContent = 'Incorrect password';
      return;
    }
    hideAll();
    show(el('admin-section'));

    // live machines list
    const unsubM = onSnapshot(collection(db, 'machines'), snap => {
      el('machines-list').innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = async () => {
          await deleteDoc(doc(db, 'machines', d.id));
        };
        el('machines-list').appendChild(li);
      });
    });
    subs.push(unsubM);
  };

  el('admin-back').onclick = () => {
    hideAll();
    show(el('mode-selection'));
  };

  el('add-machine-btn').onclick = async () => {
    const name = el('machine-name-input').value.trim();
    if (!name) return;
    await addDoc(collection(db, 'machines'), { name });
    el('machine-name-input').value = '';
  };

  // --- Usage Logs ---
  el('view-logs-btn').onclick = () => {
    hideAll();
    show(el('log-section'));

    async function render() {
      const from = el('log-date-start').value;
      const to   = el('log-date-end').value;
      const snap = await getDocs(collection(db, 'bookings'));
      const rows = [];

      snap.forEach(d => {
        const b = d.data();
        const sd = b.start && b.start.toDate
          ? b.start.toDate()
          : new Date(b.start);
        if (isNaN(sd)) return;
        const day = sd.toISOString().slice(0, 10);
        if ((from && day < from) || (to && day > to)) return;
        rows.push({ id: d.id, ...b, _sd: sd });
      });

      const tb = el('log-table-body');
      tb.innerHTML = '';
      rows.forEach(b => {
        const startStr = b._sd.toLocaleString();
        const ed = b.end && b.end.toDate
          ? b.end.toDate()
          : new Date(b.end);
        const endStr = isNaN(ed) ? '' : ed.toLocaleString();

        const tr = document.createElement('tr');
        [ b.machine, b.user, startStr, endStr,
          b.physical?'✔':'✘',
          b.recipe  ?'✔':'✘',
          b.pressure||'',
          b.completed?'✔':'✘'
        ].forEach(txt => {
          const td = document.createElement('td');
          td.textContent = txt;
          tr.appendChild(td);
        });

        const act = document.createElement('td');
        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = async () => {
          await deleteDoc(doc(db, 'bookings', b.id));
          render();
        };
        const cmp = document.createElement('button');
        cmp.textContent = 'Complete';
        cmp.onclick = async () => {
          await updateDoc(doc(db, 'bookings', b.id), {
            completed: true,
            completedTime: Date.now()
          });
          render();
        };
        act.append(del, cmp);
        tr.appendChild(act);

        tb.appendChild(tr);
      });
    }

    el('filter-logs-btn').onclick = render;
    el('export-pdf-btn').onclick = () => window.print();
    render();
  };

  el('log-back-btn').onclick = () => {
    hideAll();
    show(el('admin-section'));
  };

  // --- Audit Log ---
  el('view-audit-btn').onclick = () => {
    hideAll();
    show(el('audit-section'));
    const unsubA = onSnapshot(
      query(collection(db, 'audit'), orderBy('time')),
      snap => {
        const tb = el('audit-table-body');
        tb.innerHTML = '';
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
          tb.appendChild(tr);
        });
      });
    subs.push(unsubA);
  };

  el('audit-back-btn').onclick = () => {
    hideAll();
    show(el('admin-section'));
  };

  // --- Weekly view helper ---
  function drawWeekly(bodyEl, bookings) {
    const slots = {};
    bookings.forEach(b => {
      const sd = b.start && b.start.toDate
        ? b.start.toDate()
        : new Date(b.start);
      if (isNaN(sd)) return;
      const d = sd.getDay(); // 1..7
      const h = sd.getHours();
      if (d>=1 && d<=7 && h>=9 && h<17) {
        slots[`${d}-${h}`] = true;
      }
    });
    bodyEl.innerHTML = '';
    for (let h=9; h<17; h++) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = `${h}:00`;
      tr.appendChild(th);
      for (let d=1; d<=7; d++) {
        const td = document.createElement('td');
        td.textContent = slots[`${d}-${h}`] ? 'X' : '';
        tr.appendChild(td);
      }
      bodyEl.appendChild(tr);
    }
  }

  el('view-weekly-btn').onclick = async () => {
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    drawWeekly(el('weekly-body'),
      bookingsSnap.docs.map(d => d.data())
    );
    el('weekly-view').classList.toggle('hidden');
  };

  // --- User flow ---
  el('user-btn').onclick = () => {
    hideAll();
    show(el('user-section'));

    // list machines to pick
    const unsubMU = onSnapshot(collection(db, 'machines'), snap => {
      el('user-machines').innerHTML = '';
      snap.forEach(d => {
        const li = document.createElement('li');
        li.textContent = d.data().name;
        li.onclick = () => {
          el('booking-machine-name').textContent = d.data().name;
          el('booking-form').classList.remove('hidden');
        };
        el('user-machines').appendChild(li);
      });
    });
    subs.push(unsubMU);

    // list active bookings
    const unsubBU = onSnapshot(
      query(collection(db,'bookings'), orderBy('start')),
      snap => {
        el('booking-list').innerHTML = '';
        snap.forEach(d => {
          const b = d.data();
          if (b.completed) return;
          const li = document.createElement('li');
          const sd = b.start && b.start.toDate
            ? b.start.toDate()
            : new Date(b.start);
          li.textContent =
            `${b.machine}: ${b.user} (${sd.toLocaleString()} → …)`;
          li.onclick = () => openDetail(d.id, b);
          el('booking-list').appendChild(li);
        });
      }
    );
    subs.push(unsubBU);
  };

  el('user-back').onclick = () => {
    hideAll();
    show(el('mode-selection'));
  };

  el('user-weekly-btn').onclick = async () => {
    const snap = await getDocs(collection(db, 'bookings'));
    drawWeekly(el('user-weekly-body'),
      snap.docs.map(d => d.data())
    );
    el('user-weekly-view').classList.toggle('hidden');
  };

  // --- Submit new booking ---
  el('submit-booking-btn').onclick = async () => {
    const machine = el('booking-machine-name').textContent;
    const user    = el('booking-name').value.trim();
    const email   = el('booking-email').value.trim();
    const start   = el('booking-start').value;
    const end     = el('booking-end').value;

    if (!user || !email || !start || !end || end <= start) {
      el('booking-error').textContent =
        'Fill all fields and ensure end > start';
      return;
    }

    // prevent double‐booking: check overlap
    const snap = await getDocs(collection(db,'bookings'));
    const conflict = snap.docs.some(d => {
      const b = d.data();
      if (b.machine !== machine || b.completed) return false;
      return !(end <= b.start || start >= b.end);
    });
    if (conflict) {
      el('booking-error').textContent =
        'Time slot already booked';
      return;
    }

    await addDoc(collection(db,'bookings'), {
      machine, user, email, start, end,
      physical: false,
      recipe: false,
      pressure: '',
      completed: false,
      createdTime: Date.now()
    });

    // reset
    ['booking-name','booking-email','booking-start','booking-end']
      .forEach(id => el(id).value = '');
    el('booking-form').classList.add('hidden');
  };

  // --- Detail / Edit pane ---
  window.openDetail = (id, b) => {
    const detail = el('booking-detail');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <h4>Details</h4>
      <p><strong>${b.machine}</strong> by ${b.user}</p>
      <label><input type="checkbox" id="chk-phys"
        ${b.physical?'checked':''}/> Physical</label>
      <label><input type="checkbox" id="chk-rec"
        ${b.recipe?'checked':''}/> Recipe</label>
      <label>Recipe used:
        <select id="sel-rec">
          <option value="">–</option>
          ${[1,2,3,4].map(n=>
            `<option value="${n}" ${
              b.recipeUsed==n?'selected':''}>${n}</option>`
          ).join('')}
        </select>
      </label>
      <label>Pressure:
        <input type="number" id="inp-pr"
          value="${b.pressure||''}"/>
      </label>
      <button id="btn-save">Save</button>
      <button id="btn-complete">Complete</button>
      <button id="btn-delete">Delete</button>
      <button id="btn-close">Close</button>
    `;
    detail.querySelector('#btn-close').onclick = () =>
      detail.classList.add('hidden');

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
        physicalTime: phys?Date.now():b.physicalTime,
        recipeTime: rec?Date.now():b.recipeTime,
        pressureTime: pres?Date.now():b.pressureTime
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
