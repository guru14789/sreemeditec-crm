
import React, { useState } from 'react';
import { Employee, TabView, EnterpriseRole } from '../types';
import {
    Users, Search, ShieldCheck, UserPlus, X, Trash2, Lock, ShieldAlert, RefreshCw
} from 'lucide-react';
import { useData } from './DataContext';

const MODULE_OPTIONS = [
    { value: TabView.DASHBOARD, label: 'Dashboard' },
    { value: TabView.LEADS, label: 'Lead CRM' },
    { value: TabView.CLIENTS, label: 'Client Database' },
    { value: TabView.VENDORS, label: 'Vendor Database' },
    { value: TabView.INVENTORY, label: 'Inventory' },
    { value: TabView.BILLING, label: 'Invoice Maker' },
    { value: TabView.QUOTES, label: 'Quotation Maker' },
    { value: TabView.PO_BUILDER, label: 'Customer PO Maker' },
    { value: TabView.SUPPLIER_PO, label: 'Supplier PO Maker' },
    { value: TabView.SERVICE_ORDERS, label: 'Service Order Maker' },
    { value: TabView.SERVICE_REPORTS, label: 'Service Report Maker' },
    { value: TabView.INSTALLATION_REPORTS, label: 'Install Report Maker' },
    { value: TabView.DELIVERY, label: 'Delivery Challan' },
    { value: TabView.TASKS, label: 'Task Manager' },
    { value: TabView.ATTENDANCE, label: 'Check-in/Out' },
    { value: TabView.EXPENSES, label: 'Vouchers' },
    { value: TabView.PERFORMANCE, label: 'Leaderboard' },
    { value: TabView.HR, label: 'Staff Management' },
    { value: TabView.REPORTS, label: 'Reports Centre' },
    { value: TabView.LOGS, label: 'Audit Logs' },
    { value: TabView.ARCHIVE, label: 'Finance Archive' },
    { value: TabView.CATALOG, label: 'Product Catalog' },
    { value: TabView.PAYROLL, label: 'Staff Payroll' },
    { value: TabView.PURCHASE_REGISTER, label: 'Purchase Entry' },
    { value: TabView.CONFIG, label: 'System Settings' },
    { value: TabView.PROFILE, label: 'My Profile' },
    { value: TabView.ACCOUNTING, label: 'Accounting Terminal' },
    { value: TabView.COMPLIANCE, label: 'Compliance Terminal' },
];

const ROLE_OPTIONS: { value: EnterpriseRole; label: string }[] = [
    { value: 'SYSTEM_ADMIN', label: 'System Admin (Super)' },
    { value: 'SYSTEM_STAFF', label: 'System Staff (Restricted)' }
];

