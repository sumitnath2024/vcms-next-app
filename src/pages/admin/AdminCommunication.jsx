import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Calendar, Edit2, Trash2, 
  X, Save, Search, Bell, Loader2, Users, CheckCircle2 
} from 'lucide-react';
import { 
  collection, addDoc, getDocs, updateDoc, 
  deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const AdminCommunication = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  const initialForm = { 
    title: '', 
    message: '', 
    type: 'General',
    targetRoles: ['Student', 'Teacher', 'Admin'] 
  };
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const noticeTypes = ['General', 'Urgent', 'Holiday', 'Event', 'Exam'];
  const availableRoles = ['Student', 'Teacher', 'Admin'];

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'generalNotices'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotices(data);
    } catch (err) {
      console.error("Error fetching notices:", err);
      if (err.code === 'failed-precondition') {
        const snapshot = await getDocs(collection(db, 'generalNotices'));
        setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const isSelected = prev.targetRoles.includes(role);
      const newRoles = isSelected 
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role];
      return { ...prev, targetRoles: newRoles };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return alert("Please fill all fields");
    if (formData.targetRoles.length === 0) return alert("Please select at least one target audience.");

    setIsPublishing(true); 

    try {
      const noticeData = {
        ...formData,
        date: new Date().toISOString(), 
        postedBy: 'Admin'
      };

      if (editingId) {
        await updateDoc(doc(db, 'generalNotices', editingId), noticeData);
      } else {
        await addDoc(collection(db, 'generalNotices'), noticeData);
      }

      try {
        const broadcastPushNotification = httpsCallable(functions, 'broadcastPushNotification');
        const shortMessage = formData.message.length > 80 
          ? formData.message.substring(0, 80) + '...' 
          : formData.message;

        await broadcastPushNotification({
          title: `📢 ${editingId ? 'Updated Notice' : 'New Notice'}: ${formData.title}`,
          body: shortMessage,
          targetRoles: formData.targetRoles 
        });
      } catch (notifError) {
        console.error("Broadcast failed:", notifError);
      }

      closeModal();
      fetchNotices();
    } catch (error) {
      console.error("Error saving notice:", error);
      alert("Failed to save notice.");
    } finally {
      setIsPublishing(false); 
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this notice? (ডিলিট করবেন কি?)")) {
      try {
        await deleteDoc(doc(db, 'generalNotices', id));
        setNotices(notices.filter(n => n.id !== id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const openEdit = (notice) => {
    setFormData({ 
      title: notice.title, 
      message: notice.message, 
      type: notice.type || 'General',
      targetRoles: notice.targetRoles || ['Student', 'Teacher', 'Admin'] 
    });
    setEditingId(notice.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialForm);
    setEditingId(null);
  };

  const filteredNotices = notices.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto pb-20 font-sans">
        
        {/* HEADER & ACTIONS */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 leading-none">
              <Megaphone className="text-blue-600 h-8 w-8" /> Communication Center
            </h1>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">যোগাযোগ কেন্দ্র | संचार केंद्र</span>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Manage General Notices & Announcements (বিজ্ঞপ্তি পরিচালনা)</p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 text-sm leading-none">
                <Plus size={20} /> <span>Post New Notice</span>
            </div>
            <span className="text-[9px] font-medium opacity-80 mt-1 uppercase">নতুন নোটিশ পাঠান | नई सूचना भेजें</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex items-center gap-4 group focus-within:ring-4 focus-within:ring-blue-50 transition-all">
          <Search className="text-gray-400 ml-2" size={24} />
          <div className="flex-1 flex flex-col">
              <input 
                type="text" 
                placeholder="Search notices... | খুঁজুন... | खोजें..." 
                className="w-full outline-none font-bold text-gray-700 placeholder-gray-300 text-lg bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>

        {/* NOTICES GRID */}
        {loading ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-inner flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <div className="flex flex-col">
                <p className="text-gray-500 font-black tracking-widest text-sm uppercase">Loading Notices...</p>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">বিজ্ঞপ্তি লোড হচ্ছে | सूचना लोड हो रही है</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNotices.map((notice) => (
              <div key={notice.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 left-0 right-0 h-2 
                  ${notice.type === 'Urgent' ? 'bg-red-500' : 
                    notice.type === 'Holiday' ? 'bg-emerald-500' : 
                    notice.type === 'Exam' ? 'bg-orange-500' : 'bg-blue-500'}`} 
                />

                <div className="flex justify-between items-start mb-6 mt-2">
                  <div className="flex flex-col">
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit
                        ${notice.type === 'Urgent' ? 'bg-red-50 text-red-600 border-red-100' : 
                        notice.type === 'Holiday' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        notice.type === 'Exam' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'}`}
                    >
                        {notice.type || 'General'}
                    </span>
                    <span className="text-[8px] font-bold text-gray-400 mt-1 ml-1 uppercase">বিভাগ | श्रेणी</span>
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(notice)} className="p-2.5 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-xl text-gray-500 transition-all"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(notice.id)} className="p-2.5 bg-gray-50 hover:bg-red-600 hover:text-white rounded-xl text-gray-500 transition-all"><Trash2 size={16}/></button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-gray-800 mb-3 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{notice.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6 line-clamp-4 flex-1">
                  {notice.message}
                </p>

                <div className="flex flex-col gap-2 mb-6 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 shadow-inner">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Audience (প্রাপক)</span>
                  <div className="flex flex-wrap gap-2">
                    {notice.targetRoles?.map(role => (
                        <span key={role} className="flex items-center gap-1.5 text-[10px] font-black text-gray-600 bg-white border border-gray-200 px-3 py-1 rounded-lg uppercase shadow-sm">
                        <Users size={12} className="text-blue-500" /> {role}s
                        </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col border-t border-gray-100 pt-5">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase leading-none">
                        <Calendar size={14} className="text-blue-400" />
                        {new Date(notice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <span className="text-[8px] font-bold text-gray-300 mt-1 uppercase">Posted Date | পোস্টের তারিখ</span>
                </div>
              </div>
            ))}
            
            {filteredNotices.length === 0 && (
              <div className="col-span-full text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 flex flex-col items-center">
                <div className="bg-gray-50 p-6 rounded-full mb-4 shadow-inner">
                    <Bell className="text-gray-200" size={64} />
                </div>
                <div className="flex flex-col">
                    <p className="text-gray-400 font-black uppercase text-sm tracking-widest">No notices found.</p>
                    <span className="text-[10px] font-bold text-gray-300 mt-1 uppercase">কোনো বিজ্ঞপ্তি পাওয়া যায়নি | कोई सूचना नहीं मिली</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CREATE / EDIT MODAL --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                    <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3 leading-none">
                    {editingId ? <Edit2 size={24} className="text-blue-600"/> : <Megaphone size={24} className="text-blue-600"/>}
                    {editingId ? 'Edit Notice' : 'Post New Notice'}
                    </h3>
                    <span className="text-[10px] font-bold text-blue-400 mt-2 uppercase">নোটিশ তৈরি করুন | सूचना बनाएँ</span>
                </div>
                <button onClick={closeModal} disabled={isPublishing} className="p-2.5 hover:bg-rose-50 hover:text-rose-500 rounded-full text-gray-400 transition-all border border-gray-200"><X size={20}/></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                
                {/* TARGET AUDIENCE SELECTION */}
                <div className="space-y-1">
                  <div className="flex flex-col mb-3">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none">Send To (Target Audience)</label>
                    <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase">প্রাপক নির্বাচন করুন | प्राप्तकर्ता चुनें</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {availableRoles.map(role => (
                      <label 
                        key={role} 
                        className={`flex flex-col items-center justify-center min-w-[90px] p-3 rounded-2xl cursor-pointer border-2 transition-all group
                          ${formData.targetRoles.includes(role) 
                            ? 'border-blue-500 bg-blue-50/50 shadow-inner' 
                            : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-blue-200'}`}
                      >
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.targetRoles.includes(role)}
                          onChange={() => handleRoleToggle(role)}
                        />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mb-2 transition-all
                          ${formData.targetRoles.includes(role) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200'}`}
                        >
                          {formData.targetRoles.includes(role) && <CheckCircle2 size={16} />}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${formData.targetRoles.includes(role) ? 'text-blue-700' : ''}`}>{role}s</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none">Title</label>
                    <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase mb-2">শিরোনাম | शीर्षक</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Notice Heading... (নোটিশের বিষয়)" 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all uppercase tracking-tight"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none">Category</label>
                    <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase mb-3">বিভাগ | श्रेणी</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {noticeTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, type})}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all transform active:scale-95 ${formData.type === type ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none">Message Content</label>
                    <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase mb-2">বার্তার বিষয়বস্তু | संदेश सामग्री</span>
                  </div>
                  <textarea 
                    rows="5"
                    placeholder="Type details here... (বিস্তারিত লিখুন)" 
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all resize-none shadow-inner"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isPublishing}
                  className="w-full py-5 mt-4 bg-blue-600 text-white rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 disabled:opacity-70 disabled:grayscale"
                >
                  <div className="flex items-center gap-3 leading-none">
                    {isPublishing ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} 
                    <span>{isPublishing ? 'Broadcasting...' : editingId ? 'Update Notice' : 'Publish Notice'}</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-80">
                    {isPublishing ? 'ব্রডকাস্ট করা হচ্ছে... | प्रसारित हो रहा है...' : 'এখনই পাঠান | अभी प्रकाशित करें'}
                  </span>
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </AdminDashboardLayout>
  );
};

export default AdminCommunication;