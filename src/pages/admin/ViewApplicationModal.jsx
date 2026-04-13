import React from 'react';
import { X, User, MapPin, Activity, Landmark, Heart, BookOpen, Printer, FileText } from 'lucide-react';

const DataField = ({ label, value }) => (
  <div className="border-b border-gray-50 py-2">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-semibold text-gray-800">{value || 'N/A'}</p>
  </div>
);

const ViewApplicationModal = ({ app, onClose }) => {
  if (!app) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-blue-950 text-white p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-800 p-2.5 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{app.studentName}</h2>
              <p className="text-blue-300 text-xs font-mono">{app.applicationNo}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2 hover:bg-white/10 rounded-full transition" title="Print Application">
                <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gray-50/50">
          
          {/* Section 1: Personal & Demographics */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-blue-600 mb-4 tracking-tighter">
              <User size={16} /> Student Personal Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <DataField label="Full Name" value={app.studentName} />
              <DataField label="Gender" value={app.gender} />
              <DataField label="Date of Birth" value={app.dob} />
              <DataField label="Blood Group" value={app.bloodGroup} />
              <DataField label="Aadhaar No" value={app.aadhaarNo} />
              <DataField label="Mother Tongue" value={app.motherTongue} />
              <DataField label="Religion" value={app.religion} />
              <DataField label="Nationality" value={app.nationality} />
            </div>
          </section>

          {/* Section 2: Academic */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-indigo-600 mb-4 tracking-tighter">
              <BookOpen size={16} /> Academic Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <DataField label="Class Applied For" value={app.classApplied} />
              <DataField label="Previous School" value={app.prevSchoolName} />
              <DataField label="Prev School Code" value={app.prevSchoolCode} />
            </div>
          </section>

          {/* Section 3: Socio-Economic & Health */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-emerald-600 mb-4 tracking-tighter">
              <Activity size={16} /> Socio-Economic & Health
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <DataField label="Category" value={app.socialCategory} />
              <DataField label="BPL Status" value={app.isBpl} />
              <DataField label="BPL Number" value={app.bplNo} />
              <DataField label="AAY Beneficiary" value={app.isAay} />
              <DataField label="EWS Status" value={app.isEws} />
              <DataField label="CWSN" value={app.isCwsn} />
              <DataField label="Learning Disability" value={app.sldType} />
              <DataField label="Out of School" value={app.isOutOfSchool} />
            </div>
          </section>

          {/* Section 4: Contact & Address */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-orange-600 mb-4 tracking-tighter">
              <MapPin size={16} /> Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
              <DataField label="Full Residential Address" value={app.address} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <DataField label="District" value={app.district} />
              <DataField label="Locality" value={app.locality} />
              <DataField label="Police Station" value={app.policeStation} />
              <DataField label="PIN Code" value={app.pinCode} />
            </div>
          </section>

          {/* Section 5: Family Information */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-rose-600 mb-4 tracking-tighter">
              <Heart size={16} /> Parents & Guardian Details
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <DataField label="Annual Family Income" value={`₹ ${app.annualFamilyIncome}`} />
                 <DataField label="Guardian Qualification" value={app.guardianQualification} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-4">
                <div>
                  <h4 className="text-[11px] font-bold text-blue-900 uppercase mb-2">Father</h4>
                  <DataField label="Name" value={app.fatherName} />
                  <DataField label="Contact" value={app.fatherContact} />
                  <DataField label="Occupation" value={app.fatherOccupation} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-pink-900 uppercase mb-2">Mother</h4>
                  <DataField label="Name" value={app.motherName} />
                  <DataField label="Contact" value={app.motherContact} />
                  <DataField label="Occupation" value={app.motherOccupation} />
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Bank Details */}
          <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-4">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase text-cyan-600 mb-4 tracking-tighter">
              <Landmark size={16} /> Bank Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <DataField label="Bank Name" value={app.bankName} />
              <DataField label="Branch" value={app.branchName} />
              <DataField label="IFSC Code" value={app.ifsc} />
              <DataField label="Account No" value={app.accountNumber} />
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm">
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewApplicationModal;