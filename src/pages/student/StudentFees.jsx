import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, Receipt, Loader2, CheckCircle2, Clock, 
  History, User, Wallet, Check, Lock, Printer, X, MessageCircle
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { toWords } from 'number-to-words'; 
import { db } from '../../firebase';
import StudentDashboardLayout from '../../components/StudentDashboardLayout';
import { useStudentUser } from '../../context/StudentUserContext';

const StudentFees = () => {
  const { user } = useStudentUser();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [studentProfile, setStudentProfile] = useState(null);
  const [allClassFees, setAllClassFees] = useState([]); 
  const [paymentHistory, setPaymentHistory] = useState([]); 
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeSessionName, setActiveSessionName] = useState('');

  // Receipt Modal States
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Constants
  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const staticFeeTitles = [
    "Admission Fee", "Tution Fee", "Devl. Fee", "Transfer Fee",
    "Session Fee", "Game Fee", "Examination Fee", "Miscellaneous Charges"
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(db, 'academicSessions'), where('isActive', '==', true));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const sessionData = snap.docs[0].data();
          setActiveSessionName(sessionData.name);
          const allClasses = sessionData.classes || [];

          let foundClass = null;
          let foundStudent = null;

          for (const cls of allClasses) {
            const match = cls.students?.find(s => s.uid === user.uid);
            if (match) {
              foundClass = cls;
              foundStudent = match;
              break;
            }
          }

          if (foundStudent) {
            let photoUrl = null;
            try {
               const userDoc = await getDoc(doc(db, 'users', user.uid));
               if (userDoc.exists()) {
                   const uData = userDoc.data();
                   photoUrl = uData.documents?.photo || uData.photo;
               }
            } catch (e) {}

            setStudentProfile({
                ...foundStudent,
                photoUrl: photoUrl || foundStudent.photoUrl,
                className: foundClass?.name
            });
            
            const history = foundStudent.feeHistory || [];
            setPaymentHistory(history);
          }

          if (foundClass) {
            const fees = foundClass.fees || [];
            setAllClassFees(fees);
          }
          
          const currentShortMonth = new Date().toLocaleString('default', { month: 'short' });
          if (allMonths.includes(currentShortMonth)) {
             setSelectedMonth(currentShortMonth);
          } else {
             setSelectedMonth("Jan");
          }
        }
      } catch (err) {
        console.error("Error fetching fees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const activeMonthData = useMemo(() => {
    if (!selectedMonth) return null;
    
    const feesForMonth = allClassFees.filter(f => {
        if (f.month === selectedMonth) return true;
        if (f.selectedMonths && Array.isArray(f.selectedMonths) && f.selectedMonths.includes(selectedMonth)) return true;
        return false;
    });
    
    const receipt = paymentHistory.find(p => p.month === selectedMonth);
    const isPaid = !!receipt;
    const totalAmount = feesForMonth.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    return {
      fees: feesForMonth,
      total: totalAmount,
      isPaid,
      receipt
    };
  }, [selectedMonth, allClassFees, paymentHistory]);

  // Helpers for Receipt formatting
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
      `*Student:* ${activeReceipt.studentName || studentProfile?.name}\n` +
      `*Class:* ${activeReceipt.className || studentProfile?.className}\n` +
      `*Reg No:* ${activeReceipt.regNo || studentProfile?.regNo}\n\n` +
      `*Total Paid:* ₹${Number(activeReceipt.amount).toFixed(2)}\n` +
      `*Month:* ${activeReceipt.month}\n\n` +
      `Thank you! ✅`;

    const encodedText = encodeURIComponent(textMessage);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <>
      {/* --- BULLETPROOF PRINT CSS --- */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          /* Force colors to print accurately */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          .dotted-line {
            border-bottom: 1px dotted black;
            flex-grow: 1;
            margin-left: 5px;
          }
        }
      `}</style>

      {/* CRITICAL FIX: We wrap the entire dashboard layout in a "print:hidden" div. 
        This completely removes the sidebar and scroll areas from the browser's 
        print calculation, ensuring the receipt prints perfectly.
      */}
      <div className="print:hidden">
        <StudentDashboardLayout>
          <div className="max-w-7xl mx-auto space-y-6 pb-10 px-4 font-sans">
            
            {loading ? (
               <div className="flex flex-col items-center justify-center py-40 gap-3">
                  <Loader2 className="animate-spin text-emerald-600" size={40} />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loading Fees...</p>
               </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                   
                   {/* --- LEFT COLUMN (Profile & Status) --- */}
                   <div className="lg:col-span-1 space-y-6">
                      
                      {/* Profile Card */}
                      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                         <div className="h-24 w-24 rounded-2xl mx-auto mb-4 border-4 border-emerald-50 overflow-hidden bg-gray-50 relative shadow-inner">
                            {studentProfile?.photoUrl ? (
                               <img src={studentProfile.photoUrl} alt="User" className="h-full w-full object-cover" />
                            ) : (
                               <User size={40} className="text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                         </div>
                         <h2 className="text-xl font-black text-gray-800 leading-tight">{studentProfile?.name}</h2>
                         <p className="text-xs font-black text-emerald-600 uppercase mt-1 tracking-wider">{studentProfile?.className}</p>

                         <div className="border-t border-gray-100 mt-6 pt-4 space-y-4 text-left">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Reg No</span>
                                    <span className="text-[8px] font-bold text-gray-300 uppercase">রেজিস্ট্রেশন</span>
                                </div>
                                <span className="font-black text-gray-700">{studentProfile?.regNo}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Roll No</span>
                                    <span className="text-[8px] font-bold text-gray-300 uppercase">রোল নম্বর</span>
                                </div>
                                <span className="font-black text-gray-700">{studentProfile?.rollNo}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Session</span>
                                    <span className="text-[8px] font-bold text-gray-300 uppercase">সেশন</span>
                                </div>
                                <span className="font-black text-gray-700">{activeSessionName}</span>
                            </div>
                         </div>
                      </div>

                      {/* Monthly Status Grid */}
                      <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                         <div className="mb-4 border-b border-gray-50 pb-2">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Fee Status</h4>
                            <p className="text-[8px] font-bold text-gray-300 uppercase mt-1">ফি স্ট্যাটাস</p>
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                            {allMonths.map(m => {
                               const isPaid = paymentHistory.some(p => p.month === m);
                               return (
                                  <div key={m} className={`p-2 rounded-xl border text-center transition-all ${isPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                     <p className="text-[10px] font-black text-gray-500">{m}</p>
                                     {isPaid ? <Check className="mx-auto text-emerald-600 mt-1" size={14} strokeWidth={3}/> : <Clock className="mx-auto text-gray-300 mt-1" size={14}/>}
                                  </div>
                               );
                            })}
                         </div>
                      </div>
                   </div>

                   {/* --- RIGHT COLUMN (Bill & History) --- */}
                   <div className="lg:col-span-3 space-y-6">
                      
                      {/* Automated Bill Card */}
                      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3 leading-none">
                                <Wallet className="text-emerald-600" /> Automated Bill
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-9">স্বয়ংক্রিয় বিল / स्वचालित बिल</p>
                            </div>
                            
                            <div className="flex flex-col w-full md:w-auto">
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 px-2">Select Month / মাস</span>
                                <select 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="p-3 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 min-w-[180px] cursor-pointer appearance-none shadow-sm"
                                >
                                    <option value="">Select Month</option>
                                    {allMonths.map(m => {
                                        const isPaid = paymentHistory.some(p => p.month === m);
                                        return <option key={m} value={m} disabled={isPaid}>{m} {isPaid ? '(Paid / পরিশোধিত)' : ''}</option>;
                                    })}
                                </select>
                            </div>
                         </div>

                         {/* Fees Table Area */}
                         <div className="border border-gray-100 rounded-3xl overflow-hidden mb-6 flex-1 shadow-inner">
                            <table className="w-full text-sm">
                               <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                  <tr>
                                     <th className="px-6 py-4 text-left">
                                        <span>Description</span>
                                        <span className="block text-[8px] opacity-70">বিবরণ</span>
                                     </th>
                                     <th className="px-6 py-4 text-right">
                                        <span>Amount</span>
                                        <span className="block text-[8px] opacity-70">পরিমাণ</span>
                                     </th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                  {activeMonthData?.fees.length > 0 ? (
                                     activeMonthData.fees.map((fee, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                           <td className="px-6 py-4 font-bold text-gray-700">{fee.title || fee.name || "Fee Item"}</td>
                                           <td className="px-6 py-4 text-right font-black text-gray-900 text-lg">₹{fee.amount}</td>
                                        </tr>
                                     ))
                                  ) : (
                                     <tr>
                                        <td colSpan="2" className="p-20 text-center">
                                           <Receipt className="mx-auto text-gray-200 mb-2" size={48} />
                                           <p className="text-gray-400 font-bold italic">
                                              {selectedMonth ? `No fee structure found for ${selectedMonth}.` : 'Select a month to load automated fees.'}
                                           </p>
                                        </td>
                                     </tr>
                                  )}
                               </tbody>
                            </table>
                         </div>

                         {/* Totals Section */}
                         <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-3 mb-6">
                            <div className="flex justify-between items-center">
                               <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-gray-400 uppercase leading-none">Subtotal</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">উপ-মোট</span>
                               </div>
                               <span className="font-black text-gray-600 text-lg">₹{activeMonthData?.total.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-2">
                               <div className="flex flex-col">
                                    <span className="text-sm font-black text-emerald-700 uppercase leading-none tracking-tight">Total Payable</span>
                                    <span className="text-[9px] font-bold text-emerald-600 uppercase mt-1">মোট প্রদেয়</span>
                               </div>
                               <span className="text-3xl font-black text-emerald-700 tracking-tighter">₹{activeMonthData?.total.toFixed(2) || "0.00"}</span>
                            </div>
                         </div>

                         {/* Action Button */}
                         {activeMonthData?.isPaid ? (
                             <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl text-center font-black border border-emerald-200 flex flex-col items-center justify-center gap-1 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={20} /> 
                                    <span>Payment Already Cleared</span>
                                </div>
                                <span className="text-[10px] font-bold uppercase opacity-70">পেমেন্ট সম্পন্ন হয়েছে</span>
                             </div>
                         ) : (
                             <button 
                               disabled={true} 
                               className="w-full py-5 rounded-2xl font-black text-lg bg-gray-100 text-gray-400 cursor-not-allowed flex flex-col items-center justify-center gap-0 border border-gray-200 transition-all"
                             >
                               <div className="flex items-center gap-2">
                                    <Lock size={18} /> 
                                    <span>Online Payment Coming Soon</span>
                               </div>
                               <span className="text-[10px] font-bold uppercase opacity-70 mt-1">অনলাইন পেমেন্ট শীঘ্রই আসছে</span>
                             </button>
                         )}
                      </div>

                      {/* History Section */}
                      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                         <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                                <History className="text-emerald-600" size={22} /> Payment History
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-8">পেমেন্ট ইতিহাস</p>
                         </div>

                         <div className="overflow-hidden border border-gray-100 rounded-3xl shadow-inner">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-widest">
                                  <tr>
                                     <th className="px-6 py-4">Receipt</th>
                                     <th className="px-6 py-4">Month</th>
                                     <th className="px-6 py-4 text-right">Amount</th>
                                     <th className="px-6 py-4 text-center">Receipt</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                  {paymentHistory.length > 0 ? (
                                     [...paymentHistory].reverse().map((fee, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                           <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-black">{fee.receiptId}</td>
                                           <td className="px-6 py-4 font-black text-gray-700">{fee.month || '-'}</td>
                                           <td className="px-6 py-4 text-right font-black text-gray-900 text-lg">₹{parseFloat(fee.amount).toFixed(2)}</td>
                                           <td className="px-6 py-4 text-center">
                                              <button 
                                                onClick={() => { setActiveReceipt(fee); setShowReceipt(true); }} 
                                                className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition-all shadow-sm border border-emerald-50 bg-white"
                                              >
                                                  <Printer size={18} />
                                              </button>
                                           </td>
                                        </tr>
                                     ))
                                  ) : (
                                     <tr>
                                        <td colSpan="4" className="p-10 text-center text-gray-400 font-bold italic text-sm">No payment history found.</td>
                                     </tr>
                                  )}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>

                </div>
              </>
            )}
          </div>
        </StudentDashboardLayout>
      </div>

      {/* --- RECEIPT MODAL --- */}
      {showReceipt && activeReceipt && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md print:static print:bg-white print:block print:p-0">
          {/* CRITICAL FIX: Note the print:static, print:w-full, print:shadow-none. 
            This forces the modal to become a normal, full-page document during printing. 
          */}
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:rounded-none animate-in zoom-in-95 duration-200 print:animate-none print:m-0">
            
            {/* Modal Toolbar (hidden on print) */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 print:hidden">
              <div className="flex flex-col">
                <h4 className="font-black text-gray-800 leading-none">Receipt Details</h4>
                <span className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">রশিদ</span>
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
                  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transform active:scale-95 transition-all"
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
            
            {/* --- THE RECEIPT CONTENT (Visible on screen and print) --- */}
            <div className="font-serif text-black p-8 text-sm w-full bg-white print:p-0">
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
                    <p className="dotted-line text-lg uppercase font-bold">{activeReceipt.studentName || studentProfile?.name}</p>
                </div>
                <div className="flex items-end">
                    <p>Class</p>
                    <p className="dotted-line text-sm uppercase">{activeReceipt.className || studentProfile?.className}</p>
                </div>
                <div className="flex items-end">
                    <p>Sec.</p>
                    <p className="dotted-line w-20">&nbsp;</p> 
                    <p className="ml-4">Roll.</p>
                    <p className="dotted-line w-20 text-sm">{activeReceipt.rollNo || studentProfile?.rollNo}</p>
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
              <div className="absolute top-0 right-0 h-full border-r-[5px] border-double border-black/30 pr-1 hidden print:block"></div>
              <div className="absolute top-0 right-1 h-full border-r-[5px] border-double border-black/30 pr-1 hidden print:block"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentFees;