import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, Loader2, AlertCircle, CheckCircle, 
  ChevronRight, Calculator, User, BookOpen, Menu, Lock, Eye
} from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, updateDoc, getDoc 
} from 'firebase/firestore';
import { db } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const MarksEntry = () => {
  const { userData } = useTeacherUser();
  
  // Data States
  const [activeSession, setActiveSession] = useState(null);
  const [classes, setClasses] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [saveStatus, setSaveStatus] = useState({}); 

  // Selection States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // Logic States
  const [marksData, setMarksData] = useState({});
  const [editableFullMarks, setEditableFullMarks] = useState(0);

  // 1. Fetch Active Session
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sessionData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setActiveSession(sessionData);
          setClasses(sessionData.classes || []);
        }
      } catch (e) {
        showNotification('error', "Failed to load session data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  // 2. Helpers
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const students = useMemo(() => currentClass?.students || [], [currentClass]);
  const availableExams = useMemo(() => currentClass?.exams || [], [currentClass]);
  
  const mySubjects = useMemo(() => {
    if (!currentClass || !userData) return [];
    const allSubjects = currentClass.subjects || currentClass.books || [];

    return allSubjects.filter(sub => {
        if (sub.teacherId && userData.uid) {
            return sub.teacherId === userData.uid;
        }
        const subTeacherName = sub.teacher ? sub.teacher.trim() : "";
        const myName = userData.name ? userData.name.trim() : "";
        return subTeacherName === myName;
    });
  }, [currentClass, userData]);

  const currentSubject = useMemo(() => 
    mySubjects.find(s => s.id === selectedSubjectId), 
  [mySubjects, selectedSubjectId]);

  const currentExam = useMemo(() => 
    availableExams.find(ex => ex.id === selectedExamId),
  [availableExams, selectedExamId]);

  const currentScheduleStatus = useMemo(() => {
    if (!currentClass || !selectedExamId || !selectedSubjectId) return null;
    const schedules = currentClass.examSchedules || [];
    for (const schedule of schedules) {
        if (schedule.examId === selectedExamId && schedule.subjectId === selectedSubjectId) {
            return schedule.status;
        }
        if (schedule.allocations && Array.isArray(schedule.allocations)) {
            const matchingAllocation = schedule.allocations.find(alloc => 
                alloc.examId === selectedExamId && alloc.subjectId === selectedSubjectId
            );
            if (matchingAllocation && matchingAllocation.status) {
                return matchingAllocation.status;
            }
        }
    }
    return null; 
  }, [currentClass, selectedExamId, selectedSubjectId]);

  const isEditable = currentScheduleStatus === 'OPEN';
  const isViewOnly = currentScheduleStatus === 'PUBLISHED';
  const showContent = isEditable || isViewOnly;

  // 3. LOAD DATA (MARKS ONLY)
  useEffect(() => {
    if (!currentSubject || !selectedExamId || !currentClass) {
      setMarksData({});
      setEditableFullMarks(0);
      return;
    }

    const dbFullMarks = currentSubject.examMarks?.[selectedExamId];
    let finalFullMarks = 100;
    if (dbFullMarks) {
      finalFullMarks = parseFloat(dbFullMarks);
    } else if (currentExam?.fullMarks) {
      finalFullMarks = parseFloat(currentExam.fullMarks);
    }
    setEditableFullMarks(finalFullMarks);

    const loadedMarks = {};

    currentClass.students.forEach(std => {
        if (std.results) {
            const foundResult = std.results.find(r => 
                r.examId === selectedExamId && 
                r.subjectId === currentSubject.id
            );
            if (foundResult) {
                loadedMarks[std.uid] = foundResult.obtainedMarks;
            }
        }
    });
    setMarksData(loadedMarks);
    setSaveStatus({});
  }, [currentSubject, selectedExamId, currentClass, currentExam]);

  const handleMarksChange = (studentUid, value) => {
    if (!isEditable) return; 
    if (value < 0) return;
    setMarksData(prev => ({ ...prev, [studentUid]: value }));
    setSaveStatus(prev => ({ ...prev, [studentUid]: 'idle' }));
  };

  const saveSingleResult = async (studentUid) => {
    if (!isEditable) return;
    const markToSave = marksData[studentUid];

    if (markToSave === '' || markToSave === undefined) return;
    if (parseFloat(markToSave) > editableFullMarks) {
        showNotification('error', `Mark exceeds max limit (${editableFullMarks})`);
        setSaveStatus(prev => ({ ...prev, [studentUid]: 'error' }));
        return;
    }

    setSaveStatus(prev => ({ ...prev, [studentUid]: 'saving' }));

    try {
        const sessionRef = doc(db, 'academicSessions', activeSession.id);
        const sessionSnap = await getDoc(sessionRef);
        if (!sessionSnap.exists()) throw new Error("Session lost");

        const freshClasses = sessionSnap.data().classes;
        const updatedClasses = freshClasses.map(cls => {
            if (cls.id === selectedClassId) {
                const updatedStudents = cls.students.map(std => {
                    if (std.uid === studentUid) {
                        const resultEntry = {
                            examId: selectedExamId,
                            examName: currentExam?.name || 'Unknown',
                            subjectId: currentSubject.id,
                            subjectName: currentSubject.name,
                            fullMarks: editableFullMarks,
                            obtainedMarks: markToSave,
                            teacher: userData?.name || 'Unknown',
                            teacherUid: userData?.uid || 'Unknown',
                            lastUpdated: new Date().toISOString()
                        };
                        let existingResults = std.results ? [...std.results] : [];
                        existingResults = existingResults.filter(r => 
                            !(r.examId === selectedExamId && r.subjectId === currentSubject.id)
                        );
                        existingResults.push(resultEntry);
                        return { ...std, results: existingResults };
                    }
                    return std;
                });
                return { ...cls, students: updatedStudents };
            }
            return cls;
        });

        await updateDoc(sessionRef, { classes: updatedClasses });
        setActiveSession(prev => ({ ...prev, classes: updatedClasses }));
        setClasses(updatedClasses);
        setSaveStatus(prev => ({ ...prev, [studentUid]: 'saved' }));
    } catch (e) {
        console.error("Auto-save failed:", e);
        setSaveStatus(prev => ({ ...prev, [studentUid]: 'error' }));
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-8 font-sans bg-gray-50 min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-none">Marks Entry</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-purple-600 mt-2 uppercase tracking-wide">নম্বর এন্ট্রি | अंक प्रविष्टि</p>
            <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 mt-2">
              <span className={`h-2 w-2 rounded-full animate-pulse ${isEditable ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {isEditable ? 'Auto-Save Enabled (অটো-সেভ সক্রিয় | ऑटो-सेव सक्षम)' : isViewOnly ? 'View Only Mode (শুধুমাত্র দেখার জন্য | केवल देखने के लिए)' : 'Selection Required (নির্বাচন প্রয়োজন | चयन आवश्यक)'}
            </p>
          </div>
          
          {notification && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-4 fade-in ${
              notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {notification.type === 'success' ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
              {notification.message}
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                {/* Class */}
                <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Class</label>
                    <p className="text-[9px] font-bold text-purple-400 uppercase leading-none">ক্লাস | कक्षा</p>
                    <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                        value={selectedClassId}
                        onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubjectId(''); }}
                    >
                        <option value="">Select Class | ক্লাস বেছে নিন</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Exam */}
                <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Exam</label>
                    <p className="text-[9px] font-bold text-purple-400 uppercase leading-none">পরীক্ষা | परीक्षा</p>
                    <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 mt-2"
                        disabled={!selectedClassId}
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                        <option value="">Select Exam | পরীক্ষা বেছে নিন</option>
                        {availableExams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Subject</label>
                    <p className="text-[9px] font-bold text-purple-400 uppercase leading-none">বিষয় | विषय</p>
                    <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 mt-2"
                        disabled={!selectedExamId}
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                    >
                        <option value="">Select Subject | বিষয় বেছে নিন</option>
                        {mySubjects.length === 0 && selectedClassId ? (
                             <option value="" disabled>No subjects assigned (কোনো বিষয় নেই)</option>
                        ) : (
                             mySubjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)
                        )}
                    </select>
                </div>
            </div>
        </div>

        {/* STATUS MESSAGE */}
        {selectedSubjectId && selectedExamId && !showContent && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in">
                <div className="bg-orange-100 p-4 rounded-full mb-4">
                    <Lock className="text-orange-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 leading-none">Entry Not Available</h3>
                <p className="text-[10px] font-bold text-orange-400 uppercase mt-2">এন্ট্রি অনুমোদিত নয় | प्रविष्टि उपलब्ध नहीं है</p>
                <p className="text-gray-500 text-sm mt-3 max-w-md">
                    Marks entry for this subject is currently 
                    <span className="font-bold text-orange-600 uppercase"> {currentScheduleStatus || "NOT SCHEDULED (নির্ধারিত নয়)"} </span>.
                </p>
            </div>
        )}

        {/* ENTRY AREA */}
        {selectedSubjectId && selectedExamId && showContent && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-md border border-gray-200 flex justify-between items-center">
               <div>
                   <h2 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tight truncate max-w-[200px] leading-none">{currentSubject.name}</h2>
                   <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{students.length} Students (ছাত্র)</p>
                        {isViewOnly && (
                            <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-200 flex items-center gap-1">
                                <Eye size={10} /> Published (প্রকাশিত | प्रकाशित)
                            </span>
                        )}
                   </div>
               </div>
               <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                   <div className="text-right">
                       <p className="text-[9px] font-bold text-gray-400 uppercase leading-none">Max Marks</p>
                       <p className="text-[8px] font-bold text-purple-400 uppercase leading-none mt-1">সর্বোচ্চ | अधिकतम</p>
                       <p className="text-lg font-black text-gray-800 leading-none mt-1">{editableFullMarks}</p>
                   </div>
                   <Calculator size={18} className="text-blue-500" />
               </div>
            </div>

            {/* --- DESKTOP VIEW (Table) --- */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 w-32">
                        <p className="text-xs font-black text-gray-400 uppercase leading-none">Roll</p>
                        <p className="text-[8px] font-bold text-purple-400 uppercase mt-1">রোল | अनुक्र.</p>
                      </th>
                      <th className="px-6 py-4">
                        <p className="text-xs font-black text-gray-400 uppercase leading-none">Student Name</p>
                        <p className="text-[8px] font-bold text-purple-400 uppercase mt-1">ছাত্রের নাম | छात्र का नाम</p>
                      </th>
                      <th className="px-6 py-4 text-right w-48">
                        <p className="text-xs font-black text-gray-400 uppercase leading-none">Marks</p>
                        <p className="text-[8px] font-bold text-purple-400 uppercase mt-1">নম্বর | अंक</p>
                      </th>
                      <th className="px-4 py-4 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                       const currentMark = marksData[student.uid] || '';
                       const status = saveStatus[student.uid];
                       return (
                          <tr key={student.uid} className="hover:bg-blue-50/30">
                            <td className="px-6 py-4 font-mono text-sm text-gray-500">{student.rollNo}</td>
                            <td className="px-6 py-4 font-bold text-gray-700">{student.name}</td>
                            <td className="px-6 py-4 text-right">
                                <input 
                                    type="number" 
                                    disabled={!isEditable} 
                                    className={`w-full p-2 text-right font-bold rounded-lg border outline-none focus:ring-2 focus:ring-blue-100 transition-colors
                                        ${status === 'saved' ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200'}
                                        ${!isEditable ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}
                                    `}
                                    value={currentMark}
                                    onChange={(e) => handleMarksChange(student.uid, e.target.value)}
                                    onBlur={() => saveSingleResult(student.uid)}
                                />
                            </td>
                            <td className="px-4 py-4 text-center">
                                {status === 'saving' && <Loader2 size={16} className="animate-spin text-blue-500" />}
                                {status === 'saved' && <CheckCircle size={16} className="text-green-500" />}
                                {status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                            </td>
                          </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- MOBILE VIEW (Cards) --- */}
            <div className="md:hidden space-y-3 pb-20">
              {students.map((student) => {
                 const currentMark = marksData[student.uid] || '';
                 const status = saveStatus[student.uid];
                 const isOverLimit = parseFloat(currentMark) > editableFullMarks;

                 return (
                   <div key={student.uid} className={`p-4 rounded-xl border shadow-sm transition-all ${
                     status === 'saved' ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-100'
                   }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Roll No (রোল নম্বর): {student.rollNo}</span>
                          <h3 className="text-base font-bold text-gray-800 mt-1">{student.name}</h3>
                        </div>
                        <div className="mt-1">
                             {status === 'saving' && <Loader2 size={18} className="animate-spin text-blue-500" />}
                             {status === 'saved' && <CheckCircle size={18} className="text-green-500" />}
                             {status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        {/* Made the input full width since remarks are gone */}
                        <div className="relative w-full">
                             <input 
                                type="number" 
                                inputMode="decimal"
                                disabled={!isEditable}
                                placeholder="-"
                                className={`w-full p-3 text-lg font-black text-center rounded-xl border-2 outline-none transition-all 
                                    ${isOverLimit 
                                      ? 'border-red-300 bg-red-50 text-red-600 focus:border-red-500' 
                                      : 'border-gray-100 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                                    }
                                    ${!isEditable ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-gray-50'}
                                `}
                                value={currentMark}
                                onChange={(e) => handleMarksChange(student.uid, e.target.value)}
                                onBlur={() => saveSingleResult(student.uid)}
                             />
                             <span className="block text-[8px] text-center text-gray-400 font-bold mt-1 uppercase">Marks | প্রাপ্ত অঙ্ক</span>
                             <span className="block text-[8px] text-center text-purple-400 font-bold mt-0.5">/ {editableFullMarks}</span>
                        </div>
                      </div>
                      
                      {isOverLimit && <p className="text-[10px] text-red-500 font-bold mt-1 text-center">Invalid Marks (অকার্যকর নম্বর)</p>}
                   </div>
                 );
              })}
            </div>

          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Loading Data... | লোড হচ্ছে...</p>
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default MarksEntry;