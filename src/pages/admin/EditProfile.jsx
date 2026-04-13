import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, GraduationCap, Camera as CameraIcon, 
  Save, FileText, Users, Heart, ArrowLeft, Loader2, 
  ExternalLink, Key, ShieldCheck, CheckCircle, Smartphone, Check, X, AlertTriangle, MapPin, Activity, Landmark
} from 'lucide-react';
import { db, storage } from '../../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

// --- CAPACITOR IMPORTS ---
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const FormInput = ({ label, type = "text", name, value, onChange, required, disabled, className = "", title, placeholder }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input 
      type={type} name={name} value={value} onChange={onChange} required={required} disabled={disabled} title={title} placeholder={placeholder}
      className={`p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-semibold ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100 focus:bg-white'}`}
    />
  </div>
);

const FormSelect = ({ label, name, value, onChange, required, children, className = "", disabled, title }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select 
      name={name} value={value} onChange={onChange} required={required} disabled={disabled} title={title}
      className={`p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 text-gray-900 hover:bg-gray-100 focus:bg-white'}`}
    >
      {children}
    </select>
  </div>
);

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

const EditProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const [role, setRole] = useState(''); 
  const [sessions, setSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [registrationStatus, setRegistrationStatus] = useState('Completed'); 
  const [registerNow, setRegisterNow] = useState(false); 

  // Success UI State
  const [successData, setSuccessData] = useState(null);

  const [formData, setFormData] = useState({
    status: 'Active',
    firstName: '', middleName: '', lastName: '', email: '', contactNumber: '',
    gender: '', dob: '', bloodGroup: '', address: '',
    idProofType: '', idProofNo: '',
    
    // Demographics
    aadhaarNo: '', motherTongue: 'Bengali', religion: 'Hindu', nationality: 'Indian',
    
    // Address
    country: 'India', state: 'West Bengal', district: '', locality: '', block: '', panchayat: '', policeStation: '', postOffice: '', pinCode: '',
    
    // Socio-Economic
    socialCategory: 'General', isBpl: 'No', isAay: 'No', bplNo: '', isEws: 'No',
    isCwsn: 'No', sldType: '', isOutOfSchool: 'No',
    
    // Bank Fields
    bankName: '', branchName: '', ifsc: '', accountNumber: '',

    // Academic
    admissionNo: '', enrolledSession: '', enrollmentClass: '', section: '', rollNo: '', enrollmentDate: '',
    prevSchoolName: '', prevSchoolCode: '',

    // Family Fields
    fatherFirstName: '', fatherMiddleName: '', fatherLastName: '', fatherContact: '', fatherEmail: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherFirstName: '', motherMiddleName: '', motherLastName: '', motherContact: '', motherEmail: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianFirstName: '', localGuardianMiddleName: '', localGuardianLastName: '', localGuardianContact: '', localGuardianAddress: '', localGuardianRelation: '', localGuardianIdType: '', localGuardianIdNo: '',
    annualFamilyIncome: '', guardianQualification: '',

    // Staff Fields
    employeeId: '', qualification: '', designation: '', 
    joiningDate: '', experience: '', maritalStatus: '', 
    nokFirstName: '', nokMiddleName: '', nokLastName: '', nokContact: '', nokAddress: '', nokRelation: '', nokIdType: '', nokIdNo: '', 
    
    doc1Name: '', doc2Name: '', doc3Name: ''
  });

  const [existingDocs, setExistingDocs] = useState({ photo: '', doc1: '', doc2: '', doc3: '' });
  const [files, setFiles] = useState({ photo: null, doc1: null, doc2: null, doc3: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionSnap = await getDocs(collection(db, 'academicSessions'));
        const sessionList = sessionSnap.docs.map(doc => ({
          id: doc.id, sessionName: doc.data().name, classes: doc.data().classes || []
        }));
        setSessions(sessionList);

        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role); 
          setRegistrationStatus(data.registrationStatus || 'Completed'); 
          setExistingDocs({
            photo: data.documents?.photo || '',
            doc1: data.documents?.doc1?.url || '', doc2: data.documents?.doc2?.url || '', doc3: data.documents?.doc3?.url || ''
          });

          if (data.academicSession) {
            const selectedSession = sessionList.find(s => s.id === data.academicSession);
            setAvailableClasses(selectedSession?.classes || []);
          }

          const mainName = splitName(data.name || '');
          const fName = splitName(data.parents?.father?.name);
          const mName = splitName(data.parents?.mother?.name);
          const lgName = splitName(data.parents?.localGuardian?.name);
          const nokName = splitName(data.emergencyContact?.name);

          // Remove the +91 for editing purely the 10-digit number
          const displayContact = (data.contactNumber || '').replace('+91', '');

          setFormData({
            status: data.status || 'Inactive', 
            firstName: data.firstName || mainName.first,
            middleName: data.middleName || mainName.middle,
            lastName: data.lastName || mainName.last,
            
            email: data.email || '',
            contactNumber: displayContact,
            gender: data.gender || '',
            dob: data.dob || '',
            bloodGroup: data.bloodGroup || '',
            address: data.address || '',
            idProofType: data.idProof?.type || '',
            idProofNo: data.idProof?.number || '',

            // Extended Demographics
            aadhaarNo: data.aadhaarNo || '',
            motherTongue: data.motherTongue || 'Bengali',
            religion: data.religion || 'Hindu',
            nationality: data.nationality || 'Indian',

            // Extended Address
            country: data.addressDetails?.country || 'India',
            state: data.addressDetails?.state || 'West Bengal',
            district: data.addressDetails?.district || '',
            locality: data.addressDetails?.locality || '',
            block: data.addressDetails?.block || '',
            panchayat: data.addressDetails?.panchayat || '',
            policeStation: data.addressDetails?.policeStation || '',
            postOffice: data.addressDetails?.postOffice || '',
            pinCode: data.addressDetails?.pinCode || '',

            // Socio-Economic
            socialCategory: data.socioEconomic?.category || 'General',
            isBpl: data.socioEconomic?.isBpl || 'No',
            isAay: data.socioEconomic?.isAay || 'No',
            bplNo: data.socioEconomic?.bplNo || '',
            isEws: data.socioEconomic?.isEws || 'No',
            annualFamilyIncome: data.socioEconomic?.annualFamilyIncome || '',

            // Health
            isCwsn: data.healthAndSpecifics?.isCwsn || 'No',
            sldType: data.healthAndSpecifics?.sldType || '',
            isOutOfSchool: data.healthAndSpecifics?.isOutOfSchool || 'No',

            // Bank
            bankName: data.bankDetails?.bankName || '',
            branchName: data.bankDetails?.branchName || '',
            ifsc: data.bankDetails?.ifsc || '',
            accountNumber: data.bankDetails?.accountNumber || '',

            // Academic
            admissionNo: data.admissionNo || '',
            enrolledSession: data.academicSession || '',
            enrollmentClass: data.class || '',
            section: data.section || '',
            rollNo: data.rollNo || '',
            enrollmentDate: data.admissionDate || '',
            prevSchoolName: data.previousSchool?.name || '',
            prevSchoolCode: data.previousSchool?.code || '',

            // Family
            fatherFirstName: data.parents?.father?.firstName || fName.first, fatherMiddleName: data.parents?.father?.middleName || fName.middle, fatherLastName: data.parents?.father?.lastName || fName.last, fatherContact: data.parents?.father?.contact || '', fatherEmail: data.parents?.father?.email || '', fatherOccupation: data.parents?.father?.occupation || '', fatherAddress: data.parents?.father?.address || '', fatherIdType: data.parents?.father?.idProof?.type || '', fatherIdNo: data.parents?.father?.idProof?.number || '',
            motherFirstName: data.parents?.mother?.firstName || mName.first, motherMiddleName: data.parents?.mother?.middleName || mName.middle, motherLastName: data.parents?.mother?.lastName || mName.last, motherContact: data.parents?.mother?.contact || '', motherEmail: data.parents?.mother?.email || '', motherOccupation: data.parents?.mother?.occupation || '', motherAddress: data.parents?.mother?.address || '', motherIdType: data.parents?.mother?.idProof?.type || '', motherIdNo: data.parents?.mother?.idProof?.number || '',
            localGuardianFirstName: data.parents?.localGuardian?.firstName || lgName.first, localGuardianMiddleName: data.parents?.localGuardian?.middleName || lgName.middle, localGuardianLastName: data.parents?.localGuardian?.lastName || lgName.last, localGuardianContact: data.parents?.localGuardian?.contact || '', localGuardianAddress: data.parents?.localGuardian?.address || '', localGuardianRelation: data.parents?.localGuardian?.relation || '', localGuardianIdType: data.parents?.localGuardian?.idProof?.type || '', localGuardianIdNo: data.parents?.localGuardian?.idProof?.number || '',
            guardianQualification: data.parents?.localGuardian?.qualification || '',

            // Staff
            employeeId: data.employeeId || '',
            qualification: data.qualification || '', designation: data.designation || '', joiningDate: data.joiningDate || '', experience: data.experience || '', maritalStatus: data.maritalStatus || 'Unmarried',
            nokFirstName: data.emergencyContact?.firstName || nokName.first, nokMiddleName: data.emergencyContact?.middleName || nokName.middle, nokLastName: data.emergencyContact?.lastName || nokName.last, nokContact: data.emergencyContact?.contact || '', nokAddress: data.emergencyContact?.address || '', nokRelation: data.emergencyContact?.relation || '', nokIdType: data.emergencyContact?.idProof?.type || '', nokIdNo: data.emergencyContact?.idProof?.number || '',

            // Docs
            doc1Name: data.documents?.doc1?.label || '', doc2Name: data.documents?.doc2?.label || '', doc3Name: data.documents?.doc3?.label || '',
          });
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

 // --- UPDATED NATIVE CAMERA & FILE HANDLER ---
  const handleNativeUpload = async (field) => {
    try {
      let photoFile;

      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false, 
          resultType: CameraResultType.Base64, // <-- CHANGED to Base64
          source: CameraSource.Prompt, 
          direction: CameraDirection.Rear, 
        });
        
        // Safely convert Base64 raw data to a Blob (Bypasses React Router HTML bug)
        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
        const blob = await response.blob();
        
        photoFile = new File([blob], `${field}_${Date.now()}.${image.format}`, { type: blob.type });
      } else {
        // Web Fallback
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

  const handleDeactivateUser = async () => {
    const confirmMessage = 
      "🚨 CRITICAL ACTION 🚨\n\n" +
      "Are you sure you want to completely DE-REGISTER this user?\n\n" +
      "1. Their Google Workspace Email will be permanently deleted.\n" +
      "2. Their Firebase Login account will be permanently deleted.\n" +
      "3. They will lose all portal access until re-registered.";

    if (window.confirm(confirmMessage)) {
      setUpdating(true);
      try {
        if (formData.email && formData.email.includes('@vivekanandachildsmission.org.in')) {
          const wsResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/deleteWorkspaceUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { userEmail: formData.email } })
          });
          const wsResult = await wsResponse.json();
          if (!wsResponse.ok || !wsResult.data?.success) console.warn("Workspace deletion warning:", wsResult?.data?.message);
        }

        const authResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/deleteFirebaseAuthUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { targetUid: userId } })
        });
        const authResult = await authResponse.json();
        if (!authResponse.ok || !authResult.data?.success) throw new Error("Failed to delete Firebase Auth user: " + authResult?.data?.message);

        await updateDoc(doc(db, 'users', userId), {
          registrationStatus: 'Pending',
          status: 'Inactive',
          email: '' 
        });

        setRegistrationStatus('Pending');
        setRegisterNow(false);
        setFormData(prev => ({ ...prev, status: 'Inactive', email: '' }));
        
        alert("Success: User completely de-registered from Google Workspace and Firebase Auth.");
      } catch (err) {
        console.error(err);
        alert("Error during de-registration: " + err.message);
      }
      setUpdating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    const cleanNumber = formData.contactNumber.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      setUpdating(false);
      return;
    }
    const finalFormattedPhone = `+91${cleanNumber}`;

    try {
      let finalRegistrationStatus = registrationStatus;
      let finalStatus = formData.status;

      // --- MANAGE CLOUD AUTHENTICATION ---
      // 1. If activating a pending account:
      if (registrationStatus === 'Pending' && registerNow) {
          const authResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/createPhoneAuthUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { targetUid: userId, phoneNumber: finalFormattedPhone } })
          });
          const authResult = await authResponse.json();
          if (!authResponse.ok || !authResult.data?.success) throw new Error(`Auth Error: ${authResult?.data?.message || 'Failed'}`);
          
          finalRegistrationStatus = 'Completed';
          finalStatus = 'Active';
      } 
      // 2. If already activated but phone number changed, update Auth!
      else if (registrationStatus === 'Completed') {
          // Check if phone changed by fetching current doc
          const currentDocSnap = await getDoc(doc(db, 'users', userId));
          if (currentDocSnap.exists() && currentDocSnap.data().contactNumber !== finalFormattedPhone) {
              const authResponse = await fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/updatePhoneAuthUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { targetUid: userId, newPhoneNumber: finalFormattedPhone } })
              });
              const authResult = await authResponse.json();
              if (!authResponse.ok || !authResult.data?.success) throw new Error(`Failed to update login phone number: ${authResult?.data?.message}`);
          }
      }
      else if (finalRegistrationStatus === 'Pending') {
        finalStatus = 'Inactive';
      }
      // ------------------------------------------------

      const getFileUrl = async (newFile, existingUrl, label) => {
        if (newFile) {
          if (existingUrl) {
            try { await deleteObject(ref(storage, existingUrl)); } catch (err) { }
          }
          const fileExtension = newFile.name.split('.').pop() || 'jpeg';
          const fileRef = ref(storage, `profiles/${role}/${userId}_${label}_${Date.now()}.${fileExtension}`);
          await uploadBytes(fileRef, newFile);
          return await getDownloadURL(fileRef);
        }
        return existingUrl;
      };

      const docUrls = {
        photo: await getFileUrl(files.photo, existingDocs.photo, 'PHOTO'),
        doc1: { url: await getFileUrl(files.doc1, existingDocs.doc1, 'DOC1'), label: formData.doc1Name },
        doc2: { url: await getFileUrl(files.doc2, existingDocs.doc2, 'DOC2'), label: formData.doc2Name },
        doc3: { url: await getFileUrl(files.doc3, existingDocs.doc3, 'DOC3'), label: formData.doc3Name },
      };

      const mainFullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');

      let finalData = {
        registrationStatus: finalRegistrationStatus,
        status: finalStatus, 
        name: mainFullName,
        firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName,
        email: formData.email, contactNumber: finalFormattedPhone,
        gender: formData.gender, dob: formData.dob, bloodGroup: formData.bloodGroup, address: formData.address,
        idProof: { type: formData.idProofType, number: formData.idProofNo },
        role: role, documents: docUrls, updatedAt: serverTimestamp(),
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

      await updateDoc(doc(db, 'users', userId), finalData);
      
      if (registrationStatus === 'Pending' && registerNow) {
        setSuccessData({ name: mainFullName, contactNumber: finalFormattedPhone });
      } else {
        alert("Profile updated successfully!");
        navigate('/admin/manage-profiles');
      }

    } catch (err) {
      console.error(err);
      setError("Update failed: " + err.message);
    }
    setUpdating(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (successData) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-3xl shadow-lg border border-gray-100 text-center animate-in zoom-in-95 duration-300">
          <CheckCircle size={80} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">{successData.name} Registered!</h1>
          <p className="text-gray-500 font-medium mt-2">This profile has successfully been linked to a new portal account.</p>
          
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
                  This user can now instantly log into their portal using this mobile number via OTP verification. Their ID will sync automatically.
                </p>
             </div>
          </div>
          <button onClick={() => navigate('/admin/manage-profiles')} className="mt-8 px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition">Return to Profiles</button>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={24} className="text-gray-600"/></button>
            <div>
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">Edit Profile</h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Updating: <span className="text-blue-600">{formData.firstName} {formData.lastName}</span></p>
            </div>
          </div>
          <div className="bg-blue-50 px-5 py-2.5 rounded-xl border border-blue-100 text-blue-700 font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <User size={18}/> {role}
          </div>
        </div>

        {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 flex items-center gap-3 border border-rose-100 font-medium"><X size={20} /> <span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* REGISTRATION TOGGLE COMPONENT */}
          {registrationStatus === 'Pending' ? (
             <div className="bg-blue-600 p-6 rounded-2xl shadow-xl shadow-blue-200 text-white flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-full"><Key size={24} /></div>
                  <div>
                     <h3 className="font-bold text-lg leading-none">Activate Portal Access?</h3>
                     <p className="text-sm text-blue-100 mt-1">This user is currently unregistered. Turn on to allow them to log in via OTP.</p>
                  </div>
               </div>
               <button type="button" onClick={() => setRegisterNow(!registerNow)} className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${registerNow ? 'bg-emerald-400' : 'bg-blue-900'}`}>
                  <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${registerNow ? 'translate-x-6' : 'translate-x-0'}`} />
               </button>
            </div>
          ) : (
             <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-700 shadow-sm">
               <div className="flex items-center gap-3">
                 <div className="bg-emerald-100 p-2 rounded-full"><ShieldCheck size={20} /></div>
                 <div>
                   <h3 className="font-black text-xs uppercase tracking-widest text-emerald-800">Portal Access Active</h3>
                   <p className="text-xs text-emerald-600 mt-0.5 font-medium">To temporarily suspend access, change Profile Status to "Inactive" below.</p>
                 </div>
               </div>
               
               <button 
                  type="button"
                  onClick={handleDeactivateUser}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border border-rose-200 shadow-sm disabled:opacity-50"
               >
                 {updating ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />} 
                 De-register User
               </button>
            </div>
          )}

          {/* SECTION 1: Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <User size={18} className="text-blue-600"/>
              <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
              <FormInput label="Middle Name" name="middleName" value={formData.middleName} onChange={handleInputChange} />
              <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
              
              <FormSelect 
                 label="Profile Status" 
                 name="status" 
                 value={registrationStatus === 'Pending' ? 'Inactive' : formData.status} 
                 onChange={handleInputChange} 
                 required 
                 disabled={registrationStatus === 'Pending'}
                 title={registrationStatus === 'Pending' ? "Unregistered profiles must remain Inactive" : "Change profile status"}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </FormSelect>

              <FormSelect label="Gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Transgender">Transgender</option><option value="Other">Other</option>
              </FormSelect>

              <FormInput label="Date of Birth" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
              
              <FormSelect label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                <option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
              </FormSelect>
              
              <div className="flex flex-col gap-1.5 md:col-span-2 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                 <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Primary Login Mobile Number *</label>
                 <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required maxLength="10" placeholder="10-digit number" className="p-2.5 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold outline-none" />
              </div>

              {role === 'Student' && (
                <>
                  <FormInput label="Aadhaar Number" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} />
                  <FormInput label="Mother Tongue" name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} />
                  <div className="flex gap-4">
                    <FormSelect label="Religion" name="religion" value={formData.religion} onChange={handleInputChange} className="flex-1">
                      <option value="Hindu">Hindu</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Christian">Christian</option>
                      <option value="Sikh">Sikh</option>
                      <option value="Buddhist">Buddhist</option>
                      <option value="Parsi">Parsi</option>
                      <option value="Jain">Jain</option>
                      <option value="Others">Others</option>
                    </FormSelect>
                    <FormSelect label="Nationality" name="nationality" value={formData.nationality} onChange={handleInputChange} className="flex-1">
                      <option value="Indian">Indian</option>
                      <option value="Other">Other</option>
                    </FormSelect>
                  </div>
                </>
              )}
              
              <FormInput 
                 label="Email (Optional)" 
                 type="email" name="email" value={formData.email} onChange={handleInputChange} 
                 className="md:col-span-3"
              />

			{role !== 'Student' && (
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <FormInput label="ID Proof Type" name="idProofType" value={formData.idProofType} placeholder="e.g., PAN Card, Voter ID" onChange={handleInputChange} className="bg-white" />
                  <FormInput label="ID Proof Number" name="idProofNo" value={formData.idProofNo} placeholder="Enter ID Number" onChange={handleInputChange} className="bg-white" />
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
              <FormInput label="Full Residential Address" name="address" value={formData.address} onChange={handleInputChange} required className="w-full" />
              
              {role === 'Student' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <FormInput label="Country" name="country" value={formData.country} onChange={handleInputChange} />
                  <FormInput label="State" name="state" value={formData.state} onChange={handleInputChange} />
                  <FormInput label="District" name="district" value={formData.district} onChange={handleInputChange} />
                  <FormInput label="Locality / Para" name="locality" value={formData.locality} onChange={handleInputChange} />
                  <FormInput label="Block / Municipality" name="block" value={formData.block} onChange={handleInputChange} />
                  <FormInput label="Panchayat / Ward" name="panchayat" value={formData.panchayat} onChange={handleInputChange} />
                  <FormInput label="Police Station" name="policeStation" value={formData.policeStation} onChange={handleInputChange} />
                  <FormInput label="Post Office" name="postOffice" value={formData.postOffice} onChange={handleInputChange} />
                  <FormInput label="PIN Code" name="pinCode" value={formData.pinCode} onChange={handleInputChange} />
                </div>
              )}
            </div>
          </div>

          {/* SECTION: Socio-Economic & Health */}
          {role === 'Student' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <Activity size={18} className="text-blue-600"/>
                <h2 className="font-black text-gray-700 uppercase text-xs tracking-widest">Socio-Economic & Health Specifics</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <FormSelect label="Social Category" name="socialCategory" value={formData.socialCategory} onChange={handleInputChange}>
                  <option value="General">General</option><option value="SC">SC</option><option value="ST">ST</option><option value="OBC-A">OBC-A</option><option value="OBC-B">OBC-B</option>
                </FormSelect>

                <FormSelect label="BPL Beneficiary?" name="isBpl" value={formData.isBpl} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                {formData.isBpl === 'Yes' && (
                  <>
                    <FormSelect label="AAY Beneficiary?" name="isAay" value={formData.isAay} onChange={handleInputChange}>
                      <option value="No">No</option><option value="Yes">Yes</option>
                    </FormSelect>
                    <FormInput label="BPL No." name="bplNo" value={formData.bplNo} onChange={handleInputChange} />
                  </>
                )}

                <FormSelect label="Belongs to EWS?" name="isEws" value={formData.isEws} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                <FormSelect label="CWSN (Special Needs)?" name="isCwsn" value={formData.isCwsn} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                {formData.isCwsn === 'Yes' && (
                  <FormSelect label="Specific Learning Disability" name="sldType" value={formData.sldType} onChange={handleInputChange} className="md:col-span-2">
                    <option value="">None / Not specified</option><option value="Dysgraphia-1">Dysgraphia-1</option><option value="Dyscalculia-2">Dyscalculia-2</option><option value="Dyslexia-3">Dyslexia-3</option>
                  </FormSelect>
                )}

                <FormSelect label="Out-of-School-Child?" name="isOutOfSchool" value={formData.isOutOfSchool} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>
              </div>
            </div>
          )}

          {/* SECTION 2: Role Specific Details */}
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
                  <FormInput label="Admission / Reg No." name="admissionNo" value={formData.admissionNo} onChange={handleInputChange} required disabled title="Assigned during Admission" />
                  
                  <FormSelect label="Enrolled Session" name="enrolledSession" value={formData.enrolledSession} disabled title="Session cannot be changed here">
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName || s.id}</option>)}
                  </FormSelect>
                  
                  <FormInput label="Enrolled Class" name="enrollmentClass" value={formData.enrollmentClass || 'Not Assigned'} disabled title="Class cannot be changed here" />
                  
                  <FormInput label="Section" name="section" value={formData.section} onChange={handleInputChange} />
                  <FormInput label="Roll No." name="rollNo" value={formData.rollNo} onChange={handleInputChange} />
                  <FormInput label="Admission Date" type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleInputChange} />

                  <div className="md:col-span-4 border-t pt-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Previous School Name" name="prevSchoolName" value={formData.prevSchoolName} onChange={handleInputChange} />
                    <FormInput label="Prev School Code No." name="prevSchoolCode" value={formData.prevSchoolCode} onChange={handleInputChange} />
                  </div>
                </>
              ) : (
                <>
                  <FormInput label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleInputChange} required disabled title="Assigned during Onboarding" />
                  <FormInput label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} required />
                  <FormInput label="Qualification" name="qualification" value={formData.qualification} onChange={handleInputChange} required />
                  <FormInput label="Date of Joining" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} />
                  <FormInput label="Experience (Years)" name="experience" value={formData.experience} onChange={handleInputChange} />
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
                  <FormInput label="Annual Family Income (₹)" name="annualFamilyIncome" value={formData.annualFamilyIncome} onChange={handleInputChange} />
                  <FormInput label="Guardian's Qualification" name="guardianQualification" value={formData.guardianQualification} onChange={handleInputChange} />
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Father's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <FormInput label="First Name" name="fatherFirstName" value={formData.fatherFirstName} onChange={handleInputChange} />
                        <FormInput label="Middle Name" name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleInputChange} />
                        <FormInput label="Last Name" name="fatherLastName" value={formData.fatherLastName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="fatherContact" value={formData.fatherContact} onChange={handleInputChange} />
                        <FormInput label="Email ID (Optional)" type="email" name="fatherEmail" value={formData.fatherEmail} onChange={handleInputChange} />
                        <FormInput label="Occupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleInputChange} />
                        <FormInput label="Address" name="fatherAddress" value={formData.fatherAddress} onChange={handleInputChange} className="md:col-span-2" />
                        <FormInput label="ID Type" name="fatherIdType" value={formData.fatherIdType} onChange={handleInputChange} className="md:col-span-2" />
                        <FormInput label="ID Number" name="fatherIdNo" value={formData.fatherIdNo} onChange={handleInputChange} className="md:col-span-2" />
                    </div>
                </div>
                <div className="space-y-3 border-t pt-6">
                    <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Mother's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <FormInput label="First Name" name="motherFirstName" value={formData.motherFirstName} onChange={handleInputChange} />
                        <FormInput label="Middle Name" name="motherMiddleName" value={formData.motherMiddleName} onChange={handleInputChange} />
                        <FormInput label="Last Name" name="motherLastName" value={formData.motherLastName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="motherContact" value={formData.motherContact} onChange={handleInputChange} />
                        <FormInput label="Email ID (Optional)" type="email" name="motherEmail" value={formData.motherEmail} onChange={handleInputChange} />
                        <FormInput label="Occupation" name="motherOccupation" value={formData.motherOccupation} onChange={handleInputChange} />
                        <FormInput label="Address" name="motherAddress" value={formData.motherAddress} onChange={handleInputChange} className="md:col-span-2" />
                        <FormInput label="ID Type" name="motherIdType" value={formData.motherIdType} onChange={handleInputChange} className="md:col-span-2" />
                        <FormInput label="ID Number" name="motherIdNo" value={formData.motherIdNo} onChange={handleInputChange} className="md:col-span-2" />
                    </div>
                </div>
                <div className="space-y-3 border-t pt-6">
                    <h3 className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Local Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/30 p-4 rounded-xl border border-blue-50">
                        <FormInput label="First Name" name="localGuardianFirstName" value={formData.localGuardianFirstName} onChange={handleInputChange} />
                        <FormInput label="Middle Name" name="localGuardianMiddleName" value={formData.localGuardianMiddleName} onChange={handleInputChange} />
                        <FormInput label="Last Name" name="localGuardianLastName" value={formData.localGuardianLastName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="localGuardianContact" value={formData.localGuardianContact} onChange={handleInputChange} />
                        <FormInput label="Relation" name="localGuardianRelation" value={formData.localGuardianRelation} onChange={handleInputChange} />
                        <FormInput label="Address" name="localGuardianAddress" value={formData.localGuardianAddress} onChange={handleInputChange} className="md:col-span-3" />
                        <FormInput label="ID Type" name="localGuardianIdType" value={formData.localGuardianIdType} onChange={handleInputChange} className="md:col-span-2" />
                        <FormInput label="ID Number" name="localGuardianIdNo" value={formData.localGuardianIdNo} onChange={handleInputChange} className="md:col-span-2" />
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
                         <FormSelect label="Marital Status" name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="md:w-1/4">
                            <option value="Unmarried">Unmarried</option><option value="Married">Married</option><option value="Divorced">Divorced</option><option value="Widowed">Widowed</option>
                        </FormSelect>
                    </div>

                    <div className="md:col-span-4 border-t pt-6">
                        <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-4">
                            {formData.maritalStatus === 'Married' ? "Spouse Details" : "Emergency Contact Details"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <FormInput label="First Name" name="nokFirstName" value={formData.nokFirstName} onChange={handleInputChange} required />
                            <FormInput label="Middle Name" name="nokMiddleName" value={formData.nokMiddleName} onChange={handleInputChange} />
                            <FormInput label="Last Name" name="nokLastName" value={formData.nokLastName} onChange={handleInputChange} required />
                            <FormInput label="Contact Number" name="nokContact" value={formData.nokContact} onChange={handleInputChange} required />
                            <FormInput label="Address" name="nokAddress" value={formData.nokAddress} onChange={handleInputChange} required className="md:col-span-4" />
                            <FormInput label="ID Type" name="nokIdType" value={formData.nokIdType} onChange={handleInputChange} className="md:col-span-2" />
                            <FormInput label="ID Number" name="nokIdNo" value={formData.nokIdNo} onChange={handleInputChange} className="md:col-span-2" />
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
                <FormInput label="Bank Name" name="bankName" value={formData.bankName} onChange={handleInputChange} />
                <FormInput label="Branch Name" name="branchName" value={formData.branchName} onChange={handleInputChange} />
                <FormInput label="IFSC Code" name="ifsc" value={formData.ifsc} onChange={handleInputChange} />
                <FormInput label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} />
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
                    <CameraIcon size={24}/> Update Photo
                  </label>
                  {existingDocs.photo && !files.photo && (
                    <a href={existingDocs.photo} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline flex items-center justify-center gap-1 mb-2 font-bold">
                      <ExternalLink size={10} /> View Current
                    </a>
                  )}
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
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document Label</label>
                        <input 
                           type="text" 
                           name={`doc${num}Name`} 
                           value={formData[`doc${num}Name`]} 
                           placeholder={`e.g., Aadhar Card`} 
                           onChange={handleInputChange} 
                           className="text-xs font-bold bg-transparent border-b border-gray-300 outline-none mb-1 focus:border-blue-400 py-1" 
                        />
                    </div>
                    {existingDocs[`doc${num}`] && !files[`doc${num}`] && (
                        <a href={existingDocs[`doc${num}`]} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline flex items-center gap-1 mb-1 font-bold">
                            <ExternalLink size={10} /> View Uploaded File
                        </a>
                    )}
                    <div className="flex flex-col gap-1 mt-2">
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

          <button disabled={updating} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest active:scale-[0.99]">
            {updating ? <><Loader2 className="animate-spin" size={24} /> Processing...</> : <><Save size={24}/> {registerNow && registrationStatus === 'Pending' ? 'Register & Update Profile' : 'Update Profile'}</>}
          </button>
        </form>
      </div>
    </AdminDashboardLayout>
  );
};

export default EditProfile;