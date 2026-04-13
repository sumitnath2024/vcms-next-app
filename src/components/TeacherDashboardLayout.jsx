import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, LogOut, X, Grid, 
  UserCheck, Users, FileText, ClipboardList, Calendar, LayoutDashboard,
  Video, GraduationCap, Award, CalendarDays, CalendarClock, Library, Phone , UploadCloud, Globe,
  Image as ImageIcon // <-- ADD THIS
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useTeacherUser } from '../context/TeacherUserContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Updated Menu Items with Bilingual Sub-labels
const TEACHER_MENU_ITEMS = [
  { path: '/teacher/dashboard', label: 'Overview', subLabel: 'বিবরণ | सारांश', icon: <LayoutDashboard /> },
  { path: '/teacher/selfattendance', label: 'My Attd.', subLabel: 'আমার হাজিরা | मेरी उपस्थिति', icon: <UserCheck /> },  
  { path: '/teacher/studentattendance', label: 'Std. Attd.', subLabel: 'ছাত্র হাজিরা | छात्र उपस्थिति', icon: <Users /> },  
  { path: '/teacher/classdiary', label: 'Cls Diary', subLabel: 'ক্লাস ডায়েরি | कक्षा डायरी', icon: <BookOpen /> },
  { path: '/teacher/study-material', label: 'Study Material', subLabel: 'পঠন সামগ্রী | अध्ययन सामग्री', icon: <UploadCloud /> },
  { path: '/teacher/syllabus', label: 'View Syllabus', subLabel: 'সিলেবাস | पाठ्यक्रम', icon: <FileText /> },
  { path: '/teacher/student-data', label: 'Student Data', subLabel: 'ছাত্র তথ্য | छात्र डेटा', icon: <GraduationCap /> },
  { path: '/teacher/schedule', label: 'Schedule', subLabel: 'সময়সূচী | समय सारणी', icon: <CalendarClock /> },  
  { path: '/teacher/online-class', label: 'Online Class', subLabel: 'অনলাইন ক্লাস | ऑनलाइन क्लास', icon: <Video /> },
  { path: '/teacher/gallery', label: 'Gallery', subLabel: 'গ্যালারি | गैलरी', icon: <ImageIcon /> },
  { path: '/teacher/remarks', label: 'Remarks', subLabel: 'মন্তব্য দিন | टिप्पणी दें', icon: <FileText /> }, 
  { path: '/teacher/marks', label: 'Marks Entry', subLabel: 'নম্বর এন্ট্রি | अंक प्रविष्टि', icon: <ClipboardList /> },
  { path: '/teacher/postremarks', label: 'Post Result Remarks', subLabel: 'মন্তব্য দিন | टिप्पणी दें', icon: <FileText /> },
  { path: '/teacher/leave', label: 'View/Apply Leave', subLabel: 'ছুটি | छुट्टी', icon: <Calendar /> },
  { path: '/teacher/profile', label: 'My Profile', subLabel: 'আমার প্রোফাইল | मेरी प्रोफाइल', icon: <UserCheck /> },
  { path: '/teacher/result', label: 'View Results', subLabel: 'ফলাফল | परिणाम', icon: <Award /> },
  { path: '/teacher/holidays', label: 'Holiday List', subLabel: 'ছুটির তালিকা | अवकाश सूची', icon: <CalendarDays /> },
  { path: '/teacher/books', label: 'Book List', subLabel: 'বইয়ের তালিকা | पुस्तक सूची', icon: <Library /> },
  { path: '/', label: 'Visit Website', subLabel: 'ওয়েবসাইট দেখুন | वेबसाइट देखें', icon: <Globe /> },
];

