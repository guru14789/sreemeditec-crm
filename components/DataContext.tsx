
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, AppNotification, Task, Lead, ServiceTicket, LeadStatus } from '../types';

export interface DataContextType {
  clients: Client[];
  vendors: Vendor[];
  products: Product[];
  invoices: Invoice[];
  stockMovements: StockMovement[];
  expenses: ExpenseRecord[];
  employees: Employee[];
  notifications: AppNotification[];
  tasks: Task[];
  leads: Lead[];
  serviceTickets: ServiceTicket[];
  
  // Conversion state for module-to-module workflow
  pendingQuoteData: Partial<Invoice> | null;
  setPendingQuoteData: (data: Partial<Invoice> | null) => void;

  // Auth State
  currentUser: Employee | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  dbError: string | null;

  // Performance & Points
  userStats: UserStats;
  pointHistory: PointHistory[];
  prizePool: number;
  addPoints: (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => void;
  updatePrizePool: (amount: number) => void;

  // Database Actions
  seedDatabase: () => Promise<void>;
  addClient: (client: Client) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (id: string, vendor: Partial<Vendor>) => Promise<void>;
  removeVendor: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, invoice: Invoice) => Promise<void>;
  recordStockMovement: (movement: StockMovement) => Promise<void>;
  bulkReplenishStock: (productIds: string[], quantity: number) => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateTaskRemote: (id: string, updates: Partial<Task>) => Promise<void>;
  addLead: (lead: Lead) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  addServiceTicket: (ticket: ServiceTicket) => Promise<void>;
  updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => Promise<void>;
  addExpense: (expense: ExpenseRecord) => Promise<void>;
  updateExpenseStatus: (id: string, status: ExpenseRecord['status'], reason?: string) => Promise<void>;
  addEmployee: (emp: Employee) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  addNotification: (title: string, message: string, type: AppNotification['type']) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const sanitizeData = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;
  if (typeof data.toDate === 'function') return data.toDate().toISOString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitizeData);
  
  const plain: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (typeof value === 'function') return;
    plain[key] = sanitizeData(value);
  });
  return plain;
};

const isRedundant = (existing: any, updates: any) => {
    if (!existing) return false;
    return Object.keys(updates).every(key => {
        const val = updates[key];
        if (typeof val === 'object' && val !== null) {
            return JSON.stringify(existing[key]) === JSON.stringify(val);
        }
        return existing[key] === val;
    });
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [prizePool, setPrizePool] = useState<number>(1500);
  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [userStats, setUserStats] = useState<UserStats>({
      points: 0,
      tasksCompleted: 0,
      attendanceStreak: 12,
      salesRevenue: 0
  });

  useEffect(() => {
    const handleError = (err: any) => {
        console.warn("Firestore Listener Warning:", err?.message || err);
        if (err?.code === 'permission-denied') setDbError("Firestore Access Denied.");
    };

    const mapDocs = (snapshot: any) => snapshot.docs.map((d: any) => {
        const data = sanitizeData(d.data());
        return { ...data, id: d.id };
    });

    const unsubscribes = [
      onSnapshot(collection(db, "clients"), (s) => setClients(mapDocs(s)), handleError),
      onSnapshot(collection(db, "vendors"), (s) => setVendors(mapDocs(s)), handleError),
      onSnapshot(collection(db, "products"), (s) => setProducts(mapDocs(s)), handleError),
      onSnapshot(collection(db, "leads"), (s) => setLeads(mapDocs(s)), handleError),
      onSnapshot(collection(db, "serviceTickets"), (s) => setServiceTickets(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "invoices"), orderBy("date", "desc")), (s) => setInvoices(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "stockMovements"), orderBy("date", "desc"), limit(50)), (s) => setStockMovements(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (s) => setExpenses(mapDocs(s)), handleError),
      onSnapshot(collection(db, "employees"), (s) => setEmployees(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "tasks"), orderBy("dueDate", "asc")), (s) => setTasks(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "notifications"), orderBy("time", "desc"), limit(20)), (s) => setNotifications(mapDocs(s)), handleError),
      onSnapshot(query(collection(db, "pointHistory"), orderBy("date", "desc"), limit(50)), (s) => setPointHistory(mapDocs(s)), handleError)
    ];

    return () => unsubscribes.forEach(u => u());
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('sreemeditec_auth_user');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const fullEmp = employees.find(e => e.id === parsed.id);
            if (fullEmp) {
                setCurrentUser({ ...fullEmp, permissions: fullEmp.permissions ? [...fullEmp.permissions] : [] });
                setIsAuthenticated(true);
            }
        } catch (e) {
            localStorage.removeItem('sreemeditec_auth_user');
        }
    }
  }, [employees]);

  useEffect(() => {
    if (currentUser) {
        const myPoints = pointHistory.filter(p => p.userId === currentUser.id).reduce((acc, curr) => acc + curr.points, 0);
        const myTasks = tasks.filter(t => t.assignedTo === currentUser.name && t.status === 'Done').length;
        setUserStats(prev => ({
            ...prev,
            points: myPoints,
            tasksCompleted: myTasks,
            salesRevenue: invoices.filter(i => i.customerName === currentUser.name && i.status === 'Paid').reduce((acc, i) => acc + i.grandTotal, 0)
        }));
    }
  }, [pointHistory, tasks, currentUser, invoices]);

  const seedDatabase = async () => {
      const batch = writeBatch(db);
      const initialEmployees: Employee[] = [
          { id: 'EMP001', name: 'Master Admin', role: 'SYSTEM_ADMIN', department: 'Administration', email: 'admin@demo.com', phone: '000', joinDate: '2023-01-01', baseSalary: 100000, status: 'Active', isLoginEnabled: true, password: 'admin', permissions: Object.values(TabView) },
          { id: 'EMP002', name: 'Staff User', role: 'SYSTEM_STAFF', department: 'Service', email: 'staff@demo.com', phone: '111', joinDate: '2023-05-15', baseSalary: 45000, status: 'Active', isLoginEnabled: true, password: 'staff', permissions: [TabView.DASHBOARD, TabView.PROFILE, TabView.TASKS] }
      ];
      initialEmployees.forEach(emp => batch.set(doc(db, "employees", emp.id), emp));
      await batch.commit();
      addNotification('System Initialized', 'Enterprise Roles defined.', 'success');
  };

  const login = async (email: string, password?: string) => {
    const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (!employee) throw new Error(`Auth Error: '${email}' not found.`);
    if (!employee.isLoginEnabled) throw new Error("Account Locked.");
    if (employee.password === password) {
        setCurrentUser({ ...employee, permissions: employee.permissions ? [...employee.permissions] : [] });
        setIsAuthenticated(true);
        localStorage.setItem('sreemeditec_auth_user', JSON.stringify({ id: employee.id, name: employee.name }));
        return true;
    }
    throw new Error("Incorrect Security Key.");
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const employee = employees.find(e => e.email.toLowerCase() === result.user.email?.toLowerCase());
    if (!employee) { await signOut(auth); throw new Error(`Unauthorized: '${result.user.email}' not registered.`); }
    setCurrentUser({ ...employee, permissions: employee.permissions ? [...employee.permissions] : [] });
    setIsAuthenticated(true);
    localStorage.setItem('sreemeditec_auth_user', JSON.stringify({ id: employee.id, name: employee.name }));
    return true;
  };

  const logout = async () => {
    try { await signOut(auth); } catch (e) {}
    setCurrentUser(null); setIsAuthenticated(false);
    localStorage.removeItem('sreemeditec_auth_user');
  };

  const addClient = async (client: Client) => await setDoc(doc(db, "clients", client.id), client);
  const updateClient = async (id: string, updates: Partial<Client>) => {
      const existing = clients.find(c => c.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "clients", id), updates);
  };
  const removeClient = async (id: string) => id && await deleteDoc(doc(db, "clients", id.trim()));

  const addVendor = async (vendor: Vendor) => await setDoc(doc(db, "vendors", vendor.id), vendor);
  const updateVendor = async (id: string, updates: Partial<Vendor>) => {
      const existing = vendors.find(v => v.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "vendors", id), updates);
  };
  const removeVendor = async (id: string) => id && await deleteDoc(doc(db, "vendors", id.trim()));

  const addProduct = async (product: Product) => await setDoc(doc(db, "products", product.id), product);
  const updateProduct = async (id: string, updates: Partial<Product>) => {
      const existing = products.find(p => p.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "products", id), updates);
  };
  const removeProduct = async (id: string) => id && await deleteDoc(doc(db, "products", id.trim()));

  const addInvoice = async (invoice: Invoice) => await setDoc(doc(db, "invoices", invoice.id), invoice);
  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
      const existing = invoices.find(i => i.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "invoices", id), updates);
  };
  
  const addLead = async (lead: Lead) => await setDoc(doc(db, "leads", lead.id), lead);
  const updateLead = async (id: string, updates: Partial<Lead>) => {
      const existing = leads.find(l => l.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "leads", id), updates);
  };
  
  const addServiceTicket = async (t: ServiceTicket) => await setDoc(doc(db, "serviceTickets", t.id), t);
  const updateServiceTicket = async (id: string, updates: Partial<ServiceTicket>) => {
      const existing = serviceTickets.find(s => s.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "serviceTickets", id), updates);
  };
  
  // Fix: changed from recordStockMovement = async (m: StockMovement) => await addDoc(...)
  // to avoid type error with return type
  const recordStockMovement = async (m: StockMovement) => {
      await addDoc(collection(db, "stockMovements"), m);
  };

  const bulkReplenishStock = async (productIds: string[], quantity: number) => {
      const batch = writeBatch(db);
      const date = new Date().toISOString().split('T')[0];
      productIds.forEach(id => {
          const product = products.find(p => p.id === id);
          if (!product) return;
          batch.update(doc(db, "products", id), { stock: product.stock + quantity, lastRestocked: date });
          const movementRef = doc(collection(db, "stockMovements"));
          batch.set(movementRef, { id: `MOV-${Date.now()}-${id}`, productId: id, productName: product.name, type: 'In', quantity: quantity, date: date, reference: `AUTO-RESTOCK`, purpose: 'Restock' });
      });
      await batch.commit();
  };

  const addExpense = async (e: ExpenseRecord) => await setDoc(doc(db, "expenses", e.id), e);
  const updateExpenseStatus = async (id: string, status: ExpenseRecord['status'], reason?: string) => {
      const existing = expenses.find(e => e.id === id);
      if (existing?.status === status && existing?.rejectionReason === reason) return;
      
      const updates: any = { status };
      if (reason) updates.rejectionReason = reason;
      
      await updateDoc(doc(db, "expenses", id), updates);
  };
  
  const addEmployee = async (emp: Employee) => await setDoc(doc(db, "employees", emp.id), emp);
  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
      const existing = employees.find(e => e.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "employees", id), updates);
  };
  const removeEmployee = async (id: string) => await deleteDoc(doc(db, "employees", id));
  
  const addTask = async (task: Task) => await setDoc(doc(db, "tasks", task.id), task);
  const removeTask = async (id: string) => await deleteDoc(doc(db, "tasks", id));
  const updateTaskRemote = async (id: string, updates: Partial<Task>) => {
      const existing = tasks.find(t => t.id === id);
      if (isRedundant(existing, updates)) return;
      await updateDoc(doc(db, "tasks", id), updates);
  };

  const addNotification = async (title: string, message: string, type: AppNotification['type']) => {
    await addDoc(collection(db, "notifications"), { title, message, time: new Date().toLocaleTimeString(), type, read: false, isNewToast: true, createdAt: serverTimestamp() });
  };
  const markNotificationRead = async (id: string) => await updateDoc(doc(db, "notifications", id), { read: true, isNewToast: false });
  const clearAllNotifications = () => notifications.forEach(n => !n.read && markNotificationRead(n.id));

  const addPoints = async (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => {
      const finalUserId = targetUserId || currentUser?.id;
      if (!finalUserId) return;
      await addDoc(collection(db, "pointHistory"), { 
        date: new Date().toISOString().split('T')[0], 
        points: amount, 
        category, 
        description, 
        userId: finalUserId, 
        createdAt: serverTimestamp() 
      });
  };

  const updatePrizePool = (amount: number) => {
      if (prizePool === amount) return;
      setPrizePool(amount);
  };

  return (
    <DataContext.Provider value={{ 
        clients, vendors, products, invoices, stockMovements, expenses, employees, notifications, tasks, leads, serviceTickets,
        pendingQuoteData, setPendingQuoteData,
        currentUser, isAuthenticated, login, loginWithGoogle, logout, dbError, seedDatabase,
        addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
        addProduct, updateProduct, removeProduct, addLead, updateLead, addServiceTicket, updateServiceTicket,
        addInvoice, updateInvoice, recordStockMovement, bulkReplenishStock, addExpense, updateExpenseStatus,
        addEmployee, updateEmployee, removeEmployee,
        setTasks, addTask, removeTask, updateTaskRemote,
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
