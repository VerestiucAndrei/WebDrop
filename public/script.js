import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, set, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, listAll, deleteObject, getMetadata } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDraLhdj40PioYIGBRhxc1a3s_pz3vAq0E",
    authDomain: "webdrop-45d42.firebaseapp.com",
    databaseURL: "https://webdrop-45d42-default-rtdb.firebaseio.com",
    projectId: "webdrop-45d42",
    storageBucket: "webdrop-45d42.firebasestorage.app"
};

let usedStorageBytes = 0;
const maxStorageBytes = 5 * 1024 * 1024 * 1024; // 5 GB

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        startAppLogic();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
});

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
        const fileInput = document.getElementById('filePicker');
        const statusText = document.getElementById('status');
        const file = fileInput.files[0];

        if (!file) return alert("Pick a file first!");

        // Check if file exceeds remaining storage capacity
        if (file &&file.size + usedStorageBytes > maxStorageBytes)
            return alert("Upload blocked: Not enough free space");

        // Update the "Total Usage" in the database
        update(dbRef(database, 'stats'), {
            totalBytes: increment(file.size)
        });

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


    window.loadFiles = function () {
        const listFolderRef = storageRef(storage, 'uploads/');
        const fileListHTML = document.getElementById('fileList');
        fileListHTML.innerHTML = "Loading files";

        listAll(listFolderRef).then((res) => {
            fileListHTML.innerHTML = "";

            if (res.items.length == 0) {
                fileListHTML.innerHTML = "<li>Vault is empty.</li>";
                return;
            }

            res.items.forEach((itemRef) => {
                const line = document.createElement('line');
                li.style.marginBottom = "10px";
                li.style.display = "flex";
                li.style.justifyContent = "space-between";

                li.innerHTML = `
                <span>${itemRef.name}</span>
                <button onclick="deleteFile('${itemRef.name}')" style="background: #ff3b30; padding: 5px 10px;">Delete</button>
                `;
                fileListHTML.appendChild(li);
            });
        });
    };


    // Update storage statistics
    onValue(dbRef(database, 'stats/totalBytes'), (snapshot) => {
        usedStorageBytes = snapshot.val() || 0;
        const gb = (bytes / (1024 * 1024 * 1024)).toFixed(4);

        document.getElementById('usageStat').innerText = gb + " GB";
        document.getElementById('usageBar').style.width = (usedStorageBytes / maxStorageBytes * 100) + "%";
    });
}