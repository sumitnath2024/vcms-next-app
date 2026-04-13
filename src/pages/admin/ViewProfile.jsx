import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, GraduationCap, MapPin, Calendar, 
  Phone, Mail, FileText, Edit, ArrowLeft, Loader2, 
  Shield, Heart, Users, ExternalLink, Activity, 
  Landmark, Globe, ShieldCheck, Info, Baby,
  Wallet
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const ViewProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [sessionName, setSessionName] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const InfoField = ({ icon: Icon, label, value, subValue, className = "" }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${className}`}>
      {Icon && <Icon size={18} className="text-blue-500 mt-0.5 shrink-0" />}
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="font-bold text-gray-800 break-words leading-tight">{value || <span className="text-gray-300 italic font-normal">Not Provided</span>}</p>
        {subValue && <p className="text-[11px] text-blue-600 font-bold mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded inline-block">{subValue}</p>}
      </div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, colorClass = "bg-blue-100 text-blue-600" }) => (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
      <div className={`p-1.5 rounded-lg ${colorClass}`}>
        <Icon size={18} />
      </div>
      <h3 className="font-black text-gray-800 text-sm uppercase tracking-wider">{title}</h3>
    </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ id: userSnap.id, ...userData });

          if (userData.academicSession) {
            const sessionDocRef = doc(db, 'academicSessions', userData.academicSession);
            const sessionSnap = await getDoc(sessionDocRef);
            if (sessionSnap.exists()) setSessionName(sessionSnap.data().name);
          }
        } else {
          setError("User profile not found.");
        }
      } catch (err) {
        setError("Error fetching profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (error) return <AdminDashboardLayout><div className="p-10 text-center text-red-500 font-bold">{error}</div></AdminDashboardLayout>;

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-bold transition-colors">
            <ArrowLeft size={20} /> Back
          </button>
          <button onClick={() => navigate(`/admin/edit-profile/${userId}`)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95">
            <Edit size={18} /> Edit Profile
          </button>
        </div>

        {/* --- HEADER PROFILE CARD --- */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50" />
          
          <div className="relative shrink-0">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-gray-100 rotate-3">
              {user.documents?.photo ? <img src={user.documents.photo} alt="Profile" className="w-full h-full object-cover -rotate-3 hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={60} /></div>}
            </div>
            <div className={`absolute -bottom-2 -right-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-4 border-white shadow-lg ${user.status === 'Inactive' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {user.status || 'Active'}
            </div>
          </div>

          <div className="text-center md:text-left flex-1 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">{user.name}</h1>
              <div className="px-4 py-1 bg-gray-900 text-white text-[10px] font-black uppercase rounded-full tracking-widest">{user.role}</div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl font-bold border border-emerald-100 text-sm">
                <Phone size={16}/> {user.contactNumber} <span className="text-[10px] uppercase bg-emerald-200 px-2 py-0.5 rounded-full ml-1 text-emerald-800">OTP Login</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl font-bold border border-blue-100 text-sm">
                <Mail size={16}/> {user.email || 'N/A'}
              </div>
              <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-2xl font-bold border border-purple-100 text-sm">
                <ShieldCheck size={16}/> Registration: {user.registrationStatus}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- LEFT COLUMN: CORE DATA --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Primary Demographics */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <SectionHeader icon={User} title="Personal & Demographic Details" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-50 pb-4 mb-2">
                  <InfoField label="First Name" value={user.firstName} />
                  <InfoField label="Middle Name" value={user.middleName} />
                  <InfoField label="Last Name" value={user.lastName} />
                </div>
                
                <InfoField icon={Calendar} label="Date of Birth" value={user.dob} />
                <InfoField icon={Baby} label="Gender" value={user.gender} />
                <InfoField icon={Heart} label="Blood Group" value={user.bloodGroup} />
                <InfoField icon={Globe} label="Nationality" value={user.nationality} />
                {user.role === 'Student' && (
                  <>
                    <InfoField icon={Shield} label="Aadhaar Number" value={user.aadhaarNo} />
                    <InfoField icon={Globe} label="Mother Tongue" value={user.motherTongue} />
                    <InfoField icon={Info} label="Religion" value={user.religion} />
                  </>
                )}
                {user.role !== 'Student' && (
                  <InfoField icon={Shield} label="ID Proof" value={user.idProof?.type} subValue={user.idProof?.number} />
                )}
              </div>
            </div>

            {/* 2. Comprehensive Address */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <SectionHeader icon={MapPin} title="Residential Address Information" />
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Address</p>
                  <p className="font-bold text-gray-700 leading-relaxed">{user.addressDetails?.fullAddress || user.address}</p>
                </div>
                {user.role === 'Student' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField label="Locality / Para" value={user.addressDetails?.locality} />
                    <InfoField label="Panchayat / Ward" value={user.addressDetails?.panchayat} />
                    <InfoField label="Block / Muni" value={user.addressDetails?.block} />
                    <InfoField label="Police Station" value={user.addressDetails?.policeStation} />
                    <InfoField label="Post Office" value={user.addressDetails?.postOffice} />
                    <InfoField label="PIN Code" value={user.addressDetails?.pinCode} />
                    <InfoField label="District" value={user.addressDetails?.district} />
                    <InfoField label="State" value={user.addressDetails?.state} />
                    <InfoField label="Country" value={user.addressDetails?.country} />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Academic/Professional Section */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              {user.role === 'Student' ? (
                <>
                  <SectionHeader icon={GraduationCap} title="Institutional Academic Records" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <InfoField label="Admission No" value={user.admissionNo} />
                    <InfoField label="Admission Date" value={user.admissionDate} />
                    <InfoField label="Current Session" value={sessionName} />
                    <InfoField label="Class & Sec" value={`${user.class} - ${user.section || 'N/A'}`} subValue={`Roll: ${user.rollNo || 'N/A'}`} />
                  </div>
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Previous School" value={user.previousSchool?.name} />
                    <InfoField label="Prev. School Code" value={user.previousSchool?.code} />
                  </div>
                </>
              ) : (
                <>
                  <SectionHeader icon={Briefcase} title="Staff Professional Records" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField label="Employee ID" value={user.employeeId} />
                    <InfoField label="Designation" value={user.designation} />
                    <InfoField label="Qualification" value={user.qualification} />
                    <InfoField label="Joining Date" value={user.joiningDate} />
                    <InfoField label="Exp. (Years)" value={user.experience} />
                    <InfoField label="Marital Status" value={user.maritalStatus} />
                  </div>
                </>
              )}
            </div>

            {/* 4. Socio-Economic & Health (Student Only) */}
            {user.role === 'Student' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <SectionHeader icon={Activity} title="Socio-Economic Info" colorClass="bg-amber-100 text-amber-600" />
                  <div className="space-y-4">
                    <InfoField label="Social Category" value={user.socioEconomic?.category} />
                    <InfoField label="BPL Status" value={user.socioEconomic?.isBpl} subValue={user.socioEconomic?.isBpl === 'Yes' ? `BPL No: ${user.socioEconomic?.bplNo}` : null} />
                    <InfoField label="AAY Beneficiary" value={user.socioEconomic?.isAay} />
                    <InfoField label="EWS Category" value={user.socioEconomic?.isEws} />
                    <InfoField icon={Wallet} label="Annual Family Income" value={user.socioEconomic?.annualFamilyIncome ? `₹ ${user.socioEconomic?.annualFamilyIncome}` : ''} />
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <SectionHeader icon={Activity} title="Health & Special Needs" colorClass="bg-rose-100 text-rose-600" />
                  <div className="space-y-4">
                    <InfoField label="CWSN (Spec. Needs)" value={user.healthAndSpecifics?.isCwsn} />
                    {user.healthAndSpecifics?.isCwsn === 'Yes' && (
                      <InfoField label="SLD Type" value={user.healthAndSpecifics?.sldType} />
                    )}
                    <InfoField label="Out-of-School Status" value={user.healthAndSpecifics?.isOutOfSchool} />
                  </div>
                </div>
              </div>
            )}

            {/* 5. Bank Details (Student Only) */}
            {user.role === 'Student' && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <SectionHeader icon={Landmark} title="Banking Information" colorClass="bg-emerald-100 text-emerald-600" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InfoField label="Bank Name" value={user.bankDetails?.bankName} />
                  <InfoField label="Branch" value={user.bankDetails?.branchName} />
                  <InfoField label="IFSC Code" value={user.bankDetails?.ifsc} />
                  <InfoField label="Account Number" value={user.bankDetails?.accountNumber} />
                </div>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: FAMILY & DOCUMENTS --- */}
          <div className="space-y-6">
            
            {/* Documents Section */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <SectionHeader icon={FileText} title="Attached Documents" />
              <div className="space-y-3">
                {[1, 2, 3].map(num => {
                  const docData = user.documents?.[`doc${num}`];
                  if (!docData?.url) return null;
                  return (
                    <a key={num} href={docData.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 border border-gray-100 rounded-2xl hover:bg-blue-50 hover:border-blue-200 transition-all group">
                      <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><FileText size={18} /></div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-gray-700 text-xs truncate uppercase tracking-widest">{docData.label || `Document ${num}`}</p>
                        <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">Open Attachment <ExternalLink size={10}/></p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Family/Guardian Section */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              {user.role === 'Student' ? (
                <>
                  <SectionHeader icon={Users} title="Family Contacts" />
                  <div className="space-y-6">
                    {/* Father */}
                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-50">
                      <p className="text-[10px] font-black text-blue-400 uppercase mb-3">Father's Details</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InfoField label="First Name" value={user.parents?.father?.firstName} />
                          <InfoField label="Middle Name" value={user.parents?.father?.middleName} />
                          <InfoField label="Last Name" value={user.parents?.father?.lastName} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           <InfoField icon={Phone} label="Contact" value={user.parents?.father?.contact} />
                           <InfoField icon={Mail} label="Email ID" value={user.parents?.father?.email} />
                        </div>
                        <InfoField label="Occupation" value={user.parents?.father?.occupation} />
                        <InfoField label="Address" value={user.parents?.father?.address} />
                        <InfoField icon={Shield} label="ID Proof" value={user.parents?.father?.idProof?.type} subValue={user.parents?.father?.idProof?.number} />
                      </div>
                    </div>
                    {/* Mother */}
                    <div className="p-4 bg-pink-50/30 rounded-2xl border border-pink-50">
                      <p className="text-[10px] font-black text-pink-400 uppercase mb-3">Mother's Details</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InfoField label="First Name" value={user.parents?.mother?.firstName} />
                          <InfoField label="Middle Name" value={user.parents?.mother?.middleName} />
                          <InfoField label="Last Name" value={user.parents?.mother?.lastName} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           <InfoField icon={Phone} label="Contact" value={user.parents?.mother?.contact} />
                           <InfoField icon={Mail} label="Email ID" value={user.parents?.mother?.email} />
                        </div>
                        <InfoField label="Occupation" value={user.parents?.mother?.occupation} />
                        <InfoField label="Address" value={user.parents?.mother?.address} />
                        <InfoField icon={Shield} label="ID Proof" value={user.parents?.mother?.idProof?.type} subValue={user.parents?.mother?.idProof?.number} />
                      </div>
                    </div>
                    {/* Guardian */}
                    <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-50">
                      <p className="text-[10px] font-black text-purple-400 uppercase mb-3">Local Guardian</p>
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <InfoField label="First Name" value={user.parents?.localGuardian?.firstName} />
                          <InfoField label="Middle Name" value={user.parents?.localGuardian?.middleName} />
                          <InfoField label="Last Name" value={user.parents?.localGuardian?.lastName} />
                        </div>
                        <InfoField label="Relation" value={user.parents?.localGuardian?.relation} />
                        <InfoField icon={Phone} label="Contact" value={user.parents?.localGuardian?.contact} />
                        <InfoField label="Edu. Qualification" value={user.parents?.localGuardian?.qualification} />
                        <InfoField label="Address" value={user.parents?.localGuardian?.address} />
                        <InfoField icon={Shield} label="ID Proof" value={user.parents?.localGuardian?.idProof?.type} subValue={user.parents?.localGuardian?.idProof?.number} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SectionHeader icon={Heart} title="Emergency Contact (NOK)" />
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="space-y-2">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                          <InfoField label="First Name" value={user.emergencyContact?.firstName} />
                          <InfoField label="Middle Name" value={user.emergencyContact?.middleName} />
                          <InfoField label="Last Name" value={user.emergencyContact?.lastName} />
                       </div>
                       <InfoField label="Relationship" value={user.emergencyContact?.relation} />
                       <InfoField icon={Phone} label="Contact No" value={user.emergencyContact?.contact} />
                       <InfoField label="Full Address" value={user.emergencyContact?.address} />
                       <InfoField icon={Shield} label="ID Proof" value={user.emergencyContact?.idProof?.type} subValue={user.emergencyContact?.idProof?.number} />
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default ViewProfile;