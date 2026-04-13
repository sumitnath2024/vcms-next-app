import React, { useState, useRef } from 'react';
import { StickyNote, Plus, Trash2, Edit2, Save, X, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const CopyManager = ({ copies = [], onUpdateCopies }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: '', description: '', subject: '' });
  const fileInputRef = useRef(null);

  const handleSave = () => {
    if (!formData.name || !formData.subject) return alert("Copy Name and Subject are required");
    const updated = editingId 
      ? copies.map(c => c.id === editingId ? { ...formData, id: editingId } : c)
      : [...copies, { ...formData, id: Math.random().toString(36).substr(2, 9) }];
    onUpdateCopies(updated);
    reset();
  };

  const reset = () => { 
    setFormData({ name: '', type: '', description: '', subject: '' }); 
    setIsAdding(false); 
    setEditingId(null); 
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (copies.length === 0) {
      return alert("No items to export!");
    }

    const excelData = copies.map(copy => ({
      'Subject': copy.subject || '',
      'Copy Name': copy.name || '',
      'Type': copy.type || '',
      'Description': copy.description || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stationery");
    
    XLSX.writeFile(workbook, "stationery_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmation before overwriting
    if (copies.length > 0 && !window.confirm("Importing this Excel file will replace your existing stationery list. Continue?")) {
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

        const importedCopies = jsonData.map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          subject: row['Subject'] || '',
          name: row['Copy Name'] || '',
          type: row['Type'] || '',
          description: row['Description'] || ''
        }));

        onUpdateCopies(importedCopies);
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
    <div className="p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
          <StickyNote className="h-4 w-4" /> Stationery & Copies
        </h5>
        
        {/* Action Buttons Container */}
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

          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100 flex items-center gap-1 hover:bg-orange-100 transition">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 p-3 border rounded-lg bg-gray-50 animate-in fade-in">
          <input 
            placeholder="Subject Name" 
            className="p-2 border rounded text-sm bg-white" 
            value={formData.subject} 
            onChange={e => setFormData({...formData, subject: e.target.value})} 
          />
          <input 
            placeholder="Copy Name (e.g. Rough Copy)" 
            className="p-2 border rounded text-sm" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          <input 
            placeholder="Type (e.g. 120 Pages)" 
            className="p-2 border rounded text-sm" 
            value={formData.type} 
            onChange={e => setFormData({...formData, type: e.target.value})} 
          />
          <input 
            placeholder="Short Description" 
            className="p-2 border rounded text-sm" 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
          />
          <div className="flex gap-1">
            <button onClick={handleSave} className="flex-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition" title="Save">
              <Save className="h-4 w-4 mx-auto"/>
            </button>
            <button onClick={reset} className="flex-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition" title="Cancel">
              <X className="h-4 w-4 mx-auto"/>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {copies.length > 0 ? (
          copies.map(c => (
            <div key={c.id} className="p-3 border rounded-lg bg-orange-50/20 relative group transition-colors hover:bg-orange-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">{c.subject}</p>
                  <p className="font-bold text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.type}</p>
                  {c.description && <p className="text-[10px] text-gray-400 mt-1 italic">{c.description}</p>}
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setFormData(c); setEditingId(c.id); setIsAdding(true); }} className="p-1 text-gray-400 hover:text-blue-600" title="Edit">
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button onClick={() => {
                      if (window.confirm("Remove this item?")) {
                          onUpdateCopies(copies.filter(x => x.id !== c.id))
                      }
                  }} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-6 text-xs text-gray-400 italic">
            No stationery or copies added yet. Use the "Add Item" or "Import" buttons to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default CopyManager;