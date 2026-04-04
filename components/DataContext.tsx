
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { auditBatcher } from '../services/AuditBatcher';
import { Archiver } from '../services/Archiver';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, Task, Lead, ServiceTicket, AttendanceRecord, DeliveryChallan, ServiceReport, Holiday, MonthlyWinner, LogEntry } from '../types';

export interface DataContextType {
    clients: Client[];
    vendors: Vendor[];
    products: Product[];
    invoices: Invoice[];
    stockMovements: StockMovement[];
    expenses: ExpenseRecord[];
    employees: Employee[];
    notifications: any[];
    tasks: Task[];
    leads: Lead[];
    serviceTickets: ServiceTicket[];
    attendanceRecords: AttendanceRecord[];
    serviceReports: ServiceReport[];
    holidays: Holiday[];
    deliveryChallans: DeliveryChallan[];
    installationReports: ServiceReport[];
    monthlyWinners: MonthlyWinner[];
    showWinnerPopup: boolean;
    setShowWinnerPopup: (show: boolean) => void;
    latestWinner: MonthlyWinner | null;
    setLatestWinner: (winner: MonthlyWinner | null) => void;
    acknowledgeWinner: (id: string) => Promise<void>;

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
    addPoints: (amount: number, category: PointHistory['category'], description: string, targetUserId?: string) => Promise<void>;
    updatePrizePool: (amount: number) => void;

    // Activity Logs
    logs: LogEntry[];
    addLog: (category: LogEntry['category'], action: string, details: string, before?: any, after?: any) => Promise<void>;
    fetchAuditLogs: (daysToLookBack?: number) => Promise<void>;

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
    updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
    recordStockMovement: (movement: StockMovement) => Promise<void>;

    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    addTask: (task: Task) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    updateTaskRemote: (id: string, updates: Partial<Task>) => Promise<void>;
    addLead: (lead: Lead) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    removeLead: (id: string) => Promise<void>;
    addServiceTicket: (ticket: ServiceTicket) => Promise<void>;
    updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => Promise<void>;
    addExpense: (expense: ExpenseRecord) => Promise<void>;
    updateExpenseStatus: (id: string, status: ExpenseRecord['status'], reason?: string) => Promise<void>;
    addEmployee: (emp: Employee) => Promise<void>;
    updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
    removeEmployee: (id: string) => Promise<void>;
    addNotification: (title: string, message: string, type: string) => void;
    markNotificationRead: (id: string) => void;
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
    addHoliday: (holiday: Holiday) => Promise<void>;
    removeHoliday: (id: string) => Promise<void>;
    checkAndPerformMonthReset: () => Promise<void>;
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
    // 1. STATE INITIALIZATION
    const [clients, setClients] = useState<Client[]>([]);
    const [currentUser, setCurrentUser] = useState<Employee | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
    const [installationReports, setInstallationReports] = useState<ServiceReport[]>([]);
    const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [monthlyWinners, setMonthlyWinners] = useState<MonthlyWinner[]>([]);
    const [showWinnerPopup, setShowWinnerPopup] = useState(false);
    const [latestWinner, setLatestWinner] = useState<MonthlyWinner | null>(null);
    const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
    const [prizePool, setPrizePool] = useState<number>(1500);
    const [dbError] = useState<string | null>(null);
    const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [userStats, setUserStats] = useState<UserStats>({
        points: 0, tasksCompleted: 0, attendanceStreak: 12, salesRevenue: 0
    });
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const loginLoggedRef = React.useRef(false);

    const isAuthenticated = !!currentUser;

    // 2. LOGGING HELPER
    const addLog = async (category: LogEntry['category'], action: string, details: string, before?: any, after?: any) => {
        if (!currentUser) return;
        const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const log: LogEntry = {
            id: logId,
            timestamp: new Date().toISOString(),
            userName: currentUser.name,
            userRole: currentUser.role,
            category,
            action,
            details,
            beforeValues: before,
            afterValues: after
        };
        auditBatcher.enqueue(log);
        setLogs(prev => [log, ...prev].slice(0, 1000));
    };

