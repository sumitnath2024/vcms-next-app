import React, { useState, useRef } from 'react';
import { 
  Plus, X, Edit2, ChevronDown, ChevronRight, GraduationCap, 
  Trash2, Users, Lock, Unlock, Download, Upload, CheckCircle2 
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ExamScheduler = ({ availableExams = [], schedules = [], onUpdateSchedules, subjects = [] }) => {
  const [editingId, setEditingId] = useState(null);
  const [activeExamId, setActiveExamId] = useState(null); 
  const [showFormFor, setShowFormFor] = useState(null);
  const fileInputRef = useRef(null);

  const initialFormState = { 
    subjectId: '', 
    subjectName: '',
    date: '', 
    startTime: '', 
    endTime: '', 
    status: 'HOLD', 
    allocations: [{ roomNo: '', rollNos: '' }] 
  };
  const [formData, setFormData] = useState(initialFormState);

  const getSchedulesForExam = (examId) => {
    return schedules.filter(s => s.examId === examId).sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const handleSave = (examId) => {
    if (!formData.subjectId || !formData.date || !formData.startTime) {
      return alert("Please fill in Subject, Date, and Time.");
    }
    
    const validAllocations = formData.allocations.filter(a => a.roomNo.trim() !== '');
    if (validAllocations.length === 0) {
      return alert("Please allocate at least one room.");
    }

    let updatedSchedules = [...schedules];
    const newEntry = { 
      ...formData, 
      status: formData.status || 'HOLD',
      allocations: validAllocations, 
      examId: examId, 
      id: editingId || Math.random().toString(36).substr(2, 9) 
    };

    if (editingId) {
      updatedSchedules = updatedSchedules.map(s => s.id === editingId ? newEntry : s);
    } else {
      updatedSchedules.push(newEntry);
    }

    onUpdateSchedules(updatedSchedules);
    setFormData(initialFormState);
    setShowFormFor(null);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this schedule?")) {
      onUpdateSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const handleEdit = (item) => {
    const allocations = item.allocations || [{ roomNo: item.roomNo || '', rollNos: item.rollNos || '' }];
    
    setFormData({ ...item, allocations });
    setEditingId(item.id);
    setShowFormFor(item.examId); 
    setActiveExamId(item.examId);
  };

  const handleToggleStatus = (scheduleId) => {
    let proceed = true;
    const updatedSchedules = schedules.map(s => {
      if (s.id === scheduleId) {
        // If the result is published, warn the admin before reverting it back to OPEN
        if (s.status === 'PUBLISHED') {
           const confirm = window.confirm("This subject is already PUBLISHED. Re-opening it will hide the result from students until published again. Continue?");
           if (!confirm) {
               proceed = false;
               return s;
           }
           return { ...s, status: 'OPEN' };
        }
        
        // Normal toggle between HOLD and OPEN
        const newStatus = s.status === 'OPEN' ? 'HOLD' : 'OPEN';
        return { ...s, status: newStatus };
      }
      return s;
    });

    if (proceed) {
        onUpdateSchedules(updatedSchedules);
    }
  };

  const handleSubjectChange = (e) => {
    const selectedId = e.target.value;
    const sub = subjects.find(s => s.id === selectedId);
    setFormData({ 
      ...formData, 
      subjectId: selectedId, 
      subjectName: sub ? sub.name : '' 
    });
  };

  const handleAllocationChange = (index, field, value) => {
    const newAllocations = [...formData.allocations];
    newAllocations[index][field] = value;
    setFormData({ ...formData, allocations: newAllocations });
  };

  const addAllocation = () => {
    setFormData({
      ...formData,
      allocations: [...formData.allocations, { roomNo: '', rollNos: '' }]
    });
  };

  const removeAllocation = (index) => {
    if (formData.allocations.length > 1) {
      const newAllocations = formData.allocations.filter((_, i) => i !== index);
      setFormData({ ...formData, allocations: newAllocations });
    }
  };

  const openAddForm = (examId) => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowFormFor(examId);
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (schedules.length === 0) {
      return alert("No schedules to export!");
    }

    const excelData = schedules.map(schedule => {
      const examName = availableExams.find(e => e.id === schedule.examId)?.name || 'Unknown Exam';
      const allocationsString = (schedule.allocations || [])
        .map(a => `Room ${a.roomNo} (Rolls: ${a.rollNos || 'All'})`)
        .join(' | ');

      return {
        'Exam Type': examName,
        'Exam ID': schedule.examId, 
        'Subject': schedule.subjectName || '',
        'Subject ID': schedule.subjectId || '',
        'Date': schedule.date || '',
        'Start Time': schedule.startTime || '',
        'End Time': schedule.endTime || '',
        'Status': schedule.status || 'HOLD',
        'Allocations Data': JSON.stringify(schedule.allocations || []) 
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Schedules");
    
    XLSX.writeFile(workbook, "exam_schedules_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (schedules.length > 0 && !window.confirm("Importing this Excel file will replace ALL existing schedules across ALL exams. Continue?")) {
        e.target.value = ''; 
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

        const importedSchedules = jsonData.map(row => {
          let parsedAllocations = [{ roomNo: '', rollNos: '' }];
          
          try {
            if (row['Allocations Data']) {
                parsedAllocations = JSON.parse(row['Allocations Data']);
            }
          } catch (e) {
            console.warn("Could not parse allocations for a row", e);
          }

          return {
            id: Math.random().toString(36).substr(2, 9),
            examId: row['Exam ID'] || '',
            subjectName: row['Subject'] || '',
            subjectId: row['Subject ID'] || '',
            date: row['Date'] || '',
            startTime: row['Start Time'] || '',
            endTime: row['End Time'] || '',
            status: row['Status'] || 'HOLD',
            allocations: parsedAllocations
          };
        });

        onUpdateSchedules(importedSchedules);
        alert("Excel data imported successfully! All existing schedules were replaced.");
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
      
      {/* Global Import/Export Actions */}
      <div className="flex justify-end mb-3">
        <div className="flex items-center gap-2">
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
                <Upload className="h-3 w-3" /> Import All
            </button>
            <button 
                onClick={handleExportExcel}
                className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1 transition"
                title="Export to Excel"
            >
                <Download className="h-3 w-3" /> Export All
            </button>
        </div>
      </div>

      {availableExams.length === 0 ? (
        <p className="text-center text-xs text-gray-400 py-4 italic border border-dashed rounded bg-gray-50">
          No Exam Types defined. Please add exams in "Examination Types" above.
        </p>
      ) : (
        <div className="space-y-3">
          {availableExams.map((exam) => {
            const typeSchedules = getSchedulesForExam(exam.id);
            const isOpen = activeExamId === exam.id;

            return (
              <div key={exam.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm transition-all hover:border-blue-200">
                
                {/* Header */}
                <div 
                  onClick={() => setActiveExamId(isOpen ? null : exam.id)}
                  className={`
                    flex justify-between items-center p-3 cursor-pointer transition
                    ${isOpen ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <div>
                      <h6 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" /> {exam.name}
                      </h6>
                      {exam.description && (
                        <p className="text-[10px] text-gray-400 ml-6 truncate max-w-[200px]">{exam.description}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeSchedules.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {typeSchedules.length} Papers
                  </span>
                </div>

                {/* Body */}
                {isOpen && (
                  <div className="p-4 animate-in fade-in slide-in-from-top-1">
                    
                    {/* Add Button */}
                    {showFormFor !== exam.id && (
                      <div className="flex justify-end mb-3">
                        <button 
                          onClick={() => openAddForm(exam.id)}
                          className="text-xs flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-medium transition"
                        >
                          <Plus className="h-3 w-3" /> Add Schedule
                        </button>
                      </div>
                    )}

                    {/* Add/Edit Form */}
                    {showFormFor === exam.id && (
                      <div className="bg-gray-50 p-4 rounded border border-blue-200 shadow-inner mb-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-2">
                          {editingId ? 'Edit Schedule' : `Add Paper for ${exam.name}`}
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                          <div className="md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-gray-400">Subject</label>
                            <select className="p-2 border rounded text-sm w-full mt-1 bg-white" value={formData.subjectId} onChange={handleSubjectChange}>
                              <option value="">-- Select Subject --</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Date</label>
                            <input type="date" className="p-2 border rounded text-sm w-full mt-1 bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400">Time</label>
                            <div className="flex items-center gap-1 mt-1">
                                <input type="time" className="p-2 border rounded text-sm w-full bg-white" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                                <span className="text-gray-400">-</span>
                                <input type="time" className="p-2 border rounded text-sm w-full bg-white" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                            </div>
                          </div>
                        </div>

                        {/* Room Allocations */}
                        <div className="mb-4">
                            <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-2 mb-2">
                                <Users className="h-3 w-3" /> Room & Seat Allocation
                            </label>
                            <div className="space-y-2 bg-white p-3 rounded border border-gray-200">
                                {formData.allocations.map((alloc, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="w-1/3">
                                            <input 
                                                type="text" 
                                                placeholder="Room No (e.g. 101)" 
                                                className="p-2 border rounded text-sm w-full"
                                                value={alloc.roomNo}
                                                onChange={(e) => handleAllocationChange(idx, 'roomNo', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-2/3">
                                            <input 
                                                type="text" 
                                                placeholder="Roll Nos (e.g. 1-20)" 
                                                className="p-2 border rounded text-sm w-full"
                                                value={alloc.rollNos}
                                                onChange={(e) => handleAllocationChange(idx, 'rollNos', e.target.value)}
                                            />
                                        </div>
                                        {formData.allocations.length > 1 && (
                                            <button 
                                                onClick={() => removeAllocation(idx)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                title="Remove Room"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={addAllocation} 
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-2 transition"
                                >
                                    <Plus className="h-3 w-3" /> Add Another Room
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t pt-3">
                          <button onClick={() => handleSave(exam.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium transition">
                            {editingId ? 'Update Schedule' : 'Save Schedule'}
                          </button>
                          <button onClick={() => setShowFormFor(null)} className="text-xs border bg-white px-3 py-1.5 rounded hover:bg-gray-50 transition">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Schedule Table */}
                    {typeSchedules.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left bg-white rounded border">
                          <thead className="bg-gray-100 text-gray-600">
                            <tr>
                              <th className="p-2 pl-3">Subject</th>
                              <th className="p-2">Date & Time</th>
                              <th className="p-2">Room Allocation</th>
                              <th className="p-2 text-center">Marks Entry Status</th>
                              <th className="p-2 text-right pr-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {typeSchedules.map(sch => (
                              <tr key={sch.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-2 pl-3 font-bold text-gray-700 align-top">{sch.subjectName}</td>
                                <td className="p-2 align-top">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-800">{sch.date}</span>
                                    <span className="text-[10px] text-gray-500">{sch.startTime} - {sch.endTime}</span>
                                  </div>
                                </td>
                                
                                <td className="p-2 align-top">
                                  <div className="space-y-1">
                                    {(sch.allocations || [{ roomNo: sch.roomNo, rollNos: sch.rollNos }]).map((alloc, i) => (
                                       <div key={i} className="flex items-center gap-2 text-gray-600">
                                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-mono font-medium">
                                            R: {alloc.roomNo}
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                            (Rolls: {alloc.rollNos || 'All'})
                                          </span>
                                       </div>
                                    ))}
                                  </div>
                                </td>

                                {/* STATUS TOGGLE BUTTON (UPDATED UI) */}
                                <td className="p-2 align-top text-center">
                                  <button 
                                    onClick={() => handleToggleStatus(sch.id)}
                                    className={`
                                      flex items-center justify-center gap-1.5 w-full py-2 rounded-md border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm
                                      ${sch.status === 'OPEN' 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
                                        : sch.status === 'PUBLISHED'
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                        : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                      }
                                    `}
                                  >
                                    {sch.status === 'OPEN' ? (
                                      <><Unlock className="h-3 w-3" /> Entry Open</>
                                    ) : sch.status === 'PUBLISHED' ? (
                                      <><CheckCircle2 className="h-3 w-3" /> Published</>
                                    ) : (
                                      <><Lock className="h-3 w-3" /> Entry Hold</>
                                    )}
                                  </button>
                                </td>

                                <td className="p-2 text-right pr-3 align-top whitespace-nowrap">
                                  <button onClick={() => handleEdit(sch)} className="text-blue-500 hover:text-blue-700 mr-2 transition" title="Edit"><Edit2 className="h-3 w-3" /></button>
                                  <button onClick={() => handleDelete(sch.id)} className="text-red-500 hover:text-red-700 transition" title="Delete"><X className="h-3 w-3" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-4 italic border border-dashed rounded bg-gray-50">
                        No schedule added for this exam yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamScheduler;