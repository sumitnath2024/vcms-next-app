import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, User, Loader2, ExternalLink, ShieldCheck, X, 
  MapPin, Phone, Mail, Droplet, Calendar, Briefcase, GraduationCap, Users, FileText, Camera as CameraIcon,
  Activity, Landmark, ShieldQuestion, School, Edit, Save, Upload
} from 'lucide-react';
import { auth, db, storage } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import StudentDashboardLayout from '../../components/StudentDashboardLayout';

// --- CAPACITOR IMPORTS ---
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const StudentProfile = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Edit State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- Image & Doc Upload State ---
  const [imageUploading, setImageUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- DYNAMIC INPUT HANDLER FOR NESTED OBJECTS ---
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');

    setEditData((prev) => {
      const newData = { ...prev };
      let current = newData;
      
      // Traverse down the nested path, ensuring objects exist
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}; 
        current[keys[i]] = { ...current[keys[i]] }; 
        current = current[keys[i]];
      }
      // Set the final value
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // --- SAVE DATA TO FIRESTORE ---
  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      const docRef = doc(db, 'users', currentUser.uid);
      await updateDoc(docRef, editData);
      
      setUserData(editData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const startEditing = () => {
    // Deep clone the user data and ensure documents object exists
    const clonedData = JSON.parse(JSON.stringify(userData));
    if (!clonedData.documents) clonedData.documents = {};
    setEditData(clonedData);
    setIsEditing(true);
  };

  // --- NATIVE CAMERA HANDLER FOR PROFILE PHOTO ---
  const handleImageUpload = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      let photoFile;

      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: true, 
          resultType: CameraResultType.Base64, 
          source: CameraSource.Prompt, 
          direction: CameraDirection.Front, 
          width: 600
        });
        
        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
        const blob = await response.blob();
        photoFile = new File([blob], `PHOTO_${Date.now()}.${image.format}`, { type: blob.type });
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        const filePromise = new Promise((resolve) => {
          fileInput.onchange = (e) => resolve(e.target.files[0]);
        });
        fileInput.click();
        photoFile = await filePromise;
        if (!photoFile) return; 
      }

      setImageUploading(true);

      if (userData?.documents?.photo) {
        try {
          const oldImageRef = ref(storage, userData.documents.photo);
          await deleteObject(oldImageRef);
        } catch (e) {
          console.warn("Could not delete old image:", e);
        }
      }

      const fileExtension = photoFile.name.split('.').pop() || 'jpeg';
      const storageRef = ref(storage, `profiles/${userData.role || 'User'}/${currentUser.uid}_PHOTO_${Date.now()}.${fileExtension}`);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', currentUser.uid), { 'documents.photo': downloadURL });
      setUserData(prev => ({ ...prev, documents: { ...prev?.documents, photo: downloadURL } }));

    } catch (error) {
      if (error.message && !error.message.includes('User cancelled')) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image.");
      }
    } finally {
      setImageUploading(false);
    }
  };

  // --- HANDLER FOR REPLACING DOCUMENTS ---
  const handleDocumentUpload = async (docKey) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      let docFile;
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false, 
          resultType: CameraResultType.Base64, 
          source: CameraSource.Prompt
        });
        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
        const blob = await response.blob();
        docFile = new File([blob], `${docKey}_${Date.now()}.${image.format}`, { type: blob.type });
      } else {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,application/pdf';
        const filePromise = new Promise((resolve) => {
          fileInput.onchange = (e) => resolve(e.target.files[0]);
        });
        fileInput.click();
        docFile = await filePromise;
        if (!docFile) return;
      }

      setDocUploading(docKey);

      // Attempt to delete old file
      const oldDoc = userData?.documents?.[docKey];
      const oldUrl = typeof oldDoc === 'object' ? oldDoc?.url : oldDoc;
      if (oldUrl && oldUrl.includes('firebasestorage')) {
        try {
          const oldRef = ref(storage, oldUrl);
          await deleteObject(oldRef);
        } catch (e) {
          console.warn("Could not delete old document:", e);
        }
      }

      // Upload new file
      const fileExtension = docFile.name.split('.').pop() || 'jpeg';
      const storageRef = ref(storage, `profiles/${userData.role || 'Student'}/${currentUser.uid}_${docKey.toUpperCase()}_${Date.now()}.${fileExtension}`);
      
      await uploadBytes(storageRef, docFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Preserve the currently edited label, or fallback to the original
      const currentLabel = editData?.documents?.[docKey]?.label || userData?.documents?.[docKey]?.label || `Document ${docKey.replace('doc', '')}`;
      const updatedDocObj = { url: downloadURL, label: currentLabel };

      // Update Firestore Immediately for the URL
      await updateDoc(doc(db, 'users', currentUser.uid), {
        [`documents.${docKey}`]: updatedDocObj
      });

      // Update Local States
      setUserData(prev => ({ ...prev, documents: { ...prev?.documents, [docKey]: updatedDocObj } }));
      if (isEditing) {
        setEditData(prev => ({ ...prev, documents: { ...prev?.documents, [docKey]: updatedDocObj } }));
      }

    } catch (error) {
      if (error.message && !error.message.includes('User cancelled')) {
        console.error("Error uploading document:", error);
        alert("Failed to upload document.");
      }
    } finally {
      setDocUploading(null);
    }
  };

  return (
    <StudentDashboardLayout>
      <div className="p-4 sm:p-8 pb-24 font-sans">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-gray-500 font-black tracking-widest uppercase text-sm">Loading Profile...</p>
          </div>
        ) : userData ? (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Header Profile Card */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50 z-0"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
                <div className="relative inline-block shrink-0">
                  {imageUploading ? (
                    <div className="h-40 w-40 rounded-3xl bg-emerald-50 flex items-center justify-center border-4 border-emerald-100 shadow-lg">
                      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    </div>
                  ) : userData.documents?.photo ? (
                    <img src={userData.documents.photo} alt="Profile" className="h-40 w-40 rounded-3xl object-cover border-4 border-emerald-50 shadow-lg" />
                  ) : (
                    <div className="h-40 w-40 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 text-6xl font-black border-4 border-emerald-50 shadow-lg">
                      {userData.firstName?.charAt(0) || userData.name?.charAt(0)}
                    </div>
                  )}
                  
                  {!isEditing && (
                    <button 
                      onClick={handleImageUpload} 
                      disabled={imageUploading}
                      className="absolute -bottom-2 -right-2 p-3 bg-emerald-600 text-white rounded-2xl shadow-xl border-4 border-white transition-all disabled:opacity-50 active:scale-90 flex items-center justify-center"
                    >
                      <CameraIcon size={20}/>
                    </button>
                  )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">{userData.name}</h2>
                    <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                      {userData.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-emerald-700 font-black text-xl flex items-center justify-center md:justify-start gap-2">
                    <GraduationCap size={24} /> Class / শ্রেণী | कक्षा: {userData.class || userData.classEnrolled || 'N/A'}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Admission No / ভর্তি নম্বর</span>
                        <span className="font-bold text-gray-700">{userData.admissionNo || 'N/A'}</span>
                    </div> 
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Primary Contact (Auth)</span>
                        <span className="font-bold text-gray-700">{userData.contactNumber || 'N/A'}</span>
                    </div>                    
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="relative z-10 shrink-0 w-full md:w-auto flex justify-center mt-4 md:mt-0">
                {!isEditing ? (
                  <button onClick={startEditing} className="px-6 py-3 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
                    <Edit size={18}/> Edit Profile Data
                  </button>
                ) : (
                  <div className="flex gap-3 w-full md:w-auto flex-col sm:flex-row">
                     <button onClick={handleCancelEdit} disabled={saving} className="px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 w-full md:w-auto justify-center disabled:opacity-50">
                       <X size={18}/> Cancel
                     </button>
                     <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 shadow-md w-full md:w-auto justify-center disabled:opacity-50">
                       {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Save Changes
                     </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Personal Information */}
              <SectionWrapper icon={<User />} title="Personal Details" sub="ব্যক্তিগত বিবরণ | व्यक्तिगत विवरण">
                  <InfoRow icon={<User />} label="First Name (Uneditable)" sub="প্রথম নাম" value={userData.firstName} />
                  <InfoRow icon={<User />} label="Middle Name (Uneditable)" sub="মধ্য নাম" value={userData.middleName} />
                  <InfoRow icon={<User />} label="Last Name (Uneditable)" sub="পদবি" value={userData.lastName} />
                  
                  <EditableRow isEditing={isEditing} icon={<Calendar />} name="dob" type="date" label="Date of Birth" sub="জন্ম তারিখ" value={isEditing ? editData.dob : userData.dob} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<User />} name="gender" type="select" options={['Male', 'Female', 'Transgender', 'Other']} label="Gender" sub="লিঙ্গ" value={isEditing ? editData.gender : userData.gender} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<Droplet />} name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} label="Blood Group" sub="রক্তের গ্রুপ" value={isEditing ? editData.bloodGroup : userData.bloodGroup} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<FileText />} name="aadhaarNo" label="Aadhaar Number" sub="আধার নম্বর" value={isEditing ? editData.aadhaarNo : userData.aadhaarNo} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MessageSquareSub />} name="motherTongue" label="Mother Tongue" sub="মাতৃভাষা" value={isEditing ? editData.motherTongue : userData.motherTongue} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<ShieldCheck />} name="religion" type="select" options={['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Others']} label="Religion" sub="ধর্ম" value={isEditing ? editData.religion : userData.religion} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<Landmark />} name="nationality" type="select" options={['Indian', 'Other']} label="Nationality" sub="জাতীয়তা" value={isEditing ? editData.nationality : userData.nationality} onChange={handleEditChange} />
              </SectionWrapper>

              {/* Address Information */}
              <SectionWrapper icon={<MapPin />} title="Address Details" sub="ঠিকানা | पता विवरण">
                  <div className="col-span-1 sm:col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                       <span>Residential Address / স্থায়ী ঠিকানা | आवासीय पता</span>
                    </p>
                    {isEditing ? (
                      <textarea name="addressDetails.fullAddress" value={editData.addressDetails?.fullAddress || ''} onChange={handleEditChange} className="w-full mt-2 p-3 text-sm font-bold bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" rows={2}/>
                    ) : (
                      <p className="font-bold text-gray-800 text-sm leading-relaxed">{userData.addressDetails?.fullAddress || userData.address}</p>
                    )}
                  </div>
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.district" label="District" sub="জেলা" value={isEditing ? editData.addressDetails?.district : userData.addressDetails?.district} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.policeStation" label="Police Station" sub="থানা" value={isEditing ? editData.addressDetails?.policeStation : userData.addressDetails?.policeStation} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.postOffice" label="Post Office" sub="ডাকঘর" value={isEditing ? editData.addressDetails?.postOffice : userData.addressDetails?.postOffice} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.pinCode" label="PIN Code" sub="পিন কোড" value={isEditing ? editData.addressDetails?.pinCode : userData.addressDetails?.pinCode} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.block" label="Block / Mun." sub="ব্লক" value={isEditing ? editData.addressDetails?.block : userData.addressDetails?.block} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="addressDetails.panchayat" label="Panchayat / Ward" sub="পঞ্চায়েত" value={isEditing ? editData.addressDetails?.panchayat : userData.addressDetails?.panchayat} onChange={handleEditChange} />
              </SectionWrapper>

              {/* Academic & Health */}
              <SectionWrapper icon={<School />} title="Academic & Health" sub="শিক্ষাগত এবং স্বাস্থ্য | शैक्षणिक और स्वास्थ्य">
                  <EditableRow isEditing={isEditing} icon={<Calendar />} name="admissionDate" type="date" label="Admission Date" sub="ভর্তির তারিখ" value={isEditing ? editData.admissionDate : userData.admissionDate} onChange={handleEditChange} />
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Previous Schooling / পূর্ববর্তী স্কুল | पिछला स्कूल</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <EditableRow isEditing={isEditing} icon={<School />} name="previousSchool.name" label="School Name" sub="স্কুলের নাম" value={isEditing ? editData.previousSchool?.name : userData.previousSchool?.name} onChange={handleEditChange} />
                        <EditableRow isEditing={isEditing} icon={<FileText />} name="previousSchool.code" label="Student Code" sub="স্টুডেন্ট কোড" value={isEditing ? editData.previousSchool?.code : userData.previousSchool?.code} onChange={handleEditChange} />
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">Health & Specifics / স্বাস্থ্য বিবরণ | स्वास्थ्य विवरण</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <EditableRow isEditing={isEditing} icon={<Activity />} name="healthAndSpecifics.isCwsn" type="select" options={['No', 'Yes']} label="CWSN Status" sub="প্রতিবন্ধী স্থিতি" value={isEditing ? editData.healthAndSpecifics?.isCwsn : userData.healthAndSpecifics?.isCwsn} onChange={handleEditChange} />
                        <EditableRow isEditing={isEditing} icon={<ShieldQuestion />} name="healthAndSpecifics.isOutOfSchool" type="select" options={['No', 'Yes']} label="Out of School" sub="স্কুলের বাইরে" value={isEditing ? editData.healthAndSpecifics?.isOutOfSchool : userData.healthAndSpecifics?.isOutOfSchool} onChange={handleEditChange} />
                    </div>
                  </div>
              </SectionWrapper>

              {/* Socio-Economic & Bank */}
              <SectionWrapper icon={<Landmark />} title="Socio-Economic & Bank" sub="আর্থ-সামাজিক ও ব্যাংক | सामाजिक-आर्थिक और बैंक">
                  <EditableRow isEditing={isEditing} icon={<Users />} name="socioEconomic.category" type="select" options={['General', 'SC', 'ST', 'OBC-A', 'OBC-B']} label="Social Category" sub="সামাজিক বিভাগ" value={isEditing ? editData.socioEconomic?.category : userData.socioEconomic?.category} onChange={handleEditChange} />
                  <EditableRow isEditing={isEditing} icon={<FileText />} name="socioEconomic.isBpl" type="select" options={['No', 'Yes']} label="BPL Status" sub="বিপিএল স্থিতি" value={isEditing ? editData.socioEconomic?.isBpl : userData.socioEconomic?.isBpl} onChange={handleEditChange} />
                  
                  {((isEditing && editData.socioEconomic?.isBpl === 'Yes') || (!isEditing && userData.socioEconomic?.isBpl === 'Yes')) && (
                    <EditableRow isEditing={isEditing} icon={<FileText />} name="socioEconomic.bplNo" label="BPL Card No" sub="বিপিএল কার্ড নম্বর" value={isEditing ? editData.socioEconomic?.bplNo : userData.socioEconomic?.bplNo} onChange={handleEditChange} />
                  )}
                  
                  <EditableRow isEditing={isEditing} icon={<Landmark />} name="socioEconomic.annualFamilyIncome" type="number" label="Annual Income (₹)" sub="বার্ষিক আয়" value={isEditing ? editData.socioEconomic?.annualFamilyIncome : userData.socioEconomic?.annualFamilyIncome} onChange={handleEditChange} />
                  
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Bank Details / ব্যাংক অ্যাকাউন্ট | बैंक खाता</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                        <EditableRow isEditing={isEditing} icon={<Landmark />} name="bankDetails.bankName" label="Bank Name" sub="ব্যাংকের নাম" value={isEditing ? editData.bankDetails?.bankName : userData.bankDetails?.bankName} onChange={handleEditChange} />
                        <EditableRow isEditing={isEditing} icon={<Landmark />} name="bankDetails.ifsc" label="IFSC Code" sub="আইএফএসসি কোড" value={isEditing ? editData.bankDetails?.ifsc : userData.bankDetails?.ifsc} onChange={handleEditChange} />
                        <EditableRow isEditing={isEditing} icon={<FileText />} name="bankDetails.accountNumber" label="Account No" sub="অ্যাকাউন্ট নম্বর" value={isEditing ? editData.bankDetails?.accountNumber : userData.bankDetails?.accountNumber} onChange={handleEditChange} />
                        <EditableRow isEditing={isEditing} icon={<MapPin />} name="bankDetails.branchName" label="Branch" sub="শাখা" value={isEditing ? editData.bankDetails?.branchName : userData.bankDetails?.branchName} onChange={handleEditChange} />
                    </div>
                  </div>
              </SectionWrapper>

              {/* Family Information */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-emerald-600"/>
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Family Information</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 ml-7">পরিবার বিবরণ | परिवार की जानकारी</span>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <EditableFamilyCard 
                    isEditing={isEditing} onChange={handleEditChange}
                    title="Father" sub="বাবা" pathPrefix="parents.father"
                    data={isEditing ? editData.parents?.father : userData.parents?.father} 
                  />
                  <EditableFamilyCard 
                    isEditing={isEditing} onChange={handleEditChange}
                    title="Mother" sub="মা" pathPrefix="parents.mother"
                    data={isEditing ? editData.parents?.mother : userData.parents?.mother} 
                  />
                  <EditableFamilyCard 
                    isEditing={isEditing} onChange={handleEditChange}
                    title="Guardian" sub="অভিভাবক" pathPrefix="parents.localGuardian" hasRelation={true}
                    data={isEditing ? editData.parents?.localGuardian : userData.parents?.localGuardian} 
                    theme="bg-emerald-50" 
                  />
                </div>
              </div>

              {/* Documents Section */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600"/>
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Documents & Identity</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 ml-7">নথিপত্র | सत्यापित दस्तावेज़</span>
                </div>
                
                <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[1, 2, 3].map(num => {
                    const docKey = `doc${num}`;
                    const docItem = isEditing ? editData?.documents?.[docKey] : userData?.documents?.[docKey];
                    const url = typeof docItem === 'object' ? docItem?.url : docItem;
                    const label = typeof docItem === 'object' ? docItem?.label : `Document ${num}`;

                    if (!isEditing && !url) return null;

                    if (isEditing) {
                      return (
                        <div key={num} className="flex flex-col gap-3 p-5 border border-emerald-100 rounded-2xl bg-emerald-50/30 hover:shadow-sm transition-all">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Document Label</label>
                            <input
                              type="text"
                              name={`documents.${docKey}.label`}
                              value={label === `Document ${num}` ? '' : label}
                              onChange={handleEditChange}
                              placeholder="e.g. ID Proof"
                              className="text-xs font-bold w-full p-2.5 border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleDocumentUpload(docKey)}
                              disabled={docUploading === docKey}
                              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                              {docUploading === docKey ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                              {url ? 'Replace File' : 'Upload File'}
                            </button>
                            {url && (
                              <a href={url} target="_blank" rel="noreferrer" className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors" title="View Current">
                                <ExternalLink size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <a key={num} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-emerald-500 hover:shadow-xl transition-all group">
                        <div className="flex flex-col overflow-hidden w-full">
                          <span className="text-xs font-black text-gray-800 truncate">{label}</span>
                          <span className="text-[8px] font-bold text-emerald-600 uppercase mt-1">Click to view / দেখুন</span>
                        </div>
                        <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 shrink-0 ml-2" />
                      </a>
                    );
                  })}
                  {!isEditing && !userData?.documents?.doc1 && !userData?.documents?.doc2 && !userData?.documents?.doc3 && (
                    <p className="text-sm font-bold text-gray-400 col-span-3">No additional documents uploaded.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest">No profile data found.</div>
        )}
      </div>
    </StudentDashboardLayout>
  );
};

// --- HELPER COMPONENTS ---
const SectionWrapper = ({ icon, title, sub, children }) => (
  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
    <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
      <div className="flex items-center gap-2">
        {React.cloneElement(icon, { size: 20, className: "text-emerald-600" })}
        <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">{title}</h3>
      </div>
      <span className="text-[10px] font-bold text-gray-400 mt-1 ml-7">{sub}</span>
    </div>
    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
      {children}
    </div>
  </div>
);

const InfoRow = ({ icon, label, sub, value }) => (
  <div className="flex items-start gap-3">
    <div className="text-emerald-500 mt-1 shrink-0">{React.cloneElement(icon, { size: 16 })}</div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
         {label} {sub && <span className="text-emerald-600 ml-1">{sub}</span>}
      </p>
      <p className="font-bold text-gray-800 text-sm truncate mt-1.5">{value || <span className="text-gray-300 italic font-medium">N/A</span>}</p>
    </div>
  </div>
);

const EditableRow = ({ icon, label, sub, value, name, onChange, isEditing, type = "text", options = [] }) => {
  if (!isEditing) {
    return <InfoRow icon={icon} label={label} sub={sub} value={value} />;
  }

  return (
    <div className="flex items-start gap-3">
      <div className="text-emerald-500 mt-3 shrink-0">{React.cloneElement(icon, { size: 16 })}</div>
      <div className="flex-1 w-full overflow-hidden">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
          {label} {sub && <span className="text-emerald-600 ml-1">{sub}</span>}
        </p>
        {type === 'select' ? (
          <select name={name} value={value || ''} onChange={onChange} className="w-full text-sm font-bold text-gray-800 p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={`Enter ${label}`} className="w-full text-sm font-bold text-gray-800 p-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
        )}
      </div>
    </div>
  );
};

const EditableFamilyCard = ({ title, sub, data, pathPrefix, onChange, isEditing, hasRelation = false, theme = "bg-gray-50" }) => {
  const fName = data?.firstName || '';
  const mName = data?.middleName || '';
  const lName = data?.lastName || '';
  const contact = data?.contact || '';
  const occ = data?.occupation || '';
  const idNo = data?.idProof?.number || '';
  const relation = data?.relation || '';

  return (
    <div className={`${theme} p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full`}>
      <div className="mb-4">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">{title}</p>
          <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{sub}</p>
      </div>
      
      <div className="grid grid-cols-1 gap-1 mb-3 bg-white/60 p-3 rounded-xl border border-gray-200/50 flex-grow">
          {['First', 'Middle', 'Last'].map((n) => {
             const val = n === 'First' ? fName : n === 'Middle' ? mName : lName;
             const nameAttr = `${pathPrefix}.${n.toLowerCase()}Name`;
             return (
              <div key={n} className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0 gap-1 sm:gap-2">
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none w-16">{n} Name</span>
                 {isEditing ? (
                   <input type="text" name={nameAttr} value={val} onChange={onChange} className="text-xs font-bold w-full sm:w-2/3 p-1.5 border border-emerald-200 rounded bg-white focus:outline-none focus:border-emerald-500" />
                 ) : (
                   <span className="text-xs font-bold text-gray-800 sm:text-right">{val || '-'}</span>
                 )}
              </div>
             )
          })}
      </div>

      {hasRelation && (
         <div className="mb-3">
           {isEditing ? (
             <input type="text" name={`${pathPrefix}.relation`} value={relation} onChange={onChange} placeholder="Relation" className="text-[10px] font-bold w-full p-2 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500 uppercase" />
           ) : relation ? (
             <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded inline-block uppercase">{relation}</span>
           ) : null}
         </div>
      )}
      
      <div className="mt-2 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
              <Phone size={14} className="text-gray-400 shrink-0"/> 
              {isEditing ? <input type="text" name={`${pathPrefix}.contact`} value={contact} onChange={onChange} placeholder="Contact No" className="w-full p-1.5 border border-emerald-200 rounded bg-white focus:outline-none focus:border-emerald-500"/> : (contact || 'N/A')}
          </div>
          {!hasRelation && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
                <Briefcase size={14} className="text-gray-400 shrink-0"/> 
                {isEditing ? <input type="text" name={`${pathPrefix}.occupation`} value={occ} onChange={onChange} placeholder="Occupation" className="w-full p-1.5 border border-emerald-200 rounded bg-white focus:outline-none focus:border-emerald-500"/> : (occ || 'N/A')}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
              <FileText size={14} className="text-gray-400 shrink-0"/> 
              {isEditing ? <input type="text" name={`${pathPrefix}.idProof.number`} value={idNo} onChange={onChange} placeholder="ID Number" className="w-full p-1.5 border border-emerald-200 rounded bg-white focus:outline-none focus:border-emerald-500"/> : `ID: ${idNo || 'N/A'}`}
          </div>
      </div>
    </div>
  );
};

const MessageSquareSub = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

export default StudentProfile;