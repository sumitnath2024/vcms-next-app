import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Users, MapPin, Send, ArrowLeft,
  Heart, Activity, Landmark, ShieldCheck, Loader2, Copy, Check
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FormInput = ({ label, subLabel, type = "text", name, value, onChange, required, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider ml-1 leading-none">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <span className="text-[9px] font-bold text-blue-500 ml-1 mb-1 uppercase leading-none">{subLabel}</span>
    <input 
      type={type} name={name} value={value} onChange={onChange} required={required}
      className="p-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-semibold bg-white text-gray-900 hover:border-blue-300 shadow-sm"
    />
  </div>
);

const FormSelect = ({ label, subLabel, name, value, onChange, required, children, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider ml-1 leading-none">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <span className="text-[9px] font-bold text-blue-500 ml-1 mb-1 uppercase leading-none">{subLabel}</span>
    <select 
      name={name} value={value} onChange={onChange} required={required}
      className="p-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none text-sm font-semibold bg-white text-gray-900 hover:border-blue-300 shadow-sm transition-all"
    >
      {children}
    </select>
  </div>
);

const Admission = () => {
  const [loading, setLoading] = useState(false);
  const [applicationNo, setApplicationNo] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    studentName: '', gender: '', dob: '', bloodGroup: '',
    aadhaarNo: '', motherTongue: 'Bengali', religion: 'Hindu', nationality: 'Indian',
    address: '', country: 'India', state: 'West Bengal', district: '', locality: '', 
    block: '', panchayat: '', policeStation: '', postOffice: '', pinCode: '',
    socialCategory: 'General', isBpl: 'No', isAay: 'No', bplNo: '', isEws: 'No',
    isCwsn: 'No', sldType: '', isOutOfSchool: 'No',
    bankName: '', branchName: '', ifsc: '', accountNumber: '',
    classApplied: '', prevSchoolName: '', prevSchoolCode: '',
    fatherName: '', fatherContact: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherName: '', motherContact: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianName: '', localGuardianContact: '', localGuardianRelation: '', localGuardianAddress: '', localGuardianIdType: '', localGuardianIdNo: '',
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
      await addDoc(collection(db, "admission_applications"), {
        ...formData,
        applicationNo: newAppNo,
        status: "Pending",
        submissionDate: serverTimestamp()
      });
      setApplicationNo(newAppNo);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error(error);
      alert("Failed to submit the form.");
    } finally {
      setLoading(false);
    }
  };

  if (applicationNo) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="bg-blue-950 text-white py-6 shadow-md">
          <div className="max-w-7xl mx-auto px-4 flex justify-center items-center">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-2 rounded-full shrink-0"><BookOpen className="h-6 w-6 text-blue-950" /></div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Vivekananda Child's Mission</h1>
            </div>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-xl w-full text-center border-t-[8px] border-green-500 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-blue-950 mb-2 leading-none">Application Submitted!</h2>
            <p className="text-[11px] font-bold text-blue-600 mt-2 uppercase">আবেদন জমা দেওয়া হয়েছে | आवेदन जमा कर दिया गया है</p>
            
            <p className="text-gray-600 mt-6 mb-8 leading-relaxed font-medium">
              Thank you for applying. We have successfully received your child's admission details.<br/>
              <span className="text-[10px]">আবেদনের জন্য ধন্যবাদ। আপনার তথ্যাদি আমাদের কাছে পৌঁছেছে।</span>
            </p>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8 text-left">
              <p className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1 text-center leading-none">
                Your Application Number
              </p>
              <p className="text-[9px] font-bold text-blue-400 mb-4 uppercase text-center leading-none">আপনার আবেদন নম্বর | आपका आवेदन नंबर</p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                <code className="text-2xl font-black text-blue-700 bg-white px-6 py-3 rounded-xl border border-blue-200 shadow-sm text-center">
                  {applicationNo}
                </code>
                <button 
                  onClick={copyToClipboard}
                  className={`px-5 py-3 rounded-xl font-bold transition-all flex flex-col items-center justify-center ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}
                >
                  <div className="flex items-center gap-2 text-sm leading-none">{copied ? <><Check size={16}/> Copied</> : <><Copy size={16}/> Copy</>}</div>
                  <span className="text-[8px] font-medium opacity-80 mt-1 uppercase">{copied ? 'কপি হয়েছে' : 'কপি করুন | कॉपी करें'}</span>
                </button>
              </div>
              <p className="text-[10px] text-rose-500 font-bold mt-4 bg-rose-50 p-3 rounded-lg border border-rose-100 text-center uppercase">
                ⚠️ REQUIRED FOR FUTURE CORRESPONDENCE | পরবর্তী ব্যবহারের জন্য এটি সংরক্ষণ করুন
              </p>
            </div>

            <Link to="/" className="inline-block bg-blue-900 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-800 transition shadow-lg w-full flex flex-col items-center">
              <span className="text-lg leading-none">Return to Home Page</span>
              <span className="text-[9px] font-medium opacity-70 mt-1 uppercase">হোম পেজে ফিরে যান | मुख्य पृष्ठ पर लौटें</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-950 text-white py-6 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="bg-yellow-400 p-2 rounded-full shrink-0"><BookOpen className="h-6 w-6 text-blue-950" /></div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-none">Vivekananda Child's Mission</h1>
              <span className="text-[10px] text-blue-200 mt-1.5 uppercase font-bold tracking-widest leading-none">Online Admission | অনলাইন ভর্তি | ऑनलाइन प्रवेश</span>
            </div>
          </Link>
          <Link to="/" className="hidden sm:flex flex-col items-end text-blue-200 hover:text-white transition">
            <div className="flex items-center gap-2 text-sm font-bold uppercase"><ArrowLeft className="h-4 w-4" /> Back to Home</div>
            <span className="text-[8px] font-bold">ফিরে যান | वापस जाएं</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-blue-950 leading-none">Student Admission Form</h2>
            <p className="text-[11px] font-bold text-blue-600 mt-3 uppercase tracking-widest">ভর্তি আবেদন পত্র | प्रवेश आवेदन पत्र</p>
            <p className="text-gray-600 mt-4 font-medium text-sm">Please fill accurately as per official documents | সঠিক তথ্য প্রদান করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SECTION: Student Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex flex-col justify-center">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-700"/>
                    <h3 className="font-black text-blue-950 text-lg uppercase leading-none">Student's Personal Details</h3>
                </div>
                <span className="text-[9px] font-bold text-blue-400 ml-9 mt-1 uppercase">ছাত্রের ব্যক্তিগত বিবরণ | छात्र का व्यक्तिगत विवरण</span>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormInput label="Name of Student (Aadhaar)" subLabel="ছাত্রের নাম | छात्र का नाम" name="studentName" value={formData.studentName} onChange={handleInputChange} required className="md:col-span-2" />
                <FormSelect label="Gender" subLabel="লিঙ্গ | लिंग" name="gender" value={formData.gender} onChange={handleInputChange} required>
                  <option value="">Select | নির্বাচন করুন</option>
                  <option value="Male">Male | পুরুষ</option>
                  <option value="Female">Female | মহিলা</option>
                  <option value="Transgender">Trans | অন্য</option>
                </FormSelect>
                
                <FormInput label="Date of Birth" subLabel="জন্ম তারিখ | जन्म की तारीख" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
                <FormInput label="Aadhaar Number" subLabel="আধার নম্বর | आधार नंबर" name="aadhaarNo" value={formData.aadhaarNo} onChange={handleInputChange} />
                <FormSelect label="Blood Group" subLabel="রক্তের বিভাগ | रक्त समूह" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                  <option value="">Choose | বেছে নিন</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                </FormSelect>

                <FormInput label="Mother Tongue" subLabel="মাতৃভাষা | मातृभाषा" name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} required />
                <FormSelect label="Religion" subLabel="ধর্ম | धर्म" name="religion" value={formData.religion} onChange={handleInputChange} required>
                  <option value="Hindu">Hindu | হিন্দু</option><option value="Muslim">Muslim | মুসলিম</option><option value="Christian">Christian | খ্রিস্টান</option><option value="Sikh">Sikh | শিখ</option><option value="Others">Others | অন্য</option>
                </FormSelect>
                <FormSelect label="Nationality" subLabel="জাতীয়তা | राष्ट्रीयता" name="nationality" value={formData.nationality} onChange={handleInputChange} required>
                  <option value="Indian">Indian | ভারতীয়</option><option value="Other">Other | অন্য</option>
                </FormSelect>
              </div>
            </div>

            {/* SECTION: Academic Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex flex-col">
                <div className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-blue-700"/>
                    <h3 className="font-black text-blue-950 text-lg uppercase leading-none">Academic Information</h3>
                </div>
                <span className="text-[9px] font-bold text-blue-400 ml-9 mt-1 uppercase">শিক্ষাগত তথ্য | शैक्षणिक जानकारी</span>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormSelect label="Class Applying For" subLabel="ভর্তির শ্রেণী | प्रवेश कक्षा" name="classApplied" value={formData.classApplied} onChange={handleInputChange} required>
                  <option value="">Select | নির্বাচন করুন</option>
                  <option value="Nursery">Nursery</option><option value="LKG">LKG</option><option value="UKG">UKG</option>
                  <option value="Class 1">Class 1</option><option value="Class 2">Class 2</option><option value="Class 3">Class 3</option><option value="Class 4">Class 4</option>
                </FormSelect>
                <FormInput label="Prev. School Name" subLabel="আগের স্কুলের নাম | पिछला स्कूल" name="prevSchoolName" value={formData.prevSchoolName} onChange={handleInputChange} />
                <FormInput label="Student Code" subLabel="ছাত্র কোড | छात्र कोड" name="prevSchoolCode" value={formData.prevSchoolCode} onChange={handleInputChange} />
              </div>
            </div>

            {/* SECTION: Address Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex flex-col">
                <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-blue-700"/>
                    <h3 className="font-black text-blue-950 text-lg uppercase leading-none">Contact & Address</h3>
                </div>
                <span className="text-[9px] font-bold text-blue-400 ml-9 mt-1 uppercase">যোগাযোগ এবং ঠিকানা | संपर्क और पता</span>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <FormInput label="Residential Address" subLabel="বাসস্থানের ঠিকানা | आवासीय पता" name="address" value={formData.address} onChange={handleInputChange} required className="w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                  <FormInput label="Country" subLabel="দেশ | देश" name="country" value={formData.country} onChange={handleInputChange} required />
                  <FormInput label="State" subLabel="রাজ্য | राज्य" name="state" value={formData.state} onChange={handleInputChange} required />
                  <FormInput label="District" subLabel="জেলা | जिला" name="district" value={formData.district} onChange={handleInputChange} required />
                  <FormInput label="Locality" subLabel="এলাকা | इलाका" name="locality" value={formData.locality} onChange={handleInputChange} required />
                  <FormInput label="Block" subLabel="ব্লক | ब्लॉक" name="block" value={formData.block} onChange={handleInputChange} />
                  <FormInput label="Police Station" subLabel="থানা | पुलिस स्टेशन" name="policeStation" value={formData.policeStation} onChange={handleInputChange} required />
                  <FormInput label="Post Office" subLabel="ডাকঘর | डाक घर" name="postOffice" value={formData.postOffice} onChange={handleInputChange} required />
                  <FormInput label="PIN Code" subLabel="পিন কোড | पिन कोड" name="pinCode" value={formData.pinCode} onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            {/* SECTION: Family Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex flex-col">
                <div className="flex items-center gap-3">
                    <Heart className="h-6 w-6 text-blue-700"/>
                    <h3 className="font-black text-blue-950 text-lg uppercase leading-none">Family & Guardian</h3>
                </div>
                <span className="text-[9px] font-bold text-blue-400 ml-9 mt-1 uppercase">অভিভাবকের বিবরণ | अभिभावक विवरण</span>
              </div>
              <div className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                  <FormInput label="Annual Family Income" subLabel="বার্ষিক আয় | वार्षिक आय" type="number" name="annualFamilyIncome" value={formData.annualFamilyIncome} onChange={handleInputChange} required />
                  <FormInput label="Guardian Qualification" subLabel="অভিভাবকের যোগ্যতা | योग्यता" name="guardianQualification" value={formData.guardianQualification} onChange={handleInputChange} required />
                </div>

                <FamilySection title="Father's Details" subTitle="পিতার বিবরণ | पिता का विवरण" color="border-blue-400">
                    <FormInput label="Name" subLabel="নাম | नाम" name="fatherName" value={formData.fatherName} onChange={handleInputChange} required />
                    <FormInput label="Contact" subLabel="ফোন | फोन" type="tel" name="fatherContact" value={formData.fatherContact} onChange={handleInputChange} required />
                    <FormInput label="Occupation" subLabel="পেশা | पेशा" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleInputChange} />
                    <FormInput label="Address" subLabel="ঠিকানা | पता" name="fatherAddress" value={formData.fatherAddress} onChange={handleInputChange} className="md:col-span-3" />
                </FamilySection>

                <FamilySection title="Mother's Details" subTitle="মাতার বিবরণ | माता का विवरण" color="border-pink-400">
                    <FormInput label="Name" subLabel="নাম | नाम" name="motherName" value={formData.motherName} onChange={handleInputChange} required />
                    <FormInput label="Contact" subLabel="ফোন | ফোন" type="tel" name="motherContact" value={formData.motherContact} onChange={handleInputChange} required />
                    <FormInput label="Occupation" subLabel="পেশা | पेशा" name="motherOccupation" value={formData.motherOccupation} onChange={handleInputChange} />
                    <FormInput label="Address" subLabel="ঠিকানা | पता" name="motherAddress" value={formData.motherAddress} onChange={handleInputChange} className="md:col-span-3" />
                </FamilySection>
              </div>
            </div>

            {/* SECTION: Bank Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-50 px-6 py-4 border-b border-gray-200 flex flex-col">
                <div className="flex items-center gap-3">
                    <Landmark className="h-6 w-6 text-blue-700"/>
                    <h3 className="font-black text-blue-950 text-lg uppercase leading-none">Bank Details</h3>
                </div>
                <span className="text-[9px] font-bold text-blue-400 ml-9 mt-1 uppercase">ব্যাংক বিবরণ | बैंक विवरण</span>
              </div>
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Bank Name" subLabel="ব্যাংকের নাম" name="bankName" value={formData.bankName} onChange={handleInputChange} />
                <FormInput label="IFSC Code" subLabel="আইএফএসসি কোড" name="ifsc" value={formData.ifsc} onChange={handleInputChange} />
                <FormInput label="Account Number" subLabel="অ্যাকাউন্ট নম্বর" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} />
              </div>
            </div>

            <div className="pt-6">
              <button disabled={loading} type="submit" className="w-full bg-yellow-500 text-blue-950 py-5 rounded-2xl font-black text-xl hover:bg-yellow-400 transition-all shadow-xl disabled:opacity-50 flex flex-col items-center justify-center gap-1 uppercase tracking-widest">
                <div className="flex items-center gap-3">
                    {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Send className="h-6 w-6" /> Submit Application</>}
                </div>
                <span className="text-[10px] font-bold opacity-80 uppercase leading-none">{loading ? 'Processing...' : 'আবেদন জমা দিন | आवेदन जमा करें'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

const FamilySection = ({ title, subTitle, color, children }) => (
    <div className="space-y-4">
      <div className={`flex flex-col border-l-4 ${color} pl-3`}>
        <h4 className="text-sm font-black text-gray-700 uppercase leading-none">{title}</h4>
        <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{subTitle}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
        {children}
      </div>
    </div>
);

export default Admission;