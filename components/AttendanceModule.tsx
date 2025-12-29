import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle, Building2, AlertCircle, Timer, PauseCircle, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { Task, Employee } from '../types';
import { useData } from './DataContext';

interface AttendanceModuleProps {
    tasks: Task[];
    currentUser: string;
    userRole: 'Admin' | 'Employee';
}

type WorkMode = 'Office' | 'Field' | 'Remote';

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks, currentUser }) => {
  const { addPoints, employees } = useData();
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  
  const [workMode, setWorkMode] = useState<WorkMode>('Office');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const REQUIRED_OFFICE_HOURS = 7;
  const todayStr = new Date().toISOString().split('T')[0];

  // Determine current user's mode from HR record
  useEffect(() => {
      const me = employees.find(e => e.name === currentUser);
      if (me) {
          if (me.department === 'Service' || me.department === 'Sales') setWorkMode('Field');
          else if (me.department === 'Remote') setWorkMode('Remote');
          else setWorkMode('Office');
      }
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
  const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);
  
  const myTasksToday = tasks.filter(t => t.assignedTo === currentUser && t.dueDate === todayStr);
  const completedTasksCount = myTasksToday.filter(t => t.status === 'Done').length;
  const totalTasksCount = myTasksToday.length;
  
  // Logic rules for finishing the day
  const isOfficeHoursComplete = totalWorkedHours >= REQUIRED_OFFICE_HOURS;
  const isFieldWorkComplete = totalTasksCount > 0 && completedTasksCount === totalTasksCount;
  
  const canConfirmAttendance = workMode === 'Field' 
    ? isFieldWorkComplete 
    : isOfficeHoursComplete;

  const handleCheckInOut = () => {
    if (isCheckedIn) {
        const currentSessionMs = currentTime.getTime() - (sessionStartTime?.getTime() || currentTime.getTime());
        
        if (canConfirmAttendance) {
            setAccumulatedMs(prev => prev + currentSessionMs);
            setSessionStartTime(null);
            setIsCheckedIn(false);
            alert(`Attendance Confirmed! Day successfully closed.`);
            addPoints(50, 'Attendance', 'Daily Shift Completed');
        } else {
            setAccumulatedMs(prev => prev + currentSessionMs);
            setSessionStartTime(null);
            setIsCheckedIn(false);
        }
    } else {
        const now = new Date();
        setIsCheckedIn(true);
        setSessionStartTime(now);
    }
  };

  const getEmpWorkedHoursDisplay = (emp: Employee) => {
      if (emp.department === 'Service' || emp.department === 'Sales') {
          const empTasks = tasks.filter(t => t.assignedTo === emp.name && t.dueDate === todayStr);
          const done = empTasks.filter(t => t.status === 'Done').length;
          return `${done}/${empTasks.length} Tasks`;
      }
      return "0h 0m"; 
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'On Leave': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-1 custom-scrollbar">
      
      {/* Requirement Info Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><User size={20}/></div>
              <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</p>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight truncate text-sm">{currentUser}</h4>
              </div>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-medical-50 text-medical-600 rounded-2xl flex items-center justify-center shrink-0"><ShieldCheck size={20}/></div>
              <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Work Configuration</p>
                  <h4 className="font-black text-medical-600 uppercase tracking-tight text-sm">{workMode} Profile</h4>
              </div>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0"><AlertCircle size={20}/></div>
              <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Condition for Day End</p>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                      {workMode === 'Field' ? 'Complete All Tasks' : `Work ${REQUIRED_OFFICE_HOURS} Hours`}
                  </h4>
              </div>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Action Card */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
            {/* Primary Action Card */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6 flex flex-col relative overflow-hidden group shrink-0">
                <div className={`absolute top-0 left-0 w-full h-2 ${isCheckedIn ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                
                <div className="text-center mb-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">Time Registry</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                </div>

                <div className="flex flex-col items-center mb-6">
                    <div className="text-5xl font-black text-slate-800 tracking-tighter font-mono mb-4">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    
                    <div className="w-full bg-slate-50 rounded-[2rem] p-4 border border-slate-100 flex flex-col items-center justify-center">
                        <div className={`flex items-center gap-2 font-black text-2xl transition-all ${isCheckedIn ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {workMode === 'Field' ? <ClipboardCheck size={24} /> : <Timer size={24} className={isCheckedIn ? "animate-pulse" : ""} />}
                            <span>{workMode === 'Field' ? `${completedTasksCount}/${totalTasksCount}` : formatDuration(totalWorkedMs)}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                            {workMode === 'Field' ? 'Worked Today (Tasks Ratio)' : 'Worked Today (Elapsed)'}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={handleCheckInOut}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 relative z-10 ${
                        isCheckedIn 
                            ? canConfirmAttendance
                                ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                                : 'bg-slate-800 text-white shadow-slate-900/30' 
                            : 'bg-medical-600 text-white shadow-medical-500/30'
                    }`}
                >
                    {isCheckedIn ? (
                         canConfirmAttendance ? (
                            <><CheckCircle size={18} /> Confirm Attendance</>
                         ) : (
                            <><PauseCircle size={18} /> Check Out (Pause)</>
                         )
                    ) : (
                        <><Clock size={18} /> Check In Now</>
                    )}
                </button>

                {isCheckedIn && !canConfirmAttendance && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-amber-800 uppercase leading-tight">
                            {workMode === 'Field' 
                                ? totalTasksCount === 0 ? 'No tasks assigned for today' : `Goal: Complete ${totalTasksCount - completedTasksCount} pending tasks`
                                : `Goal: Work ${formatDuration(Math.max(0, (REQUIRED_OFFICE_HOURS * 3600000) - totalWorkedMs))} more`}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Staff Registry */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-base text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Building2 size={20} className="text-slate-400" /> Staff Presence
                </h3>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {['All', 'Service', 'Administration'].map(dept => (
                        <button 
                            key={dept}
                            onClick={() => setFilterStatus(dept)}
                            className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${
                                filterStatus === dept 
                                ? 'bg-medical-600 text-white' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {dept}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 text-[9px] uppercase font-black tracking-widest text-slate-400">
                        <tr>
                            <th className="px-6 py-4">Staff Member</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Worked Hours / Progress</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {employees.filter(e => filterStatus === 'All' || e.department === filterStatus).map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-200">
                                            {emp.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-sm leading-none">{emp.name}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase mt-1.5">{emp.role}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        {emp.department}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2 text-slate-800 font-black text-[11px]">
                                        {emp.department === 'Service' || emp.department === 'Sales' ? <ClipboardCheck size={14} className="text-blue-500" /> : <Timer size={14} className="text-emerald-500" />}
                                        {getEmpWorkedHoursDisplay(emp)}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${getStatusBadge(emp.status)}`}>
                                        {emp.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};