import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, Loader2, Search, CheckCircle, 
  XCircle, Trash2, Eye, UserPlus, Calendar, Phone
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import ViewApplicationModal from './ViewApplicationModal';

const ManageApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);

  // Fetch all applications from Firestore
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'admission_applications'), orderBy('submissionDate', 'desc'));
      const snapshot = await getDocs(q);
      const appsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(appsData);
    } catch (error) {
      console.error("Error fetching applications: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Handle status updates (Accept/Reject)
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'admission_applications', id), { status: newStatus });
      setApplications(applications.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      ));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  // Permanently delete rejected applications 
  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to permanently delete this application record?")) {
      try {
        await deleteDoc(doc(db, 'admission_applications', id));
        setApplications(applications.filter(app => app.id !== id));
      } catch (error) {
        console.error("Error deleting application:", error);
        alert("Failed to delete application.");
      }
    }
  };

  // Direct to Add Profile page with Application No for autofill
  const handleProcessAdmission = (app) => {
    navigate('/admin/add-profile', { state: { applicationNo: app.applicationNo } });
  };

  const filteredApps = applications.filter(app => 
    app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicationNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.fatherContact?.includes(searchTerm) ||
    app.motherContact?.includes(searchTerm)
  );

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[80vh]">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
              <FileSpreadsheet size={24} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Admission Desk</h2>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ভর্তি ডেস্ক | प्रवेश डेस्क</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Online Applications Manager (পরিচালক | प्रबंधक)</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search Name, App No, or Phone... | খুঁজুন... | खोजें..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all font-medium text-sm"
            />
          </div>
        </div>

        {/* Applications Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 bg-gray-50/50 rounded-3xl border">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <div className="text-center">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Applications...</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase mt-1">আবেদন লোড হচ্ছে... | आवेदन लोड हो रहे हैं...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500">
                  <th className="p-5 border-b border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">App No & Date</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">আবেদন নং ও তারিখ | आवेदन संख्या और तारीख</p>
                  </th>
                  <th className="p-5 border-b border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Student Details</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ছাত্রের বিবরণ | छात्र विवरण</p>
                  </th>
                  <th className="p-5 border-b border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Guardian Contact</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অভিভাবক যোগাযোগ | अभिभावक संपर्क</p>
                  </th>
                  <th className="p-5 border-b border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Status</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                  </th>
                  <th className="p-5 border-b border-gray-100 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">Actions</p>
                    <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ব্যবস্থা | कार्रवाई</p>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-20 text-center text-gray-400">
                      <p className="font-bold">No matching applications found.</p>
                      <p className="text-xs uppercase mt-1">কোনো আবেদন পাওয়া যায়নি | कोई आवेदन नहीं मिला</p>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-5">
                        <div className="font-black text-blue-600 text-sm tracking-tight leading-none">{app.applicationNo || 'PENDING'}</div>
                        <div className="flex flex-col mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase leading-none">
                              <Calendar size={12}/> {app.submissionDate?.toDate().toLocaleDateString('en-GB')}
                            </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-gray-800 text-sm leading-none">{app.studentName}</div>
                        <div className="text-[11px] text-gray-500 font-semibold mt-2">
                           <span className="opacity-70">Applying for:</span> <span className="text-indigo-600 font-bold">{app.classApplied}</span>
                           <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">আবেদন করেছেন | आवेदन किया</p>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold leading-none">
                          <Phone size={14} className="text-gray-400"/> {app.fatherContact || app.motherContact}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-2 uppercase leading-none">
                            {app.fatherName || 'Parent'}
                            <span className="text-[8px] ml-2 opacity-60">অভিভাবক | अभिभावक</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col items-start gap-1">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            app.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            app.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {app.status || 'Pending'}
                            </span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase ml-1">
                                {app.status === 'Accepted' ? 'গৃহীত | स्वीकृत' : app.status === 'Rejected' ? 'প্রত্যাখ্যাত | अस्वीकृत' : 'বাকি | लंबित'}
                            </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Full Data */}
                          <button 
                            onClick={() => setSelectedApp(app)} 
                            className="p-2.5 bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" 
                            title="View Full Application"
                          >
                            <Eye size={18} />
                          </button>

                          {/* Process to Official Profile  */}
                          {app.status === 'Accepted' && (
                            <button 
                              onClick={() => handleProcessAdmission(app)}
                              className="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-100 flex flex-col items-center justify-center"
                              title="Register as Student"
                            >
                              <div className="flex items-center gap-2">
                                <UserPlus size={18} />
                                <span className="hidden xl:inline text-xs font-bold uppercase tracking-wider">Process Admission</span>
                              </div>
                              <span className="text-[7px] font-medium opacity-80 mt-0.5 hidden xl:block">ভর্তি প্রক্রিয়া | प्रवेश प्रक्रिया</span>
                            </button>
                          )}

                          {/* Status Management */}
                          {app.status !== 'Accepted' && (
                            <button 
                              onClick={() => handleStatusChange(app.id, 'Accepted')} 
                              className="p-2.5 bg-white border border-gray-200 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                              title="Accept"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          
                          {app.status === 'Pending' && (
                            <button 
                              onClick={() => handleStatusChange(app.id, 'Rejected')} 
                              className="p-2.5 bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          )}

                          {app.status === 'Rejected' && (
                            <button 
                              onClick={() => handleDelete(app.id)} 
                              className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm" 
                              title="Delete Record"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for viewing details */}
        {selectedApp && (
          <ViewApplicationModal 
            app={selectedApp} 
            onClose={() => setSelectedApp(null)} 
          />
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default ManageApplications;