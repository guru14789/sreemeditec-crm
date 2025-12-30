
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, AppNotification } from '../types';

export interface DataContextType {
  clients: Client[];
  vendors: Vendor[];
  products: Product[];
  invoices: Invoice[];
  stockMovements: StockMovement[];
  expenses: ExpenseRecord[];
  employees: Employee[];
  notifications: AppNotification[];
  
  // Performance & Points
  userStats: UserStats;
  pointHistory: PointHistory[];
  prizePool: number;
  addPoints: (amount: number, category: PointHistory['category'], description: string) => void;
  updatePrizePool: (amount: number) => void;

  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  removeVendor: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Invoice) => void;
  recordStockMovement: (movement: StockMovement) => void;
  
  // Expense Actions
  addExpense: (expense: ExpenseRecord) => void;
  updateExpenseStatus: (id: string, status: ExpenseRecord['status']) => void;

  // HR & Employees
  addEmployee: (emp: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;

  // Notification Actions
  addNotification: (title: string, message: string, type: AppNotification['type']) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_CLIENTS: Client[] = [
  { id: 'CLI-001', name: 'Dr. Sarah Smith', hospital: 'City General Hospital', address: '45 Medical Park Rd, Bangalore\nKarnataka - 560038', gstin: '29ABCDE1234F1Z5', phone: '9876543210', email: 'sarah.s@citygeneral.com' },
  { id: 'CLI-002', name: 'Mr. Rajesh Kumar', hospital: 'Apollo Clinic', address: 'Plot 12, Sector 5, Rohini, New Delhi - 110085', gstin: '07XXXYY1234A1Z9', phone: '9988776655', email: 'rajesh.k@apollo.com' },
  { id: 'CLI-003', name: 'Sree Meditec Demo', hospital: 'Sree Meditec HQ', address: 'No: 18, Bajanai Koil Street, Chennai - 600 073', gstin: '33APGPS4675G2ZL', phone: '9884818398' },
];

const INITIAL_VENDORS: Vendor[] = [
  { id: 'VEN-001', name: 'Philips Global India', contactPerson: 'Arun V.', address: 'Phase 1, Hinjewadi, Pune - 411057', gstin: '27AADCP3525F1ZK', email: 'service@philips.co.in', phone: '18002581234' },
  { id: 'VEN-002', name: 'MediGel Solutions', contactPerson: 'Sanjay Gupta', address: 'GIDC Industrial Area, Ahmedabad - 380001', gstin: '24BBXPP1234Q1Z2', email: 'sales@medigel.in', phone: '9122334455' },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'EMP001', name: 'Rahul Sharma', role: 'Sales Manager', department: 'Sales', email: 'rahul@sreemeditec.com', phone: '9876543210', joinDate: '2022-03-15', baseSalary: 85000, status: 'Active', permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.EXPENSES, TabView.PERFORMANCE, TabView.PROFILE] },
  { id: 'EMP002', name: 'Mike Ross', role: 'Sr. Technician', department: 'Service', email: 'mike@sreemeditec.com', phone: '9876543211', joinDate: '2022-05-20', baseSalary: 65000, status: 'Active', permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.SERVICE_ORDERS] },
  { id: 'EMP003', name: 'Priya Patel', role: 'HR Executive', department: 'HR', email: 'priya@sreemeditec.com', phone: '9876543212', joinDate: '2023-01-10', baseSalary: 45000, status: 'On Leave', permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.PROFILE] },
  { id: 'EMP004', name: 'Sarah Jenkins', role: 'Service Engineer', department: 'Service', email: 'sarah@sreemeditec.com', phone: '9876543213', joinDate: '2023-06-01', baseSalary: 55000, status: 'Active', permissions: [TabView.TASKS, TabView.ATTENDANCE, TabView.SERVICE_ORDERS, TabView.PROFILE] },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'P-1', name: 'MRI Coil (Head)', category: 'Spare Part', sku: 'MRI-H-001', stock: 2, price: 15000, minLevel: 3, location: 'Shelf A1', model: 'Philips Achieva 1.5T', hsn: '9018', taxRate: 12, description: 'High signal-to-noise ratio\nCompatible with 1.5T systems', supplier: 'Philips Global' },
  { id: 'P-2', name: 'Ultrasound Gel (5L)', category: 'Consumable', sku: 'USG-GEL-5L', stock: 150, price: 25, minLevel: 50, location: 'Warehouse B', model: 'EchoMax Standard', hsn: '3006', taxRate: 12, description: 'Hypoallergenic\nWater soluble\nNon-staining', supplier: 'MediGel India' },
  { id: 'P-3', name: 'Patient Monitor X12', category: 'Equipment', sku: 'PM-X12', stock: 8, price: 1200, minLevel: 5, location: 'Showroom', model: 'PM-X12 Pro', hsn: '9018', taxRate: 18, description: '12-inch Touchscreen\nECG, SpO2, NIBP, Resp, Temp', supplier: 'CareTech Solutions' },
  { id: 'P-4', name: 'X-Ray Tube Housing', category: 'Spare Part', sku: 'XR-TB-99', stock: 1, price: 4500, minLevel: 2, location: 'Shelf C4', model: 'Varian Compatible', hsn: '9022', taxRate: 18, description: 'Heavy duty anode\n150kVp rated', supplier: 'Global X-Ray Parts' }
];

