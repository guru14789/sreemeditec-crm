import React, { useState, useEffect, useMemo } from 'react';
import { Employee, PayrollRecord, TabView } from '../types';
import { 
    Users, IndianRupee, Search, ShieldCheck, UserPlus, X, Briefcase, Mail, Phone, ChevronRight, ArrowLeft, CreditCard, Check, Save, Calendar, Trash2, UserMinus, Plus
} from 'lucide-react';
import { useData } from './DataContext';

const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  if (num >= 1000) return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  return num.toString();
};

const calculatePayrollForEmployee = (emp: Employee, lopDays: number = 0): PayrollRecord => {
  const TOTAL_WORKING_DAYS = 30;
  const paidDays = TOTAL_WORKING_DAYS - lopDays;
  const earnedBasic = (emp.baseSalary / TOTAL_WORKING_DAYS) * paidDays;
  const fullHra = emp.baseSalary * 0.40;
  const earnedHra = (fullHra / TOTAL_WORKING_DAYS) * paidDays;
  const pfDeduction = earnedBasic * 0.12;
  const taxDeduction = earnedBasic > 50000 ? earnedBasic * 0.10 : 0; 
  const totalDeductions = pfDeduction + taxDeduction;
  const netPay = earnedBasic + earnedHra - totalDeductions;

  return {
    id: `PAY-${emp.id}-${Date.now()}`,
    employeeId: emp.id,
    employeeName: emp.name,
    month: 'October 2023',
    baseSalary: emp.baseSalary,
    attendanceDays: paidDays,
    lopDays: lopDays,
    allowances: Math.round(earnedHra),
    deductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    status: 'Pending'
  };
};

const MODULE_OPTIONS = [
    { value: TabView.DASHBOARD, label: 'Dashboard' },
    { value: TabView.LEADS, label: 'Leads' },
    { value: TabView.QUOTES, label: 'Quotations' },
    { value: TabView.PO_BUILDER, label: 'Purchase Orders' },
    { value: TabView.INVENTORY, label: 'Inventory' },
    { value: TabView.SERVICE_ORDERS, label: 'Service Orders' },
    { value: TabView.SERVICE_REPORTS, label: 'Service Reports' },
    { value: TabView.CLIENTS, label: 'Clients' },
    { value: TabView.DELIVERY, label: 'Delivery' },
    { value: TabView.TASKS, label: 'Tasks' },
    { value: TabView.ATTENDANCE, label: 'Attendance' },
    { value: TabView.EXPENSES, label: 'Expenses' },
    { value: TabView.BILLING, label: 'Billing' },
    { value: TabView.REPORTS, label: 'Reports' },
    { value: TabView.PERFORMANCE, label: 'Performance' },
];

