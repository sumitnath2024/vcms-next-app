import React, { useState, useEffect } from 'react';
import { Calendar, Search, Loader2, AlertCircle, Clock, Umbrella, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';

const StudentHolidays = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const sessionData = querySnapshot.docs[0].data();
          setSessionName(sessionData.name || 'Current Session');
          const loadedHolidays = sessionData.holidays || [];
          loadedHolidays.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          setHolidays(loadedHolidays);
        } else {
          setError("No active academic session found.");
        }
      } catch (err) {
        console.error("Error fetching holidays:", err);
        setError("Failed to load holiday data.");
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  const getMonthShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { month: 'short' });
  };

  const getDateNumber = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getDate();
  };

  const isRange = (start, end) => start !== end;

  const filteredHolidays = holidays.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <StudentDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6 pb-20 font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 opacity-5 pointer-events-none text-emerald-950">
            <Umbrella size={120} />
          </div>
          <div className="relative z-10 w-full md:w-auto">
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 flex items-center gap-2 leading-none">
              <Calendar className="text-emerald-600 shrink-0" /> Holiday Calendar
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
              ছুটির ক্যালেন্ডার / अवकाश कैलेंडर
            </p>
            <p className="text-sm font-bold text-emerald-600 mt-3 bg-emerald-50 inline-block px-3 py-1 rounded-lg">
              {loading ? 'Fetching dates...' : `Session / সেশন: ${sessionName}`}
            </p>
          </div>
          
          <div className="relative w-full md:w-80 group z-10">
            <div className="flex flex-col mb-2 ml-1">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest leading-none">Search Holidays</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">ছুটি খুঁজুন / छुट्टियां खोजें</span>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Ex: Durga Puja, Holi..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-bold shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
            <p className="text-gray-800 font-black tracking-widest text-sm uppercase">Loading Calendar...</p>
            <p className="text-xs font-bold text-gray-400 mt-1 uppercase">স্কুল ক্যালেন্ডার লোড হচ্ছে / लोड हो रहा है</p>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-red-600 bg-red-50 rounded-[2rem] border border-red-100 shadow-sm p-6 text-center">
             <AlertCircle size={48} className="mb-3 opacity-50"/>
             <p className="font-black text-lg">{error}</p>
             <p className="text-xs font-bold uppercase mt-1">ত্রুটি হয়েছে / त्रुटि हुई है</p>
          </div>
        )}

        {/* EMPTY SEARCH RESULT */}
        {!loading && !error && filteredHolidays.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-300 shadow-sm p-6">
             <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <Umbrella className="text-gray-300" size={40} />
             </div>
             <h3 className="text-lg font-black text-gray-800">No holidays found</h3>
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">আপনার অনুসন্ধানের সাথে মেলে এমন কোনো ছুটি পাওয়া যায়নি।</p>
             <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">आपकी खोज से मेल खाने वाली कोई छुट्टी नहीं मिली।</p>
          </div>
        )}

        {/* HOLIDAY LIST GRID */}
        {!loading && !error && filteredHolidays.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredHolidays.map((holiday, index) => {
                const isLongHoliday = isRange(holiday.startDate, holiday.endDate);
                
                return (
                  <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex items-start gap-4 group border-b-4 border-b-emerald-500">
                      
                      {/* Date Block */}
                      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[85px] transition-all group-hover:scale-105 shadow-inner ${
                          isLongHoliday ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                          <span className="text-xs font-black uppercase tracking-[0.2em] leading-none mb-1">{getMonthShort(holiday.startDate)}</span>
                          <span className="text-3xl font-black leading-none">{getDateNumber(holiday.startDate)}</span>
                      </div>

                      {/* Content Block */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-1">
                          {/* REMOVED truncate and line-clamp so the text fully displays across multiple lines */}
                          <h3 className="font-black text-gray-800 text-base md:text-lg leading-snug mb-4 break-words group-hover:text-emerald-700 transition-colors">
                            {holiday.name}
                          </h3>
                          
                          <div className="space-y-4">
                              <div className="flex flex-col">
                                  <div className="flex items-start gap-2">
                                      <Calendar size={14} className="text-emerald-500 shrink-0 mt-0.5"/> 
                                      <span className="text-xs font-black text-gray-700 uppercase tracking-tight leading-snug">
                                        {isLongHoliday 
                                          ? `${formatDate(holiday.startDate)} — ${formatDate(holiday.endDate)}`
                                          : formatDate(holiday.startDate)
                                        }
                                      </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 ml-[22px]">Date Range / তারিখের ব্যাপ্তি</span>
                              </div>

                              <div className="flex flex-col">
                                  <div className="flex items-start gap-2">
                                      <Clock size={14} className="text-gray-400 shrink-0 mt-0.5"/> 
                                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tight leading-snug break-words">
                                          {isLongHoliday 
                                            ? "Extended Break / দীর্ঘ বিরতি" 
                                            : `${getDayName(holiday.startDate)} / ${isLongHoliday ? '' : 'ছুটির দিন'}`
                                          }
                                      </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5 ml-[22px]">Day / বার / दिन</span>
                              </div>
                          </div>
                      </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* BOTTOM TIP */}
        {!loading && !error && (
            <div className="bg-emerald-950 p-6 rounded-[2rem] flex items-start gap-4 shadow-xl relative overflow-hidden mt-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-800 rounded-full -mr-16 -mt-16 opacity-20"></div>
                <div className="bg-emerald-800/50 p-3 rounded-xl shrink-0 z-10">
                  <AlertCircle className="text-emerald-400" size={24} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-black text-white uppercase tracking-widest">Important Note</p>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">দ্রষ্টব্য / नोट</span>
                    </div>
                    <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                        Dates are subject to change based on school notifications or government mandates. Please keep checking the <strong>Notices</strong> section for updates.
                    </p>
                    <p className="text-xs text-emerald-400/80 leading-relaxed font-medium mt-2 italic">
                        স্কুলের বিজ্ঞপ্তি বা সরকারি নির্দেশের ভিত্তিতে তারিখ পরিবর্তন হতে পারে। অনুগ্রহ করে সর্বশেষ আপডেটের জন্য 'Notices' সেকশনটি দেখুন।
                    </p>
                </div>
            </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

export default StudentHolidays;