const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TeacherDashboardLayout = ({ children }) => {
  const { userData } = useTeacherUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Initialize FCM Push Notifications
  usePushNotifications(userData?.uid || userData?.id);

  const menuItems = TEACHER_MENU_ITEMS;
  const profileImage = userData?.documents?.photo || userData?.photo;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const primaryMobileItems = menuItems.slice(0, 4);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-purple-950 text-white h-full shrink-0 shadow-xl z-20">
        <div className="p-6 border-b border-purple-900 flex items-center gap-3">
		<div className="bg-white p-0.5 rounded-full shadow-lg shrink-0 overflow-hidden h-10 w-10 md:h-14 md:w-14 flex items-center justify-center border-2 border-yellow-400">
			<img 
			  src="/vcm_logo.jpeg" 
			  alt="VCM Logo" 
			  className="h-full w-full object-cover"
			/>
		  </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-wide leading-none">Teacher Portal</span>
            <span className="text-[9px] text-purple-300 font-medium mt-1">শিক্ষক পোর্টাল | शिक्षक पोर्टल</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-700">
          {menuItems.map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => navigate(item.path)} 
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-purple-800 text-white shadow-md translate-x-1' 
                  : 'text-purple-200 hover:bg-purple-900 hover:text-white'
              }`}
            >
              {React.cloneElement(item.icon, { size: 20 })}
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold">{item.label}</span>
                <span className="text-[9px] font-normal opacity-80">{item.subLabel}</span>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-purple-900">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-950/50 rounded-lg transition font-medium">
            <LogOut className="h-5 w-5" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-sm">Sign Out</span>
              <span className="text-[9px] opacity-70 mt-0.5">লগ আউট | लॉग आउट</span>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <header className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center h-16 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMoreMenuOpen(true)} className="md:hidden bg-purple-900 hover:bg-purple-800 transition p-1.5 rounded-lg text-white">
              <BookOpen size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="font-bold text-gray-800 text-lg leading-none truncate max-w-[120px] sm:max-w-xs">
                {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </h1>
              <span className="text-[10px] text-gray-400 font-bold mt-1">
                {menuItems.find(i => i.path === location.pathname)?.subLabel || 'ড্যাশবোর্ড | डैशबोर्ड'}
              </span>
            </div>
          </div>
          {/* Added cursor-pointer and onClick handler for Teacher Profile */}
			<div 
			  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
			  onClick={() => navigate('/teacher/profile')}
			>
			  <div className="flex flex-col items-end mr-1">
				<span className="text-sm font-bold text-gray-700 leading-tight text-right truncate max-w-[100px] sm:max-w-none">
				  {userData?.name || 'Teacher'}
				</span>
				<span className="text-[10px] font-bold uppercase text-purple-600 tracking-tight flex items-center gap-1">
				  <UserCheck size={10} /> 
				  <span>অনুষদ সদস্য | संकाय सदस्य</span>
				</span>
			  </div>
			  {profileImage ? (
				<img src={profileImage} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-gray-200 shadow-sm" />
			  ) : (
				<div className="h-9 w-9 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold border border-purple-200 shadow-sm">
				  {userData?.name?.charAt(0) || 'T'}
				</div>
			  )}
			</div>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50 flex flex-col">
          <div className="flex-1 p-4 pb-24 md:pb-4">
            {children}
          </div>

          <footer className="mt-auto py-4 px-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-1">
              <div className="text-center md:text-left">
                <p className="text-xs font-black text-gray-800 tracking-tight">
                  © 2026 Vivekananda Child's Mission | All Rights Reserved.
                </p>	
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                  সর্বস্বত্ব সংরক্ষিত | सर्वाधिकार सुरक्षित
                </p>					
              </div>
            </div>
          </footer>
        </div>
      </main>

      {/* MOBILE "MORE" OVERLAY */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden flex flex-col bg-white animate-in slide-in-from-bottom-10 duration-200">
          {/* SAFE AREA FIX applied here */}
          <div 
            className="flex justify-between items-center px-5 pb-5 border-b bg-gray-50"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <div className="flex flex-col">
              <h2 className="font-bold text-lg text-gray-800 leading-none">Teacher Menu</h2>
              <span className="text-xs text-gray-500 mt-1">শিক্ষক মেনু | शिक्षक मेनू</span>
            </div>
            <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"><X size={20} /></button>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4 overflow-y-auto pb-20">
             {menuItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                return (
                  <button key={idx} onClick={() => { navigate(item.path); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isActive ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                    {/* Updated wrapper to text-black and icon to strokeWidth: 2.5 */}
                    <div className={`mb-2 p-2.5 rounded-full ${isActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-black'}`}>
                        {React.cloneElement(item.icon, { size: 24, strokeWidth: 2.5 })}
                    </div>
                    <span className="text-[11px] font-extrabold text-black text-center leading-tight">{item.label}</span>
                    <span className="text-[9px] font-bold text-black/80 text-center mt-1">{item.subLabel}</span>
                  </button>
                )
             })}
             <button onClick={handleLogout} className="flex flex-col items-center justify-center p-3 rounded-xl border border-red-100 bg-red-50 text-red-600">
                <div className="mb-2 p-2.5 rounded-full bg-red-100"><LogOut size={24} strokeWidth={2.5} /></div>
                <span className="text-[11px] font-extrabold text-red-700 text-center leading-tight">Log Out</span>
                <span className="text-[9px] font-bold text-red-600/80 mt-1">লগ আউট | लॉग आउट</span>
              </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM BAR */}
      {!isMoreMenuOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[50] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(64px + env(safe-area-inset-bottom))' }}>
          <div className="flex justify-around items-center h-16 px-1">
            {primaryMobileItems.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => navigate(item.path)} 
                className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === item.path ? 'text-purple-700' : 'text-black'}`}
              >
                <div className={`${location.pathname === item.path ? 'bg-purple-100' : 'bg-transparent'} p-1 rounded-xl transition-colors`}>
                  {React.cloneElement(item.icon, { size: 22, strokeWidth: 2.5 })}
                </div>
                <div className="flex flex-col items-center space-y-0.5 text-black">
                  <span className="text-[9px] font-extrabold leading-tight mt-0.5">{item.label}</span>
                  <span className="text-[7px] font-bold opacity-90">{item.subLabel}</span>
                </div>
              </button>
            ))}
            <button onClick={() => setIsMoreMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full text-black hover:text-gray-800">
              <div className="p-1 rounded-xl bg-gray-50 border border-gray-200"><Grid size={22} strokeWidth={2.5} /></div>
              <div className="flex flex-col items-center space-y-0.5 text-black">
                <span className="text-[9px] font-extrabold leading-tight mt-0.5">Menu</span>
                <span className="text-[7px] font-bold opacity-90">মেনু | मेनू</span>
              </div>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default TeacherDashboardLayout;