import React, { useState, useRef } from 'react';
import { 
  Users, Download, UploadCloud, FileSpreadsheet, 
  Loader2, CheckCircle, XCircle, Activity, Play
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../firebase';
import { collection, doc, getDocs, query, where, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const MassRegistration = () => {
  const [activeTab, setActiveTab] = useState('Student');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Progress & Logs State
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState([]);
  const [fileData, setFileData] = useState(null);
  
  const fileInputRef = useRef(null);

  const addLog = (type, message) => {
    setLogs(prev => [{ type, message, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const getIdentifierField = () => activeTab === 'Student' ? 'admissionNo' : 'employeeId';

  // ==========================================================
  // SCHEMAS & DATA MAPPING HELPER FUNCTIONS
  // ==========================================================
  
  // 1. Flatten Firestore data for Excel Download
  const flattenDataForExcel = (d, role) => {
    const idField = role === 'Student' ? 'admissionNo' : 'employeeId';
    
    let baseData = {
      [idField]: d[idField] || '',
      firstName: d.firstName || '',
      middleName: d.middleName || '', // <-- ADDED MIDDLE NAME
      lastName: d.lastName || '',
      email: d.email || '',
      contactNumber: d.contactNumber || '',
      gender: d.gender || '',
      dob: d.dob || '',
      bloodGroup: d.bloodGroup || '',
      address: d.address || '',
      status: d.status || 'Active',
    };

    if (role === 'Student') {
      return {
        ...baseData,
        // Demographics
        aadhaarNo: d.aadhaarNo || '', motherTongue: d.motherTongue || '', religion: d.religion || '', nationality: d.nationality || '',
        // Address Details
        country: d.addressDetails?.country || d.country || '', state: d.addressDetails?.state || d.state || '', district: d.addressDetails?.district || d.district || '',
        locality: d.addressDetails?.locality || d.locality || '', block: d.addressDetails?.block || d.block || '', panchayat: d.addressDetails?.panchayat || d.panchayat || '',
        policeStation: d.addressDetails?.policeStation || d.policeStation || '', postOffice: d.addressDetails?.postOffice || d.postOffice || '', pinCode: d.addressDetails?.pinCode || d.pinCode || '',
        // Socio-Economic & Health
        socialCategory: d.socioEconomic?.category || d.socialCategory || '', isBpl: d.socioEconomic?.isBpl || d.isBpl || '', isAay: d.socioEconomic?.isAay || d.isAay || '',
        bplNo: d.socioEconomic?.bplNo || d.bplNo || '', isEws: d.socioEconomic?.isEws || d.isEws || '', annualFamilyIncome: d.socioEconomic?.annualFamilyIncome || d.annualFamilyIncome || '',
        isCwsn: d.healthAndSpecifics?.isCwsn || d.isCwsn || '', sldType: d.healthAndSpecifics?.sldType || d.sldType || '', isOutOfSchool: d.healthAndSpecifics?.isOutOfSchool || d.isOutOfSchool || '',
        // Bank Details
        bankName: d.bankDetails?.bankName || d.bankName || '', branchName: d.bankDetails?.branchName || d.branchName || '', ifsc: d.bankDetails?.ifsc || d.ifsc || '', accountNumber: d.bankDetails?.accountNumber || d.accountNumber || '',
        // Academic
        enrolledSession: d.academicSession || d.enrolledSession || '', enrollmentClass: d.class || d.enrollmentClass || '', section: d.section || '', rollNo: d.rollNo || '', enrollmentDate: d.admissionDate || d.enrollmentDate || '',
        prevSchoolName: d.previousSchool?.name || d.prevSchoolName || '', prevSchoolCode: d.previousSchool?.code || d.prevSchoolCode || '',
        // Parents & Guardian
        guardianQualification: d.parents?.localGuardian?.qualification || d.guardianQualification || '',
        fatherName: d.parents?.father?.name || d.fatherName || '', fatherContact: d.parents?.father?.contact || d.fatherContact || '', fatherEmail: d.parents?.father?.email || d.fatherEmail || '', fatherOccupation: d.parents?.father?.occupation || d.fatherOccupation || '', fatherAddress: d.parents?.father?.address || d.fatherAddress || '', fatherIdType: d.parents?.father?.idProof?.type || d.fatherIdType || '', fatherIdNo: d.parents?.father?.idProof?.number || d.fatherIdNo || '',
        motherName: d.parents?.mother?.name || d.motherName || '', motherContact: d.parents?.mother?.contact || d.motherContact || '', motherEmail: d.parents?.mother?.email || d.motherEmail || '', motherOccupation: d.parents?.mother?.occupation || d.motherOccupation || '', motherAddress: d.parents?.mother?.address || d.motherAddress || '', motherIdType: d.parents?.mother?.idProof?.type || d.motherIdType || '', motherIdNo: d.parents?.mother?.idProof?.number || d.motherIdNo || '',
        localGuardianName: d.parents?.localGuardian?.name || d.localGuardianName || '', localGuardianContact: d.parents?.localGuardian?.contact || d.localGuardianContact || '', localGuardianRelation: d.parents?.localGuardian?.relation || d.localGuardianRelation || '', localGuardianAddress: d.parents?.localGuardian?.address || d.localGuardianAddress || '', localGuardianIdType: d.parents?.localGuardian?.idProof?.type || d.localGuardianIdType || '', localGuardianIdNo: d.parents?.localGuardian?.idProof?.number || d.localGuardianIdNo || ''
      };
    } else {
      return {
        ...baseData,
        // Staff Specific
        idProofType: d.idProof?.type || d.idProofType || '', idProofNo: d.idProof?.number || d.idProofNo || '',
        designation: d.designation || '', qualification: d.qualification || '', joiningDate: d.joiningDate || '', experience: d.experience || '',
        maritalStatus: d.maritalStatus || '',
        nokName: d.emergencyContact?.name || d.nokName || '', nokContact: d.emergencyContact?.contact || d.nokContact || '', nokAddress: d.emergencyContact?.address || d.nokAddress || '', nokRelation: d.emergencyContact?.relation || d.nokRelation || '', nokIdType: d.emergencyContact?.idProof?.type || d.nokIdType || '', nokIdNo: d.emergencyContact?.idProof?.number || d.nokIdNo || ''
      };
    }
  };

  // 2. Build Nested Firestore Object from Flat Excel Row
  const buildFirestoreDataFromExcel = (row, role) => {
    const safeStr = (val) => (val !== undefined && val !== null) ? String(val).trim() : '';
    
    // Properly format full name by ignoring empty middle names
    const fName = safeStr(row.firstName);
    const mName = safeStr(row.middleName);
    const lName = safeStr(row.lastName);
    const fullName = [fName, mName, lName].filter(Boolean).join(' '); // <-- ADDED MIDDLE NAME LOGIC

    let data = {
      firstName: fName,
      middleName: mName, // <-- ADDED MIDDLE NAME
      lastName: lName,
      name: fullName, 
      email: safeStr(row.email), // Optional personal email
      gender: safeStr(row.gender),
      dob: safeStr(row.dob),
      bloodGroup: safeStr(row.bloodGroup),
      address: safeStr(row.address),
      status: safeStr(row.status) || 'Active',
      updatedAt: serverTimestamp()
    };

    if (role === 'Student') {
      return {
        ...data,
        aadhaarNo: safeStr(row.aadhaarNo), motherTongue: safeStr(row.motherTongue), religion: safeStr(row.religion), nationality: safeStr(row.nationality),
        admissionNo: safeStr(row.admissionNo), academicSession: safeStr(row.enrolledSession), class: safeStr(row.enrollmentClass), section: safeStr(row.section), rollNo: safeStr(row.rollNo), admissionDate: safeStr(row.enrollmentDate),
        
        addressDetails: {
          fullAddress: safeStr(row.address), country: safeStr(row.country), state: safeStr(row.state), district: safeStr(row.district),
          locality: safeStr(row.locality), block: safeStr(row.block), panchayat: safeStr(row.panchayat), policeStation: safeStr(row.policeStation),
          postOffice: safeStr(row.postOffice), pinCode: safeStr(row.pinCode)
        },
        socioEconomic: {
          category: safeStr(row.socialCategory), isBpl: safeStr(row.isBpl), isAay: safeStr(row.isAay),
          bplNo: safeStr(row.bplNo), isEws: safeStr(row.isEws), annualFamilyIncome: safeStr(row.annualFamilyIncome)
        },
        healthAndSpecifics: {
          isCwsn: safeStr(row.isCwsn), sldType: safeStr(row.sldType), isOutOfSchool: safeStr(row.isOutOfSchool)
        },
        bankDetails: {
          bankName: safeStr(row.bankName), branchName: safeStr(row.branchName), ifsc: safeStr(row.ifsc), accountNumber: safeStr(row.accountNumber)
        },
        previousSchool: {
          name: safeStr(row.prevSchoolName), code: safeStr(row.prevSchoolCode)
        },
        parents: {
          father: { name: safeStr(row.fatherName), contact: safeStr(row.fatherContact), email: safeStr(row.fatherEmail), occupation: safeStr(row.fatherOccupation), address: safeStr(row.fatherAddress), idProof: { type: safeStr(row.fatherIdType), number: safeStr(row.fatherIdNo) } },
          mother: { name: safeStr(row.motherName), contact: safeStr(row.motherContact), email: safeStr(row.motherEmail), occupation: safeStr(row.motherOccupation), address: safeStr(row.motherAddress), idProof: { type: safeStr(row.motherIdType), number: safeStr(row.motherIdNo) } },
          localGuardian: { name: safeStr(row.localGuardianName), contact: safeStr(row.localGuardianContact), relation: safeStr(row.localGuardianRelation), address: safeStr(row.localGuardianAddress), qualification: safeStr(row.guardianQualification), idProof: { type: safeStr(row.localGuardianIdType), number: safeStr(row.localGuardianIdNo) } }
        }
      };
    } else {
      return {
        ...data,
        employeeId: safeStr(row.employeeId),
        idProof: { type: safeStr(row.idProofType), number: safeStr(row.idProofNo) },
        designation: safeStr(row.designation), qualification: safeStr(row.qualification), joiningDate: safeStr(row.joiningDate), experience: safeStr(row.experience),
        maritalStatus: safeStr(row.maritalStatus),
        emergencyContact: {
          name: safeStr(row.nokName), contact: safeStr(row.nokContact), address: safeStr(row.nokAddress), relation: safeStr(row.nokRelation), idProof: { type: safeStr(row.nokIdType), number: safeStr(row.nokIdNo) }
        }
      };
    }
  };

  // ==========================================================
  // DOWNLOAD EXISTING DATA AS EXCEL
  // ==========================================================
  const handleDownloadTemplate = async () => {
    setLoading(true);
    addLog('info', `Fetching existing ${activeTab} data...`);
    try {
      const q = query(collection(db, 'users'), where('role', '==', activeTab));
      const snap = await getDocs(q);
      
      let dataToExport = [];

      if (snap.empty) {
        addLog('info', `No existing ${activeTab}s found. Generating blank template.`);
        dataToExport = [flattenDataForExcel({}, activeTab)];
      } else {
        dataToExport = snap.docs.map(doc => flattenDataForExcel(doc.data(), activeTab));
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab}s`);
      
      XLSX.writeFile(workbook, `${activeTab}_Bulk_Data_${new Date().getTime()}.xlsx`);
      addLog('success', `Successfully downloaded ${activeTab} data.`);
    } catch (err) {
      console.error(err);
      addLog('error', `Failed to download data: ${err.message}`);
    }
    setLoading(false);
  };

  // ==========================================================
  // HANDLE FILE SELECTION
  // ==========================================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    addLog('info', `Reading file: ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" }); 
        
        if (data.length === 0) throw new Error("The uploaded Excel file is empty.");
        
        setFileData(data);
        setProgress({ total: data.length, current: 0, success: 0, failed: 0 });
        addLog('success', `File loaded successfully. Found ${data.length} records ready to process.`);
      } catch (err) {
        addLog('error', `Invalid Excel file: ${err.message}`);
      }
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // ==========================================================
  // PROCESS UPLOADED DATA ROW BY ROW
  // ==========================================================
  const handleProcessData = async () => {
    if (!fileData || fileData.length === 0) return;
    
    const confirmMsg = `Are you sure you want to process ${fileData.length} records?\n\nPlease do not close this window while processing.`;
    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    setLogs([]); 
    addLog('info', 'Starting bulk processing. Please wait...');

    const idField = getIdentifierField();
    let currentSuccess = 0;
    let currentFailed = 0;

    for (let i = 0; i < fileData.length; i++) {
      const row = fileData[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      const identifier = String(row[idField] || '').trim();
      const firstName = String(row.firstName || '').trim();
      const lastName = String(row.lastName || '').trim();
      let rawContact = String(row.contactNumber || '').trim();
      
      if (!identifier || !firstName || !lastName || !rawContact) {
        addLog('error', `Row ${i+1}: Skipped. Missing mandatory fields (ID, Name, or Contact Number).`);
        currentFailed++;
        setProgress(prev => ({ ...prev, failed: currentFailed }));
        continue;
      }

      // Format and validate the phone number
      const cleanNumber = rawContact.replace(/\D/g, '').slice(-10);
      if (cleanNumber.length < 10) {
        addLog('error', `Row ${i+1}: Skipped. Invalid Contact Number. Must be 10 digits.`);
        currentFailed++;
        setProgress(prev => ({ ...prev, failed: currentFailed }));
        continue;
      }
      const finalFormattedPhone = `+91${cleanNumber}`;

      addLog('info', `Processing Row ${i+1}: ${firstName} ${lastName} (${identifier})...`);

      try {
        const qId = query(collection(db, 'users'), where(idField, '==', identifier));
        const snapId = await getDocs(qId);
        
        let existingDocId = null;
        if (!snapId.empty) {
           existingDocId = snapId.docs[0].id;
        }

        const mappedData = buildFirestoreDataFromExcel(row, activeTab);
        mappedData.contactNumber = finalFormattedPhone; // Ensure formatted phone is saved

		if (existingDocId) {
          await updateDoc(doc(db, 'users', existingDocId), mappedData);
          addLog('success', `Row ${i+1}: Updated existing profile for ${identifier}.`);
          currentSuccess++;
        } else {
          const phoneQuery = query(collection(db, 'users'), where('contactNumber', '==', finalFormattedPhone));
          const phoneSnap = await getDocs(phoneQuery);

          if (!phoneSnap.empty) {
            addLog('error', `Row ${i+1}: Skipped. Contact number ${finalFormattedPhone} is already registered.`);
            currentFailed++;
            setProgress(prev => ({ ...prev, failed: currentFailed }));
            continue;
          }

          // --- CRITICAL FIX: PRE-CREATE IN FIREBASE AUTH ---
          const permanentUid = identifier; // e.g. 20260325-01S

          const authResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/createPhoneAuthUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { targetUid: permanentUid, phoneNumber: finalFormattedPhone } })
          });
          
          const authResult = await authResponse.json();
          if (!authResponse.ok || !authResult.data?.success) {
            throw new Error(`Auth Error: ${authResult?.data?.message || 'Failed to create login account.'}`);
          }

          // CREATE NEW PROFILE WITH THE EXACT SAME ID
          const newUserRef = doc(db, 'users', permanentUid);
          const newDocData = {
            ...mappedData,
            uid: permanentUid,
            role: activeTab,
            registrationStatus: 'Completed',
            createdAt: serverTimestamp()
          };

          await setDoc(newUserRef, newDocData);
          addLog('success', `Row ${i+1}: Created NEW profile for ${identifier}.`);
          currentSuccess++;
        }
      } catch (err) {
        console.error(err);
        addLog('error', `Row ${i+1}: Failed - ${err.message}`);
        currentFailed++;
      }
      
      setProgress(prev => ({ ...prev, success: currentSuccess, failed: currentFailed }));
    }

    addLog('info', '✅ Bulk processing completed!');
    setProcessing(false);
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <Users size={32} className="text-blue-600"/> Mass Registration
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Download, Edit, and Upload Bulk Excel Data</p>
        </div>

        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2 mb-8 max-w-fit">
          {['Student', 'Teacher', 'Admin'].map((r) => (
            <button
              key={r} disabled={processing}
              onClick={() => { setActiveTab(r); setFileData(null); setLogs([]); setProgress({total:0, current:0, success:0, failed:0}); }}
              className={`px-8 py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all ${
                activeTab === r ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 disabled:opacity-50'
              }`}
            >
              {r}s
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                <Download size={28} className="text-blue-600"/>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">1. Download {activeTab} Data</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Download the comprehensive database template into an Excel file. This includes all detailed profile fields.</p>
              <button 
                onClick={handleDownloadTemplate} disabled={processing || loading}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin"/> : <FileSpreadsheet size={20}/>}
                Download Excel File
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
                <UploadCloud size={28} className="text-emerald-600"/>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">2. Upload & Process</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Upload the edited Excel file. Ensure <span className="font-bold text-gray-800">Contact Number</span> is provided as it is required for OTP login.</p>
              
              <input 
                type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange}
                className="hidden" disabled={processing}
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => fileInputRef.current.click()} disabled={processing}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Select File
                </button>
                <button 
                  onClick={handleProcessData} disabled={!fileData || processing}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {processing ? <Loader2 size={20} className="animate-spin"/> : <Play size={20}/>}
                  Start Upload
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl shadow-xl border border-gray-800 overflow-hidden flex flex-col h-[600px]">
             <div className="bg-gray-950 p-6 border-b border-gray-800">
               <h3 className="text-white font-black flex items-center gap-2 mb-4">
                 <Activity size={20} className="text-blue-500"/> Live Processing Terminal
               </h3>
               
               <div className="w-full bg-gray-800 rounded-full h-3 mb-3 overflow-hidden">
                 <div 
                   className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                   style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                 ></div>
               </div>
               
               <div className="grid grid-cols-4 gap-4 text-center">
                 <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total</div>
                   <div className="text-lg font-black text-white">{progress.total}</div>
                 </div>
                 <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Done</div>
                   <div className="text-lg font-black text-blue-400">{progress.current}</div>
                 </div>
                 <div className="bg-emerald-900/30 p-2 rounded-lg border border-emerald-900/50">
                   <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Success</div>
                   <div className="text-lg font-black text-emerald-400">{progress.success}</div>
                 </div>
                 <div className="bg-rose-900/30 p-2 rounded-lg border border-rose-900/50">
                   <div className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Failed</div>
                   <div className="text-lg font-black text-rose-400">{progress.failed}</div>
                 </div>
               </div>
             </div>

             <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-xs">
               {logs.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-gray-600 font-sans font-medium">
                   Waiting for file upload...
                 </div>
               ) : (
                 logs.map((log, idx) => (
                   <div key={idx} className="flex gap-3 p-2 rounded bg-gray-800/50 border border-gray-800">
                     <span className="text-gray-500 shrink-0">[{log.time}]</span>
                     {log.type === 'info' && <span className="text-blue-400 shrink-0">ℹ️ INFO:</span>}
                     {log.type === 'success' && <span className="text-emerald-400 shrink-0"><CheckCircle size={14} className="inline"/> OK:</span>}
                     {log.type === 'error' && <span className="text-rose-400 shrink-0"><XCircle size={14} className="inline"/> ERR:</span>}
                     <span className={`${log.type === 'error' ? 'text-rose-300' : log.type === 'success' ? 'text-emerald-300' : 'text-gray-300'}`}>
                       {log.message}
                     </span>
                   </div>
                 ))
               )}
             </div>
          </div>

        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default MassRegistration;