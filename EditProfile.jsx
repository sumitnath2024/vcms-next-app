import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, GraduationCap, Camera, 
  Save, FileText, Users, Heart, ArrowLeft, Loader2, ExternalLink
} from 'lucide-react';
import { db, storage } from '../../firebase';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

// --- Reusable Form Components for Consistent Styling ---
const FormInput = ({ label, type = "text", name, value, onChange, required, disabled, className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <input 
      type={type} 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required} 
      disabled={disabled}
      className={`p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}`}
    />
  </div>
);

const FormSelect = ({ label, name, value, onChange, required, children, className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <select 
      name={name} 
      value={value} 
      onChange={onChange} 
      required={required} 
      className="p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
    >
      {children}
    </select>
  </div>
);

const EditProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // --- Core State ---
  const [role, setRole] = useState(''); 
  const [sessions, setSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // --- Form Data State ---
  const [formData, setFormData] = useState({
    // Common
    firstName: '', lastName: '', email: '', contactNumber: '',
    gender: '', dob: '', bloodGroup: '', address: '',
    idProofType: '', idProofNo: '',

    // Student
    admissionNo: '', enrolledSession: '', enrollmentClass: '',
    enrollmentDate: '',
    
    // Student Family
    fatherName: '', fatherContact: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherName: '', motherContact: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianName: '', localGuardianContact: '', localGuardianAddress: '', localGuardianRelation: '', localGuardianIdType: '', localGuardianIdNo: '',

    // Staff
    employeeId: '', qualification: '', designation: '', 
    joiningDate: '', experience: '', maritalStatus: '', 
    
    // Staff NOK
    nokName: '', nokContact: '', nokAddress: '', nokRelation: '', 
    nokIdType: '', nokIdNo: '', 

    // Docs
    doc1Name: '', doc2Name: '', doc3Name: ''
  });

  const [existingDocs, setExistingDocs] = useState({ photo: '', doc1: '', doc2: '', doc3: '' });
  const [files, setFiles] = useState({ photo: null, doc1: null, doc2: null, doc3: null });

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionSnap = await getDocs(collection(db, 'academicSessions'));
        const sessionList = sessionSnap.docs.map(doc => ({
          id: doc.id,
          sessionName: doc.data().name, 
          classes: doc.data().classes || []
        }));
        setSessions(sessionList);

        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role); 
          setExistingDocs({
            photo: data.documents?.photo || '',
            doc1: data.documents?.doc1?.url || '',
            doc2: data.documents?.doc2?.url || '',
            doc3: data.documents?.doc3?.url || ''
          });

          if (data.academicSession) {
            const selectedSession = sessionList.find(s => s.id === data.academicSession);
            setAvailableClasses(selectedSession?.classes || []);
          }

          setFormData({
            firstName: data.firstName || data.name?.split(' ')[0] || '',
            lastName: data.lastName || data.name?.split(' ')[1] || '',
            email: data.email || '',
            contactNumber: data.contactNumber || '',
            gender: data.gender || '',
            dob: data.dob || '',
            bloodGroup: data.bloodGroup || '',
            address: data.address || '',
            idProofType: data.idProof?.type || '',
            idProofNo: data.idProof?.number || '',

            admissionNo: data.admissionNo || '',
            enrolledSession: data.academicSession || '',
            enrollmentClass: data.class || '',
            enrollmentDate: data.admissionDate || '',

            fatherName: data.parents?.father?.name || '',
            fatherContact: data.parents?.father?.contact || '',
            fatherOccupation: data.parents?.father?.occupation || '',
            fatherAddress: data.parents?.father?.address || '',
            fatherIdType: data.parents?.father?.idProof?.type || '',
            fatherIdNo: data.parents?.father?.idProof?.number || '',

            motherName: data.parents?.mother?.name || '',
            motherContact: data.parents?.mother?.contact || '',
            motherOccupation: data.parents?.mother?.occupation || '',
            motherAddress: data.parents?.mother?.address || '',
            motherIdType: data.parents?.mother?.idProof?.type || '',
            motherIdNo: data.parents?.mother?.idProof?.number || '',

            localGuardianName: data.parents?.localGuardian?.name || '',
            localGuardianContact: data.parents?.localGuardian?.contact || '',
            localGuardianAddress: data.parents?.localGuardian?.address || '',
            localGuardianRelation: data.parents?.localGuardian?.relation || '',
            localGuardianIdType: data.parents?.localGuardian?.idProof?.type || '',
            localGuardianIdNo: data.parents?.localGuardian?.idProof?.number || '',

            employeeId: data.employeeId || '',
            qualification: data.qualification || '',
            designation: data.designation || '',
            joiningDate: data.joiningDate || '',
            experience: data.experience || '',
            maritalStatus: data.maritalStatus || 'Unmarried',

            nokName: data.emergencyContact?.name || '',
            nokContact: data.emergencyContact?.contact || '',
            nokAddress: data.emergencyContact?.address || '',
            nokRelation: data.emergencyContact?.relation || '',
            nokIdType: data.emergencyContact?.idProof?.type || '',
            nokIdNo: data.emergencyContact?.idProof?.number || '',

            doc1Name: data.documents?.doc1?.label || '',
            doc2Name: data.documents?.doc2?.label || '',
            doc3Name: data.documents?.doc3?.label || '',
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

  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    const selectedSession = sessions.find(s => s.id === sessionId);
    setFormData(prev => ({ ...prev, enrolledSession: sessionId, enrollmentClass: '' }));
    setAvailableClasses(selectedSession?.classes || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    try {
      const getFileUrl = async (newFile, existingUrl, label) => {
        if (newFile) {
          const fileRef = ref(storage, `profiles/${role}/${userId}_${label}_${Date.now()}`);
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

      let finalData = {
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactNumber: formData.contactNumber,
        gender: formData.gender,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        idProof: { type: formData.idProofType, number: formData.idProofNo },
        documents: docUrls,
        updatedAt: serverTimestamp(),
      };

      if (role === 'Student') {
        finalData = {
          ...finalData,
          admissionNo: formData.admissionNo,
          academicSession: formData.enrolledSession,
          class: formData.enrollmentClass,
          admissionDate: formData.enrollmentDate,
          parents: {
            father: { 
              name: formData.fatherName, contact: formData.fatherContact, 
              occupation: formData.fatherOccupation, address: formData.fatherAddress,
              idProof: { type: formData.fatherIdType, number: formData.fatherIdNo }
            },
            mother: { 
              name: formData.motherName, contact: formData.motherContact, 
              occupation: formData.motherOccupation, address: formData.motherAddress,
              idProof: { type: formData.motherIdType, number: formData.motherIdNo }
            },
            localGuardian: { 
              name: formData.localGuardianName, contact: formData.localGuardianContact, 
              relation: formData.localGuardianRelation, address: formData.localGuardianAddress,
              idProof: { type: formData.localGuardianIdType, number: formData.localGuardianIdNo }
            }
          }
        };
      } else {
        finalData = {
          ...finalData,
          employeeId: formData.employeeId,
          qualification: formData.qualification,
          designation: formData.designation,
          joiningDate: formData.joiningDate,
          experience: formData.experience,
          maritalStatus: formData.maritalStatus,
          emergencyContact: {
            name: formData.nokName,
            contact: formData.nokContact,
            address: formData.nokAddress,
            relation: formData.maritalStatus === 'Married' ? 'Spouse' : 'Parent',
            idProof: { type: formData.nokIdType, number: formData.nokIdNo }
          }
        };
      }

      await updateDoc(doc(db, 'users', userId), finalData);
      alert("Profile updated successfully!");
      navigate('/admin/dashboard');

    } catch (err) {
      setError("Update failed: " + err.message);
    }
    setUpdating(false);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-600"/>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Edit Profile</h1>
              <p className="text-gray-500">Updating information for: <span className="font-semibold text-blue-600">{formData.firstName} {formData.lastName}</span></p>
            </div>
          </div>
          
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-blue-700 font-bold flex items-center gap-2">
            <User size={18}/> {role}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- SECTION 1: Personal Information --- */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <User size={18} className="text-blue-600"/>
              <h2 className="font-bold text-gray-700">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormInput label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
              <FormInput label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
              
              <FormSelect label="Gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </FormSelect>

              <FormInput label="Date of Birth" type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
              
              <FormSelect label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </FormSelect>
              
              <FormInput label="Mobile Number" type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required />
              <FormInput label="Email Address" type="email" name="email" value={formData.email} disabled />
              <FormInput label="Residential Address" name="address" value={formData.address} onChange={handleInputChange} required className="md:col-span-2" />

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                 <FormInput label="ID Proof Type" name="idProofType" value={formData.idProofType} onChange={handleInputChange} />
                 <FormInput label="ID Proof Number" name="idProofNo" value={formData.idProofNo} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          {/* --- SECTION 2: Role Specific Details --- */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-100 flex items-center gap-2">
              {role === 'Student' ? <GraduationCap size={18} className="text-blue-600"/> : <Briefcase size={18} className="text-blue-600"/>}
              <h2 className="font-bold text-blue-900">
                {role === 'Student' ? 'Academic Details' : 'Professional Details'}
              </h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {role === 'Student' ? (
                <>
                  <FormInput label="Admission / Reg No." name="admissionNo" value={formData.admissionNo} onChange={handleInputChange} required />
                  
                  <FormSelect label="Enrolled Session" name="enrolledSession" value={formData.enrolledSession} onChange={handleSessionChange}>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName || s.id}</option>)}
                  </FormSelect>

                  <FormSelect label="Enrolled Class" name="enrollmentClass" value={formData.enrollmentClass} onChange={handleInputChange} required>
                    <option value="">Select Class</option>
                    {availableClasses.map((c, idx) => <option key={idx} value={c.name}>{c.name}</option>)}
                  </FormSelect>

                  <FormInput label="Admission Date" type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleInputChange} />
                </>
              ) : (
                <>
                  <FormInput label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleInputChange} required />
                  <FormInput label="Designation" name="designation" value={formData.designation} onChange={handleInputChange} required />
                  <FormInput label="Qualification" name="qualification" value={formData.qualification} onChange={handleInputChange} required />
                  <FormInput label="Date of Joining" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} />
                  <FormInput label="Experience (Years)" name="experience" value={formData.experience} onChange={handleInputChange} />
                </>
              )}
            </div>
          </div>

          {/* --- SECTION 3: FAMILY & GUARDIAN DETAILS --- */}

          {role === 'Student' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <Users size={18} className="text-blue-600"/>
                <h2 className="font-bold text-gray-700">Parents & Guardian Information</h2>
              </div>
              <div className="p-6 space-y-8">
                {/* Father */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase text-gray-400">Father's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormInput label="Name" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="fatherContact" value={formData.fatherContact} onChange={handleInputChange} />
                        <FormInput label="Occupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleInputChange} />
                        <FormInput label="Address" name="fatherAddress" value={formData.fatherAddress} onChange={handleInputChange} />
                        <FormInput label="ID Type" name="fatherIdType" value={formData.fatherIdType} onChange={handleInputChange} />
                        <FormInput label="ID Number" name="fatherIdNo" value={formData.fatherIdNo} onChange={handleInputChange} />
                    </div>
                </div>
                
                {/* Mother */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase text-gray-400">Mother's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormInput label="Name" name="motherName" value={formData.motherName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="motherContact" value={formData.motherContact} onChange={handleInputChange} />
                        <FormInput label="Occupation" name="motherOccupation" value={formData.motherOccupation} onChange={handleInputChange} />
                        <FormInput label="Address" name="motherAddress" value={formData.motherAddress} onChange={handleInputChange} />
                        <FormInput label="ID Type" name="motherIdType" value={formData.motherIdType} onChange={handleInputChange} />
                        <FormInput label="ID Number" name="motherIdNo" value={formData.motherIdNo} onChange={handleInputChange} />
                    </div>
                </div>

                {/* Local Guardian */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase text-blue-500">Local Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormInput label="Name" name="localGuardianName" value={formData.localGuardianName} onChange={handleInputChange} />
                        <FormInput label="Contact No." name="localGuardianContact" value={formData.localGuardianContact} onChange={handleInputChange} />
                        <FormInput label="Relation" name="localGuardianRelation" value={formData.localGuardianRelation} onChange={handleInputChange} />
                        <FormInput label="Address" name="localGuardianAddress" value={formData.localGuardianAddress} onChange={handleInputChange} />
                        <FormInput label="ID Type" name="localGuardianIdType" value={formData.localGuardianIdType} onChange={handleInputChange} />
                        <FormInput label="ID Number" name="localGuardianIdNo" value={formData.localGuardianIdNo} onChange={handleInputChange} />
                    </div>
                </div>
              </div>
            </div>
          )}

          {role !== 'Student' && (
             <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                    <Heart size={18} className="text-blue-600"/>
                    <h2 className="font-bold text-gray-700">Family & Marital Status</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-4">
                         <FormSelect label="Marital Status" name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="md:w-1/4">
                            <option value="Unmarried">Unmarried</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </FormSelect>
                    </div>

                    <div className="md:col-span-4 border-t pt-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">
                            {formData.maritalStatus === 'Married' ? "Spouse Details" : "Father / Mother Details"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInput label="Name" name="nokName" value={formData.nokName} onChange={handleInputChange} />
                            <FormInput label="Contact Number" name="nokContact" value={formData.nokContact} onChange={handleInputChange} />
                            <FormInput label="Address" name="nokAddress" value={formData.nokAddress} onChange={handleInputChange} />
                            <FormInput label="ID Type" name="nokIdType" value={formData.nokIdType} onChange={handleInputChange} />
                            <FormInput label="ID Number" name="nokIdNo" value={formData.nokIdNo} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* --- SECTION 4: Documents --- */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
             <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                <FileText size={18} className="text-blue-600"/>
                <h2 className="font-bold text-gray-700">Documents & Photo</h2>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30 text-center">
                  <label className="text-sm font-bold text-blue-700 flex flex-col items-center gap-2">
                    <Camera size={24}/> 
                    Update Photo
                  </label>
                  {existingDocs.photo && (
                    <a href={existingDocs.photo} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center justify-center gap-1 mb-2">
                      <ExternalLink size={10} /> View Current
                    </a>
                  )}
                  <input type="file" accept="image/*" onChange={e => setFiles({...files, photo: e.target.files[0]})} className="text-xs" />
                </div>
                
                {[1, 2, 3].map(num => (
                  <div key={num} className="flex flex-col gap-2 p-4 border rounded-xl bg-gray-50">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Document Label</label>
                        <input type="text" name={`doc${num}Name`} value={formData[`doc${num}Name`]} placeholder={`e.g., Aadhar Card`} 
                            onChange={handleInputChange} className="text-xs font-bold bg-transparent border-b border-gray-300 outline-none mb-1 focus:border-blue-400" />
                    </div>
                    
                    {existingDocs[`doc${num}`] && (
                        <a href={existingDocs[`doc${num}`]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1 mb-1">
                            <ExternalLink size={10} /> View Uploaded File
                        </a>
                    )}
                    
                    <input type="file" onChange={e => setFiles({...files, [`doc${num}`]: e.target.files[0]})} className="text-xs text-gray-500" />
                  </div>
                ))}
             </div>
          </div>

          <button disabled={updating} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {updating ? <><Loader2 className="animate-spin" /> Saving Changes...</> : <><Save size={20}/> Update Profile</>}
          </button>

        </form>
      </div>
    </AdminDashboardLayout>
  );
};

export default EditProfile;