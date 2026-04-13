import React, { useState, useRef } from 'react';
import { Plus, X, Edit2, Clock, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const RoutineManager = ({ routine = [], onUpdateRoutine, teachers = [] }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const initialFormState = { 
    day: 'Monday', 
    startTime: '', 
    endTime: '', 
    subjectName: '', 
    teacherName: '',
    teacherId: '' 
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSave = () => {
    if (!formData.startTime || !formData.endTime || !formData.subjectName) {
      return alert("Time and Subject are required");
    }

    let updatedRoutine = [...routine];
    
    // Construct routine object
    const routineData = {
        ...formData,
        teacherId: formData.teacherId || '',
        teacherName: formData.teacherName || ''
    };

    if (editingId) {
      updatedRoutine = updatedRoutine.map(r => r.id === editingId ? { ...routineData, id: editingId } : r);
    } else {
      updatedRoutine.push({ ...routineData, id: Math.random().toString(36).substr(2, 9) });
    }

    // Sort by Day then by Start Time
    updatedRoutine.sort((a, b) => {
      const dayDiff = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    onUpdateRoutine(updatedRoutine);
    setFormData(initialFormState);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this period?")) {
      onUpdateRoutine(routine.filter(r => r.id !== id));
    }
  };

  const handleEdit = (item) => {
    setFormData({
        ...item,
        teacherId: item.teacherId || '', 
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  // Handle Teacher Dropdown Selection
  const handleTeacherChange = (e) => {
    const selectedId = e.target.value;
    
    if (!selectedId) {
        setFormData(prev => ({ ...prev, teacherId: '', teacherName: '' }));
        return;
    }

    // Find teacher object to get the name
    const selectedTeacher = teachers.find(t => t.id === selectedId || t.uid === selectedId);
    
    setFormData(prev => ({
        ...prev,
        teacherId: selectedId,
        teacherName: selectedTeacher ? selectedTeacher.name : ''
    }));
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (routine.length === 0) {
      return alert("No routine to export!");
    }

    const excelData = routine.map(r => ({
      'Day': r.day || '',
      'Start Time': r.startTime || '',
      'End Time': r.endTime || '',
      'Subject': r.subjectName || '',
      'Teacher': r.teacherName || '',
	  'Teacher ID': r.teacherId || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Class Routine");
    
    XLSX.writeFile(workbook, "routine_backup.xlsx");
  };

// --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmation before overwriting
    if (routine.length > 0 && !window.confirm("Importing this Excel file will replace your existing class routine. Continue?")) {
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

        const importedRoutine = jsonData.map(row => {
          // Support both the new format and older files that only had 'Teacher'
          const tName = row['Teacher Name'] || row['Teacher'] || '';
          const tId = row['Teacher ID'] || '';
          
          // Try to match by ID first, then fallback to name matching
          const matchedTeacher = teachers.find(t => {
            const isIdMatch = tId && (String(t.id) === String(tId) || String(t.uid) === String(tId));
            const isNameMatch = t.name?.toLowerCase() === tName.toLowerCase();
            return isIdMatch || isNameMatch;
          });

          return {
            id: Math.random().toString(36).substr(2, 9),
            day: row['Day'] || 'Monday',
            startTime: row['Start Time'] || '',
            endTime: row['End Time'] || '',
            subjectName: row['Subject'] || '',
            teacherName: matchedTeacher ? matchedTeacher.name : tName,
            // Grab the exact ID from the match, or use what was in the file
            teacherId: matchedTeacher ? (matchedTeacher.id || matchedTeacher.uid) : tId
          };
        });

        // Sort the imported routine immediately so it looks good on load
        importedRoutine.sort((a, b) => {
          const dayDiff = daysOfWeek.indexOf(a.day) - daysOfWeek.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.startTime.localeCompare(b.startTime);
        });

        onUpdateRoutine(importedRoutine);
        alert("Excel data imported successfully! Existing routine was replaced.");
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
      <div className="flex justify-between items-center mb-2">
        <h6 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
          <Clock className="h-3 w-3" /> Class Routine
        </h6>
        
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
            onClick={() => { setFormData(initialFormState); setEditingId(null); setShowForm(true); }}
            className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition"
          >
            <Plus className="h-3 w-3" /> Add Period
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm mb-3 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            {/* Day */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Day</label>
              <select className="p-2 border rounded text-sm w-full mt-1" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            
            {/* Time */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Start</label>
              <input type="time" className="p-2 border rounded text-sm w-full mt-1" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">End</label>
              <input type="time" className="p-2 border rounded text-sm w-full mt-1" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
            </div>

            {/* Subject (Now a text input) */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Subject</label>
              <input 
                type="text" 
                placeholder="e.g. Math, Break..." 
                className="p-2 border rounded text-sm w-full mt-1" 
                value={formData.subjectName} 
                onChange={e => setFormData({...formData, subjectName: e.target.value})} 
              />
            </div>

            {/* Teacher Select Dropdown */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Teacher</label>
              <select 
                className="p-2 border rounded text-sm w-full mt-1 bg-white" 
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
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded transition hover:bg-blue-700">{editingId ? 'Update' : 'Add Period'}</button>
            <button onClick={() => setShowForm(false)} className="text-xs border px-3 py-1.5 rounded transition hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Routine Grid Display */}
      {routine.length > 0 ? (
        <div className="space-y-3 mt-2">
          {daysOfWeek.map(day => {
            const dayRoutine = routine.filter(r => r.day === day);
            if (dayRoutine.length === 0) return null;

            return (
              <div key={day} className="flex flex-col sm:flex-row border rounded bg-white overflow-hidden text-xs">
                <div className="bg-gray-100 p-2 w-24 flex-shrink-0 font-bold text-gray-600 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-200">
                  {day}
                </div>
                <div className="flex-1 p-2 flex flex-wrap gap-2">
                  {dayRoutine.map(period => (
                    <div key={period.id} className="group relative border rounded px-3 py-1.5 bg-blue-50/50 hover:bg-blue-100 transition min-w-[140px]">
                      <div className="font-bold text-gray-800">{period.subjectName}</div>
                      <div className="text-[10px] text-gray-500 flex justify-between items-center mt-0.5">
                        <span>{period.startTime} - {period.endTime}</span>
                      </div>
                      <div className="text-[10px] text-blue-600 truncate">
                        {period.teacherName}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="absolute top-1 right-1 hidden group-hover:flex bg-white rounded shadow-sm border">
                        <button onClick={() => handleEdit(period)} className="p-1 hover:text-blue-600 transition"><Edit2 className="h-2.5 w-2.5" /></button>
                        <button onClick={() => handleDelete(period.id)} className="p-1 hover:text-red-600 transition"><X className="h-2.5 w-2.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-5 border border-dashed rounded bg-gray-50 text-gray-400 text-xs italic">
          No routine defined. Use "Add Period" or "Import" to set up the timetable.
        </div>
      )}
    </div>
  );
};

export default RoutineManager;