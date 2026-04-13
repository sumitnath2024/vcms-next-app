import React, { useState, useEffect } from 'react';
import { Video, MonitorPlay, ExternalLink, Clock, Calendar, Users, Loader2, Radio } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useStudentUser } from '../../context/StudentUserContext';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';

const StudentOnlineClass = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [studentClass, setStudentClass] = useState('');
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [pastClasses, setPastClasses] = useState([]);

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
          let myClassName = '';
          let myClassData = null;

          if (sessionData.classes && Array.isArray(sessionData.classes)) {
            for (let cls of sessionData.classes) {
              if (cls.students && Array.isArray(cls.students)) {
                const foundMe = cls.students.find(s => s.uid === userId || s.id === userId);
                if (foundMe) {
                  myClassName = cls.name;
                  myClassData = cls;
                  break; 
                }
              }
            }
          }

          setStudentClass(myClassName);

          if (myClassData && myClassData.onlineClasses) {
            const todayStr = new Date().toISOString().split('T')[0];
            const upcoming = [];
            const past = [];

            myClassData.onlineClasses.forEach(oc => {
              if (oc.date >= todayStr) {
                upcoming.push(oc);
              } else {
                past.push(oc);
              }
            });

            upcoming.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
            past.sort((a, b) => new Date(b.date) - new Date(a.date));

            setUpcomingClasses(upcoming);
            setPastClasses(past);
          }
        }
      } catch (error) {
        console.error("Error fetching online classes:", error);
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

    if (date > todayStr) return { type: 'FUTURE', label: 'Scheduled', sub: 'নির্ধারিত / निर्धारित', color: 'blue' };
    
    if (date === todayStr) {
      if (currentTimeStr < startTime) return { type: 'SOON', label: 'Starting Soon', sub: 'শীঘ্রই শুরু হবে / जल्द शुरू होगा', color: 'amber' };
      if (currentTimeStr >= startTime && currentTimeStr <= endTime) return { type: 'LIVE', label: 'Live Now', sub: 'এখন লাইভ / अभी लाइव', color: 'emerald' };
      return { type: 'DONE', label: 'Ended', sub: 'শেষ হয়েছে / समाप्त', color: 'gray' };
    }

    return { type: 'PAST', label: 'Past', sub: 'অতীত / अतीत', color: 'gray' };
  };

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6 pb-20 font-sans">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600 shadow-inner">
              <Video size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight leading-none">Virtual Classroom</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ভার্চুয়াল ক্লাসরুম / वर्चुअल क्लासरूम</p>
              <p className="text-xs font-bold text-emerald-600 mt-2">Join live sessions and interact with teachers</p>
            </div>
          </div>
          {studentClass && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Authenticated Class</span>
              <span className="text-[8px] font-bold text-gray-300 uppercase mb-1">অনুমোদিত শ্রেণী / प्रमाणित कक्षा</span>
              <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 font-black rounded-xl text-sm border border-emerald-100 shadow-sm">
                {studentClass}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-800 font-black tracking-widest text-sm uppercase">SYNCING CLASSROOM...</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">লোড হচ্ছে / लोड हो रहा है</p>
          </div>
        ) : !studentClass ? (
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
            <MonitorPlay className="text-gray-200 mb-4" size={60} />
            <h3 className="text-xl font-black text-gray-700 leading-none">Unlinked Profile</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-4">প্রোফাইল লিঙ্ক করা নেই / अनलिंक्ड प्रोफाइल</p>
            <p className="text-gray-500 font-medium">We couldn't find you in the active session roster.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-6">
              
              <div className="flex flex-col mb-4">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                    <Calendar size={22} className="text-emerald-600"/> Session Schedule
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-8">ক্লাসের সময়সূচী / सत्र अनुसूची</p>
              </div>

              {upcomingClasses.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center justify-center p-16 text-center shadow-sm">
                    <div className="bg-emerald-50 p-6 rounded-full mb-6">
                        <MonitorPlay className="text-emerald-200" size={50} />
                    </div>
                    <h3 className="text-lg font-black text-gray-700">No Sessions Found</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">কোনো লাইভ ক্লাস নেই / कोई सत्र नहीं मिला</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingClasses.map((cls, idx) => {
                    const status = getMeetingStatus(cls.date, cls.time, cls.endTime);
                    const isLive = status.type === 'LIVE';
                    const isSoon = status.type === 'SOON';
                    
                    return (
                      <div key={idx} className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm transition-all duration-300 border-b-4 ${isLive ? 'border-emerald-500 ring-4 ring-emerald-50 shadow-lg' : 'border-gray-200'}`}>
                        {/* Status Bar */}
                        <div className={`px-6 py-3 border-b flex justify-between items-center ${isLive ? 'bg-emerald-500 text-white' : isSoon ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center gap-3">
                            {isLive && (
                                <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full border border-white/30">
                                    <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
                                    <span className="text-[10px] font-black uppercase">Live Now</span>
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isLive ? 'text-white' : `text-${status.color}-700`}`}>
                                {isLive ? '' : status.label}
                                </span>
                                <span className={`text-[8px] font-bold uppercase ${isLive ? 'text-white/80' : 'text-gray-400'}`}>
                                    {status.sub}
                                </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-[10px] font-black ${isLive ? 'text-white' : 'text-gray-800'} uppercase leading-none`}>
                                {new Date(cls.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={`text-[9px] font-bold mt-1 ${isLive ? 'text-emerald-50' : 'text-gray-500'} uppercase`}>
                                {formatTimeAMPM(cls.time)} - {formatTimeAMPM(cls.endTime)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                          <div className="flex-1">
                            <h3 className="font-black text-gray-800 text-xl mb-2 leading-tight">{cls.title}</h3>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                <div className="flex flex-col">
                                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                        <Users size={14} className="text-emerald-600"/> {cls.teacherName}
                                    </p>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase ml-5">Teacher / শিক্ষক / शिक्षक</span>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                                        <Clock size={14} className="text-emerald-600"/> Scheduled Time
                                    </p>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase ml-5">সময় / समय</span>
                                </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => window.open(cls.meetingLink, '_blank')}
                            className={`w-full sm:w-auto px-8 py-4 font-black rounded-2xl flex flex-col items-center justify-center gap-0 transition-all active:scale-95 shadow-lg ${isLive ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' : isSoon ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100' : 'bg-white border-2 border-emerald-100 text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            <div className="flex items-center gap-2">
                                <ExternalLink size={18} /> 
                                <span className="uppercase text-sm tracking-tight">
                                    {isLive ? 'Join Now' : isSoon ? 'Join Early' : 'View Link'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold opacity-70 uppercase">
                                {isLive ? 'এখনই যোগ দিন / अभी शामिल हों' : isSoon ? 'আগে যোগ দিন / जल्दी शामिल हों' : 'লিঙ্ক দেখুন / लिंक देखें'}
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
            <div className="md:col-span-1 space-y-8">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm border-t-4 border-t-emerald-600">
                    <div className="flex flex-col mb-6">
                        <h3 className="font-black text-gray-800 flex items-center gap-2 leading-none">
                            <Radio size={18} className="text-emerald-600" /> Classroom Rules
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-7">নিয়মাবলী / नियम</p>
                    </div>
                    
                    <ul className="space-y-4 text-[12px] text-gray-600 font-bold leading-relaxed">
                        <li className="flex gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group hover:border-emerald-200 transition-colors">
                            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs shadow-sm">1</span>
                            <div>
                                <p>Verify your audio and camera settings before joining.</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">যোগদানের আগে আপনার অডিও এবং ক্যামেরা চেক করুন।</p>
                            </div>
                        </li>
                        <li className="flex gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group hover:border-emerald-200 transition-colors">
                            <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs shadow-sm">2</span>
                            <div>
                                <p>Stay on mute unless asked to speak by the teacher.</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-1">শিক্ষক কথা বলতে না বলা পর্যন্ত মাইক মিউট রাখুন।</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {pastClasses.length > 0 && (
                    <div className="bg-emerald-950 p-8 rounded-[2rem] text-white shadow-xl overflow-hidden relative border-l-4 border-l-yellow-400">
                         <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12 text-white">
                            <MonitorPlay size={120} />
                         </div>
                         <div className="relative z-10">
                            <div className="flex flex-col mb-2">
                                <h3 className="font-black text-lg leading-none">Previous Records</h3>
                                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">পূর্ববর্তী রেকর্ড / पिछला रिकॉर्ड</p>
                            </div>
                            <p className="text-[11px] text-emerald-100 mb-6 font-medium leading-relaxed">You have completed {pastClasses.length} sessions in this session.</p>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {pastClasses.slice(0, 3).map((p, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
                                        <p className="text-xs font-black truncate group-hover:text-yellow-400 transition-colors">{p.title}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-[9px] opacity-60 font-bold">{p.date}</p>
                                            <span className="text-[8px] bg-emerald-800 text-emerald-300 px-1.5 py-0.5 rounded uppercase">Recorded</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                         </div>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentOnlineClass;