import React, { useState, useEffect, useMemo } from 'react';
import { 
  Loader2, AlertCircle, CheckCircle, Calculator, 
  Users, BookOpen, Save, Award, MessageSquare, Activity, Lock
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const PostRemarks = () => {
  const { userData } = useTeacherUser();
  
  // Data States
  const [activeSession, setActiveSession] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Selection States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  
  // Logic States
  const [formData, setFormData] = useState({});

  // 1. Fetch Active Session & Filter for Class Teacher
  useEffect(() => {
    const fetchSession = async () => {
      if (!userData?.uid) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sessionData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setActiveSession(sessionData);
          
		const classesWhereTeacher = (sessionData.classes || []).filter(
		  cls => cls.classTeacherUid === userData.uid
		);
		setMyClasses(classesWhereTeacher);
        }
      } catch (e) {
        showNotification('error', "Failed to load session data.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [userData]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const currentClass = useMemo(() => myClasses.find(c => c.id === selectedClassId), [myClasses, selectedClassId]);
  const students = useMemo(() => currentClass?.students || [], [currentClass]);
  const availableExams = useMemo(() => currentClass?.exams || [], [currentClass]);

  // NEW: Check if the selected exam is published
  const isPublished = useMemo(() => {
    if (!currentClass || !selectedExamId) return false;
    const schedules = currentClass.examSchedules || [];
    const examSchedules = schedules.filter(sch => sch.examId === selectedExamId);
    
    // If there are schedules and they are all set to PUBLISHED
    return examSchedules.length > 0 && examSchedules.every(sch => sch.status === 'PUBLISHED');
  }, [currentClass, selectedExamId]);

  // 2. Load Existing Data
  useEffect(() => {
    if (!currentClass || !selectedExamId) {
      setFormData({});
      return;
    }

    const loadedData = {};
    students.forEach(std => {
      const existingSummary = (std.examSummaries || []).find(s => s.examId === selectedExamId);
      loadedData[std.uid] = {
        rank: existingSummary?.rank || '',
        studentStrength: existingSummary?.studentStrength || '',
        attendance: existingSummary?.attendance || '',
        conduct: existingSummary?.conduct || '',
        remarks: existingSummary?.remarks || ''
      };
    });
    setFormData(loadedData);
  }, [currentClass, selectedExamId, students]);

  // 3. Auto-Calculate Logic
  const handleCalculate = () => {
    if (isPublished) return; // Guard clause
    if (!currentClass || !selectedExamId) return;

    const allDates = new Set();
    students.forEach(s => {
      if (s.attendance) Object.keys(s.attendance).forEach(d => allDates.add(d));
    });
    const totalWorkingDays = allDates.size;
    const strength = students.length;

    const studentTotals = students.map(s => {
      const totalMarks = (s.results || [])
        .filter(r => r.examId === selectedExamId)
        .reduce((sum, r) => sum + Number(r.obtainedMarks || 0), 0);
      return { uid: s.uid, totalMarks };
    });

    studentTotals.sort((a, b) => b.totalMarks - a.totalMarks);

    const rankMap = {};
    let currentRank = 1;
    let previousTotal = null;

    studentTotals.forEach((st, index) => {
      if (st.totalMarks !== previousTotal) {
        currentRank = index + 1;
      }
      rankMap[st.uid] = st.totalMarks > 0 ? currentRank.toString() : '-';
      previousTotal = st.totalMarks;
    });

    const updatedForm = { ...formData };
    
    students.forEach(std => {
      let presentCount = 0;
      if (std.attendance) {
        Object.values(std.attendance).forEach(record => {
          const status = typeof record === 'string' ? record : record?.status;
          if (status === 'Present') presentCount++;
        });
      }

      updatedForm[std.uid] = {
        ...updatedForm[std.uid],
        rank: rankMap[std.uid],
        studentStrength: strength.toString(),
        attendance: `${presentCount}/${totalWorkingDays}`
      };
    });

    setFormData(updatedForm);
    showNotification('success', "Auto-calculation complete!");
  };

  const handleInputChange = (uid, field, value) => {
    if (isPublished) return; 
    setFormData(prev => ({
      ...prev,
      [uid]: { ...prev[uid], [field]: value }
    }));
  };

  // 5. Save Data
  const handleSaveAll = async () => {
    if (isPublished) {
        alert("Cannot save: Results are already published. Contact Admin to unpublish first.");
        return;
    }
    if (!currentClass || !selectedExamId) return;
    setSaving(true);

    try {
      const sessionRef = doc(db, 'academicSessions', activeSession.id);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session lost");

      const freshClasses = sessionSnap.data().classes;
      const updatedClasses = freshClasses.map(cls => {
        if (cls.id === selectedClassId) {
          const updatedStudents = cls.students.map(std => {
            const studentUpdates = formData[std.uid];
            if (!studentUpdates) return std;

            let existingSummaries = std.examSummaries ? [...std.examSummaries] : [];
            const summaryIndex = existingSummaries.findIndex(s => s.examId === selectedExamId);
            
            const newSummary = {
              examId: selectedExamId,
              ...studentUpdates,
              lastUpdated: new Date().toISOString()
            };

            if (summaryIndex >= 0) {
              existingSummaries[summaryIndex] = newSummary;
            } else {
              existingSummaries.push(newSummary);
            }

            return { ...std, examSummaries: existingSummaries };
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      await updateDoc(sessionRef, { classes: updatedClasses });
      setActiveSession(prev => ({ ...prev, classes: updatedClasses }));
      setMyClasses(updatedClasses); 
      
      showNotification('success', "All remarks and summaries saved successfully!");
    } catch (error) {
      console.error(error);
      showNotification('error', "Failed to save data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-8 font-sans bg-gray-50 min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-none">Post Remarks & Summaries</h1>
            <p className="text-[10px] md:text-[11px] font-bold text-purple-600 mt-2 uppercase tracking-wide">মন্তব্য এবং সারাংশ | टिप्पणी और सारांश</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">My Assigned Classes</label>
                    <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 mt-2"
                        value={selectedClassId}
                        onChange={(e) => { setSelectedClassId(e.target.value); setSelectedExamId(''); }}
                    >
                        <option value="">Select Class | ক্লাস বেছে নিন</option>
                        {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider leading-none">Examination</label>
                    <select 
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 mt-2"
                        disabled={!selectedClassId}
                        value={selectedExamId}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                        <option value="">Select Exam | পরীক্ষা বেছে নিন</option>
                        {availableExams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* ENTRY AREA */}
        {selectedClassId && selectedExamId && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* PUBLISHED WARNING BANNER */}
            {isPublished && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 text-blue-800">
                    <Lock size={20} className="shrink-0" />
                    <div>
                        <p className="font-bold text-sm">Results are Published</p>
                        <p className="text-xs opacity-80 font-medium">These summaries are now visible to students. Editing is disabled to maintain data integrity.</p>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4">
                   <div>
                       <h2 className="text-sm md:text-lg font-black text-gray-800 uppercase tracking-tight">Student Exam Summaries</h2>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{students.length} Students (ছাত্র)</p>
                   </div>
                   {isPublished && (
                       <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">Published</span>
                   )}
               </div>
               <div className="flex items-center gap-3 w-full sm:w-auto">
                   <button 
                     onClick={handleCalculate}
                     disabled={isPublished}
                     className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-colors border ${
                        isPublished ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                     }`}
                   >
                     <Calculator size={18} />
                     <div className="flex flex-col items-start leading-none text-left">
                       <span>Auto-Calculate</span>
                       <span className="text-[8px] opacity-70 mt-0.5 uppercase tracking-widest">Rank, Strength, Attd.</span>
                     </div>
                   </button>
                   <button 
                     onClick={handleSaveAll}
                     disabled={saving || isPublished}
                     className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-colors shadow-lg ${
                        isPublished ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-purple-600 text-white hover:bg-purple-700'
                     }`}
                   >
                     {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     <div className="flex flex-col items-start leading-none text-left">
                       <span>Save All</span>
                       <span className="text-[8px] opacity-80 mt-0.5 uppercase tracking-widest">সংরক্ষণ | सहेजें</span>
                     </div>
                   </button>
               </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 w-48 text-xs font-black text-gray-500 uppercase">Student</th>
                      <th className="px-2 py-4 w-24 text-xs font-black text-gray-500 uppercase text-center"><Award size={14} className="inline mr-1"/> Rank</th>
                      <th className="px-2 py-4 w-24 text-xs font-black text-gray-500 uppercase text-center"><Users size={14} className="inline mr-1"/> Strength</th>
                      <th className="px-2 py-4 w-32 text-xs font-black text-gray-500 uppercase text-center"><Activity size={14} className="inline mr-1"/> Attendance</th>
                      <th className="px-2 py-4 w-48 text-xs font-black text-gray-500 uppercase">Conduct</th>
                      <th className="px-4 py-4 text-xs font-black text-gray-500 uppercase">General Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                       const data = formData[student.uid] || {};
                       return (
                          <tr key={student.uid} className={`hover:bg-purple-50/30 ${isPublished ? 'opacity-70' : ''}`}>
                            <td className="px-4 py-4">
                                <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1">Roll: {student.rollNo}</p>
                            </td>
                            <td className="px-2 py-4">
                                <input disabled={isPublished} type="text" className="w-full p-2 text-center font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-100 disabled:text-gray-500" value={data.rank || ''} onChange={(e) => handleInputChange(student.uid, 'rank', e.target.value)} placeholder="-" />
                            </td>
                            <td className="px-2 py-4">
                                <input disabled={isPublished} type="number" className="w-full p-2 text-center font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-100" value={data.studentStrength || ''} onChange={(e) => handleInputChange(student.uid, 'studentStrength', e.target.value)} placeholder="-" />
                            </td>
                            <td className="px-2 py-4">
                                <input disabled={isPublished} type="text" className="w-full p-2 text-center font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-2 focus:ring-purple-300 disabled:bg-gray-100" value={data.attendance || ''} onChange={(e) => handleInputChange(student.uid, 'attendance', e.target.value)} placeholder="0/0" />
                            </td>
                            <td className="px-2 py-4">
                                <input disabled={isPublished} type="text" className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded outline-none focus:border-purple-400 disabled:bg-gray-50" value={data.conduct || ''} onChange={(e) => handleInputChange(student.uid, 'conduct', e.target.value)} placeholder="e.g. Good" />
                            </td>
                            <td className="px-4 py-4">
                                <input disabled={isPublished} type="text" className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded outline-none focus:border-purple-400 disabled:bg-gray-50" value={data.remarks || ''} onChange={(e) => handleInputChange(student.uid, 'remarks', e.target.value)} placeholder="Overall feedback..." />
                            </td>
                          </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-4 pb-20">
              {students.map((student) => {
                 const data = formData[student.uid] || {};
                 return (
                   <div key={student.uid} className={`p-4 rounded-xl border border-gray-200 bg-white shadow-sm ${isPublished ? 'opacity-70' : ''}`}>
                      <div className="border-b border-gray-100 pb-3 mb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No: {student.rollNo}</span>
                        <h3 className="text-base font-bold text-gray-800">{student.name}</h3>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Rank</label>
                          <input disabled={isPublished} type="text" className="w-full p-2 text-center font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded outline-none" value={data.rank || ''} onChange={(e) => handleInputChange(student.uid, 'rank', e.target.value)} placeholder="-" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Strength</label>
                          <input disabled={isPublished} type="number" className="w-full p-2 text-center font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded outline-none" value={data.studentStrength || ''} onChange={(e) => handleInputChange(student.uid, 'studentStrength', e.target.value)} placeholder="-" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Attd.</label>
                          <input disabled={isPublished} type="text" className="w-full p-2 text-center font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded outline-none" value={data.attendance || ''} onChange={(e) => handleInputChange(student.uid, 'attendance', e.target.value)} placeholder="0/0" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><BookOpen size={10}/> Conduct</label>
                          <input disabled={isPublished} type="text" className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded outline-none" value={data.conduct || ''} onChange={(e) => handleInputChange(student.uid, 'conduct', e.target.value)} placeholder="e.g. Good" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MessageSquare size={10}/> Remarks</label>
                          <input disabled={isPublished} type="text" className="w-full p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded outline-none" value={data.remarks || ''} onChange={(e) => handleInputChange(student.uid, 'remarks', e.target.value)} placeholder="Overall feedback..." />
                        </div>
                      </div>
                   </div>
                 );
              })}
            </div>

          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin text-purple-500" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">Loading Data... | লোড হচ্ছে...</p>
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default PostRemarks;