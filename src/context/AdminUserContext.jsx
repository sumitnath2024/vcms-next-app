import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AdminUserContext = createContext();

export const AdminUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot; // Declared here to ensure proper cleanup

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Start real-time Firestore listener
        unsubscribeSnapshot = onSnapshot(
          doc(db, 'users', currentUser.uid), 
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              
              // Check roles
              if (['Admin', 'Teacher', 'Student'].includes(userData.role)) {
                setUser({ 
                  uid: currentUser.uid, 
                  email: currentUser.email,
                  ...userData 
                });
              } else {
                setUser(null);
              }
            } else {
              setUser(null);
            }
            setLoading(false);
          }, 
          (error) => {
            console.error("Error fetching admin profile:", error);
            setLoading(false);
          }
        );
      } else {
        // User logged out
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot(); // Stop listening to Firestore
        }
      }
    });

    // Cleanup both listeners when component unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return (
    <AdminUserContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AdminUserContext.Provider>
  );
};

export const useAdminUser = () => useContext(AdminUserContext);