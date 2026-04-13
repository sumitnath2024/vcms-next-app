import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AdminUserProvider } from './context/AdminUserContext'; 
import { TeacherUserProvider } from './context/TeacherUserContext'; 
import { StudentUserProvider } from './context/StudentUserContext'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SplashScreen } from '@capacitor/splash-screen';

// --- CAPACITOR IMPORTS ---
import { App as CapApp } from '@capacitor/app';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import { StatusBar, Style } from '@capacitor/status-bar';

// --- FIREBASE & TOAST IMPORTS ---
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from './firebase'; 
import toast, { Toaster } from 'react-hot-toast';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Admission from './pages/Admission';
import Gallery from './pages/Gallery';
import PrivacyPolicy from './pages/PrivacyPolicy';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'; 
import ManageProfiles from './pages/admin/ManageProfiles'; 
import AddProfile from './pages/admin/AddProfile';
import EditProfile from './pages/admin/EditProfile';
import ViewProfile from './pages/admin/ViewProfile'; 
import AdminCommunication from './pages/admin/AdminCommunication';
import TeacherData from './pages/admin/TeacherData';
import TeacherAttendance from './pages/admin/TeacherAttendance';
import TeacherLeaveRequests from './pages/admin/TeacherLeaveRequests';
import StudentData from './pages/admin/StudentData';
import AdminResult from './pages/admin/AdminResult';
import AdminTeacherClassDiary from './pages/admin/AdminTeacherClassDiary';
import ManageApplications from './pages/admin/ManageApplications';
import ManageGallery from './pages/admin/ManageGallery';
import AdminEnquiries from './pages/admin/AdminEnquiries';
import TeacherQRGenerate from './pages/admin/TeacherQRGenerate';
import MassRegistration from './pages/admin/MassRegistration';
import AdminTeacherAttendance from './pages/admin/AdminTeacherAttendance';
import AdminStudentAttendance from './pages/admin/AdminStudentAttendance';
import CreateSession from './pages/admin/database/CreateSession';
import AssignStudents from './pages/admin/database/AssignStudents';
import FeesCollection from './pages/admin/FeesCollection';
import FeesSummary from './pages/admin/FeesSummary'; 
import ManageContent from './pages/admin/ManageContent';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherProfile from './pages/teacher/TeacherProfile';
import SelfAttendance from './pages/teacher/SelfAttendance';
import StudentAttendance from './pages/teacher/StudentAttendance';
import ClassDiary from './pages/teacher/ClassDiary';
import Remarks from './pages/teacher/Remarks';
import Leave from './pages/teacher/Leave';
import Marks from './pages/teacher/MarksEntry';
import HolidayList from './pages/teacher/HolidayList';   
import AcademicSchedule from './pages/teacher/AcademicSchedule'; 
import BookList from './pages/teacher/BookList';
import OnlineClass from './pages/teacher/OnlineClass';
import TeacherStudentData from './pages/teacher/TeacherStudentData';
import TeacherResult from './pages/teacher/TeacherResult';
import StudyMaterial from './pages/teacher/StudyMaterial';
import TeacherSyllabus from './pages/teacher/TeacherSyllabus';
import PostRemarks from './pages/teacher/PostRemarks';
import TeacherGallery from './pages/teacher/TeacherGallery';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentDiary from './pages/student/StudentDiary'; 
import StudentRoutine from './pages/student/StudentRoutine'; 
import StudentAcademic from './pages/student/StudentAcademic'; 
import Attendance from './pages/student/StudentAttendance'; 
import StudentResults from './pages/student/StudentResults'; 
import StudentFees from './pages/student/StudentFees';
import StudentHolidays from './pages/student/StudentHolidays';
import StudentLeave from './pages/student/StudentLeave'; 
import StudentOnlineClass from './pages/student/StudentOnlineClass';
import StudentStudyMaterial from './pages/student/StudentStudyMaterial';
import StudentGallery from './pages/student/StudentGallery';


