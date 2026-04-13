import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Library, FileText, StickyNote, Loader2, AlertCircle, Book, Filter, HelpCircle 
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

const StudentAcademic = () => {
  const { user } = useStudentUser();
  const [activeTab, setActiveTab] = useState('syllabus'); 
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [studentClassName, setStudentClassName] = useState('');
  const [error, setError] = useState(null);

  // --- Filter States ---
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("No active academic session found.");
          setLoading(false);
          return;
        }

        const sessionData = snap.docs[0].data();
        const allClasses = sessionData.classes || [];

        let foundClass = null;
        for (const cls of allClasses) {
          const match = cls.students?.find(s => s.uid === user.uid);
          if (match) {
            foundClass = cls;
            break;
          }
        }

        if (foundClass) {
          setClassData(foundClass);
          setStudentClassName(foundClass.name);
        } else {
          setError("You are not enrolled in any class for this session.");
        }

      } catch (err) {
        console.error("Error loading academic data:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const subjects = useMemo(() => classData?.subjects || [], [classData]);

  const getSubjectName = (subId) => {
    const sub = subjects.find(s => s.id === subId);
    return sub ? sub.name : 'General';
  };

  const getExamName = (examId) => {
    const exam = classData?.exams?.find(e => e.id === examId);
    return exam ? exam.name : 'Unknown Exam';
  };

  // =========================================================================
  // EXTRACT DYNAMIC OPTIONS FROM SYLLABUS AND BOOKS
  // =========================================================================
  
  // 1. Exams for Syllabus
  const syllabusExams = useMemo(() => {
    if (!classData?.syllabus) return [];
    const examMap = new Map();
    classData.syllabus.forEach(item => {
      if (item.examId && !examMap.has(item.examId)) {
        examMap.set(item.examId, getExamName(item.examId));
      }
    });
    return Array.from(examMap, ([id, name]) => ({ id, name }));
  }, [classData]);

  // 2. Subjects only found in Syllabus
  const syllabusSubjects = useMemo(() => {
    if (!classData?.syllabus) return [];
    const subSet = new Set();
    classData.syllabus.forEach(item => {
      const name = item.subjectName || getSubjectName(item.subjectId);
      if (name) subSet.add(name);
    });
    return Array.from(subSet).sort();
  }, [classData]);

  // 3. Subjects only found in Books & Stationery
  const bookSubjects = useMemo(() => {
    if (!classData) return [];
    const subSet = new Set();
    
    (classData.books || []).forEach(book => {
      if (book.subject) subSet.add(book.subject);
    });
    
    (classData.copies || []).forEach(copy => {
      if (copy.subject) subSet.add(copy.subject);
    });
    
    return Array.from(subSet).sort();
  }, [classData]);

  // =========================================================================
  // FILTERING LOGIC
  // =========================================================================
  const filteredSyllabus = useMemo(() => {
    if (!classData?.syllabus) return [];
    return classData.syllabus.filter(item => {
      const matchExam = selectedExam ? item.examId === selectedExam : true;
      const itemSubName = item.subjectName || getSubjectName(item.subjectId);
      const matchSubject = selectedSubject ? itemSubName === selectedSubject : true;
      return matchExam && matchSubject;
    });
  }, [classData, selectedExam, selectedSubject]);

  const filteredBooks = useMemo(() => {
    if (!classData?.books) return [];
    if (selectedSubject) {
      return classData.books.filter(b => b.subject === selectedSubject);
    }
    return classData.books;
  }, [classData, selectedSubject]);

  const filteredCopies = useMemo(() => {
    if (!classData?.copies) return [];
    if (selectedSubject) {
      return classData.copies.filter(c => c.subject === selectedSubject);
    }
    return classData.copies;
  }, [classData, selectedSubject]);


  return (
    <StudentDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
        
        {/* HEADER & CONTROLS */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
              <Library className="text-emerald-600" /> Academic Resources
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              একাডেমিক সম্পদ / शैक्षणिक संसाधन
            </p>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Class / শ্রেণী: <span className="font-bold text-emerald-700">{studentClassName || '...'}</span>
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-3 w-full md:w-auto">
             {/* Tab Switcher */}
             <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 shrink-0">
                <button 
                    onClick={() => {
                      setActiveTab('syllabus');
                      setSelectedSubject(''); // Reset filter when switching tabs
                      setSelectedExam('');
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all flex flex-col items-center justify-center min-w-[100px] ${
                        activeTab === 'syllabus' ? 'bg-white text-emerald-700 shadow-sm border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                      <FileText size={14} /> 
                      <span className="text-xs font-bold">Syllabus</span>
                    </div>
                    <span className="text-[8px] font-bold opacity-70 uppercase">সিলেবাস / पाठ्यक्रम</span>
                </button>
                <button 
                    onClick={() => {
                      setActiveTab('books');
                      setSelectedSubject(''); // Reset filter when switching tabs
                      setSelectedExam('');
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all flex flex-col items-center justify-center min-w-[100px] ${
                        activeTab === 'books' ? 'bg-white text-emerald-700 shadow-sm border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Book size={14} /> 
                      <span className="text-xs font-bold text-center">Books & Stationery</span>
                    </div>
                    <span className="text-[8px] font-bold opacity-70 uppercase">বইপত্র / पुस्तकें</span>
                </button>
             </div>

             {/* DUAL FILTERS */}
             <div className="flex flex-col sm:flex-row gap-2 w-full">
                {/* Examination Filter (ONLY SHOWS ON SYLLABUS TAB) */}
                {activeTab === 'syllabus' && (
                  <div className="relative group flex-1">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <select 
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 appearance-none shadow-sm truncate"
                          value={selectedExam}
                          onChange={(e) => setSelectedExam(e.target.value)}
                      >
                          <option value="">All Exams / সব পরীক্ষা</option>
                          {syllabusExams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                  </div>
                )}

                {/* Subject Filter (CONTEXT AWARE LIST) */}
                <div className="relative group flex-1">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <select 
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100 appearance-none shadow-sm truncate"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                        <option value="">All Subjects / সব বিষয়</option>
                        {/* Dynamic list based on which tab is active */}
                        {(activeTab === 'syllabus' ? syllabusSubjects : bookSubjects).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
             </div>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Resources / লোড হচ্ছে / लोड हो रहा है</p>
          </div>
        )}

        {/* ERROR / EMPTY */}
        {!loading && (error || !classData) && (
          <div className="bg-white p-10 rounded-[2rem] border-2 border-dashed border-gray-100 text-center">
             <AlertCircle className="mx-auto text-gray-200 mb-4" size={50} />
             <p className="text-gray-500 font-bold">{error || "No academic data found."}</p>
             <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">কোনো তথ্য পাওয়া যায়নি / कोई डेटा नहीं मिला</p>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && classData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* === SYLLABUS TAB === */}
                {activeTab === 'syllabus' && (
                    <>
                        {filteredSyllabus.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {filteredSyllabus.map((item, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden border-l-4 border-l-emerald-500 flex flex-col">
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm shrink-0">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-black text-gray-800 text-base leading-tight">
                                                      {getExamName(item.examId)}
                                                    </h3>
                                                    <div className="flex flex-col mt-0.5">
                                                      <span className="text-sm text-emerald-600 font-black">
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
                                            <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100 h-full">
                                                <div className="flex flex-col mb-3 pb-3 border-b border-purple-200 border-dashed">
                                                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                                      <HelpCircle size={12}/> Question Type
                                                  </p>
                                                  <p className="text-[9px] font-bold text-purple-400 uppercase mt-1">প্রশ্নের ধরন / प्रश्न प्रकार</p>
                                                </div>
                                                <p className="text-[13px] text-purple-900 whitespace-pre-wrap leading-relaxed font-bold">
                                                    {item.questionType || 'Not specified'}
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                                <FileText className="mx-auto text-gray-200 mb-4" size={50} />
                                <h3 className="text-gray-500 font-black">No syllabus found</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">কোনো সিলেবাস নেই / कोई पाठ्यक्रम नहीं मिला</p>
                            </div>
                        )}
                    </>
                )}

                {/* === BOOKS & STATIONERY TAB === */}
                {activeTab === 'books' && (
                    <div className="grid md:grid-cols-2 gap-8">
                        
                        {/* Text Books Column */}
                        <div className="space-y-5">
                            <div className="flex flex-col">
                              <h3 className="text-sm font-black text-gray-700 uppercase flex items-center gap-2 leading-none">
                                  <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600 shadow-sm"><BookOpen size={16}/></span>
                                  Required Text Books
                              </h3>
                              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1 ml-10">প্রয়োজনীয় পাঠ্যপুস্তক / आवश्यक पुस्तकें</p>
                            </div>
                            
                            {filteredBooks.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredBooks.map((book, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-blue-400">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1 overflow-hidden pr-2">
                                                    <h4 className="font-black text-gray-800 text-sm leading-tight truncate">{book.name}</h4>
                                                    <div className="flex flex-col mt-1">
                                                      <span className="text-xs text-blue-600 font-bold">{book.subject}</span>
                                                      <span className="text-[7px] font-bold text-gray-400 uppercase">Subject / বিষয়</span>
                                                    </div>
                                                </div>
                                                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400 border border-blue-100">
                                                    <Book size={18}/>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-gray-50 text-[10px] text-gray-500 flex flex-wrap gap-y-2 justify-between">
                                                <div className="flex flex-col">
                                                  <span className="font-black text-gray-400 uppercase leading-none">Author / লেখক</span>
                                                  <span className="font-bold text-gray-600 mt-0.5">{book.author}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="font-black text-gray-400 uppercase leading-none">Pub / প্রকাশক</span>
                                                  <span className="font-bold text-gray-600 mt-0.5">{book.publisher}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-gray-100 text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No books listed / বই নেই</p>
                                </div>
                            )}
                        </div>

                        {/* Stationery Column */}
                        <div className="space-y-5">
                            <div className="flex flex-col">
                              <h3 className="text-sm font-black text-gray-700 uppercase flex items-center gap-2 leading-none">
                                  <span className="bg-orange-100 p-1.5 rounded-lg text-orange-600 shadow-sm"><StickyNote size={16}/></span>
                                  Stationery & Copies
                              </h3>
                              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mt-1 ml-10">স্টেশনারি এবং খাতা / स्टेशनरी और कॉपियां</p>
                            </div>

                            {filteredCopies.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredCopies.map((copy, idx) => (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-orange-50 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-400">
                                            <div className="flex gap-4 items-center">
                                                <div className="min-w-[45px] h-[45px] flex items-center justify-center bg-orange-50 rounded-xl text-orange-400 border border-orange-100 shadow-sm">
                                                    <StickyNote size={22} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <h4 className="font-black text-gray-800 text-sm leading-tight truncate">{copy.name}</h4>
                                                    <div className="flex flex-col mt-0.5">
                                                      <span className="text-xs text-orange-600 font-bold">{copy.subject}</span>
                                                      <span className="text-[7px] font-bold text-gray-400 uppercase">Subject / বিষয়</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200 uppercase leading-none">
                                                      {copy.type}
                                                  </span>
                                                  <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">Type / ধরণ</span>
                                                </div>
                                            </div>
                                            {copy.description && (
                                                <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Details / বিবরণ</p>
                                                    <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                                        {copy.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-gray-100 text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No stationery listed / তথ্য নেই</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentAcademic;