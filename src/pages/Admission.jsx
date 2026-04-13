import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Users, MapPin, Send, ArrowLeft,
  Heart, Activity, Landmark, ShieldCheck, Loader2, Copy, Check, Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Helper to render trilingual labels beautifully - Upgraded for Joyful Theme
const RenderLabel = ({ label, required }) => {
  const parts = label.split(' / ');
  return (
    <label className="flex flex-col mb-2 ml-2 cursor-pointer">
      <span className="text-xs font-black text-blue-950 uppercase tracking-widest flex items-start gap-1">
        {parts[0]} {required && <span className="text-rose-500 text-base leading-none">*</span>}
      </span>
      {parts.length > 1 && (
        <span className="text-[10px] text-gray-500 font-bold mt-1 leading-tight opacity-80">
          {parts.slice(1).join(' / ')}
        </span>
      )}
    </label>
  );
};

const FormInput = ({ label, type = "text", name, value, onChange, required, className = "" }) => (
  <div className={`flex flex-col group ${className}`}>
    <RenderLabel label={label} required={required} />
    <input 
      type={type} name={name} value={value} onChange={onChange} required={required}
      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-sm text-blue-950 shadow-sm hover:border-blue-200"
    />
  </div>
);

const FormSelect = ({ label, name, value, onChange, required, children, className = "" }) => (
  <div className={`flex flex-col group ${className}`}>
    <RenderLabel label={label} required={required} />
    <select 
      name={name} value={value} onChange={onChange} required={required}
      className="w-full bg-slate-50 px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/20 outline-none transition-all font-bold text-sm text-blue-950 shadow-sm hover:border-blue-200 appearance-none cursor-pointer"
    >
      {children}
    </select>
  </div>
);

