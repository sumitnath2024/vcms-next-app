import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { 
  Award, ChevronDown, ChevronUp, Loader2, BookOpen, 
  FileText, AlertCircle 
} from 'lucide-react';

const TeacherResult = () => {
  const { userData } = useTeacherUser();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState('');
  
  // Accordion States
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedExam, setExpandedExam] = useState(null);

  // 1. Fetch active session and filter classes for this teacher
  useEffect(() => {
    if (!userData?.uid) return;

    const fetchTeacherClasses = async () => {
      setLoading(true);
      try {
        const activeSessionQuery = query(
          collection(db, 'academicSessions'), 
          where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(activeSessionQuery);

        if (!querySnapshot.empty) {
          const sessionData = querySnapshot.docs[0].data();
          
          const myClasses = (sessionData.classes || []).filter(
            cls => cls.classTeacherUid === userData.uid
          );

          setTeacherClasses(myClasses);
          
          if (myClasses.length > 0) {
            setSelectedClassIndex(0);
          }
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherClasses();
  }, [userData]);

  const selectedClass = selectedClassIndex !== '' ? teacherClasses[selectedClassIndex] : null;
  
  const students = selectedClass?.students ? [...selectedClass.students].sort((a, b) => {
    const rollA = parseInt(a.rollNo) || Number.MAX_SAFE_INTEGER;
    const rollB = parseInt(b.rollNo) || Number.MAX_SAFE_INTEGER;
    return rollA - rollB;
  }) : [];

  const exams = selectedClass?.exams || [];
  const subjects = selectedClass?.subjects || [];

  const getSubjectIndex = (subjectId) => {
    const sub = subjects.find(s => s.id === subjectId);
    return sub?.indexNo || '-';
  };

  const toggleStudent = (uid) => {
    setExpandedStudent(expandedStudent === uid ? null : uid);
    setExpandedExam(null); 
  };

  const toggleExam = (examId) => {
    setExpandedExam(expandedExam === examId ? null : examId);
  };

  return (
    <TeacherDashboardLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
        
        {/* --- Header & Filters --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 border-gray-200">
          <div className="flex items-center gap-3">
            <Award className="text-purple-600 shrink-0" size={32} />
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 leading-none">Class Results</h1>
                <p className="text-[10px] md:text-[11px] font-bold text-purple-600 mt-1.5 uppercase">ক্লাস ফলাফল | कक्षा परिणाम</p>
                <p className="text-gray-500 mt-1.5 text-xs md:text-sm font-medium">নির্ধারিত ক্লাসের ফলাফল দেখুন | परिणाम देखें</p>
            </div>
          </div>
          
          <div className="flex flex-col w-full md:w-auto">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1">Select Class | ক্লাস নির্বাচন করুন</label>
            <select 
              value={selectedClassIndex}
              onChange={(e) => setSelectedClassIndex(e.target.value)}
              className="input-std bg-white w-full sm:w-64 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-purple-100"
              disabled={loading || teacherClasses.length === 0}
            >
              <option value="" disabled>Choose Your Class</option>
              {teacherClasses.map((cls, idx) => (
                <option key={idx} value={idx}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* --- Loading State --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin mb-4" />
            <div className="text-center">
                <p className="text-gray-500 font-bold tracking-wide uppercase">LOADING DATA...</p>
                <p className="text-[10px] text-purple-400 font-bold uppercase mt-1">তথ্য লোড হচ্ছে | डेटा लोड हो रहा है</p>
            </div>
          </div>
        ) : teacherClasses.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700 leading-none">No Classes Assigned</h3>
            <p className="text-[10px] font-bold text-purple-400 mt-1 uppercase">কোনো ক্লাস নির্ধারিত নেই | कोई कक्षा आवंटित नहीं</p>
            <p className="text-gray-500 text-sm mt-3 px-4">You are not assigned as a Class Teacher for the active session.</p>
          </div>
        ) : !selectedClass ? (
          <div className="py-16 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700 leading-none">Select a Class</h3>
            <p className="text-[10px] font-bold text-purple-400 mt-1 uppercase">একটি ক্লাস নির্বাচন করুন | एक कक्षा चुनें</p>
          </div>
        ) : (
          
          <div className="space-y-6">
            
            {/* --- STUDENTS LIST HEADER --- */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 leading-none">Student Records</h3>
                <span className="text-[9px] font-bold text-purple-600 mt-1 uppercase tracking-wider">ছাত্র তালিকা | छात्र रिकॉर्ड</span>
              </div>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                Total (মোট): {students.length}
              </span>
            </div>
            
            {students.length === 0 ? (
               <div className="py-12 text-center bg-white rounded-xl border border-gray-100">
                 <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                 <p className="text-gray-500 font-bold">No students enrolled | কোনো ছাত্র নেই</p>
               </div>
            ) : (
              <div className="space-y-3">
                {students.map(student => {
                  const isStudentExpanded = expandedStudent === student.uid;
                  
                  return (
                    <div key={student.uid} className={`bg-white rounded-xl border transition-all ${isStudentExpanded ? 'border-purple-200 shadow-md ring-1 ring-purple-50' : 'border-gray-200 shadow-sm'}`}>
                      
                      <button 
                        onClick={() => toggleStudent(student.uid)}
                        className={`w-full flex items-center justify-between p-4 transition-colors ${isStudentExpanded ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white text-purple-700 rounded-full flex flex-col items-center justify-center font-black text-xs border border-purple-100 shadow-inner">
                            <span className="leading-none">{student.rollNo || '-'}</span>
                            <span className="text-[7px] text-purple-300 mt-0.5">ROLL</span>
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-gray-800 text-base leading-none">{student.name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Reg: {student.regNo} | রোল: {student.rollNo}</p>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isStudentExpanded ? <ChevronUp size={20} className="text-purple-500" /> : <ChevronDown size={20} />}
                        </div>
                      </button>

                      {isStudentExpanded && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/30 space-y-3">
                          {exams.length === 0 ? (
                            <p className="text-xs text-gray-500 font-bold italic py-2 text-center uppercase">No exams assigned | কোনো পরীক্ষা নেই</p>
                          ) : (
                            <div className="space-y-3">
                              {exams.map(exam => {
                                const isExamExpanded = expandedExam === exam.id;
                                const examResults = student.results?.filter(r => r.examId === exam.id) || [];

                                return (
                                  <div key={exam.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    
                                    <button 
                                      onClick={() => toggleExam(exam.id)}
                                      className="w-full flex justify-between items-center p-3 hover:bg-purple-50/40 transition-colors"
                                    >
                                      <div className="flex flex-col items-start">
                                        <span className="font-bold text-gray-700 text-sm flex items-center gap-2 leading-none">
                                            <FileText size={14} className="text-purple-500" /> {exam.name}
                                        </span>
                                        <span className="text-[8px] font-bold text-purple-400 uppercase mt-1 ml-6">পরীক্ষার নাম | परीक्षा</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <span className="block text-[10px] font-black text-gray-400 leading-none">{examResults.length}</span>
                                            <span className="text-[7px] font-bold text-gray-300 uppercase">Subjects</span>
                                        </div>
                                        {isExamExpanded ? <ChevronUp size={16} className="text-purple-600"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                      </div>
                                    </button>

                                    {isExamExpanded && (
                                      <div className="border-t border-gray-100 overflow-x-auto">
                                        {examResults.length === 0 ? (
                                          <div className="p-6 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">No marks entered for this exam yet</p>
                                            <p className="text-[9px] text-purple-300 font-bold uppercase">ফলাফল পাওয়া যায়নি | कोई परिणाम नहीं</p>
                                          </div>
                                        ) : (
                                          <table className="w-full text-left text-xs whitespace-nowrap">
                                            <thead className="bg-gray-50/80 text-gray-400 font-black text-[9px] uppercase tracking-widest">
                                              <tr>
                                                <th className="px-4 py-3">Index | সূচক</th>
                                                <th className="px-4 py-3">Subject Name | বিষয়</th>
                                                <th className="px-4 py-3">Full Marks | পূর্ণমান</th>
                                                <th className="px-4 py-3">Obtained | প্রাপ্তমান</th>
                                                <th className="px-4 py-3">Remarks | মন্তব্য</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {examResults.map((res, i) => (
                                                <tr key={i} className="hover:bg-purple-50/50 transition-colors">
                                                  <td className="px-4 py-3 font-bold text-gray-500">
                                                    {getSubjectIndex(res.subjectId)}
                                                  </td>
                                                  <td className="px-4 py-3 font-black text-gray-700">
                                                    {res.subjectName}
                                                  </td>
                                                  <td className="px-4 py-3 text-gray-500 font-bold">
                                                    {res.fullMarks || '-'}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded w-fit">
                                                        {res.obtainedMarks || res.grade || '-'}
                                                        </span>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3 text-gray-500 text-[10px] font-medium italic truncate max-w-[200px]" title={res.remarks}>
                                                    {res.remarks || '-'}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
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
        )}
      </div>

      <style>{`
        .input-std {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .input-std:focus {
          border-color: #9333ea;
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.1);
        }
      `}</style>
    </TeacherDashboardLayout>
  );
};

export default TeacherResult;