const INITIAL_INVOICES: Invoice[] = [
  { id: 'INV-001', invoiceNumber: 'SMCPO-001', documentType: 'PO', date: '2023-10-20', dueDate: '2023-11-20', customerName: 'Dr. Sarah Smith', customerHospital: 'City General Hospital', customerAddress: '45 Medical Park Rd, Bangalore', customerGstin: '29ABCDE1234F1Z5', items: [{ id: '1', description: 'Philips MRI Coil (Head)', hsn: '9018', quantity: 1, unitPrice: 15000, taxRate: 12, amount: 15000, gstValue: 1800, priceWithGst: 16800 }], subtotal: 15000, taxTotal: 1800, grandTotal: 16800, status: 'Partial', paymentMethod: 'Bank Transfer', smcpoNumber: 'SMCPO-001', cpoNumber: 'CPO-9981', cpoDate: '2023-10-18', deliveryAddress: 'City General Hospital, Main Block', advanceAmount: 5000, advanceDate: '2023-10-20', advanceMode: 'NEFT', bankDetails: 'HDFC Bank, Adyar Branch', deliveryTime: '2 Weeks', specialNote: 'Warranty valid for 1 year from installation.', payments: [{ id: 'PAY-1', date: '2023-10-20', amount: 5000, mode: 'NEFT', reference: 'REF123' }], totalPaid: 5000, balanceDue: 11800 },
  { id: 'Q-001', invoiceNumber: 'QT-2023-001', documentType: 'Quotation', date: '2023-10-25', dueDate: '2023-11-25', customerName: 'Mr. Rajesh Kumar', customerHospital: 'Apollo Clinic', customerAddress: 'Plot 12, Sector 5, Rohini, New Delhi', customerGstin: '07XXXYY1234A1Z9', items: [{ id: '1', description: 'Patient Monitor X12', hsn: '9018', quantity: 2, unitPrice: 1200, taxRate: 18, amount: 2400, gstValue: 432, priceWithGst: 2832 }], subtotal: 2400, taxTotal: 432, grandTotal: 2832, status: 'Pending', smcpoNumber: 'QT-2023-001', subject: 'Quotation for Patient Monitors', paymentTerms: '100% advance before delivery.', deliveryTerms: 'Ex-stock, subject to prior sale.', warrantyTerms: 'Standard 1 year warranty.', totalPaid: 0, balanceDue: 2832 }
];

const INITIAL_MOVEMENTS: StockMovement[] = [
  { id: 'MOV-001', productId: 'P-1', productName: 'Philips MRI Coil (Head)', type: 'Out', quantity: 1, date: '2023-10-20', reference: 'SMCPO-001', purpose: 'Sale' }
];

