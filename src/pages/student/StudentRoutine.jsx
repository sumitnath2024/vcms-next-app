import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, User, Loader2, AlertCircle, ChevronLeft, ChevronRight, List
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

// --- MULTILINGUAL DAY MAPPING ---
const DAY_TRANSLATIONS = {
  "Monday": "সোমবার / सोमवार",
  "Tuesday": "মঙ্গলবার / मंगलवार",
  "Wednesday": "বুধবার / बुधवार",
  "Thursday": "বৃহস্পতিবার / गुरुवार",
  "Friday": "শুক্রবার / शुक्रवार",
  "Saturday": "শনিবার / शनिवार",
  "Sunday": "রবিবার / रविवार"
};

const StudentRoutine = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  const [routineData, setRoutineData] = useState({});
  const [studentClassName, setStudentClassName] = useState('');
  const [error, setError] = useState(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [currentMonth, setCurrentMonth] = useState(new Date()); 

  const selectedDayName = useMemo(() => {
    return selectedDate.toLocaleString('en-US', { weekday: 'long' });
  }, [selectedDate]);

  useEffect(() => {
    const fetchRoutine = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          setError("No active academic session found.");
          setLoading(false);
          return;
        }

        const sessionData = snap.docs[0].data();
        const allClasses = sessionData.classes || [];

        let foundClass = null;
        for (const cls of allClasses) {
          const match = cls.students?.find(s => s.uid === user.uid);
          if (match) {
            foundClass = cls;
            break;
          }
        }

        if (!foundClass) {
          setError("You are not enrolled in any class in the current active session.");
        } else {
          setStudentClassName(foundClass.name);
          if (!foundClass.routine || foundClass.routine.length === 0) {
            setError("No routine has been uploaded for your class yet.");
          } else {
            const grouped = daysOfWeek.reduce((acc, day) => {
              acc[day] = foundClass.routine
                .filter(r => r.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              return acc;
            }, {});
            setRoutineData(grouped);
          }
        }
      } catch (err) {
        console.error("Error loading routine:", err);
        setError("Failed to load routine data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [user]);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const handleDateClick = (day) => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));

  const handlePrevDay = () => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prevDate);
    if (prevDate.getMonth() !== currentMonth.getMonth()) setCurrentMonth(prevDate);
  };

  const handleNextDay = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(nextDate);
    if (nextDate.getMonth() !== currentMonth.getMonth()) setCurrentMonth(nextDate);
  };

  const isToday = (dateObj) => {
    const today = new Date();
    return dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear();
  };

  const hasClassesOnDate = (day) => {
    const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayName = checkDate.toLocaleString('en-US', { weekday: 'long' });
    return routineData[dayName] && routineData[dayName].length > 0;
  };

  return (
    <StudentDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-10 px-4">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
              <CalendarIcon className="text-emerald-600" /> Class Routine
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
               ক্লাস রুটিন / कक्षा दिनचर्या
            </p>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Schedule for / তালিকা: <span className="font-bold text-emerald-700">{studentClassName || '...'}</span>
            </p>
          </div>
        </div>

        {/* LOADING & ERROR */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Routine / লোড হচ্ছে / लोड हो रहा है</p>
          </div>
        )}
        
        {!loading && error && (
          <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center text-red-600 flex flex-col items-center">
             <AlertCircle size={32} className="mb-2"/>
             <p className="font-bold">{error}</p>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && !error && (
          <>
            <div className="grid lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4">
              
              {/* LEFT: DAILY CARD */}
              <div className="lg:col-span-8">
                  <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                    {/* Navigator */}
                    <div className="bg-emerald-50/50 p-6 border-b border-emerald-100 flex items-center justify-between">
                      <button onClick={handlePrevDay} className="p-2 hover:bg-white rounded-full text-emerald-700 transition-all shadow-sm"><ChevronLeft size={24} /></button>
                      <div className="text-center">
                        <div className="flex flex-col items-center">
                          <h2 className="text-2xl font-black text-gray-800 flex items-center justify-center gap-2 leading-none">
                            {selectedDayName}
                            {isToday(selectedDate) && <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest">Today / আজ / आज</span>}
                          </h2>
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">
                            {DAY_TRANSLATIONS[selectedDayName]}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mt-2">{selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <button onClick={handleNextDay} className="p-2 hover:bg-white rounded-full text-emerald-700 transition-all shadow-sm"><ChevronRight size={24} /></button>
                    </div>

                    {/* Daily List */}
                    <div className="p-6 bg-gray-50 flex-1">
						{routineData[selectedDayName]?.length > 0 ? (
						  <div className="space-y-4">
							{(() => {
							  // 1. Group the periods by their Start and End time
							  const groupedPeriods = routineData[selectedDayName].reduce((groups, period) => {
								const timeKey = `${period.startTime}-${period.endTime}`;
								if (!groups[timeKey]) groups[timeKey] = [];
								groups[timeKey].push(period);
								return groups;
							  }, {});

							  // 2. Map through the grouped periods
							  return Object.values(groupedPeriods).map((periodsGroup, groupIdx) => {
								// Grab the time from the first item in the group (they all share the same time)
								const { startTime, endTime } = periodsGroup[0]; 

								return (
								  <div key={groupIdx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-stretch gap-5 hover:shadow-md transition-shadow group relative overflow-hidden">
									
									{/* Time Block (Rendered ONLY ONCE per time slot) */}
									<div className="flex flex-col items-center justify-center min-w-[90px] border-r border-gray-100 pr-5">
									  <span className="text-lg font-black text-emerald-600 leading-none">{startTime}</span>
									  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">থেকে / से</span>
									  <span className="text-xs text-gray-500 font-black">{endTime}</span>
									</div>

									{/* Subjects Block (Maps through 1 or more subjects for this time) */}
									<div className="flex-1 z-10 flex flex-col justify-center gap-3 py-1">
									  {periodsGroup.map((period, pIdx) => (
										<div 
										  key={pIdx} 
										  className={`flex flex-col ${periodsGroup.length > 1 ? 'bg-emerald-50/50 p-3 rounded-xl border border-emerald-50' : ''}`}
										>
										  <div className="flex flex-col">
											<div className="flex justify-between items-start">
												<h3 className="font-black text-gray-800 text-lg group-hover:text-emerald-700 transition-colors leading-tight">
												{period.subjectName}
												</h3>
												{/* Show a helpful badge if there are multiple classes at this time */}
												{periodsGroup.length > 1 && (
													<span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-widest">
														Split / Choice
													</span>
												)}
											</div>
											{!periodsGroup.length > 1 && <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Subject / বিষয় / विषय</span>}
										  </div>
										  
										  <div className="flex flex-col mt-2">
											{period.teacherName && (
											  <div className="flex flex-col">
												<span className="text-[8px] font-bold text-gray-400 uppercase">Teacher / শিক্ষক / शिक्षक</span>
												<span className="text-xs text-gray-600 font-bold flex items-center gap-1.5 mt-0.5">
												  <User size={12} className="text-emerald-500"/> {period.teacherName}
												</span>
											  </div>
											)}
										  </div>
										</div>
									  ))}
									</div>

								  </div>
								);
							  });
							})()}
						  </div>
						) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 text-center">
                          <Clock size={48} className="mb-4 opacity-20" />
                          <h3 className="font-black text-gray-500">No classes on {selectedDayName}</h3>
                          <p className="text-[10px] font-bold uppercase tracking-widest mt-1">আজ কোনো ক্লাস নির্ধারিত নেই / आज कोई कक्षा नहीं है</p>
                          <p className="text-xs mt-3 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full font-bold">Enjoy your day off! / ছুটির দিন উপভোগ করুন!</p>
                        </div>
                      )}
                    </div>
                  </div>
              </div>

              {/* RIGHT: CALENDAR */}
              <div className="lg:col-span-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm sticky top-6">
                      <div className="mb-4 border-b border-gray-100 pb-2">
                        <h3 className="font-black text-gray-700 flex items-center gap-2 text-sm uppercase">
                            <CalendarIcon size={16} className="text-emerald-600"/> Monthly Overview
                        </h3>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">মাসিক ওভারভিউ / मासिक विवरण</p>
                      </div>

                      <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-colors"><ChevronLeft size={16}/></button>
                        <span className="text-xs font-black text-gray-800 uppercase">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-colors"><ChevronRight size={16}/></button>
                      </div>

                      <div className="grid grid-cols-7 text-center mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                          <div key={d} className="text-[10px] font-black text-gray-400 py-1 uppercase">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {Array(getFirstDayOfMonth(currentMonth)).fill(null).map((_, i) => (
                          <div key={`empty-${i}`} className="h-9"></div>
                        ))}
                        {Array(getDaysInMonth(currentMonth)).fill(null).map((_, i) => {
                          const day = i + 1;
                          const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                          const isTodayDate = isToday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                          const hasClass = hasClassesOnDate(day);

                          return (
                            <button 
                              key={day}
                              onClick={() => handleDateClick(day)}
                              className={`h-9 w-9 mx-auto rounded-full text-xs flex flex-col items-center justify-center relative transition-all
                                ${isSelected ? 'bg-emerald-600 text-white font-black shadow-md transform scale-110' : 'hover:bg-emerald-50 text-gray-700'}
                                ${isTodayDate && !isSelected ? 'border border-emerald-600 text-emerald-700 font-black' : ''}
                              `}
                            >
                              <span>{day}</span>
                              {hasClass && !isSelected && <span className="absolute bottom-1 w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>}
                            </button>
                          );
                        })}
                      </div>
                  </div>
              </div>
            </div>

            {/* === BOTTOM SECTION: FULL WEEKLY OVERVIEW === */}
            <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                      <List className="text-emerald-600" /> Full Weekly Schedule
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    পুরো সপ্তাহের রুটিন / पूर्ण साप्ताहिक कार्यक्रम
                  </p>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex flex-col divide-y divide-gray-100">
                        {daysOfWeek.map((day) => {
                             const periods = routineData[day] || [];
                             const isDayEmpty = periods.length === 0;

                             return (
                                <div key={day} className="flex flex-col md:flex-row group transition-colors hover:bg-gray-50/50">
                                    {/* Day Label */}
                                    <div className="w-full md:w-48 bg-gray-50/80 p-5 md:p-6 flex flex-col items-start md:items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                                        <span className="font-black text-gray-800 uppercase tracking-tight">{day}</span>
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">{DAY_TRANSLATIONS[day]}</span>
                                        <span className="mt-2 text-[9px] bg-white border border-emerald-100 px-2 py-0.5 rounded-full text-emerald-700 font-bold md:block hidden">
                                          {periods.length} Classes / ক্লাস
                                        </span>
                                    </div>
                                    
                                    {/* Classes List */}
                                    <div className="flex-1 p-5 md:p-6 overflow-x-auto">
                                        {!isDayEmpty ? (
                                            <div className="flex flex-col md:flex-row gap-4">
                                                {periods.map((period, idx) => (
                                                    <div key={idx} className="min-w-[180px] p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex flex-col gap-1 shadow-sm hover:shadow-md hover:bg-white transition-all group/period">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div className="flex flex-col">
                                                              <span className="text-[9px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm w-fit">
                                                                  {period.startTime}
                                                              </span>
                                                              <span className="text-[7px] text-gray-400 font-bold mt-0.5 uppercase">Time / সময়</span>
                                                            </div>
                                                        </div>
                                                        <div className="font-black text-gray-800 text-sm leading-tight mt-1 truncate">
                                                            {period.subjectName}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-bold truncate mt-1 flex items-center gap-1">
                                                            <User size={10} className="text-gray-400" /> {period.teacherName || 'No Teacher / শিক্ষক নেই'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-gray-400 italic text-sm h-full py-4">
                                                <div className="flex flex-col">
                                                  <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit">No classes scheduled</span>
                                                  <span className="text-[9px] font-medium mt-1 ml-3 opacity-60">কোনো ক্লাস নির্ধারিত নেই / कोई कक्षा नहीं है</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </div>
            </div>
          </>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentRoutine;