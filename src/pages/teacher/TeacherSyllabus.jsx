import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Loader2, AlertCircle, BookOpen, HelpCircle, Filter } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const TeacherSyllabus = () => {
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  
  // --- Filter States ---
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("No active academic session found.");
        } else {
          setSessionData(snap.docs[0].data());
        }
      } catch (err) {
        console.error("Error loading academic data:", err);
        setError("Failed to load session data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const classes = useMemo(() => sessionData?.classes || [], [sessionData]);
  
  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const syllabus = useMemo(() => selectedClass?.syllabus || [], [selectedClass]);
  const subjects = useMemo(() => selectedClass?.subjects || [], [selectedClass]);
  const exams = useMemo(() => selectedClass?.exams || [], [selectedClass]);

  const getSubjectName = (subId) => {
    const sub = subjects.find(s => s.id === subId);
    return sub ? sub.name : 'Unknown Subject';
  };

  const getExamName = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.name : 'Unknown Exam';
  };

  // =========================================================================
  // DYNAMIC SYLLABUS OPTIONS (FIXED FOR MISSING subjectId)
  // =========================================================================
  const syllabusExams = useMemo(() => {
    if (!syllabus.length) return [];
    const examMap = new Map();
    syllabus.forEach(item => {
      if (item.examId && !examMap.has(item.examId)) {
        examMap.set(item.examId, getExamName(item.examId));
      }
    });
    return Array.from(examMap, ([id, name]) => ({ id, name }));
  }, [syllabus, exams]);

  const syllabusSubjects = useMemo(() => {
    if (!syllabus.length) return [];
    const subMap = new Map();
    syllabus.forEach(item => {
      // FIX: Use subjectId if it exists, otherwise fall back to subjectName as the unique key
      const identifier = item.subjectId || item.subjectName; 
      
      if (identifier && !subMap.has(identifier)) {
        const name = item.subjectName || getSubjectName(item.subjectId);
        subMap.set(identifier, { id: identifier, name });
      }
    });
    return Array.from(subMap.values());
  }, [syllabus, subjects]);

  // =========================================================================
  // FILTERING LOGIC (FIXED FOR MISSING subjectId)
  // =========================================================================
  const filteredSyllabus = useMemo(() => {
    if (!syllabus.length) return [];
    return syllabus.filter(item => {
       const matchExam = selectedExamId ? item.examId === selectedExamId : true;
       
       // FIX: Match against the same identifier used in the dropdown
       const itemIdentifier = item.subjectId || item.subjectName;
       const matchSub = selectedSubjectId ? itemIdentifier === selectedSubjectId : true;
       
       return matchExam && matchSub;
    });
  }, [syllabus, selectedExamId, selectedSubjectId]);


  return (
    <TeacherDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
        
        {/* HEADER & CONTROLS */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
              <FileText className="text-purple-600" /> View Syllabus
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              সিলেবাস দেখুন / पाठ्यक्रम देखें
            </p>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Data...</p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="bg-white p-10 rounded-[2rem] border-2 border-dashed border-red-100 text-center">
             <AlertCircle className="mx-auto text-red-200 mb-4" size={50} />
             <p className="text-red-500 font-bold">{error}</p>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* DYNAMIC SYLLABUS FILTERS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                     
                     <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">1. Select Class</label>
                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1 uppercase">ক্লাস নির্বাচন করুন | कक्षा चुनें</p>
                        <select 
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-gray-700 shadow-sm"
                            value={selectedClassId}
                            onChange={(e) => { 
                              setSelectedClassId(e.target.value); 
                              setSelectedExamId('');
                              setSelectedSubjectId(''); 
                            }}
                            disabled={loading || !sessionData}
                        >
                            <option value="">Choose Class | ক্লাস বেছে নিন</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">2. Select Examination</label>
                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1 uppercase">পরীক্ষা নির্বাচন করুন | परीक्षा चुनें</p>
                        <select 
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-gray-700 shadow-sm disabled:opacity-50"
                            disabled={!selectedClassId}
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                        >
                            <option value="">All Exams | সব পরীক্ষা</option>
                            {syllabusExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                     </div>

                     <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">3. Select Subject</label>
                        <p className="text-[9px] font-bold text-purple-400 ml-1 mb-1 uppercase">বিষয় নির্বাচন করুন | विषय चुनें</p>
                        <select 
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-200 transition-all font-medium text-gray-700 shadow-sm disabled:opacity-50"
                            disabled={!selectedClassId}
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                            <option value="">All Subjects | সব বিষয়</option>
                            {syllabusSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                     </div>

                </div>

                {/* SYLLABUS CONTENT GRID */}
                {selectedClassId ? (
                    <div className="space-y-6">
                        <div className="flex flex-col border-b border-gray-100 pb-2 mb-4">
                            <h3 className="font-bold text-gray-800 text-lg leading-none">Course Content</h3>
                            <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">কোর্স কন্টেন্ট | पाठ्यक्रम सामग्री</span>
                        </div>
                        
                        {filteredSyllabus.length > 0 ? (
                            <div className="grid gap-6">
                                {filteredSyllabus.map((item, index) => (
                                    <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden border-l-4 border-l-purple-500 flex flex-col">
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-xl bg-purple-50 text-purple-600 shadow-sm shrink-0">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-black text-gray-800 text-base leading-tight">
                                                      {getExamName(item.examId)}
                                                    </h3>
                                                    <div className="flex flex-col mt-0.5">
                                                      <span className="text-sm text-purple-600 font-black">
                                                        {item.subjectName || getSubjectName(item.subjectId)}
                                                      </span>
                                                      <span className="text-[9px] font-bold text-gray-400 uppercase">Subject / বিষয় / विषय</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {item.duration && (
                                                <div className="flex flex-col items-end shrink-0">
                                                  <span className="text-[10px] font-black uppercase bg-gray-50 text-gray-600 px-3 py-1.5 rounded border border-gray-100 leading-none">
                                                      {item.duration}
                                                  </span>
                                                  <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">Duration</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Book Reference Badge */}
                                        {item.book && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-700">
                                                    <BookOpen size={14} /> {item.book}
                                                </span>
                                            </div>
                                        )}

                                        {/* SIDE BY SIDE COLUMNS FOR TOPICS & QUESTION TYPE */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-auto">
                                            {/* Topics Column */}
                                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 h-full">
                                                <div className="flex flex-col mb-3 pb-3 border-b border-gray-200 border-dashed">
                                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Topics</p>
                                                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">বিষয়বস্তু / पाठ्यक्रम के विषय</p>
                                                </div>
                                                <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
                                                    {item.topics || 'Not specified'}
                                                </p>
                                            </div>

                                            {/* Question Type Column */}
                                            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 h-full">
                                                <div className="flex flex-col mb-3 pb-3 border-b border-blue-200 border-dashed">
                                                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                                      <HelpCircle size={12}/> Question Type
                                                  </p>
                                                  <p className="text-[9px] font-bold text-blue-400 uppercase mt-1">প্রশ্নের ধরন / प्रश्न प्रकार</p>
                                                </div>
                                                <p className="text-[13px] text-blue-900 whitespace-pre-wrap leading-relaxed font-bold">
                                                    {item.questionType || 'Not specified'}
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                                <p className="text-gray-500 font-bold">No syllabus found matching these filters | কোনো সিলেবাস নেই</p>
                            </div>
                        )}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                          <BookOpen size={64} className="text-gray-200 mb-4" />
                          <h3 className="text-xl font-bold text-gray-400">Syllabus Viewer</h3>
                          <p className="text-[10px] font-bold text-purple-300 uppercase mt-1">সিলেবাস ভিউয়ার | पाठ्यक्रम दर्शक</p>
                          <p className="text-gray-400 mt-2 text-sm">Select a class to begin | একটি ক্লাস নির্বাচন করুন</p>
                      </div>
                  )}
            </div>
        )}

      </div>
    </TeacherDashboardLayout>
  );
};

export default TeacherSyllabus;