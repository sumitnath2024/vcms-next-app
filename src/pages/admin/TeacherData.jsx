import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase'; 
import AdminDashboardLayout from '../../components/AdminDashboardLayout'; 
import { 
  User, CalendarCheck, FileText, MoreVertical, 
  Search, BookOpen, Briefcase, Loader2
} from 'lucide-react';

const TeacherData = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch Teachers from Firestore
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const teachersQuery = query(
          collection(db, 'users'), 
          where('role', '==', 'Teacher')
        );
        
        const querySnapshot = await getDocs(teachersQuery);
        const fetchedTeachers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTeachers(fetchedTeachers);
      } catch (error) {
        console.error("Error fetching teachers: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Filter teachers based on search input
  const filteredTeachers = teachers.filter(teacher => {
    const searchLower = searchTerm.toLowerCase();
    return (
      teacher.name?.toLowerCase().includes(searchLower) || 
      teacher.employeeId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20 font-sans">
        
        {/* --- Page Header & Search Bar --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 border-gray-200">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-800 leading-none">Teacher Data</h1>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">শিক্ষক তথ্য | शिक्षक डेटा</span>
            <p className="text-gray-500 mt-2 text-sm md:text-base">Manage staff & leave records | কর্মী এবং ছুটির রেকর্ড পরিচালনা করুন</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Search name or ID... | খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-std pl-10 w-full font-medium"
            />
          </div>
        </div>

        {/* --- Loading State --- */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <div className="text-center">
                <p className="text-gray-500 font-bold tracking-widest uppercase">Loading Teachers...</p>
                <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
            </div>
          </div>
        ) : (
          /* --- Teacher Cards Grid --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group">
                
                {/* Card Header */}
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-blue-600"/>
                        <h2 className="font-black text-gray-700 text-xs truncate max-w-[100px] leading-none">
                        {teacher.employeeId || 'NO ID'}
                        </h2>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase leading-none tracking-tighter">Employee ID | আইডি</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                        teacher.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {teacher.status || 'Active'}
                    </span>
                    <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">
                        {teacher.status === 'Active' ? 'সক্রিয় | सक्रिय' : 'নিষ্ক্রিয় | निष्क्रिय'}
                    </span>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col items-center text-center">
                  {/* Profile Image */}
                  {teacher.documents?.photo ? (
                    <img src={teacher.documents.photo} alt={teacher.name} className="h-20 w-20 rounded-full object-cover border-4 border-blue-50 shadow-sm mb-3 group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="h-20 w-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-3xl mb-3 border-4 border-white shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {teacher.name?.charAt(0) || 'T'}
                    </div>
                  )}

                  <h3 className="text-lg font-black text-gray-800 mb-1 leading-tight">{teacher.name}</h3>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{teacher.designation || 'Teacher'}</p>
                  
                  <div className="w-full space-y-3 mt-5 text-left bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                        <span className="truncate font-bold leading-none">{teacher.subjectTaught || 'Not Assigned'}</span>
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase mt-1 ml-5">Subject | বিষয়</span>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                        <span className="truncate font-bold leading-none">{teacher.qualification || 'N/A'}</span>
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase mt-1 ml-5">Qualification | যোগ্যতা</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="grid grid-cols-3 border-t bg-white divide-x divide-gray-100">
                  <button 
                    onClick={() => navigate(`/admin/view/teacher-data/${teacher.id}/attendance`)}
                    className="flex flex-col items-center justify-center py-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all group/btn"
                  >
                    <CalendarCheck className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase leading-none">Attendance</span>
                    <span className="text-[7px] font-bold mt-1 opacity-60">হাজিরা | उपस्थिति</span>
                  </button>
                  
                  <button 
                    onClick={() => navigate(`/admin/view/teacher-data/${teacher.id}/leave-requests`)}
                    className="flex flex-col items-center justify-center py-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all group/btn"
                  >
                    <FileText className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase leading-none">Leave Req</span>
                    <span className="text-[7px] font-bold mt-1 opacity-60">ছুটি | अवकाश</span>
                  </button>

                  <button 
                    onClick={() => navigate(`/admin/view-profile/${teacher.id}`)}
                    className="flex flex-col items-center justify-center py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all group/btn"
                  >
                    <MoreVertical className="h-5 w-5 mb-1 group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase leading-none">Details</span>
                    <span className="text-[7px] font-bold mt-1 opacity-60">বিবরণ | विवरण</span>
                  </button>
                </div>

              </div>
            ))}

            {/* Empty State */}
            {!loading && filteredTeachers.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <Search className="h-16 w-16 text-gray-100 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-700 leading-none">No Teachers Found</h3>
                <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">কোনো শিক্ষক পাওয়া যায়নি | कोई शिक्षक नहीं मिला</p>
                <p className="text-gray-400 text-sm mt-4 font-medium">Try adjusting your filters | ফিল্টার পরিবর্তন করে দেখুন</p>
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
          width: 100%;
          font-size: 0.95rem;
          transition: all 0.2s;
          background-color: #f9fafb;
        }
        .input-std:focus {
          border-color: #2563eb;
          background-color: white;
          outline: none;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </AdminDashboardLayout>
  );
};

export default TeacherData;