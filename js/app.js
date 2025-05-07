document.addEventListener('DOMContentLoaded', () => {
    // Test Firestore connection
    db.collection("test").add({
        test: "Connection working",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => console.log("Firestore connection successful"))
    .catch(err => console.error("Firestore error:", err));

    // Load machines
    loadMachines();
});

function loadMachines() {
    db.collection("machines").get()
        .then((snapshot) => {
            const container = document.getElementById("machine-list");
            container.innerHTML = "";
            
            snapshot.forEach(doc => {
                const data = doc.data();
                container.innerHTML += `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h5>${data.name || "Unnamed Machine"}</h5>
                                <button class="btn btn-primary">Book Now</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        })
        .catch(err => {
            console.error("Error loading machines:", err);
            document.getElementById("machine-list").innerHTML = `
                <div class="alert alert-danger">
                    Error loading machines. Check console.
                </div>
            `;
        });
}
