import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { 
  ArrowLeft, CalendarCheck, Loader2, Calendar, Clock, AlertCircle
} from 'lucide-react';

const TeacherAttendance = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        // 1. Fetch Teacher Name for Header
        const teacherDoc = await getDoc(doc(db, 'users', teacherId));
        if (teacherDoc.exists()) {
          setTeacherName(teacherDoc.data().name);
        }

        // 2. Fetch Attendance Subcollection
        const attRef = collection(db, 'users', teacherId, 'attendance');
        const q = query(attRef, orderBy('date', 'desc')); 
        const snapshot = await getDocs(q);
        
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAttendanceData(records);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [teacherId]);

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20 font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 border-gray-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-gray-600 shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-gray-800 leading-none">Attendance Records</h1>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">হাজিরা রেকর্ড | উপস্থিতি रिकॉर्ड</span>
              <p className="text-gray-500 mt-2 text-sm font-medium">
                Viewing records for (রেকর্ড দেখা হচ্ছে): <span className="font-bold text-blue-600">{teacherName || 'Loading...'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <div className="text-center">
                <p className="text-gray-500 font-bold tracking-widest uppercase">Loading Attendance...</p>
                <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase">হাজিরা লোড হচ্ছে... | उपस्थिति लोड हो रही है...</p>
            </div>
          </div>
        ) : (
          /* Attendance Table/List */
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <CalendarCheck size={18} className="text-blue-600"/>
                        <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Recent Attendance</h2>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 mt-1 ml-7 uppercase">সাম্প্রতিক হাজিরা | हाल की उपस्थिति</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full border border-blue-200">
                    TOTAL (মোট): {attendanceData.length}
                </span>
             </div>
             
             {attendanceData.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="h-16 w-16 text-gray-100 mb-4" />
                  <div className="flex flex-col">
                    <p className="text-gray-400 font-black uppercase text-sm">No attendance records found.</p>
                    <span className="text-[10px] font-bold text-gray-300 mt-1 uppercase">কোনো হাজিরার রেকর্ড পাওয়া যায়নি | कोई रिकॉर्ड नहीं मिला</span>
                  </div>
                </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white border-b border-gray-100 text-gray-400">
                       <th className="p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Date</p>
                          <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">তারিখ | तारीख</p>
                       </th>
                       <th className="p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Status</p>
                          <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                       </th>
                       <th className="p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Check In/Out</p>
                          <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">সময় | समय</p>
                       </th>
                       <th className="p-5">
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none">Remarks</p>
                          <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">মন্তব্য | टिप्पणी</p>
                       </th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {attendanceData.map((record) => (
                       <tr key={record.id} className="hover:bg-blue-50/20 transition-colors">
                         <td className="p-5">
                           <div className="flex items-center gap-2 text-sm font-bold text-gray-800 leading-none">
                                <Calendar size={14} className="text-gray-300" />
                                {record.date || record.id} 
                           </div>
                         </td>
                         <td className="p-5">
                           <div className="flex flex-col gap-1">
                                <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border w-fit ${
                                    record.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                    record.status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                    'bg-amber-50 text-orange-700 border-orange-200'
                                }`}>
                                    {record.status || 'Unknown'}
                                </span>
                                <span className="text-[7px] font-bold text-gray-400 uppercase ml-0.5">
                                    {record.status === 'Present' ? 'উপস্থিত | उपस्थित' : record.status === 'Absent' ? 'অনুপস্থিত | अनुपस्थित' : 'অজানা'}
                                </span>
                           </div>
                         </td>
                         <td className="p-5">
                            <div className="flex flex-col">
                                <div className="text-sm text-gray-600 font-bold flex items-center gap-2 leading-none">
                                    <Clock size={14} className="text-gray-300" />
                                    {record.checkIn || record.time || '--:--'} {record.checkOut ? `/ ${record.checkOut}` : ''}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase ml-6">In/Out | প্রবেশ/প্রস্থান</span>
                            </div>
                         </td>
                         <td className="p-5 text-sm font-medium text-gray-500">
                           {record.remarks || '-'}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default TeacherAttendance;