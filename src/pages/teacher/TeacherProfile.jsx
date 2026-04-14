import React, { useState, useEffect } from 'react';
import { 
  Loader2, ExternalLink, Camera as CameraIcon, FileText, Edit, Save, X,
  User, Calendar, Droplet, MapPin, Mail, Briefcase, ShieldCheck, Heart, Phone, Users, Activity, Upload
} from 'lucide-react';
import { auth, db, storage } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; 
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';
import { useTeacherUser } from '../../context/TeacherUserContext';

// --- CAPACITOR IMPORTS ---
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const TeacherProfile = () => {
  const { userData, loading } = useTeacherUser();
  
  // Local state to display immediate updates without full reload
  const [localUser, setLocalUser] = useState(null);

  // --- Edit State ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- Image & Doc Upload State ---
  const [imageUploading, setImageUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [docUploading, setDocUploading] = useState(null);

  // Sync local data with context data when it loads
  useEffect(() => {
    if (userData) {
      setLocalUser(userData);
      if (userData.documents?.photo) {
        setLocalPhoto(userData.documents.photo);
      }
    }
  }, [userData]);

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
      
      // Re-build full names if individual name parts were changed for Emergency Contact
      const eContact = editData.emergencyContact || {};
      if (eContact.firstName || eContact.lastName) {
        eContact.name = [eContact.firstName, eContact.middleName, eContact.lastName].filter(Boolean).join(' ');
      }

      // Update Firestore
      await updateDoc(docRef, editData);
      
      // Update local state to reflect changes instantly
      setLocalUser(editData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    // Deep copy to prevent accidental mutations and ensure documents object exists
    const clonedData = JSON.parse(JSON.stringify(localUser));
    if (!clonedData.documents) clonedData.documents = {};
    setEditData(clonedData);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
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

      if (localUser?.documents?.photo) {
        try {
          const oldImageRef = ref(storage, localUser.documents.photo);
          await deleteObject(oldImageRef);
        } catch (e) {
          console.warn("Could not delete old image:", e);
        }
      }

      const fileExtension = photoFile.name.split('.').pop() || 'jpeg';
      const storageRef = ref(storage, `profiles/${localUser.role || 'User'}/${currentUser.uid}_PHOTO_${Date.now()}.${fileExtension}`);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', currentUser.uid), { 'documents.photo': downloadURL });
      
      setLocalPhoto(downloadURL); 
      setLocalUser(prev => ({ ...prev, documents: { ...prev?.documents, photo: downloadURL } }));

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
      const oldDoc = localUser?.documents?.[docKey];
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
      const storageRef = ref(storage, `profiles/${localUser.role || 'Teacher'}/${currentUser.uid}_${docKey.toUpperCase()}_${Date.now()}.${fileExtension}`);
      
      await uploadBytes(storageRef, docFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Preserve the currently edited label, or fallback to the original
      const currentLabel = editData?.documents?.[docKey]?.label || localUser?.documents?.[docKey]?.label || `Document ${docKey.replace('doc', '')}`;
      const updatedDocObj = { url: downloadURL, label: currentLabel };

      // Update Firestore Immediately for the URL
      await updateDoc(doc(db, 'users', currentUser.uid), {
        [`documents.${docKey}`]: updatedDocObj
      });

      // Update Local States
      setLocalUser(prev => ({ ...prev, documents: { ...prev?.documents, [docKey]: updatedDocObj } }));
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

  if (loading || !localUser) {
    return (
      <TeacherDashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-2 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="text-[10px] font-bold text-purple-400 uppercase">তথ্য লোড হচ্ছে... | डेटा लोड हो रहा है...</p>
        </div>
      </TeacherDashboardLayout>
    );
  }

  return (
    <TeacherDashboardLayout>
      <div className="p-4 sm:p-8 pb-24 font-sans">
        <div className="space-y-8 max-w-6xl mx-auto">
          
          {/* Header Profile Card */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full -mr-32 -mt-32 opacity-50 z-0"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
              
              {/* --- PROFILE IMAGE & BUTTON --- */}
              <div className="relative inline-block shrink-0">
                {imageUploading ? (
                  <div className="h-40 w-40 rounded-3xl bg-purple-50 flex items-center justify-center border-4 border-purple-100 shadow-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                  </div>
                ) : localPhoto ? (
                  <img src={localPhoto} alt="Profile" className="h-40 w-40 rounded-3xl object-cover border-4 border-purple-50 shadow-lg" />
                ) : (
                  <div className="h-40 w-40 rounded-3xl bg-purple-100 flex items-center justify-center text-purple-600 text-6xl font-black border-4 border-purple-50 shadow-lg">
                    {localUser?.firstName?.charAt(0) || localUser?.name?.charAt(0) || 'T'}
                  </div>
                )}
                
                {!isEditing && (
                  <button 
                    onClick={handleImageUpload} 
                    disabled={imageUploading}
                    className="absolute -bottom-2 -right-2 p-3 bg-purple-600 text-white rounded-2xl shadow-xl border-4 border-white transition-all disabled:opacity-50 active:scale-90 flex items-center justify-center"
                  >
                    <CameraIcon size={20}/>
                  </button>
                )}
              </div>
              
              <div className="text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight">{localUser?.name}</h2>
                  <span className="px-4 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                    {localUser?.status || 'Active'}
                  </span>
                </div>
                <p className="text-purple-700 font-black text-xl flex items-center justify-center md:justify-start gap-2">
                  <Briefcase size={24} /> {localUser?.designation || localUser?.role || 'Staff'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Employee ID / Reg No</span>
                      <span className="font-bold text-gray-700">{localUser?.employeeId || localUser?.uid || 'N/A'}</span>
                  </div> 
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Primary Contact (Auth)</span>
                      <span className="font-bold text-gray-700">{localUser?.contactNumber || 'N/A'}</span>
                  </div>                    
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 shrink-0 w-full md:w-auto flex justify-center mt-4 md:mt-0">
              {!isEditing ? (
                <button onClick={startEditing} className="px-6 py-3 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
                  <Edit size={18}/> Edit Profile Data
                </button>
              ) : (
                <div className="flex gap-3 w-full md:w-auto flex-col sm:flex-row">
                   <button onClick={handleCancelEdit} disabled={saving} className="px-6 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 w-full md:w-auto justify-center disabled:opacity-50">
                     <X size={18}/> Cancel
                   </button>
                   <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 transition-colors rounded-2xl font-black text-sm flex items-center gap-2 shadow-md w-full md:w-auto justify-center disabled:opacity-50">
                     {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Save Changes
                   </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Personal Information */}
            <SectionWrapper icon={<User />} title="Personal Details" sub="ব্যক্তিগত বিবরণ | व्यक्तिगत विवरण">
                <InfoRow icon={<User />} label="First Name (Uneditable)" sub="প্রথম নাম" value={localUser?.firstName} />
                <InfoRow icon={<User />} label="Middle Name (Uneditable)" sub="মধ্য নাম" value={localUser?.middleName} />
                <InfoRow icon={<User />} label="Last Name (Uneditable)" sub="পদবি" value={localUser?.lastName} />
                
                <EditableRow isEditing={isEditing} icon={<Calendar />} name="dob" type="date" label="Date of Birth" sub="জন্ম তারিখ" value={isEditing ? editData?.dob : localUser?.dob} onChange={handleEditChange} />
                <EditableRow isEditing={isEditing} icon={<User />} name="gender" type="select" options={['Male', 'Female', 'Transgender', 'Other']} label="Gender" sub="লিঙ্গ" value={isEditing ? editData?.gender : localUser?.gender} onChange={handleEditChange} />
                <EditableRow isEditing={isEditing} icon={<Droplet />} name="bloodGroup" type="select" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} label="Blood Group" sub="রক্তের গ্রুপ" value={isEditing ? editData?.bloodGroup : localUser?.bloodGroup} onChange={handleEditChange} />
            </SectionWrapper>

            {/* Contact & ID Details */}
            <SectionWrapper icon={<MapPin />} title="Contact & ID Details" sub="যোগাযোগ এবং আইডি | संपर्क और आईडी">
                <EditableRow isEditing={isEditing} icon={<Mail />} name="email" type="email" label="Email Address" sub="ইমেল" value={isEditing ? editData?.email : localUser?.email} onChange={handleEditChange} />
                <div className="col-span-1 sm:col-span-2">
                  <EditableRow isEditing={isEditing} icon={<MapPin />} name="address" label="Full Residential Address" sub="স্থায়ী ঠিকানা" value={isEditing ? editData?.address : localUser?.address} onChange={handleEditChange} />
                </div>
                <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3">Identity Proof / পরিচয়পত্র | पहचान पत्र</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <EditableRow isEditing={isEditing} icon={<ShieldCheck />} name="idProof.type" label="ID Proof Type" sub="e.g. Aadhar, PAN" value={isEditing ? editData?.idProof?.type : localUser?.idProof?.type} onChange={handleEditChange} />
                      <EditableRow isEditing={isEditing} icon={<FileText />} name="idProof.number" label="ID Proof Number" sub="নম্বর" value={isEditing ? editData?.idProof?.number : localUser?.idProof?.number} onChange={handleEditChange} />
                  </div>
                </div>
            </SectionWrapper>

            {/* Professional Details */}
            <SectionWrapper icon={<Briefcase />} title="Professional Details" sub="পেশাগত বিবরণ | व्यावसायिक विवरण">
                <EditableRow isEditing={isEditing} icon={<Briefcase />} name="designation" label="Designation / Subject" sub="পদবী" value={isEditing ? editData?.designation : localUser?.designation} onChange={handleEditChange} />
                <EditableRow isEditing={isEditing} icon={<FileText />} name="qualification" label="Qualification" sub="যোগ্যতা" value={isEditing ? editData?.qualification : localUser?.qualification} onChange={handleEditChange} />
                <EditableRow isEditing={isEditing} icon={<Calendar />} name="joiningDate" type="date" label="Date of Joining" sub="যোগদানের তারিখ" value={isEditing ? editData?.joiningDate : localUser?.joiningDate} onChange={handleEditChange} />
                <EditableRow isEditing={isEditing} icon={<Activity />} name="experience" label="Prior Experience (Years)" sub="পূর্ব অভিজ্ঞতা" value={isEditing ? editData?.experience : localUser?.experience} onChange={handleEditChange} />
            </SectionWrapper>

            {/* Family & Emergency */}
            <SectionWrapper icon={<Heart />} title="Family & Emergency Contact" sub="পরিবার এবং জরুরি যোগাযোগ | परिवार और आपातकालीन">
                <div className="col-span-1 sm:col-span-2 border-b border-gray-50 pb-4 mb-2">
                   <EditableRow isEditing={isEditing} icon={<Heart />} name="maritalStatus" type="select" options={['Unmarried', 'Married', 'Divorced', 'Widowed']} label="Marital Status" sub="বৈবাহিক অবস্থা" value={isEditing ? editData?.maritalStatus : localUser?.maritalStatus} onChange={handleEditChange} />
                </div>
                
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3">Emergency Contact / Spouse Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <EditableRow isEditing={isEditing} icon={<User />} name="emergencyContact.firstName" label="First Name" value={isEditing ? editData?.emergencyContact?.firstName : localUser?.emergencyContact?.firstName} onChange={handleEditChange} />
                    <EditableRow isEditing={isEditing} icon={<User />} name="emergencyContact.lastName" label="Last Name" value={isEditing ? editData?.emergencyContact?.lastName : localUser?.emergencyContact?.lastName} onChange={handleEditChange} />
                    <EditableRow isEditing={isEditing} icon={<Users />} name="emergencyContact.relation" label="Relation" sub="(e.g. Spouse, Father)" value={isEditing ? editData?.emergencyContact?.relation : localUser?.emergencyContact?.relation} onChange={handleEditChange} />
                    <EditableRow isEditing={isEditing} icon={<Phone />} name="emergencyContact.contact" label="Contact Number" value={isEditing ? editData?.emergencyContact?.contact : localUser?.emergencyContact?.contact} onChange={handleEditChange} />
                    
                    <div className="col-span-1 sm:col-span-2">
                       <EditableRow isEditing={isEditing} icon={<MapPin />} name="emergencyContact.address" label="Residential Address" value={isEditing ? editData?.emergencyContact?.address : localUser?.emergencyContact?.address} onChange={handleEditChange} />
                    </div>

                    <EditableRow isEditing={isEditing} icon={<ShieldCheck />} name="emergencyContact.idProof.type" label="ID Proof Type" value={isEditing ? editData?.emergencyContact?.idProof?.type : localUser?.emergencyContact?.idProof?.type} onChange={handleEditChange} />
                    <EditableRow isEditing={isEditing} icon={<FileText />} name="emergencyContact.idProof.number" label="ID Number" value={isEditing ? editData?.emergencyContact?.idProof?.number : localUser?.emergencyContact?.idProof?.number} onChange={handleEditChange} />
                  </div>
                </div>
            </SectionWrapper>

            {/* Documents Section */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-purple-600"/>
                  <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Documents & Identity</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 mt-1 ml-7">নথিপত্র | सत्यापित दस्तावेज़</span>
              </div>
              <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map(num => {
                  const docKey = `doc${num}`;
                  const docItem = isEditing ? editData?.documents?.[docKey] : localUser?.documents?.[docKey];
                  
                  // Handle both old string format and new object format {url: '', label: ''}
                  const url = typeof docItem === 'object' ? docItem?.url : docItem;
                  const label = typeof docItem === 'object' ? docItem?.label : `Document ${num}`;

                  if (!isEditing && !url) return null;

                  if (isEditing) {
                    return (
                      <div key={num} className="flex flex-col gap-3 p-5 border border-purple-100 rounded-2xl bg-purple-50/30 hover:shadow-sm transition-all">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Document Label</label>
                          <input
                            type="text"
                            name={`documents.${docKey}.label`}
                            value={label === `Document ${num}` ? '' : label}
                            onChange={handleEditChange}
                            placeholder={`e.g. Identity Proof`}
                            className="text-xs font-bold w-full p-2.5 border border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleDocumentUpload(docKey)}
                            disabled={docUploading === docKey}
                            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-purple-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                          >
                            {docUploading === docKey ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {url ? 'Replace' : 'Upload'}
                          </button>
                          {url && (
                            <a href={url} target="_blank" rel="noreferrer" className="p-2.5 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors" title="View Current">
                               <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <a key={num} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-purple-500 hover:shadow-xl transition-all group">
                      <div className="flex flex-col overflow-hidden w-full">
                        <span className="text-xs font-black text-gray-800 truncate">{label}</span>
                        <span className="text-[8px] font-bold text-purple-600 uppercase mt-1">Click to view / দেখুন</span>
                      </div>
                      <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-purple-600 shrink-0 ml-2" />
                    </a>
                  );
                })}
                {!isEditing && !localUser?.documents?.doc1 && !localUser?.documents?.doc2 && !localUser?.documents?.doc3 && (
                   <p className="text-sm font-bold text-gray-400 col-span-3">No additional documents uploaded.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

// --- HELPER COMPONENTS ---
const SectionWrapper = ({ icon, title, sub, children }) => (
  <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
    <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
      <div className="flex items-center gap-2">
        {React.cloneElement(icon, { size: 20, className: "text-purple-600" })}
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
    <div className="text-purple-500 mt-1 shrink-0">{React.cloneElement(icon, { size: 16 })}</div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
         {label} {sub && <span className="text-purple-600 ml-1">{sub}</span>}
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
      <div className="text-purple-500 mt-3 shrink-0">{React.cloneElement(icon, { size: 16 })}</div>
      <div className="flex-1 w-full overflow-hidden">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
          {label} {sub && <span className="text-purple-600 ml-1">{sub}</span>}
        </p>
        {type === 'select' ? (
          <select name={name} value={value || ''} onChange={onChange} className="w-full text-sm font-bold text-gray-800 p-2.5 bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={`Enter ${label}`} className="w-full text-sm font-bold text-gray-800 p-2.5 bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
        )}
      </div>
    </div>
  );
};

export default TeacherProfile;