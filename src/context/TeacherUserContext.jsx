import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const TeacherUserContext = createContext();

export const useTeacherUser = () => useContext(TeacherUserContext);

export const TeacherUserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Start real-time Firestore listener
        unsubscribeSnapshot = onSnapshot(
          doc(db, 'users', currentUser.uid), 
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData({ uid: currentUser.uid, ...docSnap.data() });
            } else {
              setUserData(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching teacher profile:", error);
            setLoading(false);
          }
        );
      } else {
        // User logged out
        setUserData(null);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <TeacherUserContext.Provider value={{ userData, loading }}>
      {children}
    </TeacherUserContext.Provider>
  );
};