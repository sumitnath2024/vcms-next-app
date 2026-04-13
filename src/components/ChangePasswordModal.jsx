import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase'; 

const ChangePasswordModal = ({ isOpen, onClose, themeColor = "blue" }) => {
  const [passData, setPassData] = useState({ newPass: '', confirmPass: '' });
  const [showPass, setShowPass] = useState({ newPass: false, confirmPass: false });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  if (!isOpen) return null;

  const accentColor = themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

  // EXACT LOGIC FROM YOUR STUDENT PROFILE
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });

    if (passData.newPass.length < 6) {
      return setStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
    }
    if (passData.newPass !== passData.confirmPass) {
      return setStatus({ type: 'error', msg: 'Passwords do not match.' });
    }

    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      // Direct update just like StudentProfile.jsx
      await updatePassword(user, passData.newPass);
      
      setStatus({ type: 'success', msg: 'Password updated successfully!' });
      setPassData({ newPass: '', confirmPass: '' });
      
      setTimeout(() => {
        onClose();
        setStatus({ type: '', msg: '' });
      }, 2000);

    } catch (error) {
      console.error("Password Update Error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setStatus({ type: 'error', msg: 'Session expired. Please logout and log back in first.' });
      } else {
        setStatus({ type: 'error', msg: 'Failed to update password. Try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = (field) => {
    setShowPass(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-950/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Change Password</h3>
              <p className="text-xs text-gray-500 mt-1">পাসওয়ার্ড পরিবর্তন | पासवर्ड बदलें</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {status.msg && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2 ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              {status.msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* NEW PASSWORD */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                <span className="text-[9px] text-gray-400 font-medium">নতুন পাসওয়ার্ড</span>
              </div>
              <div className="relative">
                <input
                  type={showPass.newPass ? "text" : "password"}
                  value={passData.newPass}
                  onChange={(e) => setPassData({...passData, newPass: e.target.value})}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Min. 6 characters"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <button type="button" onClick={() => toggleVisibility('newPass')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass.newPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                <span className="text-[9px] text-gray-400 font-medium">নিশ্চিত করুন</span>
              </div>
              <div className="relative">
                <input
                  type={showPass.confirmPass ? "text" : "password"}
                  value={passData.confirmPass}
                  onChange={(e) => setPassData({...passData, confirmPass: e.target.value})}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Repeat new password"
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <button type="button" onClick={() => toggleVisibility('confirmPass')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass.confirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={loading} className={`flex-[1.5] px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${accentColor} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;