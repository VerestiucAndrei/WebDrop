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

    textArea.addEventListener('input', (e) => set(textLocation, e.target.value));

    onValue(textLocation, (snapshot) => {
        const cloudText = snapshot.val() || "";
        if (textArea.value !== cloudText) textArea.value = cloudText;
    });


    /// Finish load Files function
      window.loadFiles = function () {
        const listFolderRef = storageRef(storage, 'uploads/');
        const fileListContainer = document.getElementById('fileList');

        const loadingMessage = document.createElement('li');
        loadingMessage.textContent = "Loading files";
        fileListContainer.appendChild(loadingMessage);

        listAll(listFolderRef).then((result) => {
            fileListContainer.removeChild(loadingMessage);

            // No files uploaded
            if (result.items.length == 0) {
                const emptyMessage = document.createElement('li');
                emptyMessage.textContent = "No files uploaded";
                fileListContainer.appendChild(emptyMessage);
                return;
            }

            result.items.forEach((itemRef) => {
                // Create line
                const line = document.createElement('li');
                line.style.display = "flex";
                line.style.justifyContent = "space-between";
                
                // Create filename element
                const nameSpan = document.createElement('span');
                nameSpan.textContent = itemRef.name;

                // Add row in list
                line.appendChild(nameSpan);
                fileListContainer.appendChild(line);
            })
        });
    };

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
        loadFiles();
    };

    // Update storage statistics
    onValue(dbRef(database, 'stats/totalBytes'), (snapshot) => {
        usedStorageBytes = snapshot.val() || 0;
        const gb = (usedStorageBytes / (1024 * 1024 * 1024)).toFixed(4);

        document.getElementById('usageStat').innerText = gb + " GB";
        document.getElementById('usageBar').style.width = (usedStorageBytes / maxStorageBytes * 100) + "%";
    });

    loadFiles();
}