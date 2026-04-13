import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Loader2, Users, Filter, 
  AlertCircle, Clock, CheckCircle2, MessageSquare, AlertTriangle, XCircle, ChevronDown, ChevronUp, BellRing
} from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, updateDoc, serverTimestamp, documentId 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const StudentAttendance = () => {
  const { userData } = useTeacherUser();
  
  const [loading, setLoading] = useState(false);
  const [sessionDocId, setSessionDocId] = useState(''); 
  const [sessionName, setSessionName] = useState('');
  const [allClasses, setAllClasses] = useState([]); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  
  const [selectedClassId, setSelectedClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [attendanceData, setAttendanceData] = useState({});
  const [studentProfiles, setStudentProfiles] = useState({}); 

  const [expandedLeavesFor, setExpandedLeavesFor] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      if (!userData?.uid) return; 
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true)); 
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const sessionData = docSnap.data();
          
          setSessionDocId(docSnap.id);
          setSessionName(sessionData.name);
          
          const myClasses = (sessionData.classes || []).filter(cls => cls.classTeacherUid === userData.uid);
          setAllClasses(myClasses);
          if (myClasses.length === 1) setSelectedClassId(myClasses[0].name);
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchSession();
  }, [userData]);

  useEffect(() => {
    if (!selectedClassId) return;

    const loadClassDetails = async () => {
      setLoading(true);
      try {
        const currentClass = allClasses.find(c => c.name === selectedClassId);
        if (!currentClass?.students) return;

        const uids = currentClass.students.map(s => s.uid).filter(id => !!id);
        const initialAtt = {};
        currentClass.students.forEach(s => {
          const sKey = s.uid || s.rollNo;
          initialAtt[sKey] = s.attendance?.[selectedDate] || null; 
        });
        setAttendanceData(initialAtt);

        if (uids.length > 0) {
          const profiles = {};
          const userQuery = query(collection(db, 'users'), where(documentId(), 'in', uids.slice(0, 30))); 
          const userSnap = await getDocs(userQuery);
          userSnap.forEach(d => { profiles[d.id] = d.data().photo || d.data().documents?.photo || null; });
          setStudentProfiles(profiles);
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    loadClassDetails();
  }, [selectedClassId, selectedDate, allClasses]);


  const handleGroupStatusChange = async (student, groupObj, newStatus) => {
    const sKey = student.uid || student.rollNo;
    if (!sessionDocId || !selectedClassId) return;

    try {
      const updatedClasses = allClasses.map(cls => {
        if (cls.name === selectedClassId) {
          const updatedStudents = cls.students.map(s => {
            if ((s.uid || s.rollNo) === sKey) {
              const newAttendance = { ...s.attendance };
              
              Object.keys(newAttendance).forEach(date => {
                 const attItem = newAttendance[date];
                 if (typeof attItem === 'object' && attItem.groupId === groupObj.groupId) {
                     newAttendance[date] = { ...attItem, status: newStatus };
                 }
              });

              if (newAttendance[selectedDate] && newAttendance[selectedDate].groupId === groupObj.groupId) {
                  setAttendanceData(prev => ({ ...prev, [sKey]: { ...newAttendance[selectedDate], status: newStatus } }));
              }

              return { ...s, attendance: newAttendance };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      const sessionRef = doc(db, 'academicSessions', sessionDocId);
      await updateDoc(sessionRef, { classes: updatedClasses, lastUpdated: serverTimestamp() });
      setAllClasses(updatedClasses);

    } catch (e) {
        console.error(e);
    }
  };

  const handleStatusChange = async (student, newStatus, targetDate = selectedDate) => {
    const sKey = student.uid || student.rollNo;
    
    if (targetDate === selectedDate) {
       setAttendanceData(prev => ({ ...prev, [sKey]: newStatus }));
    }

    if (!sessionDocId || !selectedClassId) return;

    try {
      const updatedClasses = allClasses.map(cls => {
        if (cls.name === selectedClassId) {
          const updatedStudents = cls.students.map(s => {
            if ((s.uid || s.rollNo) === sKey) {
              return {
                ...s,
                attendance: {
                  ...(s.attendance || {}),
                  [targetDate]: newStatus
                }
              };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      const sessionRef = doc(db, 'academicSessions', sessionDocId);
      await updateDoc(sessionRef, {
        classes: updatedClasses,
        lastUpdated: serverTimestamp()
      });
      
      setAllClasses(updatedClasses);

      if (student.uid) { 
        try {
          const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
          const statusEmoji = newStatus === 'Present' ? '✅' : '❌';
          
          await sendPushNotification({
            targetUid: student.uid,
            title: `Attendance Marked ${statusEmoji}`,
            body: `${student.name}, your attendance for ${targetDate} has been marked as ${newStatus} by ${userData.name}.`
          });
        } catch (notifError) {
          console.error("Attendance saved, but failed to send push notification:", notifError);
        }
      }

    } catch (e) {
      console.error("Auto-save failed:", e);
      if (targetDate === selectedDate) {
         setAttendanceData(prev => ({ ...prev, [sKey]: student.attendance?.[selectedDate] || null }));
      }
    }
  };

  const handleSendReminder = async (student) => {
    const sKey = student.uid || student.rollNo;
    if (!sessionDocId || !selectedClassId) return;

    try {
      const remarkData = {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          category: "Discipline",
          remark: "Reminder: You have unexcused absences. Please submit a leave application via the portal immediately.",
          teacherName: userData.name,
          createdAt: new Date().toISOString()
      };

      const updatedClasses = allClasses.map(cls => {
        if (cls.name === selectedClassId) {
          const updatedStudents = cls.students.map(s => {
            if ((s.uid || s.rollNo) === sKey) {
              return { ...s, remarks: [...(s.remarks || []), remarkData] };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });

      await updateDoc(doc(db, 'academicSessions', sessionDocId), { classes: updatedClasses });
      setAllClasses(updatedClasses);

      if (student.uid) {
        try {
          const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
          await sendPushNotification({
            targetUid: student.uid,
            title: `⚠️ Action Required: Unexcused Absence`,
            body: `Hi ${student.name}, you have unexcused absences. Please submit a leave application via the portal immediately.`
          });
        } catch (notifError) {
          console.error("Failed to send push notification:", notifError);
        }
      }
    } catch (e) {
      console.error("Failed to send reminder:", e);
    }
  };

  const currentSelectedClass = allClasses.find(c => c.name === selectedClassId);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <TeacherDashboardLayout>
      <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-6 space-y-6">
        
        {/* Combo Box Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row items-center justify-between gap-6 z-30">
          <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-purple-600 flex-shrink-0"><Users size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight leading-none">Student Attendance</h1>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ছাত্র হাজিরা | छात्र उपस्थिति</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{sessionName}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
             <div className="relative w-full sm:w-80" ref={dropdownRef}>
               <div className="relative cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
                 <input 
                    type="text" 
                    placeholder="Find My Class... | আমার ক্লাস খুঁজুন..." 
                    value={isDropdownOpen ? searchTerm : (selectedClassId || searchTerm)} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all"
                />
               </div>
               {isDropdownOpen && (
                 <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 p-2">
                   {allClasses.map(cls => (
                     <div key={cls.name} onClick={() => { setSelectedClassId(cls.name); setIsDropdownOpen(false); }} className={`px-5 py-4 rounded-xl text-lg cursor-pointer ${selectedClassId === cls.name ? 'bg-purple-600 text-white font-bold' : 'hover:bg-purple-50'}`}>{cls.name}</div>
                   ))}
                 </div>
               )}
             </div>
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto pl-5 pr-5 py-4 border border-gray-200 rounded-2xl text-lg font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-purple-100"/>
          </div>
        </div>

        {/* Large Student Grid */}
        <div className="flex-1 overflow-y-auto pb-10">
          {!selectedClassId ? (
             <div className="flex flex-col items-center justify-center h-80 text-gray-300">
                <Filter size={80} className="mb-4 opacity-10" />
                <p className="font-bold text-gray-400 uppercase text-lg tracking-widest text-center">Select your class</p>
                <p className="text-xs font-bold text-gray-300 uppercase">আপনার ক্লাস নির্বাচন করুন | अपनी कक्षा चुनें</p>
             </div>
          ) : loading ? (
             <div className="flex flex-col items-center justify-center h-80">
                <Loader2 className="animate-spin text-purple-600 h-16 w-16 mb-4" />
                <p className="text-xs font-bold text-gray-400 uppercase">Loading Students... | ছাত্র তালিকা লোড হচ্ছে...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {currentSelectedClass?.students?.map((student) => {
                const sKey = student.uid || student.rollNo;
                const photoUrl = studentProfiles[student.uid];
                
                const currentStatus = attendanceData[sKey];
                const isPendingLeave = typeof currentStatus === 'object' && currentStatus?.status === 'Leave Pending';
                const isApprovedLeave = typeof currentStatus === 'object' && currentStatus?.status === 'Approved';
                const isRejectedLeave = typeof currentStatus === 'object' && currentStatus?.status === 'Rejected';
                
                const attMap = student.attendance || {};
                const pastUnexcused = Object.keys(attMap).filter(date => date < todayStr && date !== selectedDate && attMap[date] === 'Absent');

                const pendingGroupsMap = {};
                Object.keys(attMap).forEach(date => {
                   const val = attMap[date];
                   if (typeof val === 'object' && val.status === 'Leave Pending' && date !== selectedDate) {
                       pendingGroupsMap[val.groupId] = val; 
                   }
                });
                const pendingLeaveGroups = Object.values(pendingGroupsMap);
                const isExpanded = expandedLeavesFor === sKey;

                return (
                  <div key={sKey} className={`flex flex-col p-5 rounded-[2rem] bg-white border shadow-sm transition-all duration-300 ${isPendingLeave ? 'ring-2 ring-amber-400 border-amber-200 bg-amber-50/10' : 'border-gray-100'}`}>
                    
                    {/* Top Row: Profile */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full">
                        <div className="flex items-start gap-5 w-full sm:w-auto mb-4 sm:mb-0 min-w-0">
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-purple-50 flex items-center justify-center border-4 border-white shadow-inner overflow-hidden flex-shrink-0">
                            {photoUrl ? <img src={photoUrl} className="h-full w-full object-cover" /> : <span className="text-lg font-black text-purple-200">{student.rollNo}</span>}
                          </div>
                          
                          <div className="min-w-0 flex-1 sm:flex-none">
                            <h4 className="font-black text-gray-800 text-lg sm:text-xl leading-none truncate">{student.name}</h4>
                            <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Roll: {student.rollNo} | রোল: {student.rollNo}</p>
                            
                            {/* Badges Area */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {pastUnexcused.length > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex flex-col items-start gap-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md shadow-sm">
                                          <span className="flex items-center gap-1 leading-none"><AlertTriangle size={12} /> {pastUnexcused.length} Unexcused Absence(s)</span>
                                          <span className="text-[8px] opacity-70 ml-4">অনুপস্থিতি | अनुपस्थिति</span>
                                      </div>
                                      <button onClick={() => handleSendReminder(student)} className="flex flex-col items-center text-[10px] bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded-md font-bold transition-colors">
                                        <span className="flex items-center gap-1"><BellRing size={12}/> Remind</span>
                                        <span className="text-[8px] opacity-70">স্মরণ | याद</span>
                                      </button>
                                    </div>
                                )}

                                {pendingLeaveGroups.length > 0 && (
                                    <button 
                                      onClick={() => setExpandedLeavesFor(isExpanded ? null : sKey)}
                                      className="flex flex-col items-center text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200 px-3 py-1 rounded-md shadow-sm transition-colors mt-1"
                                    >
                                        <span className="flex items-center gap-1 leading-none"><Clock size={12} /> Review {pendingLeaveGroups.length} Pending Leaves {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
                                        <span className="text-[8px] opacity-70">ছুটি পর্যালোচনা | अवकाश समीक्षा</span>
                                    </button>
                                )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Selected Date Action Section */}
                        <div className="w-full sm:w-auto flex-shrink-0 mt-4 sm:mt-0 border-t sm:border-0 pt-4 sm:pt-0 border-gray-100">
                            {isPendingLeave ? (
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 max-w-xs shadow-inner">
                                        <span className="font-bold flex items-center gap-1 mb-1"><MessageSquare size={12}/> {currentStatus.type}</span>
                                        <p className="font-medium bg-white px-1.5 py-0.5 rounded text-[10px] mb-1 w-fit">{currentStatus.startDate} to {currentStatus.endDate}</p>
                                        <p className="italic line-clamp-2">"{currentStatus.reason}"</p>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button onClick={() => handleGroupStatusChange(student, currentStatus, 'Approved')} className="flex flex-col items-center flex-1 px-4 py-1.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-md">
                                            <span className="text-xs leading-none">Approve Block</span>
                                            <span className="text-[8px] opacity-80 mt-1">অনুমোদন | स्वीकार</span>
                                        </button>
                                        <button onClick={() => handleGroupStatusChange(student, currentStatus, 'Rejected')} className="flex flex-col items-center flex-1 px-4 py-1.5 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 shadow-md">
                                            <span className="text-xs leading-none">Reject Block</span>
                                            <span className="text-[8px] opacity-80 mt-1">বাতিল | अस्वीकार</span>
                                        </button>
                                    </div>
                                </div>
                            ) : isApprovedLeave ? (
                                <div className="flex items-center gap-3 bg-emerald-50 p-2 rounded-2xl border border-emerald-100 w-full sm:w-auto">
                                    <div className="px-4 text-emerald-600 font-bold flex flex-col gap-0 items-start">
                                        <span className="flex items-center gap-2 text-sm leading-none"><CheckCircle2 size={18}/> Leave Approved</span>
                                        <span className="text-[8px] font-black opacity-70 ml-6 uppercase">অনুমোদিত | स्वीकृत</span>
                                    </div>
                                    <StatusBtn label="P" subLabel="উ | उ" active={false} onClick={() => handleStatusChange(student, 'Present')} color="bg-emerald-500" />
                                </div>
                            ) : isRejectedLeave ? (
                                <div className="flex items-center gap-3 bg-red-50 p-2 rounded-2xl border border-red-100 w-full sm:w-auto">
                                    <div className="px-4 text-red-600 font-bold flex flex-col items-start gap-0">
                                        <span className="flex items-center gap-2 text-sm leading-none"><XCircle size={18}/> Leave Rejected</span>
                                        <span className="text-[8px] font-black opacity-70 ml-6 uppercase">বাতিল | अस्वीकृत</span>
                                    </div>
                                    <StatusBtn label="A" subLabel="অ | अ" active={true} onClick={() => handleStatusChange(student, 'Absent')} color="bg-red-500" />
                                    <StatusBtn label="P" subLabel="উ | उ" active={false} onClick={() => handleStatusChange(student, 'Present')} color="bg-emerald-500" />
                                </div>
                            ) : (
                                <div className="flex bg-gray-50 rounded-2xl p-2 gap-3 sm:gap-5 border border-gray-100 shadow-inner w-full sm:w-auto justify-center">
                                    <StatusBtn label="P" subLabel="উ | उ" active={currentStatus === 'Present'} onClick={() => handleStatusChange(student, 'Present')} color="bg-emerald-500" />
                                    <StatusBtn label="A" subLabel="অ | अ" active={currentStatus === 'Absent'} onClick={() => handleStatusChange(student, 'Absent')} color="bg-red-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expandable Past Leaves Drawer */}
                    {isExpanded && pendingLeaveGroups.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-in slide-in-from-top-2">
                           <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Pending Past Blocks | পুরানো আবেদন</h5>
                           <div className="space-y-3">
                              {pendingLeaveGroups.map(group => (
                                 <div key={group.groupId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                    <div>
                                        <p className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded w-fit mb-1">
                                          {group.startDate} ➔ {group.endDate}
                                        </p>
                                        <p className="text-sm text-gray-700 italic">"{group.reason}"</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGroupStatusChange(student, group, 'Approved')} className="flex flex-col items-center px-4 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 text-xs font-bold rounded-lg transition-colors">
                                            <span>Approve</span>
                                            <span className="text-[8px] opacity-70">অনুমোদন</span>
                                        </button>
                                        <button onClick={() => handleGroupStatusChange(student, group, 'Rejected')} className="flex flex-col items-center px-4 py-1.5 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white border border-red-200 text-xs font-bold rounded-lg transition-colors">
                                            <span>Reject</span>
                                            <span className="text-[8px] opacity-70">বাতিল</span>
                                        </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

const StatusBtn = ({ label, subLabel, active, onClick, color }) => (
  <button 
    onClick={onClick} 
    className={`flex-1 sm:flex-none w-auto sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${active ? `${color} text-white shadow-2xl scale-105 sm:scale-110` : 'text-gray-400 bg-white hover:bg-gray-100 border border-gray-200'}`}
  >
    <span className="text-lg sm:text-xl font-black leading-none">{label}</span>
    <span className={`text-[8px] sm:text-[9px] font-bold mt-1 ${active ? 'text-white/80' : 'text-gray-300'}`}>{subLabel}</span>
  </button>
);

export default StudentAttendance;