
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, User, CheckCircle, Building2, AlertCircle, Timer, 
    PauseCircle, ShieldCheck, ClipboardCheck, 
    Calendar, Lock, Zap, UserCheck, RefreshCw,
    FileSpreadsheet, TableProperties, LayoutGrid
} from 'lucide-react';
import { Task, Employee, AttendanceRecord, AttendanceStatus } from '../types';
import { useData } from './DataContext';

interface AttendanceModuleProps {
    tasks: Task[];
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

type WorkMode = 'Office' | 'Field' | 'Remote';
type SubTab = 'daily' | 'monthly' | 'detailed';

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks, currentUser, userRole }) => {
  const { addPoints, employees, saveAttendance, attendanceRecords, addNotification, currentUser: authUser } = useData();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('daily');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [filterDept, setFilterDept] = useState<string>('All');
  
  const REQUIRED_OFFICE_HOURS = 7;
  const REQUIRED_OFFICE_MS = REQUIRED_OFFICE_HOURS * 60 * 60 * 1000;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isAdmin = userRole === 'Admin';

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const workMode: WorkMode = useMemo(() => {
      const me = employees.find(e => e.name === currentUser);
      if (me?.department === 'Service' || me?.department === 'Sales' || me?.department === 'Support') return 'Field';
      if (me?.department === 'Remote') return 'Remote';
      return 'Office';
  }, [currentUser, employees]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTotalWorkedMs = () => {
      let currentSessionMs = 0;
      if (isCheckedIn && sessionStartTime) {
          currentSessionMs = currentTime.getTime() - sessionStartTime.getTime();
      }
      return accumulatedMs + currentSessionMs;
  };

  const formatDuration = (ms: number) => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
  };

  const totalWorkedMs = getTotalWorkedMs();
  const myTasksToday = tasks.filter(t => t.assignedTo === currentUser && t.dueDate === todayStr);
  const completedTasksCount = myTasksToday.filter(t => t.status === 'Done').length;
  
  const isOfficeHoursComplete = totalWorkedMs >= REQUIRED_OFFICE_MS;
  const isFieldWorkComplete = completedTasksCount > 0; 
  
  const canConfirmAttendance = (workMode === 'Field' || workMode === 'Remote' 
    ? isFieldWorkComplete 
    : isOfficeHoursComplete);

  const handleCheckInOut = async () => {
    if (isCheckedIn) {
        const currentSessionMs = currentTime.getTime() - (sessionStartTime?.getTime() || currentTime.getTime());
        const finalMs = accumulatedMs + currentSessionMs;
        const finalHours = finalMs / 3600000;

        let status: AttendanceStatus = AttendanceStatus.ABSENT;
        if (workMode === 'Office') {
            if (finalMs >= REQUIRED_OFFICE_MS) status = AttendanceStatus.PRESENT;
            else if (finalMs >= (REQUIRED_OFFICE_MS / 2)) status = AttendanceStatus.HALFDAY;
        } else {
            status = isFieldWorkComplete ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT;
        }

        const record: AttendanceRecord = {
            id: `ATT-${todayStr}-${authUser?.id}`,
            employeeId: authUser?.id || 'Unknown',
            employeeName: currentUser,
            date: todayStr,
            checkIn: sessionStartTime?.toLocaleTimeString() || '',
            checkOut: currentTime.toLocaleTimeString(),
            totalHours: finalHours,
            tasksCompleted: completedTasksCount,
            status,
            workMode
        };

        await saveAttendance(record);
        setAccumulatedMs(prev => prev + currentSessionMs);
        setSessionStartTime(null);
        setIsCheckedIn(false);

        if (status === AttendanceStatus.PRESENT) {
            addPoints(50, 'Attendance', 'Daily Shift Milestone Met');
            addNotification('Attendance Verified', 'Your status is marked as PRESENT.', 'success');
        } else {
            addNotification('Shift Logged', `Status: ${status}. Criteria not fully met.`, 'warning');
        }
    } else {
        setIsCheckedIn(true);
        setSessionStartTime(new Date());
    }
  };

  const getAttendanceForEmp = (empId: string) => {
      const record = attendanceRecords.find(r => r.employeeId === empId && r.date === todayStr);
      return record ? record.status : 'Pending';
  };

  const handleAdminOverride = async (emp: Employee, newStatus: AttendanceStatus) => {
      if (!isAdmin) return;
      const record: AttendanceRecord = {
          id: `ATT-${todayStr}-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: todayStr,
          status: newStatus,
          workMode: (emp.department === 'Service' || emp.department === 'Sales' || emp.department === 'Support') ? 'Field' : 'Office',
          overriddenBy: authUser?.name
      };
      await saveAttendance(record);
      addNotification('Admin Override', `Attendance for ${emp.name} forced to ${newStatus}.`, 'alert');
  };

  const monthlySummaries = useMemo(() => {
    return employees.map(emp => {
      const records = attendanceRecords.filter(r => {
        const d = new Date(r.date);
        return r.employeeId === emp.id && 
               d.getMonth() === selectedMonth && 
               d.getFullYear() === selectedYear;
      });

      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const presentCount = records.filter(r => r.status === AttendanceStatus.PRESENT).length;
      const halfDayCount = records.filter(r => r.status === AttendanceStatus.HALFDAY).length;
      const absentCount = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
      
      const isCurrentMonth = new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear;
      const effectiveWorkingDays = isCurrentMonth ? new Date().getDate() : daysInMonth;
      
      const attendanceScore = presentCount + (halfDayCount * 0.5);
      const percentage = effectiveWorkingDays > 0 ? (attendanceScore / effectiveWorkingDays) * 100 : 0;

      return {
        id: emp.id,
        name: emp.name,
        dept: emp.department,
        totalWorkingDays: effectiveWorkingDays,
        present: presentCount,
        absent: absentCount,
        halfDays: halfDayCount,
        percentage: percentage.toFixed(1) + '%'
      };
    });
  }, [employees, attendanceRecords, selectedMonth, selectedYear]);

  const detailedDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  const detailedData = useMemo(() => {
    return employees.map(emp => {
      const dayMap: Record<number, string> = {};
      
      detailedDays.forEach(day => {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = attendanceRecords.find(r => r.employeeId === emp.id && r.date === dateStr);
        
        if (record) {
          if (record.status === AttendanceStatus.PRESENT) dayMap[day] = 'P';
          else if (record.status === AttendanceStatus.HALFDAY) dayMap[day] = 'HD';
          else if (record.status === AttendanceStatus.ABSENT) dayMap[day] = 'A';
        } else {
          dayMap[day] = '-';
        }
      });

      const summary = monthlySummaries.find(s => s.id === emp.id);

      return {
        ...emp,
        days: dayMap,
        summary
      };
    });
  }, [employees, attendanceRecords, selectedMonth, selectedYear, detailedDays, monthlySummaries]);

  const exportSummaries = () => {
    const headers = ["Employee ID", "Name", "Department", "Working Days", "Present", "Absent", "Half-Days", "Attendance %"];
    const csvContent = [
      headers.join(","),
      ...monthlySummaries.map(row => [
        row.id, `"${row.name}"`, `"${row.dept}"`, row.totalWorkingDays, row.present, row.absent, row.halfDays, row.percentage
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Summary_${months[selectedMonth]}_${selectedYear}.csv`);
    link.click();
  };

  const exportDetailed = () => {
    const headers = ["ID", "Name", ...detailedDays, "Total P", "Total A", "Total HD", "Working Days", "%"];
    const csvContent = [
      headers.join(","),
      ...detailedData.map(row => [
        row.id,
        `"${row.name}"`,
        ...detailedDays.map(d => row.days[d]),
        row.summary?.present,
        row.summary?.absent,
        row.summary?.halfDays,
        row.summary?.totalWorkingDays,
        row.summary?.percentage
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Detailed_Attendance_${months[selectedMonth]}_${selectedYear}.csv`);
    link.click();
  };

  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6 overflow-hidden p-1 sm:p-2">
      
      {/* Navigation Sub-Tabs - Mobile Scrollable */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-fit shrink-0 shadow-sm overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveSubTab('daily')}
          className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeSubTab === 'daily' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <LayoutGrid size={16} /> Daily Monitor
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveSubTab('monthly')}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeSubTab === 'monthly' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Calendar size={16} /> Monthly Summary
            </button>
            <button 
              onClick={() => setActiveSubTab('detailed')}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeSubTab === 'detailed' ? 'bg-medical-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <TableProperties size={16} /> Detailed Registry
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {activeSubTab === 'daily' ? (
          <div className="space-y-4 sm:space-y-6 pb-6">
            {/* Daily KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 shrink-0">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 sm:gap-5 group hover:border-indigo-100 transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><User size={20}/></div>
                    <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Employee Registry</p>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight truncate text-xs sm:text-sm">{currentUser}</h4>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 sm:gap-5 group hover:border-emerald-100 transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-medical-50 dark:bg-medical-900/20 text-medical-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><ShieldCheck size={20}/></div>
                    <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Work Profile</p>
                        <h4 className="font-black text-medical-600 uppercase tracking-tight text-xs sm:text-sm">{workMode === 'Office' ? 'In-Staff (Office)' : 'Out-Staff (Field)'}</h4>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 sm:gap-5 group hover:border-amber-100 transition-all sm:col-span-2 lg:col-span-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"><AlertCircle size={20}/></div>
                    <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Eligibility Condition</p>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs sm:text-sm">
                            {workMode === 'Office' ? `Min. ${REQUIRED_OFFICE_HOURS} Hours` : 'At least 1 Task Done'}
                        </h4>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
              {/* Interactive Check-in Card */}
              <div className="w-full lg:w-[380px] shrink-0 sticky lg:top-0">
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 flex flex-col relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-full h-2 ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                      <div className="text-center mb-6 sm:mb-8">
                          <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                          <h3 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tighter font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</h3>
                      </div>
                      <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center mb-6 sm:mb-8">
                          <div className={`flex items-center gap-2 sm:gap-3 font-black text-2xl sm:text-3xl transition-all ${isCheckedIn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`}>
                              {workMode === 'Office' ? <Timer size={28} className={isCheckedIn ? "animate-spin-slow" : ""} /> : <ClipboardCheck size={28} />}
                              <span>{workMode === 'Office' ? formatDuration(totalWorkedMs) : `${completedTasksCount} / ${myTasksToday.length}`}</span>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{workMode === 'Office' ? 'Elapsed Time' : 'Mandatory Tasks Ratio'}</span>
                          {workMode === 'Office' && (
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-5 sm:mt-6 overflow-hidden">
                                  <div className={`h-full transition-all duration-1000 ${isOfficeHoursComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (totalWorkedMs / REQUIRED_OFFICE_MS) * 100)}%` }}></div>
                              </div>
                          )}
                      </div>
                      <button onClick={handleCheckInOut} className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-all transform active:scale-95 shadow-xl flex items-center justify-center gap-2 sm:gap-3 relative z-10 ${isCheckedIn ? canConfirmAttendance ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-slate-800 text-white shadow-slate-900/30' : 'bg-medical-600 text-white shadow-medical-500/30 hover:bg-medical-700'}`}>
                          {isCheckedIn ? (canConfirmAttendance ? <><CheckCircle size={20} /> Finalize Attendance</> : <><PauseCircle size={20} /> Stop & Log (Incomplete)</>) : <><Clock size={20} /> Start Daily Shift</>}
                      </button>
                      {!canConfirmAttendance && isCheckedIn && (
                          <div className="mt-5 sm:mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl sm:rounded-2xl flex items-start gap-3">
                              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-[9px] sm:text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-relaxed">{workMode === 'Office' ? `Ineligible for Present: Work ${formatDuration(Math.max(0, REQUIRED_OFFICE_MS - totalWorkedMs))} more` : myTasksToday.length === 0 ? 'No tasks found. Mark manual attendance via Admin.' : 'Attendance restricted: Complete at least 1 task'}</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Data Table Container - Admin/Field Monitor */}
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden min-h-[400px] w-full">
                  <div className="p-4 sm:p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3"><Building2 size={20} className="text-slate-400" /> Enterprise Log</h3>
                      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                          {['All', 'Service', 'Administration', 'Support'].map(dept => (
                              <button key={dept} onClick={() => setFilterDept(dept)} className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap ${filterDept === dept ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{dept}</button>
                          ))}
                      </div>
                  </div>
                  <div className="flex-1 overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-sm min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <tr>
                                  <th className="px-6 py-5">Personnel</th>
                                  <th className="px-6 py-5">Shift Mode</th>
                                  <th className="px-6 py-5">Activity Metrics</th>
                                  <th className="px-6 py-5 text-center">Status</th>
                                  {isAdmin && <th className="px-6 py-5 text-right">Admin Control</th>}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {employees.filter(e => filterDept === 'All' || e.department === filterDept).map((emp) => {
                                  const status = getAttendanceForEmp(emp.id);
                                  const isField = emp.department === 'Service' || emp.department === 'Sales' || emp.department === 'Support';
                                  const record = attendanceRecords.find(r => r.employeeId === emp.id && r.date === todayStr);
                                  return (
                                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                          <td className="px-6 py-5">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700">{emp.name.charAt(0)}</div>
                                                  <div>
                                                      <div className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight">{emp.name}</div>
                                                      <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{emp.department}</div>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-5">
                                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${isField ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'}`}>{isField ? 'Out-Staff' : 'In-Staff'}</span>
                                          </td>
                                          <td className="px-6 py-5">
                                              <div className="flex flex-col gap-1.5">
                                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase">
                                                      {isField ? <ClipboardCheck size={14} className="text-blue-500" /> : <Timer size={14} className="text-emerald-500" />}
                                                      {record ? `${isField ? `${record.tasksCompleted} Tasks` : `${record.totalHours?.toFixed(2)}h Worked`}` : '---'}
                                                  </div>
                                                  {record?.checkIn && <span className="text-[8px] font-bold text-slate-300 uppercase">Logged: {record.checkIn}</span>}
                                              </div>
                                          </td>
                                          <td className="px-6 py-5 text-center">
                                              <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-widest ${status === AttendanceStatus.PRESENT ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 shadow-sm' : status === AttendanceStatus.HALFDAY ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>{status}</span>
                                          </td>
                                          {isAdmin && (
                                              <td className="px-6 py-5 text-right">
                                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => handleAdminOverride(emp, AttendanceStatus.PRESENT)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-300 hover:text-emerald-600 rounded-xl transition-all" title="Force Present"><UserCheck size={18} /></button>
                                                      <button onClick={() => handleAdminOverride(emp, AttendanceStatus.ABSENT)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-300 hover:text-rose-600 rounded-xl transition-all" title="Force Absent"><Lock size={18} /></button>
                                                  </div>
                                              </td>
                                          )}
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'monthly' ? (
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in mb-6">
            <div className="p-5 sm:p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3"><Calendar size={20} className="text-medical-600" /><div><h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight">Enterprise Ledger</h3><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Summary Analytics</p></div></div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-transparent px-2 py-1.5 outline-none dark:text-white">{months.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-transparent px-2 py-1.5 outline-none dark:text-white">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <button onClick={exportSummaries} className="bg-slate-800 dark:bg-slate-700 text-white px-4 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg"><FileSpreadsheet size={16} /> Export (.csv)</button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <tr><th className="px-8 py-5">Personnel Identity</th><th className="px-8 py-5">Department</th><th className="px-8 py-5 text-center">Work Days</th><th className="px-8 py-5 text-center">Present</th><th className="px-8 py-5 text-center">Half-Day</th><th className="px-8 py-5 text-center">Absent</th><th className="px-8 py-5 text-right pr-12">Registry Score (%)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlySummaries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <td className="px-8 py-5"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-[10px] text-slate-500 border border-slate-200 dark:border-slate-700 uppercase shrink-0">{row.name.charAt(0)}</div><div className="min-w-0"><div className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight truncate">{row.name}</div><div className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{row.id}</div></div></div></td>
                      <td className="px-8 py-5"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{row.dept}</span></td>
                      <td className="px-8 py-5 text-center font-bold text-slate-400">{row.totalWorkingDays}</td>
                      <td className="px-8 py-5 text-center"><span className="text-emerald-600 font-black text-base">{row.present}</span></td>
                      <td className="px-8 py-5 text-center"><span className="text-amber-500 font-black text-base">{row.halfDays}</span></td>
                      <td className="px-8 py-5 text-center"><span className="text-rose-500 font-black text-base">{row.absent}</span></td>
                      <td className="px-8 py-5 text-right pr-12"><div className="flex flex-col items-end gap-1"><span className={`text-sm font-black tracking-tight ${Number(row.percentage.replace('%','')) > 80 ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>{row.percentage}</span><div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${Number(row.percentage.replace('%','')) > 80 ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: row.percentage }}></div></div></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* DETAILED DATE-WISE MATRIX - Fixed Height Table with Scroll */
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-right-4 mb-6">
            <div className="p-5 sm:p-6 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3"><TableProperties size={20} className="text-indigo-600" /><div><h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight">Date-wise Matrix</h3><p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Individual Daily Attendance Registry</p></div></div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-transparent px-2 py-1.5 outline-none dark:text-white">{months.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-transparent px-2 py-1.5 outline-none dark:text-white">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <button onClick={exportDetailed} className="bg-medical-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-medical-700 transition-all shadow-lg"><FileSpreadsheet size={16} /> Export (.csv)</button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar relative">
              <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-20 text-[8px] font-black uppercase tracking-tighter text-slate-400">
                  <tr>
                    <th className="px-4 py-4 sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 border-r dark:border-slate-700 w-40 text-center">Staff Member</th>
                    {detailedDays.map(day => (
                      <th key={day} className="px-1 py-4 text-center border-r dark:border-slate-700 min-w-[30px]">{day}</th>
                    ))}
                    <th className="px-3 py-4 text-center border-l dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400">P</th>
                    <th className="px-3 py-4 text-center bg-rose-50/50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400">A</th>
                    <th className="px-3 py-4 text-center bg-amber-50/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400">HD</th>
                    <th className="px-3 py-4 text-center bg-slate-50 dark:bg-slate-800 border-l dark:border-slate-700 font-bold">Total</th>
                    <th className="px-4 py-4 text-right pr-6 bg-slate-50 dark:bg-slate-800 font-bold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailedData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r dark:border-slate-700 font-black text-[9px] sm:text-[10px] uppercase truncate shadow-sm">{row.name}</td>
                      {detailedDays.map(day => {
                        const status = row.days[day];
                        return (
                          <td key={day} className="px-1 py-3 text-center border-r dark:border-slate-700 text-[9px] font-black">
                            <span className={
                              status === 'P' ? 'text-emerald-500' :
                              status === 'HD' ? 'text-amber-500' :
                              status === 'A' ? 'text-rose-400' :
                              'text-slate-200 dark:text-slate-700'
                            }>
                              {status === '-' ? '·' : status}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center font-black text-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/10">{row.summary?.present}</td>
                      <td className="px-3 py-3 text-center font-black text-rose-500 bg-rose-50/20 dark:bg-rose-900/10">{row.summary?.absent}</td>
                      <td className="px-3 py-3 text-center font-black text-amber-600 bg-amber-50/20 dark:bg-amber-900/10">{row.summary?.halfDays}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-400 bg-slate-50/30 dark:bg-slate-800/20">{row.summary?.totalWorkingDays}</td>
                      <td className="px-4 py-3 text-right pr-6 font-black text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-800/20">{row.summary?.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 sm:px-6 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 sm:gap-6 shrink-0">
               <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest"><div className="w-2 h-2 rounded bg-emerald-500"></div> Present (P)</div>
               <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest"><div className="w-2 h-2 rounded bg-rose-400"></div> Absent (A)</div>
               <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest"><div className="w-2 h-2 rounded bg-amber-500"></div> Half-Day (HD)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
