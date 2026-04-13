import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { 
  Award, ChevronDown, ChevronUp, Loader2, BookOpen, 
  FileText, AlertCircle, Send, Activity, Users, MessageSquare, CheckSquare, Printer
} from 'lucide-react';

const AdminResult = () => {
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [sessionData, setSessionData] = useState(null); 
  
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassIndex, setSelectedClassIndex] = useState('');
  
  const [expandedExam, setExpandedExam] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);

  const [selectedForPublish, setSelectedForPublish] = useState({});
  const [printExamId, setPrintExamId] = useState(null); // State to track which exam is being printed

  // 1. FETCH SESSIONS
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'academicSessions'));
        const sessionList = [];
        let activeId = '';

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          sessionList.push({ id: doc.id, ...data });
          if (data.isActive) activeId = doc.id;
        });

        setSessions(sessionList);
        if (activeId) setSelectedSessionId(activeId);
        else if (sessionList.length > 0) setSelectedSessionId(sessionList[0].id);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };
    fetchSessions();
  }, []);

  // 2. FETCH SESSION DATA
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchSessionData = async () => {
      setLoading(true);
      try {
        const sessionRef = doc(db, 'academicSessions', selectedSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (sessionSnap.exists()) {
          setSessionData(sessionSnap.data());
          setSelectedClassIndex(''); 
          setExpandedExam(null);
          setExpandedStudent(null);
        } else {
          setSessionData(null);
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [selectedSessionId]);

  const classesList = sessionData?.classes || [];
  const selectedClass = selectedClassIndex !== '' ? classesList[selectedClassIndex] : null;
  
  const students = selectedClass?.students ? [...selectedClass.students].sort((a, b) => {
    const rollA = parseInt(a.rollNo) || Number.MAX_SAFE_INTEGER;
    const rollB = parseInt(b.rollNo) || Number.MAX_SAFE_INTEGER;
    return rollA - rollB;
  }) : [];

  const exams = selectedClass?.exams || [];
  const subjects = selectedClass?.subjects || [];

  // CALCULATE HIGHEST MARKS FOR THE CLASS (For Printout)
  const classHighestMarks = useMemo(() => {
    const map = {}; // { examId: { subjectId: maxMark } }
    if (!selectedClass) return map;
    exams.forEach(exam => {
      map[exam.id] = {};
      students.forEach(std => {
        const resList = std.results?.filter(r => r.examId === exam.id) || [];
        resList.forEach(r => {
          const val = parseFloat(r.obtainedMarks);
          if (!isNaN(val)) {
            if (!map[exam.id][r.subjectId] || val > map[exam.id][r.subjectId]) {
              map[exam.id][r.subjectId] = val;
            }
          }
        });
      });
    });
    return map;
  }, [selectedClass, exams, students]);

  // INITIALIZE CHECKBOXES
  useEffect(() => {
    if (!selectedClass) return;
    
    const initialSelected = {};
    const allStudentUids = students.map(s => s.uid);

    exams.forEach(exam => {
        const schedule = selectedClass.examSchedules?.find(sch => sch.examId === exam.id);
        if (schedule?.status === 'PUBLISHED' && schedule.publishedUids) {
            initialSelected[exam.id] = schedule.publishedUids;
        } else {
            initialSelected[exam.id] = allStudentUids;
        }
    });
    
    setSelectedForPublish(initialSelected);
  }, [selectedClass]);

  const getSubjectIndex = (subjectId) => {
    const sub = subjects.find(s => s.id === subjectId);
    return sub?.indexNo || '-';
  };

  const getExamPublishStatus = (examId) => {
    if (!selectedClass?.examSchedules) return 'NO_SCHEDULES';
    const schedulesForExam = selectedClass.examSchedules.filter(sch => sch.examId === examId);
    if (schedulesForExam.length === 0) return 'NO_SCHEDULES';
    const hasUnpublished = schedulesForExam.some(sch => sch.status !== 'PUBLISHED');
    return hasUnpublished ? 'OPEN' : 'PUBLISHED';
  };

  // 3. PUBLISH RESULTS HANDLER
  const handlePublishResults = async (examId) => {
    const uidsToPublish = selectedForPublish[examId] || [];
    
    if (uidsToPublish.length === 0) {
        if (!window.confirm("No students are selected. This will hide the result for EVERYONE. Continue?")) return;
    } else {
        if (!window.confirm(`Publish results for ${uidsToPublish.length} selected students? They will be notified.`)) return;
    }
    
    setPublishing(true);
    try {
      const updatedClasses = [...sessionData.classes];
      const classRef = updatedClasses[selectedClassIndex];
      
      if (classRef.examSchedules) {
        classRef.examSchedules.forEach(sch => {
          if (sch.examId === examId) {
            sch.status = 'PUBLISHED';
            sch.publishedUids = uidsToPublish; 
          }
        });
      }

      const sessionDocRef = doc(db, 'academicSessions', selectedSessionId);
      await updateDoc(sessionDocRef, { classes: updatedClasses });
      setSessionData({ ...sessionData, classes: updatedClasses });

      try {
        const examName = exams.find(e => e.id === examId)?.name || 'Exam';
        const className = selectedClass.name;
        const validUids = uidsToPublish.filter(Boolean);

        if (validUids.length > 0) {
          const sendBulkPushNotification = httpsCallable(functions, 'sendBulkPushNotification');
          await sendBulkPushNotification({
            targetUids: validUids,
            title: "🏆 Results Published!",
            body: `Your results for ${examName} (Class ${className}) are out. Check your portal now!`
          });
        }
      } catch (notifError) {
        console.error("Notifications failed:", notifError);
      }

      alert("Results Published & Updated Successfully!");

    } catch (error) {
      console.error("Error publishing results:", error);
      alert("Failed to publish results.");
    } finally {
      setPublishing(false);
    }
  };

  // Print Handler
  const handlePrintAll = (examId) => {
    setPrintExamId(examId);
    setTimeout(() => {
      window.print();
    }, 100); // Small delay to ensure the DOM updates before print triggers
  };

  // Hierarchy Toggles
  const toggleExam = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
    setExpandedStudent(null); 
  };

  const toggleStudent = (uid) => {
    setExpandedStudent(expandedStudent === uid ? null : uid);
  };

  return (
    <>
      {/* --- DASHBOARD UI (Hidden during print) --- */}
      <div className="print:hidden">
        <AdminDashboardLayout themeColor="blue">
          <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20 font-sans">
            
            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b pb-8 border-gray-200">
              <div className="flex flex-col">
                <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 leading-none">
                  <Award className="text-blue-600" size={36} /> Result Management
                </h1>
                <span className="text-[11px] font-bold text-blue-600 mt-2 uppercase tracking-widest">ফলাফল ব্যবস্থাপনা | परीक्षा परिणाम प्रबंधन</span>
                <p className="text-gray-500 mt-3 font-medium">Publish and view academic results | ফলাফল প্রকাশ করুন</p>
              </div>
              
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                <div className="flex flex-col">
                    <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="p-3.5 bg-white border border-gray-200 rounded-2xl font-black text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all sm:w-56 text-sm uppercase tracking-tighter"
                    >
                    <option value="" disabled>Select Session</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.id} {s.isActive ? '(Active)' : ''}</option>
                    ))}
                    </select>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 ml-2 uppercase">সেশন নির্বাচন | सत्र चयन</span>
                </div>

                <div className="flex flex-col">
                    <select 
                    value={selectedClassIndex}
                    onChange={(e) => setSelectedClassIndex(e.target.value)}
                    className="p-3.5 bg-white border border-gray-200 rounded-2xl font-black text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all sm:w-56 disabled:opacity-50 text-sm uppercase tracking-tighter"
                    disabled={loading || classesList.length === 0}
                    >
                    <option value="" disabled>Select Class</option>
                    {classesList.map((cls, idx) => (
                        <option key={idx} value={idx}>{cls.name}</option>
                    ))}
                    </select>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 ml-2 uppercase">ক্লাস নির্বাচন | कक्षा चयन</span>
                </div>
              </div>
            </div>

            {/* LOADING & EMPTY STATES */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-inner">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <div className="text-center">
                    <p className="text-blue-900 font-black tracking-widest text-sm uppercase">Compiling Records...</p>
                    <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য সংগ্রহ করা হচ্ছে | डेटा संकलन</p>
                </div>
              </div>
            ) : !selectedClass ? (
              <div className="py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-50 animate-in fade-in zoom-in-95">
                <BookOpen className="h-16 w-16 text-gray-100 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-700 leading-none">No Class Selected</h3>
                <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">ক্লাস নির্বাচন করা হয়নি | कोई कक्षा नहीं चुनी गई</span>
                <p className="text-gray-400 text-sm mt-6 font-medium max-w-xs mx-auto">Please select a class from the filters above to manage results.</p>
              </div>
            ) : (
              
              <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* EXAM PUBLISHING PANEL */}
                {exams.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-[2.5rem] border border-blue-100 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 -mr-8 -mt-8">
                        <Award size={120} />
                    </div>
                    
                    <div className="flex flex-col mb-8">
                        <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2 leading-none">
                        <Send size={16} /> Exam Publishing Actions
                        </h3>
                        <span className="text-[9px] font-bold text-blue-400 mt-2 uppercase">পরীক্ষার ফলাফল প্রকাশ | परीक्षा परिणाम प्रकाशन</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {exams.map(exam => {
                        const publishStatus = getExamPublishStatus(exam.id);
                        const isOpen = publishStatus === 'OPEN';
                        const isPublished = publishStatus === 'PUBLISHED';
                        const selectedCount = (selectedForPublish[exam.id] || []).length;
                        
                        return (
                          <div key={exam.id} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-all hover:shadow-md z-10">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex flex-col">
                                <h4 className="font-black text-gray-800 text-lg leading-tight uppercase">{exam.name}</h4>
                                <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Evaluation | মূল্যায়ন</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${
                                    isOpen ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                    isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                    'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                    {isOpen ? 'Pending' : isPublished ? 'Published' : 'Empty'}
                                </span>
                                <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">
                                    {isOpen ? 'অপেক্ষমান' : isPublished ? 'প্রকাশিত' : 'নেই'}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handlePublishResults(exam.id)}
                              disabled={!isOpen || publishing}
                              className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all transform active:scale-95 shadow-lg ${
                                isOpen 
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                              }`}
                            >
                              {publishing ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    <span>{isOpen ? `Publish for ${selectedCount} Students` : isPublished ? `Update Published (${selectedCount})` : 'No Schedules'}</span>
                                    <span className="text-[8px] opacity-70 font-medium">{isOpen ? 'নির্বাচিতদের জন্য প্রকাশ করুন' : 'আপডেট করুন'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* EXAMINATIONS RECORDS SECTION */}
                <div className="space-y-6">
                  <div className="flex flex-col border-b border-gray-200 pb-4 ml-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
                        Examination Records
                    </h3>
                    <span className="text-[9px] font-bold text-blue-400 mt-2 uppercase">পরীক্ষার রেকর্ড | परीक्षा रिकॉर्ड</span>
                  </div>
                  
                  {exams.length === 0 ? (
                     <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                       <AlertCircle className="h-12 w-12 text-gray-100 mx-auto mb-4" />
                       <p className="text-gray-400 font-bold uppercase text-sm">No exams assigned to this class.</p>
                     </div>
                  ) : (
                    <div className="space-y-4">
                      {exams.map(exam => {
                        const isExamExpanded = expandedExam === exam.id;
                        const selectedUids = selectedForPublish[exam.id] || [];
                        const allSelected = selectedUids.length === students.length && students.length > 0;
                        
                        return (
                          <div key={exam.id} className={`bg-white rounded-[2rem] border transition-all duration-300 ${isExamExpanded ? 'border-blue-200 shadow-xl ring-8 ring-blue-50/30' : 'border-gray-100 shadow-sm hover:border-blue-200'}`}>
                            
                            {/* 1. EXAM HEADER */}
                            <button 
                              onClick={() => toggleExam(exam.id)}
                              className={`w-full flex items-center justify-between p-5 transition-colors ${isExamExpanded ? 'bg-blue-50/10' : 'hover:bg-gray-50/50'}`}
                            >
                              <div className="flex items-center gap-5">
                                <div className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center font-black border transition-all ${isExamExpanded ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                  <FileText size={24} />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-black text-gray-800 text-lg leading-none uppercase tracking-tight">{exam.name}</h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                      {students.length} Students Enrolled
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`p-2 rounded-full transition-colors ${isExamExpanded ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300'}`}>
                                {isExamExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </button>

                            {/* 2. STUDENTS LIST (Inside Expanded Exam) */}
                            {isExamExpanded && (
                              <div className="p-4 sm:p-8 border-t border-gray-100 bg-gray-50/30 animate-in fade-in slide-in-from-top-2">
                                
                                {/* --- ACTION BAR: SELECT ALL & PRINT ALL --- */}
                                <div className="flex flex-col lg:flex-row items-center justify-between bg-white p-4 rounded-2xl border border-blue-100 shadow-sm mb-6 gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer text-sm font-black text-gray-700 select-none w-full lg:w-auto">
                                        <input 
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={allSelected}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setSelectedForPublish(prev => ({
                                                    ...prev,
                                                    [exam.id]: checked ? students.map(s => s.uid) : []
                                                }));
                                            }}
                                        />
                                        Select All Students ({selectedUids.length}/{students.length})
                                    </label>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                        <button 
                                            onClick={() => handlePrintAll(exam.id)}
                                            disabled={students.length === 0}
                                            className="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Printer size={16} /> Print All Report Cards
                                        </button>
                                        <button 
                                            onClick={() => handlePublishResults(exam.id)}
                                            disabled={publishing}
                                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                            Update Publishing Rules
                                        </button>
                                    </div>
                                </div>

                                {/* --- INDIVIDUAL STUDENTS --- */}
                                {students.length === 0 ? (
                                  <div className="text-center py-10 opacity-50">
                                    <p className="text-sm text-gray-500 font-bold">No students found.</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-4">
                                    {students.map(student => {
                                      const isStudentExpanded = expandedStudent === student.uid;
                                      const isChecked = selectedUids.includes(student.uid);
                                      
                                      const examResults = student.results?.filter(r => r.examId === exam.id) || [];
                                      const examSummary = student.examSummaries?.find(s => s.examId === exam.id);

                                      return (
                                        <div key={student.uid} className={`bg-white border transition-all duration-300 rounded-[1.5rem] overflow-hidden ${isStudentExpanded ? 'border-blue-300 shadow-md ring-4 ring-blue-50' : 'border-gray-200 shadow-sm'}`}>
                                          
                                          {/* STUDENT HEADER WITH CHECKBOX */}
                                          <div className="w-full flex justify-between items-center p-0 hover:bg-gray-50 transition-colors">
                                            
                                            <div className="flex items-center gap-4 pl-4 py-4 flex-1 cursor-pointer" onClick={() => toggleStudent(student.uid)}>
                                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-xl text-gray-600 font-black shrink-0">
                                                    <span className="text-sm leading-none">{student.rollNo || '-'}</span>
                                                </div>
                                                <div className="flex flex-col items-start overflow-hidden">
                                                    <span className="font-black text-gray-800 text-base leading-none uppercase truncate w-full text-left">{student.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Reg: {student.regNo}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 pr-5 py-4 shrink-0">
                                              <div className="flex flex-col items-end hidden sm:flex">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                                    examResults.length > 0 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200'
                                                }`}>
                                                    {examResults.length > 0 ? `${examResults.length} Sub. Marks` : 'No Marks Yet'}
                                                </span>
                                              </div>
                                              
                                              {/* INDIVIDUAL CHECKBOX */}
                                              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2" onClick={(e) => e.stopPropagation()}>
                                                  <label className="flex items-center gap-2 cursor-pointer" title="Select to publish result">
                                                      <span className={`text-[10px] font-bold uppercase hidden sm:inline ${isChecked ? 'text-blue-600' : 'text-gray-400'}`}>Publish</span>
                                                      <input 
                                                          type="checkbox"
                                                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                          checked={isChecked}
                                                          onChange={(e) => {
                                                              const checked = e.target.checked;
                                                              setSelectedForPublish(prev => {
                                                                  const curr = prev[exam.id] || [];
                                                                  return {
                                                                      ...prev,
                                                                      [exam.id]: checked ? [...curr, student.uid] : curr.filter(id => id !== student.uid)
                                                                  };
                                                              });
                                                          }}
                                                      />
                                                  </label>
                                              </div>

                                              <button onClick={() => toggleStudent(student.uid)} className="p-1 border-l border-gray-200 pl-4 ml-1">
                                                {isStudentExpanded ? <ChevronUp size={20} className="text-blue-600"/> : <ChevronDown size={20} className="text-gray-400"/>}
                                              </button>
                                            </div>
                                          </div>

                                          {/* STUDENT'S EXAM DATA (Summary + Marks) */}
                                          {isStudentExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50/10">
                                              
                                              {/* OVERALL SUMMARY PANEL */}
                                              {examSummary && (
                                                <div className="m-4 p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-blue-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-4 border-b border-blue-100/50 pb-2">
                                                        <Award size={16} className="text-blue-600" />
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Teacher's Overall Summary</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Class Rank</span>
                                                            <span className="text-lg font-black text-gray-800">{examSummary.rank || '-'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Attendance</span>
                                                            <span className="text-lg font-black text-gray-800">{examSummary.attendance || '-'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Strength</span>
                                                            <span className="text-lg font-black text-gray-800">{examSummary.studentStrength || '-'}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Conduct</span>
                                                            <span className="text-sm font-bold text-gray-700 mt-1 truncate">{examSummary.conduct || '-'}</span>
                                                        </div>
                                                    </div>
                                                    {examSummary.remarks && (
                                                        <div className="bg-white/60 p-3 rounded-xl border border-blue-50 flex items-start gap-2">
                                                            <MessageSquare size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                                            <p className="text-sm text-gray-700 font-medium italic">"{examSummary.remarks}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                              )}

                                              {/* SUBJECT MARKS TABLE */}
                                              <div className="overflow-x-auto p-2">
                                                {examResults.length === 0 ? (
                                                  <div className="p-8 text-center">
                                                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">No subject marks entered yet.</p>
                                                  </div>
                                                ) : (
                                                  <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead>
                                                      <tr className="bg-gray-50/50 text-gray-400">
                                                        <th className="px-6 py-4 w-24">
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Index</p>
                                                            <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ক্রমিক | सूचकांक</span>
                                                        </th>
                                                        <th className="px-6 py-4">
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Subject</p>
                                                            <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">বিষয় | विषय</span>
                                                        </th>
                                                        <th className="px-6 py-4 text-center w-32">
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Full Marks</p>
                                                            <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">মোট নম্বর</span>
                                                        </th>
                                                        <th className="px-6 py-4 text-center w-32">
                                                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Obtained</p>
                                                            <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">প্রাপ্ত নম্বর</span>
                                                        </th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                      {examResults.map((res, i) => (
                                                        <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                                                          <td className="px-6 py-4 font-black text-gray-500 text-xs">
                                                            #{getSubjectIndex(res.subjectId)}
                                                          </td>
                                                          <td className="px-6 py-4 font-black text-gray-800 uppercase tracking-tighter">
                                                            {res.subjectName}
                                                          </td>
                                                          <td className="px-6 py-4 text-center font-bold text-gray-400">
                                                            {res.fullMarks || '-'}
                                                          </td>
                                                          <td className="px-6 py-4 text-center">
                                                            <span className="font-black text-blue-700 bg-blue-100/50 px-4 py-2 rounded-xl border border-blue-100 text-lg shadow-inner">
                                                              {res.obtainedMarks || res.grade || '-'}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                )}
                                              </div>

                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
          `}</style>
        </AdminDashboardLayout>
      </div>

      {/* --- PRINT ONLY UI: BATCH PRINT ALL STUDENTS --- */}
      {printExamId && (
        <div className="hidden print:block font-serif text-black w-full bg-white">
          {students.map((student, sIdx) => {
            const exam = exams.find(e => e.id === printExamId);
            const examName = exam?.name || 'TERMINAL EXAMINATION';
            
            const examResults = student.results?.filter(r => r.examId === printExamId) || [];
            const examSummary = student.examSummaries?.find(s => s.examId === printExamId);
            
            const totalObtained = examResults.reduce((sum, r) => sum + parseFloat(r.obtainedMarks || 0), 0);
            const totalMax = examResults.reduce((sum, r) => sum + parseFloat(r.fullMarks || 0), 0);
            
            const highestMap = classHighestMarks[printExamId] || {};

            const printRowCount = Math.max(examResults.length, 11); 
            const printRows = Array.from({ length: printRowCount }).map((_, i) => {
              const res = examResults[i];
              return {
                subj: res?.subjectName || '',
                full: res?.fullMarks || '',
                obtd: res?.obtainedMarks || '',
                high: res ? (highestMap[res.subjectId] || '') : ''
              };
            });

            return (
              <div key={student.uid} className="max-w-[800px] mx-auto p-4" style={{ pageBreakAfter: 'always' }}>
                <div className="border-[8px] border-double border-black p-6 min-h-[90vh] flex flex-col">
                    <h1 className="text-center font-bold text-2xl uppercase tracking-widest underline decoration-2 underline-offset-4 mb-6">
                        {examName}
                    </h1>

                    {/* --- STUDENT DETAILS SECTION --- */}
                    <div className="flex justify-between items-end mb-6 text-[13px] font-bold uppercase tracking-wider">
                        <div className="space-y-2 w-[55%]">
                            <div className="flex items-end">
                                <span className="w-20 shrink-0">Name</span>
                                <span className="mx-1">:</span> 
                                <span className="border-b-[1.5px] border-black border-dotted flex-1 whitespace-nowrap overflow-hidden text-sm">{student.name || '-'}</span>
                                <span className="w-4"></span>
                            </div>
                            <div className="flex items-end">
                                <span className="w-20 shrink-0">Reg. No.</span>
                                <span className="mx-1">:</span> 
                                <span className="border-b-[1.5px] border-black border-dotted flex-1 text-sm">{student.regNo || '-'}</span>
                                <span className="w-4"></span>
                            </div>
                        </div>
                        <div className="space-y-2 w-[45%]">
                            <div className="flex items-end">
                                <span className="w-16 shrink-0 text-right">Class</span>
                                <span className="mx-1">:</span> 
                                <span className="border-b-[1.5px] border-black border-dotted flex-1 text-center text-sm">{selectedClass?.name || '-'}</span>
                            </div>
                            <div className="flex items-end">
                                <span className="w-16 shrink-0 text-right">Roll No.</span>
                                <span className="mx-1">:</span> 
                                <span className="border-b-[1.5px] border-black border-dotted flex-1 text-center text-sm">{student.rollNo || '-'}</span>
                            </div>
                            <div className="flex items-end">
                                <span className="w-16 shrink-0 text-right">Date</span>
                                <span className="mx-1">:</span> 
                                <span className="border-b-[1.5px] border-black border-dotted flex-1 text-center text-sm">{new Date().toLocaleDateString('en-GB')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                                <tr>
                                    <th className="border border-black p-2 text-center uppercase tracking-wider">Subjects</th>
                                    <th className="border border-black p-2 text-center uppercase tracking-wider w-20 leading-tight">Full<br/>Marks</th>
                                    <th className="border border-black p-2 text-center uppercase tracking-wider w-20 leading-tight">Highest<br/>Marks</th>
                                    <th className="border border-black p-2 text-center uppercase tracking-wider w-20 leading-tight">Marks<br/>Obtd.</th>
                                    <th className="border border-black p-2 text-center uppercase tracking-wider w-28">Rank</th>
                                    <th className="border border-black p-2 text-center w-24 text-lg font-black">{examSummary?.rank || ''}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printRows.map((row, i) => (
                                    <tr key={i}>
                                        <td className="border border-black p-2 uppercase font-semibold h-9 text-xs">{row.subj}</td>
                                        <td className="border border-black p-2 text-center h-9 text-xs">{row.full}</td>
                                        <td className="border border-black p-2 text-center h-9 text-xs">{row.high}</td>
                                        <td className="border border-black p-2 text-center font-bold h-9 text-xs">{row.obtd}</td>

                                        {i === 0 && (
                                            <>
                                                <td className="border border-black p-1 text-center text-[10px] font-semibold leading-tight">Student Strength<br/>in the<br/>class room</td>
                                                <td className="border border-black p-1 text-center font-bold">{examSummary?.studentStrength || ''}</td>
                                            </>
                                        )}
                                        {i === 1 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs">Attendance</td>
                                                <td className="border border-black p-1 text-center font-bold text-xs">{examSummary?.attendance || ''}</td>
                                            </>
                                        )}
                                        {i === 2 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs">Conduct</td>
                                                <td className="border border-black p-1 text-center font-bold text-xs">{examSummary?.conduct || ''}</td>
                                            </>
                                        )}
                                        {i === 3 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs" rowSpan={2}>Remarks</td>
                                                <td className="border border-black p-1 text-center font-bold text-[10px] leading-tight" rowSpan={2}>{examSummary?.remarks || ''}</td>
                                            </>
                                        )}
                                        {i === 4 && null}
                                        {i === 5 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs leading-tight" rowSpan={2}>Signature<br/>of<br/>Principal</td>
                                                <td className="border border-black p-1" rowSpan={2}></td>
                                            </>
                                        )}
                                        {i === 6 && null}
                                        {i === 7 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs leading-tight" rowSpan={2}>Signature<br/>of Class<br/>Teacher</td>
                                                <td className="border border-black p-1" rowSpan={2}></td>
                                            </>
                                        )}
                                        {i === 8 && null}
                                        {i === 9 && (
                                            <>
                                                <td className="border border-black p-1 text-center font-semibold text-xs leading-tight" rowSpan={2}>Signature<br/>of<br/>Guardian</td>
                                                <td className="border border-black p-1" rowSpan={2}></td>
                                            </>
                                        )}
                                        {i === 10 && null}
                                        {i > 10 && (
                                            <>
                                                <td className="border border-black p-1"></td>
                                                <td className="border border-black p-1"></td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold">
                                    <td className="border border-black p-2 text-center uppercase text-xs">Grand Total</td>
                                    <td className="border border-black p-2 text-center text-xs">{totalMax || ''}</td>
                                    <td className="border border-black p-2 text-center text-xs"></td>
                                    <td className="border border-black p-2 text-center text-xs">{totalObtained || ''}</td>
                                    <td className="border border-black border-t-0 p-2 text-center" colSpan={2}></td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="text-right font-bold text-sm mt-2">Pass Marks 40%</div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AdminResult;