function App() {

  // --- CAPACITOR NATIVE HARDWARE LOGIC ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      
      const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else CapApp.exitApp();
      });

      const initAppDesign = async () => {
        try {
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setOverlaysWebView({ overlay: false });
          
          // Add this line to hide the splash screen once the UI is ready!
          await SplashScreen.hide(); 
          
        } catch (e) {
          console.warn("UI Init error:", e);
        }
      };

      const requestHardwareAccess = async () => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        // A. Request Notifications
        try {
          const pushStatus = await PushNotifications.checkPermissions();
          if (pushStatus.receive !== 'granted') {
            await PushNotifications.requestPermissions();
            await delay(500); 
          }

          await PushNotifications.addListener('registration', (token) => {
            console.log("📱 Native FCM Token Generated:", token.value);
            localStorage.setItem('app_fcm_token', token.value);
            window.appFcmToken = token.value;
          });
          await PushNotifications.register();
        } catch (e) { console.warn("Push permission skipped:", e); }

        // B. Request Camera
        try {
          const cameraStatus = await Camera.checkPermissions();
          if (cameraStatus.camera !== 'granted') {
            await Camera.requestPermissions();
            await delay(500);
          }
        } catch (e) { console.warn("Camera permission skipped:", e); }

        // C. Request Location
        try {
          const geoStatus = await Geolocation.checkPermissions();
          if (geoStatus.location !== 'granted') {
             await Geolocation.requestPermissions();
             await delay(500);
          }
        } catch (e) { console.warn("Location permission skipped:", e); }
      };

      initAppDesign();
      requestHardwareAccess();

      return () => {
        backListener.remove();
        PushNotifications.removeAllListeners();
      };
    }
  }, []);

  // --- FIREBASE MESSAGING LOGIC ---
  useEffect(() => {
    try {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("Notification received:", payload);
        if (payload.data && payload.data.toastMessage) {
          toast.success(payload.data.toastMessage, {
            duration: 6000,
            position: 'top-right',
            style: { background: '#065f46', color: '#fff', fontWeight: 'bold' },
            iconTheme: { primary: '#fff', secondary: '#065f46' },
          });
        }
      });
      return () => unsubscribe();
    } catch (error) {
      console.log("Firebase Messaging init error", error);
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId="728229728360-k39immofroc1f5thuu1n7292s2ucrsc0.apps.googleusercontent.com">
      <Toaster />
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans" style={{paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)'}}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />			
            <Route path="/admission" element={<Admission />} />
            <Route path="/gallery" element={<Gallery />} />
			<Route path="/privacy-policy" element={<PrivacyPolicy />} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <AdminUserProvider>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />                
                  <Route path="manage-profiles" element={<ManageProfiles />} />
                  <Route path="add-profile" element={<AddProfile />} />
                  <Route path="edit-profile/:userId" element={<EditProfile />} />
                  <Route path="view-profile/:userId" element={<ViewProfile />} />
                  <Route path="mass-registration" element={<MassRegistration />} />
                  <Route path="manage-admissions" element={<ManageApplications />} />
                  <Route path="enquiries" element={<AdminEnquiries />} /> 
                  <Route path="manage-gallery" element={<ManageGallery />} />
                  <Route path="manage-content" element={<ManageContent />} />
                  <Route path="teacher-qr" element={<TeacherQRGenerate />} />
                  <Route path="db/create-session" element={<CreateSession />} />
                  <Route path="db/assign-students" element={<AssignStudents />} />
                  <Route path="view/teacher-data" element={<TeacherData />} />
                  <Route path="view/teacher-data/:teacherId/attendance" element={<TeacherAttendance />} />
                  <Route path="view/teacher-data/:teacherId/leave-requests" element={<TeacherLeaveRequests />} />
                  <Route path="view/student-data" element={<StudentData />} /> 
                  <Route path="view/teacher-attendance" element={<AdminTeacherAttendance />} />
                  <Route path="view/student-attendance" element={<AdminStudentAttendance />} />
                  <Route path="view/teacher-class-diary" element={<AdminTeacherClassDiary />} />
                  <Route path="result" element={<AdminResult />} />        
                  <Route path="communication" element={<AdminCommunication />} />
                  <Route path="fees-collection" element={<FeesCollection />} />
                  <Route path="fees-summary" element={<FeesSummary />} /> 
                </Routes>
              </AdminUserProvider>
            } />

            {/* Teacher Routes */}
            <Route path="/teacher/*" element={
              <TeacherUserProvider>
                <Routes>
                  <Route path="dashboard" element={<TeacherDashboard />} />
                  <Route path="profile" element={<TeacherProfile />} />
                  <Route path="selfattendance" element={<SelfAttendance />} />
                  <Route path="studentattendance" element={<StudentAttendance />} />
                  <Route path="classdiary" element={<ClassDiary />} />
                  <Route path="study-material" element={<StudyMaterial />} />
                  <Route path="syllabus" element={<TeacherSyllabus />} />
                  <Route path="marks" element={<Marks />} />
                  <Route path="result" element={<TeacherResult />} />
				  <Route path="postremarks" element={<PostRemarks />} />
                  <Route path="remarks" element={<Remarks />} />
                  <Route path="leave" element={<Leave />} />
                  <Route path="holidays" element={<HolidayList />} />
                  <Route path="schedule" element={<AcademicSchedule />} />
                  <Route path="books" element={<BookList />} />
                  <Route path="online-class" element={<OnlineClass />} />
                  <Route path="student-data" element={<TeacherStudentData />} />
				  <Route path="gallery" element={<TeacherGallery />} />
                </Routes>
              </TeacherUserProvider>
            } />

            {/* Student Routes */}
            <Route path="/student/*" element={
              <StudentUserProvider>
                <Routes>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="profile" element={<StudentProfile />} />
                  <Route path="diary" element={<StudentDiary />} />
                  <Route path="routine" element={<StudentRoutine />} />
                  <Route path="academic" element={<StudentAcademic />} />
                  <Route path="study-material" element={<StudentStudyMaterial />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="results" element={<StudentResults />} />
                  <Route path="fees" element={<StudentFees />} />
                  <Route path="holidays" element={<StudentHolidays />} />
                  <Route path="leave" element={<StudentLeave />} />
                  <Route path="online-class" element={<StudentOnlineClass />} />
				  <Route path="gallery" element={<StudentGallery />} />
                </Routes>
              </StudentUserProvider>
            } />
          </Routes>
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;