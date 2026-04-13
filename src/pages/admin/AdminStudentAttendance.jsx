import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Calendar, Loader2, UserCheck, UserX, Clock, BookOpen, AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const AdminStudentAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, notMarked: 0 });

  // 1. Fetch Sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const snap = await getDocs(collection(db, 'academicSessions'));
        const sessionList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        sessionList.sort((a, b) => (b.isActive === true) - (a.isActive === true));
        
        setSessions(sessionList);
        if (sessionList.length > 0) {
          const defaultSession = sessionList[0];
          setSelectedSessionId(defaultSession.id);
          setAvailableClasses(defaultSession.classes || []);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // 2. Handle Session Change
  const handleSessionChange = (e) => {
    const sId = e.target.value;
    setSelectedSessionId(sId);
    setSelectedClassName('');
    setStudents([]);
    const session = sessions.find(s => s.id === sId);
    setAvailableClasses(session?.classes || []);
  };

  // 3. Fetch Students & Parse Attendance
  useEffect(() => {
    if (!selectedSessionId || !selectedClassName) {
      setStudents([]);
      setStats({ total: 0, present: 0, absent: 0, leave: 0, notMarked: 0 });
      return;
    }

    const loadStudentData = async () => {
      setDataLoading(true);
      try {
        const sessionRef = doc(db, 'academicSessions', selectedSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) return;
        
        const sessionData = sessionSnap.data();
        const targetClass = sessionData.classes.find(c => c.name === selectedClassName);
        
        if (targetClass && targetClass.students) {
          let p = 0, a = 0, l = 0, nm = 0;
          
          const processedStudents = targetClass.students.map(std => {
            const attData = std.attendance?.[selectedDate];
            let currentStatus = 'Not Marked';

            if (typeof attData === 'string') {
              currentStatus = attData; 
            } else if (typeof attData === 'object' && attData !== null) {
              if (attData.status === 'Approved') currentStatus = 'On Leave';
              else if (attData.status === 'Leave Pending') currentStatus = 'Leave Pending';
              else if (attData.status === 'Present' || attData.status === 'Absent') currentStatus = attData.status;
            }

            if (currentStatus === 'Present') p++;
            else if (currentStatus === 'Absent') a++;
            else if (currentStatus === 'On Leave') l++;
            else nm++;

            return { ...std, currentStatus };
          });

          processedStudents.sort((a, b) => (parseInt(a.rollNo) || 999) - (parseInt(b.rollNo) || 999));
          
          setStudents(processedStudents);
          setStats({ total: processedStudents.length, present: p, absent: a, leave: l, notMarked: nm });
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error("Error loading student attendance:", error);
      } finally {
        setDataLoading(false);
      }
    };

    loadStudentData();
  }, [selectedClassName, selectedDate, selectedSessionId]);

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="flex h-full flex-col items-center justify-center text-blue-600 gap-3">
          <Loader2 className="animate-spin h-10 w-10"/>
          <div className="text-center">
            <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">Verifying sessions...</p>
            <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য যাচাই করা হচ্ছে | सत्र का सत्यापन</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 font-sans">
        
        {/* --- HEADER --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner">
              <Users size={28} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Student Attendance</h1>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ছাত্র হাজিরা | छात्र उपस्थिति</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Class-wise Tracking (শ্রেণীভিত্তিক ট্র্যাকিং)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col w-full sm:w-auto">
              <select 
                value={selectedSessionId} 
                onChange={handleSessionChange}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 text-gray-700"
              >
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name || s.id} {s.isActive ? '(Active)' : ''}</option>)}
              </select>
            </div>

            <div className="flex flex-col w-full sm:w-auto">
              <select 
                value={selectedClassName} 
                onChange={e => setSelectedClassName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 text-gray-700 disabled:opacity-50"
                disabled={availableClasses.length === 0}
              >
                <option value="">Select Class (ক্লাস বাছুন)</option>
                {availableClasses.map((cls, idx) => (
                  <option key={idx} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* --- STATS CARDS --- */}
        {selectedClassName && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="Total Students" subTitle="মোট ছাত্র | कुल छात्र" value={stats.total} icon={<Users size={20}/>} color="bg-gray-100 text-gray-600" />
            <StatCard title="Present" subTitle="উপস্থিত | उपस्थित" value={stats.present} icon={<UserCheck size={20}/>} color="bg-emerald-50 text-emerald-600 border-emerald-200 border" />
            <StatCard title="Absent" subTitle="অনুপস্থিত | अनुपस्थित" value={stats.absent} icon={<UserX size={20}/>} color="bg-rose-50 text-rose-600 border-rose-200 border" />
            <StatCard title="On Leave" subTitle="ছুটিতে | छुट्टी पर" value={stats.leave} icon={<Calendar size={20}/>} color="bg-blue-50 text-blue-600 border-blue-200 border" />
            <StatCard title="Not Marked" subTitle="বাকি | लंबित" value={stats.notMarked} icon={<Clock size={20}/>} color="bg-amber-50 text-amber-600 border-amber-200 border" />
          </div>
        )}

        {/* --- SEARCH BAR --- */}
        {selectedClassName && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Search by Name or Roll... | খুঁজুন... | खोजें..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>
        )}

        {/* --- DATA GRID --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          {!selectedClassName ? (
             <div className="flex flex-col items-center justify-center py-24 text-gray-300">
               <BookOpen size={64} className="mb-4 opacity-10" />
               <div className="text-center">
                 <p className="font-black text-gray-400 uppercase text-sm tracking-widest">Select a class to view attendance</p>
                 <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">হাজিরা দেখতে একটি ক্লাস নির্বাচন করুন | कक्षा चुनें</p>
               </div>
             </div>
          ) : dataLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-blue-600 gap-2">
              <Loader2 className="animate-spin h-10 w-10" />
              <div className="text-center">
                <p className="font-black text-sm tracking-widest uppercase">Fetching Records...</p>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য সংগ্রহ করা হচ্ছে | डेटा प्राप्त किया जा रहा है</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <AlertCircle className="h-16 w-16 mb-4 opacity-10" />
              <p className="font-black text-sm tracking-widest uppercase">No students found</p>
              <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">কোনো ছাত্র পাওয়া যায়নি | कोई छात्र नहीं मिला</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-400">
                    <th className="p-5 w-24 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Roll No</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">রোল | अनुक्र.</p>
                    </th>
                    <th className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Student Name</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ছাত্রের নাম | छात्र का नाम</p>
                    </th>
                    <th className="p-5 text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Status</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-5 text-center font-black text-gray-500 text-sm">{student.rollNo || '-'}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm uppercase">
                            {student.name?.charAt(0) || 'S'}
                          </div>
                          <span className="font-bold text-gray-800">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <StatusBadge status={student.currentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminDashboardLayout>
  );
};

// Custom trilingual Stat Card
const StatCard = ({ title, subTitle, value, icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1 group hover:shadow-md transition-all">
    <div className={`p-2.5 rounded-xl ${color} shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
    <p className="text-2xl font-black text-gray-800 mt-2 leading-none">{value}</p>
    <div className="text-center mt-2">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{title}</p>
        <p className="text-[7px] font-bold text-gray-300 mt-1 uppercase">{subTitle}</p>
    </div>
  </div>
);

// Custom Status Badge with local labels
const StatusBadge = ({ status }) => {
  let color = "bg-gray-100 text-gray-500 border-gray-200";
  let localLabel = "অজানা | अज्ञात";

  if (status === 'Present') {
      color = "bg-emerald-50 text-emerald-700 border-emerald-200";
      localLabel = "উপস্থিত | उपस्थित";
  } else if (status === 'Absent') {
      color = "bg-rose-50 text-rose-700 border-rose-200";
      localLabel = "অনুপস্থিত | अनुपस्थित";
  } else if (status === 'On Leave') {
      color = "bg-blue-50 text-blue-700 border-blue-200";
      localLabel = "ছুটিতে | छुट्टी पर";
  } else if (status === 'Leave Pending') {
      color = "bg-purple-50 text-purple-700 border-purple-200";
      localLabel = "বিবেচনাধীন | विचाराधीन";
  } else if (status === 'Not Marked') {
      color = "bg-amber-50 text-amber-700 border-amber-200";
      localLabel = "বাকি | लंबित";
  }

  return (
    <div className="flex flex-col items-end gap-1">
        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${color}`}>
            {status}
        </span>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{localLabel}</span>
    </div>
  );
};

export default AdminStudentAttendance;