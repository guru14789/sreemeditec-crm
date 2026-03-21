
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, AppNotification, Task, Lead, ServiceTicket, AttendanceRecord, DeliveryChallan, ServiceReport } from '../types';

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
    deliveryChallans: DeliveryChallan[];
    installationReports: ServiceReport[];
    serviceReports: ServiceReport[];


    pendingQuoteData: Partial<Invoice> | null;
    setPendingQuoteData: (data: Partial<Invoice> | null) => void;

    currentUser: Employee | null;
    isAuthenticated: boolean;
    login: (email: string, password?: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<boolean>;
    logout: () => void;
    dbError: string | null;
    authError: string | null;
    isAuthenticating: boolean;

    userStats: UserStats;
    pointHistory: PointHistory[];
    prizePool: number;
    addPoints: (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => void;
    updatePrizePool: (amount: number) => void;

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
    updateAttendance: (record: Partial<AttendanceRecord> & { id: string }) => Promise<void>;
    addDeliveryChallan: (challan: DeliveryChallan) => Promise<void>;
    updateDeliveryChallan: (id: string, updates: Partial<DeliveryChallan>) => Promise<void>;
    removeDeliveryChallan: (id: string) => Promise<void>;
    addInstallationReport: (report: ServiceReport) => Promise<void>;
    updateInstallationReport: (id: string, updates: Partial<ServiceReport>) => Promise<void>;
    removeInstallationReport: (id: string) => Promise<void>;
    addServiceReport: (report: ServiceReport) => Promise<void>;
    updateServiceReport: (id: string, updates: Partial<ServiceReport>) => Promise<void>;
    removeServiceReport: (id: string) => Promise<void>;
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
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
    const [installationReports, setInstallationReports] = useState<ServiceReport[]>([]);
    const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);

    const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
    const [prizePool, setPrizePool] = useState<number>(1500);
    const [dbError, setDbError] = useState<string | null>(null);
    const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);

    const [currentUser, setCurrentUser] = useState<Employee | null>(null);
    const [setIsAuthenticatedState, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [userStats, setUserStats] = useState<UserStats>({
        points: 0,
        tasksCompleted: 0,
        attendanceStreak: 12,
        salesRevenue: 0
    });

    const [firebaseUser, setFirebaseUser] = useState<any>(null);

    // 1. Firebase Auth listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (!user) {
                setIsAuthenticating(false);
                setCurrentUser(null);
                setIsAuthenticated(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Employees listener (independent of currentUser)
    useEffect(() => {
        if (!firebaseUser) {
            setEmployees([]);
            setCurrentUser(null);
            setIsAuthenticated(false);
            return;
        }

        const handleError = (err: any) => {
            if (err?.code === 'permission-denied') setDbError("Firestore Access Denied.");
            else console.warn("Employees Listener Error:", err);
        };

        const mapDocs = (snapshot: any) => snapshot.docs.map((d: any) => ({
            ...sanitizeData(d.data()),
            id: d.id
        }));

        const unsub = onSnapshot(collection(db, "employees"), (s) => setEmployees(mapDocs(s)), handleError);
        return () => unsub();
    }, [firebaseUser]);

    // 3. Current User resolution
    useEffect(() => {
        if (!firebaseUser || employees.length === 0) return;

        let resolvedUser: Employee | null = null;
        const email = firebaseUser.email?.toLowerCase();

        // Bypass checks
        if (email === 'admin@demo.com') {
            resolvedUser = {
                id: 'EMP-BYPASS', name: 'Enterprise Admin', role: 'SYSTEM_ADMIN', department: 'Administration', email: 'admin@demo.com', status: 'Active', isLoginEnabled: true, permissions: Object.values(TabView)
            };
        } else if (email === 'sreekumar.career@gmail.com') {
            resolvedUser = {
                id: 'EMP-OWNER', name: 'Sreekumar', role: 'SYSTEM_ADMIN', department: 'Administration', email: 'sreekumar.career@gmail.com', status: 'Active', isLoginEnabled: true, permissions: Object.values(TabView)
            };
        } else {
            const match = employees.find(e => e.email.toLowerCase() === email);
            if (match) {
                if (match.isLoginEnabled) {
                    resolvedUser = { ...match, permissions: match.permissions ? [...match.permissions] : [] };
                } else {
                    setAuthError("Organization Access Locked: Your account has been disabled by the administrator.");
                }
            }
        }

        if (resolvedUser) {
            if (!currentUser || currentUser.id !== resolvedUser.id) {
                setCurrentUser(resolvedUser);
                setIsAuthenticated(true);
            }
            setIsAuthenticating(false);
            setAuthError(null);
        } else if (isAuthenticating) {
            // Give it a tiny bit more time in case of state lag
            const timeout = setTimeout(async () => {
                if (!resolvedUser) {
                    setAuthError(`Organization Access Denied: '${firebaseUser.email || 'Unknown Email'}' is not in the Sree Meditec staff registry.`);
                    setIsAuthenticating(false);
                    await signOut(auth);
                }
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [firebaseUser, employees, currentUser?.id, isAuthenticating]);

    // 4. Other collections listener
    useEffect(() => {
        if (!firebaseUser || !currentUser) {
            setClients([]);
            setVendors([]);
            setProducts([]);
            setLeads([]);
            setServiceTickets([]);
            setInvoices([]);
            setStockMovements([]);
            setExpenses([]);
            setTasks([]);
            setNotifications([]);
            setPointHistory([]);
            setDeliveryChallans([]);
            setInstallationReports([]);
            setServiceReports([]);
            return;

        }

        const handleError = (err: any) => {
            console.warn("Firestore Listener Warning:", err?.message || err);
        };

        const mapDocs = (snapshot: any) => snapshot.docs.map((d: any) => ({
            ...sanitizeData(d.data()),
            id: d.id
        }));

        const unsubscribes = [
            onSnapshot(collection(db, "clients"), (s) => setClients(mapDocs(s)), handleError),
            onSnapshot(collection(db, "vendors"), (s) => setVendors(mapDocs(s)), handleError),
            onSnapshot(collection(db, "products"), (s) => setProducts(mapDocs(s)), handleError),
            onSnapshot(collection(db, "leads"), (s) => setLeads(mapDocs(s)), handleError),
            onSnapshot(collection(db, "serviceTickets"), (s) => setServiceTickets(mapDocs(s)), handleError),
            onSnapshot(collection(db, "invoices"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setInvoices(data);
            }, handleError),
            onSnapshot(collection(db, "stockMovements"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setStockMovements(data.slice(0, 100));
            }, handleError),
            onSnapshot(collection(db, "expenses"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setExpenses(data);
            }, handleError),
            onSnapshot(collection(db, "tasks"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''));
                setTasks(data);
            }, handleError),
            onSnapshot(collection(db, "notifications"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.createdAt || b.time || '').toString().localeCompare((a.createdAt || a.time || '').toString()));
                setNotifications(data.slice(0, 50));
            }, handleError),
            onSnapshot(collection(db, "pointHistory"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setPointHistory(data.slice(0, 100));
            }, handleError),
            onSnapshot(collection(db, "deliveryChallans"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setDeliveryChallans(data);
            }, handleError),
            onSnapshot(collection(db, "installationReports"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setInstallationReports(data);
            }, handleError),
            onSnapshot(collection(db, "serviceReports"), (s) => {
                const data = mapDocs(s);
                data.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
                setServiceReports(data);
            }, handleError),
            onSnapshot(collection(db, "attendance"), (s) => setAttendanceRecords(mapDocs(s)), handleError)

        ];

        return () => unsubscribes.forEach(u => u());
    }, [firebaseUser, currentUser?.id]);



    // Simplified effect for quick UI restoration from localStorage (optional, but good for perceived speed)
    useEffect(() => {
        const saved = localStorage.getItem('sreemeditec_auth_user');
        if (saved && !currentUser) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.id === 'EMP-BYPASS' || parsed.id === 'EMP-OWNER') {
                    // Logic handled by onAuthStateChanged for real Firestore access, 
                    // but we can set UI state here if we want immediate transition.
                }
            } catch (e) { }
        }
    }, [employees, currentUser]);

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
            { id: 'EMP002', name: 'Staff User', role: 'SYSTEM_STAFF', department: 'Service', email: 'staff@demo.com', phone: '111', joinDate: '2023-05-15', baseSalary: 45000, status: 'Active', isLoginEnabled: true, password: 'staff', permissions: [TabView.DASHBOARD, TabView.PROFILE, TabView.TASKS] },
            { id: 'EMP003', name: 'Sreekumar', role: 'SYSTEM_ADMIN', department: 'Administration', email: 'sreekumar.career@gmail.com', phone: '999', joinDate: '2023-01-01', baseSalary: 120000, status: 'Active', isLoginEnabled: true, password: 'sree14789', permissions: Object.values(TabView) }
        ];
        initialEmployees.forEach(emp => batch.set(doc(db, "employees", emp.id), emp));
        await batch.commit();
        addNotification('System Initialized', 'Enterprise Roles defined.', 'success');
    };

    const login = async (email: string, password?: string) => {
        setAuthError(null);
        setIsAuthenticating(true);

        const syncFirebase = async (e: string, p: string) => {
            try {
                await signInWithEmailAndPassword(auth, e, p);
            } catch (err: any) {
                if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    try {
                        await createUserWithEmailAndPassword(auth, e, p);
                    } catch (createErr) {
                        console.warn("Failed to create Firebase Auth user:", createErr);
                    }
                } else {
                    console.warn("Firebase Auth Login Warning:", err);
                }
            }
        };

        // AUTH BYPASS LOGIC: Allow demo admin even if DB is empty
        if (email.toLowerCase() === 'admin@demo.com' && password === 'admin') {
            await syncFirebase('admin@demo.com', 'admin123'); // Map to stronger password for Firebase
            return true;
        }

        if (email.toLowerCase() === 'sreekumar.career@gmail.com' && password === 'sree14789') {
            await syncFirebase(email, 'sree14789');
            return true;
        }

        // For other employees, we might not have the list yet. 
        // We'll try to sign in with Firebase. If that fails, we check the registry ONLY IF we have it.
        try {
            await signInWithEmailAndPassword(auth, email, password || '');
            return true;
        } catch (fbErr) {
            // If Firebase login fails, maybe it's a new password from HR that isn't synced yet.
            const employee = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
            if (employee && employee.password === password) {
                if (employee.password && employee.password.length >= 6) {
                    await syncFirebase(email, employee.password as string);
                    return true;
                }
            }
            setIsAuthenticating(false);
            if (!employees.length) throw new Error("Connection established. Synchronizing registry... Please try again in 5 seconds.");
            throw new Error(employee ? "Incorrect security key." : `Auth Error: '${email}' not found in registry.`);
        }
    };

    const loginWithGoogle = async () => {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
            await signInWithPopup(auth, googleProvider);
            return true;
        } catch (err) {
            setIsAuthenticating(false);
            throw err;
        }
    };

    const logout = async () => {
        try { await signOut(auth); } catch (e) { }
        setCurrentUser(null); setIsAuthenticated(false);
        localStorage.removeItem('sreemeditec_auth_user');
    };

    const addClient = async (client: Client) => await setDoc(doc(db, "clients", client.id), client);
    const updateClient = async (id: string, updates: Partial<Client>) => {
        const existing = clients.find(c => c.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "clients", id), updates);
    };
    const removeClient = async (id: string) => { if (id) await deleteDoc(doc(db, "clients", id.trim())); };

    const addVendor = async (vendor: Vendor) => await setDoc(doc(db, "vendors", vendor.id), vendor);
    const updateVendor = async (id: string, updates: Partial<Vendor>) => {
        const existing = vendors.find(v => v.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "vendors", id), updates);
    };
    const removeVendor = async (id: string) => { if (id) await deleteDoc(doc(db, "vendors", id.trim())); };

    const addProduct = async (product: Product) => await setDoc(doc(db, "products", product.id), product);
    const updateProduct = async (id: string, updates: Partial<Product>) => {
        const existing = products.find(p => p.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "products", id), updates);
    };
    const removeProduct = async (id: string) => { if (id) await deleteDoc(doc(db, "products", id.trim())); };

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

    const recordStockMovement = async (m: StockMovement) => {
        await addDoc(collection(db, "stockMovements"), m);
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
    const removeEmployee = async (id: string) => {
        console.log("Attempting to remove employee with ID:", id);
        try {
            await deleteDoc(doc(db, "employees", id.trim()));
            console.log("Deletion successful in Firestore");
        } catch (err) {
            console.error("Firestore delete error:", err);
            throw err;
        }
    };

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

    const updateAttendance = async (record: Partial<AttendanceRecord> & { id: string }) => {
        await setDoc(doc(db, "attendance", record.id), record, { merge: true });
    };

    const addDeliveryChallan = async (challan: DeliveryChallan) => await setDoc(doc(db, "deliveryChallans", challan.id), challan);
    const updateDeliveryChallan = async (id: string, updates: Partial<DeliveryChallan>) => {
        const existing = deliveryChallans.find(c => c.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "deliveryChallans", id), updates);
    };
    const removeDeliveryChallan = async (id: string) => { if (id) await deleteDoc(doc(db, "deliveryChallans", id.trim())); };

    const addInstallationReport = async (report: ServiceReport) => await setDoc(doc(db, "installationReports", report.id), report);
    const updateInstallationReport = async (id: string, updates: Partial<ServiceReport>) => {
        const existing = installationReports.find(r => r.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "installationReports", id), updates);
    };
    const removeInstallationReport = async (id: string) => { if (id) await deleteDoc(doc(db, "installationReports", id.trim())); };

    const addServiceReport = async (report: ServiceReport) => await setDoc(doc(db, "serviceReports", report.id), report);
    const updateServiceReport = async (id: string, updates: Partial<ServiceReport>) => {
        const existing = serviceReports.find(r => r.id === id);
        if (isRedundant(existing, updates)) return;
        await updateDoc(doc(db, "serviceReports", id), updates);
    };
    const removeServiceReport = async (id: string) => { if (id) await deleteDoc(doc(db, "serviceReports", id.trim())); };


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
            currentUser, isAuthenticated: setIsAuthenticatedState, login, loginWithGoogle, logout, seedDatabase,
            addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
            addProduct, updateProduct, removeProduct, addLead, updateLead, addServiceTicket, updateServiceTicket,
            addInvoice, updateInvoice, recordStockMovement, addExpense, updateExpenseStatus,
            addEmployee, updateEmployee, removeEmployee,
            setTasks, addTask, removeTask, updateTaskRemote,
            dbError,
            authError,
            isAuthenticating,
            userStats, pointHistory, addPoints, addNotification, markNotificationRead, clearAllNotifications,
            attendanceRecords, updateAttendance,
            deliveryChallans, addDeliveryChallan, updateDeliveryChallan, removeDeliveryChallan,
            installationReports, addInstallationReport, updateInstallationReport, removeInstallationReport,
            serviceReports, addServiceReport, updateServiceReport, removeServiceReport,
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
