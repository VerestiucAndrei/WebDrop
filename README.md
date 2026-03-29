# WebDrop

This repository contains WebDrop, a serverless web application designed to synchronize clipboard text and transfer files between PC and mobile devices. It acts as a real-time shared clipboard and a personal cloud file vault with a 5GB capacity limit.

### Project Architecture

* [Frontend Client] - HTML/CSS and Vanilla JavaScript (ES6+)
* [Backend Services] - Google Firebase (Auth, Database, Storage)

## Live Site

You can access the live application [here](https://webdrop-45d42.web.app/).

## Project Description

WebDrop operates entirely on a serverless architecture, bypassing the need for a traditional Node.js or Python backend. 

* **Text and File Synchronization**: Utilizes Firebase Realtime Database listeners (`onValue`) to instantly reflect clipboard changes and file uploads across all active sessions without requiring page reloads.
* **File Vault**: Uses file transfers with a 5 GB total cloud storage limit. The client chunks the file and sends it directly to Firebase Cloud Storage.

### Main Frameworks

* **Vanilla JavaScript (ES6+)**
* **Firebase Realtime Database**
* **Firebase Cloud Storage**
* **Firebase Authentication**

## Installation Guide

To set up and run this project yourself, follow these steps:

1. Download or clone this code to your computer.
2. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
3. In your Firebase project, turn on **Authentication** (choose Email/Password), **Realtime Database**, and **Storage**.
4. Secure your data by updating the security rules. First, create a user account in the Authentication tab and copy your unique User ID (UID).
   * Go to **Realtime Database > Rules**, replace the existing text with this, enter your UID in the specified field, and hit publish:
     ```json
     {
       "rules": {
         ".read": "auth != null && auth.uid == 'YOUR_UID_HERE'",
         ".write": "auth != null && auth.uid == 'YOUR_UID_HERE'"
       }
     }
     ```
   * Go to **Storage > Rules**, replace the existing text with this, enter your UID in the specified field, and hit publish:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /{allPaths=**} {
           allow read, write: if request.auth != null && request.auth.uid == 'YOUR_UID_HERE';
         }
       }
     }
     ```
5. Find your project settings in Firebase and copy your configuration keys.
6. Open the `script.js` file in the code and replace the `firebaseConfig` section with your keys:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       databaseURL: "YOUR_DATABASE_URL",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.firebasestorage.app"
   };
   ```
7. To put the app on the internet, download Node.js and open your computer's terminal (command prompt).
8. Type `npm install -g firebase-tools` to install the required tools.
9. Type `firebase login` to sign into your Google account.
10. Type `firebase init` to link the folder to your project, and finally `firebase deploy` to send the website to the live internet.

## Helpful Links
* [Firebase Documentation](https://firebase.google.com/docs)
* [Firebase JavaScript API Reference](https://firebase.google.com/docs/reference/js)

## License

This project is licensed under the terms of the MIT license.
