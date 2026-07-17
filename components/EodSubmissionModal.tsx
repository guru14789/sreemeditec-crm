import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, CheckCircle, AlertTriangle, ListTodo, Users, DollarSign, Calendar, MapPin, Play } from 'lucide-react';
import { useData } from './DataContext';
import { EodReport, Lead, Task, EodActivityTimelineItem } from '../types';

interface EodSubmissionModalProps {
  onClose: () => void;
  onCheckOut?: () => Promise<void>; // Optional handler to trigger attendance check-out
}

export const EodSubmissionModal: React.FC<EodSubmissionModalProps> = ({ onClose, onCheckOut }) => {
  const { 
    currentUser, addEodReport, eodReports, addNotification, showAlert,
    leads, tasks, invoices, attendanceRecords, serviceReports, deliveryChallans 
  } = useData();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // 1. Check if there's already an EOD report for today (or a draft)
  const existingReportForToday = useMemo(() => {
    return eodReports.find(r => r.userId === currentUser?.id && r.date === todayStr);
  }, [eodReports, currentUser?.id, todayStr]);

  const formatTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return isoStr;
    }
  };

  // Form input states
  const [challenges, setChallenges] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  
  // Selected Customer Updates
  const [customerUpdates, setCustomerUpdates] = useState<{ leadId: string; leadName: string; status: string; notes: string; }[]>([]);
  const [leadText, setLeadText] = useState('');
  const [newLeadUpdateStatus, setNewLeadUpdateStatus] = useState('Followed Up');
  const [newLeadUpdateNotes, setNewLeadUpdateNotes] = useState('');

  // Task Comments State
  const [taskComments, setTaskComments] = useState<Record<string, string>>({});

  // 2. Initialize from existing draft if it exists
  useEffect(() => {
    if (existingReportForToday) {
      setChallenges(existingReportForToday.challengesFaced || '');
      setTomorrowPlan(existingReportForToday.tomorrowPlan || '');
      setAdditionalComments(existingReportForToday.additionalComments || '');
      setCustomerUpdates(existingReportForToday.customerUpdates || []);
      
      const commentsMap: Record<string, string> = {};
      if (existingReportForToday.completedTasks) {
        existingReportForToday.completedTasks.forEach(item => {
          commentsMap[item.taskId] = item.comments;
        });
      }
      setTaskComments(commentsMap);
    }
  }, [existingReportForToday]);

  // 3. Auto-calculate metrics/summaries for today
  const attendanceToday = useMemo(() => {
    return attendanceRecords.find(r => r.userId === currentUser?.id && r.date === todayStr);
  }, [attendanceRecords, currentUser?.id, todayStr]);

  const leadsContactedToday = useMemo(() => {
    // Leads assigned to me that were contacted today
    return leads.filter(l => l.assignedTo === currentUser?.name && l.lastContact === todayStr);
  }, [leads, currentUser?.name, todayStr]);

  const tasksToday = useMemo(() => {
    return tasks.filter(t => (t.assignedTo || '').toLowerCase() === (currentUser?.name || '').toLowerCase() && t.dueDate === todayStr);
  }, [tasks, currentUser?.name, todayStr]);

  const completedTasksToday = useMemo(() => {
    return tasksToday.filter(t => t.status === 'Done');
  }, [tasksToday]);

  const myInvoicesToday = useMemo(() => {
    return invoices.filter(inv => inv.createdBy === currentUser?.name && inv.date === todayStr && inv.status !== 'Cancelled');
  }, [invoices, currentUser?.name, todayStr]);

  const myServiceTasksToday = useMemo(() => {
    return serviceReports.filter(rep => rep.engineerName === currentUser?.name && rep.date === todayStr);
  }, [serviceReports, currentUser?.name, todayStr]);

  // Generate Activity Timeline dynamically
  const activityTimeline: EodActivityTimelineItem[] = useMemo(() => {
    const list: EodActivityTimelineItem[] = [];
    
    if (attendanceToday?.checkInTime) {
      list.push({
        time: attendanceToday.checkInTime,
        type: 'CheckIn',
        title: 'Check In',
        description: `Checked in via ${attendanceToday.workMode || 'Office'}`
      });
    }

    leadsContactedToday.forEach(l => {
      list.push({
        time: '10:00 AM', // Approximation or dynamic if we tracked times
        type: 'LeadUpdate',
        title: `Lead Update: ${l.name}`,
        description: `Status: ${l.status || 'Follow Up'}`
      });
    });

    myInvoicesToday.forEach(inv => {
      list.push({
        time: '12:00 PM',
        type: inv.documentType === 'Quotation' ? 'Quotation' : 'Invoice',
        title: `${inv.documentType || 'Invoice'} Created`,
        description: `${inv.invoiceNumber} - Total: ₹${(inv.grandTotal || 0).toLocaleString('en-IN')}`
      });
    });

    completedTasksToday.forEach(t => {
      list.push({
        time: t.completedAt || '04:00 PM',
        type: 'Task',
        title: 'Task Completed',
        description: t.title
      });
    });

    if (attendanceToday?.checkOutTime) {
      list.push({
        time: attendanceToday.checkOutTime,
        type: 'CheckOut',
        title: 'Check Out',
        description: 'Checked out manually'
      });
    }

    myServiceTasksToday.forEach(s => {
      list.push({
        time: '05:00 PM',
        type: 'Service',
        title: 'Service Call Closed',
        description: s.subject || 'Equipment Serviced'
      });
    });

    return list;
  }, [attendanceToday, leadsContactedToday, myInvoicesToday, completedTasksToday, myServiceTasksToday]);

  const crmSummary = useMemo(() => ({
    leadsAssigned: leads.filter(l => l.assignedTo === currentUser?.name && l.createdDate === todayStr).length,
    leadsContacted: leadsContactedToday.length,
    newLeadsAdded: leads.filter(l => l.createdBy === currentUser?.name && l.createdDate === todayStr).length,
    followUpsCompleted: leadsContactedToday.filter(l => l.nextActionDate === todayStr).length
  }), [leads, currentUser?.name, todayStr, leadsContactedToday]);

  const salesSummary = useMemo(() => ({
    quotationsCreated: myInvoicesToday.filter(inv => inv.documentType === 'Quotation').length,
    invoicesCreated: myInvoicesToday.filter(inv => inv.documentType === 'Invoice' || !inv.documentType).length,
    totalSalesValue: myInvoicesToday.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
  }), [myInvoicesToday]);

  const taskSummary = useMemo(() => ({
    assigned: tasksToday.length,
    completed: completedTasksToday.length,
    pending: tasksToday.filter(t => t.status !== 'Done').length
  }), [tasksToday, completedTasksToday]);

  const serviceSummary = useMemo(() => ({
    installationsCompleted: myServiceTasksToday.filter(s => (s.subject || '').toLowerCase().includes('install')).length,
    serviceCallsClosed: myServiceTasksToday.length
  }), [myServiceTasksToday]);

  const attendanceSummary = useMemo(() => ({
    checkInTime: attendanceToday?.checkInTime || '',
    checkOutTime: attendanceToday?.checkOutTime || '',
    workingHours: attendanceToday?.totalWorkedMs ? Number((attendanceToday.totalWorkedMs / 3600000).toFixed(1)) : 0,
    workMode: attendanceToday?.workMode || '',
    gpsLocation: attendanceToday?.checkInLocation || ''
  }), [attendanceToday]);

  // Handler to add a Lead Update to the report (Typable support)
  const handleAddLeadUpdate = () => {
    if (!leadText.trim()) return;

    const match = leads.find(l => l.name.toLowerCase() === leadText.trim().toLowerCase());
    const leadId = match ? match.id : `CUSTOM-${Date.now()}`;
    const leadName = match ? match.name : leadText.trim();

    if (customerUpdates.some(u => u.leadId === leadId || u.leadName.toLowerCase() === leadName.toLowerCase())) {
      addNotification('Duplicate', 'This lead is already added.', 'alert');
      return;
    }

    setCustomerUpdates(prev => [
      ...prev,
      {
        leadId,
        leadName,
        status: newLeadUpdateStatus,
        notes: newLeadUpdateNotes
      }
    ]);
    setLeadText('');
    setNewLeadUpdateNotes('');
  };

  const handleRemoveLeadUpdate = (leadId: string) => {
    setCustomerUpdates(prev => prev.filter(u => u.leadId !== leadId));
  };

  // Main Save Handler
  const handleSave = async (status: 'Draft' | 'Submitted') => {

    const completedTasksList = completedTasksToday.map(t => {
      let timeStr = '';
      if (t.completedAt) {
        try {
          const date = new Date(t.completedAt);
          if (!isNaN(date.getTime())) {
            timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          } else {
            timeStr = t.completedAt;
          }
        } catch (e) {
          timeStr = t.completedAt;
        }
      }
      return {
        taskId: t.id,
        taskTitle: t.title,
        comments: taskComments[t.id] || '',
        completedAt: timeStr || 'N/A'
      };
    });

    const userId = currentUser?.id || 'anonymous';
    const userName = currentUser?.name || 'Staff Member';

    const reportData: EodReport = {
      id: existingReportForToday?.id || `EOD-${userId}-${todayStr}`,
      userId: userId,
      userName: userName,
      date: todayStr,
      timestamp: new Date().toISOString(),
      reportStatus: status,
      attendanceSummary,
      crmSummary,
      salesSummary,
      taskSummary,
      serviceSummary,
      activityTimeline,
      customerUpdates,
      completedTasks: completedTasksList,
      challengesFaced: challenges,
      tomorrowPlan,
      additionalComments
    };

    try {
      await addEodReport(reportData);
      
      if (status === 'Submitted') {
        await showAlert('Your End of Day (EOD) Report has been submitted successfully to the administrator.', 'Submission Successful');
      } else {
        await showAlert('Your EOD Report draft has been saved successfully.', 'Draft Saved');
      }
      
      if (status === 'Submitted' && onCheckOut) {
        await onCheckOut();
      }
      onClose();
    } catch (e) {
      console.error('Failed to submit EOD:', e);
      addNotification('Submission Failed', 'Error saving report to server.', 'alert');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white/95 border border-slate-200 shadow-2xl rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">End of Day (EOD) Report</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Date: {todayStr} · User: {currentUser?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-700">
          
          {/* Shift & Auto-tracked Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">Attendance Hours</span>
              <span className="text-sm font-black text-emerald-600 mt-1">{attendanceSummary.workingHours || 0} Hours</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">Leads Contacted</span>
              <span className="text-sm font-black text-indigo-600 mt-1">{crmSummary.leadsContacted || 0} Leads</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">Tasks Completed</span>
              <span className="text-sm font-black text-purple-600 mt-1">{taskSummary.completed} / {taskSummary.assigned}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">Quotations/Sales</span>
              <span className="text-sm font-black text-teal-600 mt-1">₹{(salesSummary.totalSalesValue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Section 1: Customer & Lead Follow-ups */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">1. Today's Lead & Customer Updates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Lead * (Typable)</label>
                <input 
                  list="leads-list-suggest"
                  type="text"
                  className="h-[36px] bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none"
                  placeholder="Type or select lead..."
                  value={leadText}
                  onChange={e => setLeadText(e.target.value)}
                />
                <datalist id="leads-list-suggest">
                  {leads.filter(l => l.assignedTo === currentUser?.name).map(l => (
                    <option key={l.id} value={l.name} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status *</label>
                <select 
                  className="h-[36px] bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer"
                  value={newLeadUpdateStatus}
                  onChange={e => setNewLeadUpdateStatus(e.target.value)}
                >
                  <option>Followed Up</option>
                  <option>Meeting Completed</option>
                  <option>Quotation Sent</option>
                  <option>Negotiation</option>
                  <option>Order Finalized</option>
                  <option>Lost Lead</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Outcome Notes</label>
                  <input 
                    type="text" 
                    className="h-[36px] bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none" 
                    placeholder="Brief details..."
                    value={newLeadUpdateNotes}
                    onChange={e => setNewLeadUpdateNotes(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleAddLeadUpdate} 
                  className="h-[36px] bg-slate-800 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors"
                >
                  Link
                </button>
              </div>
            </div>

            {/* Linked Lead Updates List */}
            {customerUpdates.length > 0 && (
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {customerUpdates.map((update, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] font-black text-slate-800 uppercase block">{update.leadName}</span>
                      <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider block">Outcome: {update.status}</span>
                      {update.notes && <span className="text-[9px] font-medium text-slate-500 mt-1 block">Notes: {update.notes}</span>}
                    </div>
                    <button 
                      onClick={() => handleRemoveLeadUpdate(update.leadId)} 
                      className="text-rose-500 hover:text-rose-700 text-[8px] font-black uppercase tracking-widest border border-rose-200 hover:bg-rose-50 px-2 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Completed Tasks & Comments */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">2. Today's Completed Tasks & Comments</h3>
            {completedTasksToday.length > 0 ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {completedTasksToday.map((task) => (
                  <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-start gap-2 max-w-[50%]">
                      <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 uppercase leading-snug">{task.title}</span>
                        {task.completedAt && (
                          <span className="text-[8px] font-bold text-indigo-600 mt-0.5">
                            Completed: {formatTime(task.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <input 
                        type="text" 
                        className="w-full h-[32px] bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-semibold outline-none focus:bg-white"
                        placeholder="Add comments/achievements for this task..."
                        value={taskComments[task.id] || ''}
                        onChange={e => setTaskComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">No tasks marked as completed today.</p>
              </div>
            )}
          </div>

          {/* Text Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Challenges Faced Today (Optional)</label>
              <textarea 
                className="w-full h-[80px] bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-800/10 focus:bg-white resize-none"
                placeholder="e.g. Customer unavailable, logistics delay, technical issues..."
                value={challenges}
                onChange={e => setChallenges(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Plan for Tomorrow (Optional)</label>
              <textarea 
                className="w-full h-[80px] bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-800/10 focus:bg-white resize-none"
                placeholder="e.g. Follow up on Apollo Hospital quote, client installation at KMCH..."
                value={tomorrowPlan}
                onChange={e => setTomorrowPlan(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">5. Additional Comments (Optional)</label>
            <textarea 
              className="w-full h-[60px] bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-800/10 focus:bg-white resize-none"
              placeholder="Any other updates..."
              value={additionalComments}
              onChange={e => setAdditionalComments(e.target.value)}
            />
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50 justify-between items-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            All database modifications will auto-update in this report.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => handleSave('Draft')}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >
              Save Draft
            </button>
            <button 
              onClick={() => handleSave('Submitted')}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95"
            >
              Submit Report
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
