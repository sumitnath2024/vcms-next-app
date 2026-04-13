import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, BookOpen, AlertCircle, Loader2, FileText, 
  Lock, Printer, Award, Users, MessageSquare, Activity
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

const StudentResults = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [publishedExams, setPublishedExams] = useState([]); 
  const [allStudentResults, setAllStudentResults] = useState([]); 
  const [allClassStudents, setAllClassStudents] = useState([]); 
  const [selectedExamId, setSelectedExamId] = useState('');
  const [studentClass, setStudentClass] = useState(''); 
  const [error, setError] = useState(null);
  const [studentAllowedMap, setStudentAllowedMap] = useState({});

  useEffect(() => {
    const fetchAndFilterResults = async () => {
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

        let myClass = null;
        let myStudentData = null;

        for (const cls of allClasses) {
          const studentMatch = cls.students?.find(s => s.uid === user.uid);
          if (studentMatch) {
            myClass = cls;
            myStudentData = studentMatch;
            break;
          }
        }

        if (!myClass || !myStudentData) {
          setError("Could not find your student record in this session.");
          setLoading(false);
          return;
        }

        setStudentClass(myClass.name);
        setAllClassStudents(myClass.students || []);

        const schedules = myClass.examSchedules || [];
        const masterExams = myClass.exams || [];

        const allowedMap = {};
        const publishedIds = new Set();

        schedules.forEach(sched => {
            if (sched.status === "PUBLISHED") {
                publishedIds.add(sched.examId);
                allowedMap[sched.examId] = sched.publishedUids ? sched.publishedUids.includes(user.uid) : true;
            }
        });

        setStudentAllowedMap(allowedMap);

        const availablePublishedExams = masterExams.filter(exam => publishedIds.has(exam.id));
        setPublishedExams(availablePublishedExams);
        setAllStudentResults(myStudentData.results || []);

        if (availablePublishedExams.length > 0) {
          setSelectedExamId(availablePublishedExams[0].id);
        }

      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to sync report card data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilterResults();
  }, [user]);

  const currentStudentRecord = useMemo(() => {
    return allClassStudents.find(s => s.uid === user?.uid) || null;
  }, [allClassStudents, user]);

  const currentExamResults = useMemo(() => {
    if (!selectedExamId) return [];
    return allStudentResults.filter(r => r.examId === selectedExamId);
  }, [allStudentResults, selectedExamId]);

  const selectedExamName = useMemo(() => {
    const exam = publishedExams.find(e => e.id === selectedExamId);
    return exam ? exam.name : '';
  }, [publishedExams, selectedExamId]);

  // Logic to fetch Conduct, Remarks, and Strength
  const examSummary = useMemo(() => {
    if (!selectedExamId || !currentStudentRecord) return null;
    return (currentStudentRecord.examSummaries || []).find(s => s.examId === selectedExamId) || null;
  }, [selectedExamId, currentStudentRecord]);

  const highestMarksMap = useMemo(() => {
    if (!selectedExamId || !allClassStudents.length) return {};
    const map = {};
    allClassStudents.forEach(std => {
      const resList = std.results?.filter(r => r.examId === selectedExamId) || [];
      resList.forEach(r => {
        const val = parseFloat(r.obtainedMarks);
        if (!isNaN(val)) {
           if (!map[r.subjectId] || val > map[r.subjectId]) map[r.subjectId] = val;
        }
      });
    });
    return map;
  }, [selectedExamId, allClassStudents]);

  const stats = useMemo(() => {
    if (currentExamResults.length === 0) return null;
    const totalObtained = currentExamResults.reduce((sum, r) => sum + parseFloat(r.obtainedMarks || 0), 0);
    const totalMax = currentExamResults.reduce((sum, r) => sum + parseFloat(r.fullMarks || 0), 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
    return { totalObtained, totalMax, percentage };
  }, [currentExamResults]);

  const handlePrint = () => window.print();

  const printRowCount = Math.max(currentExamResults.length, 11); 
  const printRows = Array.from({ length: printRowCount }).map((_, i) => {
    const res = currentExamResults[i];
    return {
      subj: res?.subjectName || '',
      full: res?.fullMarks || '',
      obtd: res?.obtainedMarks || '',
      high: res ? (highestMarksMap[res.subjectId] || '') : ''
    };
  });

  const isResultAllowed = studentAllowedMap[selectedExamId];

  return (
    <>
      {/* --- SCREEN UI --- */}
      <div className="print:hidden">
        <StudentDashboardLayout>
          <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4">
            
            {/* Header Card */}
            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-yellow-50 rounded-2xl text-yellow-600 shadow-inner">
                  <Trophy size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-800 leading-none">Academic Report</h1>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">একাডেমিক রিপোর্ট / अकादमिक रिपोर्ट</p>
                  <p className="text-xs font-bold uppercase mt-3">
                    <span className="text-slate-400">Class / শ্রেণী: </span>
                    <span className="text-emerald-700">{studentClass || currentStudentRecord?.classEnrolled || 'Not Assigned'}</span>
                  </p>
                </div>
              </div>

              {publishedExams.length > 0 && (
                <div className="w-full md:w-auto flex flex-col md:flex-row items-end gap-4">
                    <div className="flex flex-col w-full">
                        <span className="text-[9px] font-black text-emerald-600 uppercase mb-1 px-2">Select Exam</span>
                        <select 
                            className="w-full md:w-64 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none text-gray-800 font-black focus:ring-2 focus:ring-emerald-500 appearance-none shadow-sm"
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                        >
                            {publishedExams.map(exam => (
                              <option key={exam.id} value={exam.id}>{exam.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={handlePrint}
                        disabled={currentExamResults.length === 0 || !isResultAllowed}
                        className="hidden md:flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase hover:bg-black transition-colors disabled:opacity-50 h-full"
                    >
                        <Printer size={18} /> Print
                    </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="animate-spin text-emerald-600" size={48} />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-600 flex items-center gap-3">
                <AlertCircle /> <span className="font-bold">{error}</span>
              </div>
            ) : publishedExams.length === 0 ? (
              <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-gray-300 text-center space-y-4">
                 <Lock size={44} className="text-gray-300 mx-auto" />
                 <h3 className="text-xl font-black text-gray-700">Results Pending Publication</h3>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    
                    {!isResultAllowed ? (
                        <div className="bg-red-50 p-16 rounded-[2.5rem] border border-red-100 text-center space-y-4 shadow-sm mt-4">
                            <Lock size={44} className="text-red-500 mx-auto" />
                            <h3 className="text-xl font-black text-red-700">Result Withheld</h3>
                            <p className="text-red-600 font-medium">Please contact admin to get update of your results.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Stats Boxes */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatBox label="Rank" sub="র‌্যাঙ্ক" value={examSummary?.rank || '-'} color="text-purple-600" icon={<Award size={16} className="text-purple-400 mb-1"/>} />
                                <StatBox label="Obtained" sub="প্রাপ্ত নম্বর" value={`${stats?.totalObtained || 0} / ${stats?.totalMax || 0}`} />
                                <StatBox label="Percentage" sub="শতাংশ" value={`${stats?.percentage || 0}%`} color="text-emerald-600" />
                                <StatBox label="Attendance" sub="উপস্থিতি" value={examSummary?.attendance || '-'} />
                            </div>

                            {/* --- ADDED: NEW SUMMARY CARD FOR CONDUCT, REMARKS & STRENGTH --- */}
                            <div className="bg-white rounded-[2rem] border border-gray-200 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
                                    <Activity size={18} className="text-blue-500" />
                                    <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Overall Evaluation Summary</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Users size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-wider">Class Strength</span>
                                        </div>
                                        <p className="text-lg font-black text-gray-800">{examSummary?.studentStrength || '-'}</p>
                                    </div>

                                    <div className="flex flex-col gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Award size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-wider">Conduct</span>
                                        </div>
                                        <p className="text-lg font-black text-gray-800">{examSummary?.conduct || '-'}</p>
                                    </div>

                                    <div className="flex flex-col gap-1 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <div className="flex items-center gap-2 text-blue-400">
                                            <MessageSquare size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-wider">General Remarks</span>
                                        </div>
                                        <p className="text-sm font-bold text-blue-800 italic">"{examSummary?.remarks || 'No remarks provided.'}"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Marksheet Table */}
                            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                  <FileText size={18} className="text-emerald-600" />
                                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Statement of Marks</h3>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/30 text-[10px] font-black text-gray-400 uppercase border-b">
                                    <tr>
                                        <th className="px-8 py-4">Subject</th>
                                        <th className="px-8 py-4 text-center">Full Marks</th>
                                        <th className="px-8 py-4 text-center">Obtained</th>
                                        <th className="px-8 py-4 text-center">Highest</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                    {currentExamResults.map((result, idx) => (
                                        <tr key={idx}>
                                            <td className="px-8 py-5 font-black text-gray-800 uppercase text-sm">{result.subjectName}</td>
                                            <td className="px-8 py-5 text-center font-bold text-gray-500">{result.fullMarks}</td>
                                            <td className="px-8 py-5 text-center font-black text-xl text-gray-900">{result.obtainedMarks}</td>
                                            <td className="px-8 py-5 text-center font-bold text-blue-600">{highestMarksMap[result.subjectId] || '-'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </>
                    )}
              </div>
            )}
          </div>
        </StudentDashboardLayout>
      </div>

      {/* --- PRINT UI: PERSISTED ROW CLUBBING LOGIC --- */}
      {isResultAllowed && (
        <div className="hidden print:block font-serif text-black p-4 w-full h-full max-w-[800px] mx-auto bg-white">
            <div className="border-[8px] border-double border-black p-6 min-h-[90vh] flex flex-col">
                <h1 className="text-center font-bold text-2xl uppercase underline underline-offset-4 mb-6">{selectedExamName}</h1>

                {/* Student Details Header */}
                <div className="flex justify-between items-end mb-6 text-[13px] font-bold uppercase tracking-wider">
                    <div className="space-y-2 w-[55%]">
                        <div className="flex items-end"><span className="w-20">Name</span><span>:</span><span className="border-b border-black border-dotted flex-1 ml-1">{currentStudentRecord?.name || '-'}</span></div>
                        <div className="flex items-end"><span className="w-20">Reg. No.</span><span>:</span><span className="border-b border-black border-dotted flex-1 ml-1">{currentStudentRecord?.regNo || '-'}</span></div>
                    </div>
                    <div className="space-y-2 w-[40%]">
                        <div className="flex items-end"><span className="w-16">Class</span><span>:</span><span className="border-b border-black border-dotted flex-1 text-center">{studentClass || '-'}</span></div>
                        <div className="flex items-end"><span className="w-16">Roll No.</span><span>:</span><span className="border-b border-black border-dotted flex-1 text-center">{currentStudentRecord?.rollNo || '-'}</span></div>
                        <div className="flex items-end"><span className="w-16">Date</span><span>:</span><span className="border-b border-black border-dotted flex-1 text-center">{new Date().toLocaleDateString('en-GB')}</span></div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col">
                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr>
                                <th className="border border-black p-2 uppercase">Subjects</th>
                                <th className="border border-black p-2 uppercase w-20 text-[10px]">Full Marks</th>
                                <th className="border border-black p-2 uppercase w-20 text-[10px]">Highest Marks</th>
                                <th className="border border-black p-2 uppercase w-20 text-[10px]">Marks Obtd.</th>
                                <th className="border border-black p-2 uppercase w-28">Rank</th>
                                <th className="border border-black p-2 text-center w-24 text-lg font-black">{examSummary?.rank || '-'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printRows.map((row, i) => {
                                const isSpilloverRow = [4, 6, 8, 10].includes(i);
                                return (
                                    <tr key={i}>
                                        <td className="border border-black p-2 uppercase font-semibold h-[2.2rem] text-xs">{row.subj}</td>
                                        <td className="border border-black p-2 text-center h-[2.2rem] text-xs">{row.full}</td>
                                        <td className="border border-black p-2 text-center h-[2.2rem] text-xs">{row.high}</td>
                                        <td className="border border-black p-2 text-center font-bold h-[2.2rem] text-xs">{row.obtd}</td>
                                        {!isSpilloverRow && (
                                            <>
                                                {i === 0 && <><td className="border border-black p-1 text-center text-[9px] leading-tight font-bold">Student Strength<br/>in the class room</td><td className="border border-black p-1 text-center font-bold">{examSummary?.studentStrength || ''}</td></>}
                                                {i === 1 && <><td className="border border-black p-1 text-center text-xs font-bold">Attendance</td><td className="border border-black p-1 text-center font-bold">{examSummary?.attendance || ''}</td></>}
                                                {i === 2 && <><td className="border border-black p-1 text-center text-xs font-bold">Conduct</td><td className="border border-black p-1 text-center font-bold">{examSummary?.conduct || ''}</td></>}
                                                {i === 3 && <><td className="border border-black p-1 text-center text-xs font-bold align-middle" rowSpan={2}>Remarks</td><td className="border border-black p-1 text-[9px] leading-tight font-bold align-middle" rowSpan={2}>{examSummary?.remarks || ''}</td></>}
                                                {i === 5 && <><td className="border border-black p-1 text-center text-[9px] leading-tight font-bold align-middle" rowSpan={2}>Signature of<br/>Principal</td><td className="border border-black p-1" rowSpan={2}></td></>}
                                                {i === 7 && <><td className="border border-black p-1 text-center text-[9px] leading-tight font-bold align-middle" rowSpan={2}>Signature of Class<br/>Teacher</td><td className="border border-black p-1" rowSpan={2}></td></>}
                                                {i === 9 && <><td className="border border-black p-1 text-center text-[9px] leading-tight font-bold align-middle" rowSpan={2}>Signature of<br/>Guardian</td><td className="border border-black p-1" rowSpan={2}></td></>}
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                            <tr className="font-bold">
                                <td className="border border-black p-2 text-center uppercase text-xs">Grand Total</td>
                                <td className="border border-black p-2 text-center text-xs">{stats?.totalMax}</td>
                                <td className="border border-black p-2 text-center text-xs"></td>
                                <td className="border border-black p-2 text-center text-xs">{stats?.totalObtained}</td>
                                <td className="border border-black border-t-0 p-2" colSpan={2}></td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="text-right font-bold text-sm mt-2">Pass Marks 40%</div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

const StatBox = ({ label, sub, value, color = "text-gray-800", icon = null }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
    <div>
      <div className="flex items-center gap-1">{icon}<p className="text-[10px] font-black text-gray-400 uppercase leading-none">{label}</p></div>
      <p className="text-[8px] font-bold text-gray-300 uppercase mt-1 mb-2">{sub}</p>
    </div>
    <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
  </div>
);

export default StudentResults;