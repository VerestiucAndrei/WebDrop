import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref as dbRef, set, onValue, update, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, listAll, deleteObject, getMetadata } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_URL.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app"
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

// Refresh page function
window.refreshApp = function() {
    const btn = document.getElementById('refreshButton');

    if (btn) {
        btn.style.opacity = "0.5";
        btn.disabled = true;
    }

    setTimeout(() => {
        window.location.href = window.location.href.split('#')[0];
    }, 50);
};

// Manual login
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

    window.deleteFile = function (fileName) {
        if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

        const fileRef = storageRef(storage, 'uploads/' + fileName);

        // Get file size
        getMetadata(fileRef).then((metadata) => {
            const fileSize = metadata.size;

            // Delete file
            deleteObject(fileRef).then(() => {
                update(dbRef(database, 'stats'), {
                    totalBytes: increment(-fileSize)
                });

                loadFiles();
                alert("File deleted successfully");
            }).catch(err => alert("Error deleting: " + err.message));

        }).catch(err => alert("Error" + err.message));
    }

    window.loadFiles = function () {
        const listFolderRef = storageRef(storage, 'uploads/');
        const fileListContainer = document.getElementById('fileList');

        // Clear the list
        while (fileListContainer.firstChild) {
            fileListContainer.removeChild(fileListContainer.firstChild);
        }

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
                line.style.alignItems = "center";

                // Create filename element
                const nameSpan = document.createElement('span');
                nameSpan.textContent = itemRef.name;

                // Button Group
                const buttonGroup = document.createElement('div');
                buttonGroup.style.display = "flex";
                buttonGroup.style.gap = "10px";

                // Create download button
                const downloadButton = document.createElement('button');
                downloadButton.textContent = "Download";

                downloadButton.onclick = () => {
                    downloadButton.textContent = "Downloading...";

                    getDownloadURL(itemRef).then((url) => {
                        window.open(url, '_blank');
                    }).catch((err) => {
                        alert("Error fetching link " + err.message);
                    });

                    downloadButton.textContent = "Download";
                };

                // Create delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = "Delete";

                deleteButton.onclick = () => window.deleteFile(itemRef.name);

                // Add row in list
                buttonGroup.appendChild(downloadButton);
                buttonGroup.appendChild(deleteButton);

                line.appendChild(nameSpan);
                line.appendChild(buttonGroup);
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
        if (file && file.size + usedStorageBytes > maxStorageBytes)
            return alert("Upload blocked: Not enough free space");

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

                    // Update the "Total Usage" in the database
                    update(dbRef(database, 'stats'), {
                        totalBytes: increment(file.size)
                    });
                    loadFiles();

                    alert("File uploaded successfuly");
                    fileInput.value = "";
                });
            }
        )
    };

    // Update storage statistics and trigger file list changes
    onValue(dbRef(database, 'stats/totalBytes'), (snapshot) => {
        usedStorageBytes = snapshot.val() || 0;
        const gb = (usedStorageBytes / (1024 * 1024 * 1024)).toFixed(4);

        document.getElementById('usageStat').innerText = gb + " GB";
        document.getElementById('usageBar').style.width = (usedStorageBytes / maxStorageBytes * 100) + "%";

        loadFiles();
    });
}
