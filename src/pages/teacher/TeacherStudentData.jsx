import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { 
  Search, GraduationCap, Calendar, FileText, Award, 
  ArrowLeft, User, Loader2, ChevronLeft, ChevronRight,
  BookOpen, Coins, Receipt, Book
} from 'lucide-react';

const TeacherStudentData = () => {
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Calendar and Diary state for the selected student
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 1. Fetch ONLY the Active session on mount
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const activeSessionQuery = query(
          collection(db, 'academicSessions'), 
          where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(activeSessionQuery);

        if (!querySnapshot.empty) {
          setSelectedSessionId(querySnapshot.docs[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching active session:", error);
        setLoading(false);
      }
    };
    fetchActiveSession();
  }, []);

  // 2. Fetch students AND their profile photos from the users collection
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchStudentsForSession = async () => {
      setLoading(true);
      try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'Student'));
        const usersSnap = await getDocs(usersQuery);
        const userPhotoMap = {};
        
        usersSnap.forEach(userDoc => {
          const userData = userDoc.data();
          if (userData.documents && userData.documents.photo) {
            userPhotoMap[userDoc.id] = userData.documents.photo;
          }
        });

        const sessionRef = doc(db, 'academicSessions', selectedSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          const studentsList = [];

          if (sessionData.classes && Array.isArray(sessionData.classes)) {
            sessionData.classes.forEach(cls => {
              
              const classDetails = {
                name: cls.name,
                classTeacher: cls.classTeacher || 'Not Assigned',
                description: cls.description || '',
                subjects: cls.subjects || [],
                exams: cls.exams || [],
                fees: cls.fees || [],
                diaries: cls.diaries || [] 
              };

              if (cls.students && Array.isArray(cls.students)) {
                cls.students.forEach(student => {
                  studentsList.push({
                    ...student,
                    className: cls.name,
                    classDetails: classDetails, 
                    sessionId: selectedSessionId,
                    profilePhoto: userPhotoMap[student.uid] || null 
                  });
                });
              }
            });
          }
          setAllStudents(studentsList);
        } else {
          setAllStudents([]);
        }
      } catch (error) {
        console.error("Error fetching session students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsForSession();
  }, [selectedSessionId]);

  const filteredStudents = allStudents.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(query) ||
      student.regNo?.toLowerCase().includes(query) ||
      student.rollNo?.toString().includes(query) ||
      student.className?.toLowerCase().includes(query)
    );
  });

  const getAttendanceStats = (attendanceObj) => {
    if (!attendanceObj) return { present: 0, absent: 0, total: 0 };
    const dates = Object.keys(attendanceObj);
    let present = 0;
    let absent = 0;
    dates.forEach(date => {
      if (attendanceObj[date] === 'Present') present++;
      else if (attendanceObj[date] === 'Absent') absent++;
    });
    return { present, absent, total: dates.length };
  };

  const getLocalISODate = (date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset*60*1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  const renderCalendarGrid = () => {
    if (!selectedStudent) return null;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const totalSlots = 42;
    const days = [];
    
    const todayStr = getLocalISODate(new Date());
    const selectedDateStr = getLocalISODate(selectedDate);
    const attendanceObj = selectedStudent.attendance || {};

    for (let i = firstDayIndex; i > 0; i--) days.push({ day: prevMonthDays - i + 1, type: 'prev', dateObj: new Date(year, month - 1, prevMonthDays - i + 1) });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, type: 'current', dateObj: new Date(year, month, i) });
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, type: 'next', dateObj: new Date(year, month + 1, i) });

    return days.map((item, idx) => {
        const dateStr = getLocalISODate(item.dateObj);
        const status = attendanceObj[dateStr];
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDateStr;
        const isWeekend = item.dateObj.getDay() === 0 || item.dateObj.getDay() === 6;

        let dotColor = null;
        if (status === 'Present') dotColor = "bg-emerald-500";
        else if (status === 'Absent') dotColor = "bg-rose-500";
        else if (status === 'Late') dotColor = "bg-amber-500";
        else if (status === 'Half Day') dotColor = "bg-blue-500";

        let textColor = 'text-gray-700';
        if (isSelected) textColor = 'text-white';
        else if (item.type !== 'current') textColor = 'text-gray-300';
        else if (isWeekend) textColor = 'text-rose-400';

        return (
            <div 
              key={idx} 
              onClick={() => setSelectedDate(item.dateObj)}
              className="h-10 w-full flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
            >
                <div className={`h-8 w-8 flex items-center justify-center text-sm font-medium rounded-full ${isSelected ? 'bg-blue-600 shadow-md' : isToday ? 'border border-blue-600 shadow-sm' : ''} ${textColor}`}>
                    {item.day}
                </div>
                {item.type === 'current' && dotColor && !isSelected && (
                    <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                )}
            </div>
        );
    });
  };

  return (
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
        
        {/* --- STATE 1: STUDENT DETAIL VIEW --- */}
        {selectedStudent ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Back Button */}
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => {
                  setSelectedStudent(null);
                  setViewDate(new Date()); 
                  setSelectedDate(new Date());
                }} 
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600 shadow-sm"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 leading-none">{selectedStudent.name}</h1>
                <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ছাত্রের বিবরণ | छात्र विवरण</p>
                <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">
                  Reg: {selectedStudent.regNo} | Class: {selectedStudent.className}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              {/* Left Column */}
              <div className="xl:col-span-1 space-y-6">
                
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-blue-600"/>
                      <h2 className="font-bold text-blue-900">Basic Information</h2>
                    </div>
                    <span className="text-[9px] font-bold text-blue-400 mt-0.5 ml-7 uppercase">প্রাথমিক তথ্য | बुनियादी जानकारी</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex justify-center mb-4">
                      {selectedStudent.profilePhoto ? (
                        <img 
                          src={selectedStudent.profilePhoto} 
                          alt={selectedStudent.name} 
                          className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-sm" 
                        />
                      ) : (
                        <div className="h-24 w-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-3xl border-4 border-white shadow-sm">
                          {selectedStudent.name?.charAt(0) || 'S'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name</p>
                      <p className="text-[8px] font-bold text-purple-400 uppercase leading-none">পুরো নাম | पूरा नाम</p>
                      <p className="font-medium text-gray-800 mt-1">{selectedStudent.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registration No</p>
                        <p className="text-[8px] font-bold text-purple-400 uppercase leading-none">রেজিস্ট্রেশন নম্বর | पंजीकरण संख्या</p>
                        <p className="font-medium text-gray-800 mt-1">{selectedStudent.regNo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Roll No</p>
                        <p className="text-[8px] font-bold text-purple-400 uppercase leading-none">রোল নম্বর | अनुक्रमांक</p>
                        <p className="font-medium text-gray-800 mt-1">{selectedStudent.rollNo || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-cyan-50/50 px-4 py-3 border-b border-cyan-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <BookOpen size={18} className="text-cyan-600"/>
                      <h2 className="font-bold text-cyan-900">Class Information</h2>
                    </div>
                    <span className="text-[9px] font-bold text-cyan-400 mt-0.5 ml-7 uppercase">ক্লাস তথ্য | कक्षा की जानकारी</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Class Teacher</p>
                      <p className="text-[8px] font-bold text-purple-400 uppercase leading-none">ক্লাস শিক্ষক | कक्षा अध्यापक</p>
                      <p className="font-medium text-gray-800 mt-1">{selectedStudent.classDetails?.classTeacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Subjects Assigned</p>
                      <p className="text-[8px] font-bold text-purple-400 uppercase leading-none mb-2">নির্ধারিত বিষয় | असाइन किए गए विषय</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.classDetails?.subjects.map((sub, i) => (
                          <span key={i} className="px-2 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-bold uppercase rounded border border-cyan-100">
                            {sub.name}
                          </span>
                        )) || <span className="text-sm text-gray-500">No subjects found.</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-emerald-50/50 px-4 py-3 border-b border-emerald-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-600"/>
                      <h2 className="font-bold text-emerald-900">Attendance Tracker</h2>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 mt-0.5 ml-7 uppercase">হাজিরা ট্র্যাকার | उपस्थिति ट्रैकर</span>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    {(() => {
                      const stats = getAttendanceStats(selectedStudent.attendance);
                      return (
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <span className="block text-xl font-black text-gray-700">{stats.total}</span>
                            <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Total Recs</span>
                            <span className="block text-[7px] font-bold text-gray-400 uppercase">মোট রেকর্ড</span>
                          </div>
                          <div>
                            <span className="block text-xl font-black text-emerald-600">{stats.present}</span>
                            <span className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider">Present</span>
                            <span className="block text-[7px] font-bold text-emerald-400 uppercase">উপস্থিত</span>
                          </div>
                          <div>
                            <span className="block text-xl font-black text-rose-600">{stats.absent}</span>
                            <span className="text-[9px] font-bold uppercase text-rose-600 tracking-wider">Absent</span>
                            <span className="block text-[7px] font-bold text-rose-400 uppercase">অনুপস্থিত</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-sm font-bold text-gray-800">
                          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={16}/></button>
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 px-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                        <div key={i} className={`text-center text-[10px] font-bold uppercase ${i===0 || i===6 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 px-1 pb-2 gap-y-1">
                      {renderCalendarGrid()}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-2 pt-3 mt-2 border-t border-gray-100 justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pres. | উ</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Abs. | অ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="xl:col-span-2 space-y-6">
                
                {/* Class Diary */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-indigo-50/50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Book size={18} className="text-indigo-600"/>
                        <h2 className="font-bold text-indigo-900">Class Diary</h2>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-400 mt-0.5 ml-7 uppercase">ক্লাস ডায়েরি | कक्षा डायरी</span>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md uppercase tracking-wider">
                      {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="p-5">
                    {(() => {
                      const selectedDateStr = getLocalISODate(selectedDate);
                      const dayDiaries = selectedStudent.classDetails?.diaries?.filter(d => d.date === selectedDateStr) || [];
                      
                      if (dayDiaries.length > 0) {
                        return (
                          <div className="space-y-4">
                            {dayDiaries.map((diary, idx) => (
                              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-3 border-b border-gray-200/60 pb-3">
                                  <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{diary.subject || 'Subject'}</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5 tracking-wider">
                                      {diary.startTime || '--:--'} to {diary.endTime || '--:--'}
                                    </p>
                                  </div>
                                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase rounded tracking-wider">
                                    {diary.teacherName || 'Teacher'}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {diary.topic && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Topic | আলোচনার বিষয়</p>
                                      <p className="text-sm text-gray-700 font-medium">{diary.topic}</p>
                                    </div>
                                  )}
                                  {diary.homework && (
                                    <div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Homework | বাড়ির কাজ</p>
                                      <p className="text-sm text-gray-700">{diary.homework}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Book className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 font-medium text-sm">No class diary entries for this date.</p>
                            <p className="text-[10px] text-gray-400 uppercase mt-1">এই তারিখে কোনো তথ্য নেই</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* Academic Results */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-amber-600"/>
                      <h2 className="font-bold text-amber-900">Academic Results</h2>
                    </div>
                    <span className="text-[9px] font-bold text-amber-400 mt-0.5 ml-7 uppercase">ফলাফল | शैक्षणिक परिणाम</span>
                  </div>
                  <div className="p-5">
                     {selectedStudent.results && selectedStudent.results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedStudent.results.map((result, idx) => (
                             <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                               <div className="flex justify-between items-start mb-3">
                                  <h3 className="font-bold text-gray-800 text-sm max-w-[70%]">{result.subjectName || 'Unknown Subject'}</h3>
                                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded tracking-wider">
                                    {result.examName || 'Exam'}
                                  </span>
                               </div>
                               
                               <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/60">
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Marks | নম্বর</p>
                                    <p className="font-black text-gray-800 text-lg">
                                      {result.obtainedMarks || '-'} <span className="text-sm font-medium text-gray-400">/ {result.fullMarks || '-'}</span>
                                    </p>
                                  </div>
                                  <div className="text-right max-w-[50%]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remark | মন্তব্য</p>
                                    <p className="text-xs font-medium text-gray-600 truncate" title={result.remarks}>{result.remarks || 'None'}</p>
                                  </div>
                               </div>
                             </div>
                          ))}
                        </div>
                     ) : (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <Award className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium text-sm">No exam results published yet.</p>
                      </div>
                     )}
                  </div>
                </div>

                {/* Teacher Remarks */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-purple-50/50 px-4 py-3 border-b border-purple-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-purple-600"/>
                      <h2 className="font-bold text-purple-900">Teacher Remarks</h2>
                    </div>
                    <span className="text-[9px] font-bold text-purple-400 mt-0.5 ml-7 uppercase">শিক্ষকের মন্তব্য | शिक्षक की टिप्पणी</span>
                  </div>
                  <div className="p-5">
                    {selectedStudent.remarks && selectedStudent.remarks.length > 0 ? (
                      <div className="space-y-4">
                        {[...selectedStudent.remarks].sort((a,b) => new Date(b.date) - new Date(a.date)).map((remark, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase tracking-wider">
                                  {remark.category || 'General'}
                                </span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {remark.date ? new Date(remark.date).toLocaleDateString() : '-'}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm mb-1">{remark.remark}</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                — {remark.teacherName || 'Unknown Teacher'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium text-sm">No remarks found.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fee History */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="bg-green-50/50 px-4 py-3 border-b border-green-100 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Coins size={18} className="text-green-600"/>
                      <h2 className="font-bold text-green-900">Fee History</h2>
                    </div>
                    <span className="text-[9px] font-bold text-green-400 mt-0.5 ml-7 uppercase">ফি প্রদানের ইতিহাস | शुल्क विवरण</span>
                  </div>
                  <div className="p-5">
                    {selectedStudent.feeHistory && selectedStudent.feeHistory.length > 0 ? (
                      <div className="space-y-4">
                        {[...selectedStudent.feeHistory].sort((a,b) => new Date(b.date) - new Date(a.date)).map((record, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex justify-between items-start mb-3 border-b border-gray-200/60 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-black text-green-700">₹{record.amount || record.subtotal}</span>
                                  {record.month && (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase tracking-wider">
                                      {record.month}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                                  {new Date(record.date).toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded tracking-wider flex items-center gap-1 justify-end">
                                  <Receipt size={12}/> {record.receiptId || 'PAID'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase">Payment Summary | বিবরণ</p>
                              {record.fees?.map((fee, fIdx) => (
                                <div key={fIdx} className="flex justify-between items-center text-xs text-gray-600">
                                  <span className="font-medium text-gray-500">{fee.title}</span>
                                  <span className="font-bold text-gray-700">₹{fee.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <Coins className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium text-sm">No fee transactions found.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          
          /* --- STATE 2: SEARCH & LIST VIEW --- */
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 border-gray-200">
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 leading-none">Student Directory</h1>
                <span className="text-[11px] font-bold text-purple-600 mt-2 uppercase tracking-wide">ছাত্র ডিরেক্টরি | छात्र निर्देशिका</span>
                <p className="text-gray-500 mt-2 text-sm md:text-base">Search student records | ছাত্র রেকর্ড অনুসন্ধান করুন</p>
              </div>
              
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input 
                    type="text" 
                    placeholder="Search name, class... | খুঁজুন..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-std pl-10 w-full font-medium"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <div className="text-center">
                    <p className="text-gray-500 font-bold tracking-wide uppercase">Loading Students...</p>
                    <p className="text-[10px] text-purple-400 font-bold mt-1 uppercase">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map((student, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedStudent(student)}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="p-5 flex items-start gap-4">
                      {student.profilePhoto ? (
                        <img 
                          src={student.profilePhoto} 
                          alt={student.name} 
                          className="h-12 w-12 rounded-full object-cover shrink-0 border border-gray-200" 
                        />
                      ) : (
                        <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-800 truncate leading-none">{student.name}</h3>
                        <p className="text-[9px] font-bold text-purple-400 uppercase mt-1">Roll: {student.rollNo || 'N/A'}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1 truncate">{student.regNo}</p>
                        
                        <div className="flex gap-2 mt-3">
                          <span className="px-2 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold uppercase rounded border border-gray-100 truncate">
                            Class {student.className}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && filteredStudents.length === 0 && (
                  <div className="col-span-full py-16 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-700">No students found</h3>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your search criteria.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .input-std {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        .input-std:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </TeacherDashboardLayout>
  );
};

export default TeacherStudentData;