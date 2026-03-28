import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";


const firebaseConfig = {
    apiKey: "AIzaSyDraLhdj40PioYIGBRhxc1a3s_pz3vAq0E",
    authDomain: "webdrop-45d42.firebaseapp.com",
    databaseURL: "https://webdrop-45d42-default-rtdb.firebaseio.com",
    projectId: "webdrop-45d42",
    storageBucket: "webdrop-45d42.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

window.manualLogin = function () {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => document.getElementById('loginScreen').style.display = 'none')
        .catch(err => alert(err.message));
};

function startAppLogic() {
    const textArea = document.getElementById('clip');
    const textLocation = dbRef(database, 'clipboard/text');
    const fileLocation = dbRef(database, 'clipboard/latestFile');
    const fileDisplayArea = document.getElementById('fileDisplay');

    textArea.addEventListener('input', (e) => set(textLocation, e.target.value));

    onValue(textLocation, (snapshot) => {
        const cloudText = snapshot.val() || "";
        if (textArea.value !== cloudText) textArea.value = cloudText;
    });

    onValue(fileLocation, (snapshot) => {
        const fileData = snapshot.val();
        if (fileData) {
            fileDisplayArea.innerHTML = `<p>Latest File: <strong>${fileData.name}</strong></p>
                                                 <a href="${fileData.link}" target="_blank">Download Now</a>`;
        }
    });

    window.uploadFile = function () {
        // Update the "Total Usage" in the database
        onValue(dbRef(database, 'stats/totalBytes'), (snapshot) => {
            const currentTotal = snapshot.val() || 0;
            const newTotal = currentTotal + file.size;
            set(dbRef(database, 'stats/totalBytes'), newTotal);
        }, { onlyOnce: true });

        
        const fileInput = document.getElementById('filePicker');
        const statusText = document.getElementById('status');
        const file = fileInput.files[0];

        if (!file) return alert("Pick a file first!");

        const vaultLocation = storageRef(storage, 'uploads/' + file.name);
        const uploadTask = uploadBytesResumable(vaultLocation, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                statusText.innerText = `Uploading: ${Math.round(progress)}%`;
            },
            (error) => statusText.innerText = "Error: " + error.message,
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    statusText.innerText = "Upload Complete!";
                    set(fileLocation, { name: file.name, link: downloadURL });
                });
            }
        );
    };

    onValue(dbRef(database, 'stats/totalBytes'), (snapshot) => {
    const bytes = snapshot.val() || 0;
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
    document.getElementById('usageStat').innerText = gb + " GB";
    document.getElementById('usageBar').style.width = (gb / 5 * 100) + "%";
});
}