const INITIAL_EXPENSES: ExpenseRecord[] = [
  { id: 'EXP-001', employeeName: 'Rahul Sharma', date: '2023-10-25', category: 'Travel', amount: 450, description: 'Auto fare to Apollo Hospital', status: 'Approved' },
  { id: 'EXP-002', employeeName: 'Rahul Sharma', date: '2023-10-26', category: 'Food', amount: 120, description: 'Lunch during client visit', status: 'Pending' },
  { id: 'EXP-003', employeeName: 'Admin User', date: '2023-10-24', category: 'Supplies', amount: 2500, description: 'Office stationery', status: 'Approved' },
  { id: 'EXP-004', employeeName: 'Mike Ross', date: '2023-10-27', category: 'Travel', amount: 1500, description: 'Train ticket for Service Call', status: 'Pending' },
];

const INITIAL_STATS: UserStats = {
    points: 2450,
    tasksCompleted: 45,
    attendanceStreak: 12,
    salesRevenue: 450000
};

const INITIAL_HISTORY: PointHistory[] = [
    { id: 'PH-1', date: '2023-10-25', points: 50, category: 'Sales', description: 'Lead Converted: Dr. Smith' },
    { id: 'PH-2', date: '2023-10-26', points: 10, category: 'Attendance', description: 'On-time Check-in' },
    { id: 'PH-3', date: '2023-10-26', points: 15, category: 'Task', description: 'Task Done (On Time)' },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'N1', title: 'System Active', message: 'Welcome back to Sree Meditec CRM.', time: 'Just now', type: 'info', read: false }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>(INITIAL_HISTORY);
  const [prizePool, setPrizePool] = useState<number>(1500);

  const addClient = (client: Client) => setClients(prev => [...prev, client]);
  const updateClient = (id: string, client: Partial<Client>) => setClients(prev => prev.map(c => c.id === id ? { ...c, ...client } : c));
  
  const addVendor = (vendor: Vendor) => setVendors(prev => [...prev, vendor]);
  const updateVendor = (id: string, vendor: Partial<Vendor>) => setVendors(prev => prev.map(v => v.id === id ? { ...v, ...vendor } : v));
  const removeVendor = (id: string) => setVendors(prev => prev.filter(v => v.id !== id));

  const addProduct = (product: Product) => setProducts(prev => [...prev, product]);
  const updateProduct = (id: string, updates: Partial<Product>) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const removeProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const addInvoice = (invoice: Invoice) => setInvoices(prev => [invoice, ...prev]);
  const updateInvoice = (id: string, updatedInvoice: Invoice) => setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
  const recordStockMovement = (movement: StockMovement) => setStockMovements(prev => [movement, ...prev]);
  const addExpense = (expense: ExpenseRecord) => setExpenses(prev => [expense, ...prev]);
  const updateExpenseStatus = (id: string, status: ExpenseRecord['status']) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  
  const addEmployee = (emp: Employee) => setEmployees(prev => [...prev, emp]);
  const updateEmployee = (id: string, updates: Partial<Employee>) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  const removeEmployee = (id: string) => setEmployees(prev => prev.filter(e => e.id !== id));

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      title,
      message,
      time: 'Just now',
      type,
      read: false,
      isNewToast: true
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, isNewToast: false } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addPoints = (amount: number, category: PointHistory['category'], description: string) => {
      const newHistory: PointHistory = {
          id: `PH-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          points: amount,
          category,
          description
      };
      setPointHistory(prev => [newHistory, ...prev]);
      setUserStats(prev => ({
          ...prev,
          points: prev.points + amount,
          tasksCompleted: category === 'Task' ? prev.tasksCompleted + 1 : prev.tasksCompleted
      }));
  };

  const updatePrizePool = (amount: number) => setPrizePool(amount);

  return (
    <DataContext.Provider value={{ 
        clients, vendors, products, invoices, stockMovements, expenses, employees, notifications,
        addClient, updateClient, addVendor, updateVendor, removeVendor,
        addProduct, updateProduct, removeProduct,
        addInvoice, updateInvoice, recordStockMovement, addExpense, updateExpenseStatus,
        addEmployee, updateEmployee, removeEmployee,
        userStats, pointHistory, addPoints, addNotification, markNotificationRead, clearAllNotifications,
        prizePool, updatePrizePool
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
