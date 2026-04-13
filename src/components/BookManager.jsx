import React, { useState, useRef } from 'react';
import { Library, Plus, Trash2, Edit2, Save, X, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const BookManager = ({ books = [], onUpdateBooks }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', author: '', publisher: '', subject: '' });
  const fileInputRef = useRef(null);

  const handleSave = () => {
    if (!formData.name || !formData.subject) return alert("Book Name and Subject are required");
    const updated = editingId 
      ? books.map(b => b.id === editingId ? { ...formData, id: editingId } : b)
      : [...books, { ...formData, id: Math.random().toString(36).substr(2, 9) }];
    onUpdateBooks(updated);
    reset();
  };

  const reset = () => { 
    setFormData({ name: '', author: '', publisher: '', subject: '' }); 
    setIsAdding(false); 
    setEditingId(null); 
  };

  // --- EXCEL EXPORT ---
  const handleExportExcel = () => {
    if (books.length === 0) {
      return alert("No books to export!");
    }

    const excelData = books.map(book => ({
      'Subject': book.subject || '',
      'Book Name': book.name || '',
      'Author': book.author || '',
      'Publisher': book.publisher || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recommended Books");
    
    XLSX.writeFile(workbook, "books_backup.xlsx");
  };

  // --- EXCEL IMPORT ---
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Confirmation before overwriting
    if (books.length > 0 && !window.confirm("Importing this Excel file will replace your existing recommended books list. Continue?")) {
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

        const importedBooks = jsonData.map(row => ({
          id: Math.random().toString(36).substr(2, 9),
          subject: row['Subject'] || '',
          name: row['Book Name'] || '',
          author: row['Author'] || '',
          publisher: row['Publisher'] || ''
        }));

        onUpdateBooks(importedBooks);
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
          <Library className="h-4 w-4" /> Recommended Books
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
            <button onClick={() => setIsAdding(true)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition">
              <Plus className="h-3 w-3" /> Add Book
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
            placeholder="Book Name" 
            className="p-2 border rounded text-sm bg-white" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          <input 
            placeholder="Author" 
            className="p-2 border rounded text-sm bg-white" 
            value={formData.author} 
            onChange={e => setFormData({...formData, author: e.target.value})} 
          />
          <input 
            placeholder="Publisher" 
            className="p-2 border rounded text-sm bg-white" 
            value={formData.publisher} 
            onChange={e => setFormData({...formData, publisher: e.target.value})} 
          />
          <div className="flex gap-1">
            <button onClick={handleSave} className="flex-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition" title="Save">
              <Save className="h-4 w-4 mx-auto"/>
            </button>
            <button onClick={reset} className="flex-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition" title="Cancel">
              <X className="h-4 w-4 mx-auto"/>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
            <tr>
              <th className="p-2 border">Subject</th>
              <th className="p-2 border">Book Name</th>
              <th className="p-2 border">Author / Publisher</th>
              <th className="p-2 border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {books.length > 0 ? (
              books.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-2 border font-medium">{b.subject}</td>
                  <td className="p-2 border">{b.name}</td>
                  <td className="p-2 border text-gray-500">
                    {b.author || '-'} {b.publisher ? `| ${b.publisher}` : ''}
                  </td>
                  <td className="p-2 border text-right">
                    <button onClick={() => { setFormData(b); setEditingId(b.id); setIsAdding(true); }} className="p-1 text-blue-500 hover:text-blue-700 mr-1 transition" title="Edit">
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button onClick={() => {
                        if (window.confirm("Remove this book?")) {
                            onUpdateBooks(books.filter(x => x.id !== b.id))
                        }
                    }} className="p-1 text-red-500 hover:text-red-700 transition" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-400 italic">
                  No books added yet. Use the "Add Book" or "Import" buttons to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookManager;