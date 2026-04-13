import React, { useState, useEffect } from 'react';
import { Video, MonitorPlay, ExternalLink, Clock, Calendar, Users, Loader2, Radio, Sparkles } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useStudentUser } from '../../context/StudentUserContext';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

const StudentOnlineClass = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [studentClass, setStudentClass] = useState('');
  const [upcomingClasses, setUpcomingClasses] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) return; 

    const fetchStudentClasses = async () => {
      setLoading(true);
      try {
        const activeSessionQuery = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const querySnapshot = await getDocs(activeSessionQuery);

        if (!querySnapshot.empty) {
          const sessionData = querySnapshot.docs[0].data();
          let myClassData = null;

          if (sessionData.classes && Array.isArray(sessionData.classes)) {
            for (let cls of sessionData.classes) {
              if (cls.students && cls.students.find(s => s.uid === userId || s.id === userId)) {
                myClassData = cls;
                break; 
              }
            }
          }

          setStudentClass(myClassData?.name || '');

          if (myClassData && myClassData.onlineClasses) {
            const todayStr = new Date().toISOString().split('T')[0];
            const upcoming = myClassData.onlineClasses.filter(oc => oc.date >= todayStr);
            setUpcomingClasses(upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)));
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentClasses();
  }, [user]);

  const getMeetingStatus = (date, startTime, endTime) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    if (date > todayStr) return { type: 'FUTURE', label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (date === todayStr) {
      if (currentTimeStr < startTime) return { type: 'SOON', label: 'Starting Soon', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      if (currentTimeStr >= startTime && currentTimeStr <= endTime) return { type: 'LIVE', label: 'Live Now', color: 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-200 animate-pulse' };
      return { type: 'DONE', label: 'Ended', color: 'bg-gray-100 text-gray-500 border-gray-200' };
    }
    return { type: 'PAST', label: 'Past', color: 'bg-gray-100' };
  };

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // --- NATIVE & EXTERNAL TAB LAUNCHER ---
  const openClassRoom = async (roomName) => {
    const studentName = encodeURIComponent(user?.name || "Student");
    const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${studentName}"&config.prejoinPageEnabled=false`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await AppLauncher.openUrl({ url: jitsiUrl });
      } catch (error) {
        console.error("Failed to launch external app", error);
      }
    } else {
      // Safely opens in a new tab to avoid the 5-minute embed limit
      const link = document.createElement('a');
      link.href = jitsiUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6 pb-20 font-sans">
        
        {/* HEADER */}
        <div className="bg-emerald-950 p-8 rounded-[2rem] shadow-xl flex items-center justify-between gap-6 relative overflow-hidden border-b-8 border-emerald-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-20 rounded-full blur-3xl -mt-10 -mr-10"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-white/10 p-5 rounded-[2rem] text-emerald-300 backdrop-blur-sm border border-white/20">
              <Sparkles size={36} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">Smart Classroom</h1>
              <p className="text-emerald-200 font-medium mt-2">Join your live interactive sessions.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-800 font-black tracking-widest text-sm uppercase">SYNCING CLASSROOM...</p>
          </div>
        ) : !studentClass ? (
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
            <MonitorPlay className="text-gray-200 mb-4" size={60} />
            <h3 className="text-xl font-black text-gray-700">Unlinked Profile</h3>
            <p className="text-gray-500 font-medium mt-2">We couldn't find you in the active session roster.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                 <Calendar size={28} className="text-emerald-600"/> Today's & Upcoming Classes
              </h2>

              {upcomingClasses.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center justify-center p-16 text-center shadow-sm">
                    <div className="bg-emerald-50 p-6 rounded-full mb-6">
                        <MonitorPlay className="text-emerald-200" size={50} />
                    </div>
                    <h3 className="text-xl font-black text-gray-700">No Scheduled Classes</h3>
                    <p className="text-gray-500 font-medium mt-2">Enjoy your free time!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingClasses.map((cls, idx) => {
                    const status = getMeetingStatus(cls.date, cls.time, cls.endTime);
                    const isLive = status.type === 'LIVE';
                    const isSoon = status.type === 'SOON';
                    
                    return (
                      <div key={idx} className={`bg-white rounded-[2rem] border overflow-hidden transition-all duration-300 ${isLive ? 'border-emerald-400 shadow-xl shadow-emerald-100 scale-[1.02]' : 'border-gray-100 shadow-sm'}`}>
                        <div className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                          
                          <div className="flex-1">
                            <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border mb-4 ${status.color}`}>
                                {status.label}
                            </span>
                            <h3 className="font-black text-gray-800 text-2xl mb-4 leading-tight">{cls.title}</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                    <Users size={16} className="text-emerald-600"/>
                                    <span className="text-sm font-bold text-gray-700">{cls.teacherName}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                    <Clock size={16} className="text-emerald-600"/>
                                    <span className="text-sm font-bold text-gray-700">
                                        {new Date(cls.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {formatTimeAMPM(cls.time)}
                                    </span>
                                </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => openClassRoom(cls.roomName)}
                            disabled={status.type === 'DONE' || status.type === 'PAST'}
                            className={`w-full sm:w-auto px-10 py-5 font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${isLive ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : isSoon ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'}`}
                          >
                            <ExternalLink size={20} /> 
                            <span className="uppercase tracking-widest text-sm">
                                {isLive ? 'Enter Class Now' : isSoon ? 'Enter Early' : 'Waiting...'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Side Info */}
            <div className="md:col-span-1 space-y-6">
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm relative overflow-hidden">
                    <Radio size={100} className="text-emerald-500 opacity-5 absolute -bottom-6 -right-6" />
                    <h3 className="font-black text-emerald-900 text-xl mb-6 relative z-10">Classroom Etiquette</h3>
                    <ul className="space-y-4 text-sm text-emerald-800 font-medium relative z-10">
                        <li className="flex gap-4 items-start">
                            <span className="bg-emerald-200 text-emerald-900 h-6 w-6 rounded-full flex items-center justify-center font-black shrink-0">1</span>
                            Allow camera and microphone access when prompted.
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="bg-emerald-200 text-emerald-900 h-6 w-6 rounded-full flex items-center justify-center font-black shrink-0">2</span>
                            Keep your microphone muted while the teacher is explaining on the whiteboard.
                        </li>
                        <li className="flex gap-4 items-start">
                            <span className="bg-emerald-200 text-emerald-900 h-6 w-6 rounded-full flex items-center justify-center font-black shrink-0">3</span>
                            Use the chat feature if you have questions without interrupting.
                        </li>
                    </ul>
                </div>
            </div>
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentOnlineClass;