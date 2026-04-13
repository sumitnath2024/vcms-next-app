import React, { useState, useEffect } from 'react';
import { 
  Video, Plus, Calendar, Clock, 
  Users, MonitorPlay, Loader2, X, Trash2, ExternalLink, VideoIcon, CalendarPlus
} from 'lucide-react';
import { 
  collection, getDocs, query, where, 
  doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { db, functions } from '../../firebase'; 
import { useTeacherUser } from '../../context/TeacherUserContext';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { useGoogleLogin } from '@react-oauth/google';

// --- CAPACITOR IMPORTS ---
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

const OnlineClass = () => {
  const { userData } = useTeacherUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false); 
  
  // Data States
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    className: '',
    date: '',
    time: '',
    endTime: '', 
    meetingLink: '',
    description: ''
  });

  const formatTimeAMPM = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getSubjectsForSelectedDate = () => {
    if (!formData.className || !formData.date || !userData?.uid) return [];

    const targetClass = teacherClasses.find(c => c.name === formData.className);
    if (!targetClass || !targetClass.routine) return [];

    const dateObj = new Date(`${formData.date}T12:00:00`); 
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = daysOfWeek[dateObj.getDay()];

    const subjectsForDay = targetClass.routine
      .filter(r => r.day === dayName && r.teacherId === userData.uid)
      .map(r => r.subjectName);

    return [...new Set(subjectsForDay)];
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

        const myClasses = (sessionData.classes || []).filter(cls => {
          const isClassTeacher = cls.classTeacherUid === userData.uid;
          const teachesSubjectInClass = (cls.subjects || []).some(
              subject => subject.teacherId === userData.uid
          );
          return isClassTeacher || teachesSubjectInClass;
        });

        setTeacherClasses(myClasses);
        
        if (myClasses.length > 0 && !formData.className) {
          setFormData(prev => ({ ...prev, className: myClasses[0].name }));
        }

        let allScheduled = [];
        (sessionData.classes || []).forEach(cls => {
          if (cls.onlineClasses && Array.isArray(cls.onlineClasses)) {
            cls.onlineClasses.forEach(oc => {
              if (oc.teacherId === userData.uid) {
                allScheduled.push({ ...oc, className: cls.name }); 
              }
            });
          }
        });
        
        allScheduled.sort((a, b) => new Date(b.date) - new Date(a.date));
        setScheduledClasses(allScheduled);
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [userData]);

  // --- CAPACITOR GOOGLE INIT ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleSignIn.initialize({
        clientId: '728229728360-k39immofroc1f5thuu1n7292s2ucrsc0.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.events'],
      }).catch(console.error);
    }
  }, []);

  const checkForOverlap = async () => {
    if (!activeSessionId) return false;
    try {
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) return false;
      const sessionData = sessionSnap.data();
      const targetClass = sessionData.classes.find(c => c.name === formData.className);
      if (!targetClass || !targetClass.onlineClasses) return false;

      const newStart = new Date(`${formData.date}T${formData.time}`);
      const newEnd = new Date(`${formData.date}T${formData.endTime}`);

      for (let oc of targetClass.onlineClasses) {
        if (oc.date === formData.date) {
          const existingStart = new Date(`${oc.date}T${oc.time}`);
          const existingEnd = oc.endTime 
            ? new Date(`${oc.date}T${oc.endTime}`) 
            : new Date(existingStart.getTime() + 60 * 60 * 1000); 

          if (newStart < existingEnd && newEnd > existingStart) {
            return oc; 
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking overlap:", error);
      return false;
    }
  };

  const handleInstantGoogleMeet = () => {
    window.open('https://meet.google.com/new', '_blank');
  };

  const handleGoogleCalendarSchedule = async () => {
    const { subject, topic, className, date, time, endTime, description } = formData;
    if(!subject || !date || !time || !endTime) {
      alert("Please fill in Subject, Date, Start Time, and End Time first.");
      return;
    }
    if (time >= endTime) {
      alert("End Time must be later than Start Time.");
      return;
    }

    setGeneratingLink(true);
    const overlappingClass = await checkForOverlap();
    setGeneratingLink(false);

    if (overlappingClass) {
      alert(`⚠️ TIME CONFLICT!\n\nAnother class scheduled for ${className}:\nTeacher: ${overlappingClass.teacherName}`);
      return;
    }
    
    const finalTitle = topic ? `${subject} - ${topic}` : subject;
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(`${date}T${endTime}`); 
    const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const start = formatGCalDate(startDateTime);
    const end = formatGCalDate(endDateTime);
    const eventTitle = encodeURIComponent(`${className} - ${finalTitle}`);
    const eventDetails = encodeURIComponent(description || `Online class for ${className}`);

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}&details=${eventDetails}`;
    window.open(url, '_blank');
  };

  const createMeetLinkWithToken = async (accessToken) => {
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`); 
      const finalTitle = formData.topic ? `${formData.subject} - ${formData.topic}` : formData.subject;

      const event = {
        summary: `${formData.className} - ${finalTitle}`,
        description: formData.description || 'Online live class.',
        start: { dateTime: startDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        conferenceData: { createRequest: { requestId: Math.random().toString(36).substring(7), conferenceSolutionKey: { type: "hangoutsMeet" } } }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      const data = await res.json();
      if (data.hangoutLink) {
        setFormData(prev => ({ ...prev, meetingLink: data.hangoutLink }));
        alert("Google Meet Link generated!");
      } else {
        console.error("Calendar API Error:", data);
        alert("Failed to generate link. Did you enable the Calendar API in Google Cloud?");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred generating the Meet link.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleWebGoogleMeet = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      await createMeetLinkWithToken(tokenResponse.access_token);
    },
    onError: (error) => {
      console.error(error);
      setGeneratingLink(false);
      alert("Web Google Sign-In failed.");
    }
  });

  const triggerGoogleLogin = async () => {
    if (!formData.subject || !formData.date || !formData.time || !formData.endTime) {
      alert("Fill out Subject, Date, and Times first!");
      return;
    }
    if (formData.time >= formData.endTime) {
      alert("End Time must be later than Start Time.");
      return;
    }
    
    setGeneratingLink(true);
    const overlappingClass = await checkForOverlap();
    if (overlappingClass) {
      setGeneratingLink(false);
      alert(`⚠️ TIME CONFLICT!\n\nAnother class scheduled for ${formData.className}:\nTeacher: ${overlappingClass.teacherName}`);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await GoogleSignIn.signIn();
        if (result.accessToken) {
          await createMeetLinkWithToken(result.accessToken);
        } else {
          throw new Error("No access token returned from native Google Sign-In.");
        }
      } catch (err) {
        console.error("Native Google Login Error:", err);
        alert("Native Google Sign-In failed.");
        setGeneratingLink(false);
      }
    } else {
      handleWebGoogleMeet();
    }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!activeSessionId) return;
    if (!formData.subject || !formData.date || !formData.time || !formData.endTime || !formData.meetingLink) {
      alert("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const overlappingClass = await checkForOverlap();
      if (overlappingClass) {
        setSubmitting(false);
        alert(`⚠️ TIME CONFLICT!`);
        return;
      }

      let formattedLink = formData.meetingLink;
      if (!/^https?:\/\//i.test(formattedLink)) formattedLink = 'https://' + formattedLink;
      const finalTitle = formData.topic ? `${formData.subject} - ${formData.topic}` : formData.subject;

      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = [...sessionData.classes];
      const classIndex = updatedClasses.findIndex(c => c.name === formData.className);
      
      const newOnlineClass = {
        id: "oc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
        teacherId: userData.uid,
        teacherName: userData.name,
        title: finalTitle,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime, 
        meetingLink: formattedLink,
        description: formData.description,
        createdAt: new Date().toISOString()
      };

      if (!updatedClasses[classIndex].onlineClasses) updatedClasses[classIndex].onlineClasses = [];
      updatedClasses[classIndex].onlineClasses.push(newOnlineClass);

      await updateDoc(sessionRef, { classes: updatedClasses });

      try {
        const targetClass = updatedClasses[classIndex];
        if (targetClass && targetClass.students) {
          const studentUids = targetClass.students.map(s => s.uid || s.id).filter(Boolean);
          if (studentUids.length > 0) {
            const sendBulkPushNotification = httpsCallable(functions, 'sendBulkPushNotification');
            const formattedDate = new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            const formattedTime = formatTimeAMPM(formData.time);

            await sendBulkPushNotification({
              targetUids: studentUids,
              title: `Live Class Scheduled - ${formData.className}`,
              body: `Your teacher, ${userData.name}, has scheduled a live session for ${formData.subject} on ${formattedDate} at ${formattedTime}.`
            });
          }
        }
      } catch (notifError) { console.error(notifError); }

      setScheduledClasses(prev => [{...newOnlineClass, className: formData.className}, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)));
      alert("Class Scheduled Successfully!");
      setShowForm(false);
      setFormData({ ...formData, subject: '', topic: '', meetingLink: '', description: '', time: '', endTime: '' });
    } catch (error) { console.error(error); } finally { setSubmitting(false); }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm("Cancel and delete this scheduled class?")) return;
    try {
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = [...sessionData.classes];
      const classIndex = updatedClasses.findIndex(c => c.name === className);
      if (classIndex !== -1 && updatedClasses[classIndex].onlineClasses) {
        updatedClasses[classIndex].onlineClasses = updatedClasses[classIndex].onlineClasses.filter(oc => oc.id !== classId);
        await updateDoc(sessionRef, { classes: updatedClasses });
        setScheduledClasses(prev => prev.filter(c => c.id !== classId));
      }
    } catch (error) { console.error(error); }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingClasses = scheduledClasses.filter(c => c.date >= todayStr).sort((a,b) => new Date(a.date) - new Date(b.date));
  const pastClasses = scheduledClasses.filter(c => c.date < todayStr);

  const availableSubjects = getSubjectsForSelectedDate();

  return (
    <TeacherDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6 pb-20">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600 shadow-inner">
              <Video size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-none">Online Classes</h1>
              <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">অনলাইন ক্লাস | ऑनलाइन क्लास</p>
              <p className="text-xs text-gray-500 font-medium mt-1">Schedule live video sessions | লাইভ সেশন নির্ধারণ করুন</p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`flex flex-col items-center justify-center px-6 py-2 rounded-lg font-bold shadow-md transition-all ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
          >
            <div className="flex items-center gap-2 leading-none">
              {showForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showForm ? 'Cancel' : 'Schedule New Class'}</span>
            </div>
            <span className="text-[8px] uppercase mt-1 opacity-80">{showForm ? 'বাতিল | रद्द करें' : 'নতুন ক্লাস | नई कक्षा'}</span>
          </button>
        </div>

        {/* SCHEDULE FORM */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 border-b pb-2">
                <h3 className="text-lg font-bold text-gray-800 leading-none">Schedule a Live Session</h3>
                <p className="text-[10px] font-bold text-purple-600 mt-1 uppercase">লাইভ সেশন নির্ধারণ করুন | लाइव सत्र निर्धारित करें</p>
            </div>
            
            <form onSubmit={handleScheduleClass} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Class | ক্লাস নির্বাচন করুন *</label>
                  <select required className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value, subject: ''})}>
                    {teacherClasses.map((cls, i) => <option key={i} value={cls.name}>{cls.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date | তারিখ *</label>
                  <input type="date" required min={todayStr} className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, subject: ''})} />
                </div>

                {/* UPDATED SUBJECT SELECT BOX */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Subject | বিষয় *</label>
                  <select 
                    required 
                    className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" 
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                  >
                    <option value="">{availableSubjects.length > 0 ? "-- Choose Subject --" : "No subjects in routine"}</option>
                    {availableSubjects.map((subjectName, i) => (
                      <option key={i} value={subjectName}>{subjectName}</option>
                    ))}
                  </select>
                  {formData.date && availableSubjects.length === 0 && (
                    <p className="text-[10px] text-orange-500 mt-1 leading-tight font-bold">⚠️ No subjects found in your routine for this date.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Topic | আলোচনার বিষয় (Optional)</label>
                  <input type="text" placeholder="e.g. Chapter 3 Revision" className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">From Time | শুরু *</label>
                  <input type="time" required className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">To Time | শেষ *</label>
                  <input type="time" required className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 font-medium" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
                
                <div className="md:col-span-2 lg:col-span-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-600 uppercase leading-none">Meeting Link | মিটিং লিঙ্ক *</label>
                        <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase">লিঙ্ক জেনারেট করুন | लिंक जेनरेट करें</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={handleGoogleCalendarSchedule} disabled={generatingLink} className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                        <CalendarPlus size={14} /> G-Calendar
                      </button>
                      <button type="button" onClick={triggerGoogleLogin} disabled={generatingLink} className="text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50">
                        {generatingLink ? <Loader2 size={14} className="animate-spin"/> : <VideoIcon size={14} />}
                        {generatingLink ? 'Checking Overlaps...' : 'Auto-Generate Meet'}
                      </button>
                    </div>
                  </div>
                  <input type="text" required placeholder="Link will appear here | লিঙ্ক এখানে আসবে..." className="w-full p-2.5 bg-white border rounded-lg outline-none focus:border-blue-500 font-medium text-blue-700" value={formData.meetingLink} onChange={e => setFormData({...formData, meetingLink: e.target.value})} />
                  <div className="text-right mt-1">
                    <button type="button" onClick={handleInstantGoogleMeet} className="text-[10px] text-blue-500 hover:underline">Or open meet.google.com/new | নতুন মিটিং</button>
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Instructions | নির্দেশাবলী (Optional)</label>
                  <textarea rows="2" placeholder="Any specific instructions..." className="w-full p-2.5 bg-gray-50 border rounded-lg outline-none focus:border-purple-500 resize-none font-medium" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button type="submit" disabled={submitting} className="flex flex-col items-center justify-center bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-lg disabled:opacity-50 transition-all">
                  <div className="flex items-center gap-2">
                    {submitting ? <Loader2 size={18} className="animate-spin"/> : <MonitorPlay size={18} />}
                    <span>Save & Publish to Students</span>
                  </div>
                  <span className="text-[9px] font-medium opacity-80 mt-1 uppercase">ছাত্রদের জন্য প্রকাশ করুন | प्रकाशित करें</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin mb-4" />
            <div className="text-center">
                <p className="text-gray-500 font-bold tracking-wide">LOADING SESSIONS...</p>
                <p className="text-[10px] text-purple-400 font-bold uppercase mt-1">সেশন লোড হচ্ছে... | सत्र लोड हो रहे हैं...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* UPCOMING CLASSES */}
            <div>
              <div className="flex flex-col mb-4 border-b border-gray-200 pb-2">
                <h2 className="text-lg font-bold text-gray-800 leading-none">Upcoming Sessions</h2>
                <span className="text-[10px] font-bold text-purple-600 mt-1 uppercase">আসন্ন সেশন | आगामी सत्र</span>
              </div>
              {upcomingClasses.length === 0 ? (
                <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-500">
                  <p className="font-bold">No upcoming classes scheduled.</p>
                  <p className="text-xs mt-1">কোনো আসন্ন ক্লাস নেই | कोई आगामी कक्षा नहीं</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcomingClasses.map(cls => (
                    <div key={cls.id} className="bg-white rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                      <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold bg-purple-200 text-purple-800 px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                          <Users size={12}/> {cls.className}
                        </span>
                        <button onClick={() => handleDeleteClass(cls.id, cls.className)} className="text-red-400 hover:text-red-600 transition-colors" title="Cancel"><Trash2 size={16} /></button>
                      </div>
                      <div className="p-5 flex-1">
                        <h3 className="font-bold text-gray-800 text-lg mb-3 line-clamp-2 leading-tight group-hover:text-purple-700">{cls.title}</h3>
                        <div className="space-y-2 text-[11px] font-bold text-gray-500 uppercase">
                          <p className="flex items-center gap-2"><Calendar size={14} className="text-purple-400"/> {new Date(cls.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          <p className="flex items-center gap-2"><Clock size={14} className="text-purple-400"/> {formatTimeAMPM(cls.time)} — {formatTimeAMPM(cls.endTime || cls.time)}</p>
                        </div>
                      </div>
                      <div className="p-4 border-t bg-gray-50/50">
                        <button onClick={() => window.open(cls.meetingLink, '_blank')} className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-100">
                          <ExternalLink size={18} /> Start Class | শুরু করুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAST CLASSES */}
            {pastClasses.length > 0 && (
              <div>
                <div className="flex flex-col mb-4 border-b border-gray-200 pb-2">
                    <h2 className="text-lg font-bold text-gray-500 leading-none">Past Sessions</h2>
                    <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">অতীত সেশন | पिछले सत्र</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70">
                  {pastClasses.map(cls => (
                    <div key={cls.id} className="bg-gray-50 rounded-xl border flex flex-col">
                      <div className="px-4 py-3 border-b flex justify-between items-center">
                        <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded uppercase tracking-wider">{cls.className}</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Completed</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">সম্পন্ন | पूर्ण</span>
                        </div>
                      </div>
                      <div className="p-5 flex-1">
                        <h3 className="font-bold text-gray-600 text-base mb-2 line-clamp-2">{cls.title}</h3>
                        <div className="text-[10px] font-bold text-gray-400 space-y-1">
                          <p>{new Date(cls.date).toLocaleDateString('en-GB')} ({formatTimeAMPM(cls.time)} - {formatTimeAMPM(cls.endTime)})</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default OnlineClass;