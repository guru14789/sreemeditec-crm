import React, { useState, useMemo } from 'react';
import { Download, Timer, CreditCard, ShieldCheck, User, Users, TrendingUp, Landmark, ChevronDown, X } from 'lucide-react';
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
    
    const [activePicker, setActivePicker] = useState<'month' | 'year' | 'employee' | null>(null);

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
                    today.setHours(0, 0, 0, 0);
                    const checkDate = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                    if (checkDate < today) {
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
        const totalDailyAllowance = expenses
            .filter(e => e.employeeName === targetEmployee.name && e.category === 'Daily Allowance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalOutstationAllowance = expenses
            .filter(e => e.employeeName === targetEmployee.name && e.category === 'Outstation Allowance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
            .reduce((acc, curr) => acc + (curr.amount || 0), 0);

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
                        today.setHours(0, 0, 0, 0);
                        const checkDate = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                        if (checkDate < today) {
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
            const totalDailyAllowance = expenses
                .filter(e => e.employeeName === emp.name && e.category === 'Daily Allowance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const totalOutstationAllowance = expenses
                .filter(e => e.employeeName === emp.name && e.category === 'Outstation Allowance' && e.status === 'Approved' && e.date.startsWith(yearMonthStr))
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);

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
                leaveDays,
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
        <div className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col gap-4 md:gap-8 items-center relative py-0 md:py-6 px-0 md:px-2">
            <div className="w-full max-w-4xl space-y-4">
                {/* Hero / Selection Panel */}
                <div className="bg-gradient-to-br from-emerald-950 to-green-900 m-0 md:m-3 lg:m-4 rounded-none md:rounded-[2rem] p-4 md:p-8 text-white shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] relative overflow-hidden">
                    <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none">
                        <CreditCard size={320} />
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                        <div className="flex items-center md:items-start md:flex-col gap-3 md:gap-0 max-w-md text-left w-full">
                            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md md:mb-4 backdrop-blur-md shrink-0">
                                <ShieldCheck size={24} className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div>
                                <h1 className="text-base md:text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Payroll Portal</h1>
                                <p className="hidden md:block text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed mt-2">
                                    Review Monthly Attendance Records, Sales Commissions, And Generate Official Slip Drafts For Sree Meditec Team Members.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-4 md:p-5 w-full md:w-[400px] shadow-2xl flex flex-col gap-3">
                            {isAdmin && (
                                <div className="space-y-1.5 mb-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70 flex items-center gap-1 ml-1"><Users size={12}/> Choose Employee</label>
                                    <div 
                                        onClick={() => setActivePicker('employee')}
                                        className="relative w-full bg-slate-900/60 border border-white/10 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-2.5 text-[15px] font-bold text-white transition-all cursor-pointer shadow-inner flex items-center h-[46px] md:h-[42px]"
                                    >
                                        <span className="truncate">
                                            {selectedEmployeeId 
                                                ? (() => {
                                                    const emp = employees.find(e => e.id === selectedEmployeeId);
                                                    return emp ? `${emp.name} (${emp.department})` : '-- Select --';
                                                  })()
                                                : '-- Select --'}
                                        </span>
                                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70 ml-1">Month</label>
                                    <div 
                                        onClick={() => setActivePicker('month')}
                                        className="relative w-full bg-slate-900/60 border border-white/10 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-2.5 text-[15px] font-bold text-white transition-all cursor-pointer shadow-inner flex items-center h-[46px] md:h-[42px]"
                                    >
                                        <span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedSalaryMonth]}</span>
                                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-emerald-100/70 ml-1">Year</label>
                                    <div 
                                        onClick={() => setActivePicker('year')}
                                        className="relative w-full bg-slate-900/60 border border-white/10 rounded-[1.5rem] pl-4 pr-10 py-3 md:py-2.5 text-[15px] font-bold text-white transition-all cursor-pointer shadow-inner flex items-center h-[46px] md:h-[42px]"
                                    >
                                        <span>{selectedSalaryYear}</span>
                                        <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                                    </div>
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
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 md:rounded-3xl p-3 md:p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2 md:pb-4">
                            <div>
                                <h3 className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                    <Users size={14} className="text-emerald-500" />
                                    Payroll Summary
                                </h3>
                                <p className="hidden md:block text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">
                                    Overview of incentives and attendance-based salary for {monthName} {selectedSalaryYear}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar md:p-0 p-2">
                            <table className="w-full text-left border-collapse block md:table">
                                <thead className="hidden md:table-header-group">
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
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 block md:table-row-group">
                                    {allEmployeesSalarySummary.map((row) => (
                                        <tr 
                                            key={row.id} 
                                            className={`block md:table-row hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all text-[11px] md:text-xs cursor-pointer border-b border-slate-200 md:border-slate-100 md:rounded-none p-2 md:p-0 bg-white ${selectedEmployeeId === row.id ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}
                                            onClick={() => setSelectedEmployeeId(row.id)}
                                        >
                                            <td className="block md:table-cell py-1 px-1 md:py-3 md:px-4 border-b border-dashed md:border-none border-slate-200 md:border-0 pb-1 flex justify-between items-center md:items-start md:flex-col">
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{row.name}</div>
                                                    <div className="text-[8px] text-slate-400 font-semibold uppercase">{row.department} · {row.role}</div>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEmployeeId(row.id);
                                                    }}
                                                    className="md:hidden px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Select
                                                </button>
                                            </td>
                                            <td className="block md:table-cell py-0.5 px-1 md:py-3 md:px-4 font-black text-[9px] text-slate-600 dark:text-slate-400 pt-2">
                                                 <div className="flex items-center justify-between md:justify-start w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Attendance</span>
                                                    <div>
                                                        <span className="text-emerald-600 dark:text-emerald-400">{row.presentDays} Pres</span>
                                                        <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
                                                        <span className="text-rose-500">{row.absentDays} Abs</span>
                                                        <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400">{row.outstationDays} Out</span>
                                                    </div>
                                                 </div>
                                            </td>
                                            <td className="hidden md:table-cell py-0.5 px-1 md:py-3 md:px-4 text-left md:text-right font-semibold text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center justify-between md:justify-end w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Base Salary</span>
                                                    <span>₹{row.baseSalary.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell py-0.5 px-1 md:py-3 md:px-4 text-left md:text-right font-black text-indigo-600 dark:text-indigo-400">
                                                <div className="flex items-center justify-between md:justify-end w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Till-Day Salary</span>
                                                    <span>₹{row.tillDaySalary.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>
                                            <td className="block md:table-cell py-0.5 px-1 md:py-3 md:px-4 text-left md:text-right font-black text-emerald-600 dark:text-emerald-400">
                                                <div className="flex items-center justify-between md:justify-end w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Sales Incentives</span>
                                                    <span>₹{row.salesIncentive.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>
                                            <td className="block md:table-cell py-0.5 px-1 md:py-3 md:px-4 text-left md:text-right font-black text-slate-900 dark:text-white pb-1">
                                                <div className="flex items-center justify-between md:justify-end w-full">
                                                    <span className="md:hidden text-[8px] font-black uppercase text-slate-400">Net Payable</span>
                                                    <span>₹{row.netPay.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell py-3 px-4 text-center">
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
                                        <span className="text-xs font-bold text-emerald-300">/ {salaryDetails.daysInMonth} Days</span>
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

            {/* Custom Picker Modal (Mobile App Friendly) */}
            {activePicker && (
                <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full rounded-t-[2rem] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                                {activePicker === 'month' && 'Select Month'}
                                {activePicker === 'year' && 'Select Year'}
                                {activePicker === 'employee' && 'Select Employee'}
                            </h3>
                            <button 
                                onClick={() => setActivePicker(null)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full transition-colors"
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {activePicker === 'month' && (
                                <div className="flex flex-col">
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                        <button
                                            key={m}
                                            onClick={() => { setSelectedSalaryMonth(i); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${selectedSalaryMonth === i ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {activePicker === 'year' && (
                                <div className="flex flex-col">
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <button
                                            key={y}
                                            onClick={() => { setSelectedSalaryYear(y); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${selectedSalaryYear === y ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {activePicker === 'employee' && (
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => { setSelectedEmployeeId(''); setActivePicker(null); }}
                                        className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors ${!selectedEmployeeId ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                    >
                                        -- Select --
                                    </button>
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => { setSelectedEmployeeId(emp.id); setActivePicker(null); }}
                                            className={`p-4 text-left font-bold rounded-[1.5rem] transition-colors flex flex-col ${selectedEmployeeId === emp.id ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        >
                                            <span>{emp.name}</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mt-1">{emp.department}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
