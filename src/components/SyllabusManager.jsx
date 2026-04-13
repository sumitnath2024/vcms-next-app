import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Copy, AlertCircle, CheckCircle, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const SyllabusManager = ({ 
  syllabus = [], 
  onUpdateSyllabus, 
  exams = [], 
  allClasses = [], 
  currentClassId 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('create'); // 'create', 'import_class', or 'import_excel'
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form States - Changed duration to startDate and endDate
  const initialForm = { 
    subjectName: '', 
    examId: '', 
    book: '', 
    startDate: '', 
    endDate: '', 
    questionType: '', 
    topics: '' 
  };
  const [formData, setFormData] = useState(initialForm);
  const [importClassId, setImportClassId] = useState('');
  const [importSyllabusId, setImportSyllabusId] = useState(''); 
  const [importStatus, setImportStatus] = useState(null);

  // Helper to get exam name and ID
  const getExamName = (id) => exams.find(e => e.id === id)?.name || 'Unknown Exam';
  const getExamIdByName = (name) => exams.find(e => e.name === name)?.id || '';

  // --- SAVE FRESH ENTRY ---
  const handleSave = () => {
    if (!formData.subjectName || !formData.examId) return alert("Subject Name and Exam are required");

    let updatedSyllabus = [...syllabus];
    if (editingId) {
      updatedSyllabus = updatedSyllabus.map(s => s.id === editingId ? { ...formData, id: editingId } : s);
    } else {
      updatedSyllabus.push({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }
    
    onUpdateSyllabus(updatedSyllabus);
    resetForm();
  };

  // --- IMPORT FROM OTHER CLASS LOGIC ---
  const handleImportFromClass = () => {
    if (!importClassId) return;
    
    const sourceClass = allClasses.find(c => c.id === importClassId);
    if (!sourceClass || !sourceClass.syllabus) {
      setImportStatus({ type: 'error', msg: 'No syllabus found in selected class.' });
      return;
    }

    // Optional confirmation before overwriting
    if (syllabus.length > 0 && !window.confirm("This will replace your existing syllabus entries. Continue?")) {
        return;
    }

    let syllabusToImport = sourceClass.syllabus;
    if (importSyllabusId) {
      syllabusToImport = sourceClass.syllabus.filter(s => s.id === importSyllabusId);
    }

    let importedCount = 0;

    const newEntries = syllabusToImport.map(item => {
        importedCount++;
        return {
          id: Math.random().toString(36).substr(2, 9),
          subjectName: item.subjectName || item.subjectId, 
          examId: item.examId, 
          book: item.book || '', 
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          questionType: item.questionType || '', 
          topics: item.topics || ''
        };
    }).filter(item => item !== null);

    if (importedCount === 0) {
      setImportStatus({ type: 'error', msg: 'No syllabus entries found to import.' });
    } else {
      // REPLACED: Overwrites instead of appending
      onUpdateSyllabus(newEntries);
      setImportStatus({ type: 'success', msg: `Successfully imported ${importedCount} entry(ies). Existing data replaced.` });
      setTimeout(() => resetForm(), 1500);
    }
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (syllabus.length === 0) {
      return alert("No syllabus entries to export!");
    }

    const excelData = syllabus.map(item => ({
      'Exam Name': getExamName(item.examId),
      'Subject': item.subjectName || item.subjectId,
      'Book': item.book || '',
      'Start Date': item.startDate || '',
      'End Date': item.endDate || '',
      'Question Type': item.questionType || '',
      'Topics': item.topics || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Syllabus");
    
    XLSX.writeFile(workbook, "syllabus_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional confirmation before overwriting
    if (syllabus.length > 0 && !window.confirm("Importing this Excel file will replace your existing syllabus entries. Continue?")) {
        e.target.value = ''; // Reset input so they can click it again later
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

        const importedSyllabus = jsonData.map(row => {
          const matchedExamId = getExamIdByName(row['Exam Name']);

          return {
            id: Math.random().toString(36).substr(2, 9),
            subjectName: row['Subject'] || '',
            examId: matchedExamId, 
            book: row['Book'] || '',
            startDate: row['Start Date'] || '',
            endDate: row['End Date'] || '',
            questionType: row['Question Type'] || '',
            topics: row['Topics'] || ''
          };
        });

        // REPLACED: Overwrites instead of appending
        onUpdateSyllabus(importedSyllabus);
        alert("Excel data imported successfully! Existing data was replaced.");
      } catch (error) {
        console.error("Import error:", error);
        alert("Error parsing Excel file. Please ensure it uses the correct format.");
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
    setShowForm(false);
    setImportStatus(null);
    setImportClassId('');
    setImportSyllabusId('');
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this syllabus entry?")) {
      onUpdateSyllabus(syllabus.filter(s => s.id !== id));
    }
  };

  return (
    <div className="p-4 bg-gray-50 border-t border-dashed border-gray-200">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h6 className="text-xs font-bold text-gray-500 uppercase">Syllabus Configuration</h6>
        
        <div className="flex items-center gap-3">
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
                className="text-xs text-green-600 hover:underline flex items-center gap-1"
                title="Import from Excel (Replaces Current)"
            >
                <Upload className="h-3 w-3" /> Excel In
            </button>
            
            <button 
                onClick={handleExportExcel}
                className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                title="Export to Excel"
            >
                <Download className="h-3 w-3" /> Excel Out
            </button>

            <div className="w-px h-3 bg-gray-300 mx-1"></div>

            <button 
                onClick={() => { setMode('import_class'); setShowForm(true); }}
                className="text-xs bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
                title="Copy from another class (Replaces Current)"
            >
                <Copy className="h-3 w-3" /> Copy
            </button>
            <button 
                onClick={() => { setMode('create'); setFormData(initialForm); setEditingId(null); setShowForm(true); }}
                className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded flex items-center gap-1"
            >
                <Plus className="h-3 w-3" /> Add Entry
            </button>
        </div>
      </div>

      {/* FORM AREA */}
      {showForm && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm mb-4 animate-in fade-in">
            {mode === 'import_class' ? (
                // IMPORT FROM CLASS MODE
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-700">Copy Syllabus from Another Class</h4>
                    <p className="text-xs text-orange-500 italic mb-2">Note: Importing will replace the current syllabus.</p>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <select 
                                className="flex-1 p-2 border rounded text-sm"
                                value={importClassId}
                                onChange={(e) => {
                                    setImportClassId(e.target.value);
                                    setImportSyllabusId('');
                                }}
                            >
                                <option value="">-- Select Source Class --</option>
                                {allClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <button onClick={handleImportFromClass} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-700 transition">Import</button>
                            <button onClick={resetForm} className="border px-4 py-2 rounded text-xs hover:bg-gray-100 transition">Cancel</button>
                        </div>
                        
                        {importClassId && (
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 p-2 border rounded text-sm bg-gray-50"
                                    value={importSyllabusId}
                                    onChange={(e) => setImportSyllabusId(e.target.value)}
                                >
                                    <option value="">-- Import ALL Syllabus Entries from Class --</option>
                                    {allClasses.find(c => c.id === importClassId)?.syllabus?.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.subjectName || s.subjectId} ({getExamName(s.examId)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    {importStatus && (
                        <div className={`text-xs flex items-center gap-2 ${importStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {importStatus.type === 'success' ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                            {importStatus.msg}
                        </div>
                    )}
                </div>
            ) : (
                // CREATE MODE
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input 
                        type="text" 
                        placeholder="Subject Name" 
                        className="p-2 border rounded text-sm"
                        value={formData.subjectName}
                        onChange={(e) => setFormData({...formData, subjectName: e.target.value})}
                    />

                    <select 
                        className="p-2 border rounded text-sm bg-white"
                        value={formData.examId}
                        onChange={(e) => setFormData({...formData, examId: e.target.value})}
                    >
                        <option value="">Select Exam</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>

                    <input 
                        type="text" 
                        placeholder="Book Name (Optional)" 
                        className="p-2 border rounded text-sm"
                        value={formData.book}
                        onChange={(e) => setFormData({...formData, book: e.target.value})}
                    />

                    <input 
                        type="text" 
                        placeholder="Question Type (e.g., MCQ, Theory)" 
                        className="p-2 border rounded text-sm"
                        value={formData.questionType}
                        onChange={(e) => setFormData({...formData, questionType: e.target.value})}
                    />

                    {/* Replaced Duration with Start/End Dates */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-16">Start:</label>
                        <input 
                            type="date" 
                            className="p-2 border rounded text-sm flex-1"
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-16">End:</label>
                        <input 
                            type="date" 
                            className="p-2 border rounded text-sm flex-1"
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        />
                    </div>

                    <textarea 
                        placeholder="Enter Topics / Chapters..." 
                        className="p-2 border rounded text-sm md:col-span-2 h-24 resize-y mt-2"
                        value={formData.topics}
                        onChange={(e) => setFormData({...formData, topics: e.target.value})}
                    />

                    <div className="md:col-span-2 flex gap-2">
                        <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">{editingId ? 'Update' : 'Save'}</button>
                        <button onClick={resetForm} className="text-xs border px-4 py-2 rounded hover:bg-gray-100 transition">Cancel</button>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* LIST VIEW */}
      {syllabus.length > 0 ? (
        <div className="overflow-x-auto">
            <table className="w-full text-xs text-left bg-white rounded border">
                <thead className="bg-gray-100 text-gray-600">
                    <tr>
                        <th className="p-2 border-b">Exam</th>
                        <th className="p-2 border-b">Subject</th>
                        <th className="p-2 border-b">Book</th>
                        <th className="p-2 border-b">Duration (Dates)</th>
                        <th className="p-2 border-b">Q. Type</th>
                        <th className="p-2 border-b w-1/4">Topics</th>
                        <th className="p-2 border-b text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {syllabus.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-2 font-bold text-blue-600">{getExamName(item.examId)}</td>
                            <td className="p-2 font-medium">{item.subjectName || item.subjectId}</td>
                            <td className="p-2 text-gray-600">{item.book || '-'}</td>
                            <td className="p-2 text-gray-500">
                                {item.startDate && item.endDate ? `${item.startDate} to ${item.endDate}` : (item.startDate || item.endDate || '-')}
                            </td>
                            <td className="p-2 text-gray-600">{item.questionType || '-'}</td>
                            <td className="p-2 text-gray-600 whitespace-pre-wrap">{item.topics}</td>
                            <td className="p-2 text-right whitespace-nowrap">
                                <button onClick={() => { setFormData({
                                    ...item,
                                    startDate: item.startDate || '',
                                    endDate: item.endDate || ''
                                }); setEditingId(item.id); setMode('create'); setShowForm(true); }} className="p-1 text-blue-500 hover:text-blue-700 mr-1"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      ) : (
        !showForm && <p className="text-center text-xs text-gray-400 py-4 italic">No syllabus entries yet.</p>
      )}
    </div>
  );
};

export default SyllabusManager;