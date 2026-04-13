import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { 
  Coins, Filter, Loader2, CheckCircle, XCircle, User, AlertCircle, 
  Calendar, Download, Printer, X, Receipt, Bell 
} from 'lucide-react';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const ACADEMIC_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const FeesSummary = () => {
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [students, setStudents] = useState([]);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Cloud Function Messaging State
  const [sendingReminder, setSendingReminder] = useState(null);

  // 1. Initial Load: Fetch Sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const snap = await getDocs(collection(db, 'academicSessions'));
        const sessionList = snap.docs.map(d => {
          const data = d.data();
          return { 
            id: d.id, 
            displayName: data.name || data.sessionName || data.session || d.id,
            ...data 
          };
        });
        
        sessionList.sort((a, b) => (b.isActive === true) - (a.isActive === true));
        setSessions(sessionList);
        
        if (sessionList.length > 0) {
          const defaultSession = sessionList[0];
          setActiveSessionId(defaultSession.id);
          setAvailableClasses(defaultSession.classes || []);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // 2. Handle Session Change
  const handleSessionChange = (e) => {
    const sId = e.target.value;
    setActiveSessionId(sId);
    setSelectedClassName('');
    setStudents([]);
    
    const session = sessions.find(s => s.id === sId);
    setAvailableClasses(session?.classes || []);
  };

  // 3. Fetch Students & Fee Data when Class is selected
  useEffect(() => {
    if (!activeSessionId || !selectedClassName) {
      setStudents([]);
      return;
    }

    const loadClassRoster = async () => {
      setFetchingData(true);
      try {
        const sessionDoc = sessions.find(s => s.id === activeSessionId);
        if (!sessionDoc || !sessionDoc.classes) return;

        const targetClass = sessionDoc.classes.find(c => c.name === selectedClassName);
        
        if (targetClass && targetClass.students) {
          const sortedStudents = [...targetClass.students].sort((a, b) => 
             (a.name || '').localeCompare(b.name || '')
          );
          setStudents(sortedStudents);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error("Error loading class roster:", error);
      } finally {
        setFetchingData(false);
      }
    };

    loadClassRoster();
  }, [selectedClassName, activeSessionId, sessions]);


  // Helper to fetch the actual Receipt Object if paid
  const getPaymentReceipt = (student, monthName) => {
    if (!student.feeHistory || !Array.isArray(student.feeHistory)) return null;
    const shortMonth = monthName.substring(0, 3);
    return student.feeHistory.find(fee => {
      const dbMonth = fee.month || '';
      const dbMonths = fee.months || [];
      const matchesDirectly = dbMonth === monthName || dbMonth === shortMonth;
      const matchesArray = dbMonths.includes(monthName) || dbMonths.includes(shortMonth);
      const isSuccessful = fee.status !== 'Failed' && fee.status !== 'Cancelled'; 
      return (matchesDirectly || matchesArray) && isSuccessful;
    });
  };

  const handleReceiptClick = (receipt, student) => {
    setActiveReceipt({
      ...receipt,
      studentName: receipt.studentName || student.name,
      regNo: receipt.regNo || student.regNo || student.admissionNo,
      rollNo: receipt.rollNo || student.rollNo,
      className: receipt.className || selectedClassName
    });
    setShowReceipt(true);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const handleSendReminder = async (student, month) => {
    const reminderId = `${student.id}-${month}`;
    setSendingReminder(reminderId);
    try {
      const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
      const response = await sendPushNotification({
        targetUid: student.id || student.uid,
        title: "Fee Reminder ⚠️",
        body: `Dear ${student.name}, your school fees for the month of ${month} are currently Due. Please clear your dues at the earliest.`
      });
      if (response.data.success) {
        alert(`Reminder sent successfully to ${student.name}!`);
      } else {
        alert(`Notice: ${student.name} has not logged into the portal yet.`);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to send reminder.");
    } finally {
      setSendingReminder(null);
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Reg No,Student Name," + ACADEMIC_MONTHS.join(",") + "\n";
    students.forEach(student => {
      let row = `"${student.regNo || student.admissionNo || '-'}","${student.name || 'Unknown'}"`;
      ACADEMIC_MONTHS.forEach(month => {
        row += `,"${getPaymentReceipt(student, month) ? 'PAID' : 'DUE'}"`;
      });
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fees_Summary_${selectedClassName}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (loading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="h-full flex flex-col items-center justify-center text-blue-600 gap-3">
          <Loader2 className="animate-spin" size={40} />
          <div className="text-center">
            <p className="font-black tracking-widest text-sm uppercase">Loading Financial Data...</p>
            <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">আর্থিক তথ্য লোড হচ্ছে | वित्तीय डेटा लोड हो रहा है</p>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 print:hidden font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-inner">
              <Coins size={28} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none">Fees Summary Matrix</h1>
              <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ফিস সামারি ম্যাট্রিক্স | शुल्क सारांश मैट्रिक्स</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Month-wise Collection Tracking (মাসিক আদায় ট্র্যাকিং)</p>
            </div>
          </div>
          
          {students.length > 0 && (
            <button 
              onClick={exportToCSV}
              className="flex flex-col items-center justify-center bg-gray-900 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg hover:bg-black transition-all active:scale-95"
            >
              <div className="flex items-center gap-2 text-sm uppercase">
                <Download size={16} /> Export CSV
              </div>
              <span className="text-[9px] font-medium opacity-70 mt-1">এক্সপোর্ট করুন | निर्यात करें</span>
            </button>
          )}
        </div>

        {/* FILTERS */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-blue-100 flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
          
          <div className="flex flex-col items-start gap-1 px-2 border-r border-gray-100 pr-6">
            <div className="flex items-center gap-2 text-blue-800 font-black uppercase tracking-widest text-xs">
              <Filter size={16} /> Filters:
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase">ফিল্টার | फिल्टर</span>
          </div>

          <div className="flex-1 flex flex-col md:flex-row gap-6 w-full">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Academic Session</label>
              <p className="text-[8px] font-bold text-blue-400 ml-1 mb-2 uppercase">একাডেমিক সেশন | शैक्षणिक सत्र</p>
              <select 
                value={activeSessionId} 
                onChange={handleSessionChange}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700 transition-all"
              >
                {sessions.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
              </select>
            </div>

            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 leading-none">Target Class</label>
              <p className="text-[8px] font-bold text-blue-400 ml-1 mb-2 uppercase">শ্রেণী নির্বাচন | लक्षित कक्षा</p>
              <select 
                value={selectedClassName} 
                onChange={e => setSelectedClassName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 font-bold text-gray-700 disabled:opacity-50 transition-all"
                disabled={availableClasses.length === 0}
              >
                <option value="">-- Choose Class --</option>
                {availableClasses.map((cls, idx) => (
                  <option key={idx} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DATA MATRIX */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[550px]">
          
          {fetchingData ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-blue-600 gap-3">
              <Loader2 className="animate-spin" size={40} />
              <div className="text-center">
                <span className="font-black text-sm tracking-widest uppercase">Compiling Records...</span>
                <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">রেকর্ড সংকলন করা হচ্ছে | संकलन</p>
              </div>
            </div>
          ) : !selectedClassName ? (
             <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-300 gap-4">
               <Calendar size={64} className="opacity-10" />
               <div className="text-center max-w-sm">
                 <p className="font-black text-gray-400 uppercase text-sm tracking-widest">Select a class to begin</p>
                 <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase">ম্যাট্রিক্স দেখতে একটি ক্লাস নির্বাচন করুন | कक्षा चुनें</p>
               </div>
             </div>
          ) : students.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400 gap-3">
               <AlertCircle size={48} className="text-gray-200" />
               <p className="font-black text-gray-500 uppercase text-sm">No students found in {selectedClassName}</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-5 whitespace-nowrap sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Student Information</span>
                        <span className="text-[8px] font-bold text-blue-400 mt-1 uppercase">ছাত্রের তথ্য | छात्र जानकारी</span>
                      </div>
                    </th>
                    {ACADEMIC_MONTHS.map((month, idx) => (
                      <th key={idx} className="p-5 text-center min-w-[110px] border-l border-gray-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">{month.substring(0,3)}</span>
                            <span className="text-[7px] font-bold text-gray-400 mt-1 uppercase">মাস | माह</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, sIdx) => (
                    <tr key={sIdx} className="hover:bg-blue-50/20 transition-colors">
                      
                      {/* Frozen Student Info Column */}
                      <td className="p-5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 font-black shadow-inner">
                            {student.name?.charAt(0) || <User size={18} />}
                          </div>
                          <div className="flex flex-col">
                            <p className="font-black text-gray-800 text-sm whitespace-nowrap leading-none">{student.name}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Reg: {student.regNo || student.admissionNo || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Month Columns */}
                      {ACADEMIC_MONTHS.map((month, mIdx) => {
                        const receipt = getPaymentReceipt(student, month);
                        const isSending = sendingReminder === `${student.id}-${month}`;

                        return (
                          <td key={mIdx} className="p-5 text-center border-l border-gray-100 bg-white">
                            <div className="flex flex-col items-center justify-center gap-2">
                              {receipt ? (
                                <button 
                                  onClick={() => handleReceiptClick(receipt, student)}
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl flex flex-col items-center gap-1 hover:bg-emerald-100 transition-all cursor-pointer active:scale-95 w-full group shadow-sm"
                                >
                                  <div className="flex items-center gap-1">
                                    <CheckCircle size={10} className="fill-current text-white" />
                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Paid</span>
                                  </div>
                                  <span className="text-[7px] font-bold opacity-70 uppercase leading-none">পরিশোধিত | भुगतान</span>
                                </button>
                              ) : (
                                <>
                                  <div className="bg-rose-50 text-rose-500 border border-rose-100 px-3 py-1.5 rounded-xl flex flex-col items-center gap-1 opacity-80 w-full shadow-sm">
                                    <div className="flex items-center gap-1">
                                        <XCircle size={10} />
                                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Due</span>
                                    </div>
                                    <span className="text-[7px] font-bold opacity-70 uppercase leading-none">বকেয়া | देय</span>
                                  </div>
                                  
                                  <button 
                                    onClick={() => handleSendReminder(student, month)}
                                    disabled={isSending}
                                    className="flex flex-col items-center justify-center w-full gap-0.5 py-1.5 rounded-xl transition-all disabled:opacity-50 border border-blue-100 hover:border-blue-300 hover:bg-blue-50 group"
                                  >
                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600">
                                      {isSending ? <Loader2 size={10} className="animate-spin"/> : <Bell size={10} />} 
                                      <span>{isSending ? 'Sending' : 'Remind'}</span>
                                    </div>
                                    <span className="text-[7px] font-bold text-blue-400 opacity-60 uppercase group-hover:opacity-100">রিমাইন্ডার | अनुस्मारक</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* --- RECEIPT MODAL --- */}
      {showReceipt && activeReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md print:p-0 print:bg-white print:relative animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden print:shadow-none animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 print:hidden">
              <div className="flex flex-col">
                <h4 className="font-black text-gray-800 flex items-center gap-2 leading-none uppercase text-sm">
                    <Receipt className="text-blue-600" size={18}/> View Receipt
                </h4>
                <span className="text-[9px] font-bold text-blue-400 mt-1 uppercase">রসিদ দেখুন | रसीद देखें</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase shadow-lg shadow-blue-100 transform active:scale-95 transition-all">
                  <Printer size={16}/> Print
                </button>
                <button onClick={() => setShowReceipt(false)} className="bg-gray-100 text-gray-500 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 border border-gray-200 transition-all">
                  <X size={20}/>
                </button>
              </div>
            </div>
            
            <div className="p-12 space-y-8 text-sm relative bg-white">
              <div className="text-center border-b-2 border-gray-900 pb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 leading-none">Vivekananda Child's Mission</h2>
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest leading-none">Manikchak, Malda, WB - 732202</p>
                <div className="bg-gray-900 text-white px-4 py-1.5 rounded-full inline-block mt-4 text-[10px] font-black uppercase tracking-[0.2em]">Fee Receipt (ফি রসিদ)</div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 font-black text-gray-800">
                <div className="space-y-4">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">Student Name | ছাত্রের নাম</span>
                     <span className="text-base mt-1 uppercase">{activeReceipt.studentName}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">Class | শ্রেণী</span>
                     <span className="text-sm mt-1">{activeReceipt.className}</span>
                   </div>
                </div>
                <div className="text-right space-y-4">
                   <div className="flex flex-col">
                     <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">Receipt No | রসিদ নং</span>
                     <span className="font-mono text-sm mt-1 text-blue-700">{activeReceipt.receiptId}</span>
                   </div>

                   <div className="flex flex-col gap-1">
                     <div>
                       <span className="text-[9px] text-gray-400 uppercase mr-2 tracking-widest">Reg No:</span>
                       <span className="font-mono text-xs">{activeReceipt.regNo}</span>
                     </div>
                     <div>
                       <span className="text-[9px] text-gray-400 uppercase mr-2 tracking-widest">Roll No:</span>
                       <span className="font-mono text-xs">{activeReceipt.rollNo || 'N/A'}</span>
                     </div>
                   </div>

                   <div className="flex flex-col mt-2">
                     <span className="text-[9px] text-gray-400 uppercase tracking-widest leading-none">Date Paid | প্রদানের তারিখ</span>
                     <span className="font-mono text-sm mt-1">{formatDate(activeReceipt.date)}</span>
                   </div>
                </div>
              </div>
              
              <div className="border-y-2 border-gray-100 py-3">
                  <table className="w-full text-sm">
                    <thead>
                        <tr className="text-[9px] font-black text-gray-400 uppercase border-b border-gray-50">
                            <th className="py-2 text-left">Fee Head (বিবরণ)</th>
                            <th className="py-2 text-right">Amount (পরিমাণ)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                    {activeReceipt.fees?.map((f, i) => (
                        <tr key={i} className="font-bold text-gray-700">
                            <td className="py-3 uppercase text-xs">{f.title}</td>
                            <td className="py-3 text-right">₹{f.amount}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
              </div>
              
              <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{activeReceipt.subtotal?.toFixed(2) || activeReceipt.amount?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-t-2 border-gray-900">
                    <div className="flex flex-col">
                        <span className="text-xl font-black uppercase leading-none">Total Paid</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">সর্বমোট পরিশোধিত | कुल भुगतान</span>
                    </div>
                    <span className="text-3xl font-black text-gray-900 tracking-tighter">₹{(activeReceipt.amount || activeReceipt.subtotal || 0).toFixed(2)}</span>
                  </div>
              </div>

              <div className="pt-8 flex flex-col items-center gap-1 opacity-50">
                <p className="text-[8px] font-black text-center text-gray-800 uppercase tracking-widest">*** This is a computer generated receipt ***</p>
                <p className="text-[7px] font-bold text-center text-gray-400 uppercase leading-none">বিবেকানন্দ চাইল্ডস মিশন স্কুল | विवेकानंद चाइल्ड्स मिशन स्कूल</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminDashboardLayout>
  );
};

export default FeesSummary;