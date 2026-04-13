import React, { useState, useEffect } from 'react';
import { Calendar, Search, Loader2, AlertCircle, Clock } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const HolidayList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionName, setSessionName] = useState('');
  const [error, setError] = useState(null);

  // 1. FETCH DATA FROM FIREBASE
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

  // 2. HELPER FUNCTIONS
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDayName = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getMonthShort = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const getDateNumber = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getDate();
  };

  const isRange = (start, end) => start !== end;

  // 3. FILTER LOGIC
  const filteredHolidays = holidays.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <TeacherDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-4 pb-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col w-full md:w-auto">
            <h1 className="text-2xl font-bold text-gray-800 leading-none">Holiday List</h1>
            <span className="text-xs font-bold text-purple-600 mt-2 uppercase tracking-wide">ছুটির তালিকা | अवकाश सूची</span>
            <p className="text-sm text-gray-500 font-medium mt-3 bg-gray-50 inline-block px-3 py-1 rounded-lg">
              {loading ? (
                <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin"/> Loading... | লোড হচ্ছে...
                </span>
              ) : (
                <>
                  <span className="font-bold text-gray-600">SESSION:</span> {sessionName} 
                  <span className="text-[10px] font-bold text-gray-400 ml-2 uppercase">(একাডেমিক সেশন | शैक्षणिक सत्र)</span>
                </>
              )}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search holidays... | খুঁজুন... | खोजें..." 
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-50 focus:bg-white transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-24 gap-3 bg-white rounded-2xl border">
            <Loader2 className="animate-spin text-purple-600" size={40} />
            <div className="text-center">
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">Fetching Calendar</p>
                <p className="text-xs font-bold text-purple-400 uppercase mt-1">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 text-red-500 bg-white rounded-2xl border border-red-100">
             <AlertCircle size={40} className="mb-3 opacity-50"/>
             <p className="font-bold text-lg">{error}</p>
             <p className="text-xs font-bold uppercase mt-2">ত্রুটি ঘটেছে | त्रुटि हुई है</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredHolidays.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-inner p-6">
             <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
             <p className="text-gray-500 font-bold text-base">No holidays found for "{searchTerm}"</p>
             <p className="text-xs font-bold text-gray-400 uppercase mt-2">কোনো ছুটি পাওয়া যায়নি | कोई छुट्टी नहीं मिली</p>
          </div>
        )}

        {/* LIST GRID */}
        {!loading && !error && filteredHolidays.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredHolidays.map((holiday, index) => {
                const isLongHoliday = isRange(holiday.startDate, holiday.endDate);
                
                return (
                  <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex items-start gap-4 group">
                      
                      {/* DATE BADGE */}
                      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center min-w-[75px] shadow-inner transition-colors ${
                          isLongHoliday ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100' : 'bg-purple-50 text-purple-700 group-hover:bg-purple-100'
                      }`}>
                          <span className="text-xs font-black uppercase tracking-wider">{getMonthShort(holiday.startDate)}</span>
                          <span className="text-3xl font-black leading-none mt-1">{getDateNumber(holiday.startDate)}</span>
                      </div>

                      {/* DETAILS */}
                      <div className="flex-1 min-w-0">
                          {/* Replaced truncate with break-words to allow wrapping */}
                          <h3 className="font-bold text-gray-800 text-base md:text-lg leading-snug mb-3 break-words group-hover:text-purple-700 transition-colors">
                            {holiday.name}
                          </h3>
                          
                          <div className="space-y-3">
                              {/* Date Display */}
                              <div className="flex items-start gap-2">
                                  <Calendar size={14} className="text-purple-400 mt-0.5 shrink-0"/> 
                                  <div className="flex flex-col">
                                      <p className="text-xs font-bold text-gray-700 leading-snug">
                                        {isLongHoliday 
                                            ? `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}`
                                            : formatDate(holiday.startDate)
                                        }
                                      </p>
                                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">তারিখ | तारीख</span>
                                  </div>
                              </div>

                              {/* Day Display */}
                              <div className="flex items-start gap-2">
                                  <Clock size={14} className="text-gray-400 mt-0.5 shrink-0"/> 
                                  <div className="flex flex-col">
                                      <p className="text-xs font-bold text-gray-600 leading-snug">
                                          {isLongHoliday 
                                            ? "Multiple Days" 
                                            : getDayName(holiday.startDate)
                                          }
                                      </p>
                                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                                          {isLongHoliday ? "একাধিক দিন | कई दिन" : "দিন | दिन"}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default HolidayList;