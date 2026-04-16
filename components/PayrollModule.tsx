
import React, { useState } from 'react';
import { Download, Timer, CreditCard, ShieldCheck } from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PayrollModule: React.FC = () => {
    const { currentUser: me, addNotification, attendanceRecords, holidays } = useData();
    const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(new Date().getMonth());
    const [selectedSalaryYear, setSelectedSalaryYear] = useState(new Date().getFullYear());
    const [isGeneratingSlip, setIsGeneratingSlip] = useState(false);

    const handleDownloadSalarySlip = () => {
        if (!me) return;
        setIsGeneratingSlip(true);
        
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const monthName = new Date(selectedSalaryYear, selectedSalaryMonth).toLocaleString('en-US', { month: 'long' });
            const docTitle = `SALARY SLIP - ${monthName.toUpperCase()} ${selectedSalaryYear}`;
            
            // Header
            doc.setFillColor(16, 185, 129); // Emerald-600
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text("Sree Meditec Enterprise", 14, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text("Kochi, Kerala | Contact: +91 98470 XXXXX", 14, 28);
            doc.text("GSTIN: 32XXXXX1234X1Z1", 14, 33);
            
            // Slip Title
            doc.setTextColor(30, 41, 59); // Slate-800
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(docTitle, 105, 55, { align: 'center' });
            
            // Attendance Calculation
            const daysInMonth = new Date(selectedSalaryYear, selectedSalaryMonth + 1, 0).getDate();
            const yearMonthStr = `${selectedSalaryYear}-${String(selectedSalaryMonth + 1).padStart(2, '0')}`;
            
            let presentDays = 0;
            let absentDays = 0;
            let leaveDays = 0;
            let holidayCredits = 0;

            const myRecords = attendanceRecords.filter(r => r.userId === me.id && r.date.startsWith(yearMonthStr));
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${yearMonthStr}-${String(i).padStart(2, '0')}`;
                const dateObj = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                const isSunday = dateObj.getDay() === 0;
                const isHoliday = holidays.some(h => h.date === dateStr);
                const record = myRecords.find(r => r.date === dateStr);

                if (isSunday || isHoliday) {
                    holidayCredits++;
                } else if (record) {
                    if (record.status === 'OnLeave') {
                        leaveDays++;
                    } else {
                        presentDays++;
                    }
                } else {
                    // Only count as absent if it's not in the future
                    const today = new Date();
                    const checkDate = new Date(selectedSalaryYear, selectedSalaryMonth, i);
                    if (checkDate <= today) {
                        absentDays++;
                    }
                }
            }

            // Calculations
            const baseSalary = me.baseSalary || 25000;
            const dailyRate = baseSalary / daysInMonth;
            const absenceDeduction = Math.floor(absentDays * dailyRate);
            
            const grossSalary = baseSalary - absenceDeduction;
            const basic = Math.floor(grossSalary * 0.5);
            const hra = Math.floor(grossSalary * 0.3);
            const conv = Math.floor(grossSalary * 0.15);
            const other = grossSalary - basic - hra - conv;
            
            const pf = Math.floor(basic * 0.12);
            const pt = 200;
            const totalDeductions = pf + pt;
            const netPay = grossSalary - totalDeductions;

            // Updated Employee Info Table
            const empInfo = [
                ['Employee Name', me.name, 'Employee ID', me.id || 'EMP-001'],
                ['Department', me.department, 'Designation', me.role === 'SYSTEM_ADMIN' ? 'Administrator' : 'Field Engineer'],
                ['Month/Year', `${monthName} ${selectedSalaryYear}`, 'Bank Name', 'HDFC Bank'],
                ['Working Days', daysInMonth.toString(), 'Absent Days', absentDays.toString()],
            ];

            // Earnings & Deductions Table
            const financeData = [
                ['Basic Salary', basic.toLocaleString(), 'Provident Fund (PF)', pf.toLocaleString()],
                ['House Rent Allowance (HRA)', hra.toLocaleString(), 'Professional Tax', pt.toLocaleString()],
                ['Conveyance Allowance', conv.toLocaleString(), '', ''],
                ['Special Allowance', other.toLocaleString(), '', ''],
                [{ content: 'Total Earnings', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: `₹${grossSalary.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: 'Total Deductions', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: `₹${totalDeductions.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }]
            ];

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['EARNINGS', 'AMOUNT (INR)', 'DEDUCTIONS', 'AMOUNT (INR)']],
                body: financeData as any,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
                styles: { fontSize: 9 }
            });

            // Net Pay Section
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFillColor(240, 253, 244); // Emerald-50
            doc.rect(14, finalY, 182, 20, 'F');
            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(0.5);
            doc.rect(14, finalY, 182, 20);

            doc.setTextColor(16, 185, 129);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`NET PAYABLE:  INR ${netPay.toLocaleString()}/-`, 105, finalY + 12, { align: 'center' });

            // Footer
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.text("This is a computer-generated document and does not require a physical signature.", 105, 280, { align: 'center' });

            doc.save(`Salary_Slip_${me.name.replace(' ', '_')}_${monthName}_${selectedSalaryYear}.pdf`);
            addNotification('Salary Slip Downloaded', `Successfully generated slip for ${monthName} ${selectedSalaryYear}.`, 'success');
        } catch (err) {
            console.error(err);
            addNotification('Download Failed', 'Could not generate salary slip.', 'alert');
        } finally {
            setIsGeneratingSlip(false);
        }
    };

    return (
        <div className="min-h-full flex flex-col gap-6 md:gap-8 items-center md:justify-center relative overflow-x-hidden py-6 md:py-0 px-2">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl hidden md:block"></div>
            <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl hidden md:block"></div>

            <div className="w-full max-w-4xl relative z-10 space-y-6 md:space-y-8">
                {/* Hero Card */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-20 -bottom-20 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <CreditCard size={400} />
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12 relative z-10">
                        <div className="max-w-md text-center md:text-left">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 backdrop-blur-md mx-auto md:mx-0">
                                <ShieldCheck size={28} />
                            </div>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-3 md:mb-4 leading-none">Payroll Portal</h1>
                            <p className="text-emerald-50/70 text-[11px] md:text-sm font-medium leading-relaxed">
                                Access and download your official monthly salary certificates with a single click. Secured with enterprise-grade encryption.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 w-full md:w-80 shadow-2xl flex flex-col items-stretch gap-5 md:gap-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 px-1">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/60">Select Month</label>
                                    <select 
                                        value={selectedSalaryMonth}
                                        onChange={(e) => setSelectedSalaryMonth(parseInt(e.target.value))}
                                        className="w-full bg-slate-900/40 border border-white/20 rounded-xl md:rounded-2xl px-4 py-3 md:py-3.5 text-xs font-black uppercase outline-none focus:bg-white/10 transition-all cursor-pointer appearance-none"
                                    >
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                                            <option key={m} value={i} className="text-slate-900">{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 px-1">
                                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/60">Select Year</label>
                                    <select 
                                        value={selectedSalaryYear}
                                        onChange={(e) => setSelectedSalaryYear(parseInt(e.target.value))}
                                        className="w-full bg-slate-900/40 border border-white/20 rounded-xl md:rounded-2xl px-4 py-3 md:py-3.5 text-xs font-black uppercase outline-none focus:bg-white/10 transition-all cursor-pointer appearance-none"
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y} className="text-slate-900">{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleDownloadSalarySlip}
                                disabled={isGeneratingSlip}
                                className="w-full py-3.5 md:py-4 bg-white text-emerald-700 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 shadow-xl shadow-emerald-950/20 transition-all flex items-center justify-center gap-3 transform active:scale-95 disabled:opacity-50"
                            >
                                {isGeneratingSlip ? <Timer size={16} className="animate-spin" /> : <Download size={16} />}
                                Download PDF Slip
                            </button>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl md:rounded-2xl text-emerald-600"><Timer size={20} /></div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processing Time</p>
                            <p className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase leading-none">Instant Generation</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl md:rounded-2xl text-emerald-600"><ShieldCheck size={20} /></div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Compliance</p>
                            <p className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase leading-none">ISO & GST Verified</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-xl md:rounded-2xl text-emerald-600"><CreditCard size={20} /></div>
                        <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Deposit</p>
                            <p className="text-[11px] md:text-sm font-black text-slate-800 dark:text-white uppercase leading-none">HDFC Salary Node</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
