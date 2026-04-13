import React, { useState, useRef } from 'react';
import { Plus, X, Edit2, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import the Excel library

const SubjectManager = ({ subjects = [], onUpdateSubjects, teachers = [], exams = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  
  const initialFormState = { 
    indexNo: '', 
    name: '', 
    teacher: '', 
    teacherId: '', 
    marksType: 'Numeric', 
    examMarks: {} 
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSave = () => {
    if (!formData.name) return alert("Subject Name is required");

    let updatedSubjects = [...subjects];
    
    const subjectData = {
        ...formData,
        teacherId: formData.teacherId || '', 
        teacher: formData.teacher || 'Unassigned',
        examMarks: formData.examMarks || {}
    };

    if (editingId) {
      updatedSubjects = updatedSubjects.map(sub => sub.id === editingId ? { ...subjectData, id: editingId } : sub);
    } else {
      updatedSubjects.push({ ...subjectData, id: Math.random().toString(36).substr(2, 9) });
    }

    updatedSubjects.sort((a, b) => Number(a.indexNo) - Number(b.indexNo));

    onUpdateSubjects(updatedSubjects);
    setFormData(initialFormState);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this subject?")) {
      onUpdateSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const handleEdit = (sub) => {
    setFormData({
        ...sub,
        teacherId: sub.teacherId || '', 
        examMarks: sub.examMarks || {} 
    });
    setEditingId(sub.id);
    setShowForm(true);
  };

  const handleMarkChange = (examId, value) => {
    setFormData(prev => ({
        ...prev,
        examMarks: {
            ...prev.examMarks,
            [examId]: value
        }
    }));
  };

  const handleTeacherChange = (e) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
        setFormData(prev => ({ ...prev, teacherId: '', teacher: '' }));
        return;
    }

    const selectedTeacher = teachers.find(t => t.id === selectedId || t.uid === selectedId);
    
    setFormData(prev => ({
        ...prev,
        teacherId: selectedId,
        teacher: selectedTeacher ? selectedTeacher.name : ''
    }));
  };

  // --- EXCEL EXPORT ---
  const handleExport = () => {
    if (subjects.length === 0) {
      return alert("No subjects to export!");
    }

    // 1. Flatten the data so it looks good in Excel columns
    const excelData = subjects.map(sub => {
      const row = {
        Index: sub.indexNo,
        Subject: sub.name,
        Teacher: sub.teacher,
        TeacherID: sub.teacherId, // Kept for exact matching on import
        MarksType: sub.marksType,
      };
      
      // Add each exam as its own column dynamically
      exams.forEach(exam => {
        row[exam.name] = sub.examMarks?.[exam.id] || '';
      });
      
      return row;
    });

    // 2. Create workbook and save
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Subjects");
    
    // This triggers the browser download
    XLSX.writeFile(workbook, "subjects_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        // 1. Parse the Excel file
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 2. Reconstruct the subjects array from the flat Excel rows
        const importedSubjects = jsonData.map(row => {
          const examMarks = {};
          
          // Match column headers back to exam IDs
          exams.forEach(exam => {
            if (row[exam.name] !== undefined) {
              examMarks[exam.id] = row[exam.name];
            }
          });

          return {
            id: Math.random().toString(36).substr(2, 9), // Generate fresh IDs
            indexNo: row.Index?.toString() || '',
            name: row.Subject || '',
            teacher: row.Teacher || 'Unassigned',
            teacherId: row.TeacherID?.toString() || '',
            marksType: row.MarksType || 'Numeric',
            examMarks: examMarks
          };
        });

        // 3. Update the state
        onUpdateSubjects(importedSubjects);
        alert("Excel data imported successfully!");
      } catch (error) {
        console.error("Import error:", error);
        alert("Error parsing Excel file. Please ensure it uses the correct format.");
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="p-3 bg-gray-50/50 border-t border-dashed border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h6 className="text-xs font-bold text-gray-500 uppercase">Subjects & Full Marks</h6>
        
        <div className="flex items-center gap-4">
          {/* Updated input to accept Excel formats and CSV */}
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          
          <button 
            onClick={() => fileInputRef.current.click()}
            className="text-xs text-green-600 hover:underline flex items-center gap-1"
            title="Import from Excel"
          >
            <Upload className="h-3 w-3" /> Import
          </button>
          
          <button 
            onClick={handleExport}
            className="text-xs text-purple-600 hover:underline flex items-center gap-1"
            title="Export to Excel"
          >
            <Download className="h-3 w-3" /> Export
          </button>

          <div className="w-px h-3 bg-gray-300 mx-1"></div>

          <button 
            onClick={() => { setFormData(initialFormState); setEditingId(null); setShowForm(true); }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Subject
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm mb-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <div className="md:col-span-2">
              <input type="number" placeholder="Index" className="w-full p-2 border rounded text-sm" value={formData.indexNo} onChange={e => setFormData({...formData, indexNo: e.target.value})} />
            </div>
            <div className="md:col-span-5">
              <input type="text" placeholder="Subject Name" className="w-full p-2 border rounded text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="md:col-span-5">
              <select 
                className="w-full p-2 border rounded text-sm bg-white" 
                value={formData.teacherId} 
                onChange={handleTeacherChange}
              >
                <option value="">Select Teacher...</option>
                {teachers.map((t) => (
                    <option key={t.id || t.uid} value={t.id || t.uid}>
                        {t.name}
                    </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-3 text-sm">
            <span className="font-semibold text-gray-600">Marking Type:</span>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.marksType === 'Numeric'} onChange={() => setFormData({...formData, marksType: 'Numeric'})} /> Numeric</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.marksType === 'Grade'} onChange={() => setFormData({...formData, marksType: 'Grade'})} /> Grade</label>
          </div>

          <div className="mb-2">
             <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Full Marks Configuration</label>
             {exams.length === 0 ? (
                 <p className="text-xs text-orange-500 italic">No exams defined. Add exams in "Examination Types" first.</p>
             ) : (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {exams.map(exam => (
                       <div key={exam.id}>
                           <span className="text-[10px] text-gray-500 font-bold block truncate">{exam.name}</span>
                           <input 
                             type={formData.marksType === 'Numeric' ? 'number' : 'text'} 
                             placeholder="Full Marks" 
                             className="p-2 border rounded text-sm w-full" 
                             value={formData.examMarks?.[exam.id] || ''} 
                             onChange={e => handleMarkChange(exam.id, e.target.value)} 
                           />
                       </div>
                    ))}
                 </div>
             )}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded">{editingId ? 'Update' : 'Add'}</button>
            <button onClick={() => setShowForm(false)} className="text-xs border px-3 py-1.5 rounded">Cancel</button>
          </div>
        </div>
      )}

      {subjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left bg-white rounded border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2 min-w-[120px]">Subject</th>
                <th className="p-2">Teacher</th>
                {exams.map(exam => (
                    <th key={exam.id} className="p-2 text-center border-l border-gray-200" title={exam.name}>
                        {exam.name.substring(0, 8)}{exam.name.length > 8 ? '...' : ''}
                    </th>
                ))}
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(sub => (
                <tr key={sub.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-center font-bold text-gray-500">{sub.indexNo}</td>
                  <td className="p-2 font-medium">{sub.name}</td>
                  <td className="p-2">
                    {sub.teacher}
                  </td>
                  
                  {exams.map(exam => (
                      <td key={exam.id} className="p-2 text-center border-l border-gray-100 text-gray-600">
                          {sub.examMarks?.[exam.id] || '-'}
                      </td>
                  ))}

                  <td className="p-2 text-right">
                    <button onClick={() => handleEdit(sub)} className="text-blue-500 hover:text-blue-700 mr-2"><Edit2 className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700"><X className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-center text-xs text-gray-400 py-2">No subjects configured.</p>}
    </div>
  );
};

export default SubjectManager;