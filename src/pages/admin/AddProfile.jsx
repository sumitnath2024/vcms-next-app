import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, GraduationCap, Camera as CameraIcon, 
  Save, FileText, Users, Heart, Key, X, Loader2, 
  CheckCircle, Copy, Check, MapPin, Activity, Landmark,
  Search, DownloadCloud, Smartphone
} from 'lucide-react';
import { db, storage } from '../../firebase';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

// --- CAPACITOR IMPORTS ---
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Helper to safely split legacy full name strings
const splitName = (fullName) => {
  if (!fullName) return { first: '', middle: '', last: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return {
      first: parts[0],
      last: parts[parts.length - 1],
      middle: parts.slice(1, -1).join(' ')
  };
};

const AddProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- Core State ---
  const [role, setRole] = useState('Student'); 
  const [sessions, setSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // --- Search Application State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('applicationNo');
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState({ type: '', text: '' });

  // Success Screen State
  const [successData, setSuccessData] = useState(null);

  // --- Form Data State ---
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '', email: '', contactNumber: '',
    gender: '', dob: '', bloodGroup: '', address: '',
    idProofType: '', idProofNo: '',
    
    // New Personal / Demographic Fields
    aadhaarNo: '', motherTongue: 'Bengali', religion: 'Hindu', nationality: 'Indian',
    
    // New Detailed Address Fields
    country: 'India', state: 'West Bengal', district: '', locality: '', block: '', panchayat: '', policeStation: '', postOffice: '', pinCode: '',
    
    // New Socio-Economic & Health Fields
    socialCategory: 'General', isBpl: 'No', isAay: 'No', bplNo: '', isEws: 'No',
    isCwsn: 'No', sldType: '', isOutOfSchool: 'No',
    
    // New Bank Fields
    bankName: '', branchName: '', ifsc: '', accountNumber: '',
    
    // Academic Fields
    admissionNo: '', enrolledSession: '', enrollmentClass: '', section: '', rollNo: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    prevSchoolName: '', prevSchoolCode: '',
    
    // Family Fields
    fatherFirstName: '', fatherMiddleName: '', fatherLastName: '', fatherContact: '', fatherEmail: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherFirstName: '', motherMiddleName: '', motherLastName: '', motherContact: '', motherEmail: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianFirstName: '', localGuardianMiddleName: '', localGuardianLastName: '', localGuardianContact: '', localGuardianAddress: '', localGuardianRelation: '', localGuardianIdType: '', localGuardianIdNo: '',
    annualFamilyIncome: '', guardianQualification: '',
    
    // Staff Fields
    employeeId: '', qualification: '', designation: '', 
    joiningDate: new Date().toISOString().split('T')[0], experience: '',
    maritalStatus: 'Unmarried', 
    nokFirstName: '', nokMiddleName: '', nokLastName: '', nokContact: '', nokAddress: '', nokRelation: '', nokIdType: '', nokIdNo: '', 
    
    // Documents
    doc1Name: '', doc2Name: '', doc3Name: ''
  });

  const [files, setFiles] = useState({ photo: null, doc1: null, doc2: null, doc3: null });

  // 1. Fetch Sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'academicSessions'));
        const sessionList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          sessionName: doc.data().name, 
          classes: doc.data().classes || []
        }));
        setSessions(sessionList);
        
        if (sessionList.length > 0) {
          setFormData(prev => ({ ...prev, enrolledSession: sessionList[0].id }));
          setAvailableClasses(sessionList[0].classes);
        }
      } catch (err) {
        console.error("Error loading sessions:", err);
      }
    };
    fetchSessions();
  }, []);

  // 2. AUTO-GENERATE FORMATTED REGISTRATION NUMBER (e.g. STU-2026-0001)
  useEffect(() => {
    const generateId = async () => {
      try {
        const idField = role === 'Student' ? 'admissionNo' : 'employeeId';
        const currentYear = new Date().getFullYear();

        // Set a readable prefix based on the role
        const rolePrefixMap = {
          'Student': 'STU',
          'Teacher': 'TCH',
          'Admin': 'ADM'
        };
        const prefixBase = rolePrefixMap[role] || 'USR';
        
        // Full search pattern e.g., "STU-2026-"
        const searchPrefix = `${prefixBase}-${currentYear}-`;

        // Query database for all IDs starting with this exact year's prefix
        const q = query(
          collection(db, 'users'),
          where(idField, '>=', searchPrefix),
          where(idField, '<=', `${searchPrefix}\uf8ff`)
        );
        
        const snap = await getDocs(q);
        
        let maxSerial = 0; 
        
        snap.forEach(doc => {
          const val = doc.data()[idField];
          if (val && val.startsWith(searchPrefix)) {
            // Strip out "STU-2026-" to get the "0001", "0042" part
            const serialPart = val.replace(searchPrefix, '');
            const num = parseInt(serialPart, 10);
            if (!isNaN(num) && num > maxSerial) {
                maxSerial = num;
            }
          }
        });
        
        // Increment the highest found number by 1, and pad with leading zeros up to 4 digits
        const nextSequence = String(maxSerial + 1).padStart(4, '0');
        const nextId = `${searchPrefix}${nextSequence}`; // e.g. STU-2026-0001
        
        setFormData(prev => ({ ...prev, [idField]: nextId }));
        
      } catch (err) {
        console.error("Error generating ID:", err);
      }
    };
    generateId();
  }, [role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    const selectedSession = sessions.find(s => s.id === sessionId);
    setFormData(prev => ({ ...prev, enrolledSession: sessionId, enrollmentClass: '' }));
    setAvailableClasses(selectedSession?.classes || []);
  };

  // --- UPDATED NATIVE CAMERA & FILE HANDLER ---
  const handleNativeUpload = async (field) => {
    try {
      let photoFile;

      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false, 
          resultType: CameraResultType.Base64, 
          source: CameraSource.Prompt, 
          direction: CameraDirection.Rear, 
        });
        
        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
        const blob = await response.blob();
        
        photoFile = new File([blob], `${field}_${Date.now()}.${image.format}`, { type: blob.type });
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,application/pdf';
        
        const filePromise = new Promise((resolve) => {
          fileInput.onchange = (e) => resolve(e.target.files[0]);
        });
        
        fileInput.click();
        photoFile = await filePromise;
      }

      if (photoFile) {
        setFiles(prev => ({ ...prev, [field]: photoFile }));
      }
    } catch (error) {
      if (error.message && !error.message.includes('User cancelled')) {
        console.error("Error selecting file:", error);
        alert("Failed to capture/select file.");
      }
    }
  };

  // --- FETCH APPLICATION LOGIC ---
  const handleFetchApplication = async () => {
    if (!searchQuery.trim()) {
      setSearchMessage({ type: 'error', text: 'Please enter a search query.' });
      return;
    }

    setIsSearching(true);
    setSearchMessage({ type: '', text: '' });

    try {
      const appsRef = collection(db, 'admission_applications');
      let appData = null;

      if (searchType === 'applicationNo') {
        const q = query(appsRef, where('applicationNo', '==', searchQuery.trim()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) appData = snapshot.docs[0].data();
      } else {
        const qFather = query(appsRef, where('fatherContact', '==', searchQuery.trim()));
        const snapFather = await getDocs(qFather);
        
        if (!snapFather.empty) {
          appData = snapFather.docs[0].data();
        } else {
          const qMother = query(appsRef, where('motherContact', '==', searchQuery.trim()));
          const snapMother = await getDocs(qMother);
          if (!snapMother.empty) appData = snapMother.docs[0].data();
        }
      }

      if (appData) {
        const sName = splitName(appData.studentName);
        const fName = splitName(appData.fatherName);
        const mName = splitName(appData.motherName);
        const lName = splitName(appData.localGuardianName);

        setFormData(prev => ({
          ...prev,
          firstName: appData.studentFirstName || sName.first,
          middleName: appData.studentMiddleName || sName.middle,
          lastName: appData.studentLastName || sName.last,
          
          gender: appData.gender || prev.gender,
          dob: appData.dob || prev.dob,
          bloodGroup: appData.bloodGroup || prev.bloodGroup,
          aadhaarNo: appData.aadhaarNo || prev.aadhaarNo,
          motherTongue: appData.motherTongue || prev.motherTongue,
          religion: appData.religion || prev.religion,
          nationality: appData.nationality || prev.nationality,
          
          address: appData.address || prev.address,
          country: appData.country || prev.country,
          state: appData.state || prev.state,
          district: appData.district || prev.district,
          locality: appData.locality || prev.locality,
          block: appData.block || prev.block,
          panchayat: appData.panchayat || prev.panchayat,
          policeStation: appData.policeStation || prev.policeStation,
          postOffice: appData.postOffice || prev.postOffice,
          pinCode: appData.pinCode || prev.pinCode,
          
          socialCategory: appData.socialCategory || prev.socialCategory,
          isBpl: appData.isBpl || prev.isBpl,
          isAay: appData.isAay || prev.isAay,
          bplNo: appData.bplNo || prev.bplNo,
          isEws: appData.isEws || prev.isEws,
          isCwsn: appData.isCwsn || prev.isCwsn,
          sldType: appData.sldType || prev.sldType,
          isOutOfSchool: appData.isOutOfSchool || prev.isOutOfSchool,
          
          bankName: appData.bankName || prev.bankName,
          branchName: appData.branchName || prev.branchName,
          ifsc: appData.ifsc || prev.ifsc,
          accountNumber: appData.accountNumber || prev.accountNumber,
          
          enrollmentClass: appData.classApplied || prev.enrollmentClass,
          prevSchoolName: appData.prevSchoolName || prev.prevSchoolName,
          prevSchoolCode: appData.prevSchoolCode || prev.prevSchoolCode,
          
          fatherFirstName: appData.fatherFirstName || fName.first,
          fatherMiddleName: appData.fatherMiddleName || fName.middle,
          fatherLastName: appData.fatherLastName || fName.last,
          fatherContact: appData.fatherContact || prev.fatherContact,
          fatherEmail: appData.fatherEmail || prev.fatherEmail,
          fatherOccupation: appData.fatherOccupation || prev.fatherOccupation,
          fatherAddress: appData.fatherAddress || prev.fatherAddress,
          fatherIdType: appData.fatherIdType || prev.fatherIdType,
          fatherIdNo: appData.fatherIdNo || prev.fatherIdNo,
          
          motherFirstName: appData.motherFirstName || mName.first,
          motherMiddleName: appData.motherMiddleName || mName.middle,
          motherLastName: appData.motherLastName || mName.last,
          motherContact: appData.motherContact || prev.motherContact,
          motherEmail: appData.motherEmail || prev.motherEmail,
          motherOccupation: appData.motherOccupation || prev.motherOccupation,
          motherAddress: appData.motherAddress || prev.motherAddress,
          motherIdType: appData.motherIdType || prev.motherIdType,
          motherIdNo: appData.motherIdNo || prev.motherIdNo,
          
          localGuardianFirstName: appData.localGuardianFirstName || lName.first,
          localGuardianMiddleName: appData.localGuardianMiddleName || lName.middle,
          localGuardianLastName: appData.localGuardianLastName || lName.last,
          localGuardianContact: appData.localGuardianContact || prev.localGuardianContact,
          localGuardianRelation: appData.localGuardianRelation || prev.localGuardianRelation,
          localGuardianAddress: appData.localGuardianAddress || prev.localGuardianAddress,
          localGuardianIdType: appData.localGuardianIdType || prev.localGuardianIdType,
          localGuardianIdNo: appData.localGuardianIdNo || prev.localGuardianIdNo,
          
          annualFamilyIncome: appData.annualFamilyIncome || prev.annualFamilyIncome,
          guardianQualification: appData.guardianQualification || prev.guardianQualification,
        }));

        setSearchMessage({ type: 'success', text: `Successfully loaded data for ${appData.studentName || appData.studentFirstName}.` });
      } else {
        setSearchMessage({ type: 'error', text: 'No application found with that information.' });
      }
    } catch (err) {
      console.error("Error fetching application:", err);
      setSearchMessage({ type: 'error', text: 'Failed to fetch data. Please try again.' });
    }
    
    setIsSearching(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanNumber = formData.contactNumber.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setLoading(false);
      return;
    }
    const finalFormattedPhone = `+91${cleanNumber}`;

    try {
      const phoneQuery = query(collection(db, 'users'), where('contactNumber', '==', finalFormattedPhone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        throw new Error(`A ${phoneSnapshot.docs[0].data().role} profile with the number ${finalFormattedPhone} already exists.`);
      }

      const permanentUid = role === 'Student' ? formData.admissionNo : formData.employeeId;

      const authResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/createPhoneAuthUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: { targetUid: permanentUid, phoneNumber: finalFormattedPhone } 
        })
      });
      
      const authResult = await authResponse.json();
      if (!authResponse.ok || !authResult.data?.success) {
        throw new Error(`Failed to create login account: ${authResult?.data?.message || 'Unknown error'}`);
      }

      const newUserRef = doc(db, 'users', permanentUid);

      const uploadFile = async (file, label) => {
        if (!file) return '';
        const fileExtension = file.name.split('.').pop() || 'jpeg';
        const fileRef = ref(storage, `profiles/${role}/${permanentUid}_${label}_${Date.now()}.${fileExtension}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
      };

      const docUrls = {
        photo: await uploadFile(files.photo, 'PHOTO'),
        doc1: { url: await uploadFile(files.doc1, 'DOC1'), label: formData.doc1Name },
        doc2: { url: await uploadFile(files.doc2, 'DOC2'), label: formData.doc2Name },
        doc3: { url: await uploadFile(files.doc3, 'DOC3'), label: formData.doc3Name },
      };

      const mainFullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');

      let finalData = {
        uid: permanentUid, 
        registrationStatus: 'Completed', 
        name: mainFullName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        email: formData.email, 
        contactNumber: finalFormattedPhone,
        gender: formData.gender, dob: formData.dob, bloodGroup: formData.bloodGroup, address: formData.address,
        idProof: { type: formData.idProofType, number: formData.idProofNo },
        role: role, status: 'Active', documents: docUrls, createdAt: serverTimestamp(),
      };

      if (role === 'Student') {
        finalData = {
          ...finalData,
          admissionNo: formData.admissionNo, academicSession: formData.enrolledSession, class: formData.enrollmentClass, section: formData.section, rollNo: formData.rollNo, admissionDate: formData.enrollmentDate, aadhaarNo: formData.aadhaarNo, motherTongue: formData.motherTongue, religion: formData.religion, nationality: formData.nationality,
          addressDetails: { fullAddress: formData.address, country: formData.country, state: formData.state, district: formData.district, locality: formData.locality, block: formData.block, panchayat: formData.panchayat, policeStation: formData.policeStation, postOffice: formData.postOffice, pinCode: formData.pinCode },
          socioEconomic: { category: formData.socialCategory, isBpl: formData.isBpl, isAay: formData.isAay, bplNo: formData.bplNo, isEws: formData.isEws, annualFamilyIncome: formData.annualFamilyIncome },
          healthAndSpecifics: { isCwsn: formData.isCwsn, sldType: formData.sldType, isOutOfSchool: formData.isOutOfSchool },
          bankDetails: { bankName: formData.bankName, branchName: formData.branchName, ifsc: formData.ifsc, accountNumber: formData.accountNumber },
          previousSchool: { name: formData.prevSchoolName, code: formData.prevSchoolCode },
          parents: {
            father: { firstName: formData.fatherFirstName, middleName: formData.fatherMiddleName, lastName: formData.fatherLastName, name: [formData.fatherFirstName, formData.fatherMiddleName, formData.fatherLastName].filter(Boolean).join(' '), contact: formData.fatherContact, email: formData.fatherEmail, occupation: formData.fatherOccupation, address: formData.fatherAddress, idProof: { type: formData.fatherIdType, number: formData.fatherIdNo } },
            mother: { firstName: formData.motherFirstName, middleName: formData.motherMiddleName, lastName: formData.motherLastName, name: [formData.motherFirstName, formData.motherMiddleName, formData.motherLastName].filter(Boolean).join(' '), contact: formData.motherContact, email: formData.motherEmail, occupation: formData.motherOccupation, address: formData.motherAddress, idProof: { type: formData.motherIdType, number: formData.motherIdNo } },
            localGuardian: { firstName: formData.localGuardianFirstName, middleName: formData.localGuardianMiddleName, lastName: formData.localGuardianLastName, name: [formData.localGuardianFirstName, formData.localGuardianMiddleName, formData.localGuardianLastName].filter(Boolean).join(' '), contact: formData.localGuardianContact, relation: formData.localGuardianRelation, address: formData.localGuardianAddress, idProof: { type: formData.localGuardianIdType, number: formData.localGuardianIdNo }, qualification: formData.guardianQualification }
          }
        };
      } else {
        finalData = {
          ...finalData,
          employeeId: formData.employeeId, qualification: formData.qualification, designation: formData.designation, joiningDate: formData.joiningDate, experience: formData.experience, maritalStatus: formData.maritalStatus,
          emergencyContact: { firstName: formData.nokFirstName, middleName: formData.nokMiddleName, lastName: formData.nokLastName, name: [formData.nokFirstName, formData.nokMiddleName, formData.nokLastName].filter(Boolean).join(' '), contact: formData.nokContact, address: formData.nokAddress, relation: formData.maritalStatus === 'Married' ? 'Spouse' : 'Parent', idProof: { type: formData.nokIdType, number: formData.nokIdNo } }
        };
      }

      await setDoc(newUserRef, finalData);
      
      setSuccessData({
        role: role, name: mainFullName,
        idNo: role === 'Student' ? formData.admissionNo : formData.employeeId,
        contactNumber: finalFormattedPhone
      });

    } catch (err) {
      console.error(err);
      setError(err.message);
    }
    setLoading(false);
  };

  if (successData) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-3xl shadow-lg border border-gray-100 text-center animate-in zoom-in-95 duration-300">
          <CheckCircle size={80} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">{successData.role} Profile Created!</h1>
          <p className="text-gray-500 font-medium mt-2">{successData.name} ({successData.idNo}) has been successfully added to the system.</p>
          
          <div className="mt-8 text-left bg-blue-50 p-6 rounded-2xl border border-blue-100">
             <p className="text-sm text-blue-800 font-bold mb-5 flex items-center gap-2">
               <Smartphone size={18}/> Portal Login Access Granted
             </p>
             <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-blue-400 uppercase tracking-widest">Registered Mobile Number</label>
                  <div className="text-2xl font-black text-gray-900 mt-1">{successData.contactNumber}</div>
                </div>
                <p className="text-xs text-blue-600 font-medium bg-blue-100 p-3 rounded-lg border border-blue-200">
                  This user can now instantly log into their portal using this mobile number via OTP verification. No password is required.
                </p>
             </div>
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Add Another</button>
            <button onClick={() => navigate('/admin/dashboard')} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition">Go to Dashboard</button>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Add New Profile</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Institutional User Onboarding</p>
          </div>
          
          <div className="bg-white p-1 rounded-xl border shadow-sm flex items-center">
            {['Student', 'Teacher', 'Admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  role === r ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-rose-100 font-medium">
            <X size={20} /> <span>{error}</span>
          </div>
        )}

        {role === 'Student' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-full"><DownloadCloud className="text-indigo-600" size={20}/></div>
              <div>
                <h3 className="font-bold text-indigo-900">Fetch Online Application</h3>
                <p className="text-xs text-indigo-600">Autofill the form using details submitted by the parent online.</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-col flex-1 w-full">
                <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">Search By</label>
                <select 
                  value={searchType} 
                  onChange={(e) => setSearchType(e.target.value)} 
                  className="input-std bg-white border-indigo-200 focus:border-indigo-500"
                >
                  <option value="applicationNo">Application Number</option>
                  <option value="contactNo">Parent Contact Number</option>
                </select>
              </div>
              
              <div className="flex flex-col flex-2 w-full md:w-1/2">
                <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 ml-1">
                  {searchType === 'applicationNo' ? "Enter App No (e.g. APP-202410-1234)" : "Enter 10-Digit Mobile Number"}
                </label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter details here..." 
                  className="input-std bg-white border-indigo-200 focus:border-indigo-500" 
                />
              </div>

              <button 
                type="button" 
                onClick={handleFetchApplication}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-indigo-600 text-white px-6 py-[0.85rem] rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50 h-[46px]"
              >
                {isSearching ? <Loader2 size={18} className="animate-spin"/> : <Search size={18} />}
                Search
              </button>
            </div>

            {searchMessage.text && (
              <div className={`mt-4 text-xs font-bold px-4 py-2 rounded-lg border inline-flex items-center gap-2 ${searchMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {searchMessage.type === 'success' ? <CheckCircle size={14}/> : <X size={14}/>}
                {searchMessage.text}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* SECTION 1: Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <User size={18} className="text-blue-600"/>
              <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="text" name="firstName" value={formData.firstName} placeholder="First Name *" required onChange={handleInputChange} className="input-std" />
              <input type="text" name="middleName" value={formData.middleName} placeholder="Middle Name" onChange={handleInputChange} className="input-std" />
              <input type="text" name="lastName" value={formData.lastName} placeholder="Last Name *" required onChange={handleInputChange} className="input-std" />
              
              <select name="gender" value={formData.gender} onChange={handleInputChange} className="input-std">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
                <option value="Other">Other</option>
              </select>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="input-std" />
              </div>
              
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} className="input-std">
                  <option value="">Select (Optional)</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>

              <div className="flex flex-col md:col-span-3 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 ml-1">Primary Login Mobile Number *</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber} placeholder="Enter 10-digit Mobile Number" required maxLength="10" onChange={handleInputChange} className="input-std border-blue-300 focus:border-blue-600 font-bold" />
                <p className="text-xs text-blue-500 mt-2 font-medium">This number will be used by the user to log into the portal via OTP.</p>
              </div>

              {role === 'Student' && (
                <>
                  <input type="text" name="aadhaarNo" value={formData.aadhaarNo} placeholder="Aadhaar Number" onChange={handleInputChange} className="input-std" />
                  <input type="text" name="motherTongue" value={formData.motherTongue} placeholder="Mother Tongue" onChange={handleInputChange} className="input-std" />
                  <div className="flex gap-4">
                    <select name="religion" value={formData.religion} onChange={handleInputChange} className="input-std">
                      <option value="Hindu">Hindu</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Christian">Christian</option>
                      <option value="Sikh">Sikh</option>
                      <option value="Buddhist">Buddhist</option>
                      <option value="Parsi">Parsi</option>
                      <option value="Jain">Jain</option>
                      <option value="Others">Others</option>
                    </select>
                    <select name="nationality" value={formData.nationality} onChange={handleInputChange} className="input-std">
                      <option value="Indian">Indian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

			{role !== 'Student' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">ID Proof Type</label>
                    <input type="text" name="idProofType" value={formData.idProofType} placeholder="e.g., PAN Card, Voter ID" onChange={handleInputChange} className="input-std bg-white" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">ID Proof Number</label>
                    <input type="text" name="idProofNo" value={formData.idProofNo} placeholder="Enter ID Number" onChange={handleInputChange} className="input-std bg-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: Address Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <MapPin size={18} className="text-blue-600"/>
              <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Address Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" name="address" value={formData.address} placeholder="Full Residential Address" onChange={handleInputChange} className="input-std w-full" />
              
              {role === 'Student' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <input type="text" name="country" placeholder="Country" value={formData.country} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="district" placeholder="District" value={formData.district} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="locality" placeholder="Habitation / Locality / Para" value={formData.locality} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="block" placeholder="Block / Municipality" value={formData.block} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="panchayat" placeholder="Panchayat / Ward" value={formData.panchayat} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="policeStation" placeholder="Police Station" value={formData.policeStation} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="postOffice" placeholder="Post Office" value={formData.postOffice} onChange={handleInputChange} className="input-std bg-white" />
                  <input type="text" name="pinCode" placeholder="PIN Code" value={formData.pinCode} onChange={handleInputChange} className="input-std bg-white" />
                </div>
              )}
            </div>
          </div>

          {/* SECTION: Socio-Economic & Health (Students Only) */}
          {role === 'Student' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <Activity size={18} className="text-blue-600"/>
                <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Socio-Economic & Health Specifics</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Social Category</label>
                  <select name="socialCategory" value={formData.socialCategory} onChange={handleInputChange} className="input-std">
                    <option value="General">General</option><option value="SC">SC</option><option value="ST">ST</option><option value="OBC-A">OBC-A</option><option value="OBC-B">OBC-B</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">BPL Beneficiary?</label>
                  <select name="isBpl" value={formData.isBpl} onChange={handleInputChange} className="input-std">
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>

                {formData.isBpl === 'Yes' && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">AAY Beneficiary?</label>
                      <select name="isAay" value={formData.isAay} onChange={handleInputChange} className="input-std">
                        <option value="No">No</option><option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">BPL No.</label>
                      <input type="text" name="bplNo" value={formData.bplNo} onChange={handleInputChange} className="input-std" />
                    </div>
                  </>
                )}

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Belongs to EWS?</label>
                  <select name="isEws" value={formData.isEws} onChange={handleInputChange} className="input-std">
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">CWSN (Special Needs)?</label>
                  <select name="isCwsn" value={formData.isCwsn} onChange={handleInputChange} className="input-std">
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>

                {formData.isCwsn === 'Yes' && (
                  <div className="flex flex-col md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Specific Learning Disability</label>
                    <select name="sldType" value={formData.sldType} onChange={handleInputChange} className="input-std">
                      <option value="">None / Not specified</option><option value="Dysgraphia-1">Dysgraphia-1</option><option value="Dyscalculia-2">Dyscalculia-2</option><option value="Dyslexia-3">Dyslexia-3</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Out-of-School-Child?</label>
                  <select name="isOutOfSchool" value={formData.isOutOfSchool} onChange={handleInputChange} className="input-std">
                    <option value="No">No</option><option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Academic / Professional Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
              {role === 'Student' ? <GraduationCap size={18} className="text-blue-600"/> : <Briefcase size={18} className="text-blue-600"/>}
              <h2 className="font-black text-blue-900 uppercase text-xs tracking-widest">
                {role === 'Student' ? 'Academic Details' : 'Professional Details'}
              </h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              {role === 'Student' ? (
                <>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Admission No (Auto) *</label>
                    <input type="text" name="admissionNo" value={formData.admissionNo} readOnly className="input-std bg-gray-100 text-gray-500 cursor-not-allowed border-dashed" title="This is auto-generated" />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Session</label>
                    <select name="enrolledSession" value={formData.enrolledSession} onChange={handleSessionChange} className="input-std">
                      {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName || s.id}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Class</label>
                    <select name="enrollmentClass" value={formData.enrollmentClass} onChange={handleInputChange} className="input-std">
                      <option value="">Select Class</option>
                      {availableClasses.map((c, idx) => <option key={idx} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Section</label>
                    <input type="text" name="section" value={formData.section} placeholder="e.g. A" onChange={handleInputChange} className="input-std" />
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Roll No</label>
                    <input type="text" name="rollNo" value={formData.rollNo} placeholder="Roll Number" onChange={handleInputChange} className="input-std" />
                  </div>

                  <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Admission Date</label>
                     <input type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleInputChange} className="input-std" />
                  </div>

                  <div className="md:col-span-4 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Previous School Name</label>
                      <input type="text" name="prevSchoolName" value={formData.prevSchoolName} placeholder="Name of previous school" onChange={handleInputChange} className="input-std" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Previous School Student Code No.</label>
                      <input type="text" name="prevSchoolCode" value={formData.prevSchoolCode} placeholder="Code No." onChange={handleInputChange} className="input-std" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Employee ID (Auto-Generated) *</label>
                    <input type="text" name="employeeId" value={formData.employeeId} readOnly className="input-std bg-gray-100 text-gray-500 cursor-not-allowed border-dashed" />
                  </div>
                  <input type="text" name="designation" placeholder="Designation (e.g., PGT Physics)" onChange={handleInputChange} className="input-std" />
                  <input type="text" name="qualification" placeholder="Qualification (e.g., M.Sc, B.Ed)" onChange={handleInputChange} className="input-std" />
                  
                  <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Date of Joining</label>
                     <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} className="input-std" />
                  </div>
                  <input type="text" name="experience" placeholder="Prior Experience (Years)" onChange={handleInputChange} className="input-std" />
                </>
              )}
            </div>
          </div>

          {/* SECTION 3: FAMILY DETAILS */}
          {role === 'Student' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <Users size={18} className="text-blue-600"/>
                <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Parents & Guardian Information</h2>
              </div>
              <div className="p-6 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="annualFamilyIncome" value={formData.annualFamilyIncome} placeholder="Annual Family Income (₹)" onChange={handleInputChange} className="input-std" />
                  <input type="text" name="guardianQualification" value={formData.guardianQualification} placeholder="Guardian's Qualification" onChange={handleInputChange} className="input-std" />
                </div>

                {/* Father */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Father's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <input type="text" name="fatherFirstName" value={formData.fatherFirstName} placeholder="First Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="fatherMiddleName" value={formData.fatherMiddleName} placeholder="Middle Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="fatherLastName" value={formData.fatherLastName} placeholder="Last Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="tel" name="fatherContact" value={formData.fatherContact} placeholder="Contact No." onChange={handleInputChange} className="input-std bg-white" />
                        <input type="email" name="fatherEmail" value={formData.fatherEmail} placeholder="Email ID (Optional)" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="fatherOccupation" value={formData.fatherOccupation} placeholder="Occupation" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="fatherAddress" value={formData.fatherAddress} placeholder="Address" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        <input type="text" name="fatherIdType" value={formData.fatherIdType} placeholder="ID Type" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        <input type="text" name="fatherIdNo" value={formData.fatherIdNo} placeholder="ID Number" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                    </div>
                </div>
                {/* Mother */}
                <div className="space-y-3 border-t pt-6">
                    <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Mother's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <input type="text" name="motherFirstName" value={formData.motherFirstName} placeholder="First Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="motherMiddleName" value={formData.motherMiddleName} placeholder="Middle Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="motherLastName" value={formData.motherLastName} placeholder="Last Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="tel" name="motherContact" value={formData.motherContact} placeholder="Contact No." onChange={handleInputChange} className="input-std bg-white" />
                        <input type="email" name="motherEmail" value={formData.motherEmail} placeholder="Email ID (Optional)" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="motherOccupation" value={formData.motherOccupation} placeholder="Occupation" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="motherAddress" value={formData.motherAddress} placeholder="Address" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        <input type="text" name="motherIdType" value={formData.motherIdType} placeholder="ID Type" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        <input type="text" name="motherIdNo" value={formData.motherIdNo} placeholder="ID Number" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                    </div>
                </div>
                {/* Local Guardian */}
                <div className="space-y-3 border-t pt-6">
                    <h3 className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Local Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/30 p-4 rounded-xl border border-blue-50">
                        <input type="text" name="localGuardianFirstName" value={formData.localGuardianFirstName} placeholder="First Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="localGuardianMiddleName" value={formData.localGuardianMiddleName} placeholder="Middle Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="localGuardianLastName" value={formData.localGuardianLastName} placeholder="Last Name" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="tel" name="localGuardianContact" value={formData.localGuardianContact} placeholder="Contact No." onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="localGuardianRelation" value={formData.localGuardianRelation} placeholder="Relation" onChange={handleInputChange} className="input-std bg-white" />
                        <input type="text" name="localGuardianAddress" value={formData.localGuardianAddress} placeholder="Address" onChange={handleInputChange} className="input-std bg-white md:col-span-3" />
                        <input type="text" name="localGuardianIdType" value={formData.localGuardianIdType} placeholder="ID Type" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        <input type="text" name="localGuardianIdNo" value={formData.localGuardianIdNo} placeholder="ID Number" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                    </div>
                </div>
              </div>
            </div>
          )}

          {role !== 'Student' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                    <Heart size={18} className="text-blue-600"/>
                    <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Family & Marital Status</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-4">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1 block">Marital Status</label>
                        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="input-std md:w-1/4">
                            <option value="Unmarried">Unmarried</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option>
                        </select>
                    </div>

                    <div className="md:col-span-4 border-t pt-6">
                        <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-4">
                            {formData.maritalStatus === 'Married' ? "Spouse Details" : "Emergency Contact Details"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <input type="text" name="nokFirstName" placeholder="First Name" onChange={handleInputChange} className="input-std bg-white" />
                            <input type="text" name="nokMiddleName" placeholder="Middle Name" onChange={handleInputChange} className="input-std bg-white" />
                            <input type="text" name="nokLastName" placeholder="Last Name" onChange={handleInputChange} className="input-std bg-white" />
                            <input type="tel" name="nokContact" placeholder="Contact Number" onChange={handleInputChange} className="input-std bg-white" />
                            <input type="text" name="nokAddress" placeholder="Residential Address" onChange={handleInputChange} className="input-std bg-white md:col-span-4" />
                            <input type="text" name="nokIdType" placeholder="ID Proof Type" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                            <input type="text" name="nokIdNo" placeholder="ID Number" onChange={handleInputChange} className="input-std bg-white md:col-span-2" />
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* SECTION: Bank Details (Student Only) */}
          {role === 'Student' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <Landmark size={18} className="text-blue-600"/>
                <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Bank Details</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" name="bankName" value={formData.bankName} placeholder="Bank Name" onChange={handleInputChange} className="input-std" />
                <input type="text" name="branchName" value={formData.branchName} placeholder="Branch Name" onChange={handleInputChange} className="input-std" />
                <input type="text" name="ifsc" value={formData.ifsc} placeholder="IFSC Code" onChange={handleInputChange} className="input-std" />
                <input type="text" name="accountNumber" value={formData.accountNumber} placeholder="Account Number" onChange={handleInputChange} className="input-std" />
              </div>
            </div>
          )}

          {/* SECTION 4: Documents */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <FileText size={18} className="text-blue-600"/>
                <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Documents & Photo</h2>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* PHOTO UPLOAD via CAPACITOR */}
                <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30 text-center hover:bg-blue-50 transition-colors">
                  <label className="text-[11px] font-black text-blue-700 flex flex-col items-center gap-2 uppercase tracking-widest">
                    <CameraIcon size={24}/> Profile Photo
                  </label>
                  <button 
                    type="button" 
                    onClick={() => handleNativeUpload('photo')} 
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {files.photo ? 'Change Photo' : 'Capture / Select'}
                  </button>
                  {files.photo && <span className="text-[10px] font-bold text-emerald-600 truncate mt-1">Ready: {files.photo.name}</span>}
                </div>
                
                {/* DOCS UPLOAD via CAPACITOR */}
                {[1, 2, 3].map(num => (
                  <div key={num} className="flex flex-col justify-between gap-2 p-4 border border-gray-100 rounded-xl hover:shadow-md transition-all bg-gray-50/50">
                    <input 
                       type="text" 
                       name={`doc${num}Name`} 
                       value={formData[`doc${num}Name`]} 
                       placeholder={`Doc ${num} Label (e.g., Aadhar)`} 
                       onChange={handleInputChange} 
                       className="text-[10px] font-bold uppercase tracking-widest bg-transparent border-b border-gray-200 outline-none mb-2 focus:border-blue-400 py-1" 
                    />
                    <div className="flex flex-col gap-1">
                      <button 
                        type="button" 
                        onClick={() => handleNativeUpload(`doc${num}`)} 
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold hover:bg-gray-300 transition-colors w-full text-center"
                      >
                        Capture / Attach
                      </button>
                      {files[`doc${num}`] && <span className="text-[9px] font-bold text-emerald-600 truncate text-center mt-1">Ready: {files[`doc${num}`].name}</span>}
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest active:scale-[0.99]">
            {loading ? <Loader2 className="animate-spin" size={24}/> : <><Save size={24}/> Register & Create {role}</>}
          </button>
        </form>
      </div>
      
      <style>{`.input-std { padding: 0.8rem 1rem; border: 1px solid #e0e7ff; background: #f8fafc; border-radius: 0.75rem; width: 100%; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; } .input-std:focus { border-color: #6366f1; outline: none; background: white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }`}</style>
    </AdminDashboardLayout>
  );
};

export default AddProfile;