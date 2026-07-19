import React, { useState, useMemo } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, ListTodo, Award, CheckCircle, 
  ChevronRight, AlertTriangle, ArrowRight, ShieldCheck, Download, Search, Star 
} from 'lucide-react';
import { useData } from './DataContext';
import { EodReport, Employee, TabView } from '../types';
import { EodSubmissionModal } from './EodSubmissionModal';

interface EodReportsModuleProps {
  userRole?: string;
}

export const EodReportsModule: React.FC<EodReportsModuleProps> = ({ userRole }) => {
  const { 
    eodReports, employees, updateEodReport, addNotification, 
    leads, tasks, invoices, attendanceRecords, serviceReports, currentUser 
  } = useData();

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

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Returned' | 'Locked'>('All');
  
  // Manager Action States
  const [managerRating, setManagerRating] = useState(5);
  const [managerComments, setManagerComments] = useState('');
  
  // Selected Report for Details
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Staff View State
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const myTodayReport = useMemo(() => {
    return eodReports.find(r => r.userId === currentUser?.id && r.date === todayStr);
  }, [eodReports, currentUser?.id, todayStr]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return eodReports.filter(report => {
      const matchEmp = selectedEmployeeId ? report.userId === selectedEmployeeId : true;
      const matchDate = selectedDate ? report.date === selectedDate : true;
      const matchStatus = selectedStatus !== 'All' ? report.reportStatus === selectedStatus : true;
      return matchEmp && matchDate && matchStatus;
    });
  }, [eodReports, selectedEmployeeId, selectedDate, selectedStatus]);

  // Selected Employee Details
  const activeEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  // Report currently being reviewed/viewed
  const activeReport = useMemo(() => {
    if (activeReportId) {
      return eodReports.find(r => r.id === activeReportId);
    }
    return filteredReports[0] || null;
  }, [eodReports, activeReportId, filteredReports]);

  // Attendance Records matching current filters
  const selectedAttendance = useMemo(() => {
    if (!selectedEmployeeId || !selectedDate) return null;
    return attendanceRecords.find(r => r.userId === selectedEmployeeId && r.date === selectedDate);
  }, [attendanceRecords, selectedEmployeeId, selectedDate]);

  // Manager Actions
  const handleReviewAction = async (status: 'Approved' | 'Returned' | 'Reviewed') => {
    if (!activeReport) return;
    
    const updates: Partial<EodReport> = {
      reportStatus: status,
      managerComments: managerComments,
      managerRating: managerRating,
      approvedBy: currentUser?.name || 'Admin',
      approvedOn: new Date().toISOString()
    };

    try {
      await updateEodReport(activeReport.id, updates);
      addNotification('Report Updated', `Report status changed to ${status}`, 'success');
      setManagerComments('');
    } catch (e) {
      console.error('Failed to update report:', e);
      addNotification('Error', 'Failed to update report status.', 'alert');
    }
  };

  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      addNotification('No Data', 'No reports match selected filters.', 'alert');
      return;
    }

    const headers = ['Date', 'Employee', 'Status', 'Work Hours', 'Leads Contacted', 'Sales Value (₹)', 'Tasks Completed', 'Challenges', 'Tomorrow Plan', 'Rating'];
    const rows = filteredReports.map(r => [
      r.date,
      r.userName,
      r.reportStatus,
      r.attendanceSummary?.workingHours || 0,
      r.crmSummary?.leadsContacted || 0,
      r.salesSummary?.totalSalesValue || 0,
      r.taskSummary?.completed || 0,
      r.challengesFaced || '',
      r.tomorrowPlan || '',
      r.managerRating || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `EOD_Reports_${selectedDate || 'Export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // STAFF VIEW
  if (userRole !== 'Admin') {
    return (
      <div className="h-full overflow-y-auto space-y-6 pb-8 pr-1 custom-scrollbar text-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl m-1 md:m-3 lg:m-4 rounded-[2rem] text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg md:text-xl font-playfair font-bold uppercase tracking-tight leading-none">My EOD Report</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Review and update your today's activity tracking</p>
            </div>
            {(!myTodayReport || (myTodayReport.reportStatus !== 'Approved' && myTodayReport.reportStatus !== 'Locked')) && (
              <button 
                onClick={() => setShowSubmissionModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                {myTodayReport ? 'Edit Today\'s Report' : 'Create EOD Report'}
              </button>
            )}
          </div>
        </div>

        {/* EOD Report Status Card */}
        <div className="max-w-3xl mx-auto px-1 md:px-3 lg:px-4">
          {!myTodayReport ? (
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm text-center">
              <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">No Report Submitted Yet</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">You have not logged your activities for today ({todayStr}).</p>
              <button 
                onClick={() => setShowSubmissionModal(true)}
                className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Start Submission Form
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Detailed Metrics Panel */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
                
                {/* Header Profile */}
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{myTodayReport.userName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Date: {myTodayReport.date} · Today's EOD Report</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${myTodayReport.reportStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' : myTodayReport.reportStatus === 'Submitted' ? 'bg-indigo-100 text-indigo-700' : myTodayReport.reportStatus === 'Returned' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                    Status: {myTodayReport.reportStatus}
                  </span>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Clock size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Logged Hours</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{myTodayReport.attendanceSummary?.workingHours || 0} Hrs</span>
                    {(myTodayReport.attendanceSummary?.checkInTime || myTodayReport.attendanceSummary?.checkOutTime) && (
                      <span className="text-[8px] font-bold text-slate-400 mt-0.5 block">
                        {formatTime(myTodayReport.attendanceSummary.checkInTime) || 'N/A'} - {formatTime(myTodayReport.attendanceSummary.checkOutTime) || 'Active'}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Users size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Leads Contacted</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{myTodayReport.crmSummary?.leadsContacted || 0} Leads</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <ListTodo size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tasks Done</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{myTodayReport.taskSummary?.completed || 0} Completed</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <DollarSign size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Sales Value</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">₹{myTodayReport.salesSummary?.totalSalesValue.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>

                {/* Submissions Feed */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">1. Customer & Lead Updates Logged</h4>
                    {myTodayReport.customerUpdates && myTodayReport.customerUpdates.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {myTodayReport.customerUpdates.map((u, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[10px] font-black text-slate-800 uppercase block">{u.leadName}</span>
                            <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider block">Outcome: {u.status}</span>
                            {u.notes && <span className="text-[9px] font-medium text-slate-500 mt-1 block">Notes: {u.notes}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase">No customer follow-ups logged today.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">2. Task Report (All Tasks)</h4>
                    {(myTodayReport.taskSnapshot && myTodayReport.taskSnapshot.length > 0) ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {myTodayReport.taskSnapshot.map((t, idx) => {
                          const isDone = t.status === 'Done';
                          const isOverdue = t.isOverdue;
                          return (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="flex items-start gap-2 min-w-0 max-w-[55%]">
                                <div className={`shrink-0 mt-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                  isDone ? 'bg-emerald-500 border-emerald-500' :
                                  isOverdue ? 'border-rose-400 bg-rose-50' :
                                  'border-amber-400 bg-amber-50'
                                }`}>
                                  {isDone && <div className="w-1 h-1 rounded-full bg-white" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-black text-slate-800 uppercase truncate">{t.taskTitle}</span>
                                  <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5 w-fit ${
                                    isDone ? 'bg-emerald-100 text-emerald-700' :
                                    isOverdue ? 'bg-rose-100 text-rose-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {isDone ? 'Done' : isOverdue ? `Overdue · Due ${t.dueDate}` : 'Pending'}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 sm:max-w-[45%] text-right">
                                {t.comments || '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : myTodayReport.completedTasks && myTodayReport.completedTasks.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {myTodayReport.completedTasks.map((t, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="text-emerald-500 shrink-0" size={14} />
                                <span className="text-[10px] font-black text-slate-800 uppercase">{t.taskTitle}</span>
                              </div>
                              {t.completedAt && (
                                <span className="text-[8px] font-bold text-indigo-600 ml-6 mt-0.5 block">
                                  Completed: {formatTime(t.completedAt)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 sm:max-w-[60%]">
                              {t.comments || 'No comment provided.'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase">No tasks recorded for today.</p>
                    )}
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">3. Challenges Faced</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2 min-h-[60px]">{myTodayReport.challengesFaced || 'No challenges faced.'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">4. Plan for Tomorrow</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2 min-h-[60px]">{myTodayReport.tomorrowPlan || 'No plan logged.'}</p>
                    </div>
                  </div>

                  {myTodayReport.additionalComments && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">5. Additional Comments</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2">{myTodayReport.additionalComments}</p>
                    </div>
                  )}
                </div>

                {/* Manager Feedback */}
                {(myTodayReport.managerComments || myTodayReport.managerRating) && (
                  <div className="border-t border-slate-100 pt-6 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager Feedback</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      {myTodayReport.managerComments && <p className="text-xs font-semibold text-slate-700">{myTodayReport.managerComments}</p>}
                      {myTodayReport.managerRating && (
                        <div className="flex gap-0.5 mt-2">
                          {Array.from({ length: myTodayReport.managerRating }).map((_, i) => (
                            <Star key={i} size={12} className="text-amber-500 fill-amber-500" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {showSubmissionModal && (
          <EodSubmissionModal onClose={() => setShowSubmissionModal(false)} />
        )}
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className="h-full overflow-y-auto space-y-6 pb-8 pr-1 custom-scrollbar text-slate-700">
      
      {/* Header Toolbar */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-6 flex flex-col gap-4 shadow-xl m-1 md:m-3 lg:m-4 rounded-[1.5rem] md:rounded-[2rem] text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-slate-800 text-amber-500 rounded-2xl shadow-inner">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-playfair font-bold uppercase tracking-tight leading-none">EOD Activity Center</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Audit Employee Shift Activities & EOD Submissions</p>
            </div>
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 border border-amber-400/20 px-5 py-2 rounded-[2rem] text-[10px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-[0_5px_15px_-3px_rgba(245,158,11,0.3)]"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-slate-800/40 p-4 rounded-[1.5rem] border border-slate-700/50">
          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Select Employee</label>
            <select 
              value={selectedEmployeeId} 
              onChange={e => { setSelectedEmployeeId(e.target.value); setActiveReportId(null); }}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Select Date</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setActiveReportId(null); }}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Status Filter</label>
            <select 
              value={selectedStatus} 
              onChange={e => { setSelectedStatus(e.target.value as any); setActiveReportId(null); }}
              className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
              <option value="Locked">Locked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2rem] border border-slate-200 shadow-sm min-h-[300px]">
          <AlertTriangle size={32} className="text-slate-300 mb-3" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">No EOD Reports found matching these filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1 md:px-3 lg:px-4">
          
          {/* Left Column: Reports List */}
          <div className="space-y-4 lg:col-span-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Submissions ({filteredReports.length})</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredReports.map(report => {
                const isActive = activeReport?.id === report.id;
                return (
                  <div 
                    key={report.id}
                    onClick={() => setActiveReportId(report.id)}
                    className={`p-4 rounded-[1.5rem] border transition-all cursor-pointer flex flex-col justify-between ${isActive ? 'bg-slate-900 text-white border-slate-800 shadow-lg scale-[1.01]' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-black uppercase block ${isActive ? 'text-white' : 'text-slate-800'}`}>{report.userName}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase block mt-0.5">{report.date}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${report.reportStatus === 'Approved' ? 'bg-emerald-500 text-white' : report.reportStatus === 'Submitted' ? 'bg-indigo-600 text-white' : report.reportStatus === 'Returned' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {report.reportStatus}
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100/10 flex justify-between text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Hours: {report.attendanceSummary?.workingHours || 0}h</span>
                      <span>Sales: ₹{report.salesSummary?.totalSalesValue.toLocaleString('en-IN') || 0}</span>
                      <span>Tasks: {report.taskSummary?.completed} Complete</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right/Center Columns: Selected Report Details & Timeline */}
          {activeReport && (
            <div className="lg:col-span-2 space-y-6">
              
              {/* Detailed Metrics Panel */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
                
                {/* Header Profile */}
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{activeReport.userName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Date: {activeReport.date} · EOD Submission Detail</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${activeReport.reportStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' : activeReport.reportStatus === 'Submitted' ? 'bg-indigo-100 text-indigo-700' : activeReport.reportStatus === 'Returned' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                    Status: {activeReport.reportStatus}
                  </span>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Clock size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Logged Hours</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{activeReport.attendanceSummary?.workingHours || 0} Hrs</span>
                    {(activeReport.attendanceSummary?.checkInTime || activeReport.attendanceSummary?.checkOutTime) && (
                      <span className="text-[8px] font-bold text-slate-400 mt-0.5 block">
                        {formatTime(activeReport.attendanceSummary.checkInTime) || 'N/A'} - {formatTime(activeReport.attendanceSummary.checkOutTime) || 'Active'}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Users size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Leads Contacted</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{activeReport.crmSummary?.leadsContacted || 0} Leads</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <ListTodo size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tasks Done</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">{activeReport.taskSummary?.completed || 0} Completed</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <DollarSign size={16} className="text-indigo-500 mb-1" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Sales Value</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">₹{activeReport.salesSummary?.totalSalesValue.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>

                {/* Structured Submissions Feed */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">1. Customer & Lead Updates Logged</h4>
                    {activeReport.customerUpdates && activeReport.customerUpdates.length > 0 ? (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {activeReport.customerUpdates.map((u, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-[10px] font-black text-slate-800 uppercase block">{u.leadName}</span>
                            <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider block">Outcome: {u.status}</span>
                            {u.notes && <span className="text-[9px] font-medium text-slate-500 mt-1 block">Notes: {u.notes}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase">No customer follow-ups logged today.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">2. Task Report (All Tasks at Submission)</h4>
                    {(activeReport.taskSnapshot && activeReport.taskSnapshot.length > 0) ? (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {activeReport.taskSnapshot.map((t, idx) => {
                          const isDone = t.status === 'Done';
                          const isOverdue = t.isOverdue;
                          return (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                              <div className="flex items-start gap-2 min-w-0 max-w-[55%]">
                                <div className={`shrink-0 mt-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                  isDone ? 'bg-emerald-500 border-emerald-500' :
                                  isOverdue ? 'border-rose-400 bg-rose-50' :
                                  'border-amber-400 bg-amber-50'
                                }`}>
                                  {isDone && <div className="w-1 h-1 rounded-full bg-white" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-black text-slate-800 uppercase truncate">{t.taskTitle}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                      isDone ? 'bg-emerald-100 text-emerald-700' :
                                      isOverdue ? 'bg-rose-100 text-rose-700' :
                                      'bg-amber-100 text-amber-700'
                                    }`}>
                                      {isDone ? 'Done' : isOverdue ? `Overdue · Due ${t.dueDate}` : 'Pending'}
                                    </span>
                                    <span className={`text-[7px] font-bold uppercase px-1 py-0.5 rounded ${
                                      t.priority === 'High' ? 'bg-rose-50 text-rose-600' :
                                      t.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>{t.priority}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 sm:max-w-[45%] text-right">
                                {t.comments || '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : activeReport.completedTasks && activeReport.completedTasks.length > 0 ? (
                      // Fallback for older reports that only have completedTasks (no snapshot)
                      <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {activeReport.completedTasks.map((t, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="text-emerald-500 shrink-0" size={14} />
                                <span className="text-[10px] font-black text-slate-800 uppercase">{t.taskTitle}</span>
                              </div>
                              {t.completedAt && (
                                <span className="text-[8px] font-bold text-indigo-600 ml-6 mt-0.5 block">
                                  Completed: {formatTime(t.completedAt)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-100 flex-1 sm:max-w-[60%]">
                              {t.comments || 'No comment provided.'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase">No tasks recorded for this day.</p>
                    )}
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">3. Challenges Faced</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2 min-h-[60px]">{activeReport.challengesFaced || 'No challenges faced.'}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">4. Plan for Tomorrow</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2 min-h-[60px]">{activeReport.tomorrowPlan || 'No plan logged.'}</p>
                    </div>
                  </div>

                  {activeReport.additionalComments && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">5. Additional Comments</h4>
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-200 mt-2">{activeReport.additionalComments}</p>
                    </div>
                  )}
                </div>

                {/* Manager Review / Sign-off Panel */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager Review Panel</h4>
                  
                  {activeReport.reportStatus === 'Approved' ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[1.5rem] flex items-center gap-3">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={24} />
                      <div>
                        <span className="text-[10px] font-black text-emerald-800 uppercase block">Report Approved & Locked</span>
                        {activeReport.managerComments && <span className="text-[9px] font-bold text-emerald-600 mt-1 block">Comment: {activeReport.managerComments}</span>}
                        {activeReport.managerRating && (
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: activeReport.managerRating }).map((_, i) => (
                              <Star key={i} size={10} className="text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Manager Comments</label>
                          <input 
                            type="text"
                            value={managerComments}
                            onChange={e => setManagerComments(e.target.value)}
                            placeholder="Add EOD feedback or comments..."
                            className="h-[36px] bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none focus:bg-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:w-[120px]">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rating (1-5)</label>
                          <select 
                            value={managerRating}
                            onChange={e => setManagerRating(Number(e.target.value))}
                            className="h-[36px] bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold outline-none cursor-pointer focus:bg-white"
                          >
                            <option value="5">⭐⭐⭐⭐⭐</option>
                            <option value="4">⭐⭐⭐⭐</option>
                            <option value="3">⭐⭐⭐</option>
                            <option value="2">⭐⭐</option>
                            <option value="1">⭐</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 justify-end">
                        <button 
                          onClick={() => handleReviewAction('Returned')}
                          className="px-5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Return for Correction
                        </button>
                        <button 
                          onClick={() => handleReviewAction('Approved')}
                          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Approve & Lock
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Chronological Daily Activity Timeline */}
              <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 mb-5">Start-to-End Daily Activity Timeline</h3>
                
                {activeReport.activityTimeline && activeReport.activityTimeline.length > 0 ? (
                  <div className="relative pl-6 border-l border-slate-200 ml-3 space-y-6">
                    {activeReport.activityTimeline.map((item, idx) => (
                      <div key={idx} className="relative">
                        {/* Timeline Bullet Icon */}
                        <div className="absolute -left-[30px] top-1 bg-white border border-slate-300 p-1 rounded-full text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                        </div>
                        
                        <div>
                          <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">{formatTime(item.time)}</span>
                          <span className="text-[10px] font-black text-slate-800 uppercase block mt-0.5">{item.title}</span>
                          <span className="text-[9px] font-medium text-slate-500 mt-1 block">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] font-bold text-slate-400 uppercase">No logged timeline items for this date.</p>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
