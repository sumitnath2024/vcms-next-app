import React, { useState, useEffect } from 'react';
import { 
  Upload, Camera, FileText, Image as ImageIcon, 
  Trash2, Edit, Eye, PlusCircle, List, X, UploadCloud, CheckCircle, Loader2
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const StudyMaterial = () => {
  const { userData } = useTeacherUser();
  const [activeTab, setActiveTab] = useState('manage'); 
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionName, setActiveSessionName] = useState('Default_Session');
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  // Modal State for In-Browser Viewing
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    className: '',
    subjectName: '',
    topic: '',
    description: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  // --- NATIVE IMAGE COMPRESSION UTILITY ---
  const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, file.type, quality);
        };
      };
    });
  };

  const loadData = async () => {
    if (!userData?.uid) return;
    setLoading(true);
    try {
      const sessionQuery = query(collection(db, 'academicSessions'), where('isActive', '==', true));
      const sessionSnap = await getDocs(sessionQuery);
      if (!sessionSnap.empty) {
        const sessionDoc = sessionSnap.docs[0];
        const sessionData = sessionDoc.data();
        setActiveSessionId(sessionDoc.id);
        setActiveSessionName(sessionData.sessionName || sessionData.name || sessionDoc.id); 
        
        // UPDATED LOGIC: Include if they are Class Teacher OR Subject Teacher
        const myClasses = (sessionData.classes || []).filter(cls => {
          const isClassTeacher = cls.classTeacherUid === userData.uid;
          const teachesSubjectInClass = (cls.subjects || []).some(
              subject => subject.teacherId === userData.uid
          );
          return isClassTeacher || teachesSubjectInClass;
        });

        setTeacherClasses(myClasses);

        let extractedMaterials = [];
        myClasses.forEach(cls => {
          (cls.subjects || []).forEach(sub => {
            if (sub.studyMaterials && Array.isArray(sub.studyMaterials)) {
              sub.studyMaterials.forEach(mat => {
                if (mat.teacherId === userData.uid) {
                  extractedMaterials.push({ ...mat, className: cls.name, subjectName: sub.name });
                }
              });
            }
          });
        });
        extractedMaterials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMaterials(extractedMaterials);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [userData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value, ...(name === 'className' && { subjectName: '' }) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeSessionId || !formData.className || !formData.subjectName || !formData.topic) {
      alert("Missing required fields.");
      return;
    }
    setUploading(true);
    try {
      const uploadedFilesUrls = [];
      for (const file of selectedFiles) {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) fileToUpload = await compressImage(file);
        const storagePath = `study_materials/${activeSessionName}/${formData.className}/${formData.subjectName}/${Date.now()}_${fileToUpload.name}`;
        const fileRef = ref(storage, storagePath);
        const metadata = { contentType: fileToUpload.type, contentDisposition: `inline; filename="${fileToUpload.name}"` };
        const uploadTask = await uploadBytesResumable(fileRef, fileToUpload, metadata);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        uploadedFilesUrls.push({ name: fileToUpload.name, url: downloadUrl, type: fileToUpload.type.startsWith('image/') ? 'image' : 'document' });
      }
      const newMaterial = {
        id: "mat_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
        teacherId: userData.uid,
        teacherName: userData.name,
        topic: formData.topic,
        description: formData.description,
        attachments: uploadedFilesUrls,
        createdAt: new Date().toISOString(),
      };
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = [...sessionData.classes];
      const classIndex = updatedClasses.findIndex(c => c.name === formData.className);
      const subjectIndex = updatedClasses[classIndex].subjects.findIndex(s => s.name === formData.subjectName);
      if (!updatedClasses[classIndex].subjects[subjectIndex].studyMaterials) updatedClasses[classIndex].subjects[subjectIndex].studyMaterials = [];
      updatedClasses[classIndex].subjects[subjectIndex].studyMaterials.push(newMaterial);
      await updateDoc(sessionRef, { classes: updatedClasses });
      setMaterials([{ ...newMaterial, className: formData.className, subjectName: formData.subjectName }, ...materials]);
      setFormData({ className: '', subjectName: '', topic: '', description: '' });
      setSelectedFiles([]);
      setActiveTab('manage');
    } catch (error) { console.error(error); } finally { setUploading(false); }
  };

  const handleDelete = async (materialId, className, subjectName) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = [...sessionData.classes];
      const classIndex = updatedClasses.findIndex(c => c.name === className);
      if (classIndex !== -1) {
        const subjectIndex = updatedClasses[classIndex].subjects.findIndex(s => s.name === subjectName);
        if (subjectIndex !== -1) {
          const matToDelete = updatedClasses[classIndex].subjects[subjectIndex].studyMaterials.find(m => m.id === materialId);
          updatedClasses[classIndex].subjects[subjectIndex].studyMaterials = updatedClasses[classIndex].subjects[subjectIndex].studyMaterials.filter(m => m.id !== materialId);
          await updateDoc(sessionRef, { classes: updatedClasses });
          setMaterials(prev => prev.filter(m => m.id !== materialId));
          if (matToDelete?.attachments) {
            for (const att of matToDelete.attachments) {
              try { await deleteObject(ref(storage, att.url)); } catch (e) { console.error(e); }
            }
          }
        }
      }
    } catch (error) { console.error(error); }
  };

  // UPDATED: Only show subjects the teacher is actually assigned to (or all if they are the class teacher)
  const targetClass = teacherClasses.find(c => c.name === formData.className);
  const availableSubjects = targetClass?.subjects?.filter(sub => targetClass.classTeacherUid === userData.uid || sub.teacherId === userData.uid) || [];

  return (
    <TeacherDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6 pb-20">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600 shadow-inner">
              <UploadCloud size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-none">Study Materials</h1>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">পঠন সামগ্রী | अध्ययन सामग्री</p>
              <p className="text-xs text-gray-500 font-medium mt-1">Share notes and docs | নোট এবং নথি শেয়ার করুন</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
            <button onClick={() => setActiveTab('upload')} className={`flex-1 md:flex-none flex flex-col items-center justify-center px-5 py-2 rounded-md transition-all ${activeTab === 'upload' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2 text-sm font-bold"><PlusCircle size={16} /> Upload New</div>
              <span className="text-[8px] uppercase font-bold opacity-70">নতুন আপলোড | नया अपलोड</span>
            </button>
            <button onClick={() => setActiveTab('manage')} className={`flex-1 md:flex-none flex flex-col items-center justify-center px-5 py-2 rounded-md transition-all ${activeTab === 'manage' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2 text-sm font-bold"><List size={16} /> Manage Posts</div>
              <span className="text-[8px] uppercase font-bold opacity-70">পরিচালনা | प्रबंधित करें</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin mb-4" />
            <div className="text-center">
                <p className="text-gray-500 font-bold tracking-wide">LOADING DATA...</p>
                <p className="text-[10px] text-purple-400 font-bold">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
            </div>
          </div>
        ) : (
          <>
            {/* UPLOAD TAB */}
            {activeTab === 'upload' && (
              <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-6 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800 leading-none">Create New Post</h3>
                    <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">নতুন পোস্ট তৈরি করুন | नई पोस्ट बनाएं</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Class | ক্লাস *</label>
                      <select required name="className" value={formData.className} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500">
                        <option value="">-- Choose Class --</option>
                        {teacherClasses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Subject | বিষয় *</label>
                      <select required name="subjectName" value={formData.subjectName} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500" disabled={!formData.className}>
                        <option value="">-- Choose Subject --</option>
                        {availableSubjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Topic Title | শিরোনাম *</label>
                      <input required type="text" name="topic" value={formData.topic} onChange={handleInputChange} placeholder="e.g. Chapter 1 Notes" className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-semibold" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Details | বিস্তারিত (Optional)</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" placeholder="Write instructions..." className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 resize-none font-medium"></textarea>
                    </div>

                    <div className="md:col-span-2 border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
                      <div className="text-center mb-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Attachments | সংযুক্তি</label>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">PDF, DOC, or Images</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-center gap-4">
                        <label className="cursor-pointer flex flex-col items-center justify-center h-24 w-32 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-500 hover:text-purple-600 transition-all group">
                          <Upload size={24} className="mb-2 text-gray-400 group-hover:text-purple-600" />
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Browse Files</span>
                          <span className="text-[8px] font-medium opacity-60">ফাইল খুঁজুন | फाइलें</span>
                          <input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])} className="hidden" />
                        </label>

                        <label className="cursor-pointer flex flex-col items-center justify-center h-24 w-32 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-500 hover:text-purple-600 transition-all md:hidden">
                          <Camera size={24} className="mb-2 text-gray-400" />
                          <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500">Take Photo</span>
                          <span className="text-[8px] font-medium opacity-60">ছবি তুলুন | फोटो लें</span>
                          <input type="file" accept="image/*" capture="environment" onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])} className="hidden" />
                        </label>
                      </div>

                      {selectedFiles.length > 0 && (
                        <div className="mt-5 space-y-2 max-w-2xl mx-auto">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Selected Files | নির্বাচিত ফাইল:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {selectedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-2.5 border rounded-lg shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  {file.type.includes('image') ? <ImageIcon size={18} className="text-blue-500"/> : <FileText size={18} className="text-red-500"/>}
                                  <span className="text-sm font-bold text-gray-700 truncate">{file.name}</span>
                                </div>
                                <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"><X size={16} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t">
                    <button type="submit" disabled={uploading} className="flex flex-col items-center justify-center bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50">
                      <div className="flex items-center gap-2">
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        <span>{uploading ? 'Processing...' : 'Publish Material'}</span>
                      </div>
                      <span className="text-[9px] font-medium opacity-80 mt-1 uppercase">প্রকাশ করুন | सामग्री प्रकाशित करें</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* MANAGE TAB */}
            {activeTab === 'manage' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                 <div className="mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800 leading-none">Manage Uploads</h3>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">আপলোড করা সামগ্রী পরিচালনা করুন | अपलोड प्रबंधित करें</p>
                 </div>
                 
                 <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="p-4">Topic | বিষয়</th>
                        <th className="p-4">Class & Subject | শ্রেণী ও বিষয়</th>
                        <th className="p-4">Date | তারিখ</th>
                        <th className="p-4 text-center">Actions | ব্যবস্থা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.length === 0 ? (
                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-bold">No materials found.</td></tr>
                      ) : (
                        materials.map((mat) => (
                          <tr key={mat.id} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-gray-800 text-sm">{mat.topic}</div>
                              {mat.attachments?.length > 0 && (
                                <div className="text-[9px] font-bold text-purple-500 flex items-center gap-1.5 mt-1">
                                  {mat.attachments[0].type === 'document' ? <FileText size={12}/> : <ImageIcon size={12}/>} 
                                  {mat.attachments.length} Attachment(s)
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-bold text-gray-800 leading-none">{mat.className}</div>
                              <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{mat.subjectName}</div>
                            </td>
                            <td className="p-4 text-xs font-bold text-gray-500">
                              {new Date(mat.createdAt).toLocaleDateString('en-GB')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setViewingMaterial(mat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View"><Eye size={18} /></button>
                                <button onClick={() => handleDelete(mat.id, mat.className, mat.subjectName)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={18} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- SMART MATERIAL VIEWER MODAL --- */}
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
                            <span className="text-[8px] font-bold text-blue-400">ফুলস্ক্রিনে দেখুন | फुलस्क्रीन</span>
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
    </TeacherDashboardLayout>
  );
};

export default StudyMaterial;