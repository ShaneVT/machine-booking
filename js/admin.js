document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded - admin.js running");

  // Auth check
  auth.onAuthStateChanged(function(user) {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Load bookings
    db.collection("bookings").orderBy("createdAt", "desc").onSnapshot(function(snap) {
      var tbody = document.querySelector('#bookings-table tbody');
      tbody.innerHTML = '';
      
      snap.forEach(function(doc) {
        var data = doc.data();
        tbody.innerHTML += `
          <tr>
            <td>${data.machine}</td>
            <td>${data.userName}</td>
            <td>${data.startTime.toDate().toLocaleString()}</td>
            <td>
              <button class="delete-btn" data-id="${doc.id}">Delete</button>
            </td>
          </tr>
        `;
      });

      // Add delete handlers
      document.querySelectorAll('.delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (confirm("Delete this booking?")) {
            db.collection("bookings").doc(btn.dataset.id).delete();
          }
        });
      });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
      auth.signOut().then(function() {
        window.location.href = "index.html";
      });
    });
  });
});
