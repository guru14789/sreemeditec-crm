
import React, { useState } from 'react';
import { Employee, TabView, EnterpriseRole } from '../types';
import { 
    Users, Search, ShieldCheck, X, RefreshCw, UserPlus, Lock, ShieldAlert
} from 'lucide-react';
import { useData } from './DataContext';

const MODULE_OPTIONS = [
    { value: TabView.DASHBOARD, label: 'Dashboard' },
    { value: TabView.PROFILE, label: 'My Profile' },
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
    { value: TabView.REPORTS, label: 'Reports' },
    { value: TabView.PERFORMANCE, label: 'Leaderboard' },
    { value: TabView.HR, label: 'HR Management' },
];

const ROLE_OPTIONS: { value: EnterpriseRole; label: string }[] = [
    { value: 'SYSTEM_ADMIN', label: 'System Admin (Super)' },
    { value: 'SYSTEM_STAFF', label: 'System Staff (Restricted)' }
];

export const HRModule: React.FC = () => {
  const { employees, updateEmployee, registerEmployee, removeEmployee, addNotification } = useData();
  const [activeTab, setActiveTab] = useState<'employees' | 'permissions'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({
    role: 'SYSTEM_STAFF',
    department: 'Sales',
    status: 'Active',
    baseSalary: 30000,
    permissions: [TabView.DASHBOARD]
  });
  const [password, setPassword] = useState('');

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedEmployeeId(null);
    setEmployeeFormData({
        role: 'SYSTEM_STAFF',
        department: 'Sales',
        status: 'Active',
        baseSalary: 30000,
        joinDate: new Date().toISOString().split('T')[0],
        permissions: [TabView.DASHBOARD]
    });
    setPassword(Math.random().toString(36).slice(-10));
    setShowEmployeeModal(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setIsEditing(true);
    setSelectedEmployeeId(emp.uid);
    setEmployeeFormData({ ...emp });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async () => {
    if(!employeeFormData.name || !employeeFormData.email || (!isEditing && !password)) {
      alert("Name, Email, and Password are mandatory.");
      return;
    }
    
    setIsProcessing(true);
    try {
        if (isEditing && selectedEmployeeId) {
            await updateEmployee(selectedEmployeeId, employeeFormData);
            addNotification('Registry Updated', `Staff record for ${employeeFormData.name} synced.`, 'success');
        } else {
            await registerEmployee(employeeFormData, password);
            addNotification('Staff Registered', `${employeeFormData.name} successfully provisioned.`, 'success');
        }
        setShowEmployeeModal(false);
    } catch (err: any) {
        console.error("Auth Creation Error:", err);
        let msg = "Provisioning failed.";
        if (err.code === 'auth/email-already-in-use') msg = "Staff member already has an account.";
        if (err.code === 'auth/weak-password') msg = "Password too weak for security standards.";
        addNotification('Registry Error', msg, 'alert');
    } finally {
        setIsProcessing(false);
    }
  };

  const togglePermission = (uid: string, tab: TabView) => {
      const emp = employees.find(e => e.uid === uid);
      if (!emp || emp.role === 'SYSTEM_ADMIN') return;
      const currentPerms = emp.permissions || [];
      const newPerms = currentPerms.includes(tab) ? currentPerms.filter(t => t !== tab) : [...currentPerms, tab];
      updateEmployee(uid, { permissions: newPerms });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4 transition-colors">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 shadow-inner">
            <button onClick={() => setActiveTab('employees')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'employees' ? 'bg-white dark:bg-slate-700 text-medical-700 dark:text-medical-400 shadow-sm' : 'text-slate-500'}`}><Users size={14}/> Registry</button>
            <button onClick={() => setActiveTab('permissions')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'permissions' ? 'bg-white dark:bg-slate-700 text-medical-700 dark:text-medical-400 shadow-sm' : 'text-slate-500'}`}><ShieldCheck size={14}/> Access Grid</button>
        </div>
        <div className="flex gap-3 w-full sm:w-auto flex-1 justify-end">
            <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search staff..." className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl text-sm w-full outline-none focus:border-medical-500 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={handleOpenAddModal} className="bg-[#022c22] text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2">+ Add Member</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'employees' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                {filteredEmployees.map(emp => (
                    <div key={emp.uid} onClick={() => handleOpenEditModal(emp)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-inner group-hover:scale-110 transition-transform ${emp.role === 'SYSTEM_ADMIN' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-medical-50 dark:bg-medical-900/30 text-medical-700 dark:text-medical-400 border-medical-100 dark:border-medical-800'}`}>{emp.name.charAt(0)}</div>
                                <div>
                                    <h4 className="font-black text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight">{emp.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{emp.id} • {emp.role.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wider ${emp.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-800'}`}>{emp.status}</span>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Department</span>
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{emp.department}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Security ID</span>
                                <span className="text-[9px] font-mono font-bold text-slate-400 truncate max-w-[100px]">{emp.uid}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase">Access Status</span>
                                <span className={`text-[10px] font-black uppercase tracking-tight ${emp.role === 'SYSTEM_ADMIN' ? 'text-indigo-600 dark:text-indigo-400' : 'text-medical-600 dark:text-medical-400'}`}>
                                    {emp.role === 'SYSTEM_ADMIN' ? 'Full Unrestricted' : `${emp.permissions?.length || 0} Modules Grant`}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm mb-6 transition-colors">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-10 font-black uppercase tracking-widest text-slate-400">
                        <tr><th className="px-8 py-5 w-64">Identity</th><th className="px-8 py-5">Permission Array Configuration</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredEmployees.map(emp => {
                            const isAdmin = emp.role === 'SYSTEM_ADMIN';
                            return (
                                <tr key={emp.uid} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isAdmin ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''}`}>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${isAdmin ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{emp.name.charAt(0)}</div>
                                            <div>
                                                <div className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{emp.name}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{emp.role.replace('_', ' ')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {isAdmin ? (
                                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800 w-fit">
                                                <ShieldAlert size={16} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Admin Override Active: All Tabs Accessible</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {MODULE_OPTIONS.map(mod => {
                                                    const isChecked = emp.permissions?.includes(mod.value);
                                                    return (
                                                        <button 
                                                            key={mod.value} 
                                                            onClick={() => togglePermission(emp.uid, mod.value)} 
                                                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all active:scale-95 ${isChecked ? 'bg-medical-600 text-white border-medical-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-medical-300 hover:text-medical-600'}`}
                                                        >
                                                            {mod.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {showEmployeeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                     <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{isEditing ? 'Modify Personnel' : 'New Personnel'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Role: {employeeFormData.role?.replace('_', ' ')}</p>
                     </div>
                    <button onClick={() => setShowEmployeeModal(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={28} /></button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enterprise Role</label>
                        <div className="flex gap-2">
                            {ROLE_OPTIONS.map(opt => (
                                <button 
                                    key={opt.value}
                                    onClick={() => setEmployeeFormData({...employeeFormData, role: opt.value})}
                                    className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all ${employeeFormData.role === opt.value ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name *</label>
                        <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500 transition-all uppercase dark:text-white" value={employeeFormData.name || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email (Auth ID) *</label>
                            <input type="email" disabled={isEditing} className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-medical-500 transition-all dark:text-white disabled:opacity-50" value={employeeFormData.email || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{isEditing ? 'Security ID' : 'Login Key *'}</label>
                            <div className="relative">
                                {isEditing ? (
                                    <input type="text" disabled className="w-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-3 text-[10px] font-mono font-bold outline-none dark:text-white" value={employeeFormData.uid} />
                                ) : (
                                    <>
                                        <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500 transition-all dark:text-white" value={password} onChange={(e) => setPassword(e.target.value)} />
                                        <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept</label>
                            <select className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500 transition-all appearance-none dark:text-white" value={employeeFormData.department} onChange={(e) => setEmployeeFormData({...employeeFormData, department: e.target.value})}>
                                <option>Administration</option><option>Sales</option><option>Service</option><option>Support</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Salary (₹)</label>
                            <input type="number" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 text-sm font-black outline-none dark:text-white" value={employeeFormData.baseSalary || ''} onChange={(e) => setEmployeeFormData({...employeeFormData, baseSalary: Number(e.target.value)})} />
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-[2.5rem]">
                    <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400">Discard</button>
                    <button onClick={handleSaveEmployee} disabled={isProcessing} className="flex-[2] py-4 bg-[#022c22] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                         {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : isEditing ? <RefreshCw size={16} /> : <UserPlus size={16} />}
                         <span>{isProcessing ? 'PROVISIONING...' : isEditing ? 'COMMIT UPDATES' : 'INITIALIZE MEMBER'}</span>
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
