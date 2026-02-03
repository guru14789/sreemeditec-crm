
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
import { signOut, onAuthStateChanged, User, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { registerNewEmployeeAuth } from '../services/authService';
import { 
  Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, 
  Employee, TabView, UserStats, PointHistory, AppNotification, 
  Task, Lead, ServiceTicket, AttendanceRecord 
} from '../types';

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
  attendanceRecords: AttendanceRecord[];
  
  pendingQuoteData: Partial<Invoice> | null;
  setPendingQuoteData: (data: Partial<Invoice> | null) => void;

  currentUser: Employee | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  // Fix: Added missing login, loginWithGoogle, and seedDatabase to interface
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  seedDatabase: () => Promise<void>;
  logout: () => void;
  dbError: string | null;

  userStats: UserStats;
  pointHistory: PointHistory[];
  prizePool: number;
  addPoints: (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => void;
  updatePrizePool: (amount: number) => void;

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
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
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
  
  // PRODUCTION AUTH METHODS
  registerEmployee: (data: any, password: string) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  
  addNotification: (title: string, message: string, type: AppNotification['type']) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => void;
  saveAttendance: (record: AttendanceRecord) => Promise<void>;
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [prizePool, setPrizePool] = useState<number>(1500);
  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [userStats, setUserStats] = useState<UserStats>({
      points: 0,
      tasksCompleted: 0,
      attendanceStreak: 12,
      salesRevenue: 0
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
            const employeeProfile = employees.find(e => e.uid === fbUser.uid);
            if (employeeProfile) {
                setCurrentUser(employeeProfile);
                setIsAuthenticated(true);
                setIsAdmin(employeeProfile.role === 'SYSTEM_ADMIN');
            }
        } else {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
        }
    });
  }, [employees]);

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
      onSnapshot(query(collection(db, "pointHistory"), orderBy("date", "desc"), limit(50)), (s) => setPointHistory(mapDocs(s)), handleError),
      onSnapshot(collection(db, "attendance"), (s) => setAttendanceRecords(mapDocs(s)), handleError)
    ];

    return () => unsubscribes.forEach(u => u());
  }, []);

  // Fix: Implement login with email and password
  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  // Fix: Implement login with Google provider
  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  // Fix: Implement database seeding for initial setup
  const seedDatabase = async () => {
    if (employees.length === 0) {
      const adminData = {
        name: 'System Admin',
        email: 'admin@sreemeditec.com',
        role: 'SYSTEM_ADMIN',
        department: 'Administration',
        status: 'Active',
        permissions: Object.values(TabView),
        isLoginEnabled: true
      };
      // We create a doc with a predictable ID for the initial setup.
      // In production, registerEmployee should be used to create the Auth account too.
      const initialUid = "initial-admin-setup";
      const profile: Employee = {
        ...adminData,
        id: "EMP001",
        uid: initialUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      } as Employee;
      await setDoc(doc(db, "employees", initialUid), profile);
      addNotification('Registry Seeded', 'Default administrator record created in Firestore.', 'success');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerEmployee = async (formData: any, password: string) => {
      // Step 1: Create Firebase Auth account securely
      const uid = await registerNewEmployeeAuth(formData.email, password);
      
      // Step 2: Create Firestore Profile linked to UID
      const internalId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
      const profile: Employee = {
          ...formData,
          id: internalId,
          uid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isLoginEnabled: true,
          status: 'Active'
      };
      
      // Store in employees collection using UID as the document key for fast lookup
      await setDoc(doc(db, "employees", uid), profile);
  };

  const addClient = async (client: Client) => await setDoc(doc(db, "clients", client.id), client);
  const updateClient = async (id: string, updates: Partial<Client>) => await updateDoc(doc(db, "clients", id), updates);
  const removeClient = async (id: string) => await deleteDoc(doc(db, "clients", id));
  const addVendor = async (vendor: Vendor) => await setDoc(doc(db, "vendors", vendor.id), vendor);
  const updateVendor = async (id: string, updates: Partial<Vendor>) => await updateDoc(doc(db, "vendors", id), updates);
  const removeVendor = async (id: string) => await deleteDoc(doc(db, "vendors", id));
  const addProduct = async (product: Product) => await setDoc(doc(db, "products", product.id), product);
  const updateProduct = async (id: string, updates: Partial<Product>) => await updateDoc(doc(db, "products", id), updates);
  const removeProduct = async (id: string) => await deleteDoc(doc(db, "products", id));
  const addInvoice = async (invoice: Invoice) => await setDoc(doc(db, "invoices", invoice.id), invoice);
  const updateInvoice = async (id: string, updates: Partial<Invoice>) => await updateDoc(doc(db, "invoices", id), updates);
  const addLead = async (lead: Lead) => await setDoc(doc(db, "leads", lead.id), lead);
  const updateLead = async (id: string, updates: Partial<Lead>) => await updateDoc(doc(db, "leads", id), updates);
  const addServiceTicket = async (t: ServiceTicket) => await setDoc(doc(db, "serviceTickets", t.id), t);
  const updateServiceTicket = async (id: string, updates: Partial<ServiceTicket>) => await updateDoc(doc(db, "serviceTickets", id), updates);
  const recordStockMovement = async (m: StockMovement) => await addDoc(collection(db, "stockMovements"), m);
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
      const updates: any = { status };
      if (reason) updates.rejectionReason = reason;
      await updateDoc(doc(db, "expenses", id), updates);
  };
  const updateEmployee = async (id: string, updates: Partial<Employee>) => await updateDoc(doc(db, "employees", id), updates);
  const removeEmployee = async (id: string) => await deleteDoc(doc(db, "employees", id));
  const addTask = async (task: Task) => await setDoc(doc(db, "tasks", task.id), task);
  const removeTask = async (id: string) => await deleteDoc(doc(db, "tasks", id));
  const updateTaskRemote = async (id: string, updates: Partial<Task>) => await updateDoc(doc(db, "tasks", id), updates);
  const addNotification = async (title: string, message: string, type: AppNotification['type']) => {
    await addDoc(collection(db, "notifications"), { title, message, time: new Date().toLocaleTimeString(), type, read: false, isNewToast: true, createdAt: serverTimestamp() });
  };
  const markNotificationRead = async (id: string) => await updateDoc(doc(db, "notifications", id), { read: true, isNewToast: false });
  const clearAllNotifications = () => notifications.forEach(n => !n.read && markNotificationRead(n.id));
  const addPoints = async (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => {
      const finalUserId = targetUserId || currentUser?.uid;
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
  const saveAttendance = async (record: AttendanceRecord) => await setDoc(doc(db, "attendance", record.id), record);
  const updatePrizePool = (amount: number) => setPrizePool(amount);

  return (
    <DataContext.Provider value={{ 
        clients, vendors, products, invoices, stockMovements, expenses, employees, notifications, tasks, leads, serviceTickets, attendanceRecords,
        pendingQuoteData, setPendingQuoteData,
        currentUser, isAuthenticated, isAdmin, login, loginWithGoogle, seedDatabase, logout, dbError,
        addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
        addProduct, updateProduct, removeProduct, addLead, updateLead, addServiceTicket, updateServiceTicket,
        addInvoice, updateInvoice, recordStockMovement, bulkReplenishStock, addExpense, updateExpenseStatus,
        registerEmployee, updateEmployee, removeEmployee,
        setTasks, addTask, removeTask, updateTaskRemote, saveAttendance,
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
