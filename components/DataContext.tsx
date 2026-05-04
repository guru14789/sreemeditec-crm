
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { 
    collection, 
    onSnapshot, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    getDocs,
    orderBy,
    limit,
    increment,
    startAfter
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { db, auth, googleProvider } from '../firebase';
import { auditBatcher } from '../services/AuditBatcher';
import { Archiver } from '../services/Archiver';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, Task, Lead, ServiceTicket, AttendanceRecord, DeliveryChallan, ServiceReport, Holiday, MonthlyWinner, LogEntry, LeaveRequest, PurchaseRecord, StockBatch, Ledger, AccountGroup, AccountingVoucher, StockTransfer } from '../types';

export interface DataContextType {
    clients: Client[];
    vendors: Vendor[];
    products: Product[];
    invoices: Invoice[];
    stockMovements: StockMovement[];
    stockBatches: StockBatch[];
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
    leaveRequests: LeaveRequest[];
    installationReports: ServiceReport[];
    monthlyWinners: MonthlyWinner[];
    purchaseRecords: PurchaseRecord[];
    
    // New Accounting States
    ledgers: Ledger[];
    accountGroups: AccountGroup[];
    vouchers: AccountingVoucher[];
    stockTransfers: StockTransfer[];
    expenseStats: { approved: number, pending: number, rejected: number };
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
    financialYear: string;
    updateFinancialYear: (newFY: string) => Promise<void>;

    // Activity Logs
    logs: LogEntry[];
    hasMoreLogs: boolean;
    addLog: (category: LogEntry['category'], action: string, details: string, before?: any, after?: any) => Promise<void>;
    fetchAuditLogs: (isLoadMore?: boolean) => Promise<void>;

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
    addStockBatch: (batch: StockBatch) => Promise<void>;
    updateStockBatch: (id: string, updates: Partial<StockBatch>) => Promise<void>;


    addTask: (task: Task) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    updateTaskRemote: (id: string, updates: Partial<Task>) => Promise<void>;
    addLead: (lead: Lead) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    removeLead: (id: string) => Promise<void>;
    addServiceTicket: (ticket: ServiceTicket) => Promise<void>;
    updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => Promise<void>;
    addExpense: (expense: ExpenseRecord) => Promise<void>;
    updateExpense: (id: string, updates: Partial<ExpenseRecord>) => Promise<void>;
    updateExpenseStatus: (id: string, status: ExpenseRecord['status'], reason?: string) => Promise<void>;
    addEmployee: (emp: Employee) => Promise<void>;
    updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
    removeEmployee: (id: string) => Promise<void>;
    addNotification: (title: string, message: string, type: string) => void;
    markNotificationRead: (id: string) => void;
    clearAllNotifications: () => void;
    updateAttendance: (record: Partial<AttendanceRecord> & { id: string }) => Promise<void>;
    removeAttendance: (id: string) => Promise<void>;
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
    addLeaveRequest: (req: LeaveRequest) => Promise<void>;
    updateLeaveRequest: (id: string, updates: Partial<LeaveRequest>) => Promise<void>;

    addPurchaseRecord: (record: PurchaseRecord) => Promise<void>;
    updatePurchaseRecord: (id: string, updates: Partial<PurchaseRecord>) => Promise<void>;
    removePurchaseRecord: (id: string) => Promise<void>;

    // Accounting Methods
    addLedger: (ledger: Ledger) => Promise<void>;
    updateLedger: (id: string, updates: Partial<Ledger>) => Promise<void>;
    addAccountGroup: (group: AccountGroup) => Promise<void>;
    addVoucher: (voucher: AccountingVoucher) => Promise<void>;
    postToLedger: (voucherData: Partial<AccountingVoucher>) => Promise<void>;
    addStockTransfer: (transfer: StockTransfer) => Promise<void>;

    checkAndPerformMonthReset: () => Promise<void>;
    
