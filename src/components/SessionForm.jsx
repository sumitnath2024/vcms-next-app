import React, { useState, useEffect } from 'react';
import { Save, Copy, CheckCircle } from 'lucide-react';

const SessionForm = ({ initialData, onSave, onCancel, isEditing, existingSessions = [] }) => {
  // Added isActive to state
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false 
  });
  
  const [copyFromId, setCopyFromId] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setCopyFromId(''); 
    }
  }, [initialData]);

  const handleSubmit = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert("Please fill in all fields");
      return;
    }
    onSave(formData, copyFromId);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl animate-in fade-in mb-6">
      <h3 className="font-semibold text-blue-800 mb-4">
        {isEditing ? 'Edit Session' : 'Create New Session'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-blue-900 uppercase">Session Name</label>
          <input 
            type="text" placeholder="e.g., 2024-2025" 
            className="w-full p-2 border rounded-md mt-1"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-blue-900 uppercase">Start Date</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded-md mt-1"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-blue-900 uppercase">End Date</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded-md mt-1"
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
          />
        </div>
      </div>

      {/* --- NEW: ACTIVE STATUS TOGGLE --- */}
      <div className="mb-4">
        <label className="flex items-center gap-3 p-3 border border-blue-100 bg-white rounded cursor-pointer hover:bg-blue-50/50 transition">
          <input 
            type="checkbox" 
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            checked={formData.isActive || false}
            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
          />
          <div>
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              Set as Active Session
              {formData.isActive && <CheckCircle className="h-4 w-4 text-green-500" />}
            </span>
            <p className="text-xs text-gray-400">
              Marking this as active will automatically deactivate any other currently active session.
            </p>
          </div>
        </label>
      </div>

      {!isEditing && existingSessions.length > 0 && (
        <div className="mb-4 bg-white p-3 rounded border border-blue-100">
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 mb-2">
            <Copy className="h-3 w-3" /> Copy Structure from Previous Session (Optional)
          </label>
          <select 
            className="w-full p-2 border rounded text-sm text-gray-700"
            value={copyFromId}
            onChange={(e) => setCopyFromId(e.target.value)}
          >
            <option value="">-- Start with Empty Session --</option>
            {existingSessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.startDate} to {session.endDate})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2">
          <Save className="h-4 w-4" /> {isEditing ? 'Update' : 'Save Session'}
        </button>
        <button onClick={onCancel} className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded-md">Cancel</button>
      </div>
    </div>
  );
};

export default SessionForm;