import React, { useState, useMemo } from 'react';
import { Download, Timer, CreditCard, ShieldCheck, User, Users, TrendingUp, Landmark } from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PayrollModule: React.FC = () => {
    const { 
        currentUser: me, 
        addNotification, 
        attendanceRecords, 
        holidays, 
        expenses = [], 
        employees = [], 
        pointHistory = [] 
    } = useData();

    const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(new Date().getMonth());
    const [selectedSalaryYear, setSelectedSalaryYear] = useState(new Date().getFullYear());
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    const isAdmin = me?.role === 'SYSTEM_ADMIN' || me?.email === 'sreekumar.career@gmail.com';
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(me?.id || '');

    // Resolve the active target employee for payroll calculations
    const targetEmployee = useMemo(() => {
        if (!isAdmin) return me;
        return employees.find(e => e.id === selectedEmployeeId) || me;
    }, [isAdmin, employees, selectedEmployeeId, me]);

    // Format Helpers
    const monthName = new Date(selectedSalaryYear, selectedSalaryMonth).toLocaleString('en-US', { month: 'long' });
    const yearMonthStr = `${selectedSalaryYear}-${String(selectedSalaryMonth + 1).padStart(2, '0')}`;

    // Perform live calculations for UI summary preview
    const salaryDetails = useMemo(() => {
        if (!targetEmployee) return null;

        const daysInMonth = new Date(selectedSalaryYear, selectedSalaryMonth + 1, 0).getDate();
        let presentDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let holidayCredits = 0;
        let outstationDays = 0;
        let eligiblePresentDays = 0;

        const employeeRecords = attendanceRecords.filter(r => r.userId === targetEmployee.id && r.date.startsWith(yearMonthStr));

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${yearMonthStr}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(selectedSalaryYear, selectedSalaryMonth, i);
            const isSunday = dateObj.getDay() === 0;
            const isHoliday = holidays.some(h => h.date === dateStr);
            const record = employeeRecords.find(r => r.date === dateStr);

            if (record) {
                if (record.status === 'OnLeave') {
                    leaveDays++;
                    absentDays++;
                } else if (record.workMode === 'Outstation') {
                    outstationDays++;
                } else {
                    presentDays++;
                    if (!isSunday) {
                        eligiblePresentDays++;
                    }
                }
            } else {
                if (isSunday || isHoliday) {
                    holidayCredits++;
                } else {
                    const today = new Date();
                    const checkDate = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                    if (checkDate <= today) {
                        absentDays++;
                    }
                }
            }
        }

        const baseSalary = targetEmployee.baseSalary || 25000;
        const dailyRate = baseSalary / daysInMonth;
        const absenceDeduction = Math.floor(absentDays * dailyRate);
        const grossSalary = baseSalary - absenceDeduction;

        const dailyAllowanceRate = targetEmployee.dailyAllowance || 0;
        const outstationAllowanceRate = targetEmployee.outstationAllowance || 0;
        const totalDailyAllowance = eligiblePresentDays * dailyAllowanceRate;
        const totalOutstationAllowance = outstationDays * outstationAllowanceRate;

        const basic = grossSalary;
        const hra = 0;
        const conv = 0;
        const other = 0;

        const pf = 0;
        const pt = 0;

        // Fetch salary advances from expenses
        const salaryAdvance = expenses
            .filter(e => e.employeeName === targetEmployee.name && e.category === 'Salary Advance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

        // Fetch sales incentives from Point History
        const salesIncentive = pointHistory
            .filter(p => p.userId === targetEmployee.id && p.category === 'Sales' && p.date.startsWith(yearMonthStr))
            .reduce((acc, curr) => acc + (curr.points || 0), 0);

        const totalEarnings = grossSalary + salesIncentive + totalDailyAllowance + totalOutstationAllowance;
        const totalDeductions = salaryAdvance;
        const netPay = totalEarnings - totalDeductions;

        return {
            daysInMonth,
            presentDays,
            absentDays,
            leaveDays,
            outstationDays,
            baseSalary,
            absenceDeduction,
            grossSalary,
            dailyAllowanceRate,
            outstationAllowanceRate,
            totalDailyAllowance,
            totalOutstationAllowance,
            basic,
            hra,
            conv,
            other,
            pf,
            pt,
            salaryAdvance,
            salesIncentive,
            totalEarnings,
            totalDeductions,
            netPay
        };
    }, [targetEmployee, selectedSalaryMonth, selectedSalaryYear, attendanceRecords, holidays, expenses, pointHistory, yearMonthStr]);

    const allEmployeesSalarySummary = useMemo(() => {
        if (!isAdmin) return [];
        return employees.map(emp => {
            const daysInMonth = new Date(selectedSalaryYear, selectedSalaryMonth + 1, 0).getDate();
            let presentDays = 0;
            let absentDays = 0;
            let leaveDays = 0;
            let holidayCredits = 0;
            let outstationDays = 0;
            let eligiblePresentDays = 0;

            const employeeRecords = attendanceRecords.filter(r => r.userId === emp.id && r.date.startsWith(yearMonthStr));

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${yearMonthStr}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                const isSunday = dateObj.getDay() === 0;
                const isHoliday = holidays.some(h => h.date === dateStr);
                const record = employeeRecords.find(r => r.date === dateStr);

                if (record) {
                    if (record.status === 'OnLeave') {
                        leaveDays++;
                        absentDays++;
                    } else if (record.workMode === 'Outstation') {
                        outstationDays++;
                    } else {
                        presentDays++;
                        if (!isSunday) {
                            eligiblePresentDays++;
                        }
                    }
                } else {
                    if (isSunday || isHoliday) {
                        holidayCredits++;
                    } else {
                        const today = new Date();
                        const checkDate = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                        if (checkDate <= today) {
                            absentDays++;
                        }
                    }
                }
            }

            const baseSalary = emp.baseSalary || 25000;
            const dailyRate = baseSalary / daysInMonth;
            const absenceDeduction = Math.floor(absentDays * dailyRate);
            const grossSalary = baseSalary - absenceDeduction;

            const dailyAllowanceRate = emp.dailyAllowance || 0;
            const outstationAllowanceRate = emp.outstationAllowance || 0;
            const totalDailyAllowance = eligiblePresentDays * dailyAllowanceRate;
            const totalOutstationAllowance = outstationDays * outstationAllowanceRate;

            const basic = grossSalary;
            const pf = 0;
            const pt = 0;

            const salaryAdvance = expenses
                .filter(e => e.employeeName === emp.name && e.category === 'Salary Advance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            const salesIncentive = pointHistory
                .filter(p => p.userId === emp.id && p.category === 'Sales' && p.date.startsWith(yearMonthStr))
                .reduce((acc, curr) => acc + (curr.points || 0), 0);

            const totalEarnings = grossSalary + salesIncentive + totalDailyAllowance + totalOutstationAllowance;
            const totalDeductions = salaryAdvance;
            const netPay = totalEarnings - totalDeductions;

            return {
                id: emp.id,
                name: emp.name,
                department: emp.department,
                role: emp.role,
                presentDays,
                absentDays,
                outstationDays,
                baseSalary,
                salesIncentive,
                tillDaySalary: grossSalary,
                totalDailyAllowance,
                totalOutstationAllowance,
                netPay
            };
        });
    }, [isAdmin, employees, selectedSalaryMonth, selectedSalaryYear, attendanceRecords, holidays, expenses, pointHistory, yearMonthStr]);

    const handleDownloadSalarySlip = () => {
        if (!targetEmployee || !salaryDetails) return;
        setIsGeneratingSlip(true);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const docTitle = `SALARY SLIP - ${monthName.toUpperCase()} ${selectedSalaryYear}`;

            // Header Banner
            doc.setFillColor(16, 185, 129); // Emerald-600
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text("Sree Meditec Enterprise", 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Kochi, Kerala | Contact: +91 98848 18398", 14, 28);
            doc.text("GSTIN: 32XXXXX1234X1Z1", 14, 33);

            // Title
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(docTitle, 105, 55, { align: 'center' });

            // Employee Information Table
            const empInfo = [
                ['Employee Name', targetEmployee.name, 'Employee ID', targetEmployee.id || 'EMP-001'],
                ['Department', targetEmployee.department, 'Designation', targetEmployee.role === 'SYSTEM_ADMIN' ? 'Administrator' : 'Sales Representative'],
                ['Month/Year', `${monthName} ${selectedSalaryYear}`, 'Bank Name', 'HDFC Bank'],
                ['Working Days', salaryDetails.daysInMonth.toString(), 'Absent Days', salaryDetails.absentDays.toString()],
            ];
            if (salaryDetails.outstationDays > 0) {
                empInfo.push(['Outstation Days', salaryDetails.outstationDays.toString(), '', '']);
            }

            autoTable(doc, {
                startY: 65,
                body: empInfo,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [100, 116, 139] },
                    2: { fontStyle: 'bold', textColor: [100, 116, 139] }
                }
            });

             // Earnings & Deductions Table
            const financeData = [
                ['Basic Salary', salaryDetails.basic.toLocaleString('en-IN'), 'Salary Advance', salaryDetails.salaryAdvance.toLocaleString('en-IN')],
                ['Sales Incentive', salaryDetails.salesIncentive.toLocaleString('en-IN'), '', ''],
                ['Daily Allowance', salaryDetails.totalDailyAllowance.toLocaleString('en-IN'), '', ''],
                ['Outstation Allowance', salaryDetails.totalOutstationAllowance.toLocaleString('en-IN'), '', ''],
                [
                    { content: 'Total Earnings', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, 
                    { content: `₹${salaryDetails.totalEarnings.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, 
                    { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, 
                    { content: `₹${salaryDetails.totalDeductions.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
                ]
            ];

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 8,
                head: [['EARNINGS', 'AMOUNT (INR)', 'DEDUCTIONS', 'AMOUNT (INR)']],
                body: financeData as any,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
                styles: { fontSize: 9 }
            });

            // Net Pay Container
            const finalY = (doc as any).lastAutoTable.finalY + 12;
            doc.setFillColor(240, 253, 244); // Emerald-50
            doc.rect(14, finalY, 182, 18, 'F');
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.5);
            doc.rect(14, finalY, 182, 18);

            doc.setTextColor(16, 185, 129);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text(`NET PAYABLE:  INR ${salaryDetails.netPay.toLocaleString('en-IN')}/-`, 105, finalY + 11, { align: 'center' });

            // Footer disclaimer
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.text("This is a computer-generated document and does not require a physical signature.", 105, 280, { align: 'center' });

            doc.save(`Salary_Slip_${targetEmployee.name.replace(/\s+/g, '_')}_${monthName}_${selectedSalaryYear}.pdf`);
            addNotification('Salary Slip Generated', `Successfully generated slip for ${targetEmployee.name} (${monthName} ${selectedSalaryYear}).`, 'success');
        } catch (err) {
            console.error(err);
            addNotification('Download Failed', 'Could not generate salary slip.', 'alert');
        } finally {
            setIsGeneratingSlip(false);
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col gap-6 md:gap-8 items-center relative py-6 px-2">
            <div className="w-full max-w-4xl space-y-4">
                {/* Hero / Selection Panel */}
                <div className="bg-gradient-to-br from-emerald-950 to-green-900 rounded-[2rem] p-6 md:p-10 text-white shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none">
                        <CreditCard size={320} />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="max-w-md text-center md:text-left">
                            <div className="w-12 h-12 bg-emerald-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-300 rounded-[2rem] flex items-center justify-center mb-4 backdrop-blur-md mx-auto md:mx-0">
                                <ShieldCheck size={24} />
                            </div>
                            <h1 className="text-xl md:text-3xl font-playfair font-bold tracking-tight uppercase tracking-tighter mb-2">Payroll Portal</h1>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">
                                Review monthly attendance records, sales commissions, and generate official slip drafts for Sree Meditec team members.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-5 w-full md:w-80 shadow-2xl flex flex-col gap-4">
                            {isAdmin && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-emerald-100/60 flex items-center gap-1"><Users size={10}/> Choose Employee</label>
                                    <select 
                                        value={selectedEmployeeId}
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/20 rounded-[2rem] px-3 py-1.5.5 text-xs font-bold outline-none text-white focus:bg-slate-900 transition-all cursor-pointer"
                                    >
                                        <option value="" className="text-slate-900">-- Select --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id} className="text-slate-900">{emp.name} ({emp.department})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-emerald-100/60">Month</label>
                                    <select 
                                        value={selectedSalaryMonth}
                                        onChange={(e) => setSelectedSalaryMonth(parseInt(e.target.value))}
                                        className="w-full bg-slate-900/50 border border-white/20 rounded-[2rem] px-3 py-2 text-xs font-black uppercase outline-none focus:bg-slate-900 transition-all cursor-pointer"
                                    >
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                            <option key={m} value={i} className="text-slate-900">{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-emerald-100/60">Year</label>
                                    <select 
                                        value={selectedSalaryYear}
                                        onChange={(e) => setSelectedSalaryYear(parseInt(e.target.value))}
                                        className="w-full bg-slate-900/50 border border-white/20 rounded-[2rem] px-3 py-2 text-xs font-black uppercase outline-none focus:bg-slate-900 transition-all cursor-pointer"
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y} className="text-slate-900">{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleDownloadSalarySlip}
                                disabled={isGeneratingSlip || !targetEmployee}
                                className="w-full py-3 bg-white text-emerald-700 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-3 transform active:scale-95 disabled:opacity-40"
                            >
                                {isGeneratingSlip ? <Timer size={14} className="animate-spin" /> : <Download size={14} />}
                                Download PDF Slip
                            </button>
                        </div>
                    </div>
                </div>

                {/* Admin Overview Panel */}
                {isAdmin && allEmployeesSalarySummary.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={16} className="text-emerald-500" />
                                    All Employees Payroll Summary
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                                    Overview of incentives and attendance-based salary for {monthName} {selectedSalaryYear}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-4">Employee</th>
                                        <th className="py-3 px-4">Attendance</th>
                                        <th className="py-3 px-4 text-right">Base Salary</th>
                                        <th className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400">Till-Day Salary</th>
                                        <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">Sales Incentives</th>
                                        <th className="py-3 px-4 text-right">Net Payable</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {allEmployeesSalarySummary.map((row) => (
                                        <tr 
                                            key={row.id} 
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-xs cursor-pointer ${selectedEmployeeId === row.id ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}
                                            onClick={() => setSelectedEmployeeId(row.id)}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{row.name}</div>
                                                <div className="text-[9px] text-slate-400 font-semibold uppercase">{row.department} · {row.role}</div>
                                            </td>
                                            <td className="py-3 px-4 font-black text-[9px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                 <span className="text-emerald-600 dark:text-emerald-400">{row.presentDays} Pres</span>
                                                 <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                                                 <span className="text-rose-500">{row.absentDays} Abs</span>
                                                 <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                                                 <span className="text-indigo-600 dark:text-indigo-400">{row.outstationDays} Out</span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                                ₹{row.baseSalary.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                ₹{row.tillDaySalary.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                ₹{row.salesIncentive.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                                                ₹{row.netPay.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEmployeeId(row.id);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                                                >
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Live Payslip Summary Panel (Visible if targetEmployee selected) */}
                {targetEmployee && salaryDetails && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Title Section */}
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <User size={16} className="text-emerald-500" />
                                    {targetEmployee.name}'s Salary Summary
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                                    {targetEmployee.department} · {targetEmployee.id || 'EMP'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 px-3 py-1.5 rounded-[2rem] text-xs font-black uppercase tracking-widest">
                                    {monthName} {selectedSalaryYear}
                                </span>
                            </div>
                        </div>

                        {/* Breakdown Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Attendance Card */}
                            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300">
                                <p className="text-[9px] font-black uppercase text-emerald-100/80 tracking-wider">Shift Performance</p>
                                <div className="my-3 space-y-1">
                                    <div className="flex items-baseline gap-2">
 <span className="text-2xl font-bold tracking-tight text-white">{salaryDetails.presentDays}</span>
                                        <span className="text-xs font-bold text-emerald-300">/ {salaryDetails.daysInMonth} Days Present</span>
                                    </div>
                                    {salaryDetails.outstationDays > 0 && (
                                        <div className="flex items-baseline gap-2">
 <span className="text-lg font-bold tracking-tight text-emerald-300">{salaryDetails.outstationDays}</span>
                                            <span className="text-[10px] font-bold text-emerald-100/80">Days Outstation</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] font-semibold text-rose-300 uppercase tracking-tighter">
                                    {salaryDetails.absentDays} days absence deduction (-₹{salaryDetails.absenceDeduction.toLocaleString('en-IN')})
                                </p>
                            </div>

                            {/* Sales Incentives Card */}
                            <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300">
                                <p className="text-[9px] font-black uppercase text-emerald-100/80 tracking-wider flex items-center gap-1">
                                    <TrendingUp size={12} className="text-emerald-100" /> Realized Sales Incentives
                                </p>
                                <div className="my-3 flex items-baseline gap-1">
                                    <span className="text-xs font-bold text-emerald-100">₹</span>
                                    <span className="text-2xl font-playfair font-bold tracking-tight text-white">{salaryDetails.salesIncentive.toLocaleString('en-IN')}</span>
                                </div>
                                <p className="text-[10px] font-bold text-emerald-100/80 uppercase">
                                    Calculated from point history ledger
                                </p>
                            </div>

                            {/* Net Payout Card */}
                            <div className="bg-gradient-to-br from-[#c5a059] to-[#e5c185] p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300">
                                <p className="text-[9px] font-black uppercase text-amber-950/80 tracking-wider flex items-center gap-1">
                                    <Landmark size={12} className="text-amber-950" /> Final Net Payable
                                </p>
                                <div className="my-3 flex items-baseline gap-1">
                                    <span className="text-xs font-bold text-amber-950">₹</span>
                                    <span className="text-2xl font-playfair font-bold tracking-tight text-amber-950">{salaryDetails.netPay.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-[9px] font-black text-amber-950/80 flex justify-between uppercase">
                                    <span>Earnings: ₹{salaryDetails.totalEarnings.toLocaleString('en-IN')}</span>
                                    <span>Deds: ₹{salaryDetails.totalDeductions.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Earnings and Deductions List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            {/* Earnings List */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Earnings Breakup</h4>
                                <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] p-4 border border-slate-200/50 dark:border-slate-800 space-y-2.5">
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Basic Pay</span><span className="text-slate-800 dark:text-slate-200 font-black">₹{salaryDetails.basic.toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Sales Incentive</span><span className="text-emerald-600 dark:text-emerald-400 font-black">₹{salaryDetails.salesIncentive.toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Daily Allowance (₹{salaryDetails.dailyAllowanceRate}/day)</span><span className="text-slate-800 dark:text-slate-200 font-black">₹{salaryDetails.totalDailyAllowance.toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Outstation Allowance (₹{salaryDetails.outstationAllowanceRate}/day)</span><span className="text-slate-800 dark:text-slate-200 font-black">₹{salaryDetails.totalOutstationAllowance.toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-xs pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800"><span className="text-slate-800 dark:text-slate-200 font-black uppercase">Gross Earnings</span><span className="text-slate-800 dark:text-slate-200 font-black text-sm">₹{salaryDetails.totalEarnings.toLocaleString('en-IN')}</span></div>
                                </div>
                            </div>

                            {/* Deductions List */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deductions Breakup</h4>
                                <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] p-4 border border-slate-200/50 dark:border-slate-800 space-y-2.5">
                                    <div className="flex justify-between text-xs"><span className="text-slate-500 font-bold">Salary Advance Deductions</span><span className="text-rose-500 font-black">₹{salaryDetails.salaryAdvance.toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between text-xs pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800"><span className="text-slate-850 dark:text-slate-200 font-black uppercase">Total Deductions</span><span className="text-slate-850 dark:text-slate-200 font-black text-sm">₹{salaryDetails.totalDeductions.toLocaleString('en-IN')}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
