import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, User, GraduationCap, Calendar, Loader2, 
  Activity, ArrowRight, BookOpen, Clock, Video, Bell, FileText, CheckCircle2, Megaphone,
  Image as ImageIcon, PlayCircle // <-- ADD THESE TWO
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

const StudentDashboard = () => {
  const { user, loading: userLoading } = useStudentUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
	const [dashboardData, setDashboardData] = useState({
		attendancePercentage: 0,
		currentClassName: 'N/A', 
		todaysRoutine: [],
		upcomingOnlineClasses: [],
		recentNotices: [],
		recentGallery: [] // <-- ADD THIS
	  });

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const todayDate = new Date();
        const todayStr = todayDate.toISOString().split('T')[0];
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(todayDate);

        // 1. Calculate Actual Attendance Percentage
        let presentCount = 0;
        let totalMarked = 0;
        if (user.attendance) {
          Object.values(user.attendance).forEach(entry => {
            const status = typeof entry === 'string' ? entry : entry.status;
            if (status === 'Present' || status === 'Absent') {
              totalMarked++;
              if (status === 'Present') presentCount++;
            }
          });
        }
        const attendancePercentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

        // 2. Fetch Active Session Data & Dynamically Find Student's Class
        let todaysRoutine = [];
        let upcomingOnlineClasses = [];
        let fetchedClassName = 'N/A';
        
        const sessionQ = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQ);
        
        if (!sessionSnap.empty) {
          const sessionData = sessionSnap.docs[0].data();
          
          const myClass = (sessionData.classes || []).find(c => 
            (c.students || []).some(s => s.uid === user.uid)
          );
          
          if (myClass) {
            fetchedClassName = myClass.name; 

            todaysRoutine = (myClass.routine || [])
              .filter(r => r.day === dayOfWeek)
              .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

            upcomingOnlineClasses = (myClass.onlineClasses || [])
              .filter(oc => oc.date >= todayStr)
              .sort((a, b) => new Date(a.date) - new Date(b.date));
          }
        }

        // 3. Fetch Recent Notices
        let recentNotices = [];
        try {
          const noticeQ = query(collection(db, 'generalNotices'), orderBy('date', 'desc'), limit(3));
          const noticeSnap = await getDocs(noticeQ);
          recentNotices = noticeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (noticeErr) {
          const noticeSnap = await getDocs(collection(db, 'generalNotices'));
          const notices = noticeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          notices.sort((a, b) => new Date(b.date) - new Date(a.date));
          recentNotices = notices.slice(0, 3);
        }

		// 4. Fetch Recent Gallery Items
        let recentGalleryItems = [];
        try {
          const gallerySnap = await getDocs(collection(db, 'website_gallery'));
          let items = gallerySnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sort by newest first, then grab the top 5
          items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
          recentGalleryItems = items.slice(0, 5);
        } catch (error) {
          console.error("Error fetching gallery for dashboard:", error);
        }

        setDashboardData({
          attendancePercentage,
          currentClassName: fetchedClassName, 
          todaysRoutine,
          upcomingOnlineClasses,
          recentNotices,
          recentGallery: recentGalleryItems // <-- ADD THIS
        });

      } catch (error) {
        console.error("Error fetching student dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (userLoading || loading) {
    return (
      <StudentDashboardLayout>
        <div className="h-full flex flex-col items-center justify-center text-emerald-600 gap-4 min-h-[60vh]">
          <Loader2 className="animate-spin" size={40} />
          <div className="text-center">
            <p className="font-bold tracking-widest text-sm uppercase">Loading Dashboard...</p>
            <p className="text-[10px] font-medium opacity-70">ড্যাশবোর্ড লোড হচ্ছে... / डैशबोर्ड लोड हो रहा है...</p>
          </div>
        </div>
      </StudentDashboardLayout>
    );
  }

  const quickActions = [
    { title: 'Class Diary', sub: 'ক্লাস ডায়েরি / कक्षा डायरी', icon: <BookOpen size={24} />, color: 'bg-emerald-500', path: '/student/diary' },
    { title: 'My Routine', sub: 'আমার রুটিন / मेरी दिनचर्या', icon: <Calendar size={24} />, color: 'bg-teal-500', path: '/student/routine' },
    { title: 'Live Classes', sub: 'লাইভ ক্লাস / लाइव क्लास', icon: <Video size={24} />, color: 'bg-blue-500', path: '/student/online-class' },
    { title: 'Check Results', sub: 'ফলাফল দেখুন / परिणाम देखें', icon: <FileText size={24} />, color: 'bg-orange-500', path: '/student/results' },
  ];

  // Extracted Notice Board content to reuse for mobile and desktop views
  const noticeBoardContent = (
    <>
      <div className="flex flex-col mb-6">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Megaphone className="text-orange-500" size={20}/> Notice Board
        </h2>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-7">নোটিশ বোর্ড / सूचना पट्ट</p>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
        {dashboardData.recentNotices.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl">
            <Bell className="text-gray-300 mb-2" size={32} />
            <p className="text-xs font-bold text-gray-400">No announcements. / কোনো নোটিশ নেই।</p>
          </div>
        ) : (
          dashboardData.recentNotices.map((notice, idx) => (
            <div key={notice.id || idx} className="p-4 rounded-2xl bg-gray-50 hover:bg-emerald-50/50 border border-gray-100 hover:border-emerald-100 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border 
                  ${notice.type === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' : 
                    notice.type === 'Holiday' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    'bg-teal-50 text-teal-600 border-teal-100'}`}
                >
                  {notice.type || 'General'}
                </span>
                <span className="text-[10px] font-bold text-gray-400">
                  {new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight group-hover:text-emerald-700 transition-colors">
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
    <StudentDashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans p-4 lg:p-6">
        
        {/* --- WELCOME BANNER --- */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-[2rem] p-8 md:p-10 shadow-xl text-white relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-emerald-200 font-bold uppercase tracking-widest text-xs mb-1 flex items-center gap-2">
                <Activity size={14} /> Student Portal / ছাত্র পোর্টাল / छात्र पोर्टल
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                Hello, {user?.name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="text-emerald-100 font-medium text-sm md:text-base opacity-90">
                সুপ্রভাত, আপনার পড়াশোনার পোর্টালে স্বাগতম। / नमस्ते, आपके शिक्षण केंद्र में आपका स्वागत है।
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <Calendar className="text-emerald-200" size={24} />
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">Today / আজ / आज</p>
                <p className="font-bold text-lg leading-tight">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- MOBILE NOTICE BOARD (Visible only on small screens) --- */}
        <div className="lg:hidden bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col">
          {noticeBoardContent}
        </div>

        {/* --- KEY STATISTICS GRID --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Current Class" sub="বর্তমান শ্রেণী / वर्तमान कक्षा" value={dashboardData.currentClassName} icon={<GraduationCap />} color="text-teal-700" bg="bg-teal-100" />
          <StatCard label="Attendance" sub="উপস্থিতি / उपस्थिति" value={`${dashboardData.attendancePercentage}%`} icon={<CheckCircle2 />} color="text-emerald-600" bg="bg-emerald-100" />
          <StatCard label="Classes Today" sub="আজকের ক্লাস / आज की कक्षाएं" value={dashboardData.todaysRoutine.length} icon={<Clock />} color="text-blue-600" bg="bg-blue-100" />
          <StatCard label="Live Sessions" sub="লাইভ সেশন / लाइव सत्र" value={dashboardData.upcomingOnlineClasses.length} icon={<Video />} color="text-orange-600" bg="bg-orange-100" />
        </div>

        {/* --- MAIN DASHBOARD CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery Carousel */}
            {dashboardData.recentGallery.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-tight">
                      <ImageIcon className="text-purple-500" size={24} /> Gallery Snippets
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-8">বিদ্যালয়ের গ্যালারি / स्कूल गैलरी</p>
                  </div>
                  <button 
                    onClick={() => navigate('/student/gallery')} 
                    className="text-xs font-bold text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 px-4 py-2 rounded-xl transition-colors"
                  >
                    View All
                  </button>
                </div>
                
                <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                  {dashboardData.recentGallery.map((item, idx) => (
                    <div 
                      key={item.id} 
                      onClick={() => navigate('/student/gallery')}
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
                <h2 className="text-xl font-black text-gray-800 leading-tight">Quick Links</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">দ্রুত লিঙ্ক / त्वरित लिंक</p>
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
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{action.title}</h3>
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5 truncate uppercase">{action.sub}</p>
                    </div>
                    <ArrowRight className="text-gray-300 group-hover:text-emerald-500 transition-colors" size={20} />
                  </button>
                ))}
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-emerald-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-md">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800 leading-tight">Today's Timetable</h2>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">আজকের সময়সূচী / आज की समय सारिणी</p>
                  </div>
                </div>
              </div>
              
              {dashboardData.todaysRoutine.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Clock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-bold mb-1">No classes scheduled for today.</p>
                  <p className="text-[10px] text-gray-400 font-medium">আজ কোনো ক্লাস নেই। / आज कोई कक्षा निर्धारित नहीं है।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    // 1. Group periods by start and end time
                    const groupedRoutine = dashboardData.todaysRoutine.reduce((acc, period) => {
                      const timeKey = `${period.startTime}-${period.endTime}`;
                      if (!acc[timeKey]) acc[timeKey] = [];
                      acc[timeKey].push(period);
                      return acc;
                    }, {});

                    // 2. Map through the grouped periods
                    return Object.values(groupedRoutine).map((group, gIdx) => {
                      const { startTime, endTime } = group[0];
                      const isSplit = group.length > 1;

                      return (
                        <div key={gIdx} className="flex flex-col sm:flex-row items-stretch gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group/card">
                          
                          {/* Time Block (Rendered once) */}
                          <div className="flex flex-col items-center justify-center min-w-[80px] px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 self-start">
                            <span className="text-sm font-black">{startTime}</span>
                            <span className="text-[8px] font-bold uppercase tracking-widest opacity-70">থেকে / से</span>
                            <span className="text-[9px] font-black">{endTime}</span>
                          </div>

                          {/* Subjects Block */}
                          <div className="flex-1 flex flex-col gap-2 justify-center">
                            {group.map((period, pIdx) => (
                              <div key={pIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSplit ? 'bg-emerald-50/40 p-3 rounded-xl border border-emerald-50' : ''}`}>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-gray-800 text-lg group-hover/card:text-emerald-700 transition-colors leading-tight">
                                      {period.subjectName}
                                    </h4>
                                    {isSplit && (
                                      <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest">
                                        Split
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-1">
                                    <User size={12} className="text-gray-400" /> {period.teacherName || 'No Teacher'}
                                  </p>
                                </div>

                                <button 
                                  onClick={() => navigate('/student/diary')}
                                  className="hidden sm:flex flex-col items-center justify-center text-[10px] font-bold text-emerald-600 hover:text-white hover:bg-emerald-600 px-4 py-2 rounded-lg border border-emerald-200 transition-colors shrink-0"
                                >
                                  <span>View Diary</span>
                                  <span className="text-[8px] opacity-70">ডায়েরি / डायरी</span>
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

          <div className="space-y-6 flex flex-col">
            
            {/* Upcoming Live Classes (Mini) */}
            {dashboardData.upcomingOnlineClasses.length > 0 && (
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-blue-100 bg-gradient-to-b from-blue-50 to-white">
                <div className="flex flex-col mb-4">
                  <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <Video className="text-blue-500" size={20}/> Live Classes
                  </h2>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest ml-7">লাইভ ক্লাস / लाइव क्लास</p>
                </div>
                <div className="space-y-3">
                  {dashboardData.upcomingOnlineClasses.slice(0, 2).map((cls, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                       <p className="font-bold text-gray-800 text-sm truncate">{cls.title}</p>
                       <div className="flex justify-between items-center mt-2">
                         <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                           {new Date(cls.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                         </span>
                         <button onClick={() => navigate('/student/online-class')} className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">
                           Join / যোগ দিন
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- DESKTOP NOTICE BOARD (Hidden on small screens) --- */}
            <div className="hidden lg:flex bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex-1 flex-col">
              {noticeBoardContent}
            </div>
            
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

// Custom Stat Card Component with Sublabels
const StatCard = ({ label, sub, value, icon, color, bg }) => (
  <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-3 md:gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
    <div className={`h-11 w-11 md:h-14 md:w-14 shrink-0 ${bg} ${color} rounded-2xl flex items-center justify-center shadow-inner`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
    </div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight truncate">{label}</p>
      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate opacity-80">{sub}</p>
      <p className="text-xl md:text-2xl font-black text-gray-800 mt-1 tracking-tight">{value}</p>
    </div>
  </div>
);

export default StudentDashboard;