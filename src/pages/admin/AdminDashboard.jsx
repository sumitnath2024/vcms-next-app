import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserCheck, ShieldAlert, GraduationCap, Loader2, 
  ArrowRight, BookOpen, Coins, Megaphone, Calendar, Activity,
  Clock, Database, Eye
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { useAdminUser } from '../../context/AdminUserContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAdminUser(); 
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, students: 0, teachers: 0, admins: 0 });
  const [activeSession, setActiveSession] = useState(null);
  const [recentNotices, setRecentNotices] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => doc.data());
        
        setStats({
          total: users.length,
          students: users.filter(u => u.role === 'Student').length,
          teachers: users.filter(u => u.role === 'Teacher').length,
          admins: users.filter(u => u.role === 'Admin').length,
        });

        const sessionQ = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQ);
        if (!sessionSnap.empty) {
          setActiveSession(sessionSnap.docs[0].data());
        }

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

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="h-full flex flex-col items-center justify-center text-blue-600 gap-4 min-h-[60vh]">
          <Loader2 className="animate-spin" size={40} />
          <div className="text-center">
            <p className="font-bold tracking-widest text-sm uppercase">Loading Dashboard...</p>
            <p className="text-[10px] font-medium opacity-70">ড্যাশবোর্ড লোড হচ্ছে | डैशबोर्ड लोड हो रहा है</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  const quickActions = [
    { title: 'Add New Profile', subTitle: 'প্রোফাইল যোগ করুন | प्रोफाइल जोड़ें', icon: <Users size={24} />, color: 'bg-blue-500', path: '/admin/manage-profiles' },
    { title: 'Collect Fees', subTitle: 'ফি সংগ্রহ | शुल्क संग्रह', icon: <Coins size={24} />, color: 'bg-emerald-500', path: '/admin/fees-collection' },
    { title: 'Track Attendance', subTitle: 'হাজিরা ট্র্যাকিং | उपस्थिति ट्रैकिंग', icon: <Eye size={24} />, color: 'bg-purple-500', path: '/admin/view/student-attendance' },
    { title: 'Post Notice', subTitle: 'নোটিশ পোস্ট করুন | सूचना पोस्ट करें', icon: <Megaphone size={24} />, color: 'bg-orange-500', path: '/admin/communication' },
  ];

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans">
        
        {/* --- WELCOME BANNER --- */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-[2rem] p-8 md:p-10 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-40 w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex flex-col mb-1">
                <p className="text-blue-200 font-bold uppercase tracking-widest text-xs flex items-center gap-2 leading-none">
                    <Activity size={16} /> System Online
                </p>
                <p className="text-[9px] text-blue-300 font-medium uppercase tracking-widest ml-6 mt-1">সিস্টেম অনলাইন | सिस्टम ऑनलाइन</p>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋
              </h1>
              <p className="text-lg font-medium text-blue-200 mb-3">আপনাকে স্বাগত | आपका स्वागत है</p>
              
              <p className="text-blue-100 font-medium max-w-xl leading-relaxed text-sm md:text-base">
                Daily operations overview for Vivekananda Child's Mission. <br/>
                <span className="opacity-80 text-xs">বিবেকানন্দ চাইল্ডস মিশনের দৈনন্দিন কার্যক্রমের বিবরণ এখানে রয়েছে।</span>
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <Calendar className="text-blue-200" size={24} />
              <div className="text-right">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider leading-none">Today's Date</p>
                <p className="text-[9px] text-blue-300 font-bold mt-1 mb-1">আজকের তারিখ | आज की तारीख</p>
                <p className="font-bold text-lg leading-none">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- KEY STATISTICS GRID --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard label="Total Users" subLabel="মোট ব্যবহারকারী | कुल उपयोगकर्ता" value={stats.total} icon={<Database />} color="text-gray-700" bg="bg-gray-100" />
          <StatCard label="Students" subLabel="ছাত্রছাত্রী | छात्र" value={stats.students} icon={<GraduationCap />} color="text-blue-600" bg="bg-blue-100" />
          <StatCard label="Teaching Staff" subLabel="শিক্ষকবৃন্দ | शिक्षण कर्मचारी" value={stats.teachers} icon={<UserCheck />} color="text-emerald-600" bg="bg-emerald-100" />
          <StatCard label="Administrators" subLabel="প্রশাসক | प्रशासक" value={stats.admins} icon={<ShieldAlert />} color="text-purple-600" bg="bg-purple-100" />
        </div>

        {/* --- MAIN DASHBOARD CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
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
                      <p className="text-[10px] text-blue-600 font-bold mt-1">{action.subTitle}</p>
                    </div>
                    <ArrowRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20} />
                  </button>
                ))}
              </div>
            </div>

            {/* Active Session Snapshot */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                  <BookOpen size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-800 leading-none">Current Academic Session</h2>
                    <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">বর্তমান একাডেমিক সেশন | वर्तमान शैक्षणिक सत्र</p>
                </div>
              </div>
              
              {activeSession ? (
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div>
                    <div className="flex flex-col mb-3">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-emerald-100 inline-block w-fit">Active Status</span>
                        <span className="text-[8px] font-bold text-emerald-400 mt-1 ml-1 uppercase">সক্রিয় | सक्रिय</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-800 mb-1">{activeSession.name || activeSession.sessionName}</h3>
                    <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                      <Calendar size={14}/> {activeSession.startDate || 'N/A'} to {activeSession.endDate || 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center px-4 md:border-l border-gray-200">
                      <p className="text-3xl font-black text-blue-600">{activeSession.classes?.length || 0}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Classes (ক্লাস)</p>
                    </div>
                    <div className="text-center px-4 border-l border-gray-200">
                      <p className="text-3xl font-black text-blue-600">{activeSession.holidays?.length || 0}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Holidays (ছুটি)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-500 font-bold mb-2">No active session found | কোনো সেশন নেই</p>
                  <button onClick={() => navigate('/admin/db/create-session')} className="text-sm font-bold text-blue-600 hover:underline">Create a Session (তৈরি করুন)</button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Notice Board */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="mb-6">
              <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
                <Megaphone className="text-orange-500" size={20}/> Notice Board
              </h2>
              <p className="text-[10px] font-bold text-gray-400 mt-1 ml-7 uppercase">বিজ্ঞপ্তি বোর্ড | सूचना पट्ट</p>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {recentNotices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-100 rounded-2xl">
                  <Clock className="text-gray-300 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-400">No announcements | কোনো ঘোষণা নেই</p>
                </div>
              ) : (
                recentNotices.map((notice, idx) => (
                  <div key={notice.id || idx} className="p-4 rounded-2xl bg-gray-50 hover:bg-blue-50/50 border border-gray-100 hover:border-blue-100 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border 
                        ${notice.type === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' : 
                          notice.type === 'Holiday' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          'bg-blue-50 text-blue-600 border-blue-100'}`}
                      >
                        {notice.type || 'General'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight group-hover:text-blue-700 transition-colors">
                      {notice.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {notice.message}
                    </p>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => navigate('/admin/communication')}
              className="mt-6 w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-2 leading-none text-sm uppercase">
                <Megaphone size={16} /> Broadcast New Notice
              </div>
              <span className="text-[9px] font-medium opacity-70 mt-1 uppercase">নতুন নোটিশ পাঠান | नई सूचना भेजें</span>
            </button>
          </div>

        </div>
      </div>
    </AdminDashboardLayout>
  );
};

// Custom Stat Card Component updated for Trilingual support
const StatCard = ({ label, subLabel, value, icon, color, bg }) => (
  <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
    <div className={`h-12 w-12 md:h-14 md:w-14 shrink-0 ${bg} ${color} rounded-2xl flex items-center justify-center shadow-inner`}>
      {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
    </div>
    <div className="overflow-hidden">
      <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest truncate leading-none">{label}</p>
      <p className="text-[9px] font-bold text-blue-400 uppercase truncate mt-1 leading-none">{subLabel}</p>
      <p className="text-2xl md:text-3xl font-black text-gray-800 mt-1 tracking-tight">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;