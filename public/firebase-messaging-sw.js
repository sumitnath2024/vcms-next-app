// public/firebase-messaging-sw.js

// 1. Import Firebase scripts for the service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAT-W2NJ8aGp5ArcldIH9UzoVPlAtcENDM",  
  authDomain: "vcms-fa31a.firebaseapp.com",
  projectId: "vcms-fa31a",
  storageBucket: "vcms-fa31a.firebasestorage.app",
  messagingSenderId: "728229728360",
  appId: "1:728229728360:web:e3dfe1aeccea1e99122bdd",
  measurementId: "G-DC66S6F5PH"
});

// Initialize messaging
const messaging = firebase.messaging();

// 3. THE BACKGROUND MESSAGE HANDLER
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  // We intentionally DO NOT call self.registration.showNotification() here.
  // Because your backend Cloud Function sends a payload containing a 'notification' object, 
  // Firebase automatically handles displaying the UI notification for you. 
  // Leaving this empty stops the duplicate notification from firing!
});