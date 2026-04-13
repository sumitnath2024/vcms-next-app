import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, User, Loader2, ExternalLink, ShieldCheck, X, 
  MapPin, Phone, Mail, Droplet, Calendar, Briefcase, GraduationCap, Users, FileText, Camera as CameraIcon,
  Activity, Landmark, ShieldQuestion, School
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

  // --- Image Upload State ---
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserData(docSnap.data());
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
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                
                {/* --- PROFILE IMAGE & BUTTON --- */}
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
                  
                  <button 
                    onClick={handleImageUpload} 
                    disabled={imageUploading}
                    className="absolute -bottom-2 -right-2 p-3 bg-emerald-600 text-white rounded-2xl shadow-xl border-4 border-white transition-all disabled:opacity-50 active:scale-90 flex items-center justify-center"
                  >
                    <CameraIcon size={20}/>
                  </button>
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
                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">Admission No / ভর্তি নম্বর | प्रवेश संख्या</span>
                        <span className="font-bold text-gray-700">{userData.admissionNo || 'N/A'}</span>
                    </div>                    
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Personal Information */}
              <SectionWrapper icon={<User />} title="Personal Details" sub="ব্যক্তিগত বিবরণ | व्यक्तिगत विवरण">
                  <InfoRow icon={<User />} label="First Name" sub="প্রথম নাম | पहला नाम" value={userData.firstName} />
                  <InfoRow icon={<User />} label="Middle Name" sub="মধ্য নাম | मध्य नाम" value={userData.middleName} />
                  <InfoRow icon={<User />} label="Last Name" sub="পদবি | अंतिम नाम" value={userData.lastName} />
                  <InfoRow icon={<Calendar />} label="Date of Birth" sub="জন্ম তারিখ | जन्म तिथि" value={userData.dob} />
                  <InfoRow icon={<User />} label="Gender" sub="লিঙ্গ | लिंग" value={userData.gender} />
                  <InfoRow icon={<Droplet />} label="Blood Group" sub="রক্তের গ্রুপ | रक्त समूह" value={userData.bloodGroup} />
                  <InfoRow icon={<FileText />} label="Aadhaar Number" sub="আধার নম্বর | आधार संख्या" value={userData.aadhaarNo} />
                  <InfoRow icon={<MessageSquareSub />} label="Mother Tongue" sub="মাতৃভাষা | मातृभाषा" value={userData.motherTongue} />
                  <InfoRow icon={<ShieldCheck />} label="Religion" sub="ধর্ম | धर्म" value={userData.religion} />
                  <InfoRow icon={<Landmark />} label="Nationality" sub="জাতীয়তা | राष्ट्रीयता" value={userData.nationality} />
              </SectionWrapper>

              {/* Address Information */}
              <SectionWrapper icon={<MapPin />} title="Address Details" sub="ঠিকানা | पता विवरण">
                  <div className="col-span-1 sm:col-span-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Residential Address / স্থায়ী ঠিকানা | आवासीय पता</p>
                    <p className="font-bold text-gray-800 text-sm leading-relaxed">{userData.addressDetails?.fullAddress || userData.address}</p>
                  </div>
                  <InfoRow icon={<MapPin />} label="District" sub="জেলা | जिला" value={userData.addressDetails?.district} />
                  <InfoRow icon={<MapPin />} label="Police Station" sub="থানা | पुलिस थाना" value={userData.addressDetails?.policeStation} />
                  <InfoRow icon={<MapPin />} label="Post Office" sub="ডাকঘর | डाकघर" value={userData.addressDetails?.postOffice} />
                  <InfoRow icon={<MapPin />} label="PIN Code" sub="পিন কোড | पिन कोड" value={userData.addressDetails?.pinCode} />
                  <InfoRow icon={<MapPin />} label="Block / Mun." sub="ব্লক | ब्लॉक" value={userData.addressDetails?.block} />
                  <InfoRow icon={<MapPin />} label="Panchayat / Ward" sub="পঞ্চায়েত | पंचायत" value={userData.addressDetails?.panchayat} />
              </SectionWrapper>

              {/* Academic & Health */}
              <SectionWrapper icon={<School />} title="Academic & Health" sub="শিক্ষাগত এবং স্বাস্থ্য | शैक्षणिक और स्वास्थ्य">
                  <InfoRow icon={<Calendar />} label="Admission Date" sub="ভর্তির তারিখ | प्रवेश तिथि" value={userData.admissionDate} />
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Previous Schooling / পূর্ববর্তী স্কুল | पिछला स्कूल</p>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<School />} label="School Name" sub="স্কুলের নাম | स्कूल का नाम" value={userData.previousSchool?.name} />
                        <InfoRow icon={<FileText />} label="Student Code" sub="স্টুডেন্ট কোড | छात्र कोड" value={userData.previousSchool?.code} />
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3">Health & Specifics / স্বাস্থ্য বিবরণ | स्वास्थ्य विवरण</p>
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow icon={<Activity />} label="CWSN Status" sub="প্রতিবন্ধী স্থিতি | सी.डब्ल्यू.एस.एन स्थिति" value={userData.healthAndSpecifics?.isCwsn} />
                        <InfoRow icon={<ShieldQuestion />} label="Out of School" sub="স্কুলের বাইরে | स्कूल से बाहर" value={userData.healthAndSpecifics?.isOutOfSchool} />
                    </div>
                  </div>
              </SectionWrapper>

              {/* Socio-Economic & Bank */}
              <SectionWrapper icon={<Landmark />} title="Socio-Economic & Bank" sub="আর্থ-সামাজিক ও ব্যাংক | सामाजिक-आर्थिक और बैंक">
                  <InfoRow icon={<Users />} label="Social Category" sub="সামাজিক বিভাগ | सामाजिक श्रेणी" value={userData.socioEconomic?.category} />
                  <InfoRow icon={<FileText />} label="BPL Status" sub="বিপিএল স্থিতি | बीपीएल स्थिति" value={userData.socioEconomic?.isBpl} />
                  {userData.socioEconomic?.isBpl === 'Yes' && (
                    <InfoRow icon={<FileText />} label="BPL Card No" sub="বিপিএল কার্ড নম্বর | बीपीएल कार्ड नंबर" value={userData.socioEconomic?.bplNo} />
                  )}
                  <InfoRow icon={<Landmark />} label="Annual Income" sub="বার্ষিক আয় | वार्षिक आय" value={userData.socioEconomic?.annualFamilyIncome ? `₹${userData.socioEconomic.annualFamilyIncome}` : null} />
                  
                  <div className="col-span-1 sm:col-span-2 border-t border-gray-50 pt-4 mt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Bank Details / ব্যাংক অ্যাকাউন্ট | बैंक खाता</p>
                    <div className="grid grid-cols-2 gap-y-4">
                        <InfoRow icon={<Landmark />} label="Bank Name" sub="ব্যাংকের নাম | बैंक का नाम" value={userData.bankDetails?.bankName} />
                        <InfoRow icon={<Landmark />} label="IFSC Code" sub="আইএফএসসি কোড | आईएफएससी कोड" value={userData.bankDetails?.ifsc} />
                        <InfoRow icon={<FileText />} label="Account No" sub="অ্যাকাউন্ট নম্বর | खाता संख्या" value={userData.bankDetails?.accountNumber} />
                        <InfoRow icon={<MapPin />} label="Branch" sub="শাখা | शाखा" value={userData.bankDetails?.branchName} />
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
                  <FamilyCard 
                    title="Father" sub="বাবা | पिता" 
                    fName={userData.parents?.father?.firstName} mName={userData.parents?.father?.middleName} lName={userData.parents?.father?.lastName} 
                    contact={userData.parents?.father?.contact} occ={userData.parents?.father?.occupation} id={userData.parents?.father?.idProof?.number} 
                  />
                  <FamilyCard 
                    title="Mother" sub="মা | माता" 
                    fName={userData.parents?.mother?.firstName} mName={userData.parents?.mother?.middleName} lName={userData.parents?.mother?.lastName} 
                    contact={userData.parents?.mother?.contact} occ={userData.parents?.mother?.occupation} id={userData.parents?.mother?.idProof?.number} 
                  />
                  <FamilyCard 
                    title="Guardian" sub="অভিভাবক | अभिभावक" 
                    fName={userData.parents?.localGuardian?.firstName} mName={userData.parents?.localGuardian?.middleName} lName={userData.parents?.localGuardian?.lastName} 
                    contact={userData.parents?.localGuardian?.contact} relation={userData.parents?.localGuardian?.relation} id={userData.parents?.localGuardian?.idProof?.number} 
                    theme="bg-emerald-50" 
                  />
                </div>
              </div>

            </div>

            {/* Documents Section */}
            {(userData.documents?.doc1?.url || userData.documents?.doc2?.url || userData.documents?.doc3?.url) && (
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-8 py-5 border-b border-gray-100 flex flex-col">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-emerald-600"/>
                    <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Verified Documents</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 ml-7">নথিপত্র | सत्यापित दस्तावेज़</span>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[1, 2, 3].map(num => {
                    const docItem = userData.documents[`doc${num}`];
                    if (!docItem?.url) return null;
                    return (
                      <a key={num} href={docItem.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-emerald-500 hover:shadow-xl transition-all group">
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-black text-gray-800 truncate">{docItem.label || `Document ${num}`}</span>
                          <span className="text-[8px] font-bold text-emerald-600 uppercase mt-1">Click to view / দেখুন | देखने के लिए क्लिक करें</span>
                        </div>
                        <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
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
    <div className="text-emerald-500 mt-1">{React.cloneElement(icon, { size: 16 })}</div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</p>
      <p className="text-[8px] font-bold text-emerald-600 uppercase mt-1 mb-1">{sub}</p>
      <p className="font-bold text-gray-800 text-sm truncate">{value || <span className="text-gray-300 italic font-medium">N/A</span>}</p>
    </div>
  </div>
);

const FamilyCard = ({ title, sub, fName, mName, lName, contact, occ, id, relation, theme = "bg-gray-50" }) => (
  <div className={`${theme} p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full`}>
    <div className="mb-4">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">{title}</p>
        <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{sub}</p>
    </div>
    
    <div className="grid grid-cols-1 gap-1 mb-3 bg-white/60 p-3 rounded-xl border border-gray-200/50 flex-grow">
        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 mb-1.5">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">First</span>
              <span className="text-[7px] font-bold text-emerald-600 uppercase mt-0.5">প্রথম নাম | पहला नाम</span>
           </div>
           <span className="text-xs font-bold text-gray-800 text-right">{fName || '-'}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 mb-1.5">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Middle</span>
              <span className="text-[7px] font-bold text-emerald-600 uppercase mt-0.5">মধ্য নাম | मध्य नाम</span>
           </div>
           <span className="text-xs font-bold text-gray-800 text-right">{mName || '-'}</span>
        </div>
        <div className="flex justify-between items-center">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Last</span>
              <span className="text-[7px] font-bold text-emerald-600 uppercase mt-0.5">পদবি | अंतिम नाम</span>
           </div>
           <span className="text-xs font-bold text-gray-800 text-right">{lName || '-'}</span>
        </div>
    </div>

    {relation && <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded mt-1 mb-2 w-max inline-block uppercase">{relation}</span>}
    
    <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
            <Phone size={12} className="text-gray-400"/> {contact || 'N/A'}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
            <Briefcase size={12} className="text-gray-400"/> {occ || 'N/A'}
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
            <FileText size={12} className="text-gray-400"/> ID: {id || 'N/A'}
        </div>
    </div>
  </div>
);

const MessageSquareSub = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

export default StudentProfile;