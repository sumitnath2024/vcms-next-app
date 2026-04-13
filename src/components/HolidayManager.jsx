import React, { useState } from 'react';
import { Umbrella, Plus, Trash2, Edit2, Calendar, Save, X } from 'lucide-react';

const HolidayManager = ({ holidays = [], onUpdateHolidays }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });

  const handleSave = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert("Please fill all holiday fields");
      return;
    }

    let updatedHolidays;
    if (editingId) {
      updatedHolidays = holidays.map(h => h.id === editingId ? { ...formData, id: editingId } : h);
    } else {
      updatedHolidays = [...holidays, { ...formData, id: Math.random().toString(36).substr(2, 9) }];
    }

    onUpdateHolidays(updatedHolidays);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this holiday?")) {
      onUpdateHolidays(holidays.filter(h => h.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', startDate: '', endDate: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (holiday) => {
    setFormData(holiday);
    setEditingId(holiday.id);
    setIsAdding(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-100 bg-orange-50/30 flex justify-between items-center">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Umbrella className="h-5 w-5 text-orange-500" />
          Holiday List
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 flex items-center gap-1 transition"
          >
            <Plus className="h-4 w-4" /> Add Holiday
          </button>
        )}
      </div>

      <div className="p-4">
        {isAdding && (
          <div className="mb-6 p-4 border border-orange-100 bg-orange-50/20 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-orange-800 uppercase">Holiday Name</label>
              <input 
                type="text" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Winter Break"
                className="w-full p-2 border rounded text-sm mt-1 focus:ring-2 focus:ring-orange-200 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-orange-800 uppercase">Start Date</label>
              <input 
                type="date" value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full p-2 border rounded text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-orange-800 uppercase">End Date</label>
              <input 
                type="date" value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full p-2 border rounded text-sm mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 flex justify-center"><Save className="h-4 w-4"/></button>
              <button onClick={resetForm} className="flex-1 bg-gray-200 text-gray-600 p-2 rounded hover:bg-gray-300 flex justify-center"><X className="h-4 w-4"/></button>
            </div>
          </div>
        )}

        {holidays.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm italic">No holidays added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b">
                  <th className="pb-2 font-semibold">Holiday Name</th>
                  <th className="pb-2 font-semibold">Duration</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holidays.map((holiday) => (
                  <tr key={holiday.id} className="hover:bg-gray-50 group">
                    <td className="py-3 font-medium text-gray-700">{holiday.name}</td>
                    <td className="py-3 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {holiday.startDate} — {holiday.endDate}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(holiday)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5"/></button>
                        <button onClick={() => handleDelete(holiday.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidayManager;