import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, LogOut, ShieldCheck, ChevronDown, ChevronRight,
  LayoutDashboard, Users, Database, Eye, FileText, MessageSquare, Phone, 
  Coins, X, Grid, ShoppingCart, FileSpreadsheet, ImageIcon, Inbox, QrCode,
  Loader2 , Globe
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAdminUser } from '../context/AdminUserContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const AdminDashboardLayout = ({ children, themeColor = "blue" }) => {
  const { user } = useAdminUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  usePushNotifications(user?.uid || user?.id);

  const menuItems = [
    { label: "Dashboard", subLabel: "ড্যাশবোর্ড | डैशबोर्ड", path: "/admin/dashboard", icon: <LayoutDashboard size={20} /> },
    { label: "Profiles", subLabel: "প্রোফাইল | प्रोफाइल", path: "/admin/manage-profiles", icon: <Users size={20} /> },
    { label: "Admissions", subLabel: "ভর্তি | प्रवेश", path: "/admin/manage-admissions", icon: <FileSpreadsheet size={20} /> },
    { label: "Enquiries", subLabel: "অনুসন্ধান | पूछताछ", path: "/admin/enquiries", icon: <Inbox size={20} /> },
    { label: "Teacher QR Generate", subLabel: "শিক্ষক QR | शिक्षक क्यूआर", path: "/admin/teacher-qr", icon: <QrCode size={20} /> },	
    { label: "Gallery", subLabel: "গ্যালারি | गैलरी", path: "/admin/manage-gallery", icon: <ImageIcon size={20} /> },
	{ label: "Site Content", subLabel: "সাইট কন্টেন্ট | साइट सामग्री", path: "/admin/manage-content", icon: <Globe size={20} /> },
	{ label: "Visit Website", subLabel: "ওয়েবসাইট দেখুন | वेबसाइट देखें", path: "/", icon: <Globe size={20} /> },
    { 
      label: "Database", 
      subLabel: "ডাটাবেস | डेटाबेस",
      icon: <Database size={20} />, 
      subItems: [
        { label: "Session", subLabel: "সেশন | सत्र", path: "/admin/db/create-session" },
        { label: "Assign Students", subLabel: "ছাত্র বরাদ্দ | छात्र असाइन", path: "/admin/db/assign-students" }
      ]
    },
    {
      label: "View Data",
      subLabel: "তথ্য দেখুন | डेटा देखें",
      icon: <Eye size={20} />,
      subItems: [
        { label: "Teacher Data", subLabel: "শিক্ষক তথ্য", path: "/admin/view/teacher-data" },
        { label: "Student Data", subLabel: "ছাত্র তথ্য", path: "/admin/view/student-data" },
        { label: "Teacher Attendance", subLabel: "শিক্ষক হাজিরা", path: "/admin/view/teacher-attendance" },
        { label: "Student Attendance", subLabel: "ছাত্র হাজিরা", path: "/admin/view/student-attendance" },
		    { label: "Teacher Class Diary", subLabel: "ক্লাস ডায়েরি", path: "/admin/view/teacher-class-diary" }
      ]
    },
    { 
      label: "Fees Management", 
      subLabel: "ফি ব্যবস্থাপনা | शुल्क प्रबंधन",
      icon: <Coins size={20} />,
      subItems: [
        { label: "Collection", subLabel: "ফি আদায়", path: "/admin/fees-collection" },
        { label: "Fees Summary", subLabel: "ফি সারাংশ", path: "/admin/fees-summary" } 
      ]
    },
    { label: "Result", subLabel: "ফলাফল | परिणाम", path: "/admin/result", icon: <FileText size={20} /> },
    { label: "General Notice", subLabel: "সাধারণ নোটিশ | सामान्य सूचना", path: "/admin/communication", icon: <MessageSquare size={20} /> }
  ];

  const mobileBottomItems = [
    menuItems[0], 
    menuItems[1], 
    { label: "Fees", subLabel: "ফি | शुल्क", path: "/admin/fees-collection", icon: <Coins size={20} /> }, 
    menuItems[10], 
  ];

  const themes = {
    blue: {
      sidebar: "bg-blue-950 border-blue-900",
      text: "text-blue-200 hover:bg-blue-900",
      active: "bg-blue-800 text-white",
      accent: "text-blue-600",
      bgAccent: "bg-blue-50 text-blue-700 border-blue-200"
    },
    purple: {
      sidebar: "bg-purple-950 border-purple-900",
      text: "text-purple-200 hover:bg-purple-900",
      active: "bg-purple-800 text-white",
      accent: "text-purple-600",
      bgAccent: "bg-purple-50 text-purple-700 border-purple-200"
    },
    emerald: {
      sidebar: "bg-emerald-950 border-emerald-900",
      text: "text-emerald-200 hover:bg-emerald-900",
      active: "bg-emerald-800 text-white",
      accent: "text-emerald-600",
      bgAccent: "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
  };
  
  const currentTheme = themes[themeColor] || themes.blue;

  const handleSignOut = async () => {
    try { await signOut(auth); navigate('/login'); } 
    catch (error) { console.error("Error signing out:", error); }
  };

  const handleMenuClick = (item) => {
    if (item.subItems) { setExpandedMenu(expandedMenu === item.label ? null : item.label); } 
    else { navigate(item.path); }
  };

  const profileImage = user?.documents?.photo || user?.photo;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 ${currentTheme.sidebar} text-white h-full shrink-0 shadow-xl z-20 transition-colors duration-300`}>
        <div className={`p-6 border-b ${themeColor === 'blue' ? 'border-blue-900' : 'border-purple-900'} flex items-center gap-3`}>
          <div className="bg-white p-0.5 rounded-full shadow-lg shrink-0 overflow-hidden h-10 w-10 md:h-14 md:w-14 flex items-center justify-center border-2 border-yellow-400">
            <img src="/vcm_logo.jpeg" alt="VCM Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-wide leading-none">Admin Portal</span>
            <span className="text-[9px] text-blue-300 font-medium mt-1">অ্যাডমিন পোর্টাল | एडमिन पोर्टल</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {menuItems.map((item, idx) => {
            const hasSubItems = !!item.subItems;
            const isExpanded = expandedMenu === item.label;
            const isActive = location.pathname === item.path || (hasSubItems && item.subItems.some(sub => location.pathname === sub.path)); 

            return (
              <div key={idx}>
                <button 
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-medium ${isActive && !hasSubItems ? currentTheme.active : currentTheme.text} ${isActive && hasSubItems ? 'bg-white/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon} 
                    <div className="flex flex-col items-start">
                      <span className="text-sm leading-none">{item.label}</span>
                      <span className="text-[8px] opacity-70 mt-1 font-normal">{item.subLabel}</span>
                    </div>
                  </div>
                  {hasSubItems && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </button>
                
                {hasSubItems && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-white/20 pl-2">
                    {item.subItems.map((sub, subIdx) => (
                        <button key={subIdx} onClick={() => navigate(sub.path)} className={`w-full flex flex-col items-start px-3 py-2 rounded-md transition ${location.pathname === sub.path ? 'text-white font-semibold bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                          <span className="text-sm leading-none">{sub.label}</span>
                          <span className="text-[7px] opacity-60 mt-1">{sub.subLabel}</span>
                        </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-1">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-950/50 rounded-lg transition font-medium">
            <LogOut className="h-5 w-5" /> 
            <div className="flex flex-col items-start">
               <span className="text-sm leading-none">Sign Out</span>
               <span className="text-[8px] opacity-70 mt-1">লগ আউট | লগ আউট</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        <header className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center h-16 shrink-0 z-10">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsMoreMenuOpen(true)} 
                className={`md:hidden p-1.5 rounded-lg text-white hover:opacity-80 transition-opacity ${themeColor === 'blue' ? 'bg-blue-900' : 'bg-purple-900'}`}
             >
               <ShieldCheck size={20} />
             </button>
             <div className="flex flex-col">
                <h1 className="font-bold text-gray-800 text-lg leading-none truncate max-w-[120px] sm:max-w-xs">
                    {menuItems.find(i => i.path === location.pathname)?.label || 
                     menuItems.flatMap(i => i.subItems || []).find(s => s.path === location.pathname)?.label || 
                     'Dashboard'}
                </h1>
                <span className="text-[9px] text-gray-400 font-bold mt-1">
                    {menuItems.find(i => i.path === location.pathname)?.subLabel || 
                     menuItems.flatMap(i => i.subItems || []).find(s => s.path === location.pathname)?.subLabel || 
                     'ড্যাশবোর্ড | डैशबोर्ड'}
                </span>
             </div>
          </div>

			{/* Added cursor-pointer and onClick with dynamic user ID routing */}
			<div 
			  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
			  onClick={() => navigate(`/admin/view-profile/${user?.uid || user?.id}`)} 
			>
			   <div className="flex flex-col items-end mr-1">
				  <span className="text-sm font-bold text-gray-700 leading-tight text-right truncate max-w-[100px] sm:max-w-none">
					  {user?.name || 'Admin'}
				  </span>
				  <span className="hidden md:block text-[10px] font-bold uppercase text-gray-400 tracking-wider">
					  {user?.role || 'Super Admin'}
				  </span>
			   </div>
			   {profileImage ? (
				 <img src={profileImage} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-gray-200 shadow-sm" />
			   ) : (
				 <div className={`h-9 w-9 rounded-full text-white flex items-center justify-center font-bold shadow-sm uppercase ${themeColor === 'blue' ? 'bg-blue-600' : 'bg-purple-600'}`}>
				   {user?.name?.charAt(0) || 'A'}
				 </div>
			   )}
			</div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50/50 flex flex-col">
          <div className="flex-1 p-4 sm:p-8 pb-24 md:pb-8">
            {children}
          </div>
          
          <footer className="mt-auto py-4 px-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-1">
                <p className="text-xs font-black text-gray-800 tracking-tight">
                  © 2026 Vivekananda Child's Mission | All Rights Reserved.
                </p>	
                <p className="text-[10px] font-bold text-gray-500">
                  সর্বস্বত্ব সংরক্ষিত | সর্বাধিকার সুরক্ষিত
                </p>					
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile More Menu Overlay */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden flex flex-col bg-white animate-in slide-in-from-bottom-10 duration-200">
          {/* SAFE AREA FIX */}
          <div 
            className="flex justify-between items-center px-5 pb-5 border-b bg-gray-50"
            style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
          >
            <div className="flex flex-col">
                <h2 className="font-bold text-lg text-gray-800 leading-none">All Admin Tools</h2>
                <span className="text-xs text-gray-500 mt-1">সব অ্যাডমিন টুলস | सभी एडमिन टूल्स</span>
            </div>
            <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"><X size={20} /></button>
          </div>

          <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto pb-24">
             {menuItems.map((item, idx) => {
                if (item.subItems) {
                   return (
                     <div key={idx} className="col-span-2 space-y-2 mt-2 mb-2">
                        <div className="flex flex-col items-start gap-1 ml-1">
                           <div className="flex items-center gap-2 text-xs font-extrabold text-black uppercase tracking-wider leading-none">
                             {/* Updated icon to be bold and black */}
                             {React.cloneElement(item.icon, { size: 18, strokeWidth: 2.5 })} {item.label}
                           </div>
                           <span className="text-[8px] font-bold text-gray-500 ml-7 uppercase leading-none">{item.subLabel}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           {item.subItems.map((sub, sIdx) => (
                              <button key={sIdx} onClick={() => { navigate(sub.path); setIsMoreMenuOpen(false); }} className={`p-3 rounded-xl border bg-white border-gray-100 flex flex-col items-center justify-center text-center shadow-sm ${location.pathname === sub.path ? currentTheme.bgAccent : 'hover:bg-gray-50'}`}>
                                  <span className="text-xs font-extrabold text-black leading-none">{sub.label}</span>
                                  <span className="text-[8px] font-bold text-black/80 mt-1">{sub.subLabel}</span>
                              </button>
                           ))}
                        </div>
                     </div>
                   );
                }

                const isActive = location.pathname === item.path;
                return (
                  <button key={idx} onClick={() => { navigate(item.path); setIsMoreMenuOpen(false); }} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${isActive ? currentTheme.bgAccent + ' shadow-md' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}>
                    {/* Updated wrapper to text-black and icon to strokeWidth: 2.5 */}
                    <div className={`mb-2 p-2 rounded-full ${isActive ? 'bg-white/50 text-blue-700' : 'bg-gray-100 text-black'}`}>
                       {React.cloneElement(item.icon, { size: 24, strokeWidth: 2.5 })}
                    </div>
                    <span className="text-xs font-extrabold text-black leading-none">{item.label}</span>
                    <span className="text-[8px] font-bold text-black/80 mt-1 text-center leading-tight">{item.subLabel}</span>
                  </button>
                );
             })}
             
             <button onClick={handleSignOut} className="col-span-2 mt-2 flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-red-100 bg-red-50 text-red-600 font-extrabold">
               <div className="flex items-center gap-2">
                 <LogOut size={20} strokeWidth={2.5} /> <span>Sign Out</span>
               </div>
               <span className="text-[9px] font-bold opacity-80">লগ আউট | লগ আউট</span>
             </button>
          </div>
        </div>
      )}

	{/* Mobile Bottom Nav */}
      {!isMoreMenuOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[50] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(64px + env(safe-area-inset-bottom))' }}>
          <div className="flex justify-around items-center h-16 px-2">
            {mobileBottomItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <button key={idx} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? currentTheme.accent : 'text-black'}`}>
                  <div className={`${isActive ? 'bg-gray-100' : 'bg-transparent'} p-1.5 rounded-xl transition-colors`}>
                    {React.cloneElement(item.icon, { size: 22, strokeWidth: 2.5 })}
                  </div>
                  <div className="flex flex-col items-center text-black">
                    <span className="text-[9px] font-extrabold leading-none truncate w-16 text-center">{item.label}</span>
                    <span className="text-[7px] font-bold mt-0.5 opacity-90">{item.subLabel?.split(' | ')[0]}</span>
                  </div>
                </button>
              );
            })}
            <button onClick={() => setIsMoreMenuOpen(true)} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-black hover:text-gray-800">
              <div className="p-1.5 rounded-xl bg-gray-50 border border-gray-200"><Grid size={22} strokeWidth={2.5} /></div>
              <div className="flex flex-col items-center text-black">
                <span className="text-[9px] font-extrabold leading-none">Menu</span>
                <span className="text-[7px] font-bold mt-0.5 opacity-90">মেনু | মেনू</span>
              </div>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default AdminDashboardLayout;