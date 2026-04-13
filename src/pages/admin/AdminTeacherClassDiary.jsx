import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Calendar, Loader2, User, Filter, FileText, Clock, AlignLeft, Users, Trash2, Eye, ImageIcon, X, UploadCloud
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const AdminTeacherClassDiary = () => {
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Default date range: Last 7 days to Today
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [diaryEntries, setDiaryEntries] = useState([]);
  
  // NEW: State for Study Materials & Viewing
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // 1. Fetch Sessions & Teachers on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Sessions
        const sessionSnap = await getDocs(collection(db, 'academicSessions'));
        const sessionList = sessionSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        sessionList.sort((a, b) => (b.isActive === true) - (a.isActive === true));
        setSessions(sessionList);
        if (sessionList.length > 0) setSelectedSessionId(sessionList[0].id);

        // Fetch Teachers
        const teacherQ = query(collection(db, 'users'), where('role', '==', 'Teacher'));
        const teacherSnap = await getDocs(teacherQ);
        const teacherList = teacherSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        teacherList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setTeachers(teacherList);

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Fetch Diary Entries & Study Materials based on filters
  useEffect(() => {
    if (!selectedSessionId || !selectedTeacherId || !startDate || !endDate) {
      setDiaryEntries([]);
      setStudyMaterials([]);
      return;
    }

    const fetchTeacherData = async () => {
      setDataLoading(true);
      try {
        const sessionRef = doc(db, 'academicSessions', selectedSessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) return;
        
        const sessionData = sessionSnap.data();
        const classes = sessionData.classes || [];
        
        let extractedDiaries = [];
        let extractedMaterials = [];

        // Loop through all classes
        classes.forEach(cls => {
          // --- Extract Diaries ---
          if (cls.diaries && Array.isArray(cls.diaries)) {
            cls.diaries.forEach(diary => {
              if (
                diary.teacherUid === selectedTeacherId && 
                diary.date >= startDate && 
                diary.date <= endDate
              ) {
                extractedDiaries.push({ ...diary, className: cls.name });
              }
            });
          }

          // --- NEW: Extract Study Materials ---
          if (cls.subjects && Array.isArray(cls.subjects)) {
            cls.subjects.forEach(sub => {
              if (sub.studyMaterials && Array.isArray(sub.studyMaterials)) {
                sub.studyMaterials.forEach(mat => {
                   // Compare material creation date with filter dates
                   const matDate = mat.createdAt ? mat.createdAt.split('T')[0] : '';
                   if (
                      mat.teacherId === selectedTeacherId &&
                      matDate >= startDate &&
                      matDate <= endDate
                   ) {
                     extractedMaterials.push({
                        ...mat,
                        className: cls.name,
                        subjectName: sub.name
                     });
                   }
                });
              }
            });
          }
        });

        // Sort Diaries primarily by Date (Descending) then by Start Time
        extractedDiaries.sort((a, b) => {
          if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
          return (a.startTime || '').localeCompare(b.startTime || '');
        });

        // Sort Materials by Date (Descending)
        extractedMaterials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setDiaryEntries(extractedDiaries);
        setStudyMaterials(extractedMaterials);

      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchTeacherData();
  }, [selectedSessionId, selectedTeacherId, startDate, endDate]);

  // Group Diaries by Class Name
  const diariesGroupedByClass = useMemo(() => {
    return diaryEntries.reduce((acc, entry) => {
      if (!acc[entry.className]) acc[entry.className] = [];
      acc[entry.className].push(entry);
      return acc;
    }, {});
  }, [diaryEntries]);

  // NEW: Group Materials by Class Name
  const materialsGroupedByClass = useMemo(() => {
    return studyMaterials.reduce((acc, mat) => {
      if (!acc[mat.className]) acc[mat.className] = [];
      acc[mat.className].push(mat);
      return acc;
    }, {});
  }, [studyMaterials]);

  // NEW: Delete Material Function
  const handleDeleteMaterial = async (materialId, className, subjectName) => {
    if (!window.confirm("Are you sure you want to delete this study material? This cannot be undone.")) return;
    
    try {
      const sessionRef = doc(db, 'academicSessions', selectedSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = [...sessionData.classes];
      
      const classIndex = updatedClasses.findIndex(c => c.name === className);
      if (classIndex !== -1) {
        const subjectIndex = updatedClasses[classIndex].subjects.findIndex(s => s.name === subjectName);
        if (subjectIndex !== -1) {
          updatedClasses[classIndex].subjects[subjectIndex].studyMaterials = 
             updatedClasses[classIndex].subjects[subjectIndex].studyMaterials.filter(m => m.id !== materialId);
             
          await updateDoc(sessionRef, { classes: updatedClasses });
          setStudyMaterials(prev => prev.filter(m => m.id !== materialId));
          // Note: Actual storage files are not deleted here to keep it simple, 
          // but you could add the Storage deletion logic here if needed.
        }
      }
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
    }
  };


  if (loading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="flex h-full flex-col items-center justify-center text-blue-600 gap-3">
          <Loader2 className="animate-spin h-10 w-10"/>
          <div className="text-center">
            <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">Loading Sessions...</p>
            <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য লোড হচ্ছে | डेटा लोड हो रहा है</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 font-sans pb-20">
        
        {/* --- HEADER & FILTERS --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner">
              <BookOpen size={28} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Teacher's Class Diary</h1>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">শিক্ষকের ক্লাস ডায়েরি | शिक्षक की क्लास डायरी</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Audit Teaching Logs & Materials (পর্যালোচনা | ऑडिट)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Session Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Academic Session</label>
              <select 
                value={selectedSessionId} 
                onChange={e => setSelectedSessionId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 text-gray-700 transition-all mt-1"
              >
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name || s.id} {s.isActive ? '(Active)' : ''}</option>)}
              </select>
            </div>

            {/* Teacher Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Select Teacher</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select 
                  value={selectedTeacherId} 
                  onChange={e => setSelectedTeacherId(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 text-gray-700 transition-all"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">From Date</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all text-gray-700"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">To Date</label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input 
                  type="date" 
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all text-gray-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- EMPTY / LOADING STATES --- */}
        {!selectedTeacherId ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col items-center justify-center py-24 text-gray-300">
                <Filter size={64} className="mb-4 opacity-10" />
                <div className="text-center">
                    <p className="font-black text-gray-400 uppercase text-sm tracking-widest">Select a teacher to view records</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase">তথ্য দেখতে একজন শিক্ষক নির্বাচন করুন | शिक्षक चुनें</p>
                </div>
            </div>
        ) : dataLoading ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col items-center justify-center py-24 text-blue-600 gap-2">
                <Loader2 className="animate-spin h-10 w-10" />
                <div className="text-center">
                    <p className="font-black text-sm tracking-widest uppercase">Compiling Records...</p>
                    <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">তথ্য সংকলন করা হচ্ছে | डेटा संकलित किया जा रहा है</p>
                </div>
            </div>
        ) : (diaryEntries.length === 0 && studyMaterials.length === 0) ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 flex flex-col items-center justify-center py-24 text-gray-400">
                <FileText className="h-16 w-16 mb-4 opacity-10" />
                <div className="text-center">
                    <p className="font-black text-sm tracking-widest uppercase">No records found for this period</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase">কোনো তথ্য পাওয়া যায়নি | कोई प्रविष्टि नहीं मिली</p>
                </div>
            </div>
        ) : (
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-end px-4 gap-2">
                    <div className="flex flex-col">
                        <p className="font-black text-gray-500 uppercase tracking-widest text-[10px] leading-none">
                            Showing results for (ফলাফল): <span className="text-blue-600">{teachers.find(t=>t.id === selectedTeacherId)?.name}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                            {diaryEntries.length} Diaries (ডায়েরি)
                        </span>
                        <span className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100">
                            {studyMaterials.length} Materials (সামগ্রী)
                        </span>
                    </div>
                </div>

                {/* --- SECTION 1: CLASS DIARIES --- */}
                {diaryEntries.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-black text-gray-700 px-4 uppercase tracking-widest border-b-2 border-blue-500 inline-block pb-1">1. Class Diaries</h3>
                    
                    {Object.keys(diariesGroupedByClass).sort().map(className => (
                        <div key={className} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group">
                            <div className="bg-gray-50 border-b border-gray-200 px-8 py-5 flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none uppercase">
                                    <Users className="text-blue-600" size={22} /> Class: {className}
                                </h2>
                                <span className="text-[10px] font-black text-gray-400 bg-white px-3 py-1 rounded-lg border border-gray-200 uppercase tracking-widest">
                                    {diariesGroupedByClass[className].length} Logs
                                </span>
                            </div>
                            
                            <div className="divide-y divide-gray-100">
                                {diariesGroupedByClass[className].map(entry => (
                                    <div key={entry.id} className="p-8 hover:bg-blue-50/20 transition-all flex flex-col md:flex-row gap-8">
                                        <div className="flex flex-row md:flex-col gap-4 md:gap-1 md:w-36 shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-800 leading-none">
                                                    {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                                                    {entry.day}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-start gap-1 mt-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-white border border-blue-100 px-2.5 py-1 rounded-md shadow-sm">
                                                    <Clock size={12} /> {entry.startTime}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-5">
                                            <div>
                                                <h4 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">{entry.subject}</h4>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                    <h5 className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                                        <BookOpen size={14} className="text-blue-400" /> Topic Covered
                                                    </h5>
                                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">{entry.topic}</p>
                                                </div>
                                                
                                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                                    <h5 className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">
                                                        <FileText size={14} /> Homework / Tasks
                                                    </h5>
                                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                                        {entry.homework || <span className="italic text-gray-400 font-medium">No tasks assigned</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            {entry.remarks && (
                                                <div className="flex items-start gap-3 pt-3 border-t border-gray-100">
                                                    <AlignLeft size={16} className="text-purple-400 mt-0.5 shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none">Teacher's Note</span>
                                                        <p className="text-sm text-gray-500 italic mt-2 font-medium">"{entry.remarks}"</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                  </div>
                )}


                {/* --- SECTION 2: STUDY MATERIALS --- */}
                {studyMaterials.length > 0 && (
                  <div className="space-y-6 pt-6 border-t border-gray-200 border-dashed">
                    <h3 className="text-lg font-black text-gray-700 px-4 uppercase tracking-widest border-b-2 border-purple-500 inline-block pb-1">2. Study Materials Uploaded</h3>
                    
                    {Object.keys(materialsGroupedByClass).sort().map(className => (
                        <div key={className} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden group">
                            <div className="bg-gray-50 border-b border-gray-200 px-8 py-5 flex items-center justify-between">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none uppercase">
                                    <UploadCloud className="text-purple-600" size={22} /> Class: {className}
                                </h2>
                                <span className="text-[10px] font-black text-gray-400 bg-white px-3 py-1 rounded-lg border border-gray-200 uppercase tracking-widest">
                                    {materialsGroupedByClass[className].length} Materials
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-white border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-5 pl-8">Subject & Topic</th>
                                    <th className="p-5">Attachments</th>
                                    <th className="p-5">Date Uploaded</th>
                                    <th className="p-5 pr-8 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {materialsGroupedByClass[className].map((mat) => (
                                      <tr key={mat.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                                        <td className="p-5 pl-8">
                                          <div className="font-black text-gray-800 text-sm mb-1">{mat.topic}</div>
                                          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{mat.subjectName}</div>
                                        </td>
                                        <td className="p-5">
                                            {mat.attachments?.length > 0 ? (
                                              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg inline-flex border border-gray-200">
                                                  {mat.attachments[0].type === 'document' ? <FileText size={14} className="text-red-500"/> : <ImageIcon size={14} className="text-blue-500"/>}
                                                  {mat.attachments.length} File(s)
                                              </div>
                                            ) : (
                                              <span className="text-xs text-gray-400 italic font-medium">No files</span>
                                            )}
                                        </td>
                                        <td className="p-5 text-sm font-bold text-gray-500">
                                          {new Date(mat.createdAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="p-5 pr-8 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setViewingMaterial(mat)} 
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" 
                                                title="View Material"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteMaterial(mat.id, mat.className, mat.subjectName)} 
                                                className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" 
                                                title="Delete Material"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                        </div>
                    ))}
                  </div>
                )}

            </div>
        )}

        {/* --- MATERIAL VIEWER MODAL --- */}
        {viewingMaterial && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-gray-200">
              
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">{viewingMaterial.topic}</h3>
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">{viewingMaterial.className} • {viewingMaterial.subjectName}</p>
                </div>
                <button onClick={() => setViewingMaterial(null)} className="p-2 bg-gray-200 hover:bg-rose-500 hover:text-white text-gray-600 rounded-full transition-all"><X size={20} /></button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 bg-gray-100 space-y-4">
                {viewingMaterial.description && (
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100">
                    <p className="text-sm font-medium text-gray-700 whitespace-pre-wrap">{viewingMaterial.description}</p>
                  </div>
                )}
                
                {viewingMaterial.attachments?.map((att, idx) => {
                    const isPDF = att.name.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                            {att.type === 'image' ? <ImageIcon size={16} className="text-blue-500"/> : <FileText size={16} className="text-red-500"/>}
                            {att.name}
                          </div>
                          <a href={att.url} target="_blank" rel="noreferrer" className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight hover:underline">Open Fullscreen</span>
                          </a>
                        </div>
                        <div className="w-full bg-gray-200 flex items-center justify-center min-h-[400px]">
                          {att.type === 'image' ? (
                            <img src={att.url} alt={att.name} className="max-w-full max-h-[70vh] object-contain" />
                          ) : isPDF ? (
                            <iframe src={att.url} className="w-full h-[70vh] border-none" title={att.name} />
                          ) : (
                            <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(att.url)}&embedded=true`} className="w-full h-[70vh] border-none" title={att.name} />
                          )}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminDashboardLayout>
  );
};

export default AdminTeacherClassDiary;