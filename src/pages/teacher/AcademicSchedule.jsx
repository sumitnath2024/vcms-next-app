import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarClock, BookOpen, User, Users, ChevronLeft, ChevronRight, 
  Loader2, AlertCircle, Clock, Calendar as CalendarIcon, MapPin, List, Filter
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { useTeacherUser } from '../../context/TeacherUserContext';

const AcademicSchedule = () => {
  const { userData } = useTeacherUser();
  const [activeTab, setActiveTab] = useState('routine'); // 'routine' | 'syllabus'
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  
  // --- ROUTINE STATE ---
  const [routineView, setRoutineView] = useState('teacher'); // 'teacher' (My Routine) | 'class' (View by Class)
  const [selectedClassForRoutine, setSelectedClassForRoutine] = useState('');
  
  // Date & Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- SYLLABUS STATE ---
  const [selectedClassForSyllabus, setSelectedClassForSyllabus] = useState('');
  const [selectedSubjectForSyllabus, setSelectedSubjectForSyllabus] = useState('');

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sessionData = snap.docs[0].data();
          setClasses(sessionData.classes || []);
        }
      } catch (e) {
        console.error("Failed to load schedule data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. HELPERS & COMPUTED DATA
  const selectedDayName = useMemo(() => {
    return selectedDate.toLocaleString('en-US', { weekday: 'long' });
  }, [selectedDate]);

  const syllabusSubjects = useMemo(() => {
    if (!selectedClassForSyllabus) return [];
    const cls = classes.find(c => c.id === selectedClassForSyllabus);
    return cls ? (cls.subjects || []) : [];
  }, [classes, selectedClassForSyllabus]);

  const currentSyllabus = useMemo(() => {
    if (!selectedClassForSyllabus || !selectedSubjectForSyllabus) return [];
    const cls = classes.find(c => c.id === selectedClassForSyllabus);
    if (!cls || !cls.syllabus) return [];
    return cls.syllabus.filter(item => item.subjectId === selectedSubjectForSyllabus);
  }, [classes, selectedClassForSyllabus, selectedSubjectForSyllabus]);

  const getExamName = (clsId, examId) => {
    const cls = classes.find(c => c.id === clsId);
    if (!cls || !cls.exams) return 'Unknown Exam';
    const exam = cls.exams.find(e => e.id === examId);
    return exam ? exam.name : 'Unknown Exam';
  };

  // 3. ROUTINE LOGIC
  const getRoutineData = () => {
    if (routineView === 'class') {
        if (!selectedClassForRoutine) return {};
        const cls = classes.find(c => c.id === selectedClassForRoutine);
        if (!cls || !cls.routine) return {};
        
        return daysOfWeek.reduce((acc, day) => {
            acc[day] = cls.routine
              .filter(r => r.day === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return acc;
        }, {});
    } else {
        const myRoutine = {};
        daysOfWeek.forEach(day => {
            myRoutine[day] = [];
            classes.forEach(cls => {
                if (cls.routine) {
                    const myPeriods = cls.routine.filter(r => 
                        r.day === day && (r.teacherId === userData.uid || r.teacherName === userData.name)
                    );
                    myPeriods.forEach(p => myRoutine[day].push({ ...p, className: cls.name }));
                }
            });
            myRoutine[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        return myRoutine;
    }
  };

  const routineData = getRoutineData();

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const handlePrevDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d);
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d);
  };
  const isToday = (d) => {
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  return (
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 leading-none">
              <CalendarClock className="text-purple-600" /> Academic Schedule
            </h1>
            <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">একাডেমিক সময়সূচী | शैक्षणिक समय सारणी</p>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage routines | রুটিন পরিচালনা | रूटीन प्रबंधित करें</p>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
             <button 
                onClick={() => setActiveTab('routine')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg transition-all flex flex-col items-center justify-center ${
                    activeTab === 'routine' ? 'bg-white text-purple-700 shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                <div className="flex items-center gap-2 text-sm font-bold"><CalendarClock size={16} /> Routine</div>
                <span className="text-[8px] font-bold uppercase opacity-70">রুটিন | रूटीन</span>
             </button>
             <button 
                onClick={() => setActiveTab('syllabus')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg transition-all flex flex-col items-center justify-center ${
                    activeTab === 'syllabus' ? 'bg-white text-purple-700 shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
             >
                <div className="flex items-center gap-2 text-sm font-bold"><BookOpen size={16} /> Syllabus</div>
                <span className="text-[8px] font-bold uppercase opacity-70">সিলেবাস | पाठ्यक्रम</span>
             </button>
          </div>
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-24">
               <Loader2 className="animate-spin text-purple-600 mb-2" size={40} />
               <p className="text-[10px] font-bold text-purple-400 uppercase">Loading Schedule... | লোড হচ্ছে...</p>
           </div>
        ) : (
           <>
             {/* ==================== ROUTINE TAB ==================== */}
             {activeTab === 'routine' && (
               <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                 
                 {/* VIEW CONTROLS */}
                 <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex bg-white p-1 rounded-lg border border-purple-100 shadow-sm">
                        <button 
                            onClick={() => setRoutineView('teacher')}
                            className={`px-4 py-1 rounded-md transition-all flex flex-col items-center ${
                                routineView === 'teacher' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-xs font-bold leading-none"><User size={14} /> My Routine</div>
                            <span className="text-[8px] font-bold opacity-70 mt-1">আমার রুটিন | मेरी दिनचर्या</span>
                        </button>
                        <button 
                            onClick={() => setRoutineView('class')}
                            className={`px-4 py-1 rounded-md transition-all flex flex-col items-center ${
                                routineView === 'class' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-xs font-bold leading-none"><Users size={14} /> Class Routine</div>
                            <span className="text-[8px] font-bold opacity-70 mt-1">ক্লাস রুটিন | कक्षा रूटीन</span>
                        </button>
                    </div>

                    {routineView === 'class' && (
                        <div className="relative w-full md:w-64">
                            <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <select 
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                value={selectedClassForRoutine} 
                                onChange={(e) => setSelectedClassForRoutine(e.target.value)}
                            >
                                <option value="">Select Class... | ক্লাস নির্বাচন করুন</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                 </div>

                 <div className="grid lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: DAILY LIST */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                            {/* Day Navigator */}
                            <div className="bg-gradient-to-r from-purple-50 to-white p-4 border-b border-purple-100 flex items-center justify-between">
                                <button onClick={handlePrevDay} className="p-2 hover:bg-white rounded-full text-purple-700 transition-all shadow-sm"><ChevronLeft size={20} /></button>
                                <div className="text-center">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center justify-center gap-2 leading-none">
                                        {selectedDayName}
                                        {isToday(selectedDate) && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Today | আজ</span>}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium mt-1">{selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <button onClick={handleNextDay} className="p-2 hover:bg-white rounded-full text-purple-700 transition-all shadow-sm"><ChevronRight size={20} /></button>
                            </div>

                            {/* Content List */}
                            <div className="p-6 bg-gray-50/50 flex-1">
                                {(!selectedClassForRoutine && routineView === 'class') ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                                        <Users size={48} className="mb-3 opacity-20" />
                                        <p className="font-bold uppercase text-sm">Select a class | একটি ক্লাস নির্বাচন করুন</p>
                                    </div>
                                ) : (routineData[selectedDayName]?.length > 0) ? (
                                    <div className="space-y-4">
                                        {(() => {
                                            // Group periods by start and end time
                                            const groupedPeriods = routineData[selectedDayName].reduce((groups, period) => {
                                                const timeKey = `${period.startTime}-${period.endTime}`;
                                                if (!groups[timeKey]) groups[timeKey] = [];
                                                groups[timeKey].push(period);
                                                return groups;
                                            }, {});

                                            return Object.values(groupedPeriods).map((group, groupIdx) => {
                                                const { startTime, endTime } = group[0];
                                                const isSplit = group.length > 1;

                                                return (
                                                    <div key={groupIdx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-stretch gap-4 hover:shadow-md transition-all group/card relative overflow-hidden border-l-4 border-l-purple-500">
                                                        
                                                        {/* Time Block (Rendered once) */}
                                                        <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-100 pr-4 self-start pt-2">
                                                            <span className="text-lg font-black text-purple-700 leading-none">{startTime}</span>
                                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">to</span>
                                                            <span className="text-xs text-gray-500 font-black mt-1">{endTime}</span>
                                                        </div>

                                                        {/* Subjects Block */}
                                                        <div className="flex-1 flex flex-col gap-2 justify-center py-1">
                                                            {group.map((period, pIdx) => (
                                                                <div key={pIdx} className={`flex flex-col ${isSplit ? 'bg-purple-50/50 p-3 rounded-xl border border-purple-50' : ''}`}>
                                                                    <div className="flex justify-between items-start">
                                                                        <h3 className="font-bold text-gray-800 text-base leading-tight group-hover/card:text-purple-700 transition-colors">
                                                                            {period.subjectName}
                                                                        </h3>
                                                                        {isSplit && (
                                                                            <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-widest ml-2">
                                                                                Split / Choice
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                                                            {routineView === 'teacher' ? <Users size={10}/> : <User size={10}/>}
                                                                            {routineView === 'teacher' ? period.className : period.teacherName}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                                        <CalendarIcon size={48} className="mb-3 opacity-20" />
                                        <p className="font-bold uppercase text-sm">No classes | কোনো ক্লাস নেই | कोई कक्षा नहीं</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CALENDAR */}
                    <div className="lg:col-span-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
                            <div className="flex flex-col mb-4 border-b border-gray-100 pb-2">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2 leading-none">
                                    <CalendarIcon size={18} className="text-purple-600"/> Monthly Calendar
                                </h3>
                                <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 ml-7">মাসিক ক্যালেন্ডার | मासिक कैलेंडर</span>
                            </div>

                            <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded-md shadow-sm"><ChevronLeft size={16}/></button>
                                <span className="text-sm font-bold text-gray-800">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded-md shadow-sm"><ChevronRight size={16}/></button>
                            </div>

                            <div className="grid grid-cols-7 text-center mb-2">
                                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-xs font-bold text-gray-400 py-1">{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array(getFirstDayOfMonth(currentMonth)).fill(null).map((_, i) => <div key={`e-${i}`} className="h-9"/>)}
                                {Array(getDaysInMonth(currentMonth)).fill(null).map((_, i) => {
                                    const day = i + 1;
                                    const dObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                    const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth();
                                    const isTodayDate = isToday(dObj);
                                    const dayName = dObj.toLocaleString('en-US', { weekday: 'long' });
                                    const hasClasses = routineData[dayName] && routineData[dayName].length > 0;

                                    return (
                                        <button 
                                            key={day}
                                            onClick={() => setSelectedDate(dObj)}
                                            className={`h-9 w-9 mx-auto rounded-lg text-sm flex flex-col items-center justify-center relative transition-all
                                                ${isSelected ? 'bg-purple-600 text-white font-bold shadow-md' : 'hover:bg-purple-50 text-gray-700'}
                                                ${isTodayDate && !isSelected ? 'border border-purple-600 text-purple-700 font-bold' : ''}
                                                ${!hasClasses && !isSelected ? 'opacity-40' : ''}
                                            `}
                                        >
                                            {day}
                                            {hasClasses && !isSelected && <span className="absolute bottom-1 w-1 h-1 bg-purple-400 rounded-full"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* BOTTOM: WEEKLY OVERVIEW */}
                 <div className="mt-8 border-t border-gray-200 pt-8">
                    <div className="flex flex-col mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 leading-none">
                            <List className="text-purple-600" size={20} /> Weekly Overview
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase mt-1 ml-7">সাপ্তাহিক ওভারভিউ | साप्ताहिक अवलोकन</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {daysOfWeek.map(day => {
                            const periods = routineData[day] || [];
                            if (periods.length === 0) return null;
                            return (
                                <div key={day} className="flex flex-col md:flex-row group">
                                    <div className="w-32 bg-gray-50 p-4 font-bold text-gray-500 flex flex-col items-center justify-center border-r border-gray-100 shrink-0">
                                        <span className="leading-none">{day}</span>
                                        <span className="text-[8px] opacity-60 mt-1 uppercase">দিন | दिन</span>
                                    </div>
                                    <div className="flex-1 p-3 flex gap-3 overflow-x-auto">
                                        {(() => {
                                            // Group weekly periods by time as well
                                            const groupedWeekly = periods.reduce((acc, p) => {
                                                const tk = `${p.startTime}-${p.endTime}`;
                                                if(!acc[tk]) acc[tk] = [];
                                                acc[tk].push(p);
                                                return acc;
                                            }, {});

                                            return Object.values(groupedWeekly).map((group, gIdx) => (
                                                <div key={gIdx} className="min-w-[150px] bg-purple-50/40 border border-purple-100 p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all flex flex-col gap-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="text-[10px] font-bold text-purple-600 leading-none">
                                                            {group[0].startTime} - {group[0].endTime}
                                                        </div>
                                                        {group.length > 1 && (
                                                            <span className="text-[7px] font-black bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded uppercase">Split</span>
                                                        )}
                                                    </div>
                                                    
                                                    {group.map((p, i) => (
                                                        <div key={i} className={`flex flex-col ${group.length > 1 && i !== 0 ? 'border-t border-purple-100/60 pt-1.5 mt-0.5' : ''}`}>
                                                            <div className="text-xs font-bold text-gray-800 truncate">{p.subjectName}</div>
                                                            <div className="text-[10px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                                                                {routineView === 'teacher' ? <Users size={10} className="text-gray-400"/> : <User size={10} className="text-gray-400"/>}
                                                                {routineView === 'teacher' ? p.className : p.teacherName}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 </div>
               </div>
             )}

             {/* ==================== SYLLABUS TAB ==================== */}
             {activeTab === 'syllabus' && (
               <div className="animate-in fade-in slide-in-from-bottom-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[600px]">
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                     <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Select Class</label>
                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1 uppercase">ক্লাস নির্বাচন করুন | कक्षा चुनें</p>
                        <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-gray-700"
                            value={selectedClassForSyllabus}
                            onChange={(e) => { setSelectedClassForSyllabus(e.target.value); setSelectedSubjectForSyllabus(''); }}
                        >
                            <option value="">Choose Class | ক্লাস বেছে নিন</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Select Subject</label>
                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1 uppercase">বিষয় নির্বাচন করুন | विषय चुनें</p>
                        <select 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-gray-700 disabled:opacity-50"
                            disabled={!selectedClassForSyllabus}
                            value={selectedSubjectForSyllabus}
                            onChange={(e) => setSelectedSubjectForSyllabus(e.target.value)}
                        >
                            <option value="">Choose Subject | বিষয় বেছে নিন</option>
                            {syllabusSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>
                  </div>

                  {selectedClassForSyllabus && selectedSubjectForSyllabus ? (
                      <div className="space-y-4">
                        <div className="flex flex-col border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-bold text-gray-800 text-lg leading-none">Course Content</h3>
                            <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">কোর্স কন্টেন্ট | पाठ्यक्रम सामग्री</span>
                        </div>
                        {currentSyllabus.length > 0 ? (
                            <div className="grid gap-4">
                                {currentSyllabus.map((item, index) => (
                                    <div key={index} className="flex gap-4 p-5 rounded-xl border border-purple-100 bg-purple-50/20 hover:bg-white hover:shadow-md transition-all group">
                                        <div className="flex flex-col items-center justify-center min-w-[60px] bg-purple-100 rounded-lg text-purple-700 shadow-inner">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-purple-900 text-lg leading-tight">{getExamName(selectedClassForSyllabus, item.examId)}</h4>
                                                <span className="text-[10px] font-bold bg-white border border-purple-100 px-2 py-1 rounded text-purple-600 uppercase">
                                                    {item.duration || 'N/A'}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                                                {item.topics}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                                <p className="text-gray-500 font-bold">No syllabus found | কোনো সিলেবাস নেই</p>
                            </div>
                        )}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                          <BookOpen size={64} className="text-gray-200 mb-4" />
                          <h3 className="text-xl font-bold text-gray-400">Syllabus Viewer</h3>
                          <p className="text-[10px] font-bold text-purple-300 uppercase mt-1">সিলেবাস ভিউয়ার | पाठ्यक्रम दर्शक</p>
                          <p className="text-gray-400 mt-2 text-sm">Select class & subject to view | ক্লাস ও বিষয় নির্বাচন করুন</p>
                      </div>
                  )}
               </div>
             )}
           </>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default AcademicSchedule;