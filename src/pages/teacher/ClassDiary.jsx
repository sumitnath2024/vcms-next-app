import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Search, Loader2, Calendar, PenTool, Save, Clock, User, CheckCircle, List, FileText, Edit3, Plus, X
} from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const ClassDiary = () => {
  const { userData } = useTeacherUser();
  
  // --- State Management ---
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [sessionDocId, setSessionDocId] = useState(''); 
  const [sessionName, setSessionName] = useState('');
  const [allClasses, setAllClasses] = useState([]); 
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [selectedClassId, setSelectedClassId] = useState('');
  
  const [dailyRoutine, setDailyRoutine] = useState([]); 
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [selectedRoutineItem, setSelectedRoutineItem] = useState(null);

  const [diaryContent, setDiaryContent] = useState({
    topic: '',
    homework: '',
    remarks: ''
  });
  
  const [editingDiaryId, setEditingDiaryId] = useState(null); 
  const [showForm, setShowForm] = useState(false); 
  
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setIsClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true)); 
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const sessionData = docSnap.data();
          setSessionDocId(docSnap.id);
          setSessionName(sessionData.name);
          setAllClasses(sessionData.classes || []);
        }
      } catch (e) { console.error("Error fetching session:", e); } 
      finally { setLoading(false); }
    };
    fetchSession();
  }, []);

  const { allDiaries, diaryMap } = useMemo(() => {
    if (!selectedClassId || !selectedDate || allClasses.length === 0) {
      return { allDiaries: [], diaryMap: new Map() };
    }
    const currentClass = allClasses.find(c => c.name === selectedClassId);
    const rawDiaries = currentClass?.diaries || [];
    const filteredDiaries = rawDiaries.filter(d => d.date === selectedDate);
    const map = new Map();
    filteredDiaries.forEach(d => {
        const uniqueKey = `${d.subject}_${d.startTime}`;
        map.set(uniqueKey, d); 
    });
    return { allDiaries: filteredDiaries, diaryMap: map };
  }, [allClasses, selectedClassId, selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const dateObj = new Date(selectedDate);
    const currentDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
    setDayOfWeek(currentDayName);

    if (!selectedClassId) {
      setDailyRoutine([]);
      setSelectedRoutineItem(null);
      return;
    }
    const currentClass = allClasses.find(c => c.name === selectedClassId);
    if (currentClass && Array.isArray(currentClass.routine)) {
      const todaysClasses = currentClass.routine.filter(item => item.day === currentDayName);
      todaysClasses.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setDailyRoutine(todaysClasses);
    } else {
      setDailyRoutine([]);
    }
    setSelectedRoutineItem(null);
    setDiaryContent({ topic: '', homework: '', remarks: '' });
    setEditingDiaryId(null);
    setShowForm(false);
  }, [selectedClassId, allClasses, selectedDate]);

  const getTimeStatus = (startStr, endStr) => {
    if (!startStr || !endStr) return { status: 'Pending', label: 'বাকি | लंबित', color: 'text-gray-400', bg: 'bg-gray-100' };
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startTime = new Date(); startTime.setHours(startH, startM, 0);
    const endTime = new Date(); endTime.setHours(endH, endM, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    if (selectedDate < todayStr) return { status: 'Over', label: 'শেষ | समाप्त', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (selectedDate > todayStr) return { status: 'Pending', label: 'বাকি | लंबित', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (now < startTime) return { status: 'Pending', label: 'বাকি | लंबित', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (now >= startTime && now <= endTime) return { status: 'Running', label: 'চলছে | चल रहा है', color: 'text-green-600', bg: 'bg-green-100 animate-pulse' };
    return { status: 'Over', label: 'শেষ | समाप्त', color: 'text-gray-500', bg: 'bg-gray-200' };
  };

  const handleRoutineClick = (routineItem) => {
    setSelectedRoutineItem(routineItem);
    setDiaryContent({ topic: '', homework: '', remarks: '' });
    setEditingDiaryId(null);
    setShowForm(false); 
    setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !selectedRoutineItem || !diaryContent.topic) {
      alert("Please enter a Topic.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        subject: selectedRoutineItem.subjectName, 
        subjectId: selectedRoutineItem.subjectId || null,
        startTime: selectedRoutineItem.startTime, 
        endTime: selectedRoutineItem.endTime,
        date: selectedDate,
        day: dayOfWeek,
        topic: diaryContent.topic,
        homework: diaryContent.homework,
        remarks: diaryContent.remarks,
        teacherUid: userData.uid,
        teacherName: userData.name,
        updatedAt: new Date().toISOString() 
      };

      const sessionRef = doc(db, 'academicSessions', sessionDocId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session not found");

      const sessionData = sessionSnap.data();
      const currentClasses = sessionData.classes || [];

      const updatedClasses = currentClasses.map(cls => {
        if (cls.name === selectedClassId) {
            const existingDiaries = cls.diaries || [];
            let newDiariesList;
            if (editingDiaryId) {
                newDiariesList = existingDiaries.map(d => d.id === editingDiaryId ? { ...d, ...payload } : d);
            } else {
                const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                newDiariesList = [...existingDiaries, { ...payload, id: newId, createdAt: new Date().toISOString() }];
            }
            return { ...cls, diaries: newDiariesList };
        }
        return cls;
      });

      await updateDoc(sessionRef, { classes: updatedClasses });
      
      try {
        const targetClass = currentClasses.find(c => c.name === selectedClassId);
        if (targetClass && targetClass.students) {
          const studentUids = targetClass.students.map(s => s.uid || s.id).filter(Boolean);
          if (studentUids.length > 0) {
            const sendBulkPushNotification = httpsCallable(functions, 'sendBulkPushNotification');
            const actionWord = editingDiaryId ? 'Updated' : 'Posted';
			await sendBulkPushNotification({
			  targetUids: studentUids,
			  title: `Class Diary Update - ${selectedClassId}`,
			  body: `Your teacher, ${userData.name}, has ${actionWord.toLowerCase()} the daily diary for ${selectedRoutineItem.subjectName}. Topic: ${diaryContent.topic}`
			});
          }
        }
      } catch (notifError) { console.error(notifError); }

      setAllClasses(updatedClasses);
      setShowForm(false);
      setEditingDiaryId(null);
      setDiaryContent({ topic: '', homework: '', remarks: '' });
      alert("Success!");
    } catch (error) { alert("Failed to save."); } 
    finally { setSubmitting(false); }
  };

  const filteredClassList = useMemo(() => {
    return allClasses.filter(cls => cls.name.toLowerCase().includes(classSearchTerm.toLowerCase()));
  }, [allClasses, classSearchTerm]);

  return (
    <TeacherDashboardLayout>
      <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-6 space-y-6">
        
        {/* --- HEADER --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row items-center justify-between gap-6 z-30">
          <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-purple-600 flex-shrink-0">
              <BookOpen size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight leading-none">Class Diary</h1>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ক্লাস ডায়েরি | कक्षा डायरी</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{sessionName}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-72" ref={classDropdownRef}>
              <div className="relative cursor-pointer" onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input 
                  type="text"
                  placeholder="Select Class... | ক্লাস নির্বাচন করুন..."
                  value={isClassDropdownOpen ? classSearchTerm : (selectedClassId || classSearchTerm)}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer"
                />
              </div>
              {isClassDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 p-2">
                  {filteredClassList.length > 0 ? filteredClassList.map(cls => (
                    <div 
                      key={cls.name} 
                      onClick={() => { setSelectedClassId(cls.name); setIsClassDropdownOpen(false); setClassSearchTerm(''); }} 
                      className={`px-4 py-3 rounded-xl text-base font-medium cursor-pointer transition-colors ${selectedClassId === cls.name ? 'bg-purple-600 text-white' : 'hover:bg-purple-50 text-gray-700'}`}
                    >
                      {cls.name}
                    </div>
                  )) : (
                    <div className="p-4 text-center text-gray-400 text-sm">No classes found</div>
                  )}
                </div>
              )}
            </div>

            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto pl-5 pr-5 py-4 border border-gray-200 rounded-2xl text-lg font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-purple-100"
            />
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 overflow-y-auto pb-10">
          {!selectedClassId ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-300">
              <Calendar size={80} className="mb-6 opacity-10" />
              <div className="text-center">
                <p className="font-bold text-gray-400 uppercase text-lg tracking-widest">Select a Class</p>
                <p className="text-xs font-bold text-gray-300 uppercase">একটি ক্লাস নির্বাচন করুন | एक कक्षा चुनें</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col xl:flex-row gap-8 max-w-7xl mx-auto">
              
              {/* LEFT: ROUTINE GRID */}
              <div className="flex-1">
                 <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                        <Clock className="text-purple-600" size={24} />
                        {dayOfWeek}'s Schedule
                    </h3>
                    <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase ml-8">সময়সূচী | समय सारणी</p>
                 </div>

                 {dailyRoutine.length === 0 ? (
                    <div className="p-8 text-center bg-orange-50 rounded-2xl border border-orange-100 text-orange-400 font-bold">
                        No classes found for {dayOfWeek}.
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {dailyRoutine.map((item, idx) => {
                            const hasEntries = allDiaries.some(d => d.subject === item.subjectName && d.startTime === item.startTime);
                            const isSelected = selectedRoutineItem && selectedRoutineItem.startTime === item.startTime && selectedRoutineItem.subjectName === item.subjectName;
                            const timeStatus = getTimeStatus(item.startTime, item.endTime);
                            const isMyClass = item.teacherName === userData.name;

                            return (
                                <div 
                                    key={idx}
                                    onClick={() => handleRoutineClick(item)}
                                    className={`group cursor-pointer relative p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-3
                                        ${isSelected 
                                            ? 'bg-gray-900 border-gray-900 shadow-xl scale-[1.02] z-10' 
                                            : hasEntries 
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-white border-gray-100 hover:border-purple-200'
                                        }
                                        ${isMyClass && !isSelected && !hasEntries ? 'ring-2 ring-purple-400 ring-offset-2 animate-pulse' : ''} 
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className={`flex flex-col items-start gap-0.5 px-2 py-1 rounded-md ${timeStatus.bg} ${timeStatus.color}`}>
                                            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 leading-none">
                                                {timeStatus.status === 'Running' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"/>}
                                                {timeStatus.status}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-70 leading-none">{timeStatus.label}</span>
                                        </div>
                                        
                                        {hasEntries && (
                                            <div className="bg-green-500 text-white p-1 rounded-full"><CheckCircle size={14} /></div>
                                        )}
                                    </div>
                                    
                                    <div>
                                        <h4 className={`font-bold text-lg leading-tight mb-1 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                                            {item.subjectName}
                                        </h4>
                                        <p className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                                            {item.startTime} - {item.endTime}
                                        </p>
                                    </div>
                                    
                                    <div className={`flex items-center gap-2 text-sm font-medium mt-1 pt-3 border-t ${isSelected ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-500'}`}>
                                        <User size={14} />
                                        <div className="flex flex-col">
                                            <span className={`leading-none ${isMyClass ? "text-purple-600 font-bold" : ""}`}>
                                                {isMyClass ? "You" : (item.teacherName || "No Teacher")}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-60">{isMyClass ? "আপনি | आप" : "শিক্ষক | शिक्षक"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 )}
              </div>

              {/* RIGHT: DETAILS PANEL */}
              <div ref={formRef} className="flex-1 min-h-[500px]">
                 {selectedRoutineItem ? (
                    <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                             <div>
                                <h3 className="text-2xl font-black text-gray-800">{selectedRoutineItem.subjectName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-bold uppercase">
                                        {selectedRoutineItem.startTime}
                                    </span>
                                    <span className="text-gray-400 font-bold text-sm uppercase tracking-wide">• {dayOfWeek}</span>
                                </div>
                             </div>
                             {!showForm && (
                                 <button 
                                    onClick={() => { setShowForm(true); setEditingDiaryId(null); setDiaryContent({topic:'', homework:'', remarks:''}); }}
                                    className="h-12 px-6 bg-purple-600 text-white rounded-full flex flex-col items-center justify-center font-bold shadow-lg transition-transform hover:scale-105"
                                 >
                                    <div className="flex items-center gap-2 leading-none"><Plus size={18} /> Add Entry</div>
                                    <span className="text-[9px] font-medium opacity-80 mt-1">যোগ করুন | जोड़ें</span>
                                 </button>
                             )}
                        </div>

                        {allDiaries.filter(d => d.subject === selectedRoutineItem.subjectName && d.startTime === selectedRoutineItem.startTime).length > 0 && !showForm && (
                            <div className="space-y-4">
                                <div className="ml-1">
                                    <h4 className="font-bold text-gray-400 text-sm uppercase tracking-widest leading-none">Posted Entries</h4>
                                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">পোস্ট করা তথ্য | पोस्ट की गई एंट्री</p>
                                </div>
                                {allDiaries.filter(d => d.subject === selectedRoutineItem.subjectName && d.startTime === selectedRoutineItem.startTime).map((entry) => {
                                    const isMyEntry = entry.teacherUid === userData.uid;
                                    return (
                                        <div key={entry.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${isMyEntry ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    <User size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className={`text-sm font-bold leading-none ${isMyEntry ? 'text-purple-700' : 'text-gray-800'}`}>
                                                        {isMyEntry ? "You" : entry.teacherName}
                                                    </p>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">Posted By | পোস্ট করেছেন</span>
                                                </div>
                                                {isMyEntry && (
                                                    <button onClick={() => { setDiaryContent({topic:entry.topic, homework:entry.homework, remarks:entry.remarks}); setEditingDiaryId(entry.id); setShowForm(true); }} className="absolute top-5 right-5 p-2 bg-gray-50 text-gray-400 rounded-full"><Edit3 size={16} /></button>
                                                )}
                                            </div>
                                            <div className="pl-11 space-y-2">
                                                <p className="text-gray-800 font-medium"><span className="text-gray-400 text-[10px] font-black uppercase mr-2">Topic:</span>{entry.topic}</p>
                                                {entry.homework && <p className="text-gray-600 text-sm"><span className="text-gray-400 text-[10px] font-black uppercase mr-2">HW:</span>{entry.homework}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {showForm && (
                            <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-purple-100 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                                     <div className="flex flex-col">
                                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 leading-none">
                                            {editingDiaryId ? <Edit3 size={18} className="text-blue-500"/> : <PenTool size={18} className="text-purple-500"/>}
                                            {editingDiaryId ? "Editing Entry" : "New Entry"}
                                        </h3>
                                        <span className="text-[9px] font-bold text-purple-600 mt-1 uppercase">ডায়েরি লিখুন | डायरी लिखें</span>
                                     </div>
                                     <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Topic / Lesson</label>
                                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1">আলোচনার বিষয় | विषय / पाठ</p>
                                        <input type="text" value={diaryContent.topic} onChange={(e) => setDiaryContent({...diaryContent, topic: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-xl font-semibold outline-none focus:ring-4 focus:ring-purple-50 transition-all"/>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Homework</label>
                                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1">বাড়ির কাজ | गृहकार्य</p>
                                        <textarea rows="2" value={diaryContent.homework} onChange={(e) => setDiaryContent({...diaryContent, homework: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:ring-4 focus:ring-purple-50 transition-all resize-none"></textarea>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Remarks</label>
                                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1">মন্তব্য | टिप्पणी</p>
                                        <textarea rows="1" value={diaryContent.remarks} onChange={(e) => setDiaryContent({...diaryContent, remarks: e.target.value})} className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:ring-4 focus:ring-purple-50 transition-all resize-none"></textarea>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => setShowForm(false)} className="flex-1 py-4 rounded-xl text-sm font-bold text-gray-500 bg-gray-100">Cancel | বাতিল</button>
                                        <button 
                                            onClick={handleSubmit} 
                                            disabled={submitting} 
                                            className="flex-1 py-4 bg-gray-900 text-white rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-gray-200"
                                        >
                                            <div className="flex items-center gap-2 leading-none">{submitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingDiaryId ? 'Update' : 'Post'}</div>
                                            <span className="text-[9px] font-medium opacity-80">সেভ করুন | सुरक्षित करें</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {allDiaries.filter(d => d.subject === selectedRoutineItem.subjectName && d.startTime === selectedRoutineItem.startTime).length === 0 && !showForm && (
                            <div className="p-10 text-center border-2 border-dashed rounded-3xl text-gray-300 flex flex-col items-center">
                                <FileText size={40} className="mb-3 opacity-50" />
                                <p className="font-bold uppercase tracking-widest text-sm">No entries yet</p>
                                <p className="text-[10px] font-bold opacity-60">কোনো তথ্য নেই | कोई प्रविष्टि नहीं</p>
                            </div>
                        )}
                    </div>

                 ) : (
                    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b">
                             <div className="flex flex-col">
                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                                    <List className="text-purple-600" size={24} /> Today's Overview
                                </h3>
                                <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase ml-8">আজকের বিবরণ | आज का विवरण</p>
                             </div>
                             <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{allDiaries.length} Entries</span>
                        </div>
                        
                        {allDiaries.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                                <FileText size={40} className="mb-4 opacity-20" />
                                <p className="font-bold uppercase tracking-widest text-sm text-center leading-tight">No entries posted yet.<br/><span className="text-[10px]">এখনও কোনো তথ্য যোগ করা হয়নি</span></p>
                            </div>
                        ) : (
                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {allDiaries.map((entry) => (
                                    <div key={entry.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4">
                                        <div className="flex flex-col items-center gap-1 min-w-[60px]">
                                            <span className="text-xs font-black bg-white px-2 py-1 rounded text-gray-600 border shadow-sm">{entry.startTime}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-lg leading-tight">{entry.subject}</h4>
                                            <p className="text-gray-600 font-medium text-sm my-1">{entry.topic}</p>
                                            <div className="flex items-center gap-2 mt-2 opacity-60">
                                                <User size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-tight">{entry.teacherName}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

export default ClassDiary;