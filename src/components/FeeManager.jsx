import React, { useState, useRef } from 'react';
import { Plus, X, Edit2, Coins, Receipt, Check, Calendar, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const FeeManager = ({ fees = [], onUpdateFees }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  
  // Standard Academic Month List
  const allMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const initialFormState = { 
    title: '', 
    amount: '', 
    selectedMonths: [] // Stores specific months (e.g. ['Jan', 'Feb'])
  };
  const [formData, setFormData] = useState(initialFormState);

  // Helper: Calculate total yearly impact
  const totalYearlyAmount = fees.reduce((sum, item) => {
    return sum + (Number(item.amount || 0) * (item.selectedMonths?.length || 0));
  }, 0);

  const handleSave = () => {
    if (!formData.title || !formData.amount) return alert("Fee Title and Amount are required");
    if (formData.selectedMonths.length === 0) return alert("Please select at least one month");

    let updatedFees = [...fees];
    if (editingId) {
      updatedFees = updatedFees.map(f => f.id === editingId ? { ...formData, id: editingId } : f);
    } else {
      updatedFees.push({ ...formData, id: Math.random().toString(36).substr(2, 9) });
    }

    onUpdateFees(updatedFees);
    setFormData(initialFormState);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Remove this fee?")) {
      onUpdateFees(fees.filter(f => f.id !== id));
    }
  };

  const handleEdit = (fee) => {
    setFormData(fee);
    setEditingId(fee.id);
    setShowForm(true);
  };

  const toggleMonth = (month) => {
    setFormData(prev => {
      if (prev.selectedMonths.includes(month)) {
        return { ...prev, selectedMonths: prev.selectedMonths.filter(m => m !== month) };
      } else {
        return { ...prev, selectedMonths: [...prev.selectedMonths, month] };
      }
    });
  };

  // Quick Select Helper
  const applyPreset = (presetType) => {
    let months = [];
    if (presetType === 'All') months = [...allMonths];
    if (presetType === 'Quarterly') months = ["Apr", "Jul", "Oct", "Jan"];
    if (presetType === 'Half-Yearly') months = ["Sep", "Mar"];
    if (presetType === 'Exam') months = ["Mar", "Dec"];
    setFormData({ ...formData, selectedMonths: months });
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (fees.length === 0) {
      return alert("No fees to export!");
    }

    const excelData = fees.map(fee => ({
      'Fee Title': fee.title || '',
      'Amount': fee.amount || 0,
      // Convert array of months to comma-separated string for Excel cell
      'Applicable Months': fee.selectedMonths ? fee.selectedMonths.join(', ') : '' 
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fee Structure");
    
    XLSX.writeFile(workbook, "fees_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmation before overwriting
    if (fees.length > 0 && !window.confirm("Importing this Excel file will replace your existing fee structure. Continue?")) {
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

        const importedFees = jsonData.map(row => {
          
          // Parse the comma-separated months string back into an array
          let monthsArray = [];
          if (row['Applicable Months']) {
              // Split by comma, trim whitespace, and only keep valid month strings
              monthsArray = row['Applicable Months']
                .split(',')
                .map(m => m.trim())
                .filter(m => allMonths.includes(m)); 
          }

          return {
            id: Math.random().toString(36).substr(2, 9),
            title: row['Fee Title'] || '',
            amount: row['Amount'] || '',
            selectedMonths: monthsArray
          };
        });

        onUpdateFees(importedFees);
        alert("Excel data imported successfully! Existing fee structure was replaced.");
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
          <Coins className="h-3 w-3" /> Fee Structure
        </h6>
        
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 mr-2">
             Yearly Total: ₹{totalYearlyAmount}
           </span>

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
             <Plus className="h-3 w-3" /> Add Fee
           </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm mb-3 animate-in fade-in">
          
          {/* Title & Amount Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Fee Head</label>
              <input 
                type="text" 
                placeholder="e.g. Tuition Fee" 
                className="p-2 border rounded text-sm w-full mt-1" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400">Amount (₹)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="p-2 border rounded text-sm w-full mt-1" 
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
            </div>
          </div>

          {/* Month Selector */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Applicable Months
              </label>
              <div className="flex gap-2 text-[10px]">
                <button onClick={() => applyPreset('All')} className="text-blue-600 hover:underline">All Year</button>
                <button onClick={() => applyPreset('Quarterly')} className="text-blue-600 hover:underline">Quarterly</button>
                <button onClick={() => setFormData({...formData, selectedMonths: []})} className="text-gray-400 hover:text-red-500">Clear</button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {allMonths.map(month => {
                const isSelected = formData.selectedMonths.includes(month);
                return (
                  <div 
                    key={month}
                    onClick={() => toggleMonth(month)}
                    className={`
                      cursor-pointer text-xs text-center py-1.5 rounded border transition select-none
                      ${isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm' 
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }
                    `}
                  >
                    {month}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} className="text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium transition">
              {editingId ? 'Update Fee' : 'Add Fee'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs border px-4 py-2 rounded hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Fee List Table */}
      {fees.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left bg-white rounded border">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-2 pl-3">Fee Title</th>
                <th className="p-2">Applicable Months</th>
                <th className="p-2 font-bold text-gray-700">Amount</th>
                <th className="p-2 text-right pr-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fees.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-2 pl-3 font-medium text-gray-800 flex items-center gap-2 align-top pt-3">
                    <Receipt className="h-3 w-3 text-gray-400 mt-0.5" /> {fee.title}
                  </td>
                  <td className="p-2 align-top pt-3">
                    <div className="flex flex-wrap gap-1">
                      {/* Logic to show "All Year" if all 12 are selected */}
                      {fee.selectedMonths?.length === 12 ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium border border-green-200">
                          All Year (Jan-Dec)
                        </span>
                      ) : (
                        fee.selectedMonths?.map(m => (
                          <span key={m} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">
                            {m}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-gray-700 font-semibold align-top pt-3">
                    ₹{fee.amount}
                    <span className="block text-[9px] text-gray-400 font-sans mt-0.5">
                      x {fee.selectedMonths?.length || 0} month(s)
                    </span>
                  </td>
                  <td className="p-2 text-right pr-3 align-top pt-3">
                    <button onClick={() => handleEdit(fee)} className="text-blue-500 hover:text-blue-700 mr-3 transition" title="Edit"><Edit2 className="h-3 w-3" /></button>
                    <button onClick={() => handleDelete(fee.id)} className="text-red-500 hover:text-red-700 transition" title="Delete"><X className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-5 border border-dashed rounded bg-gray-50 text-gray-400 text-xs italic">
          No fees added. Use "Add Fee" or "Import" to configure the fee structure.
        </div>
      )}
    </div>
  );
};

export default FeeManager;