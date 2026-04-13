import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Camera as CameraIcon, FileText } from 'lucide-react';
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
  
  // --- Image Upload State ---
  const [imageUploading, setImageUploading] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(null);

  // Sync local photo with context data when it loads
  useEffect(() => {
    if (userData?.documents?.photo) {
      setLocalPhoto(userData.documents.photo);
    }
  }, [userData]);

// --- UPDATED NATIVE CAMERA HANDLER ---
  const handleImageUpload = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      let photoFile;

      // 1. IF NATIVE MOBILE (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: true, 
          resultType: CameraResultType.Base64, // <-- CHANGED to Base64
          source: CameraSource.Prompt, 
          direction: CameraDirection.Front, 
          width: 600
        });
        
        // Safely convert Base64 raw data to a Blob
        const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
        const blob = await response.blob();
        
        photoFile = new File([blob], `PHOTO_${Date.now()}.${image.format}`, { type: blob.type });
      } 
      // 2. IF WEB BROWSER FALLBACK
      else {
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

      // 3. DELETE THE OLD PHOTO
      if (userData?.documents?.photo) {
        try {
          const oldImageRef = ref(storage, userData.documents.photo);
          await deleteObject(oldImageRef);
        } catch (e) {
          console.warn("Could not delete old image:", e);
        }
      }

      // 4. Create reference & Upload
      const fileExtension = photoFile.type.split('/')[1] || 'jpeg';
      const storageRef = ref(storage, `profiles/${userData.role || 'User'}/${currentUser.uid}_PHOTO_${Date.now()}.${fileExtension}`);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', currentUser.uid), { 'documents.photo': downloadURL });
      
      // Update local UI (Use setLocalPhoto for Teacher, setUserData for Student based on your existing code)
      if (typeof setLocalPhoto === 'function') {
         setLocalPhoto(downloadURL); // For TeacherProfile
      } else {
         setUserData(prev => ({ ...prev, documents: { ...prev?.documents, photo: downloadURL } })); // For StudentProfile
      }

    } catch (error) {
      if (error.message && !error.message.includes('User cancelled')) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image.");
      }
    } finally {
      setImageUploading(false);
    }
  };

  if (loading) {
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
      <div className="animate-in fade-in duration-500">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 max-w-4xl mx-auto">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-gray-100 pb-6">
            
            {/* --- PROFILE IMAGE & BUTTON --- */}
            <div className="relative inline-block shrink-0">
              {imageUploading ? (
                <div className="h-24 w-24 rounded-full bg-purple-50 flex items-center justify-center border-4 border-purple-100 shadow-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : localPhoto ? (
                <img src={localPhoto} alt="Profile" className="h-24 w-24 rounded-full object-cover border-4 border-purple-100 shadow-sm" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-3xl font-bold uppercase border-4 border-purple-50 shadow-sm">
                  {userData?.firstName?.charAt(0) || userData?.name?.charAt(0) || 'T'}
                </div>
              )}

              <button
                onClick={handleImageUpload}
                disabled={imageUploading}
                className="absolute bottom-0 right-0 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg border-2 border-white transition-all disabled:opacity-50 active:scale-95 cursor-pointer flex items-center justify-center"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-gray-900 leading-none">{userData?.name}</h2>
              <p className="text-[10px] font-bold text-purple-600 mt-2 uppercase tracking-widest">শিক্ষকের প্রোফাইল | शिक्षक प्रोफाइल</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                 <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 uppercase tracking-wider">{userData?.role}</span>
                 <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 uppercase tracking-wider">{userData?.status}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
            <InfoBlock label="First Name" subLabel="প্রথম নাম | पहला नाम" value={userData?.firstName} />
            <InfoBlock label="Middle Name" subLabel="মধ্য নাম | मध्य नाम" value={userData?.middleName} />
            <InfoBlock label="Last Name" subLabel="পদবি | अंतिम नाम" value={userData?.lastName} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-100 pb-8">
            <InfoBlock label="Email Address" subLabel="ইমেল ঠিকানা | ईमेल पता" value={userData?.email} />
            <InfoBlock label="Primary Subject" subLabel="প্রধান বিষয় | प्राथमिक विषय" value={userData?.subjectTaught || 'Not Assigned'} />
            <InfoBlock label="Qualification" subLabel="যোগ্যতা | योग्यता" value={userData?.qualification || 'Not Assigned'} />
          </div>

          <div className="mt-8">
            <div className="flex flex-col mb-4 border-b border-gray-100 pb-2">
                <h3 className="text-lg font-bold text-gray-800 leading-none flex items-center gap-2">
                    <FileText size={20} className="text-purple-600" /> My Documents
                </h3>
                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest ml-7">আমার নথি | मेरे दस्तावेज़</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {userData?.documents?.doc1 && <DocLink href={userData.documents.doc1} title="Professional Certification" />}
              {userData?.documents?.doc2 && <DocLink href={userData.documents.doc2} title="Academic Transcript" />}
              {userData?.documents?.doc3 && <DocLink href={userData.documents.doc3} title="Identity Verification" />}
              
              {!userData?.documents?.doc1 && !userData?.documents?.doc2 && !userData?.documents?.doc3 && (
                <p className="text-sm text-gray-400 italic">No additional documents uploaded | কোনো নথি নেই</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </TeacherDashboardLayout>
  );
};

// Internal Helper Components
const InfoBlock = ({ label, subLabel, value }) => (
  <div className="flex flex-col">
    <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-[9px] font-bold text-purple-400 uppercase mt-1 leading-none">{subLabel}</p>
    <p className="font-bold text-gray-800 mt-2 text-base truncate">{value || '-'}</p>
  </div>
);

const DocLink = ({ href, title }) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noreferrer" 
    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
  >
    <div className="flex items-center gap-3 w-full">
        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 group-hover:text-blue-600 transition-colors shrink-0">
            <ExternalLink className="h-4 w-4" />
        </div>
        <span className="text-xs font-bold text-gray-700 group-hover:text-blue-800 truncate leading-tight w-full">{title}</span>
    </div>
  </a>
);

export default TeacherProfile;