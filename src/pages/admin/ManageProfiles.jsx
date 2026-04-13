import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Search, Plus, Edit, Loader2, Eye, X, FileSpreadsheet, Phone, Smartphone, Mail
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const ManageProfiles = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => {
    // 1. If the search bar is empty, show everyone!
    if (!searchTerm) return true;
    
    // 2. Otherwise, check all fields including the contact number
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term) ||
      u.admissionNo?.toLowerCase().includes(term) ||
      u.employeeId?.toLowerCase().includes(term) ||
      u.contactNumber?.includes(term) 
    );
  });

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="space-y-6 pb-20 font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">User Management</h2>
            <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ব্যবহারকারী ব্যবস্থাপনা | उपयोगकर्ता प्रबंधन</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Directory & Onboarding (ডিরেক্টরি এবং অনবোর্ডিং | निर्देशिका और ऑनबोर्डिंग)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full xl:w-auto items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Search users... | ব্যবহারকারী খুঁজুন... | उपयोगकर्ता खोजें..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none font-medium transition-all"
              />
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              <button 
                onClick={() => navigate('/admin/add-profile')} 
                className="flex-shrink-0 bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200 flex flex-col items-center"
              >
                <div className="flex items-center gap-2 text-xs">
                    <Plus size={16} /> <span>Add Single</span>
                </div>
                <span className="text-[7px] font-bold text-blue-100 mt-0.5 uppercase">একক যোগ করুন | एकल जोड़ें</span>
              </button>

              <button 
                onClick={() => navigate('/admin/mass-registration')} 
                className="flex-shrink-0 bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-200 flex flex-col items-center"
              >
                <div className="flex items-center gap-2 text-xs">
                    <FileSpreadsheet size={16} /> <span>Mass Registration</span>
                </div>
                <span className="text-[7px] font-bold text-emerald-100 mt-0.5 uppercase">বাল্ক আপলোড | बल्क अपलोड</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 px-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">User Details</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ব্যবহারকারীর বিবরণ | उपयोगकर्ता विवरण</p>
                  </th>
                  <th className="p-4 px-6 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">ID Number</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">আইডি নম্বর | आईडी नंबर</p>
                  </th>
                  <th className="p-4 px-6 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Role</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ভূমিকা | भूमिका</p>
                  </th>
                  <th className="p-4 px-6 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Status</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                  </th>
                  <th className="p-4 px-6 text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Actions</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ব্যবস্থা | कार्रवाई</p>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition group">
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0 text-sm uppercase">
                          {u.name?.charAt(0) || <Phone size={14}/>}
                        </div>
                        <div>
                          <div 
                            onClick={() => navigate(`/admin/view-profile/${u.id}`)}
                            className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2"
                          >
                            {u.name || 'Pending User'}
                            {u.registrationStatus === 'Pending' && (
                              <span className="bg-amber-100 text-amber-700 text-[8px] px-2 py-0.5 rounded-sm uppercase tracking-widest border border-amber-200">No Portal Access</span>
                            )}
                          </div>
                          
                          {/* UPDATED: Emphasizing Phone Number over Email */}
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                <Smartphone size={10}/> {u.contactNumber || 'No Phone Registered'}
                            </span>
                            {u.email && (
                                <span className="flex items-center gap-1 text-gray-400">
                                    <Mail size={10}/> {u.email}
                                </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 px-6 text-center font-mono text-sm text-gray-500 font-medium">
                      {u.admissionNo || u.employeeId || '-'}
                    </td>
                    <td className="p-4 px-6 text-center">
                      <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                        u.role === 'Student' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        u.role === 'Teacher' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 px-6">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                          <div className={`h-2 w-2 rounded-full ${u.status === 'Inactive' ? 'bg-red-500' : 'bg-green-500'}`} />
                          {u.status || 'Active'}
                        </div>
                        <span className="text-[7px] font-bold text-gray-400 uppercase">
                          {u.status === 'Inactive' ? 'নিষ্ক্রিয় | निष्क्रिय' : 'সক্রিয় | सक्रिय'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => navigate(`/admin/view-profile/${u.id}`)} 
                          title="View Profile"
                          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/edit-profile/${u.id}`)} 
                          title="Edit Profile"
                          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-emerald-600 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </AdminDashboardLayout>
  );
};

export default ManageProfiles;