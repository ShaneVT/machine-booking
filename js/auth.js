document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded - auth.js running");
  
  var form = document.getElementById('login-form');
  if (!form) {
    console.error("Error: Login form not found");
    return;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log("Login attempt");

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
      .then(function() {
        window.location.href = "admin.html";
      })
      .catch(function(error) {
        console.error("Login error:", error);
        alert("Login failed: " + error.message.replace("Firebase: ", ""));
      });
  });
});