export const HRModule: React.FC = () => {
  const { employees, updateEmployee, addEmployee, removeEmployee } = useData();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'permissions'>('employees');
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({
    role: 'Sales Executive',
    department: 'Sales',
    status: 'Active',
    baseSalary: 30000,
    permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.PROFILE]
  });

  useEffect(() => {
    const initialPayroll = employees.map(emp => {
        let lop = 0;
        if (emp.name === 'Sarah Jenkins') lop = 2; 
        return calculatePayrollForEmployee(emp, lop);
    });
    setPayroll(initialPayroll);
  }, [employees]);

  const handleProcessPayroll = (id: string) => {
    setPayroll(prev => prev.map(record => 
      record.id === id ? { ...record, status: 'Paid', paymentDate: new Date().toISOString().split('T')[0] } : record
    ));
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedEmployeeId(null);
    setEmployeeFormData({
        role: 'Sales Executive',
        department: 'Sales',
        status: 'Active',
        baseSalary: 30000,
        joinDate: new Date().toISOString().split('T')[0],
        permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.PROFILE]
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setIsEditing(true);
    setSelectedEmployeeId(emp.id);
    setEmployeeFormData({ ...emp });
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = () => {
    if (selectedEmployeeId && confirm(`Are you sure you want to remove ${employeeFormData.name}?`)) {
      removeEmployee(selectedEmployeeId);
      setShowEmployeeModal(false);
    }
  };

  const handleSaveEmployee = () => {
    if(!employeeFormData.name || !employeeFormData.email || !employeeFormData.baseSalary) {
      alert("Please fill required fields (Name, Email, Salary)");
      return;
    }

    if (isEditing && selectedEmployeeId) {
        updateEmployee(selectedEmployeeId, employeeFormData);
    } else {
        const emp: Employee = {
            id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
            name: employeeFormData.name!,
            role: employeeFormData.role || 'Staff',
            department: employeeFormData.department || 'General',
            email: employeeFormData.email!,
            phone: employeeFormData.phone || '',
            joinDate: employeeFormData.joinDate || new Date().toISOString().split('T')[0],
            baseSalary: Number(employeeFormData.baseSalary),
            status: employeeFormData.status || 'Active',
            permissions: employeeFormData.permissions || []
        };
        addEmployee(emp);
    }
    
    setShowEmployeeModal(false);
  };

  const togglePermission = (empId: string, tab: TabView) => {
      const emp = employees.find(e => e.id === empId);
      if (!emp) return;

      const currentPerms = emp.permissions || [];
      const newPerms = currentPerms.includes(tab)
          ? currentPerms.filter(t => t !== tab)
          : [...currentPerms, tab];
      
      updateEmployee(empId, { permissions: newPerms });
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const totalPayrollCost = payroll.reduce((acc, curr) => acc + curr.netPay, 0);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden p-1 sm:p-2">
      
      {/* Top Header Summary Stats - Scrollable on Mobile to save vertical space */}
      <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 gap-3 sm:gap-5 shrink-0 custom-scrollbar-h">
        <div className="min-w-[200px] sm:min-w-0 bg-gradient-to-br from-blue-800 to-indigo-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg text-white group overflow-hidden relative">
            <Users className="absolute top-0 right-0 p-4 opacity-10" size={80} />
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs font-bold text-blue-200/80 uppercase tracking-wider">Headcount</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">{employees.length}</h3>
                <p className="text-[9px] sm:text-xs text-blue-200/60 mt-1 font-medium">Active Staff</p>
            </div>
        </div>

        <div className="min-w-[200px] sm:min-w-0 bg-gradient-to-br from-[#022c22] to-emerald-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg text-white group overflow-hidden relative">
            <IndianRupee className="absolute top-0 right-0 p-4 opacity-10" size={80} />
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs font-bold text-emerald-200/80 uppercase tracking-wider">Payroll</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">₹{formatIndianNumber(totalPayrollCost)}</h3>
                <p className="text-[9px] sm:text-xs text-emerald-200/60 mt-1 font-medium">Est. Monthly</p>
            </div>
        </div>

        <div className="min-w-[200px] sm:min-w-0 bg-gradient-to-br from-purple-700 to-violet-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg text-white group overflow-hidden relative">
            <ShieldCheck className="absolute top-0 right-0 p-4 opacity-10" size={80} />
            <div className="relative z-10">
                <p className="text-[10px] sm:text-xs font-bold text-purple-200/80 uppercase tracking-wider">Security</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">RBAC</h3>
                <p className="text-[9px] sm:text-xs text-purple-200/60 mt-1 font-medium">Access Control</p>
            </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        
        {/* Navigation Bar - Refined for Alignment & Mobile Compactness */}
        <div className="border-b border-slate-100 flex flex-col gap-3 px-3 sm:px-8 py-3 sm:py-5 shrink-0">
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-3">
                <div className="flex bg-slate-100/80 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto shadow-inner order-2 sm:order-1">
                    <button 
                        onClick={() => setActiveTab('employees')}
                        className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'employees' ? 'bg-white text-medical-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800'}`}>
                        Directory
                    </button>
                    <button 
                        onClick={() => setActiveTab('payroll')}
                        className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payroll' ? 'bg-white text-medical-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800'}`}>
                        Payroll
                    </button>
                    <button 
                        onClick={() => setActiveTab('permissions')}
                        className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? 'bg-white text-medical-700 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800'}`}>
                        Roles
                    </button>
                </div>
                
                <button 
                    onClick={handleOpenAddModal}
                    className="bg-medical-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-medical-500/20 active:scale-95 transition-all whitespace-nowrap group w-full sm:w-auto order-1 sm:order-2">
                    <div className="p-0.5 sm:p-1 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                        <Plus size={14} strokeWidth={4} />
                    </div>
                    <span>Add Member</span>
                </button>
            </div>

            {(activeTab === 'employees' || activeTab === 'permissions') && (
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={`Search ${activeTab === 'employees' ? 'by name, role or ID' : 'staff to adjust roles'}...`}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* Content Section - Flexible and maximized for scroll */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-3 sm:p-8 custom-scrollbar">
            
            {activeTab === 'employees' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-500">
                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                        <div 
                            key={emp.id} 
                            onClick={() => handleOpenEditModal(emp)}
                            className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-medical-200 transition-all group relative overflow-hidden cursor-pointer"
                        >
                             <div className="flex justify-between items-start mb-4 sm:mb-6">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-medical-50 to-emerald-100 flex items-center justify-center text-medical-700 font-black text-base sm:text-xl border border-medical-100 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-800 text-sm sm:text-lg leading-tight truncate">{emp.name}</h4>
                                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{emp.id}</p>
                                    </div>
                                </div>
                                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                                    emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                    emp.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                    'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                    {emp.status}
                                </span>
                            </div>

                            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Briefcase size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-bold truncate">{emp.role} <span className="text-slate-400 mx-1">•</span> {emp.department}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-bold truncate">{emp.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-[10px] sm:text-xs font-bold">{emp.phone || 'No phone set'}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 sm:pt-5 border-t border-slate-50">
                                <div>
                                    <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Salary</p>
                                    <p className="text-xs sm:text-sm font-black text-slate-800">₹{emp.baseSalary.toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('permissions'); }}
                                        className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all" title="Permissions">
                                        <ShieldCheck size={16} />
                                     </button>
                                     <button className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 text-slate-400 hover:text-medical-600 hover:bg-medical-50 transition-all" title="View Details">
                                        <ChevronRight size={16} />
                                     </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-16 sm:py-24 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search size={28} />
                            </div>
                            <h4 className="font-bold text-slate-500 text-sm">No matching staff members found</h4>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'payroll' && (
                <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-sm overflow-x-auto animate-in slide-in-from-bottom-4">
                     <table className="w-full text-left text-xs sm:text-sm text-slate-600 min-w-[700px] sm:min-w-[1000px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-500">
                            <tr>
                                <th className="px-4 sm:px-8 py-4 sm:py-5">Employee</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Attendance</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-right">Allowances</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-right">Deductions</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-right font-bold text-slate-800">Net Pay</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-center">Status</th>
                                <th className="px-4 sm:px-8 py-4 sm:py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payroll.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 sm:px-8 py-4 sm:py-6">
                                        <div className="font-black text-slate-800 truncate max-w-[120px] sm:max-w-none">{record.employeeName}</div>
                                        <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase mt-0.5">{record.month}</div>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center font-bold">{record.attendanceDays}D</td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right text-emerald-600 font-black">+₹{record.allowances.toLocaleString()}</td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right text-rose-500 font-black">-₹{record.deductions.toLocaleString()}</td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right font-black text-slate-800 text-sm sm:text-lg">₹{record.netPay.toLocaleString()}</td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                                        <span className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${record.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                                        {record.status === 'Pending' && (
                                            <button 
                                                onClick={() => handleProcessPayroll(record.id)}
                                                className="bg-medical-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-medical-700 flex items-center gap-1.5 ml-auto shadow-lg shadow-medical-500/20 active:scale-95 transition-all">
                                                <CreditCard size={12} /> Release
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="space-y-4 sm:space-y-8 animate-in slide-in-from-right-4">
                    <div className="bg-indigo-900 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><ShieldCheck size={120}/></div>
                        <div className="relative z-10 text-center md:text-left">
                            <h4 className="font-black text-xl sm:text-2xl tracking-tight uppercase">Roles & Control</h4>
                            <p className="text-[10px] sm:text-sm text-indigo-100/60 mt-1 font-medium max-w-xl">
                                Define visibility and functional limits for staff members. 
                            </p>
                        </div>
                        <button 
                            onClick={() => setActiveTab('employees')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative z-10 w-full sm:w-auto">
                            <ArrowLeft size={16} /> Directory
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm text-slate-600 min-w-[600px]">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 w-48 sm:w-72">Staff Member</th>
                                        <th className="px-4 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500">Access Grid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 sm:px-10 py-6 sm:py-10 align-top">
                                                <div className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 shadow-inner shrink-0 uppercase">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-slate-800 leading-none truncate text-xs sm:text-sm">{emp.name}</div>
                                                        <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1 sm:mt-1.5 truncate">{emp.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 sm:px-10 py-6 sm:py-10">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                                                    {MODULE_OPTIONS.map(mod => {
                                                        const isChecked = emp.permissions?.includes(mod.value);
                                                        return (
                                                            <label 
                                                                key={mod.value}
                                                                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-2xl border text-[8px] sm:text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer select-none truncate ${
                                                                    isChecked 
                                                                        ? 'bg-medical-50 text-medical-800 border-medical-200 shadow-sm ring-1 ring-medical-100' 
                                                                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="hidden" 
                                                                    checked={isChecked} 
                                                                    onChange={() => togglePermission(emp.id, mod.value)} 
                                                                />
                                                                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded sm:rounded-md border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-medical-600 border-medical-600 text-white' : 'bg-slate-50 border-slate-200 text-transparent'}`}>
                                                                    <Check size={8} sm:size={10} strokeWidth={4} />
                                                                </div>
                                                                <span className="truncate">{mod.label}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={2} className="py-20 text-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                    <Search size={28} />
                                                </div>
                                                <h4 className="font-bold text-slate-400 text-sm">No matching staff found for role assignment</h4>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Employee Modal (Add & Edit) - FULL DETAILS FORM */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
             <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 overflow-hidden">
                <div className="p-5 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white shrink-0">
                     <h3 className="text-base sm:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-2 bg-medical-50 text-medical-600 rounded-lg sm:rounded-xl">
                            {isEditing ? <Users size={20} sm:size={24} /> : <UserPlus size={20} sm:size={24} />}
                        </div> 
                        {isEditing ? 'Profile Details' : 'Register Staff'}
                    </h3>
                    <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-800 transition-colors p-1"><X size={24} sm:size={28} /></button>
                </div>
                
                <div className="p-5 sm:p-8 overflow-y-auto space-y-4 sm:space-y-6 custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name *</label>
                            <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all" placeholder="e.g. John Doe"
                                value={employeeFormData.name || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee Status</label>
                            <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all appearance-none"
                                value={employeeFormData.status}
                                onChange={(e) => setEmployeeFormData({...employeeFormData, status: e.target.value as any})}
                            >
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Role</label>
                            <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all" placeholder="Manager"
                                value={employeeFormData.role || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, role: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                            <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all appearance-none"
                                value={employeeFormData.department}
                                onChange={(e) => setEmployeeFormData({...employeeFormData, department: e.target.value})}
                            >
                                <option>Sales</option>
                                <option>Service</option>
                                <option>Administration</option>
                                <option>Logistics</option>
                                <option>HR</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address *</label>
                            <input type="email" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all" placeholder="john@sreemeditec.com"
                                value={employeeFormData.email || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, email: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                            <input type="tel" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all" placeholder="+91 00000 00000"
                                value={employeeFormData.phone || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, phone: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Salary (₹)</label>
                            <input type="number" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                value={employeeFormData.baseSalary || 0} onChange={(e) => setEmployeeFormData({...employeeFormData, baseSalary: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Join Date</label>
                            <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                value={employeeFormData.joinDate} onChange={(e) => setEmployeeFormData({...employeeFormData, joinDate: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-8 border-t border-slate-100 flex gap-3 sm:gap-4 bg-slate-50/50 shrink-0">
                    {isEditing && (
                      <button onClick={handleDeleteEmployee} className="px-4 sm:px-6 py-3 sm:py-4 text-rose-600 font-black uppercase tracking-widest hover:bg-rose-50 transition-colors rounded-xl sm:rounded-2xl text-[10px] sm:text-xs flex items-center gap-2 border border-rose-100 shrink-0">
                        <UserMinus size={16} sm:size={18} /> <span className="hidden sm:inline">Delete</span>
                      </button>
                    )}
                    <button onClick={() => setShowEmployeeModal(false)} className="px-4 sm:px-5 py-3 sm:py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-200 transition-colors rounded-xl sm:rounded-2xl text-[10px] sm:text-xs flex-1">Cancel</button>
                    <button onClick={handleSaveEmployee} className="flex-[2] px-4 sm:px-5 py-3 sm:py-4 bg-medical-600 text-white font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-medical-500/30 hover:bg-medical-700 transition-all active:scale-95 text-[10px] sm:text-xs flex items-center justify-center gap-2">
                        <Save size={16} sm:size={18} /> {isEditing ? 'Update Profile' : 'Register Staff'}
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
