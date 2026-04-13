import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Calendar, Loader2, UserCheck, UserX, Clock, Filter 
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const AdminTeacherAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, leave: 0, notMarked: 0 });

  useEffect(() => {
    const fetchTeacherAttendance = async () => {
      setLoading(true);
      try {
        // 1. Fetch all teachers (Role: Teacher)
        const teacherQuery = query(collection(db, 'users'), where('role', '==', 'Teacher'));
        const teacherSnap = await getDocs(teacherQuery);
        const allTeachers = teacherSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch individually to handle subcollections without complex indexing
        const results = await Promise.all(allTeachers.map(async (teacher) => {
          let currentStatus = 'Not Marked';

          // Check Attendance subcollection
          const attQ = query(collection(db, 'users', teacher.id, 'attendance'), where('date', '==', selectedDate));
          const attSnap = await getDocs(attQ);

          if (!attSnap.empty) {
            currentStatus = attSnap.docs[0].data().status;
          } else {
            // Check Leave if no attendance is marked
            const leaveQ = query(collection(db, 'users', teacher.id, 'leaveRequests'), where('status', '==', 'Approved'));
            const leaveSnap = await getDocs(leaveQ);
            
            const isOnLeave = leaveSnap.docs.some(lDoc => {
              const lData = lDoc.data();
              return selectedDate >= lData.startDate && selectedDate <= lData.endDate;
            });

            if (isOnLeave) currentStatus = 'On Leave';
          }

          return { ...teacher, currentStatus };
        }));

        // 3. Update Stats
        const statsUpdate = results.reduce((acc, curr) => {
          acc.total++;
          if (curr.currentStatus === 'Present') acc.present++;
          else if (curr.currentStatus === 'Absent') acc.absent++;
          else if (curr.currentStatus === 'On Leave') acc.leave++;
          else acc.notMarked++;
          return acc;
        }, { total: 0, present: 0, absent: 0, leave: 0, notMarked: 0 });

        setTeachers(results.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setStats(statsUpdate);

      } catch (error) {
        console.error("Error fetching teacher attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherAttendance();
  }, [selectedDate]);

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 font-sans">
        
        {/* --- HEADER --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner">
              <UserCheck size={28} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Staff Attendance</h1>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">কর্মী হাজিরা | कर्मचारी उपस्थिति</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Daily Teacher Tracking (দৈনিক ট্র্যাকিং)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Search staff... | খুঁজুন..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total Staff" subTitle="মোট কর্মী | कुल कर्मचारी" value={stats.total} icon={<Users size={20}/>} color="bg-gray-100 text-gray-600" />
          <StatCard title="Present" subTitle="উপস্থিত | उपस्थित" value={stats.present} icon={<UserCheck size={20}/>} color="bg-emerald-50 text-emerald-600 border-emerald-200 border" />
          <StatCard title="Absent" subTitle="অনুপস্থিত | अनुपस्थित" value={stats.absent} icon={<UserX size={20}/>} color="bg-rose-50 text-rose-600 border-rose-200 border" />
          <StatCard title="On Leave" subTitle="ছুটিতে | छुट्टी पर" value={stats.leave} icon={<Calendar size={20}/>} color="bg-blue-50 text-blue-600 border-blue-200 border" />
          <StatCard title="Not Marked" subTitle="বাকি | लंबित" value={stats.notMarked} icon={<Clock size={20}/>} color="bg-amber-50 text-amber-600 border-amber-200 border" />
        </div>

        {/* --- DATA GRID --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-blue-600 gap-2">
              <Loader2 className="animate-spin h-10 w-10" />
              <div className="text-center">
                <p className="font-black text-sm tracking-widest uppercase">Fetching Records...</p>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য সংগ্রহ করা হচ্ছে | डेटा प्राप्त किया जा रहा है</p>
              </div>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Filter className="h-16 w-16 mb-4 opacity-10" />
              <p className="font-black text-sm tracking-widest uppercase">No teachers found</p>
              <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase">কোনো শিক্ষক পাওয়া যায়নি | कोई शिक्षक नहीं मिला</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-400">
                    <th className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Teacher Info</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">শিক্ষকের বিবরণ | शिक्षक विवरण</p>
                    </th>
                    <th className="p-5 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Designation</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">পদবী | पद</p>
                    </th>
                    <th className="p-5 text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Status</p>
                      <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTeachers.map((teacher, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 shrink-0 shadow-sm uppercase">
                            {teacher.name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 leading-none">{teacher.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-tighter">ID: {teacher.employeeId || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-3 py-1 rounded-md uppercase tracking-wider border border-gray-200">
                          {teacher.designation || 'Teacher'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <StatusBadge status={teacher.currentStatus} />
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

// Sub-components for clean trilingual UI
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
  } else if (status === 'Not Marked') {
      color = "bg-amber-50 text-amber-700 border-amber-200";
      localLabel = "বাকি | लंबित";
  }

  return (
    <div className="flex flex-col items-end gap-1">
        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${color}`}>
            {status}
        </span>
        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{localLabel}</span>
    </div>
  );
};

export default AdminTeacherAttendance;