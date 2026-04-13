import React, { useState, useEffect } from 'react';
import { 
  Video, Plus, Calendar, Clock, Users, MonitorPlay, 
  Loader2, X, Trash2, ExternalLink, CalendarPlus, Presentation
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher'; 

const OnlineClass = () => {
  const { userData } = useTeacherUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '', topic: '', className: '', date: '', time: '', endTime: '', description: ''
  });

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const getSubjectsForSelectedDate = () => {
    if (!formData.className || !formData.date || !userData?.uid) return [];
    const targetClass = teacherClasses.find(c => c.name === formData.className);
    if (!targetClass || !targetClass.routine) return [];
    const dateObj = new Date(`${formData.date}T12:00:00`); 
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dateObj.getDay()];
    return [...new Set(targetClass.routine.filter(r => r.day === dayName && r.teacherId === userData.uid).map(r => r.subjectName))];
  };

  const loadSessionData = async () => {
    if (!userData?.uid) return;
    setLoading(true);
    try {
      const activeSessionQuery = query(collection(db, 'academicSessions'), where('isActive', '==', true));
      const querySnapshot = await getDocs(activeSessionQuery);

      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        setActiveSessionId(sessionDoc.id);
        const sessionData = sessionDoc.data();

        const myClasses = (sessionData.classes || []).filter(cls => 
          cls.classTeacherUid === userData.uid || (cls.subjects || []).some(s => s.teacherId === userData.uid)
        );
        setTeacherClasses(myClasses);
        if (myClasses.length > 0 && !formData.className) setFormData(prev => ({ ...prev, className: myClasses[0].name }));

        let allScheduled = [];
        (sessionData.classes || []).forEach(cls => {
          (cls.onlineClasses || []).forEach(oc => {
            if (oc.teacherId === userData.uid) allScheduled.push({ ...oc, className: cls.name }); 
          });
        });
        setScheduledClasses(allScheduled.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSessionData(); }, [userData]);

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!activeSessionId) return;
    if (!formData.subject || !formData.date || !formData.time || !formData.endTime) {
      return alert("Please fill in all required fields.");
    }
    if (formData.time >= formData.endTime) return alert("End Time must be later than Start Time.");

    setSubmitting(true);
    try {
      const safeClassName = formData.className.replace(/[^a-zA-Z0-9]/g, '');
      const safeSubject = formData.subject.replace(/[^a-zA-Z0-9]/g, '');
      const uniqueHash = Math.random().toString(36).substring(2, 10);
      const roomName = `VCM_${safeClassName}_${safeSubject}_${uniqueHash}`;

      const finalTitle = formData.topic ? `${formData.subject} - ${formData.topic}` : formData.subject;
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const updatedClasses = [...sessionSnap.data().classes];
      const classIndex = updatedClasses.findIndex(c => c.name === formData.className);
      
      const newOnlineClass = {
        id: "oc_" + Date.now(),
        teacherId: userData.uid,
        teacherName: userData.name,
        title: finalTitle,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime, 
        roomName: roomName, 
        description: formData.description,
        createdAt: new Date().toISOString()
      };

      if (!updatedClasses[classIndex].onlineClasses) updatedClasses[classIndex].onlineClasses = [];
      updatedClasses[classIndex].onlineClasses.push(newOnlineClass);
      await updateDoc(sessionRef, { classes: updatedClasses });

      setScheduledClasses(prev => [{...newOnlineClass, className: formData.className}, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)));
      alert("Smart Class Scheduled Successfully!");
      setShowForm(false);
      setFormData({ ...formData, subject: '', topic: '', description: '', time: '', endTime: '' });
    } catch (error) { 
      console.error(error); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm("Cancel and delete this scheduled class?")) return;
    try {
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const updatedClasses = [...sessionSnap.data().classes];
      const classIndex = updatedClasses.findIndex(c => c.name === className);
      if (classIndex !== -1) {
        updatedClasses[classIndex].onlineClasses = updatedClasses[classIndex].onlineClasses.filter(oc => oc.id !== classId);
        await updateDoc(sessionRef, { classes: updatedClasses });
        setScheduledClasses(prev => prev.filter(c => c.id !== classId));
      }
    } catch (error) { console.error(error); }
  };

  // --- NATIVE & EXTERNAL TAB LAUNCHER ---
  const openClassRoom = async (roomName) => {
    const teacherName = encodeURIComponent(userData?.name || "Teacher");
    const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${teacherName}"&config.prejoinPageEnabled=false`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await AppLauncher.openUrl({ url: jitsiUrl });
      } catch (error) {
        console.error("Failed to launch external app", error);
      }
    } else {
      // Safely opens in a new tab to avoid the 5-minute embed limit
      const link = document.createElement('a');
      link.href = jitsiUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingClasses = scheduledClasses.filter(c => c.date >= todayStr);
  const availableSubjects = getSubjectsForSelectedDate();

  return (
    <TeacherDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6 pb-20">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mt-10 -mr-10"></div>
          <div className="relative z-10 flex items-center gap-5">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
              <Presentation size={32} className="text-purple-200" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">Smart Classes</h1>
              <p className="text-purple-200 font-medium mt-2">Schedule and conduct interactive live sessions.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="relative z-10 bg-white text-purple-900 hover:bg-purple-50 px-8 py-3.5 rounded-2xl font-black shadow-lg transition-transform active:scale-95 flex items-center gap-2"
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? 'Cancel Scheduling' : 'Create Session'}
          </button>
        </div>

        {/* SCHEDULE FORM */}
        {showForm && (
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="mb-8 border-b pb-4">
                <h3 className="text-xl font-black text-gray-800">New Smart Class</h3>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase">Configure session details</p>
            </div>
            
            <form onSubmit={handleScheduleClass} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Select Class *</label>
                  <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value, subject: ''})}>
                    {teacherClasses.map((cls, i) => <option key={i} value={cls.name}>{cls.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Date *</label>
                  <input type="date" required min={todayStr} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, subject: ''})} />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Subject *</label>
                  <select required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}>
                    <option value="">{availableSubjects.length > 0 ? "-- Choose Subject --" : "No subjects found"}</option>
                    {availableSubjects.map((subjectName, i) => <option key={i} value={subjectName}>{subjectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Topic (Optional)</label>
                  <input type="text" placeholder="e.g. Chapter 3 Revision" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Start Time *</label>
                  <input type="time" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase mb-2 block">End Time *</label>
                  <input type="time" required className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-gray-700" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={submitting} className="bg-purple-600 text-white px-10 py-4 rounded-xl font-black hover:bg-purple-700 shadow-xl shadow-purple-200 disabled:opacity-50 transition-all flex items-center gap-3">
                  {submitting ? <Loader2 size={20} className="animate-spin"/> : <CalendarPlus size={20} />}
                  Schedule & Notify Students
                </button>
              </div>
            </form>
          </div>
        )}

        {/* UPCOMING CLASSES */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingClasses.map(cls => (
              <div key={cls.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-black bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-sm">
                    <Users size={14} className="text-purple-600"/> {cls.className}
                  </span>
                  <button onClick={() => handleDeleteClass(cls.id, cls.className)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-6 flex-1">
                  <h3 className="font-black text-gray-800 text-xl mb-4 leading-tight group-hover:text-purple-600 transition-colors">{cls.title}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Calendar size={16} className="text-purple-500"/></div>
                      <p className="text-sm font-bold text-gray-700">{new Date(cls.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="bg-white p-2 rounded-lg shadow-sm"><Clock size={16} className="text-purple-500"/></div>
                      <p className="text-sm font-bold text-gray-700">{formatTimeAMPM(cls.time)} — {formatTimeAMPM(cls.endTime)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-blue-700 leading-tight">
                      On Mobile: Native Jitsi app will open.<br/>
                      On Desktop: Class will open securely in a new tab.
                    </p>
                  </div>
                  <button 
                    onClick={() => openClassRoom(cls.roomName)} 
                    className="w-full py-4 bg-purple-950 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-purple-800 hover:-translate-y-1 transition-all active:scale-95"
                  >
                    <ExternalLink size={20} className="text-purple-300" /> Start Smart Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default OnlineClass;