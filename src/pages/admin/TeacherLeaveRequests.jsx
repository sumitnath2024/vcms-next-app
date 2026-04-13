import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions'; // <-- NEW IMPORT
import { db, functions } from '../../firebase'; // <-- ADDED functions
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { 
  ArrowLeft, FileText, Loader2, AlertCircle, CheckCircle, XCircle, MessageSquare
} from 'lucide-react';

const TeacherLeaveRequests = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // State to hold comments for each leave request while typing
  const [adminComments, setAdminComments] = useState({});

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const teacherDoc = await getDoc(doc(db, 'users', teacherId));
      if (teacherDoc.exists()) setTeacherName(teacherDoc.data().name);

      const leaveRef = collection(db, 'users', teacherId, 'leaveRequests');
      const q = query(leaveRef, orderBy('appliedOn', 'desc')); 
      const snapshot = await getDocs(q);
      
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeaveRequests(records);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (id, value) => {
    setAdminComments(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // --- UPDATED: Handle Status Update and Send Push Notification ---
  const handleUpdateStatus = async (leaveRequest, newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus} this leave request?`)) return;
    
    setProcessingId(leaveRequest.id);
    try {
      const comment = adminComments[leaveRequest.id] || ''; 
      const leaveDocRef = doc(db, 'users', teacherId, 'leaveRequests', leaveRequest.id);
      
      // 1. Update Firestore Document
      await updateDoc(leaveDocRef, {
        status: newStatus,
        adminComment: comment, 
        updatedAt: new Date().toISOString()
      });
      
      // 2. Update Local State
      setLeaveRequests(prev => prev.map(req => 
        req.id === leaveRequest.id ? { ...req, status: newStatus, adminComment: comment } : req
      ));

      // 3. Trigger Push Notification to the Teacher
      try {
        const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
        
        // Customize emoji based on status
        const statusEmoji = newStatus === 'Approved' ? '✅' : '❌';
        
        await sendPushNotification({
          targetUid: teacherId, 
          title: `Leave Request ${newStatus} ${statusEmoji}`,
          body: `Your leave request for ${leaveRequest.startDate} has been ${newStatus.toLowerCase()}. ${comment ? `Remark: ${comment}` : 'Check your portal for details.'}`
        });
        
        console.log(`Notification sent to ${teacherName} regarding leave ${newStatus}`);
      } catch (notifError) {
        console.error("Status updated, but failed to send push notification:", notifError);
      }

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Check console.");
    } finally {
      setProcessingId(null);
    }
  };

  // Helper function to calculate days
  const calculateDays = (start, end, savedTotal) => {
    if (savedTotal) return savedTotal; 
    if (!start || !end) return '-';    
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return diffDays > 0 ? diffDays : '-';
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-7xl mx-auto p-6 pb-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6 border-gray-200">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Leave Requests</h1>
              <p className="text-gray-500 mt-1">Manage applications for: <span className="font-bold text-blue-600">{teacherName || 'Loading...'}</span></p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 font-bold tracking-wide">LOADING LEAVE REQUESTS...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leaveRequests.length === 0 ? (
               <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                 <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                 <p className="text-gray-500 font-medium">No leave requests found for this teacher.</p>
               </div>
            ) : (
              leaveRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  
                  {/* Card Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-600"/>
                      <h2 className="font-bold text-gray-700">{request.leaveType || 'Leave Application'}</h2>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-md border ${
                      request.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                      request.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                      'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {request.status || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      
                      {/* Highlighted No. of Days Block */}
                      <div className="bg-blue-50 flex flex-col items-center justify-center p-4 rounded-xl border border-blue-100">
                        <span className="text-3xl font-black text-blue-600">
                          {calculateDays(request.startDate, request.endDate, request.totalDays)}
                        </span>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-1">Total Days</span>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date Range</p>
                        <p className="font-medium text-gray-800 text-sm">{request.startDate || 'N/A'}</p>
                        <p className="font-medium text-gray-800 text-sm">to {request.endDate || 'N/A'}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:col-span-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reason</p>
                        <p className="text-gray-700 text-sm">{request.reason || 'No reason provided.'}</p>
                      </div>

                    </div>

                    {/* Display Saved Admin Comment */}
                    {request.status && request.status !== 'Pending' && request.adminComment && (
                      <div className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-100 flex gap-3">
                        <MessageSquare size={18} className="text-gray-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Admin Remark</p>
                          <p className="text-gray-700 text-sm italic">"{request.adminComment}"</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons & Input */}
                    {(request.status === 'Pending' || !request.status) && (
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        
                        {/* Admin Comment Input */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                            Add Remark / Comment (Optional)
                          </label>
                          <textarea 
                            value={adminComments[request.id] || ''}
                            onChange={(e) => handleCommentChange(request.id, e.target.value)}
                            placeholder="Type a reason for approval/rejection..."
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                            rows="2"
                          ></textarea>
                        </div>

                        {/* Approval/Rejection Buttons */}
                        <div className="flex gap-3">
                          {/* NOTE: Changed to pass the whole request object, not just the ID */}
                          <button 
                            onClick={() => handleUpdateStatus(request, 'Approved')}
                            disabled={processingId === request.id}
                            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {processingId === request.id ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>}
                            Approve Leave
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(request, 'Rejected')}
                            disabled={processingId === request.id}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition disabled:opacity-50"
                          >
                            {processingId === request.id ? <Loader2 size={16} className="animate-spin"/> : <XCircle size={16}/>}
                            Reject
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default TeacherLeaveRequests;