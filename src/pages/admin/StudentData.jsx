import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { 
  Search, GraduationCap, Calendar, FileText, Award, 
  ArrowLeft, User, Loader2, ChevronLeft, ChevronRight,
  BookOpen, Coins, Receipt, Book, ChevronDown
} from 'lucide-react';

const StudentData = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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
        if (activeId) {
          setSelectedSessionId(activeId);
        } else if (sessionList.length > 0) {
          setSelectedSessionId(sessionList[0].id);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };
    fetchSessions();
  }, []);

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
            <div key={idx} onClick={() => setSelectedDate(item.dateObj)} className="h-10 w-full flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                <div className={`h-8 w-8 flex items-center justify-center text-sm font-medium rounded-full ${isSelected ? 'bg-blue-600 shadow-md' : isToday ? 'border border-blue-600 shadow-sm' : ''} ${textColor}`}>{item.day}</div>
                {item.type === 'current' && dotColor && !isSelected && <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`}></div>}
                {item.type === 'current' && dotColor && isSelected && <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white"></div>}
            </div>
        );
    });
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20 font-sans">
        
        {/* --- STATE 1: STUDENT DETAIL VIEW --- */}
        {selectedStudent ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => { setSelectedStudent(null); setViewDate(new Date()); setSelectedDate(new Date()); }} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600 shadow-sm"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-3xl font-black text-gray-800 leading-none">{selectedStudent.name}</h1>
                <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ছাত্রের বিবরণ | छात्र विवरण</p>
                <p className="text-gray-500 font-medium mt-1">Reg: {selectedStudent.regNo} | Class: {selectedStudent.className}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              <div className="xl:col-span-1 space-y-6">
                
                {/* 1. Basic Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-blue-50/50 px-5 py-4 border-b border-blue-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <User size={18} className="text-blue-600"/>
                        <h2 className="font-black text-blue-900 uppercase text-xs tracking-widest">Basic Information</h2>
                    </div>
                    <span className="text-[9px] font-bold text-blue-400 mt-1 ml-7 uppercase">প্রাথমিক তথ্য | बुनियादी जानकारी</span>
                  </div>
                  <div className="p-6 space-y-5">
                    <div className="flex justify-center mb-4">
                      {selectedStudent.profilePhoto ? (
                        <img src={selectedStudent.profilePhoto} alt={selectedStudent.name} className="h-28 w-28 rounded-full object-cover border-4 border-blue-50 shadow-md" />
                      ) : (
                        <div className="h-28 w-28 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-4xl border-4 border-white shadow-md uppercase">{selectedStudent.name?.charAt(0) || 'S'}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name | নাম</p>
                      <p className="font-bold text-gray-800 text-lg leading-tight">{selectedStudent.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reg No | নথি নং</p>
                        <p className="font-bold text-gray-800">{selectedStudent.regNo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No | রোল</p>
                        <p className="font-bold text-gray-800">{selectedStudent.rollNo || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Class Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-cyan-50/50 px-5 py-4 border-b border-cyan-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-cyan-600"/>
                        <h2 className="font-black text-cyan-900 uppercase text-xs tracking-widest">Class Information</h2>
                    </div>
                    <span className="text-[9px] font-bold text-cyan-400 mt-1 ml-7 uppercase">ক্লাস তথ্য | कक्षा की जानकारी</span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Class Teacher | শ্রেণী শিক্ষক</p>
                      <p className="font-bold text-gray-800">{selectedStudent.classDetails?.classTeacher}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subjects | বিষয়</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.classDetails?.subjects.map((sub, i) => (
                          <span key={i} className="px-3 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-black uppercase rounded-lg border border-cyan-100 shadow-sm">{sub.name}</span>
                        )) || <span className="text-sm text-gray-400 italic">No subjects found.</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Attendance View */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-emerald-50/50 px-5 py-4 border-b border-emerald-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-emerald-600"/>
                        <h2 className="font-black text-emerald-900 uppercase text-xs tracking-widest">Attendance Tracker</h2>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 mt-1 ml-7 uppercase">হাজিরা ট্র্যাকার | उपस्थिति ट्रैकर</span>
                  </div>
                  
                  <div className="p-4 bg-gray-50 border-b border-gray-100 grid grid-cols-3 gap-3 text-center">
                    {(() => {
                      const stats = getAttendanceStats(selectedStudent.attendance);
                      return (
                        <>
                          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                            <span className="block text-xl font-black text-gray-800">{stats.total}</span>
                            <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">TOTAL (মোট)</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl shadow-sm border border-emerald-100">
                            <span className="block text-xl font-black text-emerald-600">{stats.present}</span>
                            <span className="text-[8px] font-black uppercase text-emerald-400 tracking-tighter">PRES. (উপঃ)</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl shadow-sm border border-rose-100">
                            <span className="block text-xl font-black text-rose-600">{stats.absent}</span>
                            <span className="text-[8px] font-black uppercase text-rose-400 tracking-tighter">ABS. (অপুঃ)</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-sm font-black text-gray-700">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-100 shadow-sm transition-all"><ChevronLeft size={16}/></button>
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-100 shadow-sm transition-all"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 text-center mb-2 px-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                        <div key={i} className={`text-[10px] font-black uppercase ${i===0 || i===6 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 px-1">{renderCalendarGrid()}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 mt-4 border-t border-gray-100 justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pres. | উ</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Abs. | অ</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-2 space-y-6">
                
                {/* 4. Class Diary */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-indigo-50/50 px-5 py-4 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Book size={18} className="text-indigo-600"/>
                        <h2 className="font-black text-indigo-900 uppercase text-xs tracking-widest">Class Diary</h2>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-400 mt-1 ml-7 uppercase">ক্লাস ডায়েরি | कक्षा डायरी</span>
                    </div>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-200">
                      {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="p-6">
                    {(() => {
                      const selectedDateStr = getLocalISODate(selectedDate);
                      const dayDiaries = selectedStudent.classDetails?.diaries?.filter(d => d.date === selectedDateStr) || [];
                      if (dayDiaries.length > 0) {
                        return (
                          <div className="space-y-4">
                            {dayDiaries.map((diary, idx) => (
                              <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4 border-b border-gray-200/60 pb-4">
                                  <div>
                                    <h3 className="font-black text-gray-800 text-base leading-tight uppercase">{diary.subject || 'Subject'}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{diary.startTime || '--:--'} to {diary.endTime || '--:--'}</p>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase rounded-lg border border-indigo-200 shadow-sm">{diary.teacherName || 'Teacher'}</span>
                                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Instructor | শিক্ষক</span>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  {diary.topic && (
                                    <div>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Topic | আলোচনার বিষয়</p>
                                      <p className="text-sm text-gray-700 font-bold leading-tight">{diary.topic}</p>
                                    </div>
                                  )}
                                  {diary.homework && (
                                    <div className="bg-white/50 p-3 rounded-xl border border-gray-200">
                                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 leading-none">Homework | বাড়ির কাজ</p>
                                      <p className="text-sm text-gray-600 font-medium italic">"{diary.homework}"</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <div className="py-12 text-center border-4 border-dashed border-gray-50 rounded-3xl bg-gray-50/20">
                            <Book className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-black uppercase text-sm tracking-widest">No diary entries for this date.</p>
                            <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">এই তারিখে কোনো তথ্য নেই</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                {/* 5. Academic Results */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-amber-50/50 px-5 py-4 border-b border-amber-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <Award size={18} className="text-amber-600"/>
                        <h2 className="font-black text-amber-900 uppercase text-xs tracking-widest">Academic Results</h2>
                    </div>
                    <span className="text-[9px] font-bold text-amber-400 mt-1 ml-7 uppercase">ফলাফল | शैक्षणिक परिणाम</span>
                  </div>
                  <div className="p-6">
                     {selectedStudent.results && selectedStudent.results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {selectedStudent.results.map((result, idx) => (
                             <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-lg transition-all group">
                               <div className="flex justify-between items-start mb-4">
                                  <div className="flex flex-col">
                                    <h3 className="font-black text-gray-800 text-sm max-w-[150px] uppercase leading-tight">{result.subjectName || 'Unknown Subject'}</h3>
                                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Subject | বিষয়</span>
                                  </div>
                                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-lg border border-amber-200 shadow-sm">{result.examName || 'Exam'}</span>
                               </div>
                               <div className="flex items-center justify-between pt-4 border-t border-gray-200/60">
                                  <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Marks | নম্বর</p>
                                    <p className="font-black text-gray-800 text-2xl tracking-tighter">
                                      {result.obtainedMarks || '-'} <span className="text-sm font-bold text-gray-400">/ {result.fullMarks || '-'}</span>
                                    </p>
                                  </div>
                                  <div className="text-right max-w-[50%]">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remark | মন্তব্য</p>
                                    <p className="text-xs font-bold text-amber-700 truncate" title={result.remarks}>{result.remarks || 'None'}</p>
                                  </div>
                               </div>
                             </div>
                          ))}
                        </div>
                     ) : (
                      <div className="py-12 text-center border-4 border-dashed border-gray-50 rounded-3xl bg-gray-50/20">
                        <Award className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-black uppercase text-sm tracking-widest">No results published yet.</p>
                      </div>
                     )}
                  </div>
                </div>

                {/* 6. Teacher Remarks */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-purple-50/50 px-5 py-4 border-b border-purple-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-purple-600"/>
                        <h2 className="font-black text-purple-900 uppercase text-xs tracking-widest">Teacher Remarks</h2>
                    </div>
                    <span className="text-[9px] font-bold text-purple-400 mt-1 ml-7 uppercase">শিক্ষকের মন্তব্য | शिक्षक की टिप्पणी</span>
                  </div>
                  <div className="p-6">
                    {selectedStudent.remarks && selectedStudent.remarks.length > 0 ? (
                      <div className="space-y-4">
                        {[...selectedStudent.remarks].sort((a,b) => new Date(b.date) - new Date(a.date)).map((remark, idx) => (
                          <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-3 py-1 rounded-lg uppercase tracking-widest border border-purple-200 shadow-sm">{remark.category || 'General'}</span>
                                <span className="text-[10px] text-gray-400 font-black uppercase">{remark.date ? new Date(remark.date).toLocaleDateString() : '-'}</span>
                              </div>
                              <p className="text-gray-700 text-sm font-bold leading-relaxed mb-2">"{remark.remark}"</p>
                              <div className="flex items-center gap-2">
                                <div className="h-5 w-5 bg-purple-200 rounded-full flex items-center justify-center text-[10px] font-black text-purple-800 uppercase leading-none shadow-sm">{remark.teacherName?.[0]}</div>
                                <span className="text-[10px] font-black text-gray-500 uppercase">— {remark.teacherName || 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center border-4 border-dashed border-gray-50 rounded-3xl bg-gray-50/20">
                        <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-black uppercase text-sm tracking-widest">No teacher remarks found.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Fee History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-green-50/50 px-5 py-4 border-b border-green-100 flex flex-col">
                    <div className="flex items-center gap-2">
                        <Coins size={18} className="text-green-600"/>
                        <h2 className="font-black text-green-900 uppercase text-xs tracking-widest">Fee History</h2>
                    </div>
                    <span className="text-[9px] font-bold text-green-400 mt-1 ml-7 uppercase">ফি প্রদানের ইতিহাস | शुल्क विवरण</span>
                  </div>
                  <div className="p-6">
                    {selectedStudent.feeHistory && selectedStudent.feeHistory.length > 0 ? (
                      <div className="space-y-4">
                        {[...selectedStudent.feeHistory].sort((a,b) => new Date(b.date) - new Date(a.date)).map((record, idx) => (
                          <div key={idx} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4 border-b border-gray-200/60 pb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black text-green-700 tracking-tighter">₹{record.amount || record.subtotal}</span>
                                  {record.month && (
                                    <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1 rounded-lg uppercase tracking-widest border border-green-200 shadow-sm">{record.month}</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-gray-500 font-black uppercase mt-1 tracking-widest">{new Date(record.date).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-black uppercase rounded-lg tracking-widest flex items-center gap-2 border border-green-200 shadow-sm">
                                  <Receipt size={14}/> {record.receiptId || 'PAID'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2 px-1">
                              {record.fees?.map((fee, fIdx) => (
                                <div key={fIdx} className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-400 uppercase tracking-tighter">{fee.title}</span>
                                  <span className="font-black text-gray-700">₹{fee.amount}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center border-4 border-dashed border-gray-50 rounded-3xl bg-gray-50/20">
                        <Coins className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 font-black uppercase text-sm tracking-widest">No fee transactions found.</p>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b pb-8 border-gray-200">
              <div className="flex flex-col">
                <h1 className="text-3xl font-black text-gray-800 leading-none">Student Data</h1>
                <span className="text-[11px] font-bold text-blue-600 mt-2 uppercase tracking-widest">ছাত্র তথ্য ভাণ্ডার | छात्र डेटाबेस</span>
                <p className="text-gray-500 mt-3 font-medium">Search and view comprehensive student records | ছাত্র রেকর্ড অনুসন্ধান করুন</p>
              </div>
              
              <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                <div className="relative group">
                    <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="input-std bg-white sm:w-56 font-black text-gray-700 cursor-pointer shadow-sm pr-10 appearance-none uppercase text-xs tracking-widest"
                    >
                    <option value="" disabled>Select Session</option>
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.id} {s.isActive ? '(Active)' : ''}</option>
                    ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input 
                    type="text" 
                    placeholder="Name, Reg No, or Class... | খুঁজুন..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-std pl-12 w-full font-bold shadow-sm"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border border-gray-100 shadow-inner">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <div className="text-center">
                    <p className="text-gray-500 font-black tracking-widest uppercase text-sm">Loading Records...</p>
                    <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStudents.map((student, idx) => (
                  <div key={idx} onClick={() => setSelectedStudent(student)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group">
                    <div className="p-5 flex items-start gap-4">
                      {student.profilePhoto ? (
                        <img src={student.profilePhoto} alt={student.name} className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-gray-100 shadow-sm transition-transform group-hover:scale-105" />
                      ) : (
                        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">{student.name?.charAt(0) || 'S'}</div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-gray-800 truncate group-hover:text-blue-700 transition-colors">{student.name}</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3 truncate">Reg: {student.regNo}</p>
                        
                        <div className="flex gap-2">
                          <div className="flex flex-col">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-black uppercase rounded-md border border-gray-200 truncate leading-none">Class {student.className}</span>
                            <span className="text-[6px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">শ্রেণী | कक्षा</span>
                          </div>
                          {student.rollNo && (
                            <div className="flex flex-col">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100 leading-none">Roll: {student.rollNo}</span>
                                <span className="text-[6px] font-bold text-blue-400 mt-0.5 uppercase tracking-tighter">রোল | अनुक्रमांक</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && filteredStudents.length === 0 && (
                  <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
                    <GraduationCap className="h-20 w-20 text-gray-100 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-700 uppercase tracking-widest">No students found</h3>
                    <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">কোনো ছাত্র পাওয়া যায়নি | कोई छात्र नहीं मिला</p>
                    <p className="text-gray-400 text-sm mt-4 font-medium">Try adjusting search or select different session | ফিল্টার পরিবর্তন করুন</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .input-std {
          padding: 0.8rem 1rem;
          border: 2px solid #f1f5f9;
          border-radius: 1rem;
          font-size: 0.9rem;
          transition: all 0.3s;
          background-color: #f8fafc;
        }
        .input-std:focus {
          border-color: #3b82f6;
          background-color: white;
          outline: none;
          box-shadow: 0 10px 15px -3px rgba(59, 131, 246, 0.1);
        }
      `}</style>
    </AdminDashboardLayout>
  );
};

export default StudentData;