    // Search
    searchRecords: <T>(collectionName: string, field: string, value: string) => Promise<T[]>;
    fetchMoreData: (collectionName: string, orderByField?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const sanitizeData = (data: any): any => {
    // Immediate escape for simple null/undefined
    if (data === null || data === undefined) return null;
    
    // Handle Primitive types
    if (typeof data !== 'object') return data;
    
    // Handle Firestore Timestamps / Dates
    if (typeof data.toDate === 'function') return data.toDate().toISOString();
    if (data instanceof Date) return isNaN(data.getTime()) ? null : data.toISOString();

    // Handle Arrays
    if (Array.isArray(data)) {
        return data
            .map(sanitizeData)
            .filter(item => item !== undefined && item !== null);
    }

    // Handle Objects
    const plain: any = {};
    Object.keys(data).forEach(key => {
        const value = data[key];
        
        // Explicitly skip functions and undefined values
        if (typeof value === 'function' || value === undefined) return;
        
        const sanitizedValue = sanitizeData(value);
        // Only add key if the sanitized value is also not undefined
        if (sanitizedValue !== undefined) {
            plain[key] = sanitizedValue;
        }
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
    const [invoiceSnap, setInvoiceSnap] = useState<Invoice[]>([]);
    const [pushedInvoices, setPushedInvoices] = useState<Invoice[]>([]);
    const invoices = useMemo(() => {
        const ids = new Set(invoiceSnap.map(i => i.id));
        return [...invoiceSnap, ...pushedInvoices.filter(i => !ids.has(i.id))].sort((a,b) => b.date.localeCompare(a.date));
    }, [invoiceSnap, pushedInvoices]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [lastLogDoc, setLastLogDoc] = useState<any>(null);
    const [hasMoreLogs, setHasMoreLogs] = useState(true);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [expenseSnap, setExpenseSnap] = useState<ExpenseRecord[]>([]);
    const [pushedExpenses, setPushedExpenses] = useState<ExpenseRecord[]>([]);
    const expenses = useMemo(() => {
        const ids = new Set(expenseSnap.map(e => e.id));
        return [...expenseSnap, ...pushedExpenses.filter(e => !ids.has(e.id))].sort((a,b) => b.date.localeCompare(a.date));
    }, [expenseSnap, pushedExpenses]);

    const [voucherSnap, setVoucherSnap] = useState<AccountingVoucher[]>([]);
    const [pushedVouchers, setPushedVouchers] = useState<AccountingVoucher[]>([]);
    const vouchers = useMemo(() => {
        const ids = new Set(voucherSnap.map(v => v.id));
        return [...voucherSnap, ...pushedVouchers.filter(v => !ids.has(v.id))].sort((a,b) => b.date.localeCompare(a.date));
    }, [voucherSnap, pushedVouchers]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [taskSnap, setTaskSnap] = useState<Task[]>([]);
    const [pushedTasks, setPushedTasks] = useState<Task[]>([]);
    const tasks = useMemo(() => {
        const ids = new Set(taskSnap.map(t => t.id));
        return [...taskSnap, ...pushedTasks.filter(t => !ids.has(t.id))].sort((a,b) => b.id.localeCompare(a.id));
    }, [taskSnap, pushedTasks]);
    const [leadSnap, setLeadSnap] = useState<Lead[]>([]);
    const [pushedLeads, setPushedLeads] = useState<Lead[]>([]);
    const leads = useMemo(() => {
        const ids = new Set(leadSnap.map(l => l.id));
        return [...leadSnap, ...pushedLeads.filter(l => !ids.has(l.id))].sort((a,b) => b.lastContact.localeCompare(a.lastContact));
    }, [leadSnap, pushedLeads]);
    const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>([]);
    const [installationReports, setInstallationReports] = useState<ServiceReport[]>([]);
    const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [monthlyWinners, setMonthlyWinners] = useState<MonthlyWinner[]>([]);
    const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
    const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
    
    // Accounting States
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
    const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
    const [expenseStats, setExpenseStats] = useState({ approved: 0, pending: 0, rejected: 0 });

    const [showWinnerPopup, setShowWinnerPopup] = useState(false);
    const [latestWinner, setLatestWinner] = useState<MonthlyWinner | null>(null);
    const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
    const [prizePool, setPrizePool] = useState<number>(1500);
    const [financialYear, setFinancialYear] = useState<string>("26-27");
    const [dbError] = useState<string | null>(null);
    const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [authError, setAuthError] = useState<string | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const loginLoggedRef = React.useRef(false);

    const isAuthenticated = !!currentUser;

    // 2. LOGGING HELPER
    const addLog = async (category: LogEntry['category'], action: string, details: string, before?: any, after?: any) => {
        if (!currentUser) return;
        const logId = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const baseLog: LogEntry = {
            id: logId,
            timestamp: new Date().toISOString(),
            userName: currentUser.name || 'Unknown',
            userRole: currentUser.role || 'User',
            category,
            action,
            details,
        };
        
        const log: LogEntry = { ...baseLog };
        if (before !== undefined) log.beforeValues = sanitizeData(before);
        if (after !== undefined) log.afterValues = sanitizeData(after);

        const cleanLog = sanitizeData(log);
        auditBatcher.enqueue(cleanLog);
        setLogs(prev => [cleanLog, ...prev].slice(0, 1000));
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
        if (!firebaseUser || firebaseUser.isAnonymous) return;
        
        let resolvedUser: Employee | null = null;
        const email = (firebaseUser.email || firebaseUser.providerData?.[0]?.email)?.toLowerCase();


        // 1. Check for Super Admin Bypass (Immediate Resolution)
        if (email === 'sreekumar.career@gmail.com') {
            resolvedUser = {
                id: 'EMP-OWNER',
                name: 'Sreekumar',
                role: 'SYSTEM_ADMIN',
                department: 'Administration',
                email: email,
                status: 'Active',
                isLoginEnabled: true,
                permissions: Object.values(TabView)
            };
        } else if (employees.length > 0) {
            // 2. Resolve against Registry
            const match = employees.find(e => e.email.toLowerCase() === email);
            if (match) {
                if (match.isLoginEnabled) {
                    resolvedUser = { ...match };
                } else {
                    setAuthError("Registry Locked: Access disabled.");
                    signOut(auth);
                    setIsAuthenticating(false);
                }
            } else {
                setAuthError(`Access Denied: '${firebaseUser.email}' not found in registry.`);
                signOut(auth);
                setIsAuthenticating(false);
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
        }
    }, [firebaseUser, employees, isAuthenticating]);

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        
        // Static/Low-Churn Registries: Use one-time fetches with native cache fallback
        const loadRegistries = async () => {
            try {
                const [cSnap, vSnap, pSnap, hSnap] = await Promise.all([
                    getDocs(query(collection(db, "clients"), orderBy('name', 'asc'))),
                    getDocs(query(collection(db, "vendors"), orderBy('name', 'asc'))),
                    getDocs(query(collection(db, "products"), orderBy('name', 'asc'))),
                    getDocs(collection(db, "holidays"))
                ]);
                setClients(cSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Client));
                setVendors(vSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Vendor));
                setProducts(pSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Product));
                setHolidays(hSnap.docs.map(d => ({...d.data(), id: d.id}) as Holiday));
            } catch (err) { console.error("Registry load failed", err); }
        };
        loadRegistries();

        // Dynamic Collections (High Growth): Initial small batch, then paginated
        const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy('id', 'desc'), limit(150)), (s) => handleSnap('tasks', s, setTaskSnap));
        
        // Save last pointers for pagination
        const handleSnap = (name: string, snap: any, setter: any) => {
            if (!snap.empty) {
                setLastDocs(prev => ({ ...prev, [name]: snap.docs[snap.docs.length - 1] }));
            }
            setter(snap.docs.map((d: any) => ({...sanitizeData(d.data()), id: d.id})));
        };

        const unsubInvoices = onSnapshot(query(collection(db, "invoices"), orderBy('date', 'desc'), limit(100)), (s) => handleSnap('invoices', s, setInvoiceSnap));
        const unsubLeads = onSnapshot(query(collection(db, "leads"), orderBy('lastContact', 'desc'), limit(25)), (s) => handleSnap('leads', s, setLeadSnap));
        const unsubExpenses = onSnapshot(query(collection(db, "expenses"), orderBy('date', 'desc'), limit(20)), (s) => handleSnap('expenses', s, setExpenseSnap));
        const unsubTickets = onSnapshot(query(collection(db, "serviceTickets"), orderBy('timestamp', 'desc'), limit(30)), (s) => handleSnap('serviceTickets', s, setServiceTickets));
        const unsubAttendance = onSnapshot(query(collection(db, "attendance"), orderBy('date', 'desc'), limit(1000)), (s) => setAttendanceRecords(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as AttendanceRecord)));
        const unsubStock = onSnapshot(query(collection(db, "stockMovements"), orderBy('timestamp', 'desc'), limit(50)), (s) => setStockMovements(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockMovement)));
        const unsubChallans = onSnapshot(query(collection(db, "deliveryChallans"), orderBy('date', 'desc'), limit(100)), (s) => setDeliveryChallans(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as DeliveryChallan)));
        const unsubServiceReports = onSnapshot(query(collection(db, "serviceReports"), orderBy('date', 'desc'), limit(100)), (s) => setServiceReports(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceReport)));
        const unsubInstallReports = onSnapshot(query(collection(db, "installationReports"), orderBy('date', 'desc'), limit(100)), (s) => setInstallationReports(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceReport)));
        const unsubLeave = onSnapshot(query(collection(db, "leave_requests"), orderBy('appliedOn', 'desc'), limit(100)), (s) => setLeaveRequests(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as LeaveRequest)));
        const unsubPurchases = onSnapshot(query(collection(db, "purchaseRecords"), orderBy('dateSupply', 'desc'), limit(100)), (s) => setPurchaseRecords(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as PurchaseRecord)));
        const unsubBatches = onSnapshot(collection(db, "stockBatches"), (s) => setStockBatches(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockBatch)));
        
        // Accounting Listeners
        const unsubLedgers = onSnapshot(collection(db, "ledgers"), (s) => setLedgers(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Ledger)));
        const unsubGroups = onSnapshot(collection(db, "accountGroups"), (s) => setAccountGroups(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as AccountGroup)));
        const unsubVouchers = onSnapshot(query(collection(db, "vouchers"), orderBy('date', 'desc'), limit(20)), (s) => handleSnap('vouchers', s, setVoucherSnap));
        const unsubTransfers = onSnapshot(query(collection(db, "stockTransfers"), orderBy('date', 'desc'), limit(100)), (s) => setStockTransfers(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockTransfer)));

        const unsubSettings = onSnapshot(doc(db, "settings", "system"), (s) => {
            if (s.exists()) {
                const data = s.data();
                if (data.prizePool) setPrizePool(data.prizePool);
                if (data.financialYear) setFinancialYear(data.financialYear);
            }
        });
        
        const qStats = (currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.department === 'Administration') 
            ? query(collection(db, "expenses"))
            : query(collection(db, "expenses"), where("employeeName", "==", currentUser?.name || ''));

        const unsubStats = onSnapshot(qStats, (snap) => {
            let approved = 0, pending = 0, rejected = 0;
            snap.docs.forEach(doc => {
                const data = doc.data();
                const amt = data.amount || 0;
                if (data.status === 'Approved') approved += amt;
                else if (data.status === 'Rejected') rejected += amt;
                else pending += amt;
            });
            setExpenseStats({ approved, pending, rejected });
        });

        return () => {
            unsubLeads(); unsubTickets();
            unsubInvoices(); unsubAttendance(); unsubExpenses(); unsubTasks(); unsubStock();
            unsubChallans(); unsubServiceReports(); unsubInstallReports();
            unsubLeave(); unsubSettings(); unsubPurchases(); unsubBatches();
            unsubLedgers(); unsubGroups(); unsubVouchers(); unsubTransfers();
            unsubStats();
        };
    }, [firebaseUser?.uid, currentUser?.id]);

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        
        // Scope optimization: Only listen to user's point history if not admin (though currently fetching all for ledger)
        // Tightening limit from infinite to most recent 200
        const qPoints = query(collection(db, "pointHistory"), orderBy('date', 'desc'), limit(200));
        const unsubPoints = onSnapshot(qPoints, (s) => setPointHistory(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as PointHistory)));
        
        const unsubWinners = onSnapshot(collection(db, "monthlyWinners"), (s) => setMonthlyWinners(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as MonthlyWinner)));
        
        return () => { unsubPoints(); unsubWinners(); };
    }, [firebaseUser?.uid, currentUser?.id]);

    const userStats = useMemo(() => {
        if (!currentUser) return { points: 0, tasksCompleted: 0, attendanceStreak: 0, salesRevenue: 0 };

        const points = pointHistory
            .filter(p => p.userId === currentUser.id)
            .reduce((sum, p) => sum + p.points, 0);

        const tasksCompleted = tasks.filter(t => 
            (t.assignedTo === currentUser.name || t.submittedBy === currentUser.name) && 
            t.status === 'Done'
        ).length;

        const salesRevenue = invoices.filter(i => 
            (i.documentType === 'Invoice' || !i.documentType) && 
            (i.createdBy === currentUser.name)
        ).reduce((sum, i) => sum + (i.grandTotal || 0), 0);

        const userAttendance = attendanceRecords
            .filter(a => a.userName === currentUser.name)
            .sort((a, b) => b.date.localeCompare(a.date));

        let streak = 0;
        if (userAttendance.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            let currentCheckDate = userAttendance[0].date;
            
            if (currentCheckDate === today || currentCheckDate === yesterday) {
                streak = 1;
                for (let i = 1; i < userAttendance.length; i++) {
                    const prevDate = new Date(currentCheckDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const expectedDate = prevDate.toISOString().split('T')[0];
                    if (userAttendance[i].date === expectedDate) {
                        streak++;
                        currentCheckDate = expectedDate;
                    } else break;
                }
            }
        }

        return { points, tasksCompleted, attendanceStreak: streak, salesRevenue };
    }, [currentUser, pointHistory, tasks, invoices, attendanceRecords]);

    // 4. METHODS
    const loginWithGoogle = async () => {
        setIsAuthenticating(true);
        try {
            if (Capacitor.isNativePlatform()) {
                await GoogleAuth.initialize();
                const googleUser = await GoogleAuth.signIn();
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                await signInWithCredential(auth, credential);
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
            return true;
        } catch (e: any) {
            console.error("Google Auth Error:", e);
            setAuthError("Google Login Failed: " + (e.message || JSON.stringify(e)));
            setIsAuthenticating(false);
            return false;
        }
    };

    const login = async (email: string, password?: string) => {
        setIsAuthenticating(true);
        setAuthError(null);
        try {
            const lowerEmail = email.toLowerCase();
            
            // 1. First, satisfy Firestore Security Rules by ensuring AT LEAST an anonymous auth context
            // This is required because our rules block all reads to unauthenticated users.
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn("Auth Context Initialization Failure:", e);
                }
            }

            // 2. Immediate Bypass for Primary System Administrators
            if (lowerEmail === 'sreekumar.career@gmail.com' && password === 'SreeAdmin2026') {
                const adminUser: Employee = {
                    id: 'EMP-OWNER',
                    name: 'Sreekumar',
                    role: 'SYSTEM_ADMIN',
                    department: 'Administration',
                    email: lowerEmail,
                    status: 'Active',
                    isLoginEnabled: true,
                    permissions: Object.values(TabView)
                };
                setCurrentUser(adminUser);
                setIsAuthenticating(false);
                return true;
            }

            // 3. Direct Query against Employee Registry (Bypassing local state which might be empty)
            const q = query(collection(db, "employees"), where("email", "==", lowerEmail));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const match = snap.docs[0].data() as Employee;
                if (!match.isLoginEnabled) {
                    setAuthError("Account Locked: Registry access revoked by Admin.");
                } else if (match.password === password) {
                    setCurrentUser({ ...match, id: snap.docs[0].id });
                    setIsAuthenticating(false);
                    return true;
                } else {
                    setAuthError("Security Key Recognition Failure: Incorrect key.");
                }
            } else {
                setAuthError("Account Discovery Failure: Registry record not found.");
            }
            
            setIsAuthenticating(false);
            return false;
        } catch (err: any) {
            console.error("Critical Authentication Exception:", err);
            setAuthError("Core System Error: Unable to verify registry credentials.");
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

    // --- AUDIT TRAIL HELPERS ---
    const createAuditEntry = (action: AuditLogEntry['action'], oldData: any, newData: any, reason?: string): AuditLogEntry => {
        const changes: AuditLogEntry['changes'] = [];
        const ignoreFields = ['editHistory', 'lastUpdated', 'id'];

        const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
        
        for (const key of allKeys) {
            if (ignoreFields.includes(key)) continue;
            const oldVal = oldData?.[key];
            const newVal = newData?.[key];
            
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                changes.push({
                    field: key,
                    oldValue: oldVal === undefined ? null : oldVal,
                    newValue: newVal === undefined ? null : newVal
                });
            }
        }

        return {
            id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.name || 'System',
            action,
            changes,
            reason
        };
    };

    // 5. AGGREGATION HELPERS
    const updateMonthlySummary = async (date: string, amount: number, type: 'revenue' | 'expense') => {
        const monthId = date.slice(0, 7); // YYYY-MM
        const summaryRef = doc(db, "summaries", monthId);
        
        try {
            await setDoc(summaryRef, {
                [type]: increment(amount),
                lastUpdated: new Date().toISOString(),
                month: monthId
            }, { merge: true });
        } catch (err) {
            console.error("Summary update failed:", err);
        }
    };

    const updateUserSummary = async (userId: string, userName: string, amount: number, taskIncrement: number = 0) => {
        const summaryRef = doc(db, "userSummaries", userId);
        try {
            await setDoc(summaryRef, {
                name: userName,
                salesRevenue: increment(amount),
                tasksCompleted: increment(taskIncrement),
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error("User summary update failed:", err);
        }
    };

    const searchRecords = async <T,>(collectionName: string, field: string, value: string): Promise<T[]> => {
        // Basic prefix search implementation
        const q = query(
            collection(db, collectionName),
            where(field, ">=", value),
            where(field, "<=", value + "\uf8ff"),
            limit(20)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as T));
    };

    const [lastDocs, setLastDocs] = useState<Record<string, any>>({});
    const fetchMoreData = async (colName: string, orderByField: string = 'date') => {
        const lastDoc = lastDocs[colName];
        if (!lastDoc) return;

        const q = query(
            collection(db, colName),
            orderBy(orderByField, 'desc'),
            startAfter(lastDoc),
            limit(20)
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        setLastDocs(prev => ({ ...prev, [colName]: snap.docs[snap.docs.length - 1] }));
        const newData = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        
        if (colName === 'invoices') setPushedInvoices(prev => [...prev, ...newData] as Invoice[]);
        if (colName === 'leads') setPushedLeads(prev => [...prev, ...newData] as Lead[]);
        if (colName === 'expenses') setPushedExpenses(prev => [...prev, ...newData] as ExpenseRecord[]);
        if (colName === 'tasks') setPushedTasks(prev => [...prev, ...newData] as Task[]);
        if (colName === 'vouchers') setPushedVouchers(prev => [...prev, ...newData] as AccountingVoucher[]);
    };

    const addClient = async (c: Client) => { 
        setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "clients", c.id), sanitizeData(c)); 
        await addLog('System', 'Added Client', `New client: ${c.name}`); 
    };
    const updateClient = async (id: string, c: Partial<Client>) => {
        const existing = clients.find(cl => cl.id === id);
        if (existing) setClients(prev => prev.map(cl => cl.id === id ? { ...cl, ...c } as Client : cl).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "clients", id), sanitizeData(c));
        await addLog('System', 'Updated Client', `Client updated: ${existing?.name || id}`, existing, { ...existing, ...c });
    };
    const removeClient = async (id: string) => { 
        setClients(prev => prev.filter(c => c.id !== id));
        await deleteDoc(doc(db, "clients", id)); 
        await addLog('System', 'Removed Client', `Client deleted: ${id}`); 
    };
    
    const addProduct = async (p: Product) => { 
        setProducts(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "products", p.id), sanitizeData(p)); 
        await addLog('Inventory', 'Added Product', `Item: ${p.name}`); 
    };
    const updateProduct = async (id: string, p: Partial<Product>) => {
        const existing = products.find(pr => pr.id === id);
        if (existing) setProducts(prev => prev.map(pr => pr.id === id ? { ...pr, ...p } as Product : pr).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "products", id), sanitizeData(p));
        await addLog('Inventory', 'Updated Product', `Item: ${existing?.name || id}`, existing, { ...existing, ...p });
    };

    const addStockBatch = async (batch: StockBatch) => {
        await setDoc(doc(db, "stockBatches", batch.id), sanitizeData(batch));
        await addLog('Inventory', 'Created Batch', `Batch: ${batch.batchNo} for Product: ${batch.productId}`);
    };

    const updateStockBatch = async (id: string, updates: Partial<StockBatch>) => {
        await updateDoc(doc(db, "stockBatches", id), sanitizeData(updates));
    };
    const removeProduct = async (id: string) => { 
        setProducts(prev => prev.filter(p => p.id !== id));
        await deleteDoc(doc(db, "products", id)); 
        await addLog('Inventory', 'Removed Product', `Deleted: ${id}`); 
    };

    const updateAttendance = async (rec: Partial<AttendanceRecord> & { id: string }) => { await setDoc(doc(db, "attendance", rec.id), sanitizeData(rec), { merge: true }); await addLog('Attendance', 'Updated Record', `ID: ${rec.id}`); };
    const removeAttendance = async (id: string) => { await deleteDoc(doc(db, "attendance", id)); await addLog('Attendance', 'Deleted Record', `ID: ${id}`); };

    const addNotification = (title: string, message: string, type: string) => { void title; void message; void type; };
    const markNotificationRead = (id: string) => { void id; };
    const clearAllNotifications = () => {};
    
    const addLead = async (l: Lead) => { await setDoc(doc(db, "leads", l.id), sanitizeData(l)); await addLog('Leads', 'New Lead', `${l.name}`); };
    const updateLead = async (id: string, u: Partial<Lead>) => {
        const existing = leads.find(l => l.id === id);
        await updateDoc(doc(db, "leads", id), sanitizeData(u));
        await addLog('Leads', 'Updated Lead', `Lead mod: ${existing?.name || id}`, existing, { ...existing, ...u });
    };
    const removeLead = async (id: string) => { await deleteDoc(doc(db, "leads", id)); await addLog('Leads', 'Deleted Lead', id); };

    const seedDatabase = async () => { 
        await addLog('System', 'DB Seed', 'Sync triggered');
        
        // Seed default groups
        const defaultGroups: AccountGroup[] = [
            { id: 'GRP-ASSETS', name: 'Assets', type: 'Asset' },
            { id: 'GRP-LIABILITIES', name: 'Liabilities', type: 'Liability' },
            { id: 'GRP-INCOME', name: 'Income', type: 'Revenue' },
            { id: 'GRP-EXPENSES', name: 'Expenses', type: 'Expense' },
            { id: 'GRP-CASH', name: 'Cash-in-Hand', parentGroupId: 'GRP-ASSETS', type: 'Asset' },
            { id: 'GRP-BANK', name: 'Bank Accounts', parentGroupId: 'GRP-ASSETS', type: 'Asset' },
            { id: 'GRP-DEBTORS', name: 'Sundry Debtors', parentGroupId: 'GRP-ASSETS', type: 'Asset' },
            { id: 'GRP-CREDITORS', name: 'Sundry Creditors', parentGroupId: 'GRP-LIABILITIES', type: 'Liability' },
            { id: 'GRP-DUTIES', name: 'Duties & Taxes', parentGroupId: 'GRP-LIABILITIES', type: 'Liability' }
        ];

        for (const g of defaultGroups) {
            if (!accountGroups.find(ag => ag.id === g.id)) {
                await addAccountGroup(g);
            }
        }

        // Seed default ledgers
        const defaultLedgers: Ledger[] = [
            { id: 'LDG-CASH', name: 'Cash', groupId: 'GRP-CASH', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-SALES', name: 'Sales Account', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-CGST-OUT', name: 'Output CGST', groupId: 'GRP-DUTIES', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-SGST-OUT', name: 'Output SGST', groupId: 'GRP-DUTIES', openingBalance: 0, currentBalance: 0 }
        ];

        for (const l of defaultLedgers) {
            if (!ledgers.find(lg => lg.id === l.id)) {
                await addLedger(l);
            }
        }
    };
    const updateInvoice = async (id: string, u: Partial<Invoice>, reason?: string) => {
        const existing = invoices.find(i => i.id === id);
        if (!existing) return;

        const auditEntry = createAuditEntry('Modified', existing, { ...existing, ...u }, reason);
        const updatedEditHistory = [auditEntry, ...(existing.editHistory || [])].slice(0, 50);

        await updateDoc(doc(db, "invoices", id), sanitizeData({ ...u, editHistory: updatedEditHistory }));
        await addLog('Billing', 'Updated Doc', `${existing?.invoiceNumber || id}`, existing, { ...existing, ...u });

        // Update Summary if status changed to approved or amount changed
        if (existing && existing.documentType !== 'Quotation') {
            const wasValid = existing.status !== 'Draft' && existing.status !== 'Cancelled';
            const isNowValid = (u.status || existing.status) !== 'Draft' && (u.status || existing.status) !== 'Cancelled';
            const type = existing.documentType === 'SupplierPO' ? 'expense' : 'revenue';
            
            if (!wasValid && isNowValid) {
                // Newly approved
                await updateMonthlySummary(existing.date, u.grandTotal || existing.grandTotal || 0, type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, u.grandTotal || existing.grandTotal || 0);
            } else if (wasValid && isNowValid && u.grandTotal !== undefined && u.grandTotal !== existing.grandTotal) {
                // Amount changed on already approved doc
                await updateMonthlySummary(existing.date, u.grandTotal - (existing.grandTotal || 0), type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, u.grandTotal - (existing.grandTotal || 0));
            } else if (wasValid && !isNowValid) {
                // Cancelled or moved to draft
                await updateMonthlySummary(existing.date, -(existing.grandTotal || 0), type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, -(existing.grandTotal || 0));
            }
        }
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
        // Optimistic UI updates
        setTaskSnap(prev => prev.map(t => t.id === id ? { ...t, ...u } as Task : t));
        setPushedTasks(prev => prev.map(t => t.id === id ? { ...t, ...u } as Task : t));
        
        await updateDoc(doc(db, "tasks", id), sanitizeData(u)); 
        await addLog('Tasks', 'Modified Task', existing?.title || id, existing, { ...existing, ...u });

        // User summary trigger for tasks
        if (existing && currentUser) {
            const wasDone = existing.status === 'Done';
            const isNowDone = (u.status || existing.status) === 'Done';
            if (!wasDone && isNowDone) await updateUserSummary(currentUser.id, currentUser.name, 0, 1);
            else if (wasDone && !isNowDone) await updateUserSummary(currentUser.id, currentUser.name, 0, -1);
        }
    };
    const addTask = async (t: Task) => { 
        setTaskSnap(prev => [t, ...prev].sort((a,b) => b.id.localeCompare(a.id)));
        await setDoc(doc(db, "tasks", t.id), sanitizeData(t)); 
        await addLog('Tasks', 'New Task', t.title); 
    };
    const removeTask = async (id: string) => { 
        setTaskSnap(prev => prev.filter(t => t.id !== id));
        setPushedTasks(prev => prev.filter(t => t.id !== id));
        await deleteDoc(doc(db, "tasks", id)); 
        await addLog('Tasks', 'Deleted Task', id); 
    };

    const addServiceTicket = async (t: ServiceTicket) => { await setDoc(doc(db, "serviceTickets", t.id), sanitizeData(t)); await addLog('System', 'New Ticket', t.issue); };
    const updateServiceTicket = async (id: string, u: Partial<ServiceTicket>) => { await updateDoc(doc(db, "serviceTickets", id), sanitizeData(u)); await addLog('System', 'Updated Ticket', id); };

    const addExpense = async (e: ExpenseRecord) => { 
        await setDoc(doc(db, "expenses", e.id), sanitizeData(e)); 
        await addLog('Billing', 'New Expense', `₹${e.amount}`); 
        
        if (e.status === 'Approved') {
            await updateMonthlySummary(e.date, e.amount, 'expense');
        }
    };
    const updateExpense = async (id: string, updates: Partial<ExpenseRecord>, reason?: string) => {
        const existing = expenses.find(e => e.id === id);
        if (!existing) return;

        const auditEntry = createAuditEntry('Modified', existing, { ...existing, ...updates }, reason);
        const updatedEditHistory = [auditEntry, ...(existing.editHistory || [])].slice(0, 50);

        await updateDoc(doc(db, "expenses", id), sanitizeData({ ...updates, editHistory: updatedEditHistory }));
        await addLog('Billing', 'Updated Expense', `Voucher modified: ${existing?.id || id}`, existing, { ...existing, ...updates });

        if (existing) {
            const wasApproved = existing.status === 'Approved';
            const isNowApproved = (updates.status || existing.status) === 'Approved';
            
            if (!wasApproved && isNowApproved) {
                await updateMonthlySummary(existing.date, updates.amount || existing.amount, 'expense');
            } else if (wasApproved && isNowApproved && updates.amount !== undefined && updates.amount !== existing.amount) {
                await updateMonthlySummary(existing.date, updates.amount - existing.amount, 'expense');
            } else if (wasApproved && !isNowApproved) {
                await updateMonthlySummary(existing.date, -existing.amount, 'expense');
            }
        }
    };
    const updateExpenseStatus = async (id: string, status: ExpenseRecord['status']) => { 
        const existing = expenses.find(e => e.id === id);
        await updateDoc(doc(db, "expenses", id), { status }); 
        await addLog('Billing', 'Expense Status', `${id} -> ${status}`); 

        if (existing) {
            if (existing.status !== 'Approved' && status === 'Approved') {
                await updateMonthlySummary(existing.date, existing.amount, 'expense');
            } else if (existing.status === 'Approved' && status !== 'Approved') {
                await updateMonthlySummary(existing.date, -existing.amount, 'expense');
            }
        }
    };

    const addEmployee = async (e: Employee) => { await setDoc(doc(db, "employees", e.id), sanitizeData(e)); await addLog('System', 'New Employee', e.name); };
    const updateEmployee = async (id: string, u: Partial<Employee>) => {
        const existing = employees.find(e => e.id === id);
        await updateDoc(doc(db, "employees", id), sanitizeData(u));
        await addLog('System', 'Updated Employee', existing?.name || id, existing, { ...existing, ...u });
    };
    const removeEmployee = async (id: string) => { await deleteDoc(doc(db, "employees", id)); await addLog('System', 'Removed Employee', id); };

    const addDeliveryChallan = async (c: DeliveryChallan) => { await setDoc(doc(db, "deliveryChallans", c.id), sanitizeData(c)); await addLog('System', 'New Challan', c.challanNumber); };
    const updateDeliveryChallan = async (id: string, u: Partial<DeliveryChallan>) => {
        const existing = deliveryChallans.find(c => c.id === id);
        await updateDoc(doc(db, "deliveryChallans", id), sanitizeData(u));
        await addLog('System', 'Updated Challan', existing?.challanNumber || id, existing, { ...existing, ...u });
    };
    const removeDeliveryChallan = async (id: string) => { await deleteDoc(doc(db, "deliveryChallans", id)); await addLog('System', 'Removed Challan', id); };

    const addInstallationReport = async (r: ServiceReport) => { await setDoc(doc(db, "installationReports", r.id), sanitizeData(r)); await addLog('System', 'Created Installation Report', r.reportNumber); };
    const updateInstallationReport = async (id: string, u: Partial<ServiceReport>) => {
        const existing = installationReports.find(r => r.id === id);
        await updateDoc(doc(db, "installationReports", id), sanitizeData(u));
        await addLog('System', 'Updated Installation Report', existing?.reportNumber || id, existing, { ...existing, ...u });
    };
    const removeInstallationReport = async (id: string) => { await deleteDoc(doc(db, "installationReports", id)); await addLog('System', 'Removed Installation Report', id); };

    const addServiceReport = async (r: ServiceReport) => { await setDoc(doc(db, "serviceReports", r.id), sanitizeData(r)); await addLog('System', 'Created Service Report', r.reportNumber); };
    const updateServiceReport = async (id: string, u: Partial<ServiceReport>) => {
        const existing = serviceReports.find(r => r.id === id);
        await updateDoc(doc(db, "serviceReports", id), sanitizeData(u));
        await addLog('System', 'Updated Service Report', existing?.reportNumber || id, existing, { ...existing, ...u });
    };
    const removeServiceReport = async (id: string) => { await deleteDoc(doc(db, "serviceReports", id)); await addLog('System', 'Removed Service Report', id); };

    const addHoliday = async (h: Holiday) => { await setDoc(doc(db, "holidays", h.id), sanitizeData(h)); await addLog('System', 'Added Holiday', h.name); };
    const removeHoliday = async (id: string) => { await deleteDoc(doc(db, "holidays", id)); await addLog('System', 'Removed Holiday', id); };

    const addPoints = async (amount: number, cat: PointHistory['category'], desc: string, target?: string) => {
        const id = `PT-${Date.now()}`;
        const item = { id, userId: target || currentUser?.id || 'sys', points: amount, category: cat, description: desc, date: new Date().toISOString() };
        await setDoc(doc(db, "pointHistory", id), sanitizeData(item));
        await addLog('System', 'Points Gift', `${amount} to ${target || 'User'}`);
    };

    const addLeaveRequest = async (req: LeaveRequest) => {
        await setDoc(doc(db, "leave_requests", req.id), sanitizeData(req));
        await addLog('Attendance', 'Leave Applied', `${req.userName} for ${req.startDate}`);
        addNotification('Leave Applied', 'Your request has been sent for approval.', 'info');
    };

    const updateLeaveRequest = async (id: string, updates: Partial<LeaveRequest>) => {
        const existing = leaveRequests.find(r => r.id === id);
        if (!existing) return;
        
        await updateDoc(doc(db, "leave_requests", id), sanitizeData(updates));
        await addLog('Attendance', 'Leave Status', `${existing.userName} -> ${updates.status}`);

        if (updates.status === 'Approved') {
            // Mark days as OnLeave in Attendance
            const start = new Date(existing.startDate);
            const end = new Date(existing.endDate);
            const curr = new Date(start);
            while (curr <= end) {
                const ds = curr.toISOString().split('T')[0];
                const rid = `${existing.userId}_${ds}`;
                await setDoc(doc(db, "attendance", rid), sanitizeData({
                    id: rid, userId: existing.userId, userName: existing.userName,
                    date: ds, status: 'OnLeave', leaveReason: existing.reason,
                    checkInTime: null, checkOutTime: null, totalWorkedMs: 0, workMode: 'Office'
                }), { merge: true });
                curr.setDate(curr.getDate() + 1);
            }
            addNotification('Leave Approved', `Request for ${existing.userName} cleared.`, 'success');
        } else if (updates.status === 'Rejected') {
            addNotification('Leave Rejected', `Request for ${existing.userName} declined.`, 'alert');
        }
    };

    const recordStockMovement = async (m: StockMovement) => { await setDoc(doc(db, "stockMovements", m.id), sanitizeData(m)); await addLog('Inventory', 'Stock Movement', `${m.type} ${m.quantity} ${m.productName} for ${m.purpose}`); };

    const addPurchaseRecord = async (r: PurchaseRecord) => {
        await setDoc(doc(db, "purchaseRecords", r.id), sanitizeData(r));
        await addLog('Inventory', 'Purchase Entry', `Entry for ${r.supplier} - ${r.equipmentName}`);
    };

    const updatePurchaseRecord = async (id: string, updates: Partial<PurchaseRecord>) => {
        const existing = purchaseRecords.find(r => r.id === id);
        await updateDoc(doc(db, "purchaseRecords", id), sanitizeData(updates));
        await addLog('Inventory', 'Updated Purchase Entry', `ID: ${id}`, existing, { ...existing, ...updates });
    };

    const removePurchaseRecord = async (id: string) => {
        await deleteDoc(doc(db, "purchaseRecords", id));
        await addLog('Inventory', 'Removed Purchase Entry', `ID: ${id}`);
    };

    // --- NEW ACCOUNTING METHODS ---

    const addAccountGroup = async (group: AccountGroup) => {
        await setDoc(doc(db, "accountGroups", group.id), sanitizeData(group));
        await addLog('System', 'Accounting Group Created', group.name);
    };

    const addLedger = async (l: Ledger) => {
        await setDoc(doc(db, "ledgers", l.id), sanitizeData(l));
        await addLog('System', 'Accounting Ledger Created', l.name);
    };

    const updateLedger = async (id: string, u: Partial<Ledger>) => {
        await updateDoc(doc(db, "ledgers", id), sanitizeData(u));
    };

    const updateVoucher = async (id: string, updates: Partial<AccountingVoucher>, reason?: string) => {
        const existing = vouchers.find(v => v.id === id);
        if (!existing) return;

        const auditEntry = createAuditEntry('Modified', existing, { ...existing, ...updates }, reason);
        const updatedEditHistory = [auditEntry, ...(existing.editHistory || [])].slice(0, 50);

        await updateDoc(doc(db, "vouchers", id), sanitizeData({ ...updates, editHistory: updatedEditHistory }));
        await addLog('Billing', 'Updated Voucher', existing.voucherNumber, existing, { ...existing, ...updates });
    };

    const addVoucher = async (v: AccountingVoucher) => {
        const auditEntry = createAuditEntry('Created', null, v);
        const voucherWithAudit = { ...v, editHistory: [auditEntry] };

        await setDoc(doc(db, "vouchers", v.id), sanitizeData(voucherWithAudit));
        // Update current balances of ledgers involved
        for (const entry of v.entries) {
            const diff = entry.debit - entry.credit;
            if (diff !== 0) {
                await updateDoc(doc(db, "ledgers", entry.ledgerId), {
                    currentBalance: increment(diff)
                });
            }
        }

        // Process Bill-wise Settlements
        if (v.settlements && v.settlements.length > 0) {
            for (const settlement of v.settlements) {
                const inv = invoices.find(i => i.id === settlement.invoiceId);
                if (inv) {
                    const currentBalance = inv.balanceDue !== undefined ? inv.balanceDue : inv.grandTotal;
                    const newBalance = Math.max(0, currentBalance - settlement.amount);
                    await updateDoc(doc(db, "invoices", inv.id), {
                        balanceDue: newBalance,
                        status: newBalance <= 0 ? 'Paid' : inv.status
                    });
                }
            }
        }

        await addLog('Billing', 'Voucher Generated', `${v.type} - ${v.voucherNumber}`);
    };

    const postToLedger = async (vData: Partial<AccountingVoucher>) => {
        const id = `VCH-${Date.now()}`;
        const voucher: AccountingVoucher = {
            id,
            voucherNumber: vData.voucherNumber || `VCH-${id.slice(-4)}`,
            date: vData.date || new Date().toISOString().split('T')[0],
            type: vData.type || 'Journal',
            entries: vData.entries || [],
            narration: vData.narration || '',
            referenceId: vData.referenceId,
            referenceNumber: vData.referenceNumber,
            totalAmount: vData.totalAmount || 0,
            settlements: vData.settlements || [],
            createdBy: currentUser?.name || 'System'
        };
        await addVoucher(voucher);
    };

    const addStockTransfer = async (t: StockTransfer) => {
        await setDoc(doc(db, "stockTransfers", t.id), sanitizeData(t));
        // Update stocks at both locations
        const prod = products.find(p => p.id === t.productId);
        if (prod) {
            // Note: Since location-wise stock is not yet in Product schema fully, 
            // we just log it for now, but in a real godown system, 
            // you'd update specific GodownStock records.
            await addLog('Inventory', 'Stock Transfer', `${t.quantity} ${t.productName} from ${t.fromLocation} to ${t.toLocation}`);
        }
    };

    const addVendor = async (v: Vendor) => { 
        setVendors(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "vendors", v.id), sanitizeData(v)); 
        await addLog('System', 'Added Vendor', v.name); 
    };
    const updateVendor = async (id: string, v: Partial<Vendor>) => {
        const existing = vendors.find(ven => ven.id === id);
        if (existing) setVendors(prev => prev.map(ven => ven.id === id ? { ...ven, ...v } as Vendor : ven).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "vendors", id), sanitizeData(v));
        await addLog('System', 'Updated Vendor', existing?.name || id, existing, { ...existing, ...v });
    };
    const removeVendor = async (id: string) => { 
        setVendors(prev => prev.filter(v => v.id !== id));
        await deleteDoc(doc(db, "vendors", id)); 
        await addLog('System', 'Removed Vendor', id); 
    };

    const addInvoice = async (i: Invoice) => { 
        await setDoc(doc(db, "invoices", i.id), sanitizeData(i)); 
        await addLog('Billing', 'Invoice Generated', i.invoiceNumber); 
        
        // Aggregation trigger
        if (i.status !== 'Draft' && i.status !== 'Cancelled' && i.documentType !== 'Quotation') {
            const type = i.documentType === 'SupplierPO' ? 'expense' : 'revenue';
            await updateMonthlySummary(i.date, i.grandTotal || 0, type);
            if (currentUser) {
                await updateUserSummary(currentUser.id, currentUser.name, i.grandTotal || 0);
            }
        }
    };
    const fetchAuditLogs = async (isLoadMore: boolean = false) => {
        try {
            const logsRef = collection(db, "logs");
            let q;
            
            if (isLoadMore && lastLogDoc) {
                q = query(logsRef, orderBy("timestamp", "desc"), startAfter(lastLogDoc), limit(15));
            } else {
                q = query(logsRef, orderBy("timestamp", "desc"), limit(15));
                setHasMoreLogs(true);
            }

            const snap = await getDocs(q);
            let entries = snap.docs.map(d => ({ ...d.data(), id: d.id } as LogEntry));
            
            // If new collection is empty or has very few items, try falling back to legacy daily docs
            if (entries.length < 15) {
                // Fallback: Check last 7 days of daily audit logs
                let legacyEntries: LogEntry[] = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
                    const legacySnap = await getDoc(doc(db, "system_audit", date));
                    if (legacySnap.exists()) {
                        const dayEntries = legacySnap.data().entries as LogEntry[];
                        legacyEntries = [...legacyEntries, ...dayEntries];
                    }
                    if (legacyEntries.length + entries.length >= 15) break;
                }
                
                // Merge and filter duplicates (logs might exist in both during transition)
                const combined = [...entries, ...legacyEntries];
                const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
                entries = unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15);
                setHasMoreLogs(false); // Legacy fallback only fetches one set for now
            } else {
                setLastLogDoc(snap.docs[snap.docs.length - 1]);
                if (snap.docs.length < 15) setHasMoreLogs(false);
            }
            
            if (isLoadMore) {
                setLogs(prev => [...prev, ...entries]);
            } else {
                setLogs(entries);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        }
    };

    const updatePrizePool = async (a: number) => {
        setPrizePool(a);
        await setDoc(doc(db, "settings", "system"), { prizePool: a }, { merge: true });
        await addLog('System', 'Updated Prize Pool', `New: ${a}`);
    };
    const updateFinancialYear = async (fy: string) => {
        setFinancialYear(fy);
        await setDoc(doc(db, "settings", "system"), { financialYear: fy }, { merge: true });
        await addLog('System', 'Updated Fiscal Period', `New Period: ${fy}`);
    };

    return (
        <DataContext.Provider value={{
            clients, vendors, products, invoices, stockMovements, expenses, employees, notifications: [], tasks, purchaseRecords, stockBatches, addStockBatch, updateStockBatch, leads, serviceTickets,
            pendingQuoteData, setPendingQuoteData,
            currentUser, isAuthenticated, login, loginWithGoogle, logout, seedDatabase,
            addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
            addProduct, updateProduct, removeProduct, addLead, updateLead, removeLead, addServiceTicket, updateServiceTicket,
            addInvoice, updateInvoice, recordStockMovement, addExpense, updateExpense, updateExpenseStatus,
            addEmployee, updateEmployee, removeEmployee,
            addTask, removeTask, updateTaskRemote,
            dbError, authError, isAuthenticating,
            userStats, pointHistory, addPoints, addNotification, markNotificationRead, clearAllNotifications,
            attendanceRecords, updateAttendance, removeAttendance, holidays, addHoliday, removeHoliday,
            leaveRequests, addLeaveRequest, updateLeaveRequest,
            deliveryChallans, addDeliveryChallan, updateDeliveryChallan, removeDeliveryChallan,
            installationReports, addInstallationReport, updateInstallationReport, removeInstallationReport,
            serviceReports, addServiceReport, updateServiceReport, removeServiceReport,
            prizePool, updatePrizePool, monthlyWinners, showWinnerPopup, setShowWinnerPopup, latestWinner, setLatestWinner, acknowledgeWinner, checkAndPerformMonthReset,
            logs, addLog, fetchAuditLogs, hasMoreLogs,
            searchRecords, fetchMoreData, financialYear, updateFinancialYear,
            addPurchaseRecord, updatePurchaseRecord, removePurchaseRecord,
            ledgers, accountGroups, vouchers, stockTransfers, expenseStats,
            addLedger, updateLedger, addAccountGroup, addVoucher, updateVoucher, postToLedger, addStockTransfer
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
