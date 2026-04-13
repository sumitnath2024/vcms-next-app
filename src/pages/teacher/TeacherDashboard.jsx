import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, BookOpen, Users, Bell, Loader2, Calendar, Activity, 
  ArrowRight, Clock, Video, PenTool, CheckSquare, Megaphone,
  Image as ImageIcon, PlayCircle // <-- ADD THESE
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { useTeacherUser } from '../../context/TeacherUserContext';

const TeacherDashboard = () => {
  const { userData, loading: userLoading } = useTeacherUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ classesToday: 0, myStudents: 0, upcomingLive: 0 });
  const [todaysRoutine, setTodaysRoutine] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);
  const [recentGallery, setRecentGallery] = useState([]);

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchDashboardData = async () => {
      try {
        const todayDate = new Date();
        const todayStr = todayDate.toISOString().split('T')[0];
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(todayDate);

        // 1. Fetch Active Session for Routine & Students
        const sessionQ = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQ);
        
        let myStudentsCount = 0;
        let classesToday = [];
        let upcomingLiveCount = 0;

        if (!sessionSnap.empty) {
          const sessionData = sessionSnap.docs[0].data();
          
          (sessionData.classes || []).forEach(cls => {
            if (cls.classTeacherUid === userData.uid) {
              myStudentsCount += (cls.students || []).length;
            }
            
            (cls.routine || []).forEach(r => {
              if (r.teacherName === userData.name && r.day === dayOfWeek) {
                classesToday.push({ ...r, className: cls.name });
              }
            });

            (cls.onlineClasses || []).forEach(oc => {
              if (oc.teacherId === userData.uid && oc.date >= todayStr) {
                upcomingLiveCount++;
              }
            });
          });

          classesToday.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        }

        setStats({
          classesToday: classesToday.length,
          myStudents: myStudentsCount,
          upcomingLive: upcomingLiveCount
        });
        setTodaysRoutine(classesToday);

        // 2. Fetch Recent Notices
        try {
          const noticeQ = query(collection(db, 'generalNotices'), orderBy('date', 'desc'), limit(3));
          const noticeSnap = await getDocs(noticeQ);
          setRecentNotices(noticeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (noticeErr) {
          const noticeSnap = await getDocs(collection(db, 'generalNotices'));
          const notices = noticeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          notices.sort((a, b) => new Date(b.date) - new Date(a.date));
          setRecentNotices(notices.slice(0, 3));
        }
		// 3. Fetch Recent Gallery Items
        try {
          const gallerySnap = await getDocs(collection(db, 'website_gallery'));
          let items = gallerySnap.docs.map(d => ({ id: d.id, ...d.data() }));
          items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          setRecentGallery(items.slice(0, 5));
        } catch (error) {
          console.error("Error fetching gallery:", error);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (userLoading || loading) {
    return (
      <TeacherDashboardLayout>
        <div className="h-full flex flex-col items-center justify-center text-purple-600 gap-4 min-h-[60vh]">
          <Loader2 className="animate-spin" size={40} />
          <div className="text-center">
            <p className="font-bold tracking-widest text-sm uppercase">Loading Dashboard...</p>
            <p className="text-[10px] font-medium opacity-70">ড্যাশবোর্ড লোড হচ্ছে | डैशबोर्ड लोड हो रहा है</p>
          </div>
        </div>
      </TeacherDashboardLayout>
    );
  }

  // Quick Action Configuration with Sub-labels
  const quickActions = [
    { 
        title: 'Mark Attendance', 
        subTitle: 'হাজিরা দিন | उपस्थिति दर्ज करें',
        icon: <CheckSquare size={24} />, 
        color: 'bg-emerald-500', 
        path: '/teacher/studentattendance' 
    },
    { 
        title: 'Write Class Diary', 
        subTitle: 'ডায়েরি লিখুন | डायरी लिखें',
        icon: <PenTool size={24} />, 
        color: 'bg-purple-500', 
        path: '/teacher/classdiary' 
    },
    { 
        title: 'Live Class', 
        subTitle: 'অনলাইন ক্লাস | ऑनलाइन क्लास',
        icon: <Video size={24} />, 
        color: 'bg-blue-500', 
        path: '/teacher/online-class' 
    },
    { 
        title: 'Apply Leave', 
        subTitle: 'ছুটির আবেদন | छुट्टी का आवेदन',
        icon: <Calendar size={24} />, 
        color: 'bg-orange-500', 
        path: '/teacher/leave' 
    },
  ];

  const noticeBoardContent = (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
          <Megaphone className="text-orange-500" size={20}/> Notice Board
        </h2>
        <p className="text-[10px] font-bold text-gray-400 mt-1 ml-7 uppercase">বিজ্ঞপ্তি বোর্ড | सूचना पट्ट</p>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
        {recentNotices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl">
            <Bell className="text-gray-300 mb-2" size={32} />
            <p className="text-sm font-bold text-gray-400">No recent announcements.</p>
            <p className="text-[10px] text-gray-300 mt-1">কোনো ঘোষণা নেই | कोई घोषणा नहीं</p>
          </div>
        ) : (
          recentNotices.map((notice, idx) => (
            <div key={notice.id || idx} className="p-4 rounded-2xl bg-gray-50 hover:bg-purple-50/50 border border-gray-100 hover:border-purple-100 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border 
                  ${notice.type === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' : 
                    notice.type === 'Holiday' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    'bg-purple-50 text-purple-600 border-purple-100'}`}
                >
                  {notice.type || 'General'}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight group-hover:text-purple-700 transition-colors">
                {notice.title}
              </h3>
              <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed">
                {notice.message}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans p-4 lg:p-6">
        
        {/* --- WELCOME BANNER --- */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 rounded-[2rem] p-8 md:p-10 shadow-xl text-white relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-40 w-32 h-32 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex flex-col mb-1">
                <p className="text-purple-200 font-bold uppercase tracking-widest text-xs flex items-center gap-2 leading-none">
                    <Activity size={16} /> Educator Portal
                </p>
                <p className="text-[9px] text-purple-300 font-medium uppercase tracking-widest ml-6 mt-1">শিক্ষাবিদ পোর্টাল | शिक्षक पोर्टल</p>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                Welcome back, {userData?.name?.split(' ')[0] || 'Teacher'}! 👋
              </h1>
              <p className="text-purple-100 font-medium max-w-xl leading-relaxed text-sm md:text-base">
                Have a great day of teaching at Vivekananda Child's Mission. Here is your overview for today.
              </p>
              <p className="text-[11px] text-purple-300 font-bold mt-1">আপনার দিনটি শুভ হোক | आपका दिन शुभ हो</p>
            </div>
            
            <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <Calendar className="text-purple-200" size={24} />
              <div className="text-right">
                <p className="text-[10px] font-bold text-purple-200 uppercase tracking-wider leading-none">Today's Date</p>
                <p className="text-[8px] text-purple-300 font-bold mt-1 mb-1">আজকের তারিখ | आज की तारीख</p>
                <p className="font-bold text-lg leading-none">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- MOBILE NOTICE BOARD --- */}
        <div className="lg:hidden bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col">
          {noticeBoardContent}
        </div>

        {/* --- KEY STATISTICS GRID --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <StatCard 
            label="My Classes Today" 
            subLabel="আজ আমার ক্লাস | आज मेरी कक्षाएं"
            value={stats.classesToday} 
            icon={<BookOpen />} 
            color="text-purple-600" 
            bg="bg-purple-100" 
          />
          <StatCard 
            label="My Class Students" 
            subLabel="আমার ছাত্র | मेरे छात्र"
            value={stats.myStudents || '0'} 
            icon={<Users />} 
            color="text-blue-600" 
            bg="bg-blue-100" 
          />
          <StatCard 
            label="Upcoming Live Sessions" 
            subLabel="আসন্ন লাইভ সেশন | आगामी लाइव सत्र"
            value={stats.upcomingLive} 
            icon={<Video />} 
            color="text-emerald-600" 
            bg="bg-emerald-100" 
          />
        </div>

        {/* --- MAIN DASHBOARD CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery Carousel */}
            {recentGallery.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                      <ImageIcon className="text-purple-500" size={24} /> Gallery Snippets
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-8">বিদ্যালয়ের গ্যালারি | स्कूल गैलरी</p>
                  </div>
                  <button 
                    onClick={() => navigate('/teacher/gallery')} 
                    className="text-xs font-bold text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 px-4 py-2 rounded-xl transition-colors"
                  >
                    View All
                  </button>
                </div>
                
                <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                  {recentGallery.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => navigate('/teacher/gallery')}
                      className="min-w-[200px] h-32 sm:min-w-[240px] sm:h-40 rounded-2xl overflow-hidden relative shadow-sm border border-gray-100 snap-center shrink-0 cursor-pointer group"
                    >
                      {item.type === 'video' ? (
					  <>
						{/* Added #t=0.001 to the URL, plus preload, playsinline, and muted */}
						<video 
						  src={`${item.url}#t=0.001`} 
						  preload="metadata" 
						  playsinline 
						  muted 
						  className="w-full h-full object-cover bg-gray-200" 
						/>
						<div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
						  <PlayCircle className="text-white h-10 w-10 shadow-sm rounded-full opacity-90 group-hover:scale-110 transition-transform" />
						</div>
					  </>
					) : (
					  <img src={item.url} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
					)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quick Actions */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-800 leading-none">Quick Actions</h2>
                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">দ্রুত ব্যবস্থা | त्वरित कार्रवाई</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={() => navigate(action.path)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-lg transition-all duration-300 group bg-gray-50 hover:bg-white text-left"
                  >
                    <div className={`${action.color} text-white p-3.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 leading-tight">{action.title}</h3>
                      <p className="text-[10px] text-purple-600 font-bold mt-1">{action.subTitle}</p>
                    </div>
                    <ArrowRight className="text-gray-300 group-hover:text-purple-500 transition-colors" size={20} />
                  </button>
                ))}
              </div>
            </div>

            {/* Today's Schedule (Grouped logic applied) */}
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg text-white shadow-md">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800 leading-none">Today's Schedule</h2>
                    <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">আজকের সময়সূচী | आज की समय सारणी</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())}
                </span>
              </div>
              
              {todaysRoutine.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Clock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-bold mb-1">No classes scheduled for today.</p>
                  <p className="text-[10px] text-gray-400">আজ কোনো ক্লাস নির্ধারিত নেই | आज कोई कक्षा निर्धारित नहीं है</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // Group periods by start and end time
                    const groupedRoutine = todaysRoutine.reduce((acc, period) => {
                      const timeKey = `${period.startTime}-${period.endTime}`;
                      if (!acc[timeKey]) acc[timeKey] = [];
                      acc[timeKey].push(period);
                      return acc;
                    }, {});

                    return Object.values(groupedRoutine).map((group, gIdx) => {
                      const { startTime, endTime } = group[0];
                      const isSplit = group.length > 1;

                      return (
                        <div key={gIdx} className="flex flex-col sm:flex-row items-stretch gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group/card">
                          
                          {/* Time Block (Rendered once) */}
                          <div className="flex flex-col items-center justify-center min-w-[80px] px-3 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 self-start">
                            <span className="text-sm font-black">{startTime}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">to {endTime}</span>
                          </div>

                          {/* Subjects Block */}
                          <div className="flex-1 flex flex-col gap-2 justify-center">
                            {group.map((period, pIdx) => (
                              <div key={pIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSplit ? 'bg-purple-50/40 p-3 rounded-xl border border-purple-50' : ''}`}>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-gray-800 text-lg group-hover/card:text-purple-700 transition-colors leading-tight">
                                      {period.subjectName}
                                    </h4>
                                    {isSplit && (
                                      <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest">
                                        Split
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-1">
                                    <Users size={12} className="text-gray-400" /> Class {period.className} 
                                    <span className="text-[10px] opacity-70">(ক্লাস {period.className})</span>
                                  </p>
                                </div>

                                <button 
                                  onClick={() => navigate('/teacher/classdiary')}
                                  className="hidden sm:flex flex-col items-center justify-center text-[10px] font-bold text-purple-600 hover:text-white hover:bg-purple-600 px-4 py-2 rounded-lg border border-purple-200 transition-colors shrink-0"
                                >
                                  <span>Add Diary</span>
                                  <span className="text-[8px] font-medium opacity-70">যোগ করুন | जोड़ें</span>
                                </button>
                                
                              </div>
                            ))}
                          </div>
                          
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

          </div>

          {/* --- DESKTOP NOTICE BOARD --- */}
          <div className="hidden lg:flex bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex-col h-full">
            {noticeBoardContent}
          </div>

        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

const StatCard = ({ label, subLabel, value, icon, color, bg }) => (
  <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
    <div className={`h-12 w-12 md:h-14 md:w-14 shrink-0 ${bg} ${color} rounded-2xl flex items-center justify-center shadow-inner`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
    </div>
    <div className="overflow-hidden">
      <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest truncate leading-none">{label}</p>
      <p className="text-[9px] font-bold text-purple-400 uppercase mt-1 leading-none">{subLabel}</p>
      <p className="text-2xl md:text-3xl font-black text-gray-800 mt-1 tracking-tight">{value}</p>
    </div>
  </div>
);

export default TeacherDashboard;