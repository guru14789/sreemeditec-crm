
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
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
  addPoints: (amount: number, category: PointHistory['category'], description: string) => void;
  updatePrizePool: (amount: number) => void;

  // Database Actions
  seedDatabase: () => Promise<void>;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  removeClient: (id: string) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  removeVendor: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Invoice) => void;
  recordStockMovement: (movement: StockMovement) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateTaskRemote: (id: string, updates: Partial<Task>) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addServiceTicket: (ticket: ServiceTicket) => void;
  updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => void;
  addExpense: (expense: ExpenseRecord) => void;
  updateExpenseStatus: (id: string, status: ExpenseRecord['status']) => void;
  addEmployee: (emp: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addNotification: (title: string, message: string, type: AppNotification['type']) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Utility to recursively sanitize Firestore data to ensure it's JSON serializable
const sanitizeData = (data: any): any => {
  if (data === null || typeof data !== 'object') return data;
  
  // Handle Firestore Timestamps and Javascript Dates
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  // Handle simple objects and arrays
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  
  // Check if it's a plain object to avoid recursing into internal Firebase instances/references
  const isPlainObject = data.constructor === Object || data.constructor === undefined;
  if (isPlainObject) {
    const plain: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      // Skip functions and specific internal keys if necessary
      if (typeof value === 'function') return;
      plain[key] = sanitizeData(value);
    });
    return plain;
  }
  
  // If it's a complex object (like DocumentReference), don't recurse, just return a safe representation
  return null;
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

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [userStats, setUserStats] = useState<UserStats>({
      points: 0,
      tasksCompleted: 0,
      attendanceStreak: 0,
      salesRevenue: 0
  });

  useEffect(() => {
    const handleError = (err: any) => {
        const msg = typeof err === 'string' ? err : (err?.message || "Database connection issue");
        console.warn("Firestore Listener Warning:", msg);
        if (err?.code === 'permission-denied') {
            setDbError("Firestore Access Denied: Security Rules restricted.");
        }
    };

    const mapDocs = (snapshot: any) => snapshot.docs.map((d: any) => ({
        id: d.id,
        ...sanitizeData(d.data())
    }));

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
                setCurrentUser({
                    ...fullEmp,
                    permissions: fullEmp.permissions ? [...fullEmp.permissions] : []
                });
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
        setUserStats({
            points: myPoints,
            tasksCompleted: myTasks,
            attendanceStreak: 12,
            salesRevenue: invoices.filter(i => i.customerName === currentUser.name && i.status === 'Paid').reduce((acc, i) => acc + i.grandTotal, 0)
        });
    }
  }, [pointHistory, tasks, currentUser, invoices]);

  const seedDatabase = async () => {
      const batch = writeBatch(db);
      
      const initialEmployees: Employee[] = [
          { id: 'EMP001', name: 'Master Admin', role: 'SYSTEM_ADMIN', department: 'Administration', email: 'admin@demo.com', phone: '000', joinDate: '2023-01-01', baseSalary: 100000, status: 'Active', isLoginEnabled: true, password: 'admin', permissions: Object.values(TabView) },
          // Fix: Corrected typo 'Tab_VIEW' to 'TabView'
          { id: 'EMP002', name: 'Staff User', role: 'SYSTEM_STAFF', department: 'Service', email: 'staff@demo.com', phone: '111', joinDate: '2023-05-15', baseSalary: 45000, status: 'Active', isLoginEnabled: true, password: 'staff', permissions: [TabView.DASHBOARD, TabView.PROFILE, TabView.TASKS] }
      ];

      initialEmployees.forEach(emp => batch.set(doc(db, "employees", emp.id), emp));
      await batch.commit();
      addNotification('System Initialized', 'Enterprise Roles defined.', 'success');
  };

  const setAuthSession = (employee: Employee) => {
    const sessionData = {
        id: String(employee.id),
        name: String(employee.name),
        email: String(employee.email),
        role: String(employee.role),
        department: String(employee.department)
    };
    
    setCurrentUser({
        ...employee,
        permissions: employee.permissions ? [...employee.permissions] : []
    });
    setIsAuthenticated(true);
    localStorage.setItem('sreemeditec_auth_user', JSON.stringify(sessionData));
  };

  const login = async (email: string, password?: string) => {
    if (employees.length === 0) {
        throw new Error("Local registry is empty. Please click 'Initialize Workspace' first.");
    }
    const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (!employee) {
        throw new Error(`Auth Error: '${email}' is not registered.`);
    }
    if (!employee.isLoginEnabled) {
        throw new Error("Account Locked: Contact System Admin.");
    }
    if (employee.password === password) {
        setAuthSession(employee);
        return true;
    } else {
        throw new Error("Security Key Incorrect.");
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      if (!email) throw new Error("Google profile missing email access.");
      const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      if (!employee) {
        await signOut(auth);
        throw new Error(`Unauthorized: '${email}' is not in the registry.`);
      }
      setAuthSession(employee);
      return true;
    } catch (err: any) {
      throw new Error(err?.message || "Google authentication failed.");
    }
  };

  const logout = async () => {
    try { await signOut(auth); } catch (e) {}
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('sreemeditec_auth_user');
  };

  const addClient = async (client: Client) => await setDoc(doc(db, "clients", client.id), client);
  const updateClient = async (id: string, client: Partial<Client>) => await updateDoc(doc(db, "clients", id), client);
  const removeClient = async (id: string) => await deleteDoc(doc(db, "clients", id));
  const addVendor = async (vendor: Vendor) => await setDoc(doc(db, "vendors", vendor.id), vendor);
  const updateVendor = async (id: string, vendor: Partial<Vendor>) => await updateDoc(doc(db, "vendors", id), vendor);
  const removeVendor = async (id: string) => await deleteDoc(doc(db, "vendors", id));
  const addProduct = async (product: Product) => await setDoc(doc(db, "products", product.id), product);
  const updateProduct = async (id: string, updates: Partial<Product>) => await updateDoc(doc(db, "products", id), updates);
  const removeProduct = async (id: string) => await deleteDoc(doc(db, "products", id));
  const addInvoice = async (invoice: Invoice) => await setDoc(doc(db, "invoices", invoice.id), invoice);
  const updateInvoice = async (id: string, updatedInvoice: Invoice) => await setDoc(doc(db, "invoices", id), updatedInvoice);
  const addLead = async (lead: Lead) => await setDoc(doc(db, "leads", lead.id), lead);
  const updateLead = async (id: string, updates: Partial<Lead>) => await updateDoc(doc(db, "leads", id), updates);
  const addServiceTicket = async (t: ServiceTicket) => await setDoc(doc(db, "serviceTickets", t.id), t);
  const updateServiceTicket = async (id: string, updates: Partial<ServiceTicket>) => await updateDoc(doc(db, "serviceTickets", id), updates);
  const recordStockMovement = async (m: StockMovement) => await addDoc(collection(db, "stockMovements"), m);
  const addExpense = async (e: ExpenseRecord) => await setDoc(doc(db, "expenses", e.id), e);
  const updateExpenseStatus = async (id: string, status: ExpenseRecord['status']) => await updateDoc(doc(db, "expenses", id), { status });
  const addEmployee = async (emp: Employee) => await setDoc(doc(db, "employees", emp.id), emp);
  const updateEmployee = async (id: string, updates: Partial<Employee>) => await updateDoc(doc(db, "employees", id), updates);
  const removeEmployee = async (id: string) => await deleteDoc(doc(db, "employees", id));
  
  const addTask = async (task: Task) => await setDoc(doc(db, "tasks", task.id), task);
  const removeTask = async (id: string) => await deleteDoc(doc(db, "tasks", id));
  const updateTaskRemote = async (id: string, updates: Partial<Task>) => await updateDoc(doc(db, "tasks", id), updates);

  const addNotification = async (title: string, message: string, type: AppNotification['type']) => {
    const notifPayload = { title, message, time: new Date().toLocaleTimeString(), type, read: false, isNewToast: true, createdAt: serverTimestamp() };
    await addDoc(collection(db, "notifications"), notifPayload);
  };

  const markNotificationRead = async (id: string) => await updateDoc(doc(db, "notifications", id), { read: true, isNewToast: false });
  const clearAllNotifications = async () => notifications.forEach(n => markNotificationRead(n.id));

  const addPoints = async (amount: number, category: PointHistory['category'], description: string) => {
      if (!currentUser) return;
      const pointPayload = { date: new Date().toISOString().split('T')[0], points: amount, category, description, userId: currentUser.id, createdAt: serverTimestamp() };
      await addDoc(collection(db, "pointHistory"), pointPayload);
  };

  const updatePrizePool = (amount: number) => setPrizePool(amount);

  return (
    <DataContext.Provider value={{ 
        clients, vendors, products, invoices, stockMovements, expenses, employees, notifications, tasks, leads, serviceTickets,
        currentUser, isAuthenticated, login, loginWithGoogle, logout, dbError, seedDatabase,
        addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
        addProduct, updateProduct, removeProduct, addLead, updateLead, addServiceTicket, updateServiceTicket,
        addInvoice, updateInvoice, recordStockMovement, addExpense, updateExpenseStatus,
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
