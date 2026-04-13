import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, CheckCircle, Clock, Mail, Phone, Calendar, 
  MessageSquare, User, Loader2
} from 'lucide-react';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { db } from '../../firebase'; 
import { collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AdminEnquiries = () => {
  // --- STATE FOR ADMISSION SETTINGS ---
  const [isOpen, setIsOpen] = useState(false);
  const [sessionYear, setSessionYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- STATE FOR ENQUIRIES ---
  const [enquiries, setEnquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH DATA FROM FIREBASE ON MOUNT ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRef = doc(db, 'admission_status', 'current');
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsOpen(data.isOpen || false);
          setSessionYear(data.sessionYear || '');
        }

        const querySnapshot = await getDocs(collection(db, 'enquiries'));
        
        let fetchedEnquiries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        fetchedEnquiries.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setEnquiries(fetchedEnquiries);
      } catch (error) {
        console.error("Error fetching data from Firebase:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- SAVE ADMISSION SETTINGS TO NEW COLLECTION ---
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'admission_status', 'current');
      await setDoc(settingsRef, { 
        isOpen: isOpen, 
        sessionYear: sessionYear 
      }, { merge: true });
      
      alert("Admission settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings to Firebase:", error);
      alert("Failed to save settings. Check console for permission errors.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- TOGGLE RESPONDED STATUS IN FIREBASE ---
  const handleToggleResponded = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const enqRef = doc(db, 'enquiries', id);
      
      await updateDoc(enqRef, { 
        responded: newStatus 
      });

      setEnquiries(prev => 
        prev.map(enq => 
          enq.id === id ? { ...enq, responded: newStatus } : enq
        )
      );
    } catch (error) {
      console.error("Error updating enquiry status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight leading-none">Admission Enquiries</h1>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ভর্তি সংক্রান্ত অনুসন্ধান | प्रवेश पूछताछ</span>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Manage Parent Queries & Status (পরিচালনা | प्रबंधन)</p>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* 1. ADMISSION CONTROL PANEL */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex flex-col">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-blue-600"/>
                <h2 className="font-black text-blue-900 uppercase text-xs tracking-widest">Admission Control Panel</h2>
              </div>
              <span className="text-[9px] font-bold text-blue-400 mt-1 ml-7 uppercase">ভর্তি নিয়ন্ত্রণ প্যানেল | प्रवेश नियंत्रण कक्ष</span>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
              
              {/* Toggle Switch */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col mb-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 leading-none">
                    Online Admissions Status
                    </label>
                    <span className="text-[8px] font-bold text-blue-400 ml-1 mt-1 uppercase">ভর্তি অবস্থা | प्रवेश स्थिति</span>
                </div>
                <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100 h-[52px]">
                  <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isOpen ? 'bg-emerald-400' : 'bg-gray-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isOpen ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold leading-none ${isOpen ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {isOpen ? 'Open (Accepting)' : 'Closed'}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                        {isOpen ? 'খোলা | खुला' : 'বন্ধ | बंद'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Session Input */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col ml-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                    Admission Session (Year) *
                    </label>
                    <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ভর্তির সেশন | प्रवेश सत्र</span>
                </div>
                <input 
                  type="text" 
                  value={sessionYear} 
                  onChange={(e) => setSessionYear(e.target.value)}
                  placeholder="e.g., 2026"
                  className="input-std"
                />
              </div>

              {/* Save Button */}
              <div>
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-[10px] rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 flex flex-col items-center justify-center gap-1 uppercase tracking-widest active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                    <span>Save Settings</span>
                  </div>
                  <span className="text-[8px] font-medium opacity-80 uppercase">সেটিংস সেভ করুন | सेटिंग्स सहेजें</span>
                </button>
              </div>

            </div>
          </div>

          {/* 2. ENQUIRIES LIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-blue-600"/>
                    <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Parent Enquiries Data</h2>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 mt-1 ml-7 uppercase">অনুসন্ধানের তথ্য | पूछताछ डेटा</span>
              </div>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full border border-blue-200">
                TOTAL (মোট): {enquiries.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Loading Data...</span>
                    <span className="text-[8px] font-bold text-blue-300 mt-1 uppercase">তথ্য লোড হচ্ছে | डेटा लोड हो रहा है</span>
                  </div>
                </div>
              ) : enquiries.length === 0 ? (
                <div className="p-12 text-center text-gray-500 font-medium">
                  <p>No enquiries found in the database.</p>
                  <p className="text-xs uppercase mt-1">কোনো তথ্য পাওয়া যায়নি | कोई पूछताछ नहीं मिली</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-gray-400">
                      <th className="px-6 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Date</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">তারিখ | तारीख</p>
                      </th>
                      <th className="px-6 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Parent Details</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অভিভাবক | विवरण</p>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Age / Class</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">বয়স ও ক্লাস</p>
                      </th>
                      <th className="px-6 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Message</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">বার্তা | संदेश</p>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Status</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">অবস্থা | स्थिति</p>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Action</p>
                        <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ব্যবস্থা | कार्रवाई</p>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enquiries.map((enq) => (
                      <tr key={enq.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold uppercase tracking-tight">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {enq.date}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800 flex items-center gap-2 mb-1">
                            <User size={12} className="text-gray-400" /> {enq.parentName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600 font-bold">
                            <Phone size={12} className="text-blue-400" /> {enq.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-gray-200 tracking-tighter">
                            {enq.childAge || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-600 max-w-xs truncate font-medium flex items-center gap-2" title={enq.message}>
                            <MessageSquare size={14} className="text-gray-300 shrink-0"/> 
                            {enq.message || <span className="text-gray-400 italic font-normal">No message provided</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {enq.responded ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] uppercase tracking-wider font-black px-2.5 py-1 rounded-md border border-emerald-200">
                                <CheckCircle size={10} /> Responded
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[9px] uppercase tracking-wider font-black px-2.5 py-1 rounded-md border border-rose-200">
                                <Clock size={10} /> Pending
                                </span>
                            )}
                            <span className="text-[7px] font-bold text-gray-400 uppercase">
                                {enq.responded ? 'উত্তর দেওয়া হয়েছে' : 'বাকি আছে | लंबित'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleResponded(enq.id, enq.responded)}
                            className={`flex flex-col items-center justify-center w-full min-w-[80px] py-1.5 rounded-xl border transition-all active:scale-95 ${
                              enq.responded 
                                ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' 
                                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase leading-none">{enq.responded ? 'Undo' : 'Mark Done'}</span>
                            <span className="text-[7px] font-bold opacity-70 mt-1 uppercase">{enq.responded ? 'ফিরিয়ে আনুন' : 'সম্পন্ন করুন | पूर्ण'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .input-std { 
          padding: 0.8rem 1rem; 
          border: 1px solid #e0e7ff; 
          background: #f8fafc; 
          border-radius: 0.75rem; 
          width: 100%; 
          font-size: 0.9rem; 
          font-weight: 700; 
          transition: all 0.2s; 
          color: #1e293b;
        } 
        .input-std:focus { 
          border-color: #6366f1; 
          outline: none; 
          background: white; 
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); 
        }
      `}</style>
    </AdminDashboardLayout>
  );
};

export default AdminEnquiries;