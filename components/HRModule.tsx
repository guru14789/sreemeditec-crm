
import React, { useState, useEffect } from 'react';
import { Employee, PayrollRecord, LeaveRequest } from '../types';
import { Users, IndianRupee, FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock, CreditCard, ChevronRight, Download, MoreHorizontal, UserPlus, X, Calculator, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP001', name: 'Rahul Sharma', role: 'Sales Manager', department: 'Sales', email: 'rahul@medequip.com', phone: '9876543210', joinDate: '2022-03-15', baseSalary: 85000, status: 'Active' },
  { id: 'EMP002', name: 'Mike Ross', role: 'Sr. Technician', department: 'Service', email: 'mike@medequip.com', phone: '9876543211', joinDate: '2022-05-20', baseSalary: 65000, status: 'Active' },
  { id: 'EMP003', name: 'Priya Patel', role: 'HR Executive', department: 'HR', email: 'priya@medequip.com', phone: '9876543212', joinDate: '2023-01-10', baseSalary: 45000, status: 'On Leave' },
  { id: 'EMP004', name: 'Sarah Jenkins', role: 'Service Engineer', department: 'Service', email: 'sarah@medequip.com', phone: '9876543213', joinDate: '2023-06-01', baseSalary: 55000, status: 'Active' },
];

const MOCK_LEAVES: LeaveRequest[] = [
  { id: 'L-101', employeeName: 'Priya Patel', type: 'Sick', startDate: '2023-10-25', endDate: '2023-10-27', reason: 'Viral Fever', status: 'Approved' }, 
  { id: 'L-102', employeeName: 'Mike Ross', type: 'Casual', startDate: '2023-11-10', endDate: '2023-11-12', reason: 'Family Function', status: 'Pending' },
];

// Helper for Indian Number Formatting (K, L, Cr)
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  }
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

export const HRModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'leaves'>('employees');
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(MOCK_LEAVES);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    role: 'Sales Executive',
    department: 'Sales',
    status: 'Active',
    baseSalary: 30000
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

  const handleLeaveAction = (id: string, action: 'Approved' | 'Rejected') => {
    setLeaves(prev => prev.map(leave => 
      leave.id === id ? { ...leave, status: action } : leave
    ));
  };

  const handleAddEmployee = () => {
    if(!newEmployee.name || !newEmployee.email || !newEmployee.baseSalary) {
      alert("Please fill required fields");
      return;
    }
    const emp: Employee = {
      id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      name: newEmployee.name!,
      role: newEmployee.role || 'Staff',
      department: newEmployee.department || 'General',
      email: newEmployee.email!,
      phone: newEmployee.phone || '',
      joinDate: new Date().toISOString().split('T')[0],
      baseSalary: Number(newEmployee.baseSalary),
      status: 'Active'
    };
    
    setEmployees([...employees, emp]);
    const newRecord = calculatePayrollForEmployee(emp, 0);
    setPayroll(prev => [...prev, newRecord]);
    setShowAddEmployeeModal(false);
    setNewEmployee({ role: 'Sales Executive', department: 'Sales', status: 'Active', baseSalary: 30000 });
  };

  const totalPayrollCost = payroll.reduce((acc, curr) => acc + curr.netPay, 0);
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
        {/* Total Employees */}
        <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-3xl shadow-lg shadow-blue-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={100} />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="bg-white/10 p-3 rounded-2xl text-blue-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <Users size={24} />
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                    <TrendingUp size={12} /> Active
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-bold text-blue-200/80 uppercase tracking-wider">Total Headcount</p>
                <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{employees.length}</h3>
                <p className="text-xs text-blue-200/60 mt-1 font-medium">+2 New this month</p>
            </div>
        </div>

        {/* Payroll Cost */}
        <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <IndianRupee size={100} />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="bg-white/10 p-3 rounded-2xl text-emerald-300 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <IndianRupee size={24} />
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                    Monthly
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider">Est. Payroll Cost</p>
                <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹{formatIndianNumber(totalPayrollCost)}</h3>
                <p className="text-xs text-emerald-200/60 mt-1 font-medium">Processing for Oct 2023</p>
            </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-gradient-to-br from-orange-700 to-amber-800 p-6 rounded-3xl shadow-lg shadow-orange-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock size={100} />
            </div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="bg-white/10 p-3 rounded-2xl text-orange-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                    <Clock size={24} />
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                    <AlertCircle size={12} /> Action Needed
                </span>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-bold text-orange-200/80 uppercase tracking-wider">Pending Leaves</p>
                <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{pendingLeaves}</h3>
                <p className="text-xs text-orange-200/60 mt-1 font-medium">Requires approval</p>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        
        {/* Tab Navigation */}
        <div className="border-b border-slate-100 flex justify-between items-center px-6 py-4">
            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl">
                <button 
                    onClick={() => setActiveTab('employees')}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'employees' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Employees
                </button>
                <button 
                    onClick={() => setActiveTab('payroll')}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'payroll' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Payroll Processing
                </button>
                <button 
                    onClick={() => setActiveTab('leaves')}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'leaves' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Leave Requests
                </button>
            </div>
            
            {activeTab === 'employees' && (
                <button 
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-medical-500/20 transition-all active:scale-95">
                    <UserPlus size={16} /> Add Employee
                </button>
            )}
            
            {activeTab === 'payroll' && (
                <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
                    <Download size={16} /> Export CSV
                </button>
            )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6 custom-scrollbar">
            
            {/* EMPLOYEES TAB */}
            {activeTab === 'employees' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Role & Dept</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Join Date</th>
                                <th className="px-6 py-4 text-right">Fixed Base Salary</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{emp.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{emp.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700 font-medium">{emp.role}</div>
                                        <div className="text-[10px] text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded-full mt-1 border border-slate-200">{emp.department}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{emp.email}</div>
                                        <div className="text-xs text-slate-400 font-medium">{emp.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{emp.joinDate}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{emp.baseSalary.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                            emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-medical-600 p-2 hover:bg-slate-100 rounded-full transition-colors">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAYROLL TAB */}
            {activeTab === 'payroll' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-blue-50/50 text-blue-800 text-xs border-b border-blue-100 flex items-center gap-2 font-medium">
                        <Calculator size={14} className="text-blue-600" /> 
                        <span>Payroll is calculated based on 30 working days. Net Pay = (Earned Basic + Earned HRA) - (PF + Tax).</span>
                    </div>
                     <table className="w-full text-left text-sm text-slate-600 min-w-[1000px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4 text-center">Attendance</th>
                                <th className="px-6 py-4 text-right">Earned Base</th>
                                <th className="px-6 py-4 text-right">Allowances</th>
                                <th className="px-6 py-4 text-right">Deductions</th>
                                <th className="px-6 py-4 text-right font-bold text-slate-800">Net Pay</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payroll.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{record.employeeName}</div>
                                        <div className="text-xs text-slate-400 font-medium">{record.month}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-slate-700">{record.attendanceDays} Days</span>
                                            {record.lopDays > 0 ? (
                                                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 mt-1 font-bold">
                                                    -{record.lopDays} LOP
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-green-600 mt-1 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Full Attendance</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                                        ₹{(Math.round((record.baseSalary / 30) * record.attendanceDays)).toLocaleString()}
                                        <div className="text-[10px] text-slate-400">of ₹{record.baseSalary.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">+₹{record.allowances.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-500 font-medium">-₹{record.deductions.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-black text-slate-800">₹{record.netPay.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                            record.status === 'Paid' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {record.status}
                                        </span>
                                        {record.paymentDate && <div className="text-[10px] text-slate-400 mt-1 font-mono">{record.paymentDate}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {record.status === 'Pending' ? (
                                            <button 
                                                onClick={() => handleProcessPayroll(record.id)}
                                                className="bg-medical-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-medical-700 flex items-center gap-1 ml-auto shadow-sm shadow-medical-500/20">
                                                <CreditCard size={14} /> Pay Now
                                            </button>
                                        ) : (
                                            <button className="text-slate-400 hover:text-medical-600 flex items-center gap-1 ml-auto text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-white transition-colors">
                                                <FileText size={14} /> Slip
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* LEAVES TAB */}
            {activeTab === 'leaves' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {leaves.map(leave => (
                        <div key={leave.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold border border-white shadow-sm">
                                        {leave.employeeName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{leave.employeeName}</h4>
                                        <span className="text-[10px] text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 uppercase font-bold tracking-wide">{leave.type} Leave</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                                    leave.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                    leave.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
                                    'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                }`}>
                                    {leave.status}
                                </span>
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs font-bold uppercase">From</span>
                                    <span className="font-semibold text-slate-700">{leave.startDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 text-xs font-bold uppercase">To</span>
                                    <span className="font-semibold text-slate-700">{leave.endDate}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 mt-2">
                                    <p className="text-slate-600 text-xs italic leading-relaxed">"{leave.reason}"</p>
                                </div>
                            </div>

                            {leave.status === 'Pending' && (
                                <div className="flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => handleLeaveAction(leave.id, 'Approved')}
                                        className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2.5 rounded-xl text-xs font-bold hover:bg-green-100 flex items-center justify-center gap-2 transition-colors">
                                        <CheckCircle size={14} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleLeaveAction(leave.id, 'Rejected')}
                                        className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2 transition-colors">
                                        <XCircle size={14} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {leaves.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            No leave requests found.
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                     <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <UserPlus className="text-medical-600" size={24} /> Add New Employee
                    </h3>
                    <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name *</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                            placeholder="e.g. John Doe"
                            value={newEmployee.name || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
                            <input 
                                type="text"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                placeholder="e.g. Manager"
                                value={newEmployee.role || ''}
                                onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                            <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none appearance-none"
                                value={newEmployee.department || 'General'}
                                onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                            >
                                <option value="Sales">Sales</option>
                                <option value="Service">Service</option>
                                <option value="HR">HR</option>
                                <option value="Logistics">Logistics</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                        <input 
                            type="email" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                            placeholder="john@company.com"
                            value={newEmployee.email || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
                        <input 
                            type="tel" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                            placeholder="9876543210"
                            value={newEmployee.phone || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Base Salary (Monthly ₹) *</label>
                         <input 
                            type="number" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                            value={newEmployee.baseSalary || 0}
                            onChange={(e) => setNewEmployee({...newEmployee, baseSalary: Number(e.target.value)})}
                         />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                    <button 
                        onClick={() => setShowAddEmployeeModal(false)}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleAddEmployee}
                        className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                        <UserPlus size={18} /> Add Employee
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
