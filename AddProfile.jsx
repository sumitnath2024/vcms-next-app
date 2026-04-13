import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Briefcase, GraduationCap, Camera, 
  Save, FileText, Users, Heart
} from 'lucide-react';
import { db, storage, app } from '../../firebase';
import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const AddProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const DEFAULT_PASSWORD = 'H@ppyb1rthday';

  // --- Core State ---
  const [role, setRole] = useState('Student'); 
  const [sessions, setSessions] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // --- Form Data State ---
  const [formData, setFormData] = useState({
    // Common Fields
    firstName: '', lastName: '', email: '', contactNumber: '',
    gender: '', dob: '', bloodGroup: '', address: '',
    idProofType: '', idProofNo: '', // Main Profile ID

    // Student Specific
    admissionNo: '', 
    enrolledSession: '', enrollmentClass: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    
    // Student Parents & Local Guardian
    fatherName: '', fatherContact: '', fatherOccupation: '', fatherAddress: '', fatherIdType: '', fatherIdNo: '',
    motherName: '', motherContact: '', motherOccupation: '', motherAddress: '', motherIdType: '', motherIdNo: '',
    localGuardianName: '', localGuardianContact: '', localGuardianAddress: '', localGuardianRelation: '', localGuardianIdType: '', localGuardianIdNo: '',

    // Staff (Teacher/Admin) Specific
    employeeId: '', qualification: '', designation: '', 
    joiningDate: new Date().toISOString().split('T')[0], experience: '',
    maritalStatus: 'Unmarried', 
    
    // Staff Next of Kin (Spouse OR Father/Mother)
    nokName: '', nokContact: '', nokAddress: '', nokRelation: '', 
    nokIdType: '', nokIdNo: '', 

    // Document Labels
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

  // 2. Handle Inputs
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

  // 3. Submit Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // A. Create Auth User
      const apps = getApps();
      const secondaryApp = apps.find(a => a.name === 'SecondaryApp') || initializeApp(app.options, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, DEFAULT_PASSWORD);
      const newUserId = userCredential.user.uid;

      // B. Upload Files
      const uploadFile = async (file, label) => {
        if (!file) return '';
        const fileRef = ref(storage, `profiles/${role}/${newUserId}_${label}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
      };

      const docUrls = {
        photo: await uploadFile(files.photo, 'PHOTO'),
        doc1: { url: await uploadFile(files.doc1, 'DOC1'), label: formData.doc1Name },
        doc2: { url: await uploadFile(files.doc2, 'DOC2'), label: formData.doc2Name },
        doc3: { url: await uploadFile(files.doc3, 'DOC3'), label: formData.doc3Name },
      };

      // C. Construct Payload
      let finalData = {
        uid: newUserId,
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        contactNumber: formData.contactNumber,
        gender: formData.gender,
        dob: formData.dob,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        idProof: { type: formData.idProofType, number: formData.idProofNo },
        role: role,
        status: 'Active',
        documents: docUrls,
        createdAt: serverTimestamp(),
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
        // Teachers and Admins
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

      await setDoc(doc(db, 'users', newUserId), finalData);
      alert(`${role} Profile Created Successfully!`);
      navigate('/admin/dashboard');

    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20">
        
        {/* Header & Role Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Add New Profile</h1>
            <p className="text-gray-500">Create a new user account for the institution</p>
          </div>
          
          <div className="bg-white p-1 rounded-lg border shadow-sm flex">
            {['Student', 'Teacher', 'Admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                  role === r ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-100">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- SECTION 1: Personal Information (Common) --- */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
              <User size={18} className="text-blue-600"/>
              <h2 className="font-bold text-gray-700">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="text" name="firstName" placeholder="First Name" required onChange={handleInputChange} className="input-std" />
              <input type="text" name="lastName" placeholder="Last Name" required onChange={handleInputChange} className="input-std" />
              <select name="gender" required onChange={handleInputChange} className="input-std">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <input type="date" name="dob" title="Date of Birth" required onChange={handleInputChange} className="input-std" />
              <select name="bloodGroup" onChange={handleInputChange} className="input-std">
                <option value="">Blood Group (Optional)</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
              <input type="tel" name="contactNumber" placeholder="Mobile Number" required onChange={handleInputChange} className="input-std" />
              
              <input type="email" name="email" placeholder="Email Address" required onChange={handleInputChange} className="input-std" />
              <input type="text" name="address" placeholder="Full Residential Address" required onChange={handleInputChange} className="input-std md:col-span-2" />

              {/* Personal ID Proof */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                 {/* Changed to Input Field */}
                 <input type="text" name="idProofType" placeholder="ID Proof Type (e.g., Aadhar, Voter ID)" onChange={handleInputChange} className="input-std" />
                 <input type="text" name="idProofNo" placeholder="ID Proof Number (Optional)" onChange={handleInputChange} className="input-std" />
              </div>
            </div>
          </div>

          {/* --- SECTION 2: Academic / Professional Details --- */}
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
                  <input type="text" name="admissionNo" placeholder="Admission / Reg No." required onChange={handleInputChange} className="input-std" />
                  
                  <select name="enrolledSession" value={formData.enrolledSession} onChange={handleSessionChange} className="input-std">
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName || s.id}</option>)}
                  </select>

                  <select name="enrollmentClass" required value={formData.enrollmentClass} onChange={handleInputChange} className="input-std">
                    <option value="">Select Class</option>
                    {availableClasses.map((c, idx) => <option key={idx} value={c.name}>{c.name}</option>)}
                  </select>

                  <input type="date" name="enrollmentDate" title="Admission Date" value={formData.enrollmentDate} onChange={handleInputChange} className="input-std" />
                </>
              ) : (
                <>
                  <input type="text" name="employeeId" placeholder="Employee ID" required onChange={handleInputChange} className="input-std" />
                  <input type="text" name="designation" placeholder="Designation (e.g., PGT Physics)" required onChange={handleInputChange} className="input-std" />
                  <input type="text" name="qualification" placeholder="Qualification (e.g., M.Sc, B.Ed, PhD)" required onChange={handleInputChange} className="input-std" />
                  
                  <input type="date" name="joiningDate" title="Date of Joining" value={formData.joiningDate} onChange={handleInputChange} className="input-std" />
                  <input type="text" name="experience" placeholder="Prior Experience (Years)" onChange={handleInputChange} className="input-std" />
                </>
              )}
            </div>
          </div>

          {/* --- SECTION 3: FAMILY & GUARDIAN DETAILS --- */}

          {/* A. STUDENT FAMILY STRUCTURE */}
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
                        <input type="text" name="fatherName" placeholder="Name" onChange={handleInputChange} className="input-std" />
                        <input type="tel" name="fatherContact" placeholder="Contact No." onChange={handleInputChange} className="input-std" />
                        <input type="text" name="fatherOccupation" placeholder="Occupation" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="fatherAddress" placeholder="Address" onChange={handleInputChange} className="input-std" />
                        
                        {/* Father ID - Changed to Input */}
                        <input type="text" name="fatherIdType" placeholder="ID Type" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="fatherIdNo" placeholder="ID Number" onChange={handleInputChange} className="input-std" />
                    </div>
                </div>
                
                {/* Mother */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase text-gray-400">Mother's Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" name="motherName" placeholder="Name" onChange={handleInputChange} className="input-std" />
                        <input type="tel" name="motherContact" placeholder="Contact No." onChange={handleInputChange} className="input-std" />
                        <input type="text" name="motherOccupation" placeholder="Occupation" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="motherAddress" placeholder="Address" onChange={handleInputChange} className="input-std" />

                         {/* Mother ID - Changed to Input */}
                         <input type="text" name="motherIdType" placeholder="ID Type" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="motherIdNo" placeholder="ID Number" onChange={handleInputChange} className="input-std" />
                    </div>
                </div>

                {/* Local Guardian */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase text-blue-500">Local Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" name="localGuardianName" placeholder="Name" onChange={handleInputChange} className="input-std" />
                        <input type="tel" name="localGuardianContact" placeholder="Contact No." onChange={handleInputChange} className="input-std" />
                        <input type="text" name="localGuardianRelation" placeholder="Relation" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="localGuardianAddress" placeholder="Address" onChange={handleInputChange} className="input-std" />

                        {/* Local Guardian ID - Changed to Input */}
                        <input type="text" name="localGuardianIdType" placeholder="ID Type" onChange={handleInputChange} className="input-std" />
                        <input type="text" name="localGuardianIdNo" placeholder="ID Number" onChange={handleInputChange} className="input-std" />
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* B. TEACHER/ADMIN FAMILY STRUCTURE */}
          {role !== 'Student' && (
             <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b flex items-center gap-2">
                    <Heart size={18} className="text-blue-600"/>
                    <h2 className="font-bold text-gray-700">Family & Marital Status</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Marital Status Selector */}
                    <div className="md:col-span-4">
                        <label className="text-sm font-semibold text-gray-600 mb-1 block">Marital Status</label>
                        <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="input-std md:w-1/4">
                            <option value="Unmarried">Unmarried</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </div>

                    {/* Dynamic Fields based on Marital Status */}
                    <div className="md:col-span-4 border-t pt-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-4">
                            {formData.maritalStatus === 'Married' 
                                ? "Spouse Details" 
                                : "Father / Mother Details"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" name="nokName" 
                                placeholder={formData.maritalStatus === 'Married' ? "Spouse Name" : "Father/Mother Name"} 
                                required onChange={handleInputChange} className="input-std" />
                            
                            <input type="tel" name="nokContact" 
                                placeholder="Contact Number" 
                                required onChange={handleInputChange} className="input-std" />
                                
                            <input type="text" name="nokAddress" 
                                placeholder="Residential Address" 
                                required onChange={handleInputChange} className="input-std" />
                            
                            {/* Spouse/Parent ID - Changed to Input */}
                            <input type="text" name="nokIdType" placeholder="ID Proof Type" onChange={handleInputChange} className="input-std" />
                            <input type="text" name="nokIdNo" placeholder="ID Number" onChange={handleInputChange} className="input-std" />
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
                  <label className="text-sm font-bold text-blue-700 flex flex-col items-center gap-2 cursor-pointer">
                    <Camera size={24}/> 
                    Upload Profile Photo
                    <span className="text-xs font-normal text-gray-500">Required</span>
                  </label>
                  <input type="file" accept="image/*" required onChange={e => setFiles({...files, photo: e.target.files[0]})} className="text-xs mt-2" />
                </div>
                
                {[1, 2, 3].map(num => (
                  <div key={num} className="flex flex-col gap-2 p-4 border rounded-xl hover:shadow-md transition-all">
                    <input type="text" name={`doc${num}Name`} placeholder={`Doc ${num} Name (e.g., ID Proof)`} 
                      onChange={handleInputChange} className="text-xs font-bold uppercase tracking-wider bg-transparent border-b border-gray-200 outline-none mb-1 focus:border-blue-400" />
                    <input type="file" onChange={e => setFiles({...files, [`doc${num}`]: e.target.files[0]})} className="text-xs text-gray-500" />
                  </div>
                ))}
             </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <span className="animate-pulse">Processing Registration...</span> : <><Save size={20}/> Create {role} Profile</>}
          </button>

        </form>
      </div>
      
      <style>{`
        .input-std {
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          width: 100%;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        .input-std:focus {
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </AdminDashboardLayout>
  );
};

export default AddProfile;