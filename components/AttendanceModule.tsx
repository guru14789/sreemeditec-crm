import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Building2, Timer, ClipboardCheck, Lock, Download, Calendar, Trash2, X, Edit2 } from 'lucide-react';
import { Task, Employee, AttendanceRecord } from '../types';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceModuleProps {
    tasks: Task[];
}

type WorkMode = 'Office' | 'Field' | 'Remote';

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks }) => {
    const { addPoints, currentUser: me, attendanceRecords, updateAttendance, employees, addNotification, holidays, addHoliday, removeHoliday, addLog } = useData();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [accumulatedMs, setAccumulatedMs] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [workMode, setWorkMode] = useState<WorkMode>('Office');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const isAdmin = me?.role === 'SYSTEM_ADMIN';
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');

    // Admin Overwrite States
    const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);
    const [editCheckIn, setEditCheckIn] = useState('');
    const [editCheckOut, setEditCheckOut] = useState('');
    const [editReason, setEditReason] = useState('');

    const REQUIRED_OFFICE_HOURS = 8;

    // Use local date for todayStr to ensure consistency across refreshes/timezones
    const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayStr = getTodayStr();

    const todayHoliday = holidays.find(h => h.date === todayStr);
    const isHolidayToday = !!todayHoliday;

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
        return `${hours}h ${minutes}m`;
    };

    const totalWorkedMs = getTotalWorkedMs();
    const totalWorkedHours = totalWorkedMs / (1000 * 60 * 60);

    const myTasksToday = tasks.filter(t => t.assignedTo === me?.name && t.dueDate === todayStr);
    const completedTasksCount = myTasksToday.filter(t => t.status === 'Done').length;
    const totalTasksCount = myTasksToday.length;

    const isOfficeHoursComplete = totalWorkedHours >= REQUIRED_OFFICE_HOURS;


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
                addNotification('Shift Completed', 'Your 8-hour office shift has been automatically logged.', 'success');
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

    const handleAdminOverwriteAttendance = async () => {
        if (!editingAttendanceRecord || !editReason) return;
        
        try {
            const checkInDate = new Date(editCheckIn);
            const checkOutDate = new Date(editCheckOut);
            
            if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
                alert("Invalid Date or Time");
                return;
            }

            const diffMs = checkOutDate.getTime() - checkInDate.getTime();
            if (diffMs < 0) {
                alert("Check-out cannot be earlier than Check-in.");
                return;
            }

            const updates: Partial<AttendanceRecord> = {
                checkInTime: checkInDate.toISOString(),
                checkOutTime: checkOutDate.toISOString(),
                totalWorkedMs: diffMs,
                status: 'Completed',
                editHistory: [
                    ...(editingAttendanceRecord.editHistory || []),
                    { 
                        editedAt: new Date().toISOString(),
                        editedBy: me?.name || 'Admin',
                        reason: editReason,
                        prevIn: editingAttendanceRecord.checkInTime,
                        prevOut: editingAttendanceRecord.checkOutTime 
                    }
                ]
            } as any;

            await updateAttendance({ ...editingAttendanceRecord, ...updates });
            await addLog('Attendance', 'Admin Overwrite', `Attendance corrected for ${editingAttendanceRecord.userName} on ${editingAttendanceRecord.date}. Reason: ${editReason}`);
            addNotification('Attendance Corrected', `Record for ${editingAttendanceRecord.userName} updated.`, 'success');
            setShowEditAttendanceModal(false);
            setEditingAttendanceRecord(null);
            setEditReason('');
        } catch (err) {
            console.error(err);
            alert("Failed to update record.");
        }
    };

    const handleCheckInOut = async () => {
        if (isLocked || isHolidayToday || !me) return;

        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
        const hours = istDate.getHours();
        const minutes = istDate.getMinutes();

        // Check if within 9:15 AM - 9:50 AM IST
        const isWithinWindow = (hours === 9 && minutes >= 15 && minutes <= 50);
        
        // If not checked in, check the window
        if (!isCheckedIn && !isWithinWindow && !isAdmin) {
            alert("Mandatory Check-in window is 9:15 AM - 9:50 AM IST. You have missed this window. Please contact Admin to log your attendance manually.");
            return;
        }

        const recordId = `${me.id}_${todayStr}`;
        try {
            if (isCheckedIn) {
                setShowConfirmModal(true);
            } else {
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

        // If day is locked, or it's a holiday, or they are checked in/started, calculate time
        let ms = record.totalWorkedMs || 0;
        if (record.status === 'CheckedIn' && record.lastSessionStartTime) {
            ms += currentTime.getTime() - new Date(record.lastSessionStartTime).getTime();
        }
        
        const remaining = Math.max(0, (REQUIRED_OFFICE_HOURS * 3600000) - ms);
        
        // Show tasks as secondary info for field-inclined roles
        if (emp.department === 'Service' || emp.department === 'Sales' || emp.department === 'Support') {
            const empTasks = tasks.filter(t => t.assignedTo === emp.name && t.dueDate === todayStr);
            const done = empTasks.filter(t => t.status === 'Done').length;
            const taskInfo = empTasks.length > 0 ? ` (${done}/${empTasks.length} Tasks)` : '';
            return remaining === 0 ? `Done${taskInfo}` : `${formatDuration(remaining)} Left${taskInfo}`;
        }

        return remaining === 0 ? "Done" : `${formatDuration(remaining)} Left`;
    };



    const handleExportMonthlyReport = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const now = new Date();
        const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`Monthly Attendance Report: ${monthYear}`, 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
        doc.text(`Organization: Sree Meditec Enterprise`, 14, 30);

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();
        
        const tableData = employees.map(emp => {
            const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
            const empRecords = attendanceRecords.filter(r => 
                r.userId === emp.id && 
                r.date.startsWith(currentYearMonth)
            );

            let totalDaysPresent = 0;
            let totalWorkedMs = 0;

            for (let i = 1; i <= currentDate; i++) {
                const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(currentYear, currentMonth, i);
                const dayRecord = empRecords.find(r => r.date === dateStr && (r.status === 'Completed' || r.status === 'CheckedIn'));
                const isHoliday = holidays.some(h => h.date === dateStr);
                
                if (dateObj.getDay() === 0 || isHoliday) {
                    // Credit day for Sunday or Holiday
                    totalDaysPresent++;
                    // Credit 8 hours for Sunday or Holiday
                    totalWorkedMs += (REQUIRED_OFFICE_HOURS * 3600000);
                } else if (dayRecord) {
                    // Credit day for actual work
                    totalDaysPresent++;
                    // Credit actual worked hours
                    totalWorkedMs += (dayRecord.totalWorkedMs || 0);
                }
            }

            const totalHours = (totalWorkedMs / (1000 * 60 * 60)).toFixed(1);
            
            const empTasks = tasks.filter(t => 
                t.assignedTo === emp.name && 
                t.dueDate.startsWith(currentYearMonth) &&
                t.status === 'Done'
            ).length;

            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const targetHours = daysInMonth * REQUIRED_OFFICE_HOURS;

            return [
                emp.name,
                emp.department,
                emp.role,
                totalDaysPresent,
                `${totalHours}h / ${targetHours}h`,
                empTasks > 0 ? empTasks : '-'
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['Staff Name', 'Department', 'Role', 'Days Present', 'Total Hours (Actual/Goal)', 'Tasks Completed']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 255, 250] }
        });

        doc.save(`Attendance_Report_${monthYear.replace(' ', '_')}.pdf`);
        addNotification('Report Generated', `Monthly attendance for ${monthYear} has been exported.`, 'success');
    };

    const getStatusBadge = (status: string, empId: string) => {
        const record = attendanceRecords.find(r => r.userId === empId && r.date === todayStr);
        if (isHolidayToday) return 'bg-amber-100 text-amber-800 border-amber-200';
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
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-300 transform transition-all animate-in fade-in zoom-in duration-300">
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

            {/* Holiday Management Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-300 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Organization Holidays</h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Holiday Name</label>
                                <input 
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-medical-500 transition-all"
                                    placeholder="e.g. Independence Day"
                                    value={newHolidayName}
                                    onChange={(e) => setNewHolidayName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                                <input 
                                    type="date"
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-medical-500 transition-all font-mono"
                                    value={newHolidayDate}
                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    if(!newHolidayName || !newHolidayDate) return;
                                    addHoliday({ id: `HOL-${Date.now()}`, name: newHolidayName, date: newHolidayDate });
                                    setNewHolidayName('');
                                    setNewHolidayDate('');
                                    addNotification('Holiday Added', `${newHolidayName} has been scheduled.`, 'success');
                                }}
                                className="col-span-2 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                            >
                                Schedule Holiday
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                            {holidays.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                                <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 group">
                                    <div>
                                        <div className="text-sm font-black text-slate-800">{h.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <button 
                                        onClick={() => removeHoliday(h.id)}
                                        className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {holidays.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-widest">No holidays scheduled</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 flex-1 min-h-0">
                {/* Top Section: Action Card (Centered with max-width) */}
                <div className="w-full flex justify-center">
                    <div className="w-full max-w-3xl">
                        {/* Primary Action Card */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-300 p-4 flex flex-col relative overflow-hidden group">
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${isHolidayToday ? 'bg-amber-500' : isLocked ? 'bg-indigo-500' : isCheckedIn ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>

                            <div className="flex items-center justify-between mb-4 px-2">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Time Registry</h3>
                                    <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-none">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                                {isHolidayToday && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200">Holiday Credited</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-5">
                                    <div className={`aspect-square w-12 rounded-xl flex items-center justify-center transition-all ${isLocked ? 'bg-indigo-50 text-indigo-600' : isCheckedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                        {isLocked ? <Lock size={20} /> : workMode === 'Field' ? <ClipboardCheck size={20} /> : <Timer size={20} className={isCheckedIn ? "animate-pulse" : ""} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className={`font-black text-2xl transition-all tabular-nums leading-none ${isLocked ? 'text-indigo-600' : isCheckedIn ? 'text-emerald-600' : 'text-slate-300'}`}>
                                            {workMode === 'Field' 
                                                ? `${completedTasksCount}/${totalTasksCount}` 
                                                : isOfficeHoursComplete ? 'Goal Met' : formatDuration(Math.max(0, (REQUIRED_OFFICE_HOURS * 3600000) - totalWorkedMs))}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                                            {isLocked ? 'Shift Locked' : workMode === 'Field' ? 'Tasks Ratio' : isOfficeHoursComplete ? 'Target Reached' : 'Time Remaining (8h Goal)'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {(() => {
                                        const isAfter7PM = currentTime.getHours() >= 19;

                                        if (!isLocked && !isHolidayToday) {
                                            return (
                                                <button
                                                    onClick={handleCheckInOut}
                                                    className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all transform active:scale-95 shadow-sm flex items-center justify-center gap-2 relative z-10 ${isCheckedIn
                                                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                                        : 'bg-medical-600 text-white shadow-medical-500/20'
                                                        }`}
                                                >
                                                    {isCheckedIn ? (
                                                        <><CheckCircle size={14} /> Finish & Confirm</>
                                                    ) : (
                                                        <><Clock size={14} /> {accumulatedMs > 0 ? 'Resume' : 'Check In'}</>
                                                    )}
                                                </button>
                                            );
                                        }

                                        if (isHolidayToday) {
                                            return (
                                                <div className="w-full bg-amber-50/50 border border-amber-200/50 rounded-xl px-4 py-3 flex items-center gap-3">
                                                    <Calendar size={18} className="text-amber-500" />
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase text-amber-900 leading-none">{todayHoliday?.name || 'Holiday'}</div>
                                                        <div className="text-[8px] font-bold text-amber-700/60 uppercase tracking-widest mt-1">System Locked</div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="flex gap-2">
                                                <div className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400">
                                                    <Lock size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Locked</span>
                                                </div>
                                                {!isAfter7PM ? (
                                                    <button
                                                        onClick={logActualDeparture}
                                                        className="flex-1 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all bg-slate-800 text-white hover:bg-slate-700 scale-100 animate-in fade-in slide-in-from-right-2"
                                                    >
                                                        Log Departure
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 py-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center gap-2 text-rose-400 italic">
                                                        <Clock size={12} />
                                                        <span className="text-[8px] font-black uppercase tracking-widest leading-none text-center">Closed (7PM)</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Staff Registry (Attendance Sheet) - Full Width */}
                <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-slate-300 flex flex-wrap gap-3 justify-between items-center bg-slate-50/25">
                        <div className="flex items-center gap-3">
                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Building2 size={18} className="text-slate-400" /> Attendance Sheet
                            </h3>
                            <div className="h-4 w-px bg-slate-200 mx-1"></div>
                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowHolidayModal(true)}
                                        className="p-1 px-3 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm"
                                        title="Manage Holidays"
                                    >
                                        <Calendar size={13} /> Holidays
                                    </button>
                                    <button 
                                        onClick={handleExportMonthlyReport}
                                        className="p-1 px-3 bg-white text-emerald-600 rounded-lg border border-slate-200 hover:bg-emerald-50 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm"
                                        title="Export Monthly Report"
                                    >
                                        <Download size={13} /> Export
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {['All', 'Service', 'Administration', 'Support', 'Sales'].map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => setFilterStatus(dept)}
                                    className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-md transition-all ${filterStatus === dept
                                        ? 'bg-white shadow-sm text-medical-700'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px] text-slate-600">
                            <thead className="bg-[#fcfdfd] border-b border-slate-200 sticky top-0 z-10 text-[8px] uppercase font-black tracking-widest text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Staff Member</th>
                                    <th className="px-5 py-3">Department</th>
                                    <th className="px-5 py-3">Progress / Time</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Check In</th>
                                    <th className="px-5 py-3 hidden md:table-cell">Check Out</th>
                                    <th className="px-5 py-3 text-right">Day Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {employees.filter(e => filterStatus === 'All' || e.department === filterStatus).map((emp) => {
                                    const rec = attendanceRecords.find(r => r.userId === emp.id && r.date === todayStr);
                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-400 border border-slate-200">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-800 text-[11px] leading-none">{emp.name}</div>
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase mt-1">{emp.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                    {emp.department}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2 text-slate-800 font-black text-[10px]">
                                                    {getEmpAttendanceDisplay(emp)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {formatTime(rec?.checkInTime)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 hidden md:table-cell">
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {formatTime(rec?.checkOutTime)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border tracking-wider ${getStatusBadge(emp.status, emp.id)}`}>
                                                        {isHolidayToday ? 'Holiday' : rec?.status === 'Completed' ? 'Locked' : rec?.status || emp.status}
                                                    </span>
                                                    {isAdmin && rec && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingAttendanceRecord(rec);
                                                                setEditCheckIn(rec.checkInTime ? rec.checkInTime.slice(0, 16) : '');
                                                                setEditCheckOut(rec.checkOutTime ? rec.checkOutTime.slice(0, 16) : '');
                                                                setShowEditAttendanceModal(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {isAdmin && !rec && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newRec: AttendanceRecord = {
                                                                    id: `${emp.id}_${todayStr}`,
                                                                    userId: emp.id,
                                                                    userName: emp.name,
                                                                    date: todayStr,
                                                                    status: 'Completed',
                                                                    checkInTime: new Date().toISOString(),
                                                                    checkOutTime: null,
                                                                    totalWorkedMs: 0,
                                                                    lastSessionStartTime: null,
                                                                    workMode: 'Office'
                                                                };
                                                                setEditingAttendanceRecord(newRec);
                                                                setEditCheckIn(newRec.checkInTime ? newRec.checkInTime.slice(0, 16) : '');
                                                                setEditCheckOut(newRec.checkInTime ? newRec.checkInTime.slice(0, 16) : '');
                                                                setShowEditAttendanceModal(true);
                                                            }}
                                                            className="text-[8px] font-black uppercase text-indigo-600 hover:text-indigo-700 underline underline-offset-2 ml-1"
                                                        >
                                                            Manual Entry
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {showEditAttendanceModal && editingAttendanceRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="font-black text-xl text-slate-800 uppercase tracking-tight">Correct Attendance</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingAttendanceRecord.userName}</p>
                            </div>
                            <button onClick={() => setShowEditAttendanceModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Check-In</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500" 
                                    value={editCheckIn} 
                                    onChange={e => setEditCheckIn(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Check-Out</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500" 
                                    value={editCheckOut} 
                                    onChange={e => setEditCheckOut(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Adjustment</label>
                                <textarea 
                                    className="w-full border border-slate-300 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold outline-none min-h-[80px]" 
                                    placeholder="e.g. Forgot to punch out, system error..." 
                                    value={editReason} 
                                    onChange={e => setEditReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 flex gap-3 bg-slate-50/30">
                            <button onClick={() => setShowEditAttendanceModal(false)} className="flex-1 bg-white border border-slate-300 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                            <button 
                                onClick={handleAdminOverwriteAttendance} 
                                disabled={!editReason}
                                className="flex-[2] bg-indigo-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Apply Correction
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
