import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Download, Upload, Trash2, GraduationCap, 
  ArrowUpDown, UserPlus, Search, X, ListOrdered, Edit3, Save
} from 'lucide-react';
import { 
  collection, getDocs, doc, updateDoc, query, where, onSnapshot 
} from 'firebase/firestore';
import { db } from '../../../firebase';
import AdminDashboardLayout from '../../../components/AdminDashboardLayout';

const AssignStudents = () => {
  // --- STATE ---
  const [sessions, setSessions] = useState([]);
  const [allStudents, setAllStudents] = useState([]); 
  const [loading, setLoading] = useState(true);

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Manual Add Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- NEW: ROLL NUMBER EDITING STATES ---
  const [isEditingRolls, setIsEditingRolls] = useState(false);
  const [localRoster, setLocalRoster] = useState([]);

  const fileInputRef = useRef(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, 'academicSessions'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.name.localeCompare(a.name)); 
      setSessions(data);
      if (!selectedSessionId && data.length > 0) {
        const activeOne = data.find(s => s.isActive);
        setSelectedSessionId(activeOne ? activeOne.id : data[0].id);
      }
    });

    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'Student'));
        const snap = await getDocs(q);
        const students = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          regNo: doc.data().admissionNo || 'N/A', 
          email: doc.data().email
        }));
        setAllStudents(students);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchStudents();
    return () => unsubSessions();
  }, [selectedSessionId]);

  // --- COMPUTED VARIABLES ---
  const currentSession = sessions.find(s => s.id === selectedSessionId);
  const currentClass = currentSession?.classes?.find(c => c.id === selectedClassId);
  const localStudents = currentClass?.students || [];

  // Get UIDs of all students assigned ANYWHERE in the current session
  const allAssignedUids = currentSession?.classes?.flatMap(c => c.students || []).map(s => s.uid) || [];

  // --- SYNC LOCAL ROSTER FOR EDITING ---
  useEffect(() => {
    setLocalRoster(localStudents);
    setIsEditingRolls(false); // Reset edit mode when class changes
  }, [selectedClassId, currentSession]); // Syncs when class selection or DB updates

  // --- SORTING ---
  const getSortedStudents = () => {
    // Note: We now sort the localRoster so edits stay visible in real-time
    return [...localRoster].sort((a, b) => {
      let valA = a[sortConfig.key] ? a[sortConfig.key].toString().toLowerCase() : '';
      let valB = b[sortConfig.key] ? b[sortConfig.key].toString().toLowerCase() : '';
      if (sortConfig.key === 'rollNo') { valA = Number(a[sortConfig.key]) || 0; valB = Number(b[sortConfig.key]) || 0; }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // --- ROLL NUMBER MANAGEMENT FUNCTIONS ---
const handleAutoAssignRolls = async () => {
    if (!window.confirm("Auto-assign roll numbers based on the current list order? This will overwrite existing roll numbers for this class.")) return;

    // Get the students exactly as they are currently displayed on the screen
    const currentDisplayedStudents = getSortedStudents();
    
    // Assign 1, 2, 3... based on their current row position
    const autoAssignedRoster = currentDisplayedStudents.map((s, index) => ({
      ...s,
      rollNo: String(index + 1)
    }));

    // Save directly to Firebase
    try {
      const updatedClasses = currentSession.classes.map(cls => {
        if (cls.id === selectedClassId) return { ...cls, students: autoAssignedRoster };
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', selectedSessionId), { classes: updatedClasses });
      
      // Update the local view immediately
      setLocalRoster(autoAssignedRoster);
      
      alert("Roll numbers auto-assigned successfully based on current row order!");
    } catch (error) {
      console.error(error);
      alert("Failed to auto-assign roll numbers.");
    }
  };

  const handleRollNoChange = (uid, newRollNo) => {
    setLocalRoster(prev => prev.map(s => s.uid === uid ? { ...s, rollNo: newRollNo } : s));
  };

  const saveManualRollNos = async () => {
    try {
      const updatedClasses = currentSession.classes.map(cls => {
        if (cls.id === selectedClassId) return { ...cls, students: localRoster };
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', selectedSessionId), { classes: updatedClasses });
      setIsEditingRolls(false);
      // Optional: Add a small success toast here if you have a toast library
    } catch (error) {
      console.error(error);
      alert("Failed to save manual changes.");
    }
  };


  // --- GLOBAL CSV DOWNLOAD (ALL CLASSES) ---
  const downloadAllTemplate = () => {
    if (!currentSession) return;
    let csvContent = `"Class Name","Registration Number","Student Name (Reference Only)","Roll Number"\n`;
    
    currentSession.classes.forEach(cls => {
      const studentsInClass = cls.students || [];
      if (studentsInClass.length > 0) {
        studentsInClass.forEach(s => {
          csvContent += `"${cls.name}","${s.regNo || ''}","${s.name || ''}","${s.rollNo || ''}"\n`;
        });
      } else {
        csvContent += `"${cls.name}","","",""\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentSession.name.replace(/\s+/g, '_')}_Master_Assignments.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- GLOBAL CSV UPLOAD & PROCESS ---
  const handleUploadAllCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("WARNING: This will overwrite ALL student assignments across ALL classes. Proceed?")) {
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      rows.shift(); 
      
      const parseCSVRow = (row) => {
        const result = [];
        let insideQuote = false;
        let currentVal = '';
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') insideQuote = !insideQuote;
          else if (char === ',' && !insideQuote) { result.push(currentVal); currentVal = ''; }
          else currentVal += char;
        }
        result.push(currentVal);
        return result.map(v => v.trim());
      };

      const parsedData = [];
      const invalidClassNames = new Set();
      const regNoClassTracker = {}; 

      rows.forEach(row => {
        const parsed = parseCSVRow(row);
        const className = (parsed[0] || '').trim();
        const regNo = (parsed[1] || '').trim().toLowerCase();
        const rollNo = (parsed[3] || '').trim();

        if (!className || !regNo) return;

        const classIndex = currentSession.classes.findIndex(c => c.name.toLowerCase() === className.toLowerCase());
        
        if (classIndex === -1) {
          invalidClassNames.add(className);
        } else {
          parsedData.push({ className, classIndex, regNo, rollNo });
          if (!regNoClassTracker[regNo]) regNoClassTracker[regNo] = [];
          if (!regNoClassTracker[regNo].includes(className)) regNoClassTracker[regNo].push(className);
        }
      });

      const duplicates = Object.entries(regNoClassTracker)
        .filter(([regNo, classes]) => classes.length > 1)
        .map(([regNo, classes]) => `Reg No: ${regNo.toUpperCase()} -> ${classes.join(' & ')}`);

      if (duplicates.length > 0) {
        alert(`IMPORT BLOCKED!\n\nDuplicate assignments found:\n\n${duplicates.join('\n')}\n\nPlease fix your CSV.`);
        e.target.value = null;
        return; 
      }

      const updatedClasses = currentSession.classes.map(cls => ({ ...cls, students: [] }));
      const notFoundRegNos = [];

      parsedData.forEach(data => {
        const studentMatch = allStudents.find(s => String(s.regNo).toLowerCase() === data.regNo);
        if (studentMatch) {
          updatedClasses[data.classIndex].students.push({
            uid: studentMatch.id,
            name: studentMatch.name, 
            regNo: studentMatch.regNo,
            rollNo: data.rollNo || '',
            assignedAt: new Date().toISOString()
          });
        } else {
          if (!notFoundRegNos.includes(data.regNo)) notFoundRegNos.push(data.regNo.toUpperCase());
        }
      });

      if (notFoundRegNos.length > 0 || invalidClassNames.size > 0) {
        const msg = `Validation warnings:\n` +
          `${notFoundRegNos.length > 0 ? `\nUnmatched Reg Nos: ${notFoundRegNos.join(', ')}` : ''}` +
          `${invalidClassNames.size > 0 ? `\nUnknown Classes: ${Array.from(invalidClassNames).join(', ')}` : ''}`;
        if (!window.confirm(msg + "\n\nProceed anyway?")) { e.target.value = null; return; }
      }

      try {
        await updateDoc(doc(db, 'academicSessions', selectedSessionId), { classes: updatedClasses });
        alert("Assignments successfully updated!");
      } catch (error) { alert("Failed to upload."); }
    };

    reader.readAsText(file);
    e.target.value = null; 
  };

  // --- MANUAL ADDITION ---
  const handleAssignSingle = async (student) => {
    try {
      const newEntry = { uid: student.id, name: student.name, regNo: student.regNo, rollNo: '', assignedAt: new Date().toISOString() };
      const updatedClasses = currentSession.classes.map(cls => {
        if (cls.id === selectedClassId) return { ...cls, students: [...(cls.students || []), newEntry] };
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', selectedSessionId), { classes: updatedClasses });
      setShowAddModal(false);
    } catch (error) { console.error(error); }
  };

  const handleRemoveStudent = async (studentUid) => {
    if (!window.confirm("Remove this student?")) return;
    try {
      const updatedClasses = currentSession.classes.map(cls => {
        if (cls.id === selectedClassId) return { ...cls, students: cls.students.filter(s => s.uid !== studentUid) };
        return cls;
      });
      await updateDoc(doc(db, 'academicSessions', selectedSessionId), { classes: updatedClasses });
    } catch (error) { console.error(error); }
  };

  if (loading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="flex justify-center items-center h-64 font-bold text-gray-400">LOADING...</div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 leading-none">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                Assign Students Master
            </h1>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">ছাত্র বরাদ্দ | ছাত্র आवंटन</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadAllTemplate} disabled={!selectedSessionId} className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 text-purple-700 rounded-xl hover:bg-purple-100 shadow-sm transition disabled:opacity-50">
              <Download className="h-4 w-4" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black uppercase leading-none">Export All</span>
                <span className="text-[8px] font-bold mt-1 uppercase">Master CSV</span>
              </div>
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleUploadAllCSV} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} disabled={!selectedSessionId} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition disabled:opacity-50">
              <Upload className="h-4 w-4" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-black uppercase leading-none">Import All</span>
                <span className="text-[8px] font-medium opacity-80 mt-1 uppercase">Overwrite Session</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* SELECTION */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">Academic Session</label>
            <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-50" value={selectedSessionId} onChange={(e) => { setSelectedSessionId(e.target.value); setSelectedClassId(''); }}>
              <option value="">Choose Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Active)' : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">View/Edit Class</label>
            <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold text-gray-700 outline-none focus:ring-4 focus:ring-blue-50 disabled:opacity-50" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={!selectedSessionId}>
              <option value="">Choose Class to View</option>
              {currentSession?.classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* LIST */}
        {selectedClassId ? (
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                 <h3 className="font-black text-gray-700 leading-none">{currentClass?.name} List</h3>
                 <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase shadow-sm">{localStudents.length} TOTAL</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* --- NEW: ROLL NUMBER ACTIONS --- */}
                <button 
                  onClick={handleAutoAssignRolls} 
                  disabled={localRoster.length === 0 || isEditingRolls}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                  title="Auto-assign roll numbers alphabetically"
                >
                  <ListOrdered size={16} />
                  <span className="text-xs uppercase">Auto-Assign Rolls</span>
                </button>

                {isEditingRolls ? (
                  <button 
                    onClick={saveManualRollNos} 
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition"
                  >
                    <Save size={16} />
                    <span className="text-xs uppercase">Save Changes</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingRolls(true)} 
                    disabled={localRoster.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold hover:bg-amber-100 transition disabled:opacity-50"
                  >
                    <Edit3 size={16} />
                    <span className="text-xs uppercase">Edit Roll Nos</span>
                  </button>
                )}

                <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                {/* Existing Add Button */}
                <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs font-black uppercase">Add Student</span>
                </button>
              </div>
            </div>

            {localRoster.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-400">
                    <tr>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition select-none" onClick={() => handleSort('regNo')}>
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest leading-none">Reg No {sortConfig.key === 'regNo' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition select-none" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest leading-none">Name {sortConfig.key === 'name' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-gray-200 transition select-none w-32 text-center" onClick={() => handleSort('rollNo')}>
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest leading-none">Roll No {sortConfig.key === 'rollNo' && <ArrowUpDown className="h-3 w-3" />}</div>
                      </th>
                      <th className="px-6 py-4 text-right"><p className="text-[10px] font-black uppercase leading-none">Remove</p></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {getSortedStudents().map((s) => (
                      <tr key={s.uid} className="hover:bg-blue-50/20 transition">
                        <td className="px-6 py-4 font-mono text-blue-600 font-black text-sm">{s.regNo || 'N/A'}</td>
                        <td className="px-6 py-4 font-bold text-gray-700">{s.name}</td>
                        <td className="px-6 py-4 font-black text-gray-800 text-lg text-center bg-gray-50/50 border-x border-gray-50">
                          {/* --- NEW: TOGGLE BETWEEN INPUT AND TEXT --- */}
                          {isEditingRolls ? (
                            <input 
                              type="text" 
                              value={s.rollNo || ''} 
                              onChange={(e) => handleRollNoChange(s.uid, e.target.value)}
                              className="w-16 text-center border-2 border-blue-400 rounded-lg p-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 font-bold"
                            />
                          ) : (
                            s.rollNo || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleRemoveStudent(s.uid)} className="text-gray-300 hover:text-red-600 transition p-2 hover:bg-red-50 rounded-xl"><Trash2 className="h-5 w-5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                <Users className="h-16 w-16 text-gray-100" />
                <p className="font-black text-gray-400 uppercase text-sm">No students in this class.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <GraduationCap className="h-16 w-16 mx-auto text-gray-100 mb-4" />
            <p className="text-gray-400 font-black uppercase text-sm">Select a Class to View Roster.</p>
          </div>
        )}
      </div>

      {/* --- ADD UNASSIGNED MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-gray-800 leading-none">Add Student</h3>
                <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase">Only showing students not in any class</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-full transition"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search by name or registration number..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
              </div>
              <div className="h-80 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50 custom-scrollbar">
                {allStudents
                  .filter(s => !allAssignedUids.includes(s.id)) 
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.regNo).includes(searchTerm))
                  .map(s => (
                    <div key={s.id} className="p-4 hover:bg-blue-50/50 flex justify-between items-center transition-colors">
                      <div>
                        <p className="font-black text-gray-800 text-sm leading-tight">{s.name}</p>
                        <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">Reg: {s.regNo}</p>
                      </div>
                      <button onClick={() => handleAssignSingle(s)} className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition transform active:scale-90">
                        <UserPlus size={18} />
                      </button>
                    </div>
                  ))
                }
                {allStudents.filter(s => !allAssignedUids.includes(s.id)).length === 0 && (
                  <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase">All students are assigned.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </AdminDashboardLayout>
  );
};

export default AssignStudents;