    // 3. LISTENERS
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setFirebaseUser(user);
            else {
                setFirebaseUser(null);
                setCurrentUser(null);
                loginLoggedRef.current = false;
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!firebaseUser) return;
        const unsub = onSnapshot(collection(db, "employees"), (s) => {
            const data = s.docs.map(d => ({ ...sanitizeData(d.data()), id: d.id } as Employee));
            setEmployees(data);
        }, (err) => console.warn("Employees Listener Error:", err));
        return () => unsub();
    }, [firebaseUser]);

    useEffect(() => {
        if (!isAuthenticated) {
            setLogs([]);
            return;
        }
        const loadRecentLogs = async () => {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            try {
                const [snapToday, snapYesterday] = await Promise.all([
                    getDoc(doc(db, "system_audit", today)),
                    getDoc(doc(db, "system_audit", yesterday))
                ]);
                let allRecents: LogEntry[] = [];
                if (snapToday.exists()) allRecents = [...snapToday.data().entries];
                if (snapYesterday.exists()) allRecents = [...allRecents, ...snapYesterday.data().entries];
                setLogs(prev => {
                    const combined = [...allRecents, ...prev];
                    const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
                    return unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 500);
                });
            } catch (err) { console.warn("Log fetch fail:", err); }
        };
        loadRecentLogs();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!firebaseUser || employees.length === 0) return;
        let resolvedUser: Employee | null = null;
        const email = firebaseUser.email?.toLowerCase();

        if (email === 'admin@demo.com' || email === 'sreekumar.career@gmail.com') {
            resolvedUser = {
                id: email === 'admin@demo.com' ? 'EMP-BYPASS' : 'EMP-OWNER',
                name: email === 'admin@demo.com' ? 'Enterprise Admin' : 'Sreekumar',
                role: 'SYSTEM_ADMIN',
                department: 'Administration',
                email: email,
                status: 'Active',
                isLoginEnabled: true,
                permissions: Object.values(TabView)
            };
        } else {
            const match = employees.find(e => e.email.toLowerCase() === email);
            if (match) {
                if (match.isLoginEnabled) resolvedUser = { ...match };
                else setAuthError("Registry Locked: Access disabled.");
            }
        }

        if (resolvedUser) {
            setCurrentUser(resolvedUser);
            if (!loginLoggedRef.current) {
                addLog('Auth', 'System Login', `User ${resolvedUser.name} initiated secure session.`);
                loginLoggedRef.current = true;
            }
            setIsAuthenticating(false);
            setAuthError(null);
        } else if (isAuthenticating) {
            const timeout = setTimeout(async () => {
                if (!resolvedUser) {
                    setAuthError(`Access Denied: '${firebaseUser.email}' not found.`);
                    setIsAuthenticating(false);
                    await signOut(auth);
                }
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [firebaseUser, employees, isAuthenticating]);

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        const unsubClients = onSnapshot(collection(db, "clients"), (s) => setClients(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Client)));
        const unsubVendors = onSnapshot(collection(db, "vendors"), (s) => setVendors(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Vendor)));
        const unsubProducts = onSnapshot(collection(db, "products"), (s) => setProducts(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Product)));
        const unsubLeads = onSnapshot(collection(db, "leads"), (s) => setLeads(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Lead)));
        const unsubTickets = onSnapshot(collection(db, "serviceTickets"), (s) => setServiceTickets(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceTicket)));
        const unsubInvoices = onSnapshot(collection(db, "invoices"), (s) => setInvoices(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Invoice)));
        const unsubAttendance = onSnapshot(collection(db, "attendance"), (s) => setAttendanceRecords(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as AttendanceRecord)));
        const unsubExpenses = onSnapshot(collection(db, "expenses"), (s) => setExpenses(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ExpenseRecord)));
        const unsubTasks = onSnapshot(collection(db, "tasks"), (s) => setTasks(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Task)));
        const unsubHolidays = onSnapshot(collection(db, "holidays"), (s) => setHolidays(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Holiday)));
        return () => {
            unsubClients(); unsubVendors(); unsubProducts(); unsubLeads(); unsubTickets();
            unsubInvoices(); unsubAttendance(); unsubExpenses(); unsubTasks(); unsubHolidays();
        };
    }, [firebaseUser, currentUser]);

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        const unsubPoints = onSnapshot(collection(db, "pointHistory"), (s) => setPointHistory(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as PointHistory)));
        const unsubWinners = onSnapshot(collection(db, "monthlyWinners"), (s) => setMonthlyWinners(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as MonthlyWinner)));
        return () => { unsubPoints(); unsubWinners(); };
    }, [firebaseUser, currentUser]);

    // Calculate Dynamic User Stats
    useEffect(() => {
        if (!currentUser) return;
        const userPoints = pointHistory.filter(p => p.userId === currentUser.id).reduce((sum, p) => sum + p.points, 0);
        const userTasks = tasks.filter(t => t.assignedTo === currentUser.name && t.status === 'Done').length;
        const userInvoices = invoices.filter(inv => inv.createdBy === currentUser.name && inv.status !== 'Draft');
        const rev = userInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

        setUserStats({
            points: userPoints,
            tasksCompleted: userTasks,
            attendanceStreak: 12, // Placeholder or calculated from attendanceRecords
            salesRevenue: rev
        });
    }, [pointHistory, tasks, invoices, currentUser]);

    // 4. METHODS
    const loginWithGoogle = async () => {
        setIsAuthenticating(true);
        try {
            await signInWithPopup(auth, googleProvider);
            return true;
        } catch (e) {
            setIsAuthenticating(false);
            return false;
        }
    };

    const login = async (email: string) => {
        setIsAuthenticating(true);
        try {
            const snap = await getDoc(doc(db, "employees", email));
            if (snap.exists()) {
                setCurrentUser(snap.data() as Employee);
                setIsAuthenticating(false);
                return true;
            }
            setIsAuthenticating(false);
            return false;
        } catch {
            setIsAuthenticating(false);
            return false;
        }
    };

    const logout = async () => {
        if (currentUser) {
            await addLog('Auth', 'Session Terminated', `User ${currentUser.name} signed out`);
            await auditBatcher.flush();
        }
        await signOut(auth);
    };

    const addClient = async (c: Client) => { await setDoc(doc(db, "clients", c.id), c); await addLog('System', 'Added Client', `New client: ${c.name}`); };
    const updateClient = async (id: string, c: Partial<Client>) => {
        const existing = clients.find(cl => cl.id === id);
        await updateDoc(doc(db, "clients", id), c);
        await addLog('System', 'Updated Client', `Client updated: ${existing?.name || id}`, existing, { ...existing, ...c });
    };
    const removeClient = async (id: string) => { await deleteDoc(doc(db, "clients", id)); await addLog('System', 'Removed Client', `Client deleted: ${id}`); };
    
    const addProduct = async (p: Product) => { await setDoc(doc(db, "products", p.id), p); await addLog('Inventory', 'Added Product', `Item: ${p.name}`); };
    const updateProduct = async (id: string, p: Partial<Product>) => {
        const existing = products.find(pr => pr.id === id);
        await updateDoc(doc(db, "products", id), p);
        await addLog('Inventory', 'Updated Product', `Product modified: ${existing?.name || id}`, existing, { ...existing, ...p });
    };
    const removeProduct = async (id: string) => { await deleteDoc(doc(db, "products", id)); await addLog('Inventory', 'Removed Product', `Deleted: ${id}`); };

    const updateAttendance = async (rec: Partial<AttendanceRecord> & { id: string }) => { await setDoc(doc(db, "attendance", rec.id), rec, { merge: true }); await addLog('Attendance', 'Updated Record', `ID: ${rec.id}`); };

    const addNotification = () => {};
    const markNotificationRead = () => {};
    const clearAllNotifications = () => {};
    
    const addLead = async (l: Lead) => { await setDoc(doc(db, "leads", l.id), l); await addLog('Leads', 'New Lead', `${l.name}`); };
    const updateLead = async (id: string, u: Partial<Lead>) => {
        const existing = leads.find(l => l.id === id);
        await updateDoc(doc(db, "leads", id), u);
        await addLog('Leads', 'Updated Lead', `Lead mod: ${existing?.name || id}`, existing, { ...existing, ...u });
    };
    const removeLead = async (id: string) => { await deleteDoc(doc(db, "leads", id)); await addLog('Leads', 'Deleted Lead', id); };

    const seedDatabase = async () => { await addLog('System', 'DB Seed', 'Sync triggered'); };
    const updateInvoice = async (id: string, u: Partial<Invoice>) => {
        const existing = invoices.find(i => i.id === id);
        await updateDoc(doc(db, "invoices", id), u);
        await addLog('Billing', 'Updated Doc', `${existing?.invoiceNumber || id}`, existing, { ...existing, ...u });
    };

    const acknowledgeWinner = async (id: string) => { await updateDoc(doc(db, "monthlyWinners", id), { acknowledged: true }); };

    const checkAndPerformMonthReset = async () => {
        const settingsRef = doc(db, "systemSettings", "management");
        const snap = await getDoc(settingsRef);
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
        const lastResetMonth = snap.data()?.lastResetMonth;

        if (lastResetMonth && lastResetMonth !== currentMonth) {
            // A brand new month has started. Perform archival of the PREVIOUS month.
            const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthId = previousDate.toISOString().slice(0, 7);
            
            try {
                // 1. Archive last month's expenses as CSV
                const lastMonthExpenses = expenses.filter(e => e.date.startsWith(prevMonthId));
                await Archiver.archiveMonthlyExpenses(prevMonthId, lastMonthExpenses);
                await addLog('System', 'Monthly Archive', `Expense CSV generated for ${prevMonthId}`);

                // 2. Financial Year End Detection (Prev month was March)
                if (prevMonthId.endsWith('-03')) {
                    const fyId = `FY-${previousDate.getFullYear() - 1}-${previousDate.getFullYear().toString().slice(-2)}`;
                    await addLog('System', 'FY Reset Initiation', `Starting archival and data wipe for ${fyId}`);
                    
                    // Archive Year
                    await Archiver.consolidateAnnualReport(fyId);
                    
                    // Critical Wipe
                    await Archiver.performFinancialYearReset();
                    await addLog('System', 'FY Reset Completed', `All operational data wiped for new financial year.`);
                }
                
                await updateDoc(settingsRef, { lastResetMonth: currentMonth });
            } catch (err) {
                console.error("Critical Archival Error:", err);
                await addLog('System', 'Archive Failure', `Automatic archiving failed: ${String(err)}`);
            }
        } else if (!snap.exists()) {
            // First time initialization
            await setDoc(settingsRef, { lastResetMonth: currentMonth });
        }
    };

    const updateTaskRemote = async (id: string, u: Partial<Task>) => {
        const existing = tasks.find(t => t.id === id);
        await updateDoc(doc(db, "tasks", id), u);
        await addLog('Tasks', 'Modified Task', existing?.title || id, existing, { ...existing, ...u });
    };
    const addTask = async (t: Task) => { await setDoc(doc(db, "tasks", t.id), t); await addLog('Tasks', 'New Task', t.title); };
    const removeTask = async (id: string) => { await deleteDoc(doc(db, "tasks", id)); await addLog('Tasks', 'Deleted Task', id); };

    const addServiceTicket = async (t: ServiceTicket) => { await setDoc(doc(db, "serviceTickets", t.id), t); await addLog('System', 'New Ticket', t.issue); };
    const updateServiceTicket = async (id: string, u: Partial<ServiceTicket>) => { await updateDoc(doc(db, "serviceTickets", id), u); await addLog('System', 'Updated Ticket', id); };

    const addExpense = async (e: ExpenseRecord) => { await setDoc(doc(db, "expenses", e.id), e); await addLog('Billing', 'New Expense', `₹${e.amount}`); };
    const updateExpenseStatus = async (id: string, status: ExpenseRecord['status']) => { await updateDoc(doc(db, "expenses", id), { status }); await addLog('Billing', 'Expense Status', `${id} -> ${status}`); };

    const addEmployee = async (e: Employee) => { await setDoc(doc(db, "employees", e.id), e); await addLog('System', 'New Employee', e.name); };
    const updateEmployee = async (id: string, u: Partial<Employee>) => {
        const existing = employees.find(e => e.id === id);
        await updateDoc(doc(db, "employees", id), u);
        await addLog('System', 'Updated Employee', existing?.name || id, existing, { ...existing, ...u });
    };
    const removeEmployee = async (id: string) => { await deleteDoc(doc(db, "employees", id)); await addLog('System', 'Removed Employee', id); };

    const addDeliveryChallan = async (c: DeliveryChallan) => { await setDoc(doc(db, "deliveryChallans", c.id), c); await addLog('System', 'New Challan', c.challanNumber); };
    const updateDeliveryChallan = async (id: string, u: Partial<DeliveryChallan>) => {
        const existing = deliveryChallans.find(c => c.id === id);
        await updateDoc(doc(db, "deliveryChallans", id), u);
        await addLog('System', 'Updated Challan', existing?.challanNumber || id, existing, { ...existing, ...u });
    };
    const removeDeliveryChallan = async (id: string) => { await deleteDoc(doc(db, "deliveryChallans", id)); await addLog('System', 'Removed Challan', id); };

    const addInstallationReport = async (r: ServiceReport) => { await setDoc(doc(db, "installationReports", r.id), r); await addLog('System', 'Created Installation Report', r.reportNumber); };
    const updateInstallationReport = async (id: string, u: Partial<ServiceReport>) => {
        const existing = installationReports.find(r => r.id === id);
        await updateDoc(doc(db, "installationReports", id), u);
        await addLog('System', 'Updated Installation Report', existing?.reportNumber || id, existing, { ...existing, ...u });
    };
    const removeInstallationReport = async (id: string) => { await deleteDoc(doc(db, "installationReports", id)); await addLog('System', 'Removed Installation Report', id); };

    const addServiceReport = async (r: ServiceReport) => { await setDoc(doc(db, "serviceReports", r.id), r); await addLog('System', 'Created Service Report', r.reportNumber); };
    const updateServiceReport = async (id: string, u: Partial<ServiceReport>) => {
        const existing = serviceReports.find(r => r.id === id);
        await updateDoc(doc(db, "serviceReports", id), u);
        await addLog('System', 'Updated Service Report', existing?.reportNumber || id, existing, { ...existing, ...u });
    };
    const removeServiceReport = async (id: string) => { await deleteDoc(doc(db, "serviceReports", id)); await addLog('System', 'Removed Service Report', id); };

    const addHoliday = async (h: Holiday) => { await setDoc(doc(db, "holidays", h.id), h); await addLog('System', 'Added Holiday', h.name); };
    const removeHoliday = async (id: string) => { await deleteDoc(doc(db, "holidays", id)); await addLog('System', 'Removed Holiday', id); };

    const addPoints = async (amount: number, cat: PointHistory['category'], desc: string, target?: string) => {
        const id = `PT-${Date.now()}`;
        const item = { id, userId: target || currentUser?.id || 'sys', points: amount, category: cat, description: desc, date: new Date().toISOString() };
        await setDoc(doc(db, "pointHistory", id), item);
        await addLog('System', 'Points Gift', `${amount} to ${target || 'User'}`);
    };

    const recordStockMovement = async (m: StockMovement) => { await setDoc(doc(db, "stockMovements", m.id), m); await addLog('Inventory', 'Stock Movement', `${m.type} ${m.quantity} ${m.productName} for ${m.purpose}`); };
    const addVendor = async (v: Vendor) => { await setDoc(doc(db, "vendors", v.id), v); await addLog('System', 'Added Vendor', v.name); };
    const updateVendor = async (id: string, v: Partial<Vendor>) => {
        const existing = vendors.find(ven => ven.id === id);
        await updateDoc(doc(db, "vendors", id), v);
        await addLog('System', 'Updated Vendor', existing?.name || id, existing, { ...existing, ...v });
    };
    const removeVendor = async (id: string) => { await deleteDoc(doc(db, "vendors", id)); await addLog('System', 'Removed Vendor', id); };

    const addInvoice = async (i: Invoice) => { await setDoc(doc(db, "invoices", i.id), i); await addLog('Billing', 'Invoice Generated', i.invoiceNumber); };
    const fetchAuditLogs = async (days: number = 7) => {
        let all: LogEntry[] = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
            const snap = await getDoc(doc(db, "system_audit", date));
            if (snap.exists()) all = [...all, ...snap.data().entries];
        }
        setLogs(prev => {
            const combined = [...all, ...prev];
            const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
            return unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 2000);
        });
    };

    const updatePrizePool = (a: number) => setPrizePool(a);

    return (
        <DataContext.Provider value={{
            clients, vendors, products, invoices, stockMovements, expenses, employees, notifications: [], tasks, leads, serviceTickets,
            pendingQuoteData, setPendingQuoteData,
            currentUser, isAuthenticated, login, loginWithGoogle, logout, seedDatabase,
            addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
            addProduct, updateProduct, removeProduct, addLead, updateLead, removeLead, addServiceTicket, updateServiceTicket,
            addInvoice, updateInvoice, recordStockMovement, addExpense, updateExpenseStatus,
            addEmployee, updateEmployee, removeEmployee,
            setTasks, addTask, removeTask, updateTaskRemote,
            dbError, authError, isAuthenticating,
            userStats, pointHistory, addPoints, addNotification, markNotificationRead, clearAllNotifications,
            attendanceRecords, updateAttendance, holidays, addHoliday, removeHoliday,
            deliveryChallans, addDeliveryChallan, updateDeliveryChallan, removeDeliveryChallan,
            installationReports, addInstallationReport, updateInstallationReport, removeInstallationReport,
            serviceReports, addServiceReport, updateServiceReport, removeServiceReport,
            prizePool, updatePrizePool, monthlyWinners, showWinnerPopup, setShowWinnerPopup, latestWinner, setLatestWinner, acknowledgeWinner, checkAndPerformMonthReset,
            logs, addLog, fetchAuditLogs
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
