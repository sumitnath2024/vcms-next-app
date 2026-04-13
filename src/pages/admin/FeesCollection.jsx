import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Receipt, Calendar, CheckCircle2, User, Printer, 
  Check, Clock, X, RefreshCw, MessageCircle 
} from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; 
import { toWords } from 'number-to-words'; 
import { db, functions } from '../../firebase'; 
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const FeesCollection = () => {
  // --- STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [classFeeStructure, setClassFeeStructure] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeSessionName, setActiveSessionName] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [allActiveStudents, setAllActiveStudents] = useState([]); 

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedFees, setSelectedFees] = useState([]); 
  const [paymentStatus, setPaymentStatus] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Static list of fee descriptions from the image
  const staticFeeTitles = [
    "Admission Fee", "Tution Fee", "Devl. Fee", "Transfer Fee",
    "Session Fee", "Game Fee", "Examination Fee", "Miscellaneous Charges"
  ];

  // --- 0. FETCH ACTIVE SESSION & LOAD STUDENTS ---
  useEffect(() => {
    const fetchActiveSessionData = async () => {
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0];
          const docData = sessionDoc.data();
          
          setActiveSessionName(docData.name);
          setActiveSessionId(sessionDoc.id);

          const studentsList = [];
          if (docData.classes && Array.isArray(docData.classes)) {
            docData.classes.forEach(cls => {
              if (cls.students && Array.isArray(cls.students)) {
                cls.students.forEach(stu => {
                  studentsList.push({
                    ...stu, 
                    classInfo: cls, 
                    className: cls.name,
                    id: stu.uid 
                  });
                });
              }
            });
          }
          setAllActiveStudents(studentsList);
        }
      } catch (err) { console.error(err); }
    };
    fetchActiveSessionData();
  }, []);

  // --- 1. LOCAL SEARCH LOGIC ---
  useEffect(() => {
    if (searchTerm.length < 1 || student) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const results = allActiveStudents.filter(s => 
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (s.regNo && s.regNo.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 10); 
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [searchTerm, student, allActiveStudents]);

  // --- 2. SELECT STUDENT ---
  const selectStudent = async (selectedStudent) => {
    setLoading(true);
    setSearchTerm(''); 
    setShowDropdown(false);
    setSearchResults([]); 
    let photoUrl = null;
    try {
      const userDocRef = doc(db, 'users', selectedStudent.id);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        photoUrl = userData.documents?.photo || userData.photo || null;
      }
    } catch (e) { console.error(e); }
    setStudent({ ...selectedStudent, photoUrl: photoUrl, feeHistory: selectedStudent.feeHistory || [] });
    setClassFeeStructure(selectedStudent.classInfo?.fees || []);
    setLoading(false);
  };

  const resetSearch = () => {
    setStudent(null);
    setSearchTerm('');
    setSelectedMonth('');
    setSelectedFees([]);
  };

  // --- 3. LEDGER & AUTOMATION ---
  useEffect(() => {
    if (student) {
      const status = {};
      const history = student.feeHistory || [];
      allMonths.forEach(month => {
        status[month] = history.find(h => h.month === month) ? 'Paid' : 'Pending';
      });
      setPaymentStatus(status);
    }
  }, [student]);

  useEffect(() => {
    if (selectedMonth && classFeeStructure.length > 0) {
      const automatedFees = classFeeStructure.filter(fee => 
        fee.selectedMonths && fee.selectedMonths.includes(selectedMonth)
      );
      setSelectedFees(automatedFees);
    }
  }, [selectedMonth, classFeeStructure]);

  const subtotal = selectedFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const grandTotal = subtotal; 

  // --- 4. COLLECT FEE ---
  const handleCollectFee = async () => {
    if (!student || !selectedMonth || !activeSessionId) return alert("System Error or Selection Missing");
    const sanitizedFees = selectedFees.map(({ selectedMonths, ...rest }) => rest);
    const receiptData = {
      receiptId: `VCM-${Date.now().toString().slice(-6)}`,
      session: activeSessionName, 
      month: selectedMonth, 
      fees: sanitizedFees,
      subtotal: subtotal,
      amount: grandTotal,
      date: new Date().toISOString(),
      studentName: student.name,
      regNo: student.regNo,
      rollNo: student.rollNo || 'N/A', 
      className: student.classInfo?.name || "N/A"
    };

    try {
      const sessionRef = doc(db, 'academicSessions', activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const updatedClasses = sessionData.classes.map(cls => {
        if (cls.id === student.classInfo.id) {
          const updatedStudents = cls.students.map(s => {
            if (s.uid === student.id) {
              const currentHistory = s.feeHistory || [];
              return { ...s, feeHistory: [...currentHistory, receiptData] };
            }
            return s;
          });
          return { ...cls, students: updatedStudents };
        }
        return cls;
      });
      await updateDoc(sessionRef, { classes: updatedClasses });
      const updatedStudent = { ...student, feeHistory: [...(student.feeHistory || []), receiptData] };
      setStudent(updatedStudent);
      setAllActiveStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      setActiveReceipt(receiptData);
      setShowReceipt(true);
      
      const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
      sendPushNotification({
        targetUid: student.id, 
        title: "Payment Received ✅",
        body: `Dear ${student.name}, we have received ₹${grandTotal} for ${selectedMonth}. Receipt: ${receiptData.receiptId}.`
      });
      setSelectedMonth('');
    } catch (error) { alert("Failed to record payment."); }
  };

  // SAFELY split amount into Rupees and Paise by converting to Number first
  const getRupeesPaise = (amount) => {
    const num = Number(amount) || 0; 
    const parts = num.toFixed(2).split('.');
    return { rupees: parts[0], paise: parts[1] };
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- WHATSAPP SHARING ---
  const handleWhatsAppShare = () => {
    if (!activeReceipt) return;

    const textMessage = `*VIVEKANANDA CHILD'S MISSION* 🏫\n\n` +
      `*Fee Receipt:* ${activeReceipt.receiptId}\n` +
      `*Date:* ${formatDate(activeReceipt.date)}\n\n` +
      `*Student:* ${activeReceipt.studentName || student?.name}\n` +
      `*Class:* ${activeReceipt.className || student?.classInfo?.name}\n` +
      `*Reg No:* ${activeReceipt.regNo || student?.regNo}\n\n` +
      `*Total Paid:* ₹${Number(activeReceipt.amount).toFixed(2)}\n` +
      `*Month:* ${activeReceipt.month}\n\n` +
      `Thank you! ✅`;

    const encodedText = encodeURIComponent(textMessage);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <>
      {/* --- REVISED ROBUST CSS FOR PRINT MEDIA --- */}
      <style>{`
        @media print {
          /* Hide everything by default to prevent layout clipping */
          body * {
            visibility: hidden;
          }
          /* Show ONLY the receipt container and its children */
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          /* Fix the receipt strictly to the top left of the printed page */
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            margin: 0;
            padding: 20px;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
          /* Strict table borders for print */
          .print-table {
            border-collapse: collapse;
            border: 1px solid black !important;
          }
          .print-table th, .print-table td {
            border: 1px solid black !important;
            padding: 4px;
          }
          /* Classic dotted lines */
          .dotted-line {
            border-bottom: 1px dotted black;
            flex-grow: 1;
            margin-left: 5px;
          }
        }
      `}</style>

      <AdminDashboardLayout themeColor="blue">
        <div className="max-w-7xl mx-auto space-y-6 pb-20 print:hidden font-sans relative z-0">
          
          {/* --- SEARCH BAR --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative z-[60]" ref={dropdownRef}>
            {!student ? (
              <div className="relative animate-in fade-in duration-300 z-[60]">
                <Search className="absolute left-4 top-5 text-gray-400 h-6 w-6" />
                <div className="flex flex-col">
                  <input 
                    type="text" 
                    placeholder="Search Active Student (Name or ID)..." 
                    className="w-full pl-12 pr-6 py-4 border rounded-xl bg-gray-50 outline-none focus:ring-4 focus:ring-blue-100 font-black text-lg transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="text-[10px] font-bold text-blue-500 mt-2 ml-4 uppercase tracking-widest">ছাত্র খুঁজুন (নাম বা আইডি) | छात्र खोजें (नाम या आईडी)</span>
                </div>
                
                {showDropdown && (
                  <div className="absolute top-[85px] left-0 right-0 bg-white border rounded-2xl shadow-2xl max-h-72 overflow-y-auto z-[70] p-2">
                    {searchResults.map((s) => (
                      <div key={s.id} onClick={() => selectStudent(s)} className="p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center rounded-xl transition-colors border-b last:border-0 border-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black uppercase shadow-inner">{s.name.charAt(0)}</div>
                          <div>
                            <p className="font-black text-gray-800 leading-none">{s.name}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-black uppercase">Reg: {s.regNo}</span>
                              <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md font-black uppercase">Class: {s.className}</span>
                            </div>
                          </div>
                        </div>
                        <CheckCircle2 size={20} className="text-blue-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center bg-blue-700 p-5 rounded-2xl text-white shadow-xl animate-in slide-in-from-top-2 duration-300 z-[60]">
                <div className="flex items-center gap-5">
                  {loading ? (
                    <div className="h-14 w-14 bg-white/20 rounded-full animate-pulse" />
                  ) : student.photoUrl ? (
                    <img src={student.photoUrl} alt="Student" className="h-14 w-14 rounded-full object-cover border-2 border-white/40 shadow-sm" />
                  ) : (
                    <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center font-black text-2xl shadow-inner">{student.name.charAt(0)}</div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black leading-none">{student.name}</h2>
                    <div className="flex gap-4 text-white/80 mt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest">Reg: {student.regNo}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest border-l pl-4 border-white/30">Roll: {student.rollNo || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                <button onClick={resetSearch} className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 border border-white/10">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} /> <span>New Search</span>
                  </div>
                  <span className="opacity-70 font-bold">নতুন অনুসন্ধান | नई खोज</span>
                </button>
              </div>
            )}
          </div>

          {student && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 z-0">
              
              {/* --- SIDEBAR --- */}
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-3xl border shadow-sm text-center">
                  <div className="h-28 w-28 rounded-full mx-auto mb-5 border-4 border-blue-50 overflow-hidden bg-gray-100 relative shadow-inner">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="P" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="mx-auto mt-8 text-gray-300"/>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">{student.name}</h3>
                  <p className="text-xs font-black text-blue-600 uppercase mt-1 tracking-widest">{student.classInfo?.name}</p>
                  
                  <div className="space-y-4 border-t pt-6 mt-6">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase leading-none">Reg No (রেজিস্ট্রেশন নং)</span>
                      <span className="font-black text-gray-800 text-sm">{student.regNo}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase leading-none">Roll No (রোল নম্বর)</span>
                      <span className="font-black text-gray-800 text-sm">{student.rollNo || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase leading-none">Session (সেশন)</span>
                      <span className="font-black text-gray-800 text-sm">{activeSessionName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-3xl border shadow-sm">
                  <div className="flex flex-col mb-4 border-b pb-2">
                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest leading-none">Monthly Status</h4>
                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">মাসিক অবস্থা | मासिक स्थिति</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {allMonths.map(m => (
                      <div key={m} className={`p-2 rounded-xl border text-center transition-all ${paymentStatus[m] === 'Paid' ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                        <p className="text-[10px] font-black text-gray-600">{m}</p>
                        {paymentStatus[m] === 'Paid' ? <Check className="mx-auto text-emerald-600 mt-1" size={14} strokeWidth={3}/> : <Clock className="mx-auto text-gray-300 mt-1" size={14}/>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- MAIN BILLING AREA --- */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-col">
                      <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3 leading-none">
                          <Receipt className="text-emerald-600" /> Automated Bill
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-wide">স্বয়ংক্রিয় বিল | स्वचालित बिल</span>
                    </div>
                    <select 
                      className="p-3.5 border-2 border-gray-100 rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white min-w-[180px] transition-all"
                      value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="">Select Month | মাস বাছুন</option>
                      {allMonths.map(m => <option key={m} value={m} disabled={paymentStatus[m] === 'Paid'}>{m} {paymentStatus[m] === 'Paid' ? '(Paid | পরিশোধিত)' : ''}</option>)}
                    </select>
                  </div>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden mb-8 shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-6 py-4 text-left">
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Description</p>
                              <span className="text-[8px] font-bold text-gray-400 uppercase">বিবরণ | विवरण</span>
                          </th>
                          <th className="px-6 py-4 text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Amount</p>
                              <span className="text-[8px] font-bold text-gray-400 uppercase">পরিমাণ | राशि</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedFees.map(f => (
                          <tr key={f.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-6 py-5 font-black text-gray-700">{f.title}</td>
                            <td className="px-6 py-5 text-right font-black text-gray-900 text-lg">₹{Number(f.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        {selectedFees.length === 0 && (
                          <tr><td colSpan="2" className="p-16 text-center text-gray-400 font-bold italic uppercase tracking-widest text-xs opacity-60">Select a month to load fees.<br/><span className="text-[10px]">ফি লোড করতে একটি মাস নির্বাচন করুন</span></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3">
                    <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest">
                        <span>Subtotal (উপ-মোট)</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-3xl font-black text-blue-700 border-t border-gray-200 pt-5">
                        <div className="flex flex-col">
                              <span className="leading-none">Total Payable</span>
                              <span className="text-[10px] font-bold text-blue-400 mt-1 uppercase">মোট প্রদেয় | कुल देय</span>
                        </div>
                        <span>₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                      onClick={handleCollectFee} 
                      disabled={!selectedMonth || selectedFees.length === 0} 
                      className={`w-full mt-8 py-5 rounded-2xl font-black text-xl uppercase tracking-widest transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 shadow-2xl ${!selectedMonth || selectedFees.length === 0 ? 'bg-gray-100 text-gray-300 shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                  >
                      <span>Confirm & Print Bill</span>
                      <span className="text-[10px] font-medium opacity-80 uppercase">নিশ্চিত করুন এবং বিল প্রিন্ট করুন | पुष्टि करें और प्रिंट करें</span>
                  </button>
                </div>

                {/* History */}
                <div className="bg-white p-8 rounded-3xl border shadow-sm">
                  <div className="flex flex-col mb-6">
                      <h3 className="font-black text-gray-800 flex items-center gap-3 text-lg leading-none">
                          <Clock className="text-blue-500" size={20} /> History
                      </h3>
                      <span className="text-[10px] font-bold text-blue-400 mt-2 uppercase tracking-wide">ফি প্রদানের ইতিহাস | शुल्क इतिहास</span>
                  </div>
                  
                  <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-inner">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-400">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase">Receipt (রসিদ)</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase">Month (মাস)</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-right">Amount (পরিমাণ)</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-center">Print</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {student.feeHistory?.slice().reverse().map((fee, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/10 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-blue-600 font-black">{fee.receiptId}</td>
                            <td className="px-6 py-4 font-black text-gray-700">{fee.month || '-'}</td>
                            <td className="px-6 py-4 text-right font-black text-gray-900">₹{Number(fee.amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => { setActiveReceipt(fee); setShowReceipt(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all shadow-sm border border-blue-50 bg-white">
                                  <Printer size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!student.feeHistory || student.feeHistory.length === 0) && (
                      <div className="p-12 text-center flex flex-col items-center gap-2 opacity-40">
                          <Receipt size={40} />
                          <p className="font-black uppercase text-xs tracking-widest">No fee history found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminDashboardLayout>

      {/* --- RECEIPT MODAL --- */}
      {showReceipt && activeReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header (Modern UI - hidden on print) */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 print:hidden relative z-[110]">
              <div className="flex flex-col">
                <h4 className="font-black text-gray-800 leading-none">Receipt Generated</h4>
                <span className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">রসিদ তৈরি করা হয়েছে | रसीद तैयार</span>
              </div>
              <div className="flex gap-2">
                
                {/* WHATSAPP SHARE BUTTON */}
                <button 
                  onClick={handleWhatsAppShare} 
                  className="bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 transform active:scale-95 transition-all"
                >
                    <MessageCircle size={16}/> WhatsApp
                </button>

                <button 
                  onClick={() => window.print()} 
                  className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 transform active:scale-95 transition-all"
                >
                    <Printer size={16}/> Print
                </button>

                <button 
                  onClick={() => setShowReceipt(false)} 
                  className="bg-gray-100 text-gray-500 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-gray-200 ml-2"
                >
                    <X size={20}/>
                </button>
              </div>
            </div>
            
            {/* --- PRINT ONLY UI (Classic aesthetic - shown safely using CSS IDs) --- */}
            <div id="printable-receipt" className="font-serif text-black p-8 text-sm h-full w-full bg-white">
              {/* Receipt Header Group */}
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <p className="font-bold">Receipt No. - <span className="font-mono">{activeReceipt.receiptId}</span></p>
                  <p className="dotted-line w-32">&nbsp;</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <h1 className="text-2xl font-black uppercase leading-none">VIVEKANANDA CHILD'S MISSION</h1>
                  <p className="font-semibold text-xs mt-1">(K.G. NURSERY SCHOOL)</p>
                  <p className="text-[9px] mt-1">371/A, M. G. Road, Budge Budge, Kolkata - 700137</p>
                </div>
              </div>

              {/* Student Info Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 font-semibold mb-6">
                <div className="flex items-end">
                    <p>Student's Name</p>
                    <p className="dotted-line text-lg uppercase font-bold">{activeReceipt.studentName || student?.name}</p>
                </div>
                <div className="flex items-end">
                    <p>Class</p>
                    <p className="dotted-line text-sm uppercase">{activeReceipt.className || student?.classInfo?.name}</p>
                </div>
                <div className="flex items-end">
                    <p>Sec.</p>
                    <p className="dotted-line w-20">&nbsp;</p> {/* Sec is blank as in data */}
                    <p className="ml-4">Roll.</p>
                    <p className="dotted-line w-20 text-sm">{activeReceipt.rollNo || student?.rollNo}</p>
                </div>
              </div>

              {/* Fee Details Table (Strict Borders) */}
              <div className="flex">
                <table className="print-table w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-center w-2/3 uppercase">Subjects</th>
                      <th colSpan="2" className="text-center uppercase">Amount</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th className="text-center w-24">Rs.</th>
                      <th className="text-center w-16">P.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Map static titles to dynamic values */}
                    {staticFeeTitles.map((title, index) => {
                      const matchedFee = activeReceipt.fees?.find(f => f.title === title);
                      const rp = matchedFee ? getRupeesPaise(matchedFee.amount) : { rupees: '', paise: '' };
                      return (
                        <tr key={index} className="h-9">
                          <td className="uppercase font-semibold">{title}</td>
                          <td className="text-right font-mono text-base">{rp.rupees}</td>
                          <td className="text-center font-mono">{rp.paise}</td>
                        </tr>
                      );
                    })}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-100 font-bold h-9">
                      <td className="text-center uppercase">TOTAL</td>
                      <td className="text-right font-mono text-lg">{getRupeesPaise(activeReceipt.amount).rupees}</td>
                      <td className="text-center font-mono">{getRupeesPaise(activeReceipt.amount).paise}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Footer Section: Date, Sum in Words, Signature */}
              <div className="mt-8 flex justify-between items-start font-semibold text-xs">
                <div className="space-y-4 w-2/3">
                    <div className="flex items-end">
                        <p>Date</p>
                        <p className="dotted-line w-40 font-mono">{formatDate(activeReceipt.date)}</p>
                    </div>
                    <div className="flex items-end">
                        <p>Received the sum of Rs.</p>
                        <p className="dotted-line text-sm font-bold">{getRupeesPaise(activeReceipt.amount).rupees}</p>
                    </div>
                    <div className="flex items-end">
                        <p className="dotted-line text-sm font-bold uppercase italic">{toWords(Number(activeReceipt.amount) || 0)}</p>
                        <p className="ml-2">only (in word) as above.</p>
                    </div>
                </div>
                <div className="text-center mt-12 w-48 flex flex-col items-center">
                    <p className="dotted-line w-40">&nbsp;</p>
                    <p className="mt-2 text-[10px]">Sign. of receiving Officer</p>
                </div>
              </div>

              {/* Pre-printed borders like the image */}
              <div className="absolute top-0 right-0 h-full border-r-[5px] border-double border-black/30 pr-1"></div>
              <div className="absolute top-0 right-1 h-full border-r-[5px] border-double border-black/30 pr-1"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeesCollection;