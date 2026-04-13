import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Bell, MessageSquare, Loader2, AlertCircle, Pin, Calendar as CalendarIcon, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

const StudentDiary = () => {
  const { user } = useStudentUser();
  const [activeTab, setActiveTab] = useState('diary'); 
  const [loading, setLoading] = useState(true);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [notices, setNotices] = useState([]);
  const [personalRemarks, setPersonalRemarks] = useState([]);
  const [studentClassInfo, setStudentClassInfo] = useState(null);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const noticesSnap = await getDocs(collection(db, 'generalNotices'));
        const noticesList = noticesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(noticesList.sort((a, b) => new Date(b.date) - new Date(a.date)));

        const sessionQ = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQ);
        
        if (sessionSnap.empty) {
          setError("No active academic session found.");
          return;
        }

        const sessionData = sessionSnap.docs[0].data();
        const allClasses = sessionData.classes || [];

        let foundClass = null;
        let foundStudentProfile = null;

        for (const cls of allClasses) {
          const match = cls.students?.find(s => s.uid === user.uid);
          if (match) {
            foundClass = cls;
            foundStudentProfile = match;
            break;
          }
        }

        if (foundClass && foundStudentProfile) {
          setStudentClassInfo(foundClass.name);
          const diaries = foundClass.diaries || [];
          setDiaryEntries(diaries);
          const remarks = foundStudentProfile.remarks || [];
          setPersonalRemarks([...remarks].sort((a, b) => new Date(b.date) - new Date(a.date)));
        } else {
          setError("Student record not found in the current academic session.");
        }
      } catch (err) {
        setError("Failed to load diary and notices.");
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  // --- CALENDAR HELPERS ---
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const handleDateClick = (day) => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));

  const toISODate = (dateObj) => {
    const offset = dateObj.getTimezoneOffset();
    const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const selectedDateStr = toISODate(selectedDate);
  const filteredDiaryEntries = diaryEntries.filter(entry => entry.date === selectedDateStr);

  const hasEntry = (day) => {
    const checkDateStr = toISODate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    return diaryEntries.some(e => e.date === checkDateStr);
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        
        {/* HEADER SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
                <BookOpen className="text-emerald-600" /> My Desk
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                আমার ডেস্ক / मेरा डेस्क
              </p>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                Welcome back, {user?.name || 'Student'} / স্বাগত / स्वागत है
              </p>
            </div>
            {studentClassInfo && (
              <div className="text-right">
                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 shadow-sm block">
                  {studentClassInfo}
                </span>
              </div>
            )}
          </div>
          
          {/* TAB NAVIGATION */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
             {[
               { id: 'diary', label: 'Class Diary', sub: 'ডায়েরি / डायरी', icon: BookOpen },
               { id: 'notices', label: 'Notices', sub: 'নোটিশ / नोटिस', icon: Bell },
               { id: 'remarks', label: 'Remarks', sub: 'মন্তব্য / टिप्पणी', icon: MessageSquare }
             ].map((tab) => (
               <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] py-2 rounded-lg transition-all flex flex-col items-center justify-center ${
                    activeTab === tab.id ? 'bg-white text-emerald-700 shadow-sm border-b-2 border-emerald-600' : 'text-gray-500 hover:bg-gray-200'
                }`}
               >
                <div className="flex items-center gap-2 mb-0.5">
                  <tab.icon size={14} /> 
                  <span className="text-xs font-bold">{tab.label}</span>
                </div>
                <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter">{tab.sub}</span>
               </button>
             ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading / লোড হচ্ছে / लोड हो रहा है</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3">
            <AlertCircle /> {error}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            
            {activeTab === 'diary' && (
              <div className="grid md:grid-cols-12 gap-6">
                
                {/* CALENDAR SIDEBAR */}
                <div className="md:col-span-5 lg:col-span-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={18}/></button>
                      <div className="text-center">
                        <h3 className="font-bold text-gray-800 text-sm leading-none">
                          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                      </div>
                      <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={18}/></button>
                    </div>

                    <div className="grid grid-cols-7 text-center mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-[10px] font-black text-gray-400 py-1 uppercase">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {Array(getFirstDayOfMonth(currentMonth)).fill(null).map((_, i) => (
                        <div key={`empty-${i}`} className="h-8"></div>
                      ))}
                      
                      {Array(getDaysInMonth(currentMonth)).fill(null).map((_, i) => {
                        const day = i + 1;
                        const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                        const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
                        const hasData = hasEntry(day);

                        return (
                          <button 
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`h-8 w-8 mx-auto rounded-full text-xs flex items-center justify-center relative transition-all
                              ${isSelected ? 'bg-emerald-600 text-white font-bold shadow-md scale-110' : 'hover:bg-emerald-50 text-gray-700'}
                              ${isToday && !isSelected ? 'border border-emerald-600 text-emerald-700 font-bold' : ''}
                            `}
                          >
                            {day}
                            {hasData && !isSelected && (
                              <div className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">
                      Selected / নির্বাচিত / चयनित
                    </p>
                    <p className="text-sm font-black text-emerald-900">
                      {selectedDate.toDateString()}
                    </p>
                  </div>
                </div>

                {/* DIARY CONTENT */}
                <div className="md:col-span-7 lg:col-span-8 space-y-4">
                  {filteredDiaryEntries.length > 0 ? (
                    filteredDiaryEntries.map((entry, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded inline-block w-fit">
                              {entry.subject}
                            </span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Subject / বিষয় / विषय</span>
                          </div>
                        </div>
                        <h3 className="font-black text-gray-800 text-lg mb-2 leading-tight">{entry.topic}</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                           <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-medium">
                             {entry.homework || entry.description}
                           </p>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700 border border-emerald-200">
                             {entry.teacherName?.charAt(0) || 'T'}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">
                               Posted by / শিক্ষক / शिक्षक
                             </span>
                             <span className="text-[11px] font-bold text-gray-700">{entry.teacherName || 'Teacher'}</span>
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyView 
                      icon={CalendarIcon} 
                      title="No entries for this date" 
                      sub="এই তারিখে কোনো তথ্য নেই / इस तिथि के लिए कोई प्रविष्टि नहीं है"
                      desc="Select a date with a red dot / লাল বিন্দু যুক্ত তারিখ বাছুন" 
                    />
                  )}
                </div>
              </div>
            )}

            {/* NOTICES TAB */}
            {activeTab === 'notices' && (
              notices.length > 0 ? (
                notices.map((notice, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Pin size={40} className="rotate-45" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pin size={16} className="text-blue-500 fill-blue-500" />
                      <h3 className="font-black text-blue-900 text-lg leading-tight">{notice.title}</h3>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed mb-4 font-medium">{notice.message || notice.content}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-gray-400 uppercase">ADMINISTRATION</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">প্রশাসন / प्रशासन</span>
                      </div>
                      <span className="text-[10px] text-gray-400 italic font-bold">{formatDateDisplay(notice.date)}</span>
                    </div>
                  </div>
                ))
              ) : <EmptyView 
                    icon={Bell} 
                    title="No official school notices" 
                    sub="এখনও কোনো বিজ্ঞপ্তি নেই / अभी कोई आधिकारिक सूचना नहीं है" 
                  />
            )}

            {/* REMARKS TAB */}
            {activeTab === 'remarks' && (
              personalRemarks.length > 0 ? (
                personalRemarks.map((rem, idx) => (
                  <div key={idx} className="bg-amber-50/30 p-5 rounded-xl border border-amber-100 shadow-sm border-l-4 border-l-amber-400">
                    <div className="flex gap-4">
                      <div className="bg-amber-100 h-10 w-10 rounded-full flex items-center justify-center shrink-0 border border-amber-200">
                        <MessageSquare className="text-amber-600" size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">{rem.category || 'General'}</span>
                            <span className="text-[7px] font-bold text-amber-600 uppercase">Category / বিভাগ / श्रेणी</span>
                          </div>
                          <span className="text-[10px] text-amber-600 font-black">{formatDateDisplay(rem.date)}</span>
                        </div>
                        <p className="text-gray-800 text-sm italic font-bold leading-relaxed">"{rem.remark}"</p>
                        <div className="mt-3 flex flex-col">
                          <span className="text-[9px] text-amber-700 font-black uppercase tracking-tighter">Teacher / শিক্ষক / शिक्षक</span>
                          <p className="text-[11px] text-amber-800 font-bold">— {rem.teacherName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : <EmptyView 
                    icon={MessageSquare} 
                    title="You have a clean record!" 
                    sub="কোনো নেতিবাচক মন্তব্য নেই / कोई नकारात्मक टिप्पणी नहीं मिली" 
                  />
            )}

          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

// --- REUSABLE EMPTY STATE WITH MULTILINGUAL SUPPORT ---
const EmptyView = ({ icon: Icon, title, sub, desc }) => (
  <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100 px-6">
    <Icon className="mx-auto text-gray-200 mb-4" size={48} />
    <h3 className="text-gray-800 font-black text-base leading-tight">{title}</h3>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-3">{sub}</p>
    {desc && <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 inline-block px-3 py-1 rounded-full">{desc}</p>}
  </div>
);

export default StudentDiary;