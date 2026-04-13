const functions = require("firebase-functions");
// IMPORT THE NEW V2 SCHEDULER
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// --- SET YOUR LOGO URL HERE ---
const LOGO_URL = "https://vivekanandachildsmission.org.in/vcm_logo.jpeg"; 

// ============================================================================
// HTTP FUNCTIONS (TRIGGERED BY REACT APP)
// ============================================================================

exports.sendPushNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetUid, title, body } = req.body.data;
      const userDoc = await admin.firestore().collection("users").doc(targetUid).get();
      
      if (!userDoc.exists) {
        return res.status(404).send({ data: { success: false, message: "User document not found." }});
      }

      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];

      if (tokens.length === 0) {
        return res.status(200).send({ data: { success: false, message: "User has no registered devices." }});
      }

      // 🚀 UPDATED PAYLOAD: Added 'notification' block and 'toastMessage' for frontend toasts
      const payload = {
        notification: {
          title: title || "",
          body: body || ""
        },
        data: {
          title: title || "",
          body: body || "",
          toastMessage: body || "", 
          logoUrl: LOGO_URL
        },
        android: {
          priority: "high", // Critical for wake-up
        },
        webpush: { notification: { title: title, body: body, icon: LOGO_URL, badge: LOGO_URL } }
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: payload.notification,
        data: payload.data,
        android: payload.android, // Pass android config
        webpush: payload.webpush
      });

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) failedTokens.push(tokens[idx]);
        });
        await admin.firestore().collection("users").doc(targetUid).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
        });
      }

      return res.status(200).send({ data: { success: true, delivered: response.successCount }});
    } catch (error) {
      console.error("Error sending push notification:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

exports.broadcastPushNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { title, body, targetRoles } = req.body.data;

      if (!targetRoles || targetRoles.length === 0) {
        return res.status(400).send({ data: { success: false, message: "No target roles provided." }});
      }

      const usersSnapshot = await admin.firestore().collection("users").where("role", "in", targetRoles).get();
      if (usersSnapshot.empty) {
        return res.status(200).send({ data: { success: false, message: "No users found for these roles." }});
      }

      let allTokens = [];
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && userData.fcmTokens.length > 0) {
          allTokens.push(...userData.fcmTokens);
        }
      });

      if (allTokens.length === 0) {
        return res.status(200).send({ data: { success: false, message: "No registered devices found." }});
      }

      // 🚀 UPDATED PAYLOAD: Added 'notification' block and 'toastMessage' for frontend toasts
      const payload = {
        notification: {
          title: title || "",
          body: body || ""
        },
        data: {
          title: title || "",
          body: body || "",
          toastMessage: body || "",
          logoUrl: LOGO_URL
        },
        android: {
          priority: "high",
        },
        webpush: { notification: { title: title, body: body, icon: LOGO_URL, badge: LOGO_URL } }
      };

      const MAX_TOKENS_PER_BATCH = 500;
      let successCount = 0;

      for (let i = 0; i < allTokens.length; i += MAX_TOKENS_PER_BATCH) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: allTokens.slice(i, i + MAX_TOKENS_PER_BATCH),
          notification: payload.notification,
          data: payload.data,
          android: payload.android,
          webpush: payload.webpush
        });
        successCount += response.successCount;
      }

      return res.status(200).send({ data: { success: true, delivered: successCount }});
    } catch (error) {
      console.error("Error broadcasting push notification:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

exports.sendBulkPushNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetUids, title, body } = req.body.data;

      if (!targetUids || !Array.isArray(targetUids) || targetUids.length === 0) {
        return res.status(400).send({ data: { success: false, message: "No target UIDs provided." }});
      }

      const userPromises = targetUids.map(uid => admin.firestore().collection("users").doc(uid).get());
      const userDocs = await Promise.all(userPromises);

      let allTokens = [];
      userDocs.forEach(doc => {
        if (doc.exists) {
          const userData = doc.data();
          if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            allTokens.push(...userData.fcmTokens);
          }
        }
      });

      allTokens = [...new Set(allTokens)];
      if (allTokens.length === 0) {
        return res.status(200).send({ data: { success: false, message: "No registered devices found." }});
      }

      // 🚀 UPDATED PAYLOAD: Added 'notification' block and 'toastMessage' for frontend toasts
      const payload = {
        notification: {
          title: title || "",
          body: body || ""
        },
        data: {
          title: title || "",
          body: body || "",
          toastMessage: body || "",
          logoUrl: LOGO_URL
        },
        android: {
          priority: "high",
        },
        webpush: { notification: { title: title, body: body, icon: LOGO_URL, badge: LOGO_URL } }
      };

      let successCount = 0;
      for (let i = 0; i < allTokens.length; i += 500) {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: allTokens.slice(i, i + 500),
          notification: payload.notification,
          data: payload.data,
          android: payload.android,
          webpush: payload.webpush
        });
        successCount += response.successCount;
      }

      return res.status(200).send({ data: { success: true, delivered: successCount }});
    } catch (error) {
      console.error("Error sending bulk push notification:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

// ============================================================================
// AUTOMATED CRON JOBS (V2 SYNTAX)
// ============================================================================

const getISTDateString = (offsetDays = 0) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(dt);
};

const getISTMonthString = (offsetMonths = 0) => {
  const dt = new Date();
  dt.setMonth(dt.getMonth() - offsetMonths);
  return dt.toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' });
};

const sendNotificationToUids = async (uids, title, body) => {
  if (!uids || uids.length === 0) return;
  const uniqueUids = [...new Set(uids)];
  
  const userPromises = uniqueUids.map(uid => admin.firestore().collection("users").doc(uid).get());
  const userDocs = await Promise.all(userPromises);
  
  let tokens = [];
  userDocs.forEach(doc => {
    if (doc.exists && doc.data().fcmTokens) {
      tokens.push(...doc.data().fcmTokens);
    }
  });

  if (tokens.length > 0) {
    // 🚀 UPDATED PAYLOAD: Added 'notification' block and 'toastMessage' for frontend toasts
    const payload = { 
      notification: {
        title: title || "",
        body: body || ""
      },
      data: {
        title: title || "",
        body: body || "",
        toastMessage: body || "",
        logoUrl: LOGO_URL
      },
      android: {
        priority: "high",
      },
      webpush: { notification: { title: title, body: body, icon: LOGO_URL, badge: LOGO_URL } } 
    };
    
    for (let i = 0; i < tokens.length; i += 500) {
      await admin.messaging().sendEachForMulticast({
        tokens: tokens.slice(i, i + 500),
        notification: payload.notification,
        data: payload.data,
        android: payload.android,
        webpush: payload.webpush
      });
    }
  }
};

// 1. HOLIDAY REMINDER
exports.dailyHolidayReminder = onSchedule({
  schedule: "0 8 * * *",
  timeZone: "Asia/Kolkata"
}, async (event) => {
    const tomorrowStr = getISTDateString(1);
    const sessionSnap = await admin.firestore().collection('academicSessions').where('isActive', '==', true).get();
    if (sessionSnap.empty) return;

    const sessionData = sessionSnap.docs[0].data();
    const holidays = sessionData.holidays || [];
    const tomorrowHoliday = holidays.find(h => h.startDate === tomorrowStr);
    
    if (tomorrowHoliday) {
      const usersSnap = await admin.firestore().collection('users').where('status', '==', 'Active').get();
      const uids = usersSnap.docs.map(doc => doc.id);
      await sendNotificationToUids(uids, "Holiday Alert! 🌴", `Reminder: The school will be closed tomorrow for ${tomorrowHoliday.name}.`);
    }
});

// 2. PRE-DUE FEE REMINDERS
exports.preDueFeeReminder = onSchedule({
  schedule: "0 8 1,3,5 * *",
  timeZone: "Asia/Kolkata"
}, async (event) => {
    const currentMonthStr = getISTMonthString(0);
    const sessionSnap = await admin.firestore().collection('academicSessions').where('isActive', '==', true).get();
    if (sessionSnap.empty) return;
    
    const classes = sessionSnap.docs[0].data().classes || [];
    let unpaidUids = [];

    classes.forEach(cls => {
      (cls.students || []).forEach(student => {
        const feeHistory = student.feeHistory || [];
        const hasPaidCurrentMonth = feeHistory.some(fee => fee.month === currentMonthStr);
        if (!hasPaidCurrentMonth && (student.uid || student.id)) unpaidUids.push(student.uid || student.id);
      });
    });

    await sendNotificationToUids(unpaidUids, "Fee Reminder 📅", `Gentle Reminder: Please clear your tuition fees for ${currentMonthStr} by the 7th of this month.`);
});

// 3. OVERDUE FEE REMINDERS
exports.overdueFeeReminder = onSchedule({
  schedule: "0 8 8-31 * *",
  timeZone: "Asia/Kolkata"
}, async (event) => {
    const currentMonthStr = getISTMonthString(0);
    const sessionSnap = await admin.firestore().collection('academicSessions').where('isActive', '==', true).get();
    if (sessionSnap.empty) return;
    
    const classes = sessionSnap.docs[0].data().classes || [];
    let unpaidUids = [];

    classes.forEach(cls => {
      (cls.students || []).forEach(student => {
        const feeHistory = student.feeHistory || [];
        const hasPaidCurrentMonth = feeHistory.some(fee => fee.month === currentMonthStr);
        if (!hasPaidCurrentMonth && (student.uid || student.id)) unpaidUids.push(student.uid || student.id);
      });
    });

    await sendNotificationToUids(unpaidUids, "Overdue Fee Alert ⚠️", `Urgent: Your tuition fees for ${currentMonthStr} are now overdue. Please clear them immediately.`);
});

// 4. AUTO-DEACTIVATION
exports.autoDeactivateStudents = onSchedule({
  schedule: "0 8 * * *",
  timeZone: "Asia/Kolkata"
}, async (event) => {
    const sessionSnap = await admin.firestore().collection('academicSessions').where('isActive', '==', true).get();
    if (sessionSnap.empty) return;
    
    const classes = sessionSnap.docs[0].data().classes || [];
    const prevMonth1 = getISTMonthString(1); 
    const prevMonth2 = getISTMonthString(2);
    let deactivatedUids = [];

    for (const cls of classes) {
      for (const student of (cls.students || [])) {
        const uid = student.uid || student.id;
        if (!uid) continue;

        let shouldDeactivate = false;
        let reason = "";

        const feeHistory = student.feeHistory || [];
        const paidPrev1 = feeHistory.some(f => f.month === prevMonth1);
        const paidPrev2 = feeHistory.some(f => f.month === prevMonth2);

        if (!paidPrev1 && !paidPrev2) {
          shouldDeactivate = true;
          reason = `Unpaid fees for ${prevMonth2} and ${prevMonth1}`;
        }

        if (!shouldDeactivate && student.attendance) {
          const attendanceDates = Object.keys(student.attendance).sort();
          if (attendanceDates.length >= 16) {
            const last16Dates = attendanceDates.slice(-16);
            const consecutiveAbsences = last16Dates.every(date => student.attendance[date] === "Absent");
            if (consecutiveAbsences) {
              shouldDeactivate = true;
              reason = "Absent for more than 15 consecutive working days";
            }
          }
        }

        if (shouldDeactivate) {
          await admin.firestore().collection('users').doc(uid).update({
            status: 'Inactive',
            deactivationReason: reason,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          deactivatedUids.push(uid);
        }
      }
    }

    if (deactivatedUids.length > 0) {
      await sendNotificationToUids(deactivatedUids, "Account Suspended 🚫", "Your portal access has been deactivated due to consecutive absences or overdue fees.");
    }
});
// ============================================================================
// GOOGLE WORKSPACE ADMIN INTEGRATION
// ============================================================================
const { google } = require('googleapis');
const path = require('path');

// 1. Setup Google Auth
// This points to the credentials.json file you placed in the functions folder
const keyFilePath = path.join(__dirname, 'credentials.json');

const googleAuth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
  // ⚠️ CRITICAL: Replace this with your actual Google Workspace Admin email address
  clientOptions: { subject: 'admin@vivekanandachildsmission.org.in' } 
});

const directoryAdmin = google.admin({ version: 'directory_v1', auth: googleAuth });

// 2. HTTP Function to Create a Workspace User
exports.createWorkspaceUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      // Extract data sent from your React frontend
      const { firstName, lastName, userEmail, userPassword } = req.body.data;

      if (!firstName || !lastName || !userEmail || !userPassword) {
        return res.status(400).send({ data: { success: false, message: "Missing required fields." }});
      }

      // Call Google API to create the user
      const response = await directoryAdmin.users.insert({
        requestBody: {
          primaryEmail: userEmail,
          name: {
            givenName: firstName,
            familyName: lastName,
          },
          password: userPassword,
        },
      });

      return res.status(200).send({ data: { success: true, email: response.data.primaryEmail }});
      
    } catch (error) {
      console.error("Error creating Workspace user:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

// 3. HTTP Function to Delete a Workspace User
exports.deleteWorkspaceUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { userEmail } = req.body.data;

      if (!userEmail) {
        return res.status(400).send({ data: { success: false, message: "Missing user email." }});
      }

      // Call Google API to delete the user
      await directoryAdmin.users.delete({
        userKey: userEmail,
      });

      return res.status(200).send({ data: { success: true, message: `Successfully deleted ${userEmail}` }});
      
    } catch (error) {
      console.error("Error deleting Workspace user:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

// 4. HTTP Function to Delete a Firebase Auth User
exports.deleteFirebaseAuthUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetUid } = req.body.data;

      if (!targetUid) {
        return res.status(400).send({ data: { success: false, message: "Missing target UID." }});
      }

      // Call Firebase Admin SDK to completely delete the authentication user
      await admin.auth().deleteUser(targetUid);

      return res.status(200).send({ data: { success: true, message: `Successfully deleted auth user ${targetUid}` }});
      
    } catch (error) {
      console.error("Error deleting Firebase Auth user:", error);
      // If the user is already deleted, we don't want to throw a fatal error
      if (error.code === 'auth/user-not-found') {
        return res.status(200).send({ data: { success: true, message: "User was already deleted from Auth." }});
      }
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

// 5. HTTP Function to Create a Phone Auth User with a Specific UID
exports.createPhoneAuthUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetUid, phoneNumber } = req.body.data;

      if (!targetUid || !phoneNumber) {
        return res.status(400).send({ data: { success: false, message: "Missing uid or phone number." }});
      }

      // Force Firebase to create the user with YOUR exact custom ID
      const userRecord = await admin.auth().createUser({
        uid: targetUid,
        phoneNumber: phoneNumber
      });

      return res.status(200).send({ data: { success: true, uid: userRecord.uid }});
      
    } catch (error) {
      console.error("Error creating phone user:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});

// 6. HTTP Function to Update a Phone Auth User's Mobile Number
exports.updatePhoneAuthUser = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetUid, newPhoneNumber } = req.body.data;

      if (!targetUid || !newPhoneNumber) {
        return res.status(400).send({ data: { success: false, message: "Missing uid or phone number." }});
      }

      await admin.auth().updateUser(targetUid, {
        phoneNumber: newPhoneNumber
      });

      return res.status(200).send({ data: { success: true }});
      
    } catch (error) {
      console.error("Error updating phone user:", error);
      return res.status(500).send({ data: { success: false, message: error.message }});
    }
  });
});