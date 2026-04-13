import React, { useState, useRef } from 'react';
import { Plus, X, Edit2, ClipboardList, Trash2, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExamManager = ({ exams = [], onUpdateExams }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const fileInputRef = useRef(null);

  const handleSave = () => {
    if (!formData.name) return alert("Exam Name is required");

    let updatedExams = [...exams];
    if (editingId) {
      updatedExams = updatedExams.map(e => e.id === editingId ? { ...formData, id: editingId } : e);
    } else {
      updatedExams.push({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }

    onUpdateExams(updatedExams);
    setFormData({ name: '', description: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this exam?")) {
      onUpdateExams(exams.filter(e => e.id !== id));
    }
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (exams.length === 0) {
      return alert("No exams to export!");
    }

    const excelData = exams.map(exam => ({
      'Exam Name': exam.name || '',
      'Description': exam.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exams");
    
    XLSX.writeFile(workbook, "exams_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmation before overwriting
    if (exams.length > 0 && !window.confirm("Importing this Excel file will replace your existing exam names. Continue?")) {
        e.target.value = ''; // Reset input
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedExams = jsonData.map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          name: row['Exam Name'] || '',
          description: row['Description'] || ''
        }));

        onUpdateExams(importedExams);
        alert("Excel data imported successfully! Existing data was replaced.");
      } catch (error) {
        console.error("Import error:", error);
        alert("Error parsing Excel file. Please ensure it uses the correct format.");
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  return (
    <div className="p-3 bg-gray-50/50 border-t border-dashed border-gray-200">
      
      {/* HEADER: Updated with Import/Export Actions */}
      <div className="flex justify-end mb-3">
        <div className="flex items-center gap-2">
          {/* Hidden Excel Input */}
          <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
              className="hidden" 
          />
          
          <button 
              onClick={() => fileInputRef.current.click()}
              className="text-[10px] text-green-600 bg-green-50 border border-green-100 hover:bg-green-100 px-2 py-1 rounded flex items-center gap-1 transition"
              title="Import from Excel (Replaces Current)"
          >
              <Upload className="h-3 w-3" /> Import
          </button>
          
          <button 
              onClick={handleExportExcel}
              className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1 transition"
              title="Export to Excel"
          >
              <Download className="h-3 w-3" /> Export
          </button>

          <div className="w-px h-3 bg-gray-300 mx-1"></div>

          <button 
            onClick={() => { setFormData({ name: '', description: '' }); setEditingId(null); setShowForm(true); }}
            className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition font-bold"
          >
            <Plus className="h-3 w-3" /> Add Exam
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm mb-3 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Exam Name</label>
              <input 
                type="text" 
                placeholder="e.g. First Term, Final Exam" 
                className="p-2 border rounded text-sm w-full mt-1"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Description</label>
              <textarea 
                placeholder="Details about syllabus or dates..." 
                className="p-2 border rounded text-sm w-full mt-1"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition">Save</button>
              <button onClick={() => setShowForm(false)} className="text-xs border px-3 py-1.5 rounded hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {exams.length > 0 ? (
          exams.map(exam => (
            <div key={exam.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200 hover:border-blue-200 transition">
              <div>
                <p className="text-sm font-bold text-gray-800">{exam.name}</p>
                <p className="text-xs text-gray-500">{exam.description}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setFormData(exam); setEditingId(exam.id); setShowForm(true); }} className="text-blue-500 hover:text-blue-700 transition" title="Edit"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(exam.id)} className="text-red-500 hover:text-red-700 transition" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic text-center py-4 border border-dashed rounded bg-gray-50">No exam names defined yet. Use "Add Exam" or "Import" to set them up.</p>
        )}
      </div>
    </div>
  );
};

export default ExamManager;