import React, { useState, useEffect, useMemo } from 'react';
import { 
  Library, StickyNote, Book, Search, Filter, Loader2, BookOpen 
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const BookList = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  
  // Selection States
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(''); // Changed from ID to Name

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const sessionData = snap.docs[0].data();
          setClasses(sessionData.classes || []);
        }
      } catch (e) {
        console.error("Failed to load book data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. HELPERS

  // Extract unique subjects directly from the books and copies arrays
  const uniqueSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return [];

    const bookSubjects = (cls.books || []).map(b => b.subject);
    const copySubjects = (cls.copies || []).map(c => c.subject);
    
    // Combine, filter out empty values, and get unique set
    return [...new Set([...bookSubjects, ...copySubjects])].filter(Boolean).sort();
  }, [classes, selectedClassId]);

  const currentBooks = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls || !cls.books) return [];
    
    if (selectedSubject) {
        return cls.books.filter(b => b.subject === selectedSubject);
    }
    return cls.books;
  }, [classes, selectedClassId, selectedSubject]);

  const currentCopies = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls || !cls.copies) return [];

    if (selectedSubject) {
        return cls.copies.filter(c => c.subject === selectedSubject);
    }
    return cls.copies;
  }, [classes, selectedClassId, selectedSubject]);

  return (
    <TeacherDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 leading-none">
              <Library className="text-purple-600" /> Books & Resources
            </h1>
            <span className="text-[10px] font-bold text-purple-600 mt-2 uppercase tracking-wide">বই এবং সম্পদ | पुस्तकें और संसाधन</span>
            <p className="text-xs text-gray-500 font-medium mt-2">Textbooks & Stationery list | পাঠ্যবই এবং খাতার তালিকা</p>
          </div>

          {/* FILTERS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex flex-col">
                <Filter className="absolute left-3 top-3.5 text-gray-400" size={14} />
                <select 
                    className="w-full sm:w-56 pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-4 focus:ring-purple-50 text-sm font-bold text-gray-700 transition-all" 
                    value={selectedClassId} 
                    onChange={(e) => { 
                        setSelectedClassId(e.target.value); 
                        setSelectedSubject(''); // Reset subject when class changes
                    }}
                >
                    <option value="">Select Class | ক্লাস নির্বাচন</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div className="relative flex flex-col">
                <BookOpen className="absolute left-3 top-3.5 text-gray-400" size={14} />
                <select 
                    className="w-full sm:w-56 pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-4 focus:ring-purple-50 disabled:opacity-50 text-sm font-bold text-gray-700 transition-all" 
                    disabled={!selectedClassId} 
                    value={selectedSubject} 
                    onChange={(e) => setSelectedSubject(e.target.value)}
                >
                    <option value="">All Subjects | সকল বিষয়</option>
                    {uniqueSubjects.map(subjectName => (
                        <option key={subjectName} value={subjectName}>{subjectName}</option>
                    ))}
                </select>
            </div>
          </div>
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border">
               <Loader2 className="animate-spin text-purple-600" size={40} />
               <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Loading Resources... | লোড হচ্ছে...</p>
           </div>
        ) : selectedClassId ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                
                {/* 1. BOOKS LIST */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col mb-6 border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-black text-gray-700 uppercase flex items-center gap-2 leading-none">
                            <Book size={18} className="text-blue-500"/> Text Books List
                        </h3>
                        <span className="text-[10px] font-bold text-blue-400 uppercase mt-1.5 ml-7 tracking-tight">পাঠ্যবই তালিকা | पाठ्यपुस्तकों की सूची</span>
                    </div>
                    
                    {currentBooks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {currentBooks.map((book, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-blue-50/20 border border-blue-100 flex items-start gap-4 hover:shadow-md transition-all group">
                                    <div className="bg-white p-3 rounded-xl border border-blue-100 text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                                        <Book size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1 truncate" title={book.name}>{book.name}</h4>
                                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter mb-2">{book.subject}</p>
                                        <div className="space-y-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold leading-none">Author | লেখক</span>
                                                <span className="text-xs text-gray-700 font-bold truncate mt-1">{book.author}</span>
                                            </div>
                                            <div className="flex flex-col pt-1">
                                                <span className="text-[10px] text-gray-400 font-bold leading-none">Pub | প্রকাশক</span>
                                                <span className="text-xs text-gray-700 font-bold truncate mt-1">{book.publisher}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-sm text-gray-400 font-bold">No books found | কোনো বই পাওয়া যায়নি</p>
                        </div>
                    )}
                </div>

                {/* 2. COPIES LIST */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex flex-col mb-6 border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-black text-gray-700 uppercase flex items-center gap-2 leading-none">
                            <StickyNote size={18} className="text-orange-500"/> Copies & Stationery
                        </h3>
                        <span className="text-[10px] font-bold text-orange-400 uppercase mt-1.5 ml-7 tracking-tight">খাতা এবং স্টেশনারি | कॉपियां और स्टेशनरी</span>
                    </div>
                    
                    {currentCopies.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {currentCopies.map((copy, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-orange-50/20 border border-orange-100 flex items-start gap-4 hover:shadow-md transition-all group">
                                    <div className="bg-white p-3 rounded-xl border border-orange-100 text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
                                        <StickyNote size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1 truncate" title={copy.name}>{copy.name}</h4>
                                        <p className="text-[10px] text-orange-600 font-black uppercase tracking-tighter mb-2">{copy.subject}</p>
                                        <div className="space-y-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold leading-none">Type | ধরন</span>
                                                <span className="text-xs text-gray-700 font-bold mt-1">{copy.type}</span>
                                            </div>
                                            <div className="flex flex-col pt-1">
                                                <span className="text-[10px] text-gray-400 font-bold leading-none">Desc | বিবরণ</span>
                                                <span className="text-xs text-gray-600 font-medium line-clamp-1 mt-1" title={copy.description}>{copy.description}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <p className="text-sm text-gray-400 font-bold">No stationery items found | কোনো খাতা পাওয়া যায়নি</p>
                        </div>
                    )}
                </div>

            </div>
        ) : (
            /* EMPTY STATE: NO CLASS SELECTED */
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center animate-in fade-in zoom-in-95">
                <div className="bg-purple-50 p-6 rounded-full mb-6">
                    <Library className="text-purple-300" size={64} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 leading-none">No Class Selected</h3>
                <span className="text-[11px] font-bold text-purple-400 mt-2 uppercase tracking-widest">ক্লাস নির্বাচন করা হয়নি | कक्षा नहीं चुनी गई</span>
                <p className="text-gray-500 mt-4 max-w-sm text-sm font-medium">
                    Please select a class from the dropdown to view resources.<br/>
                    <span className="text-[10px] font-bold opacity-60">রিসোর্স দেখতে উপরের ড্রপডাউন থেকে একটি ক্লাস নির্বাচন করুন।</span>
                </p>
            </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default BookList;