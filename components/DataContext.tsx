
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
        if (err.code === 'permission-denied') {
            setDbError("Firestore Access Denied: Please set Security Rules to public read/write in Firebase Console.");
        }
    };

    const unsubscribes = [
      onSnapshot(collection(db, "clients"), (s) => setClients(s.docs.map(d => ({ ...d.data(), id: d.id } as Client))), handleError),
      onSnapshot(collection(db, "vendors"), (s) => setVendors(s.docs.map(d => ({ ...d.data(), id: d.id } as Vendor))), handleError),
      onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))), handleError),
      onSnapshot(collection(db, "leads"), (s) => setLeads(s.docs.map(d => ({ ...d.data(), id: d.id } as Lead))), handleError),
      onSnapshot(collection(db, "serviceTickets"), (s) => setServiceTickets(s.docs.map(d => ({ ...d.data(), id: d.id } as ServiceTicket))), handleError),
      onSnapshot(query(collection(db, "invoices"), orderBy("date", "desc")), (s) => setInvoices(s.docs.map(d => ({ ...d.data(), id: d.id } as Invoice))), handleError),
      onSnapshot(query(collection(db, "stockMovements"), orderBy("date", "desc"), limit(50)), (s) => setStockMovements(s.docs.map(d => ({ ...d.data(), id: d.id } as StockMovement))), handleError),
      onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (s) => setExpenses(s.docs.map(d => ({ ...d.data(), id: d.id } as ExpenseRecord))), handleError),
      onSnapshot(collection(db, "employees"), (s) => setEmployees(s.docs.map(d => ({ ...d.data(), id: d.id } as Employee))), handleError),
      onSnapshot(query(collection(db, "tasks"), orderBy("dueDate", "asc")), (s) => setTasks(s.docs.map(d => ({ ...d.data(), id: d.id } as Task))), handleError),
      onSnapshot(query(collection(db, "notifications"), orderBy("time", "desc"), limit(20)), (s) => setNotifications(s.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification))), handleError),
      onSnapshot(query(collection(db, "pointHistory"), orderBy("date", "desc"), limit(50)), (s) => setPointHistory(s.docs.map(d => ({ ...d.data(), id: d.id } as PointHistory))), handleError)
    ];

    return () => unsubscribes.forEach(u => u());
  }, []);

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
          { id: 'EMP001', name: 'Admin Hub', role: 'System Admin', department: 'Administration', email: 'admin@demo.com', phone: '000', joinDate: '2023-01-01', baseSalary: 100000, status: 'Active', isLoginEnabled: true, password: 'admin', permissions: Object.values(TabView) },
          { id: 'EMP002', name: 'Rahul Sharma', role: 'Senior Technician', department: 'Service', email: 'rahul@sreemeditec.com', phone: '7200021788', joinDate: '2023-05-15', baseSalary: 45000, status: 'Active', isLoginEnabled: true, password: 'rahul', permissions: [TabView.DASHBOARD, TabView.TASKS, TabView.ATTENDANCE, TabView.SERVICE_ORDERS, TabView.PROFILE] },
          { id: 'EMP003', name: 'Employee User', role: 'Staff', department: 'Sales', email: 'employee@demo.com', phone: '111', joinDate: '2023-10-01', baseSalary: 30000, status: 'Active', isLoginEnabled: true, password: 'pass', permissions: [TabView.DASHBOARD, TabView.LEADS, TabView.QUOTES, TabView.TASKS, TabView.ATTENDANCE, TabView.PROFILE] }
      ];

      initialEmployees.forEach(emp => batch.set(doc(db, "employees", emp.id), emp));

      const initialLeads: Lead[] = [
          { id: 'L001', name: 'Dr. Sarah Smith', hospital: 'City General Hospital', source: 'Website', status: LeadStatus.NEW, value: 45000, lastContact: '2023-10-25', productInterest: 'Ultrasound Machine', email: 'sarah.s@gmail.com', phone: '9884818398', address: 'Chennai, TN' }
      ];
      initialLeads.forEach(lead => batch.set(doc(db, "leads", lead.id), lead));

      await batch.commit();
      addNotification('System Ready', 'Cloud registry has been initialized with baseline data.', 'success');
  };

  const login = async (email: string, password?: string) => {
    const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (!employee) throw new Error("Staff ID not recognized. Run Workspace Initialization if this is a fresh setup.");
    if (!employee.isLoginEnabled) throw new Error("Account locked by HR.");

    if (employee.password === password) {
        setCurrentUser(employee);
        setIsAuthenticated(true);
        localStorage.setItem('sreemeditec_auth_user', JSON.stringify({ email: employee.email }));
        return true;
    } else {
        throw new Error("Authentication failed: Invalid key.");
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      
      if (!email) throw new Error("Google account has no email associated.");
      
      const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
      
      if (!employee) {
        await signOut(auth);
        throw new Error(`Unauthorized access: The account ${email} is not in the Sree Meditec employee registry. Contact Administration.`);
      }
      
      if (!employee.isLoginEnabled) {
        await signOut(auth);
        throw new Error("Your account has been restricted by HR.");
      }

      setCurrentUser(employee);
      setIsAuthenticated(true);
      localStorage.setItem('sreemeditec_auth_user', JSON.stringify({ email: employee.email }));
      return true;
    } catch (err: any) {
      console.error("Google Auth Error Detail:", err);
      throw err; // Propagate for specific error handling in Login component
    }
  };

  const logout = async () => {
    await signOut(auth);
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
  const updateTaskRemote = async (id: string, updates: Partial<Task>) => await updateDoc(doc(db, "tasks", id), updates);

  const addNotification = async (title: string, message: string, type: AppNotification['type']) => {
    const newNotif = { title, message, time: new Date().toLocaleTimeString(), type, read: false, isNewToast: true, createdAt: serverTimestamp() };
    await addDoc(collection(db, "notifications"), newNotif);
  };

  const markNotificationRead = async (id: string) => await updateDoc(doc(db, "notifications", id), { read: true, isNewToast: false });
  const clearAllNotifications = async () => notifications.forEach(n => markNotificationRead(n.id));

  const addPoints = async (amount: number, category: PointHistory['category'], description: string) => {
      if (!currentUser) return;
      const newHistory = { date: new Date().toISOString().split('T')[0], points: amount, category, description, userId: currentUser.id, createdAt: serverTimestamp() };
      await addDoc(collection(db, "pointHistory"), newHistory);
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
        setTasks, updateTaskRemote,
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
