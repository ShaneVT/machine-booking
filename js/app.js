// Initialize calendar and other components
document.addEventListener('DOMContentLoaded', () => {
  // Initialize calendar
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      events: async (fetchInfo, successCallback) => {
        try {
          const snapshot = await db.collection("bookings").get();
          const events = snapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().machineName,
            start: doc.data().startTime,
            end: doc.data().endTime
          }));
          successCallback(events);
        } catch (error) {
          console.error("Error loading bookings:", error);
        }
      }
    });
    calendar.render();
  }

  // Setup navigation buttons
  document.getElementById('admin-btn')?.addEventListener('click', () => {
    window.location.href = 'admin.html';
  });

  document.getElementById('user-view-btn')?.addEventListener('click', logout);
});
