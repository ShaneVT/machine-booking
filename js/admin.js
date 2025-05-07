auth.onAuthStateChanged(function(user) {
  if (!user) window.location.href = 'login.html';
  
  db.collection("bookings").orderBy("createdAt", "desc").onSnapshot(function(snapshot) {
    var tbody = document.querySelector('#bookings-table tbody');
    tbody.innerHTML = '';
    snapshot.forEach(function(doc) {
      var data = doc.data();
      tbody.innerHTML += `
        <tr>
          <td>${data.machine}</td>
          <td>${data.userName}</td>
          <td>${data.startTime.toDate().toLocaleString()}</td>
          <td>${data.endTime.toDate().toLocaleString()}</td>
          <td><button onclick="if(confirm('Delete?')){db.collection('bookings').doc('${doc.id}').delete()}">Delete</button></td>
        </tr>
      `;
    });
  });
});

document.getElementById('logout-btn').addEventListener('click', function() {
  auth.signOut().then(function() {
    window.location.href = 'index.html';
  });
});
