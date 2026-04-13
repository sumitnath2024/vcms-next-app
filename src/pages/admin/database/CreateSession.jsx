import React, { useState, useEffect } from 'react';
import { 
  School, Plus, Edit2, Trash2, Calendar, ChevronDown, CheckCircle, 
  AlertCircle, Umbrella, Download, Upload 
} from 'lucide-react';
import { 
  collection, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, 
  query, where, getDocs, writeBatch, setDoc 
} from 'firebase/firestore';
import { db } from '../../../firebase'; 
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';

import SessionForm from '../../../components/SessionForm';
import ClassManager from '../../../components/ClassManager';
import HolidayManager from '../../../components/HolidayManager'; 

const CreateSession = () => {
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionFormData, setSessionFormData] = useState(null);
  
  // 1. Fetch Sessions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'academicSessions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      
      setSessions(data);
      
      if (data.length > 0 && !selectedSessionId) {
        const activeOne = data.find(s => s.isActive);
        setSelectedSessionId(activeOne ? activeOne.id : data[0].id);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedSessionId]); 

  // 2. Fetch Teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'Teacher'));
        const querySnapshot = await getDocs(q);
        setTeachers(querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email
        })));
      } catch (error) {
        console.error("Error fetching teachers:", error);
      }
    };
    fetchTeachers();
  }, []);

  const cloneClasses = (sourceClasses) => {
    if (!sourceClasses) return [];
    return sourceClasses.map(cls => ({
      ...cls,
      id: Math.random().toString(36).substr(2, 9),
      subjects: cls.subjects ? cls.subjects.map(sub => ({ ...sub, id: Math.random().toString(36).substr(2, 9) })) : [],
      fees: cls.fees ? cls.fees.map(fee => ({ ...fee, id: Math.random().toString(36).substr(2, 9) })) : [],
      routine: cls.routine ? cls.routine.map(r => ({ ...r, id: Math.random().toString(36).substr(2, 9) })) : [],
      exams: cls.exams ? cls.exams.map(exam => ({ ...exam, id: Math.random().toString(36).substr(2, 9) })) : [],
      books: cls.books ? cls.books.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) })) : [],
      copies: cls.copies ? cls.copies.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) })) : [],
      examSchedules: [] 
    }));
  };

  const handleSaveSession = async (formData, copyFromId) => {
    try {
      const batch = writeBatch(db);
      if (formData.isActive) {
        const activeQuery = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const activeDocs = await getDocs(activeQuery);
        activeDocs.forEach((d) => {
          if (d.id !== editingSessionId) {
            batch.update(doc(db, 'academicSessions', d.id), { isActive: false });
          }
        });
      }
      if (editingSessionId) {
        const sessionRef = doc(db, 'academicSessions', editingSessionId);
        batch.update(sessionRef, { ...formData, updatedAt: serverTimestamp() });
      } else {
        let classesToSave = [];
        let holidaysToSave = [];
        if (copyFromId) {
          const sourceSession = sessions.find(s => s.id === copyFromId);
          if (sourceSession) {
            if (sourceSession.classes) classesToSave = cloneClasses(sourceSession.classes);
            if (sourceSession.holidays) {
                holidaysToSave = sourceSession.holidays.map(h => ({ ...h, id: Math.random().toString(36).substr(2, 9) }));
            }
          }
        }
        const newDocRef = doc(collection(db, 'academicSessions'));
        batch.set(newDocRef, {
          ...formData,
          classes: classesToSave, 
          holidays: holidaysToSave,
          createdAt: serverTimestamp()
        });
        setSelectedSessionId(newDocRef.id);
      }
      await batch.commit();
      setShowSessionForm(false);
      setEditingSessionId(null);
      setSessionFormData(null);
    } catch (error) { console.error(error); }
  };

  const handleClassesUpdate = async (sessionId, updatedClasses) => {
    try { await updateDoc(doc(db, 'academicSessions', sessionId), { classes: updatedClasses }); } 
    catch (error) { console.error(error); }
  };

  const handleHolidaysUpdate = async (sessionId, updatedHolidays) => {
    try { await updateDoc(doc(db, 'academicSessions', sessionId), { holidays: updatedHolidays }); } 
    catch (error) { console.error(error); }
  };

  const activeSession = sessions.find(s => s.id === selectedSessionId);

  const handleExportJSON = () => {
    if (!activeSession) return;
    const dataStr = JSON.stringify(activeSession, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-backup-${activeSession.name || activeSession.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        delete importedData.id;
        importedData.isActive = false; 
        if (importedData.classes) importedData.classes = cloneClasses(importedData.classes);
        const newDocRef = doc(collection(db, 'academicSessions'));
        await setDoc(newDocRef, { ...importedData, createdAt: serverTimestamp() });
        setSelectedSessionId(newDocRef.id);
        alert("Import successful!");
        event.target.value = null; 
      } catch (error) { alert("Import failed."); }
    };
    reader.readAsText(file);
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
        
        <datalist id="teacherOptions">
          {teachers.map(t => <option key={t.id} value={t.name}>{t.email}</option>)}
        </datalist>

        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner">
                <School size={28} />
            </div>
            <div className="flex flex-col">
                <h1 className="text-2xl font-black text-gray-800 leading-none">
                Academic Sessions & Classes
                </h1>
                <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">সেশন এবং ক্লাস পরিচালনা | सत्र और कक्षा प्रबंधन</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Import Button */}
            <label className="flex flex-col items-center justify-center bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 cursor-pointer transition shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold leading-none"><Upload className="h-4 w-4" /> Import JSON</div>
              <span className="text-[7px] uppercase font-bold mt-1 opacity-60">ইমপোর্ট | आयात</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            {/* Export Button */}
            <button 
              onClick={handleExportJSON}
              disabled={!activeSession}
              className="flex flex-col items-center justify-center bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition shadow-sm"
            >
              <div className="flex items-center gap-2 text-xs font-bold leading-none"><Download className="h-4 w-4" /> Export JSON</div>
              <span className="text-[7px] uppercase font-bold mt-1 opacity-60">এক্সপোর্ট | निर्यात</span>
            </button>

            {/* New Session Button */}
            <button 
              onClick={() => { setSessionFormData(null); setEditingSessionId(null); setShowSessionForm(true); }}
              className="flex flex-col items-center justify-center bg-blue-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-md shadow-blue-100"
            >
              <div className="flex items-center gap-2 text-xs leading-none"><Plus className="h-4 w-4" /> New Session</div>
              <span className="text-[7px] uppercase font-bold mt-1 opacity-80">নতুন সেশন | नया सत्र</span>
            </button>
          </div>
        </div>

        {/* --- VIEW SELECTOR --- */}
        {!loading && sessions.length > 0 && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-xs font-black text-gray-400 uppercase leading-none">Current View</span>
                <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">বর্তমান দৃশ্য | वर्तमान दृश्य</span>
              </div>
              <select 
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full md:w-64 appearance-none bg-gray-50 border border-gray-200 py-3 px-4 rounded-xl focus:ring-4 focus:ring-blue-100 font-bold text-sm text-gray-700 outline-none transition-all"
              >
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {activeSession && (
              <div className="flex flex-wrap items-center gap-4">
                {activeSession.isActive ? (
                  <div className="flex flex-col items-center px-4 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                     <div className="flex items-center gap-1.5 text-[10px] font-black uppercase leading-none"><CheckCircle className="h-3 w-3" /> ACTIVE</div>
                     <span className="text-[7px] font-bold mt-1 uppercase">সক্রিয় | सक्रिय</span>
                  </div>
                ) : (
                   <div className="flex flex-col items-center px-4 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500">
                     <div className="flex items-center gap-1.5 text-[10px] font-black uppercase leading-none"><AlertCircle className="h-3 w-3" /> INACTIVE</div>
                     <span className="text-[7px] font-bold mt-1 uppercase">নিষ্ক্রিয় | निष्क्रिय</span>
                  </div>
                )}
                <div className="flex flex-col items-center bg-blue-50/50 px-4 py-1.5 rounded-xl border border-blue-100">
                   <div className="flex items-center gap-2 text-xs font-bold text-blue-700 leading-none">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{activeSession.startDate} — {activeSession.endDate}</span>
                   </div>
                   <span className="text-[7px] font-bold text-blue-400 mt-1 uppercase">সেশন সময়কাল | सत्र अवधि</span>
                </div>
                <button onClick={() => { setSessionFormData(activeSession); setEditingSessionId(activeSession.id); setShowSessionForm(true); }} className="p-2.5 bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition border shadow-sm">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {showSessionForm && (
          <SessionForm 
            initialData={sessionFormData}
            existingSessions={sessions}
            isEditing={!!editingSessionId}
            onSave={handleSaveSession}
            onCancel={() => setShowSessionForm(false)}
          />
        )}

        <div className="space-y-8 animate-in fade-in duration-500">
          {activeSession ? (
            <>
              <ClassManager 
                classes={activeSession.classes || []} 
                onUpdateClasses={(newClasses) => handleClassesUpdate(activeSession.id, newClasses)}
                teachers={teachers} 
              />
              <HolidayManager 
                holidays={activeSession.holidays || []}
                onUpdateHolidays={(newHolidays) => handleHolidaysUpdate(activeSession.id, newHolidays)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center animate-pulse">
                <School size={48} className="text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-400 leading-none">Select a Session to View Details</h3>
                <span className="text-[10px] font-bold text-gray-300 mt-2 uppercase">সেশন নির্বাচন করুন | सत्र चुनें</span>
            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default CreateSession;