export const HRModule: React.FC = () => {
    const { employees, updateEmployee, addEmployee, removeEmployee, addNotification, showAlert, showConfirm } = useData();
    const [activeTab, setActiveTab] = useState<'employees' | 'permissions'>('employees');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isUpdatingPermission, setIsUpdatingPermission] = useState<string | null>(null);

    const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({
        role: 'SYSTEM_STAFF',
        department: 'Sales',
        status: 'Active',
        baseSalary: 30000,
        permissions: { [TabView.DASHBOARD]: 'Employee' },
        isLoginEnabled: true,
        password: ''
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setSelectedEmployeeId(null);
        setEmployeeFormData({
            role: 'SYSTEM_STAFF',
            department: 'Sales',
            status: 'Active',
            baseSalary: 30000,
            joinDate: new Date().toISOString().split('T')[0],
            permissions: { [TabView.DASHBOARD]: 'Employee' },
            isLoginEnabled: true,
            password: Math.random().toString(36).slice(-8)
        });
        setShowEmployeeModal(true);
    };

    const handleOpenEditModal = (emp: Employee) => {
        setIsEditing(true);
        setSelectedEmployeeId(emp.id);
        
        // Normalize legacy array permissions to Record format if encountered during edit
        let normalizedPerms = emp.permissions || {};
        if (Array.isArray(normalizedPerms)) {
            normalizedPerms = (normalizedPerms as any).reduce((acc: any, tab: string) => ({ ...acc, [tab]: 'Employee' }), {});
        }
        
        setEmployeeFormData({ ...emp, permissions: normalizedPerms });
        setShowEmployeeModal(true);
    };

    const handleSaveEmployee = () => {
        if (!employeeFormData.name || !employeeFormData.email || !employeeFormData.password) {
            alert("Name, Email, and Password are mandatory.");
            return;
        }
        if (isEditing && selectedEmployeeId) {
            updateEmployee(selectedEmployeeId, employeeFormData);
            addNotification('Registry Updated', `Staff record for ${employeeFormData.name} synced.`, 'success');
        } else {
            // Robust ID Generation: Find the highest existing EMP number to avoid collisions
            const lastIdNumber = employees.reduce((max, emp) => {
                const idMatch = emp.id.match(/EMP(\d+)/);
                if (idMatch) {
                    const num = parseInt(idMatch[1]);
                    return num > max ? num : max;
                }
                return max;
            }, 0);

            const nextId = `EMP${String(lastIdNumber + 1).padStart(3, '0')}`;

            const emp: Employee = {
                id: nextId,
                name: employeeFormData.name!,
                role: (employeeFormData.role as EnterpriseRole) || 'SYSTEM_STAFF',
                department: employeeFormData.department || 'General',
                email: employeeFormData.email!,
                phone: employeeFormData.phone || '',
                joinDate: employeeFormData.joinDate || new Date().toISOString().split('T')[0],
                baseSalary: Number(employeeFormData.baseSalary),
                dailyAllowance: employeeFormData.dailyAllowance ? Number(employeeFormData.dailyAllowance) : 0,
                outstationAllowance: employeeFormData.outstationAllowance ? Number(employeeFormData.outstationAllowance) : 0,
                status: 'Active',
                permissions: employeeFormData.permissions || {},
                password: employeeFormData.password,
                isLoginEnabled: true
            };
            addEmployee(emp);
            addNotification('Staff Registered', `${emp.name} added to enterprise registry.`, 'success');
        }
        setShowEmployeeModal(false);
    };

    const handleDeleteEmployee = async () => {
        if (!selectedEmployeeId) return;

        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) {
            await showAlert("Employee not found in registry.", "Error");
            return;
        }

        if (confirmPassword !== employee.password && confirmPassword !== 'SreeAdmin2026') {
            await showAlert("Incorrect Confirmation Password.", "Error");
            return;
        }

        const confirmed = await showConfirm(`CRITICAL: Are you sure you want to permanently remove ${employee.name} from the enterprise registry?`);
        if (confirmed) {
            try {
                await removeEmployee(selectedEmployeeId);
                addNotification('Registry Purged', `${employee.name} has been removed.`, 'warning');
                setShowDeleteConfirm(false);
                setShowEmployeeModal(false);
                setConfirmPassword('');
            } catch (err: any) {
                console.error("Deletion failed:", err);
                await showAlert(`System Error: Deletion failed. ${err.message || 'Check firestore permissions.'}`, "System Error");
            }
        }
    };

    const togglePermission = async (empId: string, tab: TabView) => {
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;
        
        if (emp.email?.toLowerCase() === 'sreekumar.career@gmail.com') return;

        const currentPerms = { ...(emp.permissions || {}) } as Record<string, 'Admin' | 'Employee'>;
        const currentRole = currentPerms[tab];

        // Cycle: None -> Employee -> Admin -> None
        let nextRole: 'Admin' | 'Employee' | undefined;
        if (!currentRole) nextRole = 'Employee';
        else if (currentRole === 'Employee') nextRole = 'Admin';
        else nextRole = undefined;

        if (nextRole) {
            currentPerms[tab] = nextRole;
        } else {
            delete currentPerms[tab];
        }
        
        try {
            setIsUpdatingPermission(`${empId}-${tab}`);
            await updateEmployee(empId, { permissions: currentPerms });
            addNotification('Permission Updated', `Registry updated for ${emp.name}`, 'success');
        } catch (err: any) {
            alert(`Error updating permission: ${err.message}`);
        } finally {
            setIsUpdatingPermission(null);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col gap-2 overflow-hidden p-0 md:p-1">
            {/* Header Toolbar */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 pt-6 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none rounded-b-[1.5rem] md:rounded-[2rem]">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none rounded-b-[1.5rem] md:rounded-[2rem]"></div>
                
                {/* Top Row: Title & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
                    <div className="flex items-center gap-3 md:gap-4 group">
                        <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                            <Users size={20} className="hidden xl:block" />
                            <Users size={16} className="xl:hidden" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Staff Management</h2>
                            <p className="text-emerald-100/80 text-[10px] md:text-xs font-semibold leading-relaxed">Manage Employees And Access Control</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <Users size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Active Staff</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                {employees.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full lg:w-fit shrink-0 flex gap-1">
                        <button onClick={() => setActiveTab('employees')} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'employees' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <Users size={12} /> Registry
                        </button>
                        <button onClick={() => setActiveTab('permissions')} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'permissions' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <ShieldCheck size={12} /> Access Grid
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative group/search flex-1 w-full lg:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50 group-focus-within/search:text-white transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search staff..." 
                                className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleOpenAddModal} 
                            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-400 text-emerald-950 px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] hover:scale-[1.02] hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.6)] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <UserPlus size={16} /> Add Member
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'employees' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-6">
                        {filteredEmployees.map((emp, idx) => {
                            const gradients = [
                                { bg: 'bg-gradient-to-br from-emerald-950 to-green-900', shadow: 'shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)]', avatar: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/20', text: 'text-emerald-300', textLight: 'text-white', label: 'text-emerald-100/80', divider: 'border-emerald-800/50', badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-500/20', accent: 'text-emerald-300', roseBadge: 'bg-rose-900/40 text-rose-300 border-rose-800/50' },
                                { bg: 'bg-gradient-to-br from-emerald-800 to-emerald-600', shadow: 'shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)]', avatar: 'bg-emerald-700/60 text-emerald-100 border-emerald-400/20', text: 'text-emerald-100', textLight: 'text-white', label: 'text-emerald-100/80', divider: 'border-emerald-600/50', badge: 'bg-emerald-300/20 text-emerald-100 border-emerald-400/20', accent: 'text-emerald-100', roseBadge: 'bg-rose-900/40 text-rose-100 border-rose-800/50' },
                                { bg: 'bg-gradient-to-br from-[#c5a059] to-[#e5c185]', shadow: 'shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)]', avatar: 'bg-amber-900/40 text-amber-950 border-amber-900/20', text: 'text-amber-950', textLight: 'text-amber-950', label: 'text-amber-950/80', divider: 'border-amber-900/20', badge: 'bg-amber-950/25 text-amber-950 border-amber-950/20', accent: 'text-amber-950', roseBadge: 'bg-rose-900/40 text-rose-950 border-rose-900/20' },
                            ];
                            const g = gradients[idx % gradients.length];
                            return (
                            <div key={emp.id} onClick={() => handleOpenEditModal(emp)} className={`${g.bg} p-3 md:p-5 rounded-[16px] md:rounded-[28px] ${g.shadow} hover:scale-[1.02] transition-all duration-300 cursor-pointer group active:scale-[0.99]`}>
                                <div className="flex justify-between items-center mb-2 md:mb-4">
                                    <div className="flex items-center gap-2.5 md:gap-4">
                                        <div className={`w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-[2rem] flex items-center justify-center font-playfair font-bold text-sm md:text-2xl tracking-tight border shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform ${emp.role === 'SYSTEM_ADMIN' ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/30' : g.avatar}`}>{emp.name.charAt(0)}</div>
                                        <div>
                                            <h4 className={`text-xs md:text-base font-black uppercase tracking-tight leading-none ${g.textLight}`}>{emp.name}</h4>
                                            <p className={`text-[7px] md:text-[10px] ${g.text} font-bold uppercase mt-1 tracking-widest leading-none`}>{emp.id} • {emp.role.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[7px] md:text-[9px] font-black uppercase border tracking-wider ${emp.status === 'Active' ? g.badge : g.roseBadge}`}>{emp.status}</span>
                                </div>
                                <div className={`space-y-1 md:space-y-3 pt-2 md:pt-4 border-t ${g.divider}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[7px] md:text-[9px] font-black ${g.label} uppercase`}>Department</span>
                                        <span className={`text-[8px] md:text-[10px] font-black ${g.textLight} uppercase tracking-widest`}>{emp.department}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[7px] md:text-[9px] font-black ${g.label} uppercase`}>Password</span>
                                        <span className={`text-[8px] md:text-[10px] font-mono font-bold ${g.textLight}`}>{emp.password}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[7px] md:text-[9px] font-black ${g.label} uppercase`}>Access Status</span>
                                        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-tight ${emp.role === 'SYSTEM_ADMIN' ? 'text-indigo-300' : g.accent}`}>
                                            {emp.role === 'SYSTEM_ADMIN' ? 'Full Unrestricted' : `${Object.keys(emp.permissions || {}).length} Modules Grant`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                ) : (
                    <React.Fragment>
                    {/* Access Grid Legend */}
                    <div className="flex flex-wrap items-center gap-3 p-4 mb-3 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-medical-600"></div>
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Employee — Can access this module (standard view)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-indigo-600"></div>
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Admin — Elevated module access (e.g. see all records)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-white border border-slate-300"></div>
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">None — Module locked</span>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-[2rem] px-3 py-1.5">
                            <ShieldAlert size={12} className="text-amber-500" />
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Admin access here ≠ System Admin. Change Enterprise Role for full admin.</span>
                        </div>
                    </div>
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-300 md:overflow-x-auto shadow-sm mb-6">
                        <table className="w-full min-w-full md:min-w-[800px] text-left text-[11px] block md:table">
                            <thead className="bg-slate-50 border-b border-slate-300 sticky top-0 z-10 font-black uppercase tracking-widest text-slate-400 hidden md:table-header-group">
                                <tr><th className="px-4 md:px-8 py-2.5 w-48 md:w-64">Identity</th><th className="px-4 md:px-8 py-2.5">Permission Array Configuration</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 block md:table-row-group">
                                {filteredEmployees.map(emp => {
                                    const isAdmin = emp.role === 'SYSTEM_ADMIN';
                                    return (
                                        <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${isAdmin ? 'bg-indigo-50/10' : ''} block md:table-row p-4 md:p-0`}>
                                            <td className="px-0 md:px-8 py-2 md:py-6 block md:table-cell">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-[1.5rem] md:rounded-[2rem] flex shrink-0 items-center justify-center font-black text-white ${isAdmin ? 'bg-indigo-600' : 'bg-slate-200 text-slate-500'}`}>{emp.name.charAt(0)}</div>
                                                    <div>
                                                        <div className="font-black text-[11px] text-slate-800 uppercase tracking-tight leading-tight">{emp.name}</div>
                                                        <div className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">{emp.role.replace('_', ' ')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-0 md:px-8 py-2 md:py-6 block md:table-cell mt-2 md:mt-0">
                                                {(() => {
                                                    const isSuper = emp.email?.toLowerCase() === 'sreekumar.career@gmail.com';
                                                    
                                                    if (isSuper) {
                                                        return (
                                                            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-[2rem] border border-indigo-100 w-fit">
                                                                <ShieldAlert size={16} />
                                                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Super Admin Override: Unrestricted</span>
                                                            </div>
                                                        );
                                                    }

                                                    if (isAdmin) {
                                                        return (
                                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-[2rem] border border-emerald-100 w-fit">
                                                                <ShieldCheck size={16} />
                                                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">System Admin Override: Unrestricted</span>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex flex-row md:flex-wrap gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 [&::-webkit-scrollbar]:hidden snap-x">
                                                            {MODULE_OPTIONS.map(mod => {
                                                                const role = (emp.permissions || {})[mod.value];
                                                                const isPending = isUpdatingPermission === `${emp.id}-${mod.value}`;
                                                                return (
                                                                    <button
                                                                        key={mod.value}
                                                                        disabled={isUpdatingPermission !== null}
                                                                        onClick={() => togglePermission(emp.id, mod.value as TabView)}
                                                                        className={`px-3 py-2 md:px-3 md:py-1.5 rounded-lg md:rounded-lg border text-[8px] md:text-[9px] font-black uppercase transition-all active:scale-95 flex flex-col items-center justify-center shrink-0 snap-start min-w-[90px] md:min-w-0 ${
                                                                            isPending ? 'opacity-50 animate-pulse bg-slate-100 border-slate-300 text-slate-400' :
                                                                            role === 'Admin' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 
                                                                            role === 'Employee' ? 'bg-medical-600 text-white border-medical-600 shadow-md' : 
                                                                            'bg-white text-slate-400 border-slate-300 hover:border-medical-300 hover:text-medical-600'
                                                                        }`}
                                                                    >
                                                                        <span>{mod.label}</span>
                                                                        {role && <span className="text-[7px] opacity-70">({role})</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </React.Fragment>
                )}
            </div>

            {showEmployeeModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-2xl font-playfair font-bold tracking-tight text-slate-800 uppercase tracking-tight">{isEditing ? 'Modify Personnel' : 'New Personnel'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Role: {employeeFormData.role?.replace('_', ' ')}</p>
                            </div>
                            <button onClick={() => setShowEmployeeModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={28} /></button>
                        </div>
                        <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enterprise Role</label>
                                <div className="flex gap-2">
                                    {ROLE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setEmployeeFormData({ ...employeeFormData, role: opt.value })}
                                            className={`flex-1 py-3 rounded-[2rem] border text-[10px] font-black uppercase tracking-tight transition-all ${employeeFormData.role === opt.value ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-300'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name *</label>
                                <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none focus:border-medical-500 transition-all uppercase" value={employeeFormData.name || ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Login ID) *</label>
                                    <input type="email" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-bold outline-none focus:border-medical-500 transition-all" value={employeeFormData.email || ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Password *</label>
                                    <div className="relative">
                                        <input type="text" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none focus:border-medical-500 transition-all" value={employeeFormData.password || ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })} />
                                        <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept</label>
                                    <select className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none focus:border-medical-500 transition-all appearance-none" value={employeeFormData.department} onChange={(e) => setEmployeeFormData({ ...employeeFormData, department: e.target.value })}>
                                        <option>Administration</option><option>Sales</option><option>Service</option><option>Support</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Salary (₹)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none" value={employeeFormData.baseSalary || ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, baseSalary: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Allowance (₹/Day)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none" value={employeeFormData.dailyAllowance ?? ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, dailyAllowance: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Outstation Allowance (₹/Day)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-slate-50/50 rounded-[2rem] px-3 py-2 text-sm font-black outline-none" value={employeeFormData.outstationAllowance ?? ''} onChange={(e) => setEmployeeFormData({ ...employeeFormData, outstationAllowance: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-200 rounded-[2rem]">
                                <div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Hide From Leaderboard</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Excludes member rank and points from visual board</p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={employeeFormData.hideFromLeaderboard || false}
                                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, hideFromLeaderboard: e.target.checked })}
                                />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-300 bg-slate-50/50 rounded-b-[2.5rem]">
                            {showDeleteConfirm ? (
                                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-[2rem]">
                                        <ShieldAlert className="text-rose-600" size={20} />
                                        <p className="text-[10px] font-black text-rose-700 uppercase leading-tight">Security Protocol: Enter Registry Password to authorize permanent deletion.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            placeholder="Enter Password"
                                            className="flex-1 px-3 py-1.5 border border-rose-200 rounded-[2rem] text-xs font-black outline-none focus:border-rose-500"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button onClick={handleDeleteEmployee} className="bg-rose-600 text-white px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95">Confirm</button>
                                        <button onClick={() => { setShowDeleteConfirm(false); setConfirmPassword(''); }} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest">Abort</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <button onClick={() => { setShowEmployeeModal(false); setShowDeleteConfirm(false); setConfirmPassword(''); }} className="flex-1 py-4 bg-white border border-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400">Discard</button>
                                    {isEditing && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-4 bg-rose-50 text-rose-600 rounded-[2rem] hover:bg-rose-100 transition-all border border-rose-100"
                                            title="Delete Registry"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={handleSaveEmployee} className="flex-[2] py-4 bg-[#022c22] text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95">
                                        {isEditing ? <RefreshCw size={16} /> : <UserPlus size={16} />}
                                        <span>{isEditing ? 'COMMIT UPDATES' : 'INITIALIZE MEMBER'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
