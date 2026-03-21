
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Building2, AlertCircle, Timer, ClipboardCheck, Lock } from 'lucide-react';
import { Task, Employee, AttendanceRecord } from '../types';
import { useData } from './DataContext';

interface AttendanceModuleProps {
    tasks: Task[];
}

type WorkMode = 'Office' | 'Field' | 'Remote';

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks }) => {
    const { addPoints, currentUser: me, attendanceRecords, updateAttendance, employees, addNotification } = useData();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [accumulatedMs, setAccumulatedMs] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [workMode, setWorkMode] = useState<WorkMode>('Office');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    const REQUIRED_OFFICE_HOURS = 7;

    // Use local date for todayStr to ensure consistency across refreshes/timezones
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayStr();

    const todayRecord: AttendanceRecord | undefined = attendanceRecords.find(r => r.userId === me?.id && r.date === todayStr);

    // Synchronize state with Firestore record
    useEffect(() => {
        if (todayRecord) {
            setIsCheckedIn(todayRecord.status === 'CheckedIn');
            setAccumulatedMs(todayRecord.totalWorkedMs || 0);
            setSessionStartTime(todayRecord.lastSessionStartTime ? new Date(todayRecord.lastSessionStartTime) : null);
            setIsLocked(todayRecord.status === 'Completed');
        } else {
            // Reset if no record for today
            setIsCheckedIn(false);
            setAccumulatedMs(0);
            setSessionStartTime(null);
            setIsLocked(false);
        }
    }, [todayRecord]);

    // Determine current user's mode from HR record
    useEffect(() => {
        if (me) {
            if (me.department === 'Service' || me.department === 'Sales' || me.department === 'Support') {
                setWorkMode('Field');
            } else if (me.department === 'Remote') {
                setWorkMode('Remote');
            } else {
                setWorkMode('Office');
            }
        }
    }, [me]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getTotalWorkedMs = () => {
        let currentSessionMs = 0;
        if (isCheckedIn && sessionStartTime) {
            currentSessionMs = currentTime.getTime() - sessionStartTime.getTime();
        }
        return (accumulatedMs || 0) + currentSessionMs;
    };

    const formatDuration = (ms: number) => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`; // Added seconds for better visual "running" feedback
    };

    const totalWorkedMs = getTotalWorkedMs();
    const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);

    const myTasksToday = tasks.filter(t => t.assignedTo === me?.name && t.dueDate === todayStr);
    const completedTasksCount = myTasksToday.filter(t => t.status === 'Done').length;
    const totalTasksCount = myTasksToday.length;

    const isOfficeHoursComplete = totalWorkedHours >= REQUIRED_OFFICE_HOURS;
    const isFieldWorkComplete = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

    const canConfirmAttendance = workMode === 'Field'
        ? isFieldWorkComplete
        : isOfficeHoursComplete;

    // AUTO-CLOSE LOGIC: automatically close mark attendance after 7 hours
    useEffect(() => {
        if (workMode === 'Office' && isCheckedIn && isOfficeHoursComplete && !isLocked) {
            const autoClose = async () => {
                const recordId = `${me?.id}_${todayStr}`;
                await updateAttendance({
                    id: recordId,
                    userId: me!.id,
                    userName: me!.name,
                    date: todayStr,
                    totalWorkedMs: totalWorkedMs,
                    lastSessionStartTime: null,
                    status: 'Completed',
                    workMode: workMode,
                    checkInTime: todayRecord?.checkInTime || new Date().toISOString(),
                    checkOutTime: new Date().toISOString()
                });
                addPoints(50, 'Attendance', 'Daily Shift Completed (Auto-Logged)');
                addNotification('Shift Completed', 'Your 7-hour office shift has been automatically logged.', 'success');
            };
            autoClose();
        }
    }, [isOfficeHoursComplete, isCheckedIn, isLocked, workMode, me, todayStr]);

    const logActualDeparture = async () => {
        if (!me) return;
        const recordId = `${me.id}_${todayStr}`;
        await updateAttendance({
            id: recordId,
            userId: me.id,
            userName: me.name,
            date: todayStr,
            checkOutTime: new Date().toISOString() // Only update checkout time, not MS worked
        });
        addNotification('Departure Logged', 'Your final departure time has been updated.', 'success');
    };

    const formatTime = (isoString: string | null | undefined) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleCheckInOut = async () => {
        if (isLocked || !me) return;

        const recordId = `${me.id}_${todayStr}`;
        const now = new Date();

        try {
            if (isCheckedIn) {
                // If the user clicks button while checked in, show confirmation modal to COMPLETE day
                // regardless of whether they hit 7 hours, as requested "can done manually by confirmming"
                setShowConfirmModal(true);
            } else {
                // Checking In / Resuming
                await updateAttendance({
                    id: recordId,
                    userId: me.id,
                    userName: me.name,
                    date: todayStr,
                    totalWorkedMs: accumulatedMs,
                    lastSessionStartTime: now.toISOString(),
                    status: 'CheckedIn',
                    workMode: workMode,
                    checkInTime: todayRecord?.checkInTime || now.toISOString(),
                    checkOutTime: null
                });
            }
        } catch (error: any) {
            console.error("Attendance Update Failed:", error);
        }
    };

    const confirmFinalAttendance = async () => {
        if (!me) return;
        const recordId = `${me.id}_${todayStr}`;
        const now = new Date();
        const currentSessionMs = currentTime.getTime() - (sessionStartTime?.getTime() || currentTime.getTime());
        const totalMs = accumulatedMs + currentSessionMs;

        await updateAttendance({
            id: recordId,
            userId: me.id,
            userName: me.name,
            date: todayStr,
            totalWorkedMs: totalMs,
            lastSessionStartTime: null,
            status: 'Completed',
            workMode: workMode,
            checkInTime: todayRecord?.checkInTime || now.toISOString(),
            checkOutTime: now.toISOString()
        });

        addPoints(50, 'Attendance', 'Daily Shift Completed');
        setShowConfirmModal(false);
    };

    const getEmpAttendanceDisplay = (emp: Employee) => {
        const record = attendanceRecords.find(r => r.userId === emp.id && r.date === todayStr);
        if (!record) return "Not Started";

        if (record.status === 'Completed') return "Day Locked";

        if (emp.department === 'Service' || emp.department === 'Sales' || emp.department === 'Support') {
            const empTasks = tasks.filter(t => t.assignedTo === emp.name && t.dueDate === todayStr);
            const done = empTasks.filter(t => t.status === 'Done').length;
            return `${done}/${empTasks.length} Tasks`;
        }

        let ms = record.totalWorkedMs;
        if (record.status === 'CheckedIn' && record.lastSessionStartTime) {
            ms += currentTime.getTime() - new Date(record.lastSessionStartTime).getTime();
        }
        return formatDuration(ms);
    };

    const getStatusBadge = (status: string, empId: string) => {
        const record = attendanceRecords.find(r => r.userId === empId && r.date === todayStr);
        if (record?.status === 'Completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (record?.status === 'CheckedIn') return 'bg-blue-50 text-blue-700 border-blue-100';
        if (record?.status === 'Paused') return 'bg-amber-50 text-amber-700 border-amber-100';

        switch (status) {
            case 'Active': return 'bg-slate-50 text-slate-700 border-slate-300';
            case 'On Leave': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-slate-100 text-slate-600 border-slate-300';
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto p-1 custom-scrollbar">

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-300 transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-center text-slate-800 uppercase tracking-tight mb-2">Lock Attendance?</h3>
                        <p className="text-slate-500 text-center text-sm font-medium mb-8">
                            Confirming will lock your attendance for today. You won't be able to resume until tomorrow.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmFinalAttendance}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                Yes, Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* Left Column: Action Card */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
                    {/* Primary Action Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-300 p-6 flex flex-col relative overflow-hidden group shrink-0">
                        <div className={`absolute top-0 left-0 w-full h-2 ${isLocked ? 'bg-indigo-500' : isCheckedIn ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>

                        <div className="text-center mb-6">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">Time Registry</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        </div>

                        <div className="flex flex-col items-center mb-6">
                            <div className="text-5xl font-black text-slate-800 tracking-tighter font-mono mb-4 tabular-nums">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                            </div>

                            <div className="w-full bg-slate-50 rounded-[2rem] p-4 border border-slate-300 flex flex-col items-center justify-center">
                                <div className={`flex items-center gap-2 font-black text-2xl transition-all ${isLocked ? 'text-indigo-600' : isCheckedIn ? 'text-emerald-600' : 'text-slate-300'}`}>
                                    {isLocked ? <Lock size={24} /> : workMode === 'Field' ? <ClipboardCheck size={24} /> : <Timer size={24} className={isCheckedIn ? "animate-pulse" : ""} />}
                                    <span>{workMode === 'Field' ? `${completedTasksCount}/${totalTasksCount}` : formatDuration(totalWorkedMs)}</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                                    {isLocked ? 'Attendance Locked for Today' : workMode === 'Field' ? 'Worked Today (Tasks Ratio)' : 'Shift Running (Total Time)'}
                                </span>
                            </div>
                        </div>

                        {!isLocked ? (
                            <button
                                onClick={handleCheckInOut}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-3 relative z-10 ${isCheckedIn
                                    ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                                    : 'bg-medical-600 text-white shadow-medical-500/30'
                                    }`}
                            >
                                {isCheckedIn ? (
                                    <><CheckCircle size={18} /> Finish Shift & Confirm</>
                                ) : (
                                    <><Clock size={18} /> {accumulatedMs > 0 ? 'Resume Shift' : 'Check In Now'}</>
                                )}
                            </button>
                        ) : (
                            <div className="w-full flex-col gap-3">
                                <div className="w-full py-4 bg-slate-50 border border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                                    <Lock size={24} className="mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Shift Completed & Locked</span>
                                    <span className="text-[8px] font-bold mt-1">See you tomorrow!</span>
                                </div>
                                <button
                                    onClick={logActualDeparture}
                                    className="w-full mt-3 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all bg-slate-800 text-white hover:bg-slate-700 shadow-md flex items-center justify-center gap-2"
                                >
                                    <Clock size={14} /> Log Actual Departure Time
                                </button>
                            </div>
                        )}

                        {isCheckedIn && !canConfirmAttendance && !isLocked && (
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

                {/* Right Column: Staff Registry (Attendance Sheet) */}
                <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-300 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="p-6 border-b border-slate-300 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-base text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <Building2 size={20} className="text-slate-400" /> Attendance Sheet
                        </h3>
                        <div className="flex bg-white p-1 rounded-xl border border-slate-300 shadow-sm">
                            {['All', 'Service', 'Administration', 'Support'].map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => setFilterStatus(dept)}
                                    className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg transition-all ${filterStatus === dept
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
                            <thead className="bg-slate-50 border-b border-slate-300 sticky top-0 z-10 text-[9px] uppercase font-black tracking-widest text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Progress / Time</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Check In</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Check Out</th>
                                    <th className="px-6 py-4 text-right">Day Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {employees.filter(e => filterStatus === 'All' || e.department === filterStatus).map((emp) => {
                                    const rec = attendanceRecords.find(r => r.userId === emp.id && r.date === todayStr);
                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-500 border border-slate-300">
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
                                                    {(emp.department === 'Service' || emp.department === 'Sales' || emp.department === 'Support') ? <ClipboardCheck size={14} className="text-blue-500" /> : <Timer size={14} className="text-emerald-500" />}
                                                    {getEmpAttendanceDisplay(emp)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 hidden md:table-cell">
                                                <span className="text-[11px] font-bold text-slate-600">
                                                    {formatTime(rec?.checkInTime)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 hidden md:table-cell">
                                                <span className="text-[11px] font-bold text-slate-600">
                                                    {formatTime(rec?.checkOutTime)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${getStatusBadge(emp.status, emp.id)}`}>
                                                    {rec?.status === 'Completed' ? 'Locked' : rec?.status || emp.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
