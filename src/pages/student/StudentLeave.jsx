import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Send, Clock, CheckCircle2, XCircle, 
  AlertCircle, Loader2, Calendar as CalendarIcon, MessageSquare, 
  AlertTriangle, ChevronLeft, ChevronRight, Trash2 
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

// --- CUSTOM DATE PICKER COMPONENT ---
const CustomDatePicker = ({ label, subLabel, value, onChange, attendanceMap, minDate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setShowCalendar(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleDateClick = (day) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setShowCalendar(false);
  };

  const isDateDisabled = (day) => {
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = checkDate.getTimezoneOffset();
    const dateStr = new Date(checkDate.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    if (minDate && dateStr < minDate) return true;
    const status = attendanceMap[dateStr];
    return status !== 'Absent'; 
  };

  const changeMonth = (offset) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));

  return (
    <div className="relative space-y-1" ref={containerRef}>
      <div className="flex flex-col mb-1 ml-1">
        <label className="text-[10px] font-black text-gray-400 uppercase leading-none">{label}</label>
        <span className="text-[7px] font-bold text-gray-300 uppercase mt-0.5">{subLabel}</span>
      </div>
      <div onClick={() => setShowCalendar(!showCalendar)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors shadow-sm">
        <span className={`text-sm font-bold ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || 'Select Date'}</span>
        <CalendarIcon size={16} className="text-red-600" />
      </div>

      {showCalendar && (
        <div className="absolute top-full left-0 z-50 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={18}/></button>
            <span className="font-black text-gray-700 uppercase text-xs tracking-widest">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={18}/></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d} className="text-[10px] font-black text-gray-300">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(getFirstDayOfMonth(viewDate)).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array(getDaysInMonth(viewDate)).fill(null).map((_, i) => {
              const day = i + 1;
              const disabled = isDateDisabled(day);
              const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
              const offset = checkDate.getTimezoneOffset();
              const dateStr = new Date(checkDate.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
              const isSelected = value === dateStr;

              return (
                <button
                  key={day} type="button" disabled={disabled} onClick={() => handleDateClick(day)}
                  className={`h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all ${isSelected ? 'bg-red-600 text-white font-black shadow-md' : ''} ${disabled ? 'text-gray-200 cursor-not-allowed' : 'text-red-700 bg-red-50 hover:bg-red-600 hover:text-white font-black border border-red-100'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const StudentLeave = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [groupedHistory, setGroupedHistory] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({ id: null, classes: [] });
  const [studentAttendance, setStudentAttendance] = useState({});
  const [formData, setFormData] = useState({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        const allClasses = data.classes || [];
        let myAttendance = {};
        for (const cls of allClasses) {
          const foundStudent = cls.students?.find(s => s.uid === user.uid);
          if (foundStudent && foundStudent.attendance) {
            myAttendance = foundStudent.attendance;
            break;
          }
        }
        setSessionInfo({ id: docSnap.id, classes: allClasses });
        setStudentAttendance(myAttendance);
        processLeaveHistory(myAttendance);
      }
    } catch (err) {
      setErrorMsg("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const processLeaveHistory = (attendanceMap) => {
    const groups = {};
    Object.entries(attendanceMap).forEach(([date, value]) => {
      if (typeof value === 'object' && value !== null && value.groupId) {
        if (!groups[value.groupId]) {
           groups[value.groupId] = {
              groupId: value.groupId,
              startDate: value.startDate,
              endDate: value.endDate,
              type: value.type,
              reason: value.reason,
              status: value.status,
              appliedAt: value.appliedAt
           };
        } else {
           if (value.status !== 'Leave Pending') groups[value.groupId].status = value.status;
        }
      }
    });
    const historyArray = Object.values(groups).sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    setGroupedHistory(historyArray);
  };

  const handleDeleteApplication = async (groupId) => {
    if (!window.confirm("Withdraw this application? Dates will revert to 'Absent'.")) return;
    setSubmitting(true);
    try {
      const updatedClasses = sessionInfo.classes.map(cls => {
        const sIdx = cls.students?.findIndex(s => s.uid === user.uid);
        if (sIdx !== -1) {
          const updatedStudent = { ...cls.students[sIdx] };
          const updatedAttendance = { ...updatedStudent.attendance };
          Object.keys(updatedAttendance).forEach(date => {
            if (updatedAttendance[date]?.groupId === groupId) updatedAttendance[date] = "Absent";
          });
          updatedStudent.attendance = updatedAttendance;
          const newStudents = [...cls.students];
          newStudents[sIdx] = updatedStudent;
          return { ...cls, students: newStudents };
        }
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', sessionInfo.id), { classes: updatedClasses });
      fetchData();
    } catch (err) {
      alert("Failed to delete application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.startDate || !formData.endDate || !formData.reason) return setErrorMsg("Please fill all fields");
    setSubmitting(true);
    try {
      const getDates = (start, end) => {
        const dt = new Date(start);
        const eDt = new Date(end);
        const dates = [];
        while (dt <= eDt) {
            dates.push(new Date(dt).toISOString().split('T')[0]);
            dt.setDate(dt.getDate() + 1);
        }
        return dates;
      };
      const datesToApply = getDates(formData.startDate, formData.endDate);
      for (const dateStr of datesToApply) {
        if (studentAttendance[dateStr] !== 'Absent') throw new Error(`Date ${dateStr} is not marked as Absent.`);
      }
      const uniqueGroupId = `L-${Date.now()}`;
      const updatedClasses = sessionInfo.classes.map(cls => {
        const sIdx = cls.students?.findIndex(s => s.uid === user.uid);
        if (sIdx !== -1) {
          const updatedStudent = { ...cls.students[sIdx] };
          const updatedAttendance = { ...updatedStudent.attendance };
          datesToApply.forEach(dateStr => {
            updatedAttendance[dateStr] = {
              groupId: uniqueGroupId,
              startDate: formData.startDate,
              endDate: formData.endDate,
              status: 'Leave Pending',
              type: formData.type,
              reason: formData.reason,
              appliedAt: new Date().toISOString(),
              previousStatus: 'Absent'
            };
          });
          updatedStudent.attendance = updatedAttendance;
          const newStudents = [...cls.students];
          newStudents[sIdx] = updatedStudent;
          return { ...cls, students: newStudents };
        }
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', sessionInfo.id), { classes: updatedClasses });
      setFormData({ type: 'Sick Leave', startDate: '', endDate: '', reason: '' });
      fetchData(); 
    } catch (err) { setErrorMsg(err.message); } 
    finally { setSubmitting(false); }
  };

  const getStatusColor = (status) => {
    if (status?.includes('Approved')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (status?.includes('Rejected')) return 'text-red-600 bg-red-50 border-red-100';
    return 'text-amber-600 bg-amber-50 border-amber-100';
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10 px-4 font-sans">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORM SECTION */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-visible sticky top-6">
              <div className="p-6 border-b border-gray-100 bg-red-900 text-white rounded-t-[2rem]">
                <h3 className="text-xl font-black flex items-center gap-2 leading-none">
                    <Send size={20} /> Regularize Absence
                </h3>
                <p className="text-[10px] font-bold text-red-200 uppercase tracking-widest mt-1 ml-7">অনুপস্থিতি নিয়মিতকরণ / नियमितीकरण</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                   <div className="flex items-center gap-2 mb-1">
                     <AlertCircle size={14} />
                     <p className="text-[10px] font-black uppercase tracking-tight leading-none">Important Notice</p>
                   </div>
                   <p className="text-[11px] font-medium leading-relaxed">
                     Only days marked "Absent" by the teacher are selectable. <br/>
                     <span className="text-[9px] opacity-80">শিক্ষক দ্বারা "অনুপস্থিত" দিনগুলিই কেবল নির্বাচনযোগ্য।</span>
                   </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex gap-2 font-bold animate-pulse">
                    <AlertTriangle size={16} className="shrink-0" /> {errorMsg}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-col mb-1 ml-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase leading-none">Leave Type</label>
                    <span className="text-[7px] font-bold text-gray-300 uppercase mt-0.5">ছুটির ধরন / छुट्टी का प्रकार</span>
                  </div>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-black shadow-sm" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option>Sick Leave / অসুস্থতা জনিত</option>
                    <option>Casual Leave / নৈমিত্তিক</option>
                    <option>Emergency / জরুরি</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomDatePicker label="From" subLabel="থেকে / से" value={formData.startDate} attendanceMap={studentAttendance} onChange={(date) => setFormData(prev => ({ ...prev, startDate: date, endDate: '' }))} />
                  <CustomDatePicker label="To" subLabel="পর্যন্ত / तक" value={formData.endDate} attendanceMap={studentAttendance} minDate={formData.startDate} onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))} />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col mb-1 ml-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase leading-none">Reason</label>
                    <span className="text-[7px] font-bold text-gray-300 uppercase mt-0.5">কারণ / कारण</span>
                  </div>
                  <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none h-32 text-sm font-medium resize-none shadow-sm focus:ring-2 focus:ring-red-100" placeholder="Describe why you were absent..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>
                </div>

                <button type="submit" disabled={submitting} className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-100 flex flex-col items-center justify-center gap-0 disabled:opacity-50">
                  <div className="flex items-center gap-2">
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} 
                    <span className="text-base uppercase tracking-tight">Submit Request</span>
                  </div>
                  <span className="text-[9px] font-bold text-red-200 uppercase mt-1">আবেদন জমা দিন / आवेदन सबमिट करें</span>
                </button>
              </form>
            </div>
          </div>

          {/* HISTORY SECTION */}
          <div className="lg:col-span-2 space-y-5">
             <div className="flex flex-col px-2">
               <h3 className="font-black text-gray-800 text-xl flex items-center gap-2 leading-none">
                 <Clock size={22} className="text-red-900" /> Regularization History
               </h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-8">আবেদনের ইতিহাস / इतिहास</p>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                 <Loader2 className="animate-spin text-red-900" size={32} />
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading History / লোড হচ্ছে / लोड हो रहा है</p>
              </div>
            ) : groupedHistory.length > 0 ? (
              <div className="space-y-4">
                {groupedHistory.map((leave, index) => {
                  const isMultiDay = leave.startDate !== leave.endDate;
                  const canDelete = leave.status === 'Leave Pending';

                  return (
                    <div key={index} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-red-900">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-2xl border flex items-center justify-center shadow-inner ${getStatusColor(leave.status)}`}>
                            {leave.status?.includes('Approved') ? <CheckCircle2 size={28} /> : leave.status?.includes('Rejected') ? <XCircle size={28} /> : <Clock size={28} />}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-black text-gray-800 text-lg leading-tight">{leave.type}</h4>
                            <div className="flex flex-col mt-2">
                                <span className="text-[11px] text-gray-500 font-black flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 w-fit">
                                    <CalendarIcon size={12} className="text-red-900" /> 
                                    {isMultiDay ? `${leave.startDate} to ${leave.endDate}` : leave.startDate}
                                </span>
                                <span className="text-[8px] font-bold text-gray-300 uppercase mt-1 ml-2">Selected Dates / নির্বাচিত তারিখ</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className={`px-5 py-2 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${getStatusColor(leave.status)}`}>
                             {leave.status}
                           </div>
                           {canDelete && (
                              <button 
                                onClick={() => handleDeleteApplication(leave.groupId)}
                                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm"
                                title="Withdraw Application / আবেদন প্রত্যাহার করুন"
                              >
                                <Trash2 size={20} />
                              </button>
                           )}
                        </div>
                      </div>
                      <div className="mt-5 pt-5 border-t border-gray-50">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Reason / কারণ</span>
                            <p className="text-sm text-gray-700 flex items-start gap-2 italic font-medium bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <MessageSquare size={14} className="mt-1 text-gray-300 shrink-0" /> "{leave.reason}"
                            </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-20 rounded-[2.5rem] border-2 border-dashed border-gray-100 text-center">
                 <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <FileText className="text-gray-200" size={48} />
                 </div>
                 <h3 className="text-gray-700 font-black text-lg">No Applications Found</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">কোনো অনুপস্থিতি নিয়মিতকরণের আবেদন পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentLeave;