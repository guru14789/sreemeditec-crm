
import React, { useState, useEffect } from 'react';
import { Employee, PayrollRecord, LeaveRequest } from '../types';
import { Users, IndianRupee, FileText, Plus, Search, Filter, CheckCircle, XCircle, Clock, CreditCard, ChevronRight, Download, MoreHorizontal, UserPlus, X, Calculator } from 'lucide-react';

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'EMP001', name: 'Rahul Sharma', role: 'Sales Manager', department: 'Sales', email: 'rahul@medequip.com', phone: '9876543210', joinDate: '2022-03-15', baseSalary: 85000, status: 'Active' },
  { id: 'EMP002', name: 'Mike Ross', role: 'Sr. Technician', department: 'Service', email: 'mike@medequip.com', phone: '9876543211', joinDate: '2022-05-20', baseSalary: 65000, status: 'Active' },
  { id: 'EMP003', name: 'Priya Patel', role: 'HR Executive', department: 'HR', email: 'priya@medequip.com', phone: '9876543212', joinDate: '2023-01-10', baseSalary: 45000, status: 'On Leave' },
  { id: 'EMP004', name: 'Sarah Jenkins', role: 'Service Engineer', department: 'Service', email: 'sarah@medequip.com', phone: '9876543213', joinDate: '2023-06-01', baseSalary: 55000, status: 'Active' },
];

const MOCK_LEAVES: LeaveRequest[] = [
  { id: 'L-101', employeeName: 'Priya Patel', type: 'Sick', startDate: '2023-10-25', endDate: '2023-10-27', reason: 'Viral Fever', status: 'Approved' }, // Approved = Paid Leave usually
  { id: 'L-102', employeeName: 'Mike Ross', type: 'Casual', startDate: '2023-11-10', endDate: '2023-11-12', reason: 'Family Function', status: 'Pending' },
];

