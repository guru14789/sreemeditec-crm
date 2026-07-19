import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Building2, Timer, ClipboardCheck, Lock, Download, Calendar, Trash2, X, Edit2, Activity, TrendingUp, Zap, FileText, ChevronRight, AlertCircle, MapPin } from 'lucide-react';
import { Task, Employee, AttendanceRecord } from '../types';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { EodSubmissionModal } from './EodSubmissionModal';

interface AttendanceModuleProps {
    tasks: Task[];
    userRole?: 'Admin' | 'Employee'; // Controlled by HR Access Grid via tabRole
}

type WorkMode = 'Office' | 'Field' | 'Remote' | 'Outstation';

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ tasks, userRole = 'Employee' }) => {
    const { 
        addPoints, currentUser: me, attendanceRecords, updateAttendance, removeAttendance, 
        employees, addNotification, holidays, addHoliday, removeHoliday, addLog,
        leaveRequests, addLeaveRequest, updateLeaveRequest, showAlert, showConfirm 
    } = useData();
    const [currentTime, setCurrentTime] = useState(new Date());

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showEodModal, setShowEodModal] = useState(false);

    const [workMode, setWorkMode] = useState<WorkMode>('Office');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const isAdmin = userRole === 'Admin'; // Strictly enforced: governed by Access Grid tabRole only
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState('');

    // Admin Overwrite States
    const [showEditAttendanceModal, setShowEditAttendanceModal] = useState(false);
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);
    const [editCheckIn, setEditCheckIn] = useState('');
    const [editCheckOut, setEditCheckOut] = useState('');
    const [editReason, setEditReason] = useState('');
    const [editStatus, setEditStatus] = useState<'CheckedIn' | 'Paused' | 'Completed' | 'OnLeave'>('Completed');
    const [editWorkMode, setEditWorkMode] = useState<WorkMode>('Office');
    const [editLeaveReason, setEditLeaveReason] = useState('');

    // Leave Request States
    const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
    const [showManageLeavesModal, setShowManageLeavesModal] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [showQuickAttendanceModal, setShowQuickAttendanceModal] = useState(false);
    const [quickSelectedDate, setQuickSelectedDate] = useState('');
    const [quickStatus, setQuickStatus] = useState<'Present' | 'Absent' | 'Leave' | 'Outstation'>('Present');
    const [quickReason, setQuickReason] = useState('');
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [calendarSelectedUser, setCalendarSelectedUser] = useState<Employee | null>(null);
    const [leaveForm, setLeaveForm] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });

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

    // Derived states (always perfectly in sync with Firestore)
    const isCheckedIn = todayRecord?.status === 'CheckedIn';
    const accumulatedMs = todayRecord?.totalWorkedMs || 0;
    const sessionStartTime = todayRecord?.lastSessionStartTime ? new Date(todayRecord.lastSessionStartTime) : null;
    const isLocked = todayRecord?.status === 'Completed';

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



    const logActualDeparture = async () => {
        if (!me) return;
        const recordId = `${me.id}_${todayStr}`;
        await updateAttendance({
            id: recordId,
            userId: me.id,
            userName: me.name,
            date: todayStr,
            checkOutTime: new Date().toISOString(), // Only update checkout time, not MS worked
            isManualCheckOut: true // Protect from auto-close overwrite
        });
        addNotification('Departure Logged', 'Your final departure time has been updated.', 'success');
    };

    const formatTime = (isoString: string | null | undefined) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    const formatTime12h = (isoString: string | null | undefined) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
        } catch (e) {
            return '';
        }
    };

    const handleAdminOverwriteAttendance = async () => {
        if (!editingAttendanceRecord || !editReason) return;
        
        try {
            const checkInDate = editCheckIn ? new Date(editCheckIn) : null;
            const checkOutDate = editCheckOut ? new Date(editCheckOut) : null;
            
            if (!checkInDate && !checkOutDate && editStatus !== 'OnLeave') {
                await showAlert("Please provide at least a Check-In or Check-Out time.", "Validation Error");
                return;
            }

            if (checkInDate && isNaN(checkInDate.getTime())) {
                await showAlert("Invalid Check-In Date or Time", "Validation Error");
                return;
            }

            if (checkOutDate && isNaN(checkOutDate.getTime())) {
                await showAlert("Invalid Check-Out Date or Time", "Validation Error");
                return;
            }

            let diffMs = 0;
            let finalStatus: AttendanceRecord['status'] = editStatus;
            let lastSession: string | null = null;

            if (editStatus === 'OnLeave') {
                finalStatus = 'OnLeave';
                lastSession = null;
                diffMs = 0;
            } else if (checkInDate && checkOutDate) {
                diffMs = checkOutDate.getTime() - checkInDate.getTime();
                if (diffMs < 0) {
                    await showAlert("Check-out cannot be earlier than Check-in.", "Validation Error");
                    return;
                }
                finalStatus = 'Completed';
                lastSession = null;
            } else if (checkInDate) {
                finalStatus = 'CheckedIn';
                lastSession = checkInDate.toISOString();
                diffMs = 0;
            } else if (checkOutDate) {
                // If only checkout given, we try to use existing checkin if any
                const existingIn = editingAttendanceRecord.checkInTime ? new Date(editingAttendanceRecord.checkInTime) : null;
                if (!existingIn) {
                    await showAlert("Cannot log Check-Out without a Check-In record.", "Validation Error");
                    return;
                }
                diffMs = checkOutDate.getTime() - existingIn.getTime();
                if (diffMs < 0) {
                    await showAlert("Check-out cannot be earlier than Check-in.", "Validation Error");
                    return;
                }
                finalStatus = 'Completed';
                lastSession = null;
            }

            const updates: Partial<AttendanceRecord> = {
                checkInTime: finalStatus === 'OnLeave' ? null : (checkInDate ? checkInDate.toISOString() : editingAttendanceRecord.checkInTime),
                checkOutTime: finalStatus === 'OnLeave' ? null : (checkOutDate ? checkOutDate.toISOString() : null),
                totalWorkedMs: finalStatus === 'OnLeave' ? 0 : diffMs,
                status: finalStatus,
                workMode: finalStatus === 'OnLeave' ? editingAttendanceRecord.workMode : editWorkMode,
                leaveReason: finalStatus === 'OnLeave' ? editLeaveReason : '',
                lastSessionStartTime: finalStatus === 'OnLeave' ? null : lastSession,
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
            await showAlert("Failed to update record.", "Error");
        }
    };

    const handleResetAttendance = async () => {
        if (!editingAttendanceRecord) return;
        const confirmed = await showConfirm(`Are you sure you want to COMPLETELY CLEAR the attendance record for ${editingAttendanceRecord.userName} on ${editingAttendanceRecord.date}? This will reset them to "Not Started".`);
        if (!confirmed) return;
        
        try {
            await removeAttendance(editingAttendanceRecord.id);
            await addLog('Attendance', 'Admin Reset', `Attendance record deleted for ${editingAttendanceRecord.userName} on ${editingAttendanceRecord.date}.`);
            addNotification('Record Cleared', `Attendance for ${editingAttendanceRecord.userName} has been reset.`, 'success');
            setShowEditAttendanceModal(false);
            setEditingAttendanceRecord(null);
        } catch (err) {
            console.error(err);
            await showAlert("Failed to reset record.", "Error");
        }
    };

    const handleApplyLeave = async () => {
        if (!me || !leaveForm.reason.trim()) {
            await showAlert("Please provide a proper reason for leave.", "Validation Error");
            return;
        }
        
        const req: LeaveRequest = {
            id: `LV-${Date.now()}-${me.id.slice(0, 4)}`,
            userId: me.id,
            userName: me.name,
            startDate: leaveForm.startDate,
            endDate: leaveForm.endDate,
            reason: leaveForm.reason,
            status: 'Pending',
            appliedOn: new Date().toISOString()
        };

        try {
            await addLeaveRequest(req);
            setShowApplyLeaveModal(false);
            setLeaveForm({ 
                startDate: new Date().toISOString().split('T')[0], 
                endDate: new Date().toISOString().split('T')[0], 
                reason: '' 
            });
        } catch (err) {
            alert("Failed to submit request.");
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
        
        // If not checked in, check the window (Applies to all users EXCEPT Super Admin)
        const isSuperAdmin = me.email?.toLowerCase() === 'sreekumar.career@gmail.com';
        
        if (!isCheckedIn && !isWithinWindow && !isSuperAdmin) {
            await showAlert("Mandatory Check-in window is 9:15 AM - 9:50 AM IST. You have missed this window. Please contact an Admin to log your attendance manually.", "Check-in Window Missed");
            return;
        }

        const recordId = `${me.id}_${todayStr}`;
        try {
            if (isCheckedIn) {
                setShowConfirmModal(true);
            } else {
                let locationData: { lat?: number; lng?: number; accuracy?: number } = {};
                if (navigator.geolocation) {
                    try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
                        });
                        locationData = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        };
                    } catch (err) {
                        console.warn("Could not retrieve geolocation:", err);
                    }
                }

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
                    checkOutTime: null,
                    ...locationData
                });
                
                // Award points for punctuality on first check-in
                if (!todayRecord?.checkInTime && isWithinWindow) {
                    addPoints(10, 'Attendance', 'Punctuality: Early Check-in');
                    addNotification('Punctuality Bonus', '10 points awarded for checking in on time.', 'success');
                }
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
            checkOutTime: now.toISOString(),
            isManualCheckOut: true // Protect from auto-close overwrite
        });

        addPoints(50, 'Attendance', 'Daily Shift Completed');
        addNotification('Attendance Locked', 'Daily shift attendance has been locked successfully.', 'success');
        setShowConfirmModal(false);
        setShowEodModal(true);
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
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 26);
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
            const absentDates: string[] = [];
            const leaveDates: string[] = [];

            for (let i = 1; i <= currentDate; i++) {
                const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(currentYear, currentMonth, i);
                const dayRecord = empRecords.find(r => r.date === dateStr && (r.status === 'Completed' || r.status === 'CheckedIn' || r.status === 'OnLeave'));
                const isHoliday = holidays.some(h => h.date === dateStr);
                
                if (dateObj.getDay() === 0 || isHoliday) {
                    totalDaysPresent++;
                    totalWorkedMs += (REQUIRED_OFFICE_HOURS * 3600000);
                } else if (dayRecord) {
                    if (dayRecord.status === 'OnLeave') {
                        leaveDates.push(`${i} (${dayRecord.leaveReason || 'No Reason'})`);
                    } else if (dayRecord.workMode === 'Outstation') {
                        totalDaysPresent++;
                        totalWorkedMs += (dayRecord.totalWorkedMs || 0);
                    } else {
                        totalDaysPresent++;
                        totalWorkedMs += (dayRecord.totalWorkedMs || 0);
                    }
                } else if (dateObj.getDay() !== 0 && !isHoliday) {
                    absentDates.push(i.toString());
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
                totalDaysPresent,
                absentDates.length > 0 ? absentDates.join(', ') : '-',
                leaveDates.length > 0 ? leaveDates.join(', ') : '-',
                `${totalHours}h / ${targetHours}h`,
                empTasks > 0 ? empTasks : '-'
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['Staff Name', 'Dept', 'Present', 'Absent (Dates)', 'Leaves (Date: Reason)', 'Worked/Goal', 'Tasks']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 20 },
                2: { cellWidth: 15 },
                3: { cellWidth: 30 },
                4: { cellWidth: 50 },
                5: { cellWidth: 25 },
                6: { cellWidth: 15 }
            },
            alternateRowStyles: { fillColor: [245, 255, 250] }
        });

        doc.save(`Attendance_Report_${monthYear.replace(' ', '_')}.pdf`);
        addNotification('Report Generated', `Monthly attendance for ${monthYear} has been exported.`, 'success');
    };

    const handleExportIndividualReport = (emp: Employee) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const now = new Date();
        const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // Emerald-600
        doc.text(`Individual Performance Report`, 14, 25);
        
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFont('helvetica', 'normal');
        doc.text(`Staff: ${emp.name} (${emp.department})`, 14, 32);
        doc.text(`Period: ${monthYear}`, 14, 38);
        
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(14, 45, 196, 45);

        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();
        const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        const empRecords = attendanceRecords.filter(r => 
            r.userId === emp.id && 
            r.date.startsWith(currentYearMonth)
        );

        const tableData = [];
        let totalWorkedMs = 0;
        let daysPresent = 0;
        let daysOnLeave = 0;

        for (let i = 1; i <= currentDate; i++) {
            const dateStr = `${currentYearMonth}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(currentYear, currentMonth, i);
            const dayRecord = empRecords.find(r => r.date === dateStr);
            const isHoliday = holidays.find(h => h.date === dateStr);
            const isSunday = dateObj.getDay() === 0;

            let status = 'Absent';
            let duration = '0h 0m';
            let remarks = '';

            if (isHoliday) {
                status = 'Holiday';
                duration = '8h 0m';
                remarks = isHoliday.name;
                totalWorkedMs += (8 * 3600000);
                daysPresent++;
            } else if (isSunday) {
                status = 'Sunday';
                duration = '8h 0m';
                remarks = 'Weekend Credit';
                totalWorkedMs += (8 * 3600000);
                daysPresent++;
            } else if (dayRecord) {
                if (dayRecord.status === 'OnLeave') {
                    status = 'On Leave';
                    duration = '-';
                    remarks = dayRecord.leaveReason || 'Reason Not Specified';
                    daysOnLeave++;
                } else if (dayRecord.workMode === 'Outstation') {
                    status = 'Outstation';
                    duration = formatDuration(dayRecord.totalWorkedMs || 0);
                    totalWorkedMs += (dayRecord.totalWorkedMs || 0);
                    daysPresent++;
                    remarks = 'Outstation Duty';
                } else {
                    status = 'Present';
                    duration = formatDuration(dayRecord.totalWorkedMs || 0);
                    totalWorkedMs += (dayRecord.totalWorkedMs || 0);
                    daysPresent++;
                    remarks = dayRecord.workMode;
                }
            }

            tableData.push([
                dateStr,
                dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
                status,
                duration,
                remarks
            ]);
        }

        autoTable(doc, {
            startY: 55,
            head: [['Date', 'Day', 'Status', 'Work Duration', 'Remarks / Reason']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 15 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 },
                4: { cellWidth: 'auto' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Summary Statistics`, 14, finalY);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Days Present: ${daysPresent}`, 14, finalY + 8);
        doc.text(`Total Days on Leave: ${daysOnLeave}`, 14, finalY + 14);
        doc.text(`Total Worked Hours: ${(totalWorkedMs / 3600000).toFixed(1)}h`, 14, finalY + 20);

        doc.save(`Attendance_Report_${emp.name.replace(' ', '_')}_${monthYear.replace(' ', '_')}.pdf`);
        addNotification('Report Generated', `Individual report for ${emp.name} has been exported.`, 'success');
    };

    const getStatusBadge = (status: string, empId: string) => {
        const record = attendanceRecords.find(r => r.userId === empId && r.date === todayStr);
        if (isHolidayToday) return 'bg-amber-100 text-amber-800 border-amber-200';
        if (record?.status === 'OnLeave') return 'bg-rose-100 text-rose-800 border-rose-200';
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
        <div className="h-full flex flex-col gap-2 md:gap-4 overflow-y-auto p-0 md:p-1 custom-scrollbar">
            {/* Header Toolbar */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none md:rounded-[2rem]">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none md:rounded-[2rem]"></div>
                
                {/* Top Row: Title & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
                    <div className="hidden lg:flex items-center gap-4 group">
                        <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                            <Clock size={20} className="hidden xl:block" />
                            <Clock size={16} className="xl:hidden" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Check-In / Out</h2>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Mark Daily Attendance And Coordinates</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <Activity size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Today's Shift</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                {isLocked ? "Day Locked" : isCheckedIn ? "Active Shift" : "Not Started"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full sm:w-fit shrink-0 flex gap-1">
                        <button
                            onClick={() => {
                                setCalendarSelectedUser(me || null);
                                setCalendarViewDate(new Date());
                                setShowCalendarModal(true);
                            }}
                            className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100`}
                        >
                            <Calendar size={12} /> My Calendar
                        </button>
                    </div>
                </div>
            </div>
            {showConfirmModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-300 transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-playfair font-bold tracking-tight text-center text-slate-800 uppercase tracking-tight mb-2">Lock Attendance?</h3>
                        <p className="text-slate-500 text-center text-sm font-medium mb-8">
                            Confirming will lock your attendance for today. You won't be able to resume until tomorrow.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmFinalAttendance}
                                className="flex-1 py-3 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
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
                            <h3 className="text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">Organization Holidays</h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Holiday Name</label>
                                <input 
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm outline-none focus:border-medical-500 transition-all"
                                    placeholder="e.g. Independence Day"
                                    value={newHolidayName}
                                    onChange={(e) => setNewHolidayName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Date</label>
                                <input 
                                    type="date"
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm outline-none focus:border-medical-500 transition-all font-mono"
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
                                className="col-span-2 py-3.5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all"
                            >
                                Schedule Holiday
                            </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3">
                            {holidays.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                                <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[2rem] border border-slate-200 group">
                                    <div>
                                        <div className="text-sm font-black text-slate-800">{h.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                    </div>
                                    <button 
                                        onClick={() => removeHoliday(h.id)}
                                        className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-[2rem] transition-all opacity-0 group-hover:opacity-100"
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

            <div className="flex flex-col gap-2 md:gap-3 flex-1 min-h-0">
                {/* Top Section: Time Registry Cards */}
                <div className="space-y-3 mb-2">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={13} className="text-emerald-600" /> Time Registry
                        </h3>
                        <button 
                            onClick={() => {
                                setCalendarSelectedUser(me || null);
                                setCalendarViewDate(new Date());
                                setShowCalendarModal(true);
                            }}
                            className="hidden md:flex items-center gap-1.5 text-[8px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors"
                        >
                            <Calendar size={10} /> My Calendar
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
                        {/* Card 1: Today's Shift */}
                        <div className="hidden md:flex bg-gradient-to-br from-emerald-950 to-green-900 m-0 md:m-3 lg:m-4 p-3 md:p-4 rounded-[20px] md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px]">
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center group-hover:scale-110 transition-transform text-[#c5a059] drop-shadow-md">
                                    <Activity size={15} />
                                </div>
                                <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <Building2 size={8} /> {workMode}
                                </span>
                            </div>
                            <div>
                                <p className="text-[7.5px] md:text-[8px] font-extrabold text-emerald-300/80 uppercase tracking-widest leading-none">Today's Shift</p>
                                <h3 className="text-base md:text-lg font-playfair font-bold tracking-tight text-white mt-1">
                                    {isLocked ? "Day Locked" : isCheckedIn ? "Active Shift" : "Not Started"}
                                </h3>
                            </div>
                        </div>

                        {/* Card 2: Work Progress */}
                        <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 m-0 md:m-3 lg:m-4 p-3 md:p-4 rounded-[20px] md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 min-h-[90px] md:min-h-[120px]">
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-100 group-hover:scale-110 transition-transform">
                                    <Timer size={15} />
                                </div>
                                <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-300/20 text-emerald-100 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <TrendingUp size={8} /> 
                                    {workMode === 'Field' 
                                        ? `${Math.round((completedTasksCount / (totalTasksCount || 1)) * 100)}%` 
                                        : `${Math.round((totalWorkedMs / (REQUIRED_OFFICE_HOURS * 3600000)) * 100)}%`}
                                </span>
                            </div>
                            <div>
                                <p className="text-[7.5px] md:text-[8px] font-extrabold text-emerald-100/80 uppercase tracking-widest leading-none">
                                    {workMode === 'Field' ? "Tasks Progress" : "Time Logged"}
                                </p>
                                <h3 className="text-base md:text-lg font-playfair font-bold tracking-tight text-white mt-1">
                                    {workMode === 'Field' 
                                        ? `${completedTasksCount}/${totalTasksCount} Tasks` 
                                        : isOfficeHoursComplete ? 'Goal Met' : `${formatDuration(totalWorkedMs)}`}
                                </h3>
                            </div>
                        </div>

                        {/* Card 3: Action Desk */}
                        {(() => {
                            const isAfter7PM = currentTime.getHours() >= 19;
                            let card3Action = undefined;
                            let card3Title = "Quick Action";
                            let card3Value = "Check In Now";
                            let card3Icon = <Zap size={15} />;

                            if (isHolidayToday) {
                                card3Title = "System Status";
                                card3Value = todayHoliday?.name || "Holiday";
                                card3Icon = <Calendar size={15} />;
                            } else if (isLocked) {
                                card3Title = "System Status";
                                const formattedOutTime = todayRecord?.checkOutTime ? formatTime12h(todayRecord.checkOutTime) : '7PM';
                                card3Value = `Closed (${formattedOutTime})`;
                                card3Icon = <Lock size={15} />;
                            } else {
                                card3Action = handleCheckInOut;
                                card3Title = "Quick Action";
                                card3Value = isCheckedIn ? "Finish Shift" : (accumulatedMs > 0 ? "Resume Shift" : "Check In Now");
                                card3Icon = isCheckedIn ? <CheckCircle size={15} /> : <Clock size={15} />;
                            }

                            return (
                                <button
                                    onClick={card3Action}
                                    disabled={!card3Action}
                                    className={`m-0 md:m-3 lg:m-4 p-3 md:p-4 rounded-[20px] md:rounded-[28px] flex items-center justify-between transition-all duration-300 min-h-[90px] md:min-h-[120px] text-left relative overflow-hidden outline-none ${
                                        !card3Action 
                                            ? 'bg-slate-100 border border-slate-200 cursor-default opacity-90' 
                                            : isCheckedIn 
                                                ? 'bg-emerald-50 border border-emerald-200 group hover:bg-emerald-100 cursor-pointer shadow-sm' 
                                                : 'bg-amber-50 border border-amber-200 group hover:bg-amber-100 cursor-pointer shadow-sm'
                                    }`}
                                >
                                    <div className="flex flex-col justify-between h-full w-full">
                                        <div className="flex justify-between items-start mb-2 w-full">
                                            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-transform ${
                                                !card3Action ? 'bg-slate-200 text-slate-500' : isCheckedIn ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-200 text-amber-700'
                                            }`}>
                                                {card3Icon}
                                            </div>
                                            
                                            {/* Toggle Switch Visual */}
                                            <div className={`relative w-12 h-6 md:w-14 md:h-7 rounded-full transition-colors duration-300 flex items-center px-1 shadow-inner ${
                                                !card3Action ? 'bg-slate-300' : isCheckedIn ? 'bg-emerald-500' : 'bg-slate-300'
                                            }`}>
                                                <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                    isCheckedIn ? 'translate-x-6 md:translate-x-7' : 'translate-x-0'
                                                }`} />
                                            </div>
                                        </div>
                                        <div>
                                            <p className={`text-[7.5px] md:text-[8px] font-extrabold uppercase tracking-widest leading-none ${
                                                !card3Action ? 'text-slate-400' : isCheckedIn ? 'text-emerald-600/80' : 'text-amber-600/80'
                                            }`}>{card3Title}</p>
                                            <h3 className={`text-base md:text-lg font-bold tracking-tight mt-1 ${
                                                !card3Action ? 'text-slate-600' : isCheckedIn ? 'text-emerald-900' : 'text-amber-900'
                                            }`}>{card3Value}</h3>
                                        </div>
                                    </div>
                                </button>
                            );
                        })()}
                    </div>
                </div>


                {/* Apply Leave - All Users */}
                <div className="px-2 md:px-0 mb-2">
                    <button 
                        onClick={() => setShowApplyLeaveModal(true)}
                        className="p-2 px-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-sm"
                    >
                        <Calendar size={14} /> Apply Leave
                    </button>
                </div>

                {/* Bottom Section: Staff Registry (Attendance Sheet) - Full Width */}
                {isAdmin && (
                <div className="w-full bg-white rounded-[2rem] md:rounded-3xl shadow-sm border border-slate-300 flex flex-col overflow-hidden min-h-[400px]">
                    <div className="p-2 md:p-3 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/25">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            <h3 className="font-black text-[11px] md:text-[13px] text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" /> Registry
                            </h3>
                            <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1"></div>
                            {isAdmin && (
                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                    <button 
                                        onClick={() => setShowHolidayModal(true)}
                                        className="p-1 px-3 bg-white text-indigo-600 rounded-lg border border-slate-200 hover:bg-indigo-50 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-sm"
                                        title="Manage Holidays"
                                    >
                                        <Calendar size={13} /> Holidays
                                    </button>
                                    <button 
                                        onClick={handleExportMonthlyReport}
                                        className="p-1 px-2.5 bg-white text-emerald-600 rounded-lg border border-slate-200 hover:bg-emerald-50 transition-all flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm"
                                        title="Export Monthly Report"
                                    >
                                        <Download size={12} /> Export
                                    </button>
                                    <button 
                                        onClick={() => setShowManageLeavesModal(true)}
                                        className="p-1 px-2.5 bg-indigo-600 text-white rounded-lg border border-indigo-500 hover:bg-indigo-700 transition-all flex items-center gap-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm relative"
                                    >
                                        <FileText size={12} /> Requests
                                        {leaveRequests.filter(r => r.status === 'Pending').length > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white rounded-full"></span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto custom-scrollbar-hide max-w-[200px] sm:max-w-none">
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
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px] text-slate-600">
                            <thead className="bg-[#fcfdfd] border-b border-slate-200 sticky top-0 z-10 text-[6.5px] md:text-[7.5px] uppercase font-black tracking-widest text-slate-400">
                                <tr>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2">Staff Member</th>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2">Dept</th>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2">Time</th>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2 hidden md:table-cell">In</th>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2 hidden md:table-cell">Out</th>
                                    <th className="px-2 md:px-4 py-1.5 md:py-2 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {employees.filter(e => filterStatus === 'All' || e.department === filterStatus).map((emp) => {
                                    const rec = attendanceRecords.find(r => r.userId === emp.id && r.date === todayStr);
                                    return (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group cursor-default border-b border-slate-50 last:border-b-0">
                                            <td className="px-2 md:px-4 py-1.5 md:py-2">
                                                <div className="flex items-center gap-1.5 md:gap-2.5">
                                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[8px] md:text-[9.5px] text-slate-400 border border-slate-200 shrink-0">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                        <div className="font-black text-slate-800 text-[9.5px] md:text-[10.5px] leading-none truncate">{emp.name}</div>
                                                        <div className="text-[6.5px] md:text-[7.5px] text-slate-400 font-bold uppercase mt-0.5 truncate">{emp.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-1.5 md:py-2">
                                                <span className="text-[7.5px] md:text-[8.5px] font-black text-indigo-500 uppercase tracking-widest">
                                                    {emp.department.slice(0, 3)}
                                                </span>
                                            </td>
                                            <td className="px-2 md:px-4 py-1.5 md:py-2">
                                                <div className="flex items-center gap-1 text-slate-800 font-black text-[8.5px] md:text-[9.5px]">
                                                    {getEmpAttendanceDisplay(emp)}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 py-1.5 md:py-2 hidden md:table-cell">
                                                <span className="text-[8.5px] md:text-[9.5px] font-bold text-slate-500">
                                                    {formatTime(rec?.checkInTime)}
                                                </span>
                                            </td>
                                            <td className="px-2 md:px-4 py-1.5 md:py-2 hidden md:table-cell">
                                                <span className="text-[8.5px] md:text-[9.5px] font-bold text-slate-500">
                                                    {formatTime(rec?.checkOutTime)}
                                                </span>
                                            </td>
                                            <td className="px-2 md:px-4 py-1.5 md:py-2 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-1.5">
                                                    <span className={`px-1 py-0.5 rounded-md text-[6.5px] md:text-[7.5px] font-black uppercase border tracking-wider ${getStatusBadge(emp.status, emp.id)}`}>
                                                        {(() => {
                                                if (rec) {
                                                    if (rec.status === 'OnLeave') return 'Leave';
                                                    if (rec.workMode === 'Outstation') return 'Outstation';
                                                    if (rec.status === 'Completed' || rec.status === 'CheckedIn') return 'Present';
                                                }
                                                if (isHolidayToday) return 'Holiday';
                                                if (new Date().getDay() === 0) return 'Sunday';
                                                return 'Absent';
                                            })()}
                                                    </span>
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setCalendarSelectedUser(emp);
                                                                setCalendarViewDate(new Date());
                                                                setShowCalendarModal(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="View Employee Calendar"
                                                        >
                                                            <Calendar size={13} />
                                                        </button>
                                                    )}
                                                    {isAdmin && rec && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingAttendanceRecord(rec);
                                                                setEditCheckIn(rec.checkInTime ? rec.checkInTime.slice(0, 16) : '');
                                                                setEditCheckOut(rec.checkOutTime ? rec.checkOutTime.slice(0, 16) : '');
                                                                setEditStatus(rec.status);
                                                                setEditWorkMode(rec.workMode || 'Office');
                                                                setEditLeaveReason(rec.leaveReason || '');
                                                                setShowEditAttendanceModal(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExportIndividualReport(emp);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-700 scale-95 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Download Individual Report"
                                                        >
                                                            <Download size={13} />
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
                                                                    status: 'CheckedIn',
                                                                    checkInTime: new Date().toISOString(),
                                                                    checkOutTime: null,
                                                                    totalWorkedMs: 0,
                                                                    lastSessionStartTime: new Date().toISOString(),
                                                                    workMode: 'Office'
                                                                };
                                                                setEditingAttendanceRecord(newRec);
                                                                setEditCheckIn(newRec.checkInTime ? newRec.checkInTime.slice(0, 16) : '');
                                                                setEditCheckOut('');
                                                                setEditStatus('CheckedIn');
                                                                setEditWorkMode('Office');
                                                                setEditLeaveReason('');
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
                )}
            </div>
            {showEditAttendanceModal && editingAttendanceRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="font-playfair font-bold text-xl tracking-tight tracking-tight text-slate-800 uppercase tracking-tight">Correct Attendance</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingAttendanceRecord.userName}</p>
                            </div>
                            <button onClick={() => setShowEditAttendanceModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="flex bg-slate-100 p-1 rounded-[2rem] mb-4">
                                {['CheckedIn', 'Completed', 'OnLeave'].map((s) => (
                                    <button 
                                        key={s}
                                        onClick={() => setEditStatus(s as any)}
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-[2rem] transition-all ${editStatus === s ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        {s === 'OnLeave' ? 'On Leave' : s}
                                    </button>
                                ))}
                            </div>

                            {editStatus !== 'OnLeave' ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Check-In</label>
                                        <input 
                                            type="datetime-local" 
                                            className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-500" 
                                            value={editCheckIn} 
                                            onChange={e => setEditCheckIn(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Check-Out</label>
                                        <input 
                                            type="datetime-local" 
                                            className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-500" 
                                            value={editCheckOut} 
                                            onChange={e => setEditCheckOut(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Mode</label>
                                        <select className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-500 cursor-pointer appearance-none" 
                                            value={editWorkMode} 
                                            onChange={e => setEditWorkMode(e.target.value as any)}
                                        >
                                            <option value="Office">Office</option>
                                            <option value="Field">Field</option>
                                            <option value="Remote">Remote</option>
                                            <option value="Outstation">Outstation</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1 animate-in slide-in-from-top-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave Reason</label>
                                    <textarea 
                                        className="w-full border border-rose-200 bg-rose-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none min-h-[80px] text-rose-800 placeholder:text-rose-300" 
                                        placeholder="e.g. Sick Leave, Personal Work, Maternity..." 
                                        value={editLeaveReason} 
                                        onChange={e => setEditLeaveReason(e.target.value)}
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjustment Note (Audit)</label>
                                <textarea 
                                    className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none min-h-[60px]" 
                                    placeholder="Explanation for this manual change..." 
                                    value={editReason} 
                                    onChange={e => setEditReason(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 flex flex-wrap gap-3 bg-slate-50/30">
                            <button onClick={handleResetAttendance} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2">
                                <Trash2 size={14} /> Clear Record
                            </button>
                            <div className="flex-1 flex gap-3">
                                <button onClick={() => setShowEditAttendanceModal(false)} className="flex-1 bg-white border border-slate-300 py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                                <button 
                                    onClick={handleAdminOverwriteAttendance} 
                                    disabled={!editReason}
                                    className="flex-[2] bg-indigo-600 text-white py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Apply Correction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal */}
            {showApplyLeaveModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="font-playfair font-bold text-xl tracking-tight tracking-tight text-slate-800 uppercase tracking-tight">Apply for Leave</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formal Request Submission</p>
                            </div>
                            <button onClick={() => setShowApplyLeaveModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none focus:border-rose-500 transition-all" 
                                        value={leaveForm.startDate} 
                                        onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none focus:border-rose-500 transition-all" 
                                        value={leaveForm.endDate} 
                                        onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Leave <span className="text-rose-500">*</span></label>
                                <textarea 
                                    className="w-full border border-slate-300 bg-slate-50 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none min-h-[120px] focus:border-rose-500 transition-all" 
                                    placeholder="Please provide a detailed reason for your leave request..." 
                                    value={leaveForm.reason} 
                                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                />
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Note: Only admins can view your reason.</p>
                            </div>

                            <div className="bg-amber-50 rounded-[2rem] p-4 border border-amber-100 flex gap-4">
                                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                                <p className="text-[10px] text-amber-800 font-bold uppercase leading-relaxed">
                                    Once approved, your attendance for these dates will be automatically marked as 'On Leave'.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 flex gap-3 bg-slate-50/30">
                            <button onClick={() => setShowApplyLeaveModal(false)} className="flex-1 bg-white border border-slate-300 py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50">Cancel</button>
                            <button 
                                onClick={handleApplyLeave}
                                disabled={!leaveForm.reason.trim()}
                                className="flex-[2] bg-rose-600 text-white py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:bg-rose-700 disabled:opacity-50 transition-all"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Leaves Modal (Admin/User specific visibility handled inside) */}
            {showManageLeavesModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-300 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="font-playfair font-bold text-xl tracking-tight tracking-tight text-slate-800 uppercase tracking-tight">{isAdmin ? 'Personnel Leave Registry' : 'My Leave Requests'}</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAdmin ? 'Review and manage organization-wide requests' : 'Track your applied leaves'}</p>
                            </div>
                            <button onClick={() => setShowManageLeavesModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto p-6 custom-scrollbar">
                            <div className="space-y-3">
                                {leaveRequests
                                    .filter(r => isAdmin || r.userId === me?.id)
                                    .map(req => (
                                    <div key={req.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-[2rem] bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-indigo-500 shadow-sm">
                                                    {req.userName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-xs uppercase">{req.userName}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{req.id}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-[2rem] text-[9px] font-black uppercase tracking-widest border ${
                                                req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="p-3 bg-white rounded-[2rem] border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Duration</p>
                                                <p className="text-[10px] font-bold text-slate-700">{req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`}</p>
                                            </div>
                                            <div className="p-3 bg-white rounded-[2rem] border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Applied On</p>
                                                <p className="text-[10px] font-bold text-slate-700">{new Date(req.appliedOn).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white rounded-[2rem] border border-slate-100 mb-4">
                                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Reason</p>
                                            <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">"{req.reason}"</p>
                                        </div>

                                        {isAdmin && req.status === 'Pending' && (
                                            <div className="flex gap-3 pt-2">
                                                <button 
                                                    onClick={() => updateLeaveRequest(req.id, { status: 'Rejected' })}
                                                    className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 rounded-[2rem] text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => updateLeaveRequest(req.id, { status: 'Approved' })}
                                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-[2rem] text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                                                >
                                                    Approve Leave
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {leaveRequests.length === 0 && (
                                    <div className="text-center py-20">
                                        <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No leave requests found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Attendance Calendar Modal */}
            {showCalendarModal && calendarSelectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 md:p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
                        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg md:text-xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight leading-none">
                                    Attendance Calendar: {calendarSelectedUser.name}
                                </h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                                    {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })} • {calendarSelectedUser.department}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        const d = new Date(calendarViewDate);
                                        d.setMonth(d.getMonth() - 1);
                                        setCalendarViewDate(d);
                                    }}
                                    className="p-2 hover:bg-white rounded-[2rem] border border-slate-200 text-slate-400 hover:text-slate-800 transition-all"
                                >
                                    <ChevronRight size={18} className="rotate-180" />
                                </button>
                                <button 
                                    onClick={() => setCalendarViewDate(new Date())}
                                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 rounded-[2rem] hover:bg-slate-50 transition-all"
                                >
                                    Today
                                </button>
                                <button 
                                    onClick={() => {
                                        const d = new Date(calendarViewDate);
                                        d.setMonth(d.getMonth() + 1);
                                        setCalendarViewDate(d);
                                    }}
                                    className="p-2 hover:bg-white rounded-[2rem] border border-slate-200 text-slate-400 hover:text-slate-800 transition-all"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                                <button onClick={() => setShowCalendarModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                            {/* Calendar Grid Header */}
                            <div className="grid grid-cols-7 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] py-2">{day}</div>
                                ))}
                            </div>

                            {/* Calendar Grid Body */}
                            <div className="grid grid-cols-7 gap-2 md:gap-4">
                                {(() => {
                                    const year = calendarViewDate.getFullYear();
                                    const month = calendarViewDate.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const today = new Date();
                                    const todayDateStr = today.toISOString().split('T')[0];

                                    const cells = [];
                                    
                                    // Padding for previous month
                                    for (let i = 0; i < firstDay; i++) {
                                        cells.push(<div key={`pad-${i}`} className="aspect-square"></div>);
                                    }

                                    // Actual Days
                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const date = new Date(year, month, d);
                                        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const record = attendanceRecords.find(r => r.userId === calendarSelectedUser.id && r.date === ds);
                                        const isHoliday = holidays.find(h => h.date === ds);
                                        const isFuture = date > today;
                                        const isSunday = date.getDay() === 0;

                                        let bgColor = 'bg-slate-50';
                                        let textColor = 'text-slate-400';
                                        let borderColor = 'border-slate-100';
                                        let statusText = '';
                                        let reasonText = '';

                                        if (isFuture) {
                                            bgColor = 'bg-slate-50/50';
                                            textColor = 'text-slate-300';
                                        } else if (record) {
                                            if (record.status === 'OnLeave') {
                                                bgColor = 'bg-rose-50';
                                                textColor = 'text-rose-700';
                                                borderColor = 'border-rose-100';
                                                statusText = 'Leave';
                                                reasonText = record.leaveReason || 'On Approved Leave';
                                            } else if (record.workMode === 'Outstation') {
                                                bgColor = 'bg-purple-50';
                                                textColor = 'text-purple-700';
                                                borderColor = 'border-purple-100';
                                                statusText = 'Outstation';
                                                reasonText = 'Outstation Duty';
                                            } else if (record.status === 'Completed' || record.status === 'CheckedIn') {
                                                bgColor = 'bg-emerald-50';
                                                textColor = 'text-emerald-700';
                                                borderColor = 'border-emerald-100';
                                                statusText = 'Present';
                                                reasonText = formatDuration(record.totalWorkedMs);
                                            }
                                        } else if (isHoliday) {
                                            bgColor = 'bg-amber-50';
                                            textColor = 'text-amber-600';
                                            borderColor = 'border-amber-100';
                                            statusText = 'Holiday';
                                            reasonText = isHoliday.name;
                                        } else if (isSunday) {
                                            bgColor = 'bg-slate-100';
                                            textColor = 'text-slate-500';
                                            statusText = 'Sunday';
                                        } else {
                                            // Absent
                                            bgColor = 'bg-rose-100/50';
                                            textColor = 'text-rose-800';
                                            borderColor = 'border-rose-200';
                                            statusText = 'Absent';
                                        }

                                        cells.push(
                                            <div 
                                                key={ds}
                                                onClick={() => {
                                                    if (isAdmin && !isFuture) {
                                                        setCalendarSelectedUser(calendarSelectedUser);
                                                        setQuickSelectedDate(ds);
                                                        setQuickReason(record?.leaveReason || '');
                                                        if (record) {
                                                            if (record.status === 'OnLeave') setQuickStatus('Leave');
                                                            else if (record.workMode === 'Outstation') setQuickStatus('Outstation');
                                                            else setQuickStatus('Present');
                                                        } else {
                                                            setQuickStatus('Absent');
                                                        }
                                                        
                                                        setShowQuickAttendanceModal(true);
                                                    }
                                                }}
                                                className={`aspect-square p-2 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border-2 flex flex-col justify-between transition-all group ${borderColor} ${bgColor} ${isAdmin && !isFuture ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}`}
                                            >
                                                <div className="flex justify-between items-start">
 <span className={`text-xs md:text-lg font-bold tracking-tight ${ds === todayDateStr ? 'text-indigo-600 scale-125' : textColor}`}>{d}</span>
                                                    {ds === todayDateStr && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    {statusText && (
                                                        <span className={`text-[6px] md:text-[8px] font-black uppercase tracking-widest ${textColor}`}>{statusText}</span>
                                                    )}
                                                    {reasonText && (
                                                        <span className="text-[5px] md:text-[7px] font-bold text-slate-400 line-clamp-1">{reasonText}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return cells;
                                })()}
                            </div>

                            {/* Legend */}
                            <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100"></div>
                                    <span className="text-[8px] font-black uppercase text-slate-400">Present</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-50 border border-rose-100"></div>
                                    <span className="text-[8px] font-black uppercase text-slate-400">On Leave</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></div>
                                    <span className="text-[8px] font-black uppercase text-slate-400">Absent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-50 border border-amber-100"></div>
                                    <span className="text-[8px] font-black uppercase text-slate-400">Holiday</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex-1 text-right italic text-[8px] font-bold text-indigo-400 uppercase tracking-widest">
                                        Tip: Click any past cell to overwrite record
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Quick Attendance Modal */}
            {showQuickAttendanceModal && calendarSelectedUser && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Quick Update</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{calendarSelectedUser.name} • {quickSelectedDate}</p>
                            </div>
                            <button onClick={() => setShowQuickAttendanceModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'Present', icon: CheckCircle, color: 'emerald' },
                                    { id: 'Absent', icon: X, color: 'rose' },
                                    { id: 'Leave', icon: Calendar, color: 'indigo' },
                                    { id: 'Outstation', icon: Timer, color: 'purple' }
                                ].map((opt) => {
                                    const Icon = opt.icon;
                                    const isActive = quickStatus === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => setQuickStatus(opt.id as any)}
                                            className={`flex flex-col items-center gap-2 p-2 rounded-[2rem] border-2 transition-all ${
                                                isActive 
                                                    ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-600 scale-105 shadow-lg shadow-${opt.color}-500/10` 
                                                    : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                        >
                                            <Icon size={18} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">{opt.id}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {quickStatus === 'Leave' && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Leave Reason</label>
                                    <textarea
                                        value={quickReason}
                                        onChange={(e) => setQuickReason(e.target.value)}
                                        className="w-full bg-indigo-50 border border-indigo-100 rounded-[2rem] p-3 text-xs font-bold text-indigo-900 outline-none focus:border-indigo-400 min-h-[80px]"
                                        placeholder="e.g. Personal Work..."
                                    />
                                </div>
                            )}

                            <button
                                onClick={async () => {
                                    const recordId = `${calendarSelectedUser.id}_${quickSelectedDate}`;
                                    if (quickStatus === 'Absent') {
                                        await removeAttendance(recordId);
                                        addLog('Attendance', 'Quick Update', `Marked ${calendarSelectedUser.name} as Absent on ${quickSelectedDate}`);
                                    } else {
                                        const updates: any = {
                                            id: recordId,
                                            userId: calendarSelectedUser.id,
                                            userName: calendarSelectedUser.name,
                                            date: quickSelectedDate,
                                            status: quickStatus === 'Leave' ? 'OnLeave' : 'Completed',
                                            totalWorkedMs: (quickStatus === 'Present' || quickStatus === 'Outstation') ? (8 * 3600000) : 0,
                                            checkInTime: (quickStatus === 'Present' || quickStatus === 'Outstation') ? `${quickSelectedDate}T09:15:00Z` : null,
                                            checkOutTime: (quickStatus === 'Present' || quickStatus === 'Outstation') ? `${quickSelectedDate}T17:15:00Z` : null,
                                            leaveReason: quickStatus === 'Leave' ? quickReason : '',
                                            workMode: quickStatus === 'Outstation' ? 'Outstation' : 'Office'
                                        };
                                        await updateAttendance(updates);
                                        addLog('Attendance', 'Quick Update', `Marked ${calendarSelectedUser.name} as ${quickStatus} on ${quickSelectedDate}`);
                                    }
                                    addNotification('Attendance Updated', `Record for ${calendarSelectedUser.name} on ${quickSelectedDate} saved.`, 'success');
                                    setShowQuickAttendanceModal(false);
                                }}
                                className="w-full bg-slate-900 text-white py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showEodModal && (
                <EodSubmissionModal onClose={() => setShowEodModal(false)} />
            )}
        </div>
    );
};

