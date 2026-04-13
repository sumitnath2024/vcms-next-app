import React, { useState, useEffect } from 'react';
import { 
  BookOpen, FileText, Image as ImageIcon, 
  Eye, X, Loader2, Library, Calendar
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useStudentUser } from '../../context/StudentUserContext';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';

const StudentStudyMaterial = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  
  const [studentClass, setStudentClass] = useState('');
  const [subjectsWithMaterials, setSubjectsWithMaterials] = useState([]);
  const [activeSubject, setActiveSubject] = useState('All');
  const [viewingMaterial, setViewingMaterial] = useState(null);

  useEffect(() => {
    const fetchStudentMaterials = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const sessionQuery = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const sessionSnap = await getDocs(sessionQuery);
        
        if (sessionSnap.empty) {
          setLoading(false);
          return;
        }

        const sessionData = sessionSnap.docs[0].data();
        let myClassName = '';
        let myClassData = null;

        for (const cls of sessionData.classes || []) {
          if (cls.students && cls.students.some(s => s.uid === user.uid || s.id === user.uid)) {
            myClassName = cls.name;
            myClassData = cls;
            break;
          }
        }

        if (!myClassName || !myClassData) {
          setLoading(false);
          return;
        }

        setStudentClass(myClassName);

        let allMaterialsBySubject = [];
        (myClassData.subjects || []).forEach(sub => {
          if (sub.studyMaterials && sub.studyMaterials.length > 0) {
            allMaterialsBySubject.push({
              subjectName: sub.name,
              materials: sub.studyMaterials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            });
          }
        });

        setSubjectsWithMaterials(allMaterialsBySubject);

      } catch (error) {
        console.error("Error fetching study materials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentMaterials();
  }, [user]);

  const allMaterials = subjectsWithMaterials.reduce((acc, curr) => {
    const matsWithSubj = curr.materials.map(m => ({ ...m, subjectName: curr.subjectName }));
    return [...acc, ...matsWithSubj];
  }, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const displayMaterials = activeSubject === 'All' 
    ? allMaterials 
    : subjectsWithMaterials.find(s => s.subjectName === activeSubject)?.materials.map(m => ({ ...m, subjectName: activeSubject })) || [];

  return (
    <StudentDashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 pb-20 font-sans">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none text-emerald-950">
            <BookOpen size={150} />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600 shadow-inner">
              <Library size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight leading-none">Study Lounge</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">পাঠশালা / अध्ययन कक्ष</p>
              <p className="text-xs font-bold text-emerald-600 mt-2">
                {studentClass ? `Reading materials for ${studentClass}` : 'Your digital library'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[2rem] border border-gray-200 shadow-sm">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-500 font-black tracking-widest text-sm uppercase">LOADING LIBRARY...</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">লাইব্রেরি লোড হচ্ছে... / लाइब्रेरी लोड हो रही है...</p>
          </div>
        ) : subjectsWithMaterials.length === 0 ? (
          <div className="bg-white rounded-[2rem] border border-dashed border-gray-300 p-12 text-center shadow-sm">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <BookOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-800 mb-1">No Materials Yet</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">এখনও কোনো তথ্য নেই / अभी कोई सामग्री नहीं है</p>
            <p className="text-gray-500 text-sm font-medium max-w-sm mx-auto">Your teachers haven't uploaded any study materials for your class yet.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* SUBJECT FILTER SIDEBAR */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              <div className="px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Filter by Subject</h3>
                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">বিষয় দ্বারা ফিল্টার করুন / विषय अनुसार फिल्टर</p>
              </div>
              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                <button 
                  onClick={() => setActiveSubject('All')}
                  className={`whitespace-nowrap flex items-center justify-between px-4 py-3 rounded-xl font-black transition-all duration-300 ${
                    activeSubject === 'All' 
                      ? 'bg-emerald-600 text-white shadow-lg lg:translate-x-2' 
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm">All Subjects</span>
                    <span className="text-[8px] font-bold opacity-70 uppercase">সব বিষয় / सभी विषय</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ml-3 ${activeSubject === 'All' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {allMaterials.length}
                  </span>
                </button>
                
                {subjectsWithMaterials.map((sub, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveSubject(sub.subjectName)}
                    className={`whitespace-nowrap flex items-center justify-between px-4 py-3 rounded-xl font-black transition-all duration-300 ${
                      activeSubject === sub.subjectName 
                        ? 'bg-emerald-600 text-white shadow-lg lg:translate-x-2' 
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm truncate w-full">{sub.subjectName}</span>
                      <span className="text-[8px] font-bold opacity-70 uppercase">বিষয় / विषय</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ml-3 ${activeSubject === sub.subjectName ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {sub.materials.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* MATERIALS GRID */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {displayMaterials.map((mat, idx) => {
                  const hasAttachments = mat.attachments && mat.attachments.length > 0;
                  
                  return (
                    <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group border-b-4 border-b-emerald-500">
                      
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md uppercase tracking-widest border border-emerald-100 w-fit">
                              {mat.subjectName}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                            <Calendar size={12}/> {new Date(mat.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        
                        <h3 className="font-black text-gray-800 text-lg leading-tight mb-2 group-hover:text-emerald-700 transition-colors">{mat.topic}</h3>
                        
                        {mat.description && (
                          <p className="text-[13px] font-medium text-gray-500 line-clamp-3 flex-1 mb-4 leading-relaxed italic">
                            {mat.description}
                          </p>
                        )}

                        {hasAttachments && (
                          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                {mat.attachments.slice(0, 3).map((att, i) => (
                                    <div key={i} className="h-8 w-8 rounded-xl bg-white border-2 border-gray-50 flex items-center justify-center shadow-sm">
                                    {att.type === 'document' ? <FileText size={14} className="text-red-500"/> : <ImageIcon size={14} className="text-blue-500"/>}
                                    </div>
                                ))}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-700 leading-none">
                                        {mat.attachments.length} file{mat.attachments.length > 1 ? 's' : ''}
                                    </span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase">সংযুক্ত ফাইল / फाइलें</span>
                                </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                        <button 
                          onClick={() => setViewingMaterial(mat)}
                          className="w-full py-3 bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-600 text-gray-700 hover:text-white rounded-2xl font-black flex flex-col items-center justify-center gap-0 transition-all shadow-sm group/btn"
                        >
                          <div className="flex items-center gap-2">
                            <Eye size={18} /> 
                            <span className="text-sm">Open Reader</span>
                          </div>
                          <span className="text-[8px] font-bold opacity-70 uppercase mt-0.5">রিডার খুলুন / रीडर खोलें</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- READER MODAL --- */}
        {viewingMaterial && (
          <div className="fixed inset-0 z-[100] bg-emerald-950/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:w-[96vw] md:h-[96vh] md:rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative">
              
              <div className="p-5 md:px-8 md:py-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex bg-emerald-100 p-3 rounded-2xl text-emerald-600 shadow-inner">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-gray-800 leading-none">{viewingMaterial.topic}</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {viewingMaterial.subjectName}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 px-2 border-l border-gray-200">
                            By {viewingMaterial.teacherName}
                        </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingMaterial(null)} 
                  className="p-3 bg-gray-100 hover:bg-red-500 text-gray-500 hover:text-white rounded-2xl transition-all shadow-sm flex flex-col items-center"
                >
                  <X size={20} strokeWidth={3} />
                  <span className="text-[7px] font-black uppercase mt-0.5">Close</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-10">
                <div className="max-w-5xl mx-auto space-y-8">
                  
                  {viewingMaterial.description && (
                    <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="relative z-10">
                        <div className="flex flex-col mb-4">
                            <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">Teacher's Note</h4>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">শিক্ষকের নোট / शिक्षक का नोट</p>
                        </div>
                        <p className="text-base md:text-xl font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {viewingMaterial.description}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {viewingMaterial.attachments?.length > 0 && (
                    <div className="space-y-8">
                      {viewingMaterial.attachments.map((att, idx) => {
                        const isPDF = att.name.toLowerCase().endsWith('.pdf');
                        const isImage = att.type === 'image';
                        
                        return (
                          <div key={idx} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col">
                            
                            <div className="bg-gray-900 px-6 py-4 text-sm font-bold text-white flex justify-between items-center">
                              <div className="flex items-center gap-3 truncate">
                                {isImage ? <ImageIcon size={20} className="text-blue-400 shrink-0"/> : <FileText size={20} className="text-red-400 shrink-0"/>}
                                <span className="truncate tracking-wide">{att.name}</span>
                              </div>
                              <a 
                                href={att.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] font-black bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all border border-white/10 uppercase tracking-widest flex flex-col items-center"
                              >
                                <span>Fullscreen</span>
                                <span className="text-[7px] opacity-70">পূর্ণ পর্দা / पूर्ण स्क्रीन</span>
                              </a>
                            </div>
                            
                            <div className="w-full bg-[#f1f3f4] flex items-center justify-center relative min-h-[50vh] md:min-h-[80vh]">
                              {isImage ? (
                                <img src={att.url} alt={att.name} className="w-full h-full object-contain" />
                              ) : (
                                <iframe src={isPDF ? att.url : `https://docs.google.com/gview?url=${encodeURIComponent(att.url)}&embedded=true`} className="w-full h-[60vh] md:h-[80vh] border-none" title={att.name} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </StudentDashboardLayout>
  );
};

export default StudentStudyMaterial;