const Admission = () => {
  const [loading, setLoading] = useState(false);
  const [applicationNo, setApplicationNo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for floating nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const [formData, setFormData] = useState({
    // Student Personal
    studentFirstName: '', studentMiddleName: '', studentLastName: '',
    gender: '', dob: '', bloodGroup: '',
    aadhaarNo: '', motherTongue: 'Bengali', religion: 'Hindu', nationality: 'Indian',
    
    // Address Details
    address: '', country: 'India', state: 'West Bengal', district: '', locality: '', 
    block: '', panchayat: '', policeStation: '', postOffice: '', pinCode: '',
    
    // Socio-Economic & Health
    socialCategory: 'General', isBpl: 'No', isAay: 'No', bplNo: '', isEws: 'No',
    isCwsn: 'No', sldType: '', isOutOfSchool: 'No',
    
    // Bank Details
    bankName: '', branchName: '', ifsc: '', accountNumber: '',

    // Academic Details
    classApplied: '', prevSchoolName: '', prevSchoolCode: '',

    // Family Details
    fatherFirstName: '', fatherMiddleName: '', fatherLastName: '', fatherContact: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherFirstName: '', motherMiddleName: '', motherLastName: '', motherContact: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianFirstName: '', localGuardianMiddleName: '', localGuardianLastName: '', localGuardianContact: '', localGuardianRelation: '', localGuardianAddress: '', localGuardianIdType: '', localGuardianIdNo: '',
    annualFamilyIncome: '', guardianQualification: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateApplicationNo = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `APP-${year}${month}-${randomNum}`;
  };

  const copyToClipboard = () => {
    if (applicationNo) {
      navigator.clipboard.writeText(applicationNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const newAppNo = generateApplicationNo();
      
      const studentName = [formData.studentFirstName, formData.studentMiddleName, formData.studentLastName].filter(Boolean).join(' ');
      const fatherName = [formData.fatherFirstName, formData.fatherMiddleName, formData.fatherLastName].filter(Boolean).join(' ');
      const motherName = [formData.motherFirstName, formData.motherMiddleName, formData.motherLastName].filter(Boolean).join(' ');
      const localGuardianName = [formData.localGuardianFirstName, formData.localGuardianMiddleName, formData.localGuardianLastName].filter(Boolean).join(' ');

      await addDoc(collection(db, "admission_applications"), {
        ...formData,
        studentName,
        fatherName,
        motherName,
        localGuardianName,
        applicationNo: newAppNo,
        status: "Pending",
        submissionDate: serverTimestamp()
      });

      setApplicationNo(newAppNo); 
      window.scrollTo(0, 0); 
      
    } catch (error) {
      console.error("Error saving admission form: ", error);
      alert("Failed to submit the form. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- SUCCESS SCREEN ---
  if (applicationNo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-yellow-400 selection:text-blue-950">
        {/* Abstract Background Blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>

        <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl max-w-2xl w-full text-center border-4 border-white relative z-10 animate-in zoom-in-95 duration-500">
          <Sparkles className="absolute top-10 right-10 text-yellow-400 w-10 h-10 animate-pulse" />
          <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-green-100">
            <ShieldCheck className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-blue-950 mb-4 tracking-tighter uppercase">Application <span className="text-green-500">Received!</span></h2>
          <p className="text-gray-600 text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-md mx-auto">
            Thank you for applying. We have successfully received your child's admission details.
          </p>

          <div className="bg-blue-50/50 p-8 rounded-[2rem] border-2 border-blue-100 mb-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/40 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
            <p className="text-sm font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center justify-center z-10 relative">
              Your Application Number
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center z-10 relative">
              <code className="text-2xl sm:text-3xl font-black text-blue-700 bg-white px-8 py-4 rounded-2xl border-2 border-blue-200 shadow-sm text-center tracking-wider">
                {applicationNo}
              </code>
              <button 
                onClick={copyToClipboard}
                className={`px-6 py-4 rounded-2xl font-black transition-all flex items-center gap-2 uppercase tracking-widest ${copied ? 'bg-green-500 text-white shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)]' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:-translate-y-1'}`}
              >
                {copied ? <><Check size={20}/> Copied</> : <><Copy size={20}/> Copy</>}
              </button>
            </div>
            <p className="text-xs text-rose-600 font-bold mt-6 bg-rose-50 p-4 rounded-xl border border-rose-100 text-center z-10 relative">
              ⚠️ Please note down this Application Number safely. It is required for all future correspondence.
            </p>
          </div>

          <Link to="/" className="inline-flex items-center justify-center gap-3 bg-yellow-400 text-blue-950 px-10 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-[0_0_40px_-10px_rgba(250,204,21,0.5)] hover:-translate-y-1 hover:scale-105 active:scale-95 duration-300 w-full">
            <ArrowLeft className="w-5 h-5" /> Return to Home Page
          </Link>
        </div>
      </div>
    );
  }

  // --- MAIN FORM SCREEN ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-yellow-400 selection:text-blue-950 relative overflow-hidden">
      
      {/* Abstract Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
      </div>

      {/* --- FLOATING GLASS NAVIGATION --- */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pointer-events-none transition-all duration-500">
        <nav className={`mx-auto max-w-7xl pointer-events-auto transition-all duration-500 rounded-full ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-2xl py-2 px-4 border border-white/20' : 'bg-transparent py-4'}`}>
          <div className="flex justify-between items-center h-16 px-2 sm:px-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white p-1 rounded-full shadow-md shrink-0 overflow-hidden h-12 w-12 flex items-center justify-center border-4 border-yellow-400 group-hover:rotate-12 transition-all duration-500">
                <BookOpen className="h-6 w-6 text-blue-950" />
              </div>
              <div>
                <h1 className={`text-base sm:text-xl font-black tracking-tighter leading-none uppercase transition-colors duration-500 ${scrolled ? 'text-blue-950' : 'text-blue-950'}`}>Vivekananda <br className="sm:hidden"/><span className="text-yellow-500">Child's Mission</span></h1>
              </div>
            </Link>
            <Link to="/" className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-yellow-400 hover:text-blue-950 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:block">Back to Home</span>
            </Link>
          </div>
        </nav>
      </div>

      <main className="flex-grow pt-36 pb-24 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-md border border-white text-blue-600 px-6 py-2 rounded-full text-sm font-black tracking-widest uppercase mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-yellow-500" /> Admissions Open
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tighter uppercase drop-shadow-sm">Student Admission Form</h2>
            <div className="w-24 h-2 bg-yellow-400 mx-auto rounded-full mb-6 shadow-sm"></div>
            <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto">Please fill out all mandatory fields accurately as per your official documents to ensure a smooth admission process.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* SECTION: Personal Information (Blue Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <Users className="absolute -right-10 -top-10 w-64 h-64 text-blue-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-blue-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Personal Details</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">শিক্ষার্থীর বিবরণ / छात्र का विवरण</p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormInput label="First Name / প্রথম নাম / पहला नाम" name="studentFirstName" value={formData.studentFirstName} onChange={handleInputChange} required />
                <FormInput label="Middle Name / মধ্য নাম / मध्य नाम" name="studentMiddleName" value={formData.studentMiddleName} onChange={handleInputChange} />
                <FormInput label="Last Name / পদবি / अंतिम नाम" name="studentLastName" value={formData.studentLastName} onChange={handleInputChange} required />
                
                <FormSelect label="Gender / লিঙ্গ / लिंग" name="gender" value={formData.gender} onChange={handleInputChange} required>
                  <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Transgender">Transgender</option>
                </FormSelect>
                
                <FormInput label="Date of Birth / জন্ম তারিখ / जन्म तिथि" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
                <FormInput label="Aadhaar Number / আধার নম্বর / आधार संख्या" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} />
                
                <FormSelect label="Blood Group / রক্তের গ্রুপ / रक्त समूह" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                  <option value="">Select (Optional)</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                </FormSelect>

                <FormInput label="Mother Tongue / মাতৃভাষা / मातृभाषा" name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} required />
                <FormSelect label="Religion / ধর্ম / धर्म" name="religion" value={formData.religion} onChange={handleInputChange} required>
                  <option value="Hindu">Hindu</option><option value="Muslim">Muslim</option><option value="Christian">Christian</option><option value="Sikh">Sikh</option><option value="Buddhist">Buddhist</option><option value="Others">Others</option>
                </FormSelect>
                <FormSelect label="Nationality / জাতীয়তা / राष्ट्रीयता" name="nationality" value={formData.nationality} onChange={handleInputChange} required>
                  <option value="Indian">Indian</option><option value="Other">Other</option>
                </FormSelect>
              </div>
            </div>

            {/* SECTION: Academic details (Yellow Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <BookOpen className="absolute -right-10 -top-10 w-64 h-64 text-yellow-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-yellow-400 p-4 rounded-[1.5rem] shadow-lg text-blue-950 group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Academic Info</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">শিক্ষাগত তথ্য / शैक्षणिक जानकारी</p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormSelect label="Class Applying For / ভর্তির শ্রেণী / प्रवेश के लिए कक्षा" name="classApplied" value={formData.classApplied} onChange={handleInputChange} required>
                  <option value="">Select Class</option>
                  <option value="Nursery">Nursery</option>
                  <option value="LKG">LKG</option>
                  <option value="UKG">UKG</option>
                  <option value="Class 1">Class 1</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                </FormSelect>
                <FormInput label="Prev. School Name / পূর্ববর্তী বিদ্যালয় / पिछले स्कूल" name="prevSchoolName" value={formData.prevSchoolName} onChange={handleInputChange} />
                <FormInput label="Prev. School Code / বিদ্যালয়ের কোড / स्कूल कोड" name="prevSchoolCode" value={formData.prevSchoolCode} onChange={handleInputChange} />
              </div>
            </div>

            {/* SECTION: Address Details (Teal Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <MapPin className="absolute -right-10 -top-10 w-64 h-64 text-teal-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-teal-400 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <MapPin className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Address Info</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">ঠিকানার তথ্য / पता जानकारी</p>
                </div>
              </div>

              <div className="relative z-10 space-y-8">
                <FormInput label="Full Residential Address / সম্পূর্ণ আবাসিক ঠিকানা / पूर्ण आवासीय पता" name="address" value={formData.address} onChange={handleInputChange} required className="w-full" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100">
                  <FormInput label="Country / দেশ / देश" name="country" value={formData.country} onChange={handleInputChange} required />
                  <FormInput label="State / রাজ্য / राज्य" name="state" value={formData.state} onChange={handleInputChange} required />
                  <FormInput label="District / জেলা / जिला" name="district" value={formData.district} onChange={handleInputChange} required />
                  <FormInput label="Locality / এলাকা / इलाका" name="locality" value={formData.locality} onChange={handleInputChange} required />
                  <FormInput label="Block / ব্লক / ब्लॉक" name="block" value={formData.block} onChange={handleInputChange} />
                  <FormInput label="Panchayat / পঞ্চায়েত / पंचायत" name="panchayat" value={formData.panchayat} onChange={handleInputChange} />
                  <FormInput label="Police Station / থানা / पुलिस थाना" name="policeStation" value={formData.policeStation} onChange={handleInputChange} required />
                  <FormInput label="Post Office / ডাকঘর / डाकघर" name="postOffice" value={formData.postOffice} onChange={handleInputChange} required />
                  <FormInput label="PIN Code / পিন কোড / पिन कोड" name="pinCode" value={formData.pinCode} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            {/* SECTION: Socio-Economic & Health Details (Rose Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <Activity className="absolute -right-10 -top-10 w-64 h-64 text-rose-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-rose-400 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <Activity className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Socio-Economic</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">আর্থ-সামাজিক প্রোফাইল / सामाजिक-आर्थिक प्रोफ़ाइल</p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormSelect label="Social Category / সামাজিক বিভাগ / सामाजिक श्रेणी" name="socialCategory" value={formData.socialCategory} onChange={handleInputChange} required>
                  <option value="General">General</option><option value="SC">SC</option><option value="ST">ST</option><option value="OBC-A">OBC-A</option><option value="OBC-B">OBC-B</option>
                </FormSelect>
                <FormSelect label="BPL Beneficiary? / বিপিএল সুবিধাভোগী? / बीपीएल लाभार्थी?" name="isBpl" value={formData.isBpl} onChange={handleInputChange} required>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                {formData.isBpl === 'Yes' && (
                  <>
                    <FormSelect label="AAY Beneficiary? / AAY সুবিধাভোগী? / AAY लाभार्थी?" name="isAay" value={formData.isAay} onChange={handleInputChange}>
                      <option value="No">No</option><option value="Yes">Yes</option>
                    </FormSelect>
                    <FormInput label="BPL Number / বিপিএল নম্বর / बीपीएल नंबर" name="bplNo" value={formData.bplNo} onChange={handleInputChange} required />
                  </>
                )}

                <FormSelect label="EWS? / আর্থিকভাবে দুর্বল? / ईडब्ल्यूएस?" name="isEws" value={formData.isEws} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                <FormSelect label="CWSN? / বিশেষ চাহিদাসম্পন্ন? / सीडब्ल्यूएसएन?" name="isCwsn" value={formData.isCwsn} onChange={handleInputChange} required>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>

                {formData.isCwsn === 'Yes' && (
                  <FormSelect label="SLD Type / ধরন / प्रकार" name="sldType" value={formData.sldType} onChange={handleInputChange} className="md:col-span-2">
                    <option value="">Not Applicable / Not Listed</option><option value="Dysgraphia-1">Dysgraphia-1</option><option value="Dyscalculia-2">Dyscalculia-2</option><option value="Dyslexia-3">Dyslexia-3</option>
                  </FormSelect>
                )}

                <FormSelect label="Out-of-School Child? / স্কুল-বহির্ভূত? / स्कूल से बाहर?" name="isOutOfSchool" value={formData.isOutOfSchool} onChange={handleInputChange}>
                  <option value="No">No</option><option value="Yes">Yes</option>
                </FormSelect>
              </div>
            </div>

            {/* SECTION: Family Details (Purple/Indigo Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <Heart className="absolute -right-10 -top-10 w-64 h-64 text-indigo-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-indigo-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Heart className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Family Info</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">পরিবার এবং অভিভাবক / परिवार और अभिभावक</p>
                </div>
              </div>

              <div className="relative z-10 space-y-10">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b-2 border-slate-100">
                  <FormInput label="Annual Family Income (₹) / বার্ষিক পারিবারিক আয় / वार्षिक पारिवारिक आय" type="number" name="annualFamilyIncome" value={formData.annualFamilyIncome} onChange={handleInputChange} required />
                  <FormInput label="Guardian's Qualification / অভিভাবকের শিক্ষাগত যোগ্যতা / अभिभावक की योग्यता" name="guardianQualification" value={formData.guardianQualification} onChange={handleInputChange} required />
                </div>

                {/* Father Info */}
                <div className="space-y-6">
                  <h4 className="text-base font-black text-blue-800 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-2 bg-blue-400 rounded-full"></div> Father's Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/50 p-8 rounded-[2rem] border-2 border-blue-100">
                    <FormInput label="First Name / প্রথম নাম / पहला नाम" name="fatherFirstName" value={formData.fatherFirstName} onChange={handleInputChange} required />
                    <FormInput label="Middle Name / মধ্য নাম / मध्य नाम" name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleInputChange} />
                    <FormInput label="Last Name / পদবি / अंतिम नाम" name="fatherLastName" value={formData.fatherLastName} onChange={handleInputChange} required />
                    <FormInput label="Contact Number / যোগাযোগ নম্বর / संपर्क नंबर" type="tel" name="fatherContact" value={formData.fatherContact} onChange={handleInputChange} required />
                    <FormInput label="Occupation / পেশা / पेशा" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleInputChange} />
                    <FormInput label="Address / ঠিকানা / पता" name="fatherAddress" value={formData.fatherAddress} onChange={handleInputChange} />
                    <FormInput label="ID Proof Type / আইডি প্রুফ প্রকার / आईडी प्रूफ प्रकार" name="fatherIdType" value={formData.fatherIdType} onChange={handleInputChange} />
                    <FormInput label="ID Proof Number / আইডি প্রুফ নম্বর / आईडी प्रूफ नंबर" name="fatherIdNo" value={formData.fatherIdNo} onChange={handleInputChange} className="md:col-span-2" />
                  </div>
                </div>

                {/* Mother Info */}
                <div className="space-y-6">
                  <h4 className="text-base font-black text-rose-800 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-2 bg-rose-400 rounded-full"></div> Mother's Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-rose-50/50 p-8 rounded-[2rem] border-2 border-rose-100">
                    <FormInput label="First Name / প্রথম নাম / पहला नाम" name="motherFirstName" value={formData.motherFirstName} onChange={handleInputChange} required />
                    <FormInput label="Middle Name / মধ্য নাম / मध्य नाम" name="motherMiddleName" value={formData.motherMiddleName} onChange={handleInputChange} />
                    <FormInput label="Last Name / পদবি / अंतिम नाम" name="motherLastName" value={formData.motherLastName} onChange={handleInputChange} required />
                    <FormInput label="Contact Number / যোগাযোগ নম্বর / संपर्क नंबर" type="tel" name="motherContact" value={formData.motherContact} onChange={handleInputChange} required />
                    <FormInput label="Occupation / পেশা / पेशा" name="motherOccupation" value={formData.motherOccupation} onChange={handleInputChange} />
                    <FormInput label="Address / ঠিকানা / पता" name="motherAddress" value={formData.motherAddress} onChange={handleInputChange} />
                    <FormInput label="ID Proof Type / আইডি প্রুফ প্রকার / आईडी प्रूफ प्रकार" name="motherIdType" value={formData.motherIdType} onChange={handleInputChange} />
                    <FormInput label="ID Proof Number / আইডি প্রুফ নম্বর / आईडी प्रूफ नंबर" name="motherIdNo" value={formData.motherIdNo} onChange={handleInputChange} className="md:col-span-2" />
                  </div>
                </div>

                {/* Local Guardian Info */}
                <div className="space-y-6">
                  <h4 className="text-base font-black text-yellow-800 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-2 bg-yellow-400 rounded-full"></div> Local Guardian
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-yellow-50/50 p-8 rounded-[2rem] border-2 border-yellow-200">
                    <FormInput label="First Name / প্রথম নাম / पहला नाम" name="localGuardianFirstName" value={formData.localGuardianFirstName} onChange={handleInputChange} />
                    <FormInput label="Middle Name / মধ্য নাম / मध्य नाम" name="localGuardianMiddleName" value={formData.localGuardianMiddleName} onChange={handleInputChange} />
                    <FormInput label="Last Name / পদবি / अंतिम नाम" name="localGuardianLastName" value={formData.localGuardianLastName} onChange={handleInputChange} />
                    <FormInput label="Contact Number / যোগাযোগ নম্বর / संपर्क नंबर" type="tel" name="localGuardianContact" value={formData.localGuardianContact} onChange={handleInputChange} />
                    <FormInput label="Relationship / সম্পর্ক / संबंध" name="localGuardianRelation" value={formData.localGuardianRelation} onChange={handleInputChange} />
                    <FormInput label="Address / ঠিকানা / पता" name="localGuardianAddress" value={formData.localGuardianAddress} onChange={handleInputChange} />
                    <FormInput label="ID Proof Type / আইডি প্রুফ প্রকার / आईडी प्रूफ प्रकार" name="localGuardianIdType" value={formData.localGuardianIdType} onChange={handleInputChange} />
                    <FormInput label="ID Proof Number / আইডি প্রুফ নম্বর / आईडी प्रूफ नंबर" name="localGuardianIdNo" value={formData.localGuardianIdNo} onChange={handleInputChange} className="md:col-span-2" />
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION: Bank Details (Green Theme) */}
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group overflow-hidden hover:shadow-2xl transition-all duration-500">
              <Landmark className="absolute -right-10 -top-10 w-64 h-64 text-green-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-5 mb-10 border-b-2 border-slate-100 pb-6">
                <div className="bg-green-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <Landmark className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">Bank Details</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-bold tracking-widest mt-1 opacity-80">ব্যাঙ্কের বিবরণ / बैंक विवरण</p>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="Bank Name / ব্যাঙ্কের নাম / बैंक का नाम" name="bankName" value={formData.bankName} onChange={handleInputChange} />
                <FormInput label="Branch Name / শাখার নাম / शाखा का नाम" name="branchName" value={formData.branchName} onChange={handleInputChange} />
                <FormInput label="IFSC Code / আইএফএসসি কোড / आईएफएससी कोड" name="ifsc" value={formData.ifsc} onChange={handleInputChange} />
                <FormInput label="Account Number / অ্যাকাউন্ট নম্বর / खाता संख्या" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-10 text-center relative z-10">
              <button disabled={loading} type="submit" className="w-full max-w-2xl mx-auto bg-yellow-400 text-blue-950 py-6 rounded-full font-black text-xl hover:bg-yellow-300 transition-all shadow-[0_0_40px_-10px_rgba(250,204,21,0.5)] disabled:opacity-50 flex flex-col items-center justify-center gap-1 uppercase tracking-widest hover:-translate-y-1 hover:scale-105 active:scale-95 duration-300 group">
                {loading ? (
                  <Loader2 className="animate-spin h-8 w-8" />
                ) : (
                  <>
                    <div className="flex items-center gap-3"><Send className="h-6 w-6 group-hover:translate-x-1 transition-transform" /> Submit Application</div>
                    <span className="text-xs font-bold tracking-widest normal-case opacity-70 mt-1">আবেদন জমা দিন / आवेदन जमा करें</span>
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 font-bold mt-6 bg-white/50 backdrop-blur-sm py-2 px-6 rounded-full inline-block border border-white">By submitting this form, you verify that all provided information is accurate and true.</p>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
};

export default Admission;