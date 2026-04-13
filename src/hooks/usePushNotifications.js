import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { messaging, db } from '../firebase';

// --- ADD THIS IMPORT ---
import { Capacitor } from '@capacitor/core';

export const usePushNotifications = (userId) => {
  useEffect(() => {
    if (!userId) return;

    // --- THE CRUCIAL FIX ---
    // If we are running inside the Android App, skip this entire file!
    // Native phones do not have a web "Notification" object and will crash.
    // (Your App.jsx is already handling the native token generation)
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Skipping web push hook. Relying on Native token from App.jsx.");
      return; 
    }

    const requestPermissionAndSaveToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Replace with your VAPID key
          const currentToken = await getToken(messaging, { 
            vapidKey: 'BDw3pC3uK2l8IpQQTtyI0QvtpWZKkgtwA-9tOHwB0e1eBTkLBw-ScsBPpA9ZSAL-2YityR7dcLiWnjnRXODMCtw' 
          });

          if (currentToken) {
            // Save the token to the user's Firestore document
            // We use arrayUnion in case they log in from phone AND laptop
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(currentToken)
            });
            console.log("Web Push notifications enabled!");
          }
        } else {
          console.warn('Web Notification permission denied.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    requestPermissionAndSaveToken();

    // Listen for messages when the web app is OPEN (Foreground)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);
      // You can trigger a UI Toast/Alert here if you want in-app popups
      if (payload.notification) {
         alert(`New Notification: ${payload.notification.title}\n${payload.notification.body}`);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);
};