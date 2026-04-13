import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Plus, Loader2, 
  ChevronLeft, ChevronRight, FileText, X, Briefcase, MessageSquare
} from 'lucide-react';
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const Leave = () => {
  const { userData } = useTeacherUser();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [attendanceMap, setAttendanceMap] = useState(new Map());
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  const [viewDate, setViewDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  
  const [sessionStart, setSessionStart] = useState(null);

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [leaveData, setLeaveData] = useState({
    startDate: '',
    endDate: '',
    type: 'Casual Leave',
    reason: ''
  });

  // --- 1. Fetch Data ---
  useEffect(() => {
    if (!userData?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const newAttMap = new Map();

        const sessionQ = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQ);
        
        if (!sessionSnap.empty) {
          const activeSession = sessionSnap.docs[0].data();
          setSessionStart(activeSession.startDate); 
          
          const holidays = activeSession.holidays || [];
          holidays.forEach(holiday => {
            const start = new Date(holiday.startDate);
            const end = new Date(holiday.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              newAttMap.set(d.toISOString().split('T')[0], 'Holiday');
            }
          });
        }

        const attSnap = await getDocs(query(collection(db, 'users', userData.uid, 'attendance')));
        attSnap.forEach(doc => {
          newAttMap.set(doc.data().date, doc.data().status);
        });

        const leaveSnap = await getDocs(query(collection(db, 'users', userData.uid, 'leaveRequests'), orderBy('createdAt', 'desc')));
        const requests = leaveSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaveRequests(requests);

        requests.forEach(req => {
          if (req.status === 'Approved') {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              newAttMap.set(d.toISOString().split('T')[0], 'Leave');
            }
          }
        });

        setAttendanceMap(newAttMap);
      } catch (e) {
        console.error("Error fetching data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  // --- 2. Corrected Absenteeism Logic ---
  const stats = useMemo(() => {
    let p = 0, a = 0, l = 0, h = 0;
    if (!sessionStart) return { present: 0, absent: 0, leave: 0, holiday: 0 };

    const [year, month, day] = sessionStart.split('-').map(Number);
    let d = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (d <= today) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay(); 
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekend) {
            const status = attendanceMap.get(dateStr);
            if (status === 'Present') p++;
            else if (status === 'Leave') l++;
            else if (status === 'Holiday') h++;
            else a++;
        }
        d.setDate(d.getDate() + 1);
    }
    return { present: p, absent: a, leave: l, holiday: h };
  }, [attendanceMap, sessionStart]);

  // --- 3. Apply Leave & Notify Admins ---
  const handleApplyLeave = async () => {
    if (!leaveData.startDate || !leaveData.endDate || !leaveData.reason) {
        alert("Please fill in all fields.");
        return;
    }
    setSubmitting(true);
    try {
        await addDoc(collection(db, 'users', userData.uid, 'leaveRequests'), {
            uid: userData.uid,
            name: userData.name,
            startDate: leaveData.startDate,
            endDate: leaveData.endDate,
            type: leaveData.type,
            reason: leaveData.reason,
            status: 'Pending',
            appliedOn: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        });

        try {
            const broadcastPushNotification = httpsCallable(functions, 'broadcastPushNotification');
            await broadcastPushNotification({
                title: "New Leave Request 📝",
                body: `${userData.name} has applied for ${leaveData.type} from ${leaveData.startDate} to ${leaveData.endDate}.`,
                targetRoles: ['Admin'] 
            });
        } catch (notifError) { console.error(notifError); }

        alert("Application submitted successfully!");
        setShowApplyForm(false);
        setLeaveData({ startDate: '', endDate: '', type: 'Casual Leave', reason: '' });
        window.location.reload(); 
    } catch (e) {
        alert("Failed to submit.");
    } finally {
        setSubmitting(false);
    }
  };

  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const totalSlots = 42;
    const days = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (let i = firstDayIndex; i > 0; i--) days.push({ day: prevMonthDays - i + 1, type: 'prev', dateObj: new Date(year, month - 1, prevMonthDays - i + 1) });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, type: 'current', dateObj: new Date(year, month, i) });
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, type: 'next', dateObj: new Date(year, month + 1, i) });

    return days.map((item, idx) => {
        const dateStr = item.dateObj.toISOString().split('T')[0];
        const status = attendanceMap.get(dateStr);
        const isSelected = item.dateObj.toDateString() === selectedDate.toDateString();
        const isToday = dateStr === todayStr;
        const isWeekend = item.dateObj.getDay() === 0 || item.dateObj.getDay() === 6;

        let dotColor = null;
        if (status === 'Present') dotColor = "bg-emerald-500";
        else if (status === 'Absent') dotColor = "bg-rose-500";
        else if (status === 'Leave') dotColor = "bg-blue-500";
        else if (status === 'Holiday') dotColor = "bg-amber-600"; 
        else if (item.type === 'current' && !isWeekend && dateStr < todayStr && sessionStart && dateStr >= sessionStart) {
          dotColor = "bg-rose-500"; 
        }

        return (
            <div key={idx} onClick={() => setSelectedDate(item.dateObj)} className="h-10 w-full flex flex-col items-center justify-center cursor-pointer relative">
                <div className={`h-8 w-8 flex items-center justify-center text-sm font-medium rounded-full ${isSelected ? 'bg-blue-600 text-white shadow-md' : isToday ? 'border border-blue-600' : ''} ${item.type !== 'current' ? 'text-gray-300' : isWeekend ? 'text-rose-400' : 'text-gray-700'}`}>
                    {item.day}
                </div>
                {!isSelected && item.type === 'current' && dotColor && (
                    <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                )}
            </div>
        );
    });
  };

  return (
    <TeacherDashboardLayout>
      <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-8 space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg"><CalendarIcon size={24} /></div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-gray-800 leading-none">My Schedule</h1>
                    <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">আমার সময়সূচী | मेरी समय सारणी</span>
                    <p className="text-xs text-gray-500 font-medium mt-1">হাজিরা এবং ছুটির রেকর্ড | उपस्थिति और छुट्टी रिकॉर्ड</p>
                </div>
            </div>
            
            {/* --- STATS DISPLAY --- */}
            <div className="flex gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                <StatItem label="Pres." subLabel="উ | उ" val={stats.present} color="text-emerald-600" />
                <Divider />
                <StatItem label="Abs." subLabel="অ | अ" val={stats.absent} color="text-rose-600" />
                <Divider />
                <StatItem label="Leave" subLabel="ছুটি | छुट्टी" val={stats.leave} color="text-blue-500" />
                <Divider />
                <StatItem label="Hol." subLabel="ছুটি | अवकाश" val={stats.holiday} color="text-amber-600" />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* --- LEFT COLUMN: CALENDAR --- */}
            <div className="flex justify-center lg:justify-start">
                <div className="w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b font-medium text-gray-800">{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <span className="text-sm font-bold">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={18}/></button>
                            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={18}/></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 px-2 mb-2">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => <div key={i} className={`text-center text-[10px] font-bold uppercase ${i===0 || i===6 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>)}</div>
                    <div className="grid grid-cols-7 px-2 pb-4 gap-y-1">{renderCalendarGrid()}</div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 pb-4 pt-3 border-t bg-gray-50/50 justify-center">
                        <LegendItem color="bg-emerald-500" label="Pres." subLabel="উ | उ" />
                        <LegendItem color="bg-rose-600" label="Abs." subLabel="অ | अ" />
                        <LegendItem color="bg-blue-500" label="Leave" subLabel="ছুটি | छुट्टी" />
                        <LegendItem color="bg-amber-600" label="Holiday" subLabel="ছুটি | अवकाश" />
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: LEAVE FORMS & HISTORY --- */}
            <div className="lg:col-span-2 space-y-6">
                {!showApplyForm ? (
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-bold leading-none">Apply for Leave</h3>
                            <span className="text-[10px] font-bold text-purple-400 mt-2 uppercase">ছুটির জন্য আবেদন | छुट्टी के लिए आवेदन</span>
                            <p className="text-gray-400 text-sm mt-1">ব্যক্তিগত রেকর্ড সংরক্ষণ | व्यक्तिगत रिकॉर्ड रखना</p>
                        </div>
                        <button onClick={() => setShowApplyForm(true)} className="bg-white text-gray-900 px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-gray-100 flex flex-col items-center">
                            <div className="flex items-center gap-2 text-sm"><Plus size={16} /> Apply</div>
                            <span className="text-[9px] uppercase opacity-70">আবেদন | आवेदन</span>
                        </button>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-black text-gray-800 leading-none">New Application</h3>
                                <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">নতুন আবেদন | नया आवेदन</span>
                            </div>
                            <button onClick={() => setShowApplyForm(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                             <div>
                                <label className="text-xs font-black text-gray-400 uppercase ml-1 block leading-none">Leave Type</label>
                                <span className="text-[9px] font-bold text-purple-400 ml-1 mb-2 block uppercase">ছুটির ধরন | छुट्टी का प्रकार</span>
                                <select className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm text-gray-700 border border-gray-200 outline-none focus:ring-2 focus:ring-purple-100" value={leaveData.type} onChange={e => setLeaveData({...leaveData, type: e.target.value})}>
                                    <option>Casual Leave (নৈমিত্তিক ছুটি)</option>
                                    <option>Sick Leave (অসুস্থতাজনিত ছুটি)</option>
                                    <option>Earned Leave (অর্জিত ছুটি)</option>
                                </select>
                            </div>
                            <div className="hidden md:block"></div>
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase ml-1 block leading-none">From</label>
                                <span className="text-[9px] font-bold text-purple-400 ml-1 mb-2 block uppercase">থেকে | से</span>
                                <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm text-gray-700 border border-gray-200 outline-none" value={leaveData.startDate} onChange={e => setLeaveData({...leaveData, startDate: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-400 uppercase ml-1 block leading-none">To</label>
                                <span className="text-[9px] font-bold text-purple-400 ml-1 mb-2 block uppercase">পর্যন্ত | तक</span>
                                <input type="date" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm text-gray-700 border border-gray-200 outline-none" value={leaveData.endDate} onChange={e => setLeaveData({...leaveData, endDate: e.target.value})}/>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="text-xs font-black text-gray-400 uppercase ml-1 block leading-none">Reason</label>
                            <span className="text-[9px] font-bold text-purple-400 ml-1 mb-2 block uppercase">কারণ | कारण</span>
                            <textarea rows="2" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm text-gray-700 border border-gray-200 outline-none focus:ring-2 focus:ring-purple-100" placeholder="Reason... | ছুটির কারণ..." value={leaveData.reason} onChange={e => setLeaveData({...leaveData, reason: e.target.value})}></textarea>
                        </div>
                        <button onClick={handleApplyLeave} disabled={submitting} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-md hover:bg-purple-700 transition-all flex flex-col justify-center items-center">
                            <div className="flex items-center gap-2 leading-none">
                                {submitting ? <Loader2 className="animate-spin" size={18}/> : "Submit Request"}
                            </div>
                            <span className="text-[9px] font-medium opacity-80 mt-1 uppercase">আবেদন জমা দিন | अनुरोध जमा करें</span>
                        </button>
                    </div>
                )}

                {/* --- REQUEST HISTORY LIST --- */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex flex-col mb-6">
                        <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
                            <Clock size={20} className="text-purple-600"/> Request History
                        </h3>
                        <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase ml-7">আবেদনের ইতিহাস | अनुरोध इतिहास</span>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pb-2">
                        {leaveRequests.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 font-bold text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                No leave requests found | কোনো আবেদন পাওয়া যায়নি
                            </div>
                        ) : (
                            leaveRequests.map(req => (
                                <div key={req.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-bold text-gray-800">{req.type}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{req.status || 'Pending'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-400 font-bold mb-1 uppercase tracking-tight">
                                        <span>{req.startDate}</span>
                                        <span className="text-gray-300">➜</span>
                                        <span>{req.endDate}</span>
                                    </div>

                                    {req.status && req.status !== 'Pending' && req.adminComment && (
                                        <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-start gap-2">
                                            <MessageSquare size={14} className="text-purple-400 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-600 block mb-0.5">Admin Remark | এডমিন মন্তব্য</span>
                                                <p className="text-xs text-gray-600 italic font-medium">"{req.adminComment}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

const StatItem = ({ label, subLabel, val, color }) => (
  <div className="flex flex-col items-center px-3">
    <span className={`text-lg font-black ${color} leading-none`}>{val}</span>
    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{label}</span>
    <span className="text-[8px] font-bold text-purple-300 uppercase tracking-tighter">{subLabel}</span>
  </div>
);

const LegendItem = ({ color, label, subLabel }) => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase">
        <span className={`w-2 h-2 rounded-full ${color}`}></span> {label}
    </div>
    <span className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">{subLabel}</span>
  </div>
);

const Divider = () => <div className="w-px h-8 bg-gray-100"></div>;

export default Leave;