// Calculation Logic
const calculatePayrollForEmployee = (emp: Employee, lopDays: number = 0): PayrollRecord => {
  const TOTAL_WORKING_DAYS = 30;
  const paidDays = TOTAL_WORKING_DAYS - lopDays;
  
  // Pro-rata Calculation
  const earnedBasic = (emp.baseSalary / TOTAL_WORKING_DAYS) * paidDays;
  
  // HRA is 40% of Basic
  const fullHra = emp.baseSalary * 0.40;
  const earnedHra = (fullHra / TOTAL_WORKING_DAYS) * paidDays;
  
  // PF is 12% of Earned Basic
  const pfDeduction = earnedBasic * 0.12;
  const taxDeduction = earnedBasic > 50000 ? earnedBasic * 0.10 : 0; // Simple tax logic
  
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
  
  // Modal State
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    role: 'Sales Executive',
    department: 'Sales',
    status: 'Active',
    baseSalary: 30000
  });

  // Initialize Payroll on load
  useEffect(() => {
    // Simulate fetching attendance: Randomly assign LOP days for demo
    const initialPayroll = employees.map(emp => {
        // Simple logic: If status is 'On Leave', assume some LOP for demo if not approved
        let lop = 0;
        if (emp.name === 'Sarah Jenkins') lop = 2; // Demo: Sarah was absent 2 days
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
    // In a real app, approving an unpaid leave would trigger payroll recalculation here
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
    // Add payroll record
    const newRecord = calculatePayrollForEmployee(emp, 0);
    setPayroll(prev => [...prev, newRecord]);

    setShowAddEmployeeModal(false);
    setNewEmployee({ role: 'Sales Executive', department: 'Sales', status: 'Active', baseSalary: 30000 });
  };

  // Stats
  const totalPayrollCost = payroll.reduce((acc, curr) => acc + curr.netPay, 0);
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-1">
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Total Employees</p>
                <h3 className="text-2xl font-bold text-slate-800">{employees.length}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Users size={20} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Est. Monthly Payroll</p>
                <h3 className="text-2xl font-bold text-slate-800">₹{totalPayrollCost.toLocaleString()}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full text-green-600">
                <IndianRupee size={20} />
            </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium">Pending Leaves</p>
                <h3 className="text-2xl font-bold text-orange-600">{pendingLeaves}</h3>
            </div>
            <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                <Clock size={20} />
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        
        {/* Tab Navigation */}
        <div className="border-b border-slate-100 flex justify-between items-center px-6">
            <nav className="flex gap-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('employees')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'employees' ? 'border-medical-500 text-medical-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Employees
                </button>
                <button 
                    onClick={() => setActiveTab('payroll')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'payroll' ? 'border-medical-500 text-medical-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Payroll Processing
                </button>
                <button 
                    onClick={() => setActiveTab('leaves')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'leaves' ? 'border-medical-500 text-medical-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Leave Requests
                </button>
            </nav>
            
            {activeTab === 'employees' && (
                <button 
                    onClick={() => setShowAddEmployeeModal(true)}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                    <UserPlus size={16} /> Add Employee
                </button>
            )}
            
            {activeTab === 'payroll' && (
                <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                    <Download size={16} /> Export CSV
                </button>
            )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4">
            
            {/* EMPLOYEES TAB */}
            {activeTab === 'employees' && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Employee</th>
                                <th className="px-6 py-3">Role & Dept</th>
                                <th className="px-6 py-3">Contact</th>
                                <th className="px-6 py-3">Join Date</th>
                                <th className="px-6 py-3 text-right">Fixed Base Salary</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{emp.name}</div>
                                        <div className="text-xs text-slate-400">{emp.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{emp.role}</div>
                                        <div className="text-xs text-slate-400 bg-slate-100 inline-block px-1.5 py-0.5 rounded mt-1">{emp.department}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{emp.email}</div>
                                        <div className="text-xs text-slate-400">{emp.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">{emp.joinDate}</td>
                                    <td className="px-6 py-4 text-right font-medium">₹{emp.baseSalary.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                            emp.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        }`}>
                                            {emp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-medical-600">
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
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-blue-50 text-blue-800 text-xs border-b border-blue-100 flex items-center gap-2">
                        <Calculator size={14} /> 
                        <span>Payroll is calculated based on 30 working days. Net Pay = (Earned Basic + Earned HRA) - (PF + Tax).</span>
                    </div>
                     <table className="w-full text-left text-sm text-slate-600 min-w-[1000px]">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Employee</th>
                                <th className="px-6 py-3 text-center">Attendance</th>
                                <th className="px-6 py-3 text-right">Earned Base</th>
                                <th className="px-6 py-3 text-right">Allowances</th>
                                <th className="px-6 py-3 text-right">Deductions</th>
                                <th className="px-6 py-3 text-right font-bold text-slate-700">Net Pay</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payroll.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{record.employeeName}</div>
                                        <div className="text-xs text-slate-400">{record.month}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-medium text-slate-700">{record.attendanceDays} Days</span>
                                            {record.lopDays > 0 ? (
                                                <span className="text-[10px] text-red-600 bg-red-50 px-1.5 rounded border border-red-100 mt-0.5">
                                                    -{record.lopDays} LOP
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-green-600 mt-0.5">Full Attendance</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500">
                                        ₹{(Math.round((record.baseSalary / 30) * record.attendanceDays)).toLocaleString()}
                                        <div className="text-[10px] text-slate-300">of ₹{record.baseSalary.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600">+₹{record.allowances.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-500">-₹{record.deductions.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800">₹{record.netPay.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            record.status === 'Paid' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {record.status}
                                        </span>
                                        {record.paymentDate && <div className="text-[10px] text-slate-400 mt-1">{record.paymentDate}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {record.status === 'Pending' ? (
                                            <button 
                                                onClick={() => handleProcessPayroll(record.id)}
                                                className="bg-medical-600 text-white px-3 py-1.5 rounded text-xs hover:bg-medical-700 flex items-center gap-1 ml-auto">
                                                <CreditCard size={12} /> Pay Now
                                            </button>
                                        ) : (
                                            <button className="text-slate-400 hover:text-medical-600 flex items-center gap-1 ml-auto text-xs">
                                                <FileText size={12} /> Slip
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaves.map(leave => (
                        <div key={leave.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                        {leave.employeeName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{leave.employeeName}</h4>
                                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">{leave.type} Leave</span>
                                    </div>
                                </div>
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                    leave.status === 'Approved' ? 'bg-green-50 text-green-700' :
                                    leave.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                    'bg-yellow-50 text-yellow-700'
                                }`}>
                                    {leave.status}
                                </span>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-500">From:</span>
                                    <span className="font-medium text-slate-700">{leave.startDate}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-slate-500">To:</span>
                                    <span className="font-medium text-slate-700">{leave.endDate}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200">
                                    <p className="text-slate-500 text-xs italic">"{leave.reason}"</p>
                                </div>
                            </div>

                            {leave.status === 'Pending' && (
                                <div className="flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => handleLeaveAction(leave.id, 'Approved')}
                                        className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center justify-center gap-2">
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleLeaveAction(leave.id, 'Rejected')}
                                        className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2">
                                        <XCircle size={16} /> Reject
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserPlus className="text-medical-600" /> Add New Employee
                    </h3>
                    <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            placeholder="e.g. John Doe"
                            value={newEmployee.name || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <input 
                                type="text"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                placeholder="e.g. Manager"
                                value={newEmployee.role || ''}
                                onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                        <input 
                            type="email" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            placeholder="john@company.com"
                            value={newEmployee.email || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                        <input 
                            type="tel" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            placeholder="9876543210"
                            value={newEmployee.phone || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Base Salary (Monthly ₹) *</label>
                         <input 
                            type="number" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            value={newEmployee.baseSalary || 0}
                            onChange={(e) => setNewEmployee({...newEmployee, baseSalary: Number(e.target.value)})}
                         />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button 
                        onClick={() => setShowAddEmployeeModal(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleAddEmployee}
                        className="px-6 py-2 bg-medical-600 text-white font-medium rounded-lg hover:bg-medical-700 shadow-sm flex items-center gap-2 transition-all">
                        <UserPlus size={18} /> Add Employee
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};