import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

// --- MULTILINGUAL MAPPINGS ---
const MONTH_TRANSLATIONS = [
  { en: "January", sub: "জানুয়ারি / जनवरी" },
  { en: "February", sub: "ফেব্রুয়ারি / फरवरी" },
  { en: "March", sub: "মার্চ / मार्च" },
  { en: "April", sub: "এপ্রিল / अप्रैल" },
  { en: "May", sub: "মে / मई" },
  { en: "June", sub: "জুন / जून" },
  { en: "July", sub: "জুলাই / जुलाई" },
  { en: "August", sub: "আগস্ট / अगस्त" },
  { en: "September", sub: "সেপ্টেম্বর / सितंबर" },
  { en: "October", sub: "অক্টোবর / अक्टूबर" },
  { en: "November", sub: "নভেম্বর / नवंबर" },
  { en: "December", sub: "ডিসেম্বর / दिसंबर" }
];

const WEEKDAY_TRANSLATIONS = [
  { en: "Sun", sub: "রবি / रवि" },
  { en: "Mon", sub: "সোম / सोम" },
  { en: "Tue", sub: "মঙ্গল / मंगल" },
  { en: "Wed", sub: "বুধ / बुध" },
  { en: "Thu", sub: "বৃহস্পতি / गुरु" },
  { en: "Fri", sub: "শুক্র / शुक्र" },
  { en: "Sat", sub: "শনি / शनि" }
];

