document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then(function() {
      window.location.href = 'admin.html';
    })
    .catch(function(error) {
      alert("Error: " + error.message.replace("Firebase: ", ""));
    });
});
