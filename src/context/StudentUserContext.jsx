import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const StudentUserContext = createContext();

export const StudentUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
              setUser({ uid: currentUser.uid, ...docSnap.data() });
            } else {
              setUser(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching student profile:", error);
            setLoading(false);
          }
        );
      } else {
        // User logged out
        setUser(null);
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
    <StudentUserContext.Provider value={{ user, loading }}>
      {children}
    </StudentUserContext.Provider>
  );
};

export const useStudentUser = () => useContext(StudentUserContext);