const StudentAttendance = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({}); 
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [studentClass, setStudentClass] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const sessionData = snap.docs[0].data();
          const allClasses = sessionData.classes || [];
          
          let foundStudent = null;
          let foundClassName = '';

          for (const cls of allClasses) {
            const match = cls.students?.find(s => s.uid === user.uid);
            if (match) {
              foundStudent = match;
              foundClassName = cls.name;
              break;
            }
          }

          setStudentClass(foundClassName);
          if (foundStudent && foundStudent.attendance) {
            setAttendanceData(foundStudent.attendance);
          } else {
            setAttendanceData({});
          }
          setHolidays(sessionData.holidays || []);
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [user]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = attendanceData[dateStr]; 
      const holiday = holidays.find(h => dateStr >= h.startDate && dateStr <= h.endDate);
      
      days.push({
        day: d,
        date: dateStr,
        statusData: record,
        holidayName: holiday?.name
      });
    }
    return days;
  }, [currentDate, attendanceData, holidays]);

  const stats = useMemo(() => {
    const monthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    let present = 0;
    let absent = 0;
    let leave = 0;

    Object.entries(attendanceData).forEach(([date, val]) => {
      if (date.startsWith(monthPrefix)) {
        if (val === 'Present') present++;
        else if (val === 'Absent') absent++;
        else if (typeof val === 'object' && val.status === 'Approved') leave++;
      }
    });
    
    return { present, absent, leave };
  }, [attendanceData, currentDate]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getStatusConfig = (data) => {
    if (!data) return { color: 'bg-white border-gray-100', text: 'text-gray-400', icon: null };
    if (data === 'Present') return { color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle size={14} className="text-emerald-500" /> };
    if (data === 'Absent') return { color: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <XCircle size={14} className="text-red-500" /> };
    
    if (typeof data === 'object') {
      if (data.status === 'Leave Pending') return { color: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: <Clock size={14} className="text-amber-500" /> };
      if (data.status === 'Approved') return { color: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: <FileText size={14} className="text-blue-500" /> };
      if (data.status === 'Rejected') return { color: 'bg-gray-100 border-gray-300', text: 'text-gray-500', icon: <XCircle size={14} className="text-gray-400" /> };
    }
    return { color: 'bg-white border-gray-100', text: 'text-gray-400', icon: null };
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
        
        {/* HEADER & SUMMARY */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
              <UserCheck className="text-emerald-600" /> Attendance Tracker
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              উপস্থিতি ট্র্যাকার / उपस्थिति ट्रैकर
            </p>
            <p className="text-xs font-bold uppercase tracking-wider mt-3">
              <span className="text-slate-400">Class / শ্রেণী: </span>
              <span className="text-emerald-700">{studentClass || user?.classEnrolled || 'Not Assigned'}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-center flex flex-col items-center">
              <p className="text-[10px] font-black text-emerald-600 uppercase leading-none">Present</p>
              <p className="text-[8px] font-bold text-emerald-500 uppercase mt-0.5">উপস্থিত / उपस्थित</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.present}</p>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 text-center flex flex-col items-center">
              <p className="text-[10px] font-black text-red-600 uppercase leading-none">Absent</p>
              <p className="text-[8px] font-bold text-red-500 uppercase mt-0.5">অনুপস্থিত / अनुपस्थित</p>
              <p className="text-2xl font-black text-red-700 mt-1">{stats.absent}</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-center flex flex-col items-center">
              <p className="text-[10px] font-black text-blue-600 uppercase leading-none">Leave</p>
              <p className="text-[8px] font-bold text-blue-500 uppercase mt-0.5">ছুটি / छुट्टी</p>
              <p className="text-2xl font-black text-blue-700 mt-1">{stats.leave}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
               Loading Attendance... <br/> উপস্থিতি লোড হচ্ছে... / उपस्थिति लोड हो रही है...
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            
            {/* CALENDAR CONTROLS */}
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all shadow-sm">
                  <ChevronLeft size={22} className="text-gray-600"/>
               </button>
               <div className="text-center">
                 <h2 className="text-lg font-black text-gray-800 leading-none">
                   {MONTH_TRANSLATIONS[currentDate.getMonth()].en} <span className="text-emerald-600">{currentDate.getFullYear()}</span>
                 </h2>
                 <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">
                   {MONTH_TRANSLATIONS[currentDate.getMonth()].sub}
                 </p>
               </div>
               <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all shadow-sm">
                  <ChevronRight size={22} className="text-gray-600"/>
               </button>
            </div>

            {/* CALENDAR GRID */}
            <div className="p-4 md:p-8">
              <div className="grid grid-cols-7 gap-2 md:gap-4 mb-6">
                {WEEKDAY_TRANSLATIONS.map(d => (
                  <div key={d.en} className="text-center flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{d.en}</span>
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">{d.sub}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 md:gap-4">
                {calendarDays.map((dayObj, idx) => {
                  if (!dayObj) return <div key={`empty-${idx}`} className="h-14 md:h-24 bg-gray-50/30 rounded-xl border border-transparent border-dashed"></div>;
                  
                  const isToday = new Date().toISOString().split('T')[0] === dayObj.date;
                  const config = dayObj.holidayName 
                    ? { color: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: <CalendarIcon size={14} className="text-orange-400" /> }
                    : getStatusConfig(dayObj.statusData);

                  return (
                    <div 
                      key={dayObj.date} 
                      className={`h-14 md:h-24 rounded-2xl border flex flex-col items-center justify-center relative group transition-all duration-300 hover:shadow-md ${config.color} ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2 scale-105 z-10' : ''}`}
                    >
                      <span className={`text-sm md:text-xl font-black ${config.text}`}>
                        {dayObj.day}
                      </span>
                      
                      {dayObj.holidayName && (
                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                           <div className="bg-gray-800 text-white text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap font-bold">
                             Holiday: {dayObj.holidayName}
                           </div>
                        </div>
                      )}

                      <div className="mt-1 transform group-hover:scale-110 transition-transform">
                        {config.icon}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEGEND */}
            <div className="px-6 py-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-6 gap-y-4 justify-center">
                <LegendItem icon={<CheckCircle size={14} className="text-emerald-500"/>} label="Present" sub="উপস্থিত / उपस्थित" />
                <LegendItem icon={<XCircle size={14} className="text-red-500"/>} label="Absent" sub="অনুপস্থিত / अनुपस्थित" />
                <LegendItem icon={<FileText size={14} className="text-blue-500"/>} label="Leave Approved" sub="ছুটি অনুমোদিত / स्वीकृत" />
                <LegendItem icon={<Clock size={14} className="text-amber-500"/>} label="Leave Pending" sub="ছুটি অপেক্ষমান / लंबित" />
                <LegendItem icon={<CalendarIcon size={14} className="text-orange-400"/>} label="Holiday" sub="ছুটি / अवकाश" />
            </div>
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

// Helper component for the Legend
const LegendItem = ({ icon, label, sub }) => (
  <div className="flex items-center gap-2">
    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-gray-600 uppercase leading-none">{label}</span>
      <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">{sub}</span>
    </div>
  </div>
);

export default StudentAttendance;