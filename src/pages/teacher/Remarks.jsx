import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, Search, Loader2, User, Send, Clock, CheckCircle, Edit3, Trash2, X, AlertCircle
} from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const Remarks = () => {
  const { userData } = useTeacherUser();
  
  // --- State ---
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [sessionDocId, setSessionDocId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [allClasses, setAllClasses] = useState([]);
  
  // Selections
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null); 
  
  // Form Data
  const [remarkContent, setRemarkContent] = useState('');
  const [remarkCategory, setRemarkCategory] = useState('General'); 
  const [editingRemarkId, setEditingRemarkId] = useState(null); 

  // UI - Dropdowns
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [isClassOpen, setIsClassOpen] = useState(false);
  const classRef = useRef(null);

  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isStudentOpen, setIsStudentOpen] = useState(false);
  const studentRef = useRef(null);
  
  const formRef = useRef(null);

  // --- Click Outside ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (classRef.current && !classRef.current.contains(e.target)) setIsClassOpen(false);
      if (studentRef.current && !studentRef.current.contains(e.target)) setIsStudentOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- 1. Fetch Session (Initial Load) ---
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          setSessionDocId(docSnap.id);
          setSessionName(data.name);
          setAllClasses(data.classes || []);
        }
      } catch (e) { console.error("Error:", e); }
      finally { setLoading(false); }
    };
    fetchSession();
  }, []);

  // --- 2. Derived State: Current Students & Remarks ---
  const { currentStudents, studentRemarks } = useMemo(() => {
    if (!selectedClassId) return { currentStudents: [], studentRemarks: [] };
    const cls = allClasses.find(c => c.name === selectedClassId);
    if (!cls) return { currentStudents: [], studentRemarks: [] };

    const students = (cls.students || []).sort((a,b) => {
        const rollA = parseInt(a.rollNo) || 999;
        const rollB = parseInt(b.rollNo) || 999;
        return rollA - rollB;
    });

    let remarks = [];
    if (selectedStudent) {
        const freshStudent = students.find(s => (s.uid === selectedStudent.uid || s.rollNo === selectedStudent.rollNo));
        remarks = freshStudent?.remarks || [];
        remarks = [...remarks].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return { currentStudents: students, studentRemarks: remarks };
  }, [allClasses, selectedClassId, selectedStudent]);


  const handleEditClick = (remark) => {
    setRemarkContent(remark.remark);
    setRemarkCategory(remark.category || 'General');
    setEditingRemarkId(remark.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRemarkId(null);
    setRemarkContent('');
    setRemarkCategory('General');
  };

  const handleSaveOrDelete = async (action, remarkIdToDelete = null) => {
    if (action === 'save' && (!selectedStudent || !remarkContent.trim())) {
        alert("Please select a student and write a remark.");
        return;
    }
    if (action === 'delete' && !window.confirm("Are you sure you want to delete this remark?")) return;

    setSubmitting(true);
    try {
        const sessionRef = doc(db, 'academicSessions', sessionDocId);
        const sessionSnap = await getDoc(sessionRef);
        if (!sessionSnap.exists()) throw new Error("Session not found");
        
        const sessionData = sessionSnap.data();
        const currentClasses = sessionData.classes || [];

        const newRemark = {
            id: editingRemarkId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            remark: remarkContent,
            category: remarkCategory,
            teacherUid: userData.uid,
            teacherName: userData.name,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        const updatedClasses = currentClasses.map(cls => {
            if (cls.name === selectedClassId) {
                const updatedStudents = (cls.students || []).map(std => {
                    if ((std.uid && std.uid === selectedStudent.uid) || std.rollNo === selectedStudent.rollNo) {
                        const existingRemarks = std.remarks || [];
                        let newRemarksList;
                        if (action === 'delete') {
                            newRemarksList = existingRemarks.filter(r => r.id !== remarkIdToDelete);
                        } else if (editingRemarkId) {
                            newRemarksList = existingRemarks.map(r => r.id === editingRemarkId ? { ...r, ...newRemark } : r);
                        } else {
                            newRemarksList = [newRemark, ...existingRemarks];
                        }
                        return { ...std, remarks: newRemarksList };
                    }
                    return std;
                });
                return { ...cls, students: updatedStudents };
            }
            return cls;
        });

        await updateDoc(sessionRef, { classes: updatedClasses });

        if (action === 'save' && selectedStudent.uid) {
            try {
                const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
                const actionText = editingRemarkId ? 'updated' : 'posted';
                await sendPushNotification({
                    targetUid: selectedStudent.uid,
                    title: `Teacher Remark - ${remarkCategory}`,
                    body: `Hi ${selectedStudent.name}, ${userData.name} has ${actionText} a remark on your profile.`
                });
            } catch (notifError) { console.error(notifError); }
        }

        setAllClasses(updatedClasses);
        if (action === 'save') {
            handleCancelEdit();
            alert(editingRemarkId ? "Remark updated!" : "Remark posted!");
        } else {
            if (editingRemarkId === remarkIdToDelete) handleCancelEdit();
        }
    } catch (e) {
        console.error(e);
        alert("Failed to save changes.");
    } finally {
        setSubmitting(false);
    }
  };

  const filteredClasses = useMemo(() => 
    allClasses.filter(c => c.name.toLowerCase().includes(classSearchTerm.toLowerCase())), 
  [allClasses, classSearchTerm]);

  const filteredStudents = useMemo(() => 
    currentStudents.filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())),
  [currentStudents, studentSearchTerm]);

  const getCategoryColor = (cat) => {
    switch(cat) {
        case 'Appreciation': return 'bg-green-100 text-green-700 border-green-200';
        case 'Improvement': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'Homework': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const categories = [
    { id: 'General', label: 'General', subLabel: 'সাধারণ | सामान्य' },
    { id: 'Appreciation', label: 'Appreciation', subLabel: 'প্রশংসা | प्रशंसा' },
    { id: 'Improvement', label: 'Improvement', subLabel: 'উন্নতি | सुधार' },
    { id: 'Homework', label: 'Homework', subLabel: 'বাড়ির কাজ | गृहकार्य' }
  ];

  return (
    <TeacherDashboardLayout>
      <div className="flex flex-col h-full bg-gray-50 p-4 lg:p-6 space-y-6">
        
        {/* --- HEADER --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row items-center justify-between gap-6 z-30">
          <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-purple-600 flex-shrink-0">
              <MessageSquare size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight leading-none">Student Remarks</h1>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ছাত্র মন্তব্য | छात्र टिप्पणी</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{sessionName}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            
            {/* 1. Class Selector */}
            <div className="relative w-full sm:w-64" ref={classRef}>
              <div className="relative cursor-pointer" onClick={() => setIsClassOpen(!isClassOpen)}>
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                 <input 
                    type="text" 
                    placeholder="Find Class... | ক্লাস খুঁজুন..."
                    value={isClassOpen ? classSearchTerm : (selectedClassId || classSearchTerm)}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer"
                 />
              </div>
              {isClassOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 p-2">
                    {filteredClasses.length > 0 ? filteredClasses.map(cls => (
                        <div key={cls.name} 
                             onClick={() => { 
                                setSelectedClassId(cls.name); 
                                setIsClassOpen(false); 
                                setClassSearchTerm(''); 
                                setSelectedStudent(null); 
                             }}
                             className={`px-4 py-3 rounded-xl text-base font-medium cursor-pointer hover:bg-purple-50 ${selectedClassId===cls.name ? 'bg-purple-600 text-white hover:bg-purple-700' : 'text-gray-700'}`}>
                             {cls.name}
                        </div>
                    )) : <div className="p-4 text-center text-gray-400 text-sm">No class found</div>}
                </div>
              )}
            </div>

            {/* 2. Student Selector */}
            <div className="relative w-full sm:w-80" ref={studentRef}>
               <div className={`relative cursor-pointer ${!selectedClassId && 'opacity-50 cursor-not-allowed'}`} 
                    onClick={() => selectedClassId && setIsStudentOpen(!isStudentOpen)}>
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input 
                    type="text" 
                    placeholder={selectedClassId ? "Search Student... | ছাত্র খুঁজুন..." : "Select Class First | ক্লাস বেছে নিন"}
                    value={isStudentOpen ? studentSearchTerm : (selectedStudent?.name || studentSearchTerm)}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    disabled={!selectedClassId}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-purple-100 transition-all cursor-pointer disabled:bg-gray-100"
                  />
               </div>
               {isStudentOpen && selectedClassId && (
                 <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-50 p-2">
                    {filteredStudents.length > 0 ? filteredStudents.map(std => (
                        <div key={std.uid || std.rollNo} 
                             onClick={() => { setSelectedStudent(std); setIsStudentOpen(false); setStudentSearchTerm(''); }}
                             className="px-4 py-3 rounded-xl text-base font-medium cursor-pointer hover:bg-purple-50 text-gray-700 flex justify-between items-center">
                             <span>{std.name}</span>
                             <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold">Roll: {std.rollNo}</span>
                        </div>
                    )) : <div className="p-4 text-center text-gray-400 text-sm">No student found</div>}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 overflow-y-auto pb-10">
           {!selectedStudent ? (
               <div className="flex flex-col items-center justify-center h-96 text-gray-300">
                  <User size={80} className="mb-6 opacity-10" />
                  <div className="text-center">
                    <p className="font-bold text-gray-400 uppercase text-lg tracking-widest">
                        {selectedClassId ? "Select a Student to Continue" : "Select Class & Student to Start"}
                    </p>
                    <p className="text-xs font-bold text-gray-300 uppercase mt-1">
                        শুরু করতে ক্লাস এবং ছাত্র নির্বাচন করুন | शुरू करने के लिए कक्षा और छात्र चुनें
                    </p>
                  </div>
               </div>
           ) : (
               <div className="flex flex-col xl:flex-row gap-8 max-w-7xl mx-auto">
                   
                   {/* LEFT: STUDENT PROFILE & HISTORY */}
                   <div className="flex-1 space-y-6">
                        {/* Profile Card */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-6">
                            <div className="h-20 w-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-2xl border-4 border-white shadow-lg">
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 leading-none">{selectedStudent.name}</h2>
                                <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">ছাত্রের প্রোফাইল | छात्र प्रोफाइल</p>
                                <div className="flex items-center gap-3 mt-3 text-sm font-bold text-gray-500 uppercase">
                                    <span className="bg-gray-100 px-2 py-1 rounded">Class {selectedClassId}</span>
                                    <span>•</span>
                                    <span>Roll: {selectedStudent.rollNo}</span>
                                </div>
                            </div>
                        </div>

                        {/* History List */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 min-h-[400px]">
                            <div className="flex flex-col mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 leading-none">
                                    <Clock size={20} className="text-gray-400"/> Past Remarks
                                </h3>
                                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase ml-7">আগের মন্তব্য | पिछली टिप्पणियां</span>
                            </div>

                            <div className="space-y-4">
                                {studentRemarks.length === 0 ? (
                                    <div className="text-center py-10 text-gray-300">
                                        <p className="font-bold">No previous remarks found | কোনো মন্তব্য পাওয়া যায়নি</p>
                                    </div>
                                ) : (
                                    studentRemarks.map(rem => {
                                        const isMyPost = rem.teacherUid === userData.uid;
                                        return (
                                            <div key={rem.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 relative group hover:bg-white hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${getCategoryColor(rem.category)}`}>
                                                        {rem.category}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-gray-400">{rem.date}</span>
                                                        {isMyPost && (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleEditClick(rem)} className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Edit3 size={14} /></button>
                                                                <button onClick={() => handleSaveOrDelete('delete', rem.id)} className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100"><Trash2 size={14} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-gray-700 font-medium mb-3 leading-relaxed">"{rem.remark}"</p>
                                                <div className="pt-3 border-t border-gray-200 flex items-center gap-2">
                                                    <div className="h-5 w-5 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-800">{rem.teacherName?.[0]}</div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-bold leading-none ${isMyPost ? 'text-purple-600' : 'text-gray-500'}`}>{isMyPost ? "You" : `By ${rem.teacherName}`}</span>
                                                        <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Posted By | পোস্ট করেছেন</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                   </div>

                   {/* RIGHT: ENTRY FORM */}
                   <div className="flex-1" ref={formRef}>
                        <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl border sticky top-4 transition-colors duration-300 ${editingRemarkId ? 'border-blue-100 ring-2 ring-blue-50' : 'border-purple-100'}`}>
                            
                            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${editingRemarkId ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {editingRemarkId ? <Edit3 size={24} /> : <Send size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-800 leading-none">
                                            {editingRemarkId ? "Edit Remark" : "Post New Remark"}
                                        </h3>
                                        <p className="text-[9px] font-bold text-purple-600 mt-1 uppercase">
                                            {editingRemarkId ? "মন্তব্য পরিবর্তন | टिप्पणी संपादित करें" : "নতুন মন্তব্য পোস্ট | नई टिप्पणी पोस्ट करें"}
                                        </p>
                                    </div>
                                </div>
                                {editingRemarkId && (
                                    <button onClick={handleCancelEdit} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Category Selection */}
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block leading-none">Category</label>
                                    <p className="text-[9px] font-bold text-purple-400 ml-1 mb-3 uppercase">বিভাগ | श्रेणी</p>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setRemarkCategory(cat.id)}
                                                className={`px-4 py-2 rounded-xl border transition-all flex flex-col items-center ${remarkCategory === cat.id ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <span className="text-xs font-bold leading-none">{cat.label}</span>
                                                <span className={`text-[8px] mt-1 font-medium ${remarkCategory === cat.id ? 'text-purple-100' : 'text-gray-400'}`}>{cat.subLabel}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Area */}
                                <div>
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block leading-none">Your Feedback</label>
                                    <p className="text-[9px] font-bold text-purple-400 ml-1 mb-2 uppercase">আপনার মতামত | आपकी प्रतिक्रिया</p>
                                    <textarea
                                        rows="6"
                                        placeholder={`Write a remark for ${selectedStudent.name}... | লিখুন...`}
                                        value={remarkContent}
                                        onChange={(e) => setRemarkContent(e.target.value)}
                                        className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-medium outline-none focus:bg-white focus:ring-4 focus:ring-purple-50 transition-all placeholder:text-gray-300 resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex gap-3">
                                    {editingRemarkId && (
                                        <button onClick={handleCancelEdit} className="px-6 py-5 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100 uppercase">Cancel | বাতিল</button>
                                    )}
                                    <button 
                                        onClick={() => handleSaveOrDelete('save')}
                                        disabled={submitting}
                                        className={`flex-1 py-5 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-xl transition-all hover:shadow-purple-200 hover:-translate-y-1 flex flex-col items-center justify-center gap-1 disabled:bg-gray-400`}
                                    >
                                        <div className="flex items-center gap-2 leading-none">
                                            {submitting ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                                            {submitting ? 'Saving...' : (editingRemarkId ? 'Update Remark' : 'Post Remark')}
                                        </div>
                                        <span className="text-[9px] font-medium opacity-80 uppercase">সেভ করুন | टिप्पणी पोस्ट करें</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                   </div>
               </div>
           )}
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

export default Remarks;