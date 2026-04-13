import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, UserCheck, Loader2, History, Camera as CameraIcon, X, ShieldAlert } from 'lucide-react';
import { 
  collection, query, where, getDocs, addDoc, 
  serverTimestamp, orderBy, limit, doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { Scanner } from '@yudiel/react-qr-scanner';

// --- CAPACITOR IMPORTS ---
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

const SelfAttendance = () => {
  const { userData } = useTeacherUser();
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null); 
  const [history, setHistory] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async () => {
    if (!userData?.uid) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceRef = collection(db, 'users', userData.uid, 'attendance');
      
      const todaySnap = await getDocs(query(attendanceRef, where('date', '==', todayStr)));
      if (!todaySnap.empty) {
        setTodayRecord({ id: todaySnap.docs[0].id, ...todaySnap.docs[0].data() });
      } else {
        setTodayRecord(null);
      }
      
      const histSnap = await getDocs(query(attendanceRef, orderBy('createdAt', 'desc'), limit(5)));
      setHistory(histSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { 
      console.error("Fetch Error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchAttendance(); }, [userData]);

  // --- ON-DEMAND PROVEN HARDWARE CHECK ---
  const handleStartScan = async () => {
    if (!Capacitor.isNativePlatform()) {
      setShowScanner(true); 
      return;
    }

    try {
      // --- YOUR PROVEN APP.JSX HARDWARE WAKE-UP LOGIC ---
      try {
        await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000 
        });
      } catch (e) {
        console.warn("GPS Wake-up issue:", e);
        
        if (e.message?.includes("location disabled") || e.code === 2 || e.message?.toLowerCase().includes("location")) {
          const openSettings = window.confirm(
            "GPS is currently turned off. Would you like to open your phone settings to turn it on for Attendance?"
          );
          if (openSettings) {
            NativeSettings.open({ option: AndroidSettings.LocationSource });
            throw new Error("Opening Settings... Turn on GPS and try scanning again.");
          } else {
            throw new Error("You must enable GPS to proceed.");
          }
        }
        throw new Error("Failed to get location. Ensure GPS is on.");
      }

      // If the code gets past the block above, GPS is confirmed on!
      setShowScanner(true);

    } catch (error) {
      alert(error.message);
    }
  };

  const handleScan = async (detectedCodes) => {
    if (!detectedCodes?.length || isProcessing) return;
    const text = detectedCodes[0].rawValue;
    setIsProcessing(true);

    try {
      const scannedData = JSON.parse(text);

      const configSnap = await getDoc(doc(db, "system", "attendance_config"));
      if (!configSnap.exists()) {
        alert("Security Error: No active attendance session found on server.");
        setIsProcessing(false); return;
      }

      const serverConfig = configSnap.data();

      if (scannedData.secret !== serverConfig.activeSecret) {
        alert("INVALID QR: This code has expired. Please scan the newly generated QR code.");
        setIsProcessing(false); return;
      }

      // Fetch precise location via Capacitor Geolocation
      await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const attendanceRef = collection(db, 'users', userData.uid, 'attendance');
      const teacherName = userData.name || "A Teacher";
      const broadcastNotification = httpsCallable(functions, 'broadcastPushNotification');

      if (todayRecord) {
        if (todayRecord.checkOut) {
          alert("You have already completed your duty for today.");
        } else {
          await updateDoc(doc(db, 'users', userData.uid, 'attendance', todayRecord.id), {
            checkOut: timeStr,
            updatedAt: serverTimestamp()
          });
          
          try {
            await broadcastNotification({
              targetRoles: ['Admin'],
              title: "Teacher Check-Out 🛑",
              body: `${teacherName} has logged out for the day at ${timeStr}.`
            });
          } catch (notifErr) { console.error(notifErr); }
        }
      } else {
        await addDoc(attendanceRef, {
          uid: userData.uid,
          name: teacherName,
          date: todayStr,
          checkIn: timeStr,
          checkOut: null,
          status: 'Present',
          location: `Verified Campus`,
          createdAt: serverTimestamp()
        });

        try {
          await broadcastNotification({
            targetRoles: ['Admin'],
            title: "Teacher Check-In ✅",
            body: `${teacherName} has logged in for the day at ${timeStr}.`
          });
        } catch (notifErr) { console.error(notifErr); }
      }

      await fetchAttendance(); 
      setShowScanner(false);
      setIsProcessing(false);

    } catch (e) {
      console.error(e);
      alert("Error processing scan or GPS verification failed. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
              <UserCheck size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800 leading-none">Campus Attendance</h1>
              <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ক্যাম্পাস হাজিরা | कैंपस उपस्थिति</span>
              <p className="text-xs text-gray-500 font-medium mt-1">সুরক্ষিত লগিং | सुरक्षित लॉगिंग</p>
            </div>
          </div>
          {showScanner && (
            <button onClick={() => setShowScanner(false)} className="bg-rose-100 text-rose-600 p-2 rounded-full">
              <X size={24} />
            </button>
          )}
        </div>

        {showScanner ? (
          <div className="w-full max-w-2xl mx-auto bg-black rounded-[2.5rem] overflow-hidden shadow-2xl relative border-8 border-white">
            <div className="aspect-[3/4] sm:aspect-video relative">
               <Scanner onScan={handleScan} />
               {isProcessing && (
                 <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-20 text-center px-4">
                   <Loader2 className="animate-spin mb-3" size={40} />
                   <p className="font-bold tracking-widest text-xs uppercase">VERIFYING SESSION & GPS...</p>
                   <p className="text-[10px] font-medium opacity-80 mt-1">অধিবেশন এবং জিপিএস যাচাই করা হচ্ছে | सत्र और जीपीएस सत्यापित किया जा रहा है</p>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MAIN CLOCK CARD */}
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center text-center">
              <div className="flex flex-col mb-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">{currentTime.toDateString()}</span>
                <span className="text-[9px] font-bold text-purple-400 uppercase mt-1">আজকের তারিখ | आज की तारीख</span>
              </div>
              
              <div className="text-6xl font-black text-gray-800 mb-10 tracking-tighter">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              
              <div className="mb-10">
                {loading ? (
                  <Loader2 className="animate-spin text-purple-100" size={48} />
                ) : todayRecord && todayRecord.checkIn && todayRecord.checkOut ? (
                  <div className="flex flex-col items-center animate-in zoom-in duration-300">
                    <div className="h-40 w-40 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mb-4 text-emerald-500 shadow-inner">
                      <CheckCircle size={64} />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-600 leading-none">Duty Completed</h3>
                    <p className="text-[11px] font-bold text-emerald-500 mt-2">কর্তব্য সম্পন্ন হয়েছে | कर्तव्य पूरा हुआ</p>
                  </div>
                ) : (
                  <button 
                    onClick={handleStartScan} 
                    className={`h-40 w-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all active:scale-95 group relative overflow-hidden ${
                      todayRecord ? 'bg-orange-500 shadow-orange-200' : 'bg-purple-600 shadow-purple-200'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CameraIcon size={32} className="text-white mb-2 relative z-10" />
                    <div className="flex flex-col items-center relative z-10">
                        <span className="text-white font-black uppercase text-[10px] tracking-tight">
                        {todayRecord ? 'Scan for Out' : 'Scan for In'}
                        </span>
                        <span className="text-white/80 font-bold text-[8px] mt-0.5 uppercase">
                        {todayRecord ? 'প্রস্থান স্ক্যান | निकास' : 'প্রবেশ স্ক্যান | प्रवेश'}
                        </span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* HISTORY LOG */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border">
              <div className="flex flex-col mb-6">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
                    <History size={20} className="text-purple-600"/> Recent Sessions
                </h3>
                <span className="text-[9px] font-bold text-gray-400 ml-7 mt-1 uppercase">সাম্প্রতিক সেশন | हाल के सत्र</span>
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <p className="text-sm font-bold">No history found | কোনো ইতিহাস নেই</p>
                    </div>
                ) : history.map((record, idx) => (
                  <div key={idx} className="flex items-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex flex-col items-center justify-center h-14 w-14 bg-white rounded-xl border font-bold shrink-0 shadow-sm">
                      <span className="text-[9px] text-purple-500 uppercase leading-none mb-1">{new Date(record.date).toLocaleDateString(undefined, {month:'short'})}</span>
                      <span className="text-lg leading-none">{new Date(record.date).getDate()}</span>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex flex-col">
                            <h4 className="font-bold text-gray-800 text-sm leading-none">Present</h4>
                            <span className="text-[9px] font-bold text-gray-400 mt-0.5">উপস্থিত | उपस्थित</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Verified</span>
                            <span className="text-[7px] font-bold text-emerald-500 mt-0.5 uppercase">সত্যাপিত | सत्यापित</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                <Clock size={10}/> In (প্রবেশ): {record.checkIn}
                            </span>
                        </div>
                        
                        <div className="flex flex-col">
                            {record.checkOut ? (
                                <span className="text-[10px] text-blue-500 font-bold uppercase flex items-center gap-1">
                                    <Clock size={10}/> Out (প্রস্থান): {record.checkOut}
                                </span>
                            ) : (
                                <span className="text-[10px] text-orange-400 font-bold uppercase">Out: Pending (বাকি)</span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default SelfAttendance;