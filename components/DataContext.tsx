
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
    startAfter,
    runTransaction,
    documentId
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { db, auth, googleProvider } from '../firebase';
import { auditBatcher } from '../services/AuditBatcher';
import { Archiver } from '../services/Archiver';
import { Client, Vendor, Product, Invoice, StockMovement, ExpenseRecord, Employee, TabView, UserStats, PointHistory, Task, Lead, ServiceTask, ServiceTicket, AttendanceRecord, DeliveryChallan, ServiceReport, Holiday, MonthlyWinner, LogEntry, LeaveRequest, PurchaseRecord, StockBatch, Ledger, AccountGroup, AccountingVoucher, StockTransfer, BankDetails, CompanyProfile, AuditLogEntry, CostCentre, FixedAsset, DepreciationScheduleEntry, BankStatementEntry, AutoVoucherDraft, BankRule } from '../types';

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
    serviceTasks: ServiceTask[];
    
    // New Accounting States
    ledgers: Ledger[];
    accountGroups: AccountGroup[];
    vouchers: AccountingVoucher[];
    stockTransfers: StockTransfer[];
    costCentres: CostCentre[];
    fixedAssets: FixedAsset[];
    depreciationSchedule: DepreciationScheduleEntry[];
    bankStatements: BankStatementEntry[];
    expenseStats: { approved: number, pending: number, rejected: number };
    showWinnerPopup: boolean;
    setShowWinnerPopup: (show: boolean) => void;
    latestWinner: MonthlyWinner | null;
    setLatestWinner: (winner: MonthlyWinner | null) => void;
    acknowledgeWinner: (id: string) => Promise<void>;

    pendingQuoteData: Partial<Invoice> | null;
    setPendingQuoteData: (data: Partial<Invoice> | null) => void;
    pendingInvoiceData: Partial<Invoice> | null;
    setPendingInvoiceData: (data: Partial<Invoice> | null) => void;
    pendingServiceReportData: Partial<ServiceReport> | null;
    setPendingServiceReportData: (data: Partial<ServiceReport> | null) => void;
    pendingChallanData: Partial<DeliveryChallan> | null;
    setPendingChallanData: (data: Partial<DeliveryChallan> | null) => void;
    pendingSupplierPOData: Partial<Invoice> | null;
    setPendingSupplierPOData: (data: Partial<Invoice> | null) => void;

    activeTab: TabView;
    setActiveTab: (tab: TabView) => void;

    showAlert: (message: string, title?: string) => Promise<void>;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
    previewPDF: (blob: Blob, filename: string) => void;

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
    bankDetailsList: BankDetails[];
    addBankDetails: (details: BankDetails) => Promise<void>;
    updateBankDetails: (id: string, details: Partial<BankDetails>) => Promise<void>;
    removeBankDetails: (id: string) => Promise<void>;
    bankRules: BankRule[];
    addBankRule: (rule: BankRule) => Promise<void>;
    updateBankRule: (id: string, rule: Partial<BankRule>) => Promise<void>;
    removeBankRule: (id: string) => Promise<void>;
    companyProfiles: CompanyProfile[];
    addCompanyProfile: (profile: CompanyProfile) => Promise<void>;
    updateCompanyProfile: (id: string, profile: Partial<CompanyProfile>) => Promise<void>;
    removeCompanyProfile: (id: string) => Promise<void>;

    // Activity Logs
    logs: LogEntry[];
    hasMoreLogs: boolean;
    addLog: (category: LogEntry['category'], action: string, details: string, beforeValues?: any, afterValues?: any) => Promise<void>;
    fetchAuditLogs: (isLoadMore?: boolean) => Promise<void>;

    seedDatabase: () => Promise<void>;
    addClient: (c: Client) => Promise<void>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
    removeClient: (id: string) => Promise<void>;
    addVendor: (v: Vendor) => Promise<void>;
    updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
    removeVendor: (id: string) => Promise<void>;
    addProduct: (p: Product) => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    removeProduct: (id: string) => Promise<void>;
    addInvoice: (invoice: Invoice) => Promise<void>;
    updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
    removeInvoice: (id: string) => Promise<void>;
    recordStockMovement: (movement: StockMovement) => Promise<void>;
    addStockBatch: (batch: StockBatch) => Promise<void>;
    updateStockBatch: (id: string, updates: Partial<StockBatch>) => Promise<void>;


    addTask: (task: Task) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    updateTaskRemote: (id: string, updates: Partial<Task>) => Promise<void>;
    addLead: (l: Lead) => Promise<void>;
    updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
    removeLead: (id: string) => Promise<void>;
    addServiceTicket: (ticket: ServiceTicket) => Promise<void>;
    updateServiceTicket: (id: string, updates: Partial<ServiceTicket>) => Promise<void>;
    addServiceTask: (task: ServiceTask) => Promise<void>;
    updateServiceTask: (id: string, updates: Partial<ServiceTask>) => Promise<void>;
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

    // Expense deletion
    removeExpense: (id: string, operator: string) => Promise<void>;

    // Accounting Methods
    addLedger: (ledger: Ledger) => Promise<void>;
    updateLedger: (id: string, updates: Partial<Ledger>) => Promise<void>;
    removeLedger: (id: string) => Promise<void>;
    addAccountGroup: (group: AccountGroup) => Promise<void>;
    removeAccountGroup: (id: string) => Promise<void>;
    updateAccountGroup: (id: string, updates: Partial<AccountGroup>) => Promise<void>;
    addVoucher: (voucher: AccountingVoucher) => Promise<void>;
    updateVoucher: (id: string, updates: Partial<AccountingVoucher>, reason?: string) => Promise<void>;
    reverseVoucher: (id: string, reason: string) => Promise<void>;
    postToLedger: (voucherData: Partial<AccountingVoucher>) => Promise<void>;
    addStockTransfer: (transfer: StockTransfer) => Promise<void>;
    reconcileLedgerBalances: () => Promise<number>;

    // Cost Centre Methods
    addCostCentre: (cc: CostCentre) => Promise<void>;
    updateCostCentre: (id: string, updates: Partial<CostCentre>) => Promise<void>;
    removeCostCentre: (id: string) => Promise<void>;

    // Fixed Asset Methods
    addFixedAsset: (asset: FixedAsset) => Promise<void>;
    updateFixedAsset: (id: string, updates: Partial<FixedAsset>) => Promise<void>;
    removeFixedAsset: (id: string) => Promise<void>;
    computeDepreciation: (assetId: string) => Promise<void>;
    postDepreciationEntry: (assetId: string, scheduleEntry: DepreciationScheduleEntry) => Promise<void>;

    // Bank Statement Methods
    uploadBankStatement: (ledgerId: string, entries: BankStatementEntry[]) => Promise<void>;
    autoMatchBankEntries: (ledgerId: string) => Promise<number>;
    postAutoVouchers: (ledgerId: string, approved: AutoVoucherDraft[]) => Promise<number>;

    checkAndPerformMonthReset: () => Promise<void>;
    
    // Search
    searchRecords: <T>(collectionName: string, field: string, value: string) => Promise<T[]>;
    fetchMoreData: (collectionName: string, orderByField?: string) => Promise<void>;
    isSystemAdmin: boolean;
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
    const [authInitialized, setAuthInitialized] = useState(false);
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
    const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
    const [serviceTasks, setServiceTasks] = useState<ServiceTask[]>([]);
    
    // Accounting States
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([]);
    const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
    const [costCentres, setCostCentres] = useState<CostCentre[]>([]);
    const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
    const [depreciationSchedule, setDepreciationSchedule] = useState<DepreciationScheduleEntry[]>([]);
    const [bankStatements, setBankStatements] = useState<BankStatementEntry[]>([]);
    const [bankRules, setBankRules] = useState<BankRule[]>([]);
    const [expenseStats, setExpenseStats] = useState({ approved: 0, pending: 0, rejected: 0 });

    const [showWinnerPopup, setShowWinnerPopup] = useState(false);
    const [latestWinner, setLatestWinner] = useState<MonthlyWinner | null>(null);
    const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
    const [prizePool, setPrizePool] = useState<number>(1500);
    const [financialYear, setFinancialYear] = useState<string>("26-27");
    const [bankDetailsList, setBankDetailsList] = useState<BankDetails[]>([]);
    const [pendingQuoteData, setPendingQuoteData] = useState<Partial<Invoice> | null>(null);
    const [pendingInvoiceData, setPendingInvoiceData] = useState<Partial<Invoice> | null>(null);
    const [pendingServiceReportData, setPendingServiceReportData] = useState<Partial<ServiceReport> | null>(null);
    const [pendingChallanData, setPendingChallanData] = useState<Partial<DeliveryChallan> | null>(null);
    const [pendingSupplierPOData, setPendingSupplierPOData] = useState<Partial<Invoice> | null>(null);

    const [activeTab, setActiveTabState] = useState<TabView>(TabView.DASHBOARD);
    const setActiveTab = (tab: TabView) => {
        setActiveTabState(tab);
    };

    // Dialog state
    interface DialogConfig {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'alert' | 'confirm' | 'prompt';
        defaultValue?: string;
        resolve: (value: any) => void;
    }
    const [dialogConfig, setDialogConfig] = useState<DialogConfig | null>(null);

    const showAlert = (message: string, title: string = 'Alert') => {
        return new Promise<void>((resolve) => {
            setDialogConfig({
                isOpen: true,
                title,
                message,
                type: 'alert',
                resolve: () => {
                    setDialogConfig(null);
                    resolve();
                }
            });
        });
    };

    const showConfirm = (message: string, title: string = 'Confirm') => {
        return new Promise<boolean>((resolve) => {
            setDialogConfig({
                isOpen: true,
                title,
                message,
                type: 'confirm',
                resolve: (val) => {
                    setDialogConfig(null);
                    resolve(!!val);
                }
            });
        });
    };

    const showPrompt = (message: string, defaultValue: string = '', title: string = 'Prompt') => {
        return new Promise<string | null>((resolve) => {
            setDialogConfig({
                isOpen: true,
                title,
                message,
                type: 'prompt',
                defaultValue,
                resolve: (val) => {
                    setDialogConfig(null);
                    resolve(val);
                }
            });
        });
    };

    // PDF Preview state
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<{ url: string, filename: string } | null>(null);
    const previewPDF = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl({ url, filename });
        // Track the download/preview in audit logs
        addLog('System', 'Generated/Viewed Document', `Previewed/Downloaded PDF: ${filename}`);
    };

    // Active Notifications state
    const [notifications, setNotifications] = useState<any[]>([]);

    const addNotification = (title: string, message: string, type: string) => {
        const id = `NOTIF-${Date.now()}-${Math.random()}`;
        setNotifications(prev => {
            if (prev.some(n => n.title === title && n.message === message && !n.read)) return prev;
            return [{ id, title, message, type, read: false, timestamp: new Date().toLocaleTimeString() }, ...prev];
        });
    };
    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };
    const clearAllNotifications = () => {
        setNotifications([]);
    };

    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [authError, setAuthError] = useState<string | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const loginLoggedRef = React.useRef(false);

    const isAuthenticated = !!currentUser;
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com';

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
            platform: (typeof window !== 'undefined' && ((window as any).Capacitor || window.location.protocol === 'capacitor:')) ? 'App' : 'Web'
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
            setAuthInitialized(true);
        });
        return () => unsubscribe();
    }, []);

    // Pre-initialize anonymous auth context on mount to speed up subsequent password logins
    useEffect(() => {
        if (authInitialized && !auth.currentUser) {
            signInAnonymously(auth).catch(e => console.warn("Pre-auth failed:", e));
        }
    }, [authInitialized]);

    useEffect(() => {
        if (!firebaseUser) return;
        const unsub = onSnapshot(collection(db, "employees"), (s) => {
            const data = s.docs.map(d => ({ ...sanitizeData(d.data()), id: d.id } as Employee));
            setEmployees(data);
        }, (err) => console.warn("Employees Listener Error:", err));
        return () => unsub();
    }, [firebaseUser]);


    useEffect(() => {
        if (!firebaseUser) return;
        
        if (!firebaseUser.isAnonymous) {
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
                    permissions: Object.values(TabView).reduce((acc, tab) => ({ ...acc, [tab]: 'Admin' }), {})
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
                // Write/update their UID mapping
                setDoc(doc(db, "uid_maps", firebaseUser.uid), {
                    employeeId: resolvedUser.id,
                    role: resolvedUser.role,
                    email: email || '',
                    updatedAt: new Date().toISOString()
                }).catch(e => console.warn("Failed to write to uid_maps on Google login:", e));

                setCurrentUser(resolvedUser);
                if (!loginLoggedRef.current) {
                    addLog('Auth', 'System Login', `User ${resolvedUser.name} initiated secure session.`);
                    loginLoggedRef.current = true;
                }
                setIsAuthenticating(false);
                setAuthError(null);
            }
        } else {
            // Restore anonymous session
            const restoreSession = async () => {
                try {
                    const snap = await getDoc(doc(db, "uid_maps", firebaseUser.uid));
                    if (snap.exists()) {
                        const mapData = snap.data();
                        const empId = mapData.employeeId;
                        if (empId === 'EMP-OWNER') {
                            const adminUser: Employee = {
                                id: 'EMP-OWNER',
                                name: 'Sreekumar',
                                role: 'SYSTEM_ADMIN',
                                department: 'Administration',
                                email: mapData.email || 'sreekumar.career@gmail.com',
                                status: 'Active',
                                isLoginEnabled: true,
                                permissions: Object.values(TabView).reduce((acc, tab) => ({ ...acc, [tab]: 'Admin' }), {})
                            };
                            setCurrentUser(adminUser);
                            if (!loginLoggedRef.current) {
                                addLog('Auth', 'System Login', `User Sreekumar restored secure session.`);
                                loginLoggedRef.current = true;
                            }
                        } else if (employees.length > 0) {
                            const match = employees.find(e => e.id === empId);
                            if (match) {
                                if (match.isLoginEnabled) {
                                    setCurrentUser(match);
                                    if (!loginLoggedRef.current) {
                                        addLog('Auth', 'System Login', `User ${match.name} restored secure session.`);
                                        loginLoggedRef.current = true;
                                    }
                                } else {
                                    setAuthError("Registry Locked: Access disabled.");
                                    signOut(auth);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Restore anonymous session failed:", err);
                }
            };
            restoreSession();
        }
    }, [firebaseUser, employees]);

    // ─── REAL-TIME PERMISSION SYNC ────────────────────────────────────────────────
    // Employees who log in via password use anonymous Firebase auth.
    // The auth-resolution effect above skips them (isAnonymous guard).
    // This effect watches the `employees` onSnapshot directly and instantly
    // updates currentUser permissions so admin changes reflect with zero delay.
    useEffect(() => {
        if (!employees.length) return;

        setCurrentUser(prev => {
            if (!prev) return prev;

            // Map hardcoded superadmin to their real database employee object if it exists
            if (prev.id === 'EMP-OWNER') {
                const realAdmin = employees.find(e => e.email === prev.email);
                if (realAdmin && realAdmin.id !== 'EMP-OWNER') {
                    return {
                        ...realAdmin,
                        role: 'SYSTEM_ADMIN',
                        permissions: Object.values(TabView).reduce((acc, tab) => ({ ...acc, [tab]: 'Admin' }), {})
                    };
                }
                return prev;
            }

            const updated = employees.find(e => e.id === prev.id);
            if (!updated) return prev;

            // Robust permissions equality check
            const p1 = updated.permissions || {};
            const p2 = prev.permissions || {};
            const keys1 = Object.keys(p1);
            const keys2 = Object.keys(p2);
            let permChanged = keys1.length !== keys2.length;
            if (!permChanged) {
                permChanged = keys1.some(k => p1[k] !== p2[k]);
            }

            const roleChanged = updated.role !== prev.role;
            const accessRevoked = !updated.isLoginEnabled && prev.isLoginEnabled;

            if (permChanged || roleChanged || accessRevoked) {
                if (accessRevoked) {
                    addLog('Auth', 'Access Revoked', `${updated.name} forcibly signed out by Admin.`);
                    signOut(auth);
                }
                return { ...updated };
            }
            return prev;
        });
    }, [employees]);

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        
        // Auto-cleanup for completed tasks older than 18 months
        const cleanupTasks = async () => {
            const lastCleanup = localStorage.getItem('lastTaskCleanup');
            const now = Date.now();
            if (!lastCleanup || now - parseInt(lastCleanup) > 7 * 24 * 60 * 60 * 1000) {
                try {
                    const eighteenMonthsAgo = new Date();
                    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
                    const cutoff = eighteenMonthsAgo.getTime();

                    const oldTasksQuery = query(collection(db, "tasks"), where("status", "==", "Done"));
                    const snap = await getDocs(oldTasksQuery);
                    
                    for (const d of snap.docs) {
                        const data = d.data();
                        let createdTime = cutoff + 1; 
                        
                        if (data.createdAt) {
                            createdTime = new Date(data.createdAt).getTime();
                        } else {
                            const match = d.id.match(/\d{13}/);
                            if (match) {
                                createdTime = parseInt(match[0], 10);
                            } else if (data.dueDate) {
                                createdTime = new Date(data.dueDate).getTime();
                            }
                        }

                        if (createdTime < cutoff) {
                            deleteDoc(doc(db, "tasks", d.id)).catch(console.error);
                        }
                    }
                    localStorage.setItem('lastTaskCleanup', now.toString());
                } catch (err) {
                    console.error("Task cleanup failed:", err);
                }
            }
        };
        cleanupTasks();

        // Static/Low-Churn Registries: Use one-time fetches with native cache fallback
        const loadRegistries = async () => {
            try {
                const [vSnap, cSnap, hSnap, pSnap, sSnap] = await Promise.all([
                    getDocs(query(collection(db, "vendors"), orderBy('name', 'asc'))),
                    getDocs(query(collection(db, "clients"), orderBy('name', 'asc'))),
                    getDocs(collection(db, "holidays")),
                    getDocs(query(collection(db, "products"), orderBy('name', 'asc'))),
                    getDoc(doc(db, "settings", "system"))
                ]);

                const loadedVendors = vSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Vendor);

                if (sSnap.exists()) {
                    const data = sSnap.data();
                    if (data.prizePool) setPrizePool(data.prizePool);
                    if (data.financialYear) setFinancialYear(data.financialYear);
                    if (data.bankDetails) {
                        const banks = Array.isArray(data.bankDetails) ? data.bankDetails : [data.bankDetails];
                        setBankDetailsList(banks);
                    }
                    if (data.bankRules) {
                        setBankRules(data.bankRules);
                    }
                    if (data.companyProfiles) setCompanyProfiles(data.companyProfiles);
                }

                setProducts(pSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Product));
                setClients(cSnap.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Client));
                setVendors(loadedVendors);
                setHolidays(hSnap.docs.map(d => ({...d.data(), id: d.id}) as Holiday));
            } catch (err) { console.error("Registry load failed", err); }
        };
        loadRegistries();

        // Dynamic Collections (High Growth): Initial small batch, then paginated
        const unsubTasks = onSnapshot(query(collection(db, "tasks"), orderBy('id', 'desc'), limit(500)), (s) => handleSnap('tasks', s, setTaskSnap), (err) => console.warn("tasks listener:", err));
        
        // Save last pointers for pagination
        const handleSnap = (name: string, snap: any, setter: any) => {
            if (!snap.empty) {
                setLastDocs(prev => ({ ...prev, [name]: snap.docs[snap.docs.length - 1] }));
            }
            setter(snap.docs.map((d: any) => ({...sanitizeData(d.data()), id: d.id})));
        };

        const unsubInvoices = onSnapshot(query(collection(db, "invoices"), orderBy('date', 'desc'), limit(500)), (s) => handleSnap('invoices', s, setInvoiceSnap), (err) => console.warn("invoices listener:", err));
        const unsubLeads = onSnapshot(query(collection(db, "leads"), orderBy('lastContact', 'desc'), limit(500)), (s) => handleSnap('leads', s, setLeadSnap), (err) => console.warn("leads listener:", err));
        const unsubExpenses = onSnapshot(query(collection(db, "expenses"), orderBy('date', 'desc'), limit(100)), (s) => handleSnap('expenses', s, setExpenseSnap), (err) => console.warn("expenses listener:", err));
        const unsubPurchases = onSnapshot(query(collection(db, "purchaseRecords"), orderBy('dateSupply', 'desc'), limit(500)), (s) => setPurchaseRecords(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as PurchaseRecord)), (err) => console.warn("purchaseRecords listener:", err));
        const unsubVouchers = onSnapshot(query(collection(db, "vouchers"), orderBy('date', 'desc'), limit(100)), (s) => handleSnap('vouchers', s, setVoucherSnap), (err) => console.warn("vouchers listener:", err));
        const unsubTickets = onSnapshot(query(collection(db, "serviceTickets"), orderBy('timestamp', 'desc'), limit(500)), (s) => setServiceTickets(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceTicket)), (err) => console.warn("serviceTickets listener:", err));
        const unsubPoints = onSnapshot(query(collection(db, "pointHistory"), orderBy('date', 'desc'), limit(500)), (s) => setPointHistory(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as PointHistory)), (err) => console.warn("pointHistory listener:", err));
        
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
        }, (err) => console.warn("stats listener:", err));

        return () => {
            unsubLeads(); unsubInvoices(); unsubExpenses(); unsubTasks();
            unsubPurchases(); unsubVouchers(); unsubTickets(); unsubPoints();
            unsubStats();
        };
    }, [firebaseUser?.uid, currentUser?.id]);

    // ─── TAB-GATED LISTENERS ──────────────────────────────────────────────────
    // Only subscribe when their corresponding tab is active to reduce Firestore reads.

    useEffect(() => {
        if (!firebaseUser || !currentUser) return;
        const unsub = onSnapshot(query(collection(db, "attendance"), orderBy('date', 'desc'), limit(2000)), (s) => setAttendanceRecords(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as AttendanceRecord)), (err) => console.warn("attendance listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.INVENTORY) return;
        const unsubStock = onSnapshot(query(collection(db, "stockMovements"), orderBy('timestamp', 'desc'), limit(200)), (s) => setStockMovements(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockMovement)));
        const unsubBatches = onSnapshot(collection(db, "stockBatches"), (s) => setStockBatches(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockBatch)), (err) => console.warn("stockBatches listener:", err));
        const unsubTransfers = onSnapshot(query(collection(db, "stockTransfers"), orderBy('date', 'desc'), limit(500)), (s) => setStockTransfers(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as StockTransfer)), (err) => console.warn("stockTransfers listener:", err));
        return () => { unsubStock(); unsubBatches(); unsubTransfers(); };
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.DELIVERY) return;
        const unsub = onSnapshot(query(collection(db, "deliveryChallans"), orderBy('date', 'desc'), limit(500)), (s) => setDeliveryChallans(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as DeliveryChallan)), (err) => console.warn("deliveryChallans listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.SERVICE_REPORTS) return;
        const unsub = onSnapshot(query(collection(db, "serviceReports"), orderBy('date', 'desc'), limit(500)), (s) => setServiceReports(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceReport)), (err) => console.warn("serviceReports listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.INSTALLATION_REPORTS) return;
        const unsub = onSnapshot(query(collection(db, "installationReports"), orderBy('date', 'desc'), limit(500)), (s) => setInstallationReports(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceReport)), (err) => console.warn("installationReports listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.HR) return;
        const unsub = onSnapshot(query(collection(db, "leave_requests"), orderBy('appliedOn', 'desc'), limit(500)), (s) => setLeaveRequests(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as LeaveRequest)), (err) => console.warn("leave_requests listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.SERVICE_TASK) return;
        const unsub = onSnapshot(query(collection(db, "serviceTasks"), orderBy('createdAt', 'desc'), limit(200)), (s) => setServiceTasks(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as ServiceTask)), (err) => console.warn("serviceTasks listener:", err));
        return () => unsub();
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.ACCOUNTING) return;
        const unsubLedgers = onSnapshot(collection(db, "ledgers"), (s) => setLedgers(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as Ledger)), (err) => console.warn("ledgers listener:", err));
        const unsubGroups = onSnapshot(collection(db, "accountGroups"), (s) => setAccountGroups(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as AccountGroup)), (err) => console.warn("accountGroups listener:", err));
        const unsubCostCentres = onSnapshot(collection(db, "costCentres"), (s) => setCostCentres(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as CostCentre)), (err) => console.warn("costCentres listener:", err));
        const unsubFixedAssets = onSnapshot(collection(db, "fixedAssets"), (s) => setFixedAssets(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as FixedAsset)), (err) => console.warn("fixedAssets listener:", err));
        const unsubDepreciation = onSnapshot(query(collection(db, "depreciationSchedule"), orderBy('date', 'desc'), limit(1000)), (s) => setDepreciationSchedule(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as DepreciationScheduleEntry)), (err) => console.warn("depreciationSchedule listener:", err));
        const unsubBankStatements = onSnapshot(collection(db, "bankStatements"), (s) => setBankStatements(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as BankStatementEntry)), (err) => console.warn("bankStatements listener:", err));
        return () => { unsubLedgers(); unsubGroups(); unsubCostCentres(); unsubFixedAssets(); unsubDepreciation(); unsubBankStatements(); };
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (!firebaseUser || !currentUser || activeTab !== TabView.PERFORMANCE) return;
        
        const unsubWinners = onSnapshot(collection(db, "monthlyWinners"), (s) => setMonthlyWinners(s.docs.map(d => ({...sanitizeData(d.data()), id: d.id}) as MonthlyWinner)), (err) => console.warn("monthlyWinners listener:", err));
        
        return () => { unsubWinners(); };
    }, [firebaseUser?.uid, currentUser?.id, activeTab]);

    useEffect(() => {
        if (bankDetailsList.length === 0 || ledgers.length === 0) return;

        const ensureBankLedgers = async () => {
            for (const bank of bankDetailsList) {
                const hasLedger = ledgers.some(l => 
                    l.name.toUpperCase() === bank.bankName.toUpperCase() && 
                    (l.groupId === 'GRP-BANK' || l.groupId === 'GRP-CASH')
                );
                
                if (!hasLedger) {
                    const id = `LED-BANK-${bank.id}`;
                    const ledgerData: Ledger = {
                        id,
                        name: bank.bankName,
                        groupId: 'GRP-BANK',
                        openingBalance: 0,
                        currentBalance: 0,
                        description: `Auto-created ledger for CONFIG Bank: ${bank.bankName} (A/C: ${bank.accountNo})`
                    };
                    try {
                        await setDoc(doc(db, "ledgers", id), sanitizeData(ledgerData));
                        await addLog('System', 'Accounting Ledger Created', ledgerData.name);
                    } catch (err) {
                        console.error("Failed to auto-create bank ledger:", err);
                    }
                }
            }
        };

        ensureBankLedgers();
    }, [bankDetailsList, ledgers]);

    // --- STARTUP AUTOMATION: runs once per session after data loads ---
    useEffect(() => {
        if (!currentUser || products.length === 0) return;
        checkLowStockAlerts(products);
        checkGstFilingReminder();
    }, [currentUser?.id, products.length]);

    useEffect(() => {
        if (!currentUser || serviceTickets.length === 0) return;
        checkAmcReminders(serviceTickets);
    }, [currentUser?.id, serviceTickets.length]);

    // 1.4 — Lead follow-up reminders: fire when nextFollowUpDate === today
    useEffect(() => {
        if (!currentUser || leads.length === 0) return;
        const todayStr = new Date().toISOString().split('T')[0];
        leads.forEach(l => {
            if (l.nextFollowUpDate === todayStr && l.status !== 'Won' && l.status !== 'Lost') {
                addNotification(
                    '📞 Follow-up Due Today',
                    `${l.name} (${l.hospital || l.phone || ''}) — Scheduled follow-up for ${l.product || 'lead'}.`,
                    'info'
                );
            }
        });
    }, [currentUser?.id, leads.length]);



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
            // Since we pre-auth on mount, this is almost always already completed.
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
                    permissions: Object.values(TabView).reduce((acc, tab) => ({ ...acc, [tab]: 'Admin' }), {})
                };
                if (auth.currentUser) {
                    setDoc(doc(db, "uid_maps", auth.currentUser.uid), {
                        employeeId: 'EMP-OWNER',
                        role: 'SYSTEM_ADMIN',
                        email: lowerEmail,
                        updatedAt: new Date().toISOString()
                    }).catch(e => console.warn("Failed to write to uid_maps:", e));
                }
                setCurrentUser(adminUser);
                setIsAuthenticating(false);
                return true;
            }

            // 3. Optimize Lookup: Try local employees registry first to avoid database network roundtrips
            let match: Employee | undefined = employees.find(e => e.email.toLowerCase() === lowerEmail);
            let empId = match?.id;

            if (!match) {
                // Fallback to direct query only if local registry isn't populated yet
                const q = query(collection(db, "employees"), where("email", "==", lowerEmail));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    match = snap.docs[0].data() as Employee;
                    empId = snap.docs[0].id;
                }
            }
            
            if (match && empId) {
                if (!match.isLoginEnabled) {
                    setAuthError("Account Locked: Registry access revoked by Admin.");
                } else if (match.password === password) {
                    if (auth.currentUser) {
                        // Write to uid_maps asynchronously (non-blocking)
                        setDoc(doc(db, "uid_maps", auth.currentUser.uid), {
                            employeeId: empId,
                            role: match.role,
                            email: lowerEmail,
                            updatedAt: new Date().toISOString()
                        }).catch(e => console.warn("Failed to write to uid_maps:", e));
                    }
                    setCurrentUser({ ...match, id: empId });
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
            limit(50)
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
            limit(50)
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
        try {
            await ensurePartyLedger(c.name, 'GRP-DEBTORS', { email: c.email, phone: c.phone });
        } catch (err) { console.warn('Ledger auto-create failed for client:', err); }
    };
    const updateClient = async (id: string, c: Partial<Client>) => {
        const existing = clients.find(cl => cl.id === id);
        if (existing) setClients(prev => prev.map(cl => cl.id === id ? { ...cl, ...c } as Client : cl).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "clients", id), sanitizeData(c));
        await addLog('System', 'Updated Client', `Client updated: ${existing?.name || id}`, existing, { ...existing, ...c });
        
        if (c.name && existing && c.name !== existing.name) {
            try {
                const ldg = ledgers.find(l => l.name === existing.name && l.groupId === 'GRP-DEBTORS');
                if (ldg) await updateLedger(ldg.id, { name: c.name });
            } catch (err) { console.warn('Ledger name update failed:', err); }
        }
    };
    const removeClient = async (id: string) => { 
        setClients(prev => prev.filter(c => c.id !== id));
        await deleteDoc(doc(db, "clients", id)); 
        await addLog('System', 'Removed Client', `Client deleted: ${id}`); 
    };
    
    const addProduct = async (p: Product) => { 
        const originalProducts = [...products];
        setProducts(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
        try {
            await setDoc(doc(db, "products", p.id), sanitizeData(p)); 
            await addLog('Inventory', 'Added Product', `Item: ${p.name}`); 
        } catch (error: any) {
            console.error("Failed to add product:", error);
            setProducts(originalProducts);
            addNotification('Add Product Failed', `Could not create product in database: ${error.message}`, 'alert');
        }
    };
    const updateProduct = async (id: string, p: Partial<Product>) => {
        const existing = products.find(pr => pr.id === id);
        const originalProducts = [...products];
        if (existing) setProducts(prev => prev.map(pr => pr.id === id ? { ...pr, ...p } as Product : pr).sort((a, b) => a.name.localeCompare(b.name)));
        try {
            await updateDoc(doc(db, "products", id), sanitizeData(p));
            await addLog('Inventory', 'Updated Product', `Item: ${existing?.name || id}`, existing, { ...existing, ...p });
        } catch (error: any) {
            console.error("Failed to update product:", error);
            // Revert local state on database failure
            setProducts(originalProducts);
            addNotification('Update Failed', `Could not update product stock in database: ${error.message}`, 'alert');
        }
    };

    const addStockBatch = async (batch: StockBatch) => {
        await setDoc(doc(db, "stockBatches", batch.id), sanitizeData(batch));
        await addLog('Inventory', 'Created Batch', `Batch: ${batch.batchNo} for Product: ${batch.productId}`);
    };

    const updateStockBatch = async (id: string, updates: Partial<StockBatch>) => {
        await updateDoc(doc(db, "stockBatches", id), sanitizeData(updates));
    };
    const removeProduct = async (id: string) => { 
        const originalProducts = [...products];
        setProducts(prev => prev.filter(p => p.id !== id));
        try {
            await deleteDoc(doc(db, "products", id)); 
            await addLog('Inventory', 'Removed Product', `Deleted: ${id}`); 
        } catch (error: any) {
            console.error("Failed to remove product:", error);
            setProducts(originalProducts);
            addNotification('Remove Product Failed', `Could not delete product in database: ${error.message}`, 'alert');
        }
    };

    const updateAttendance = async (rec: Partial<AttendanceRecord> & { id: string }) => { await setDoc(doc(db, "attendance", rec.id), sanitizeData(rec), { merge: true }); await addLog('Attendance', 'Updated Record', `ID: ${rec.id}`); };
    const removeAttendance = async (id: string) => { await deleteDoc(doc(db, "attendance", id)); await addLog('Attendance', 'Deleted Record', `ID: ${id}`); };
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
            { id: 'LDG-SGST-OUT', name: 'Output SGST', groupId: 'GRP-DUTIES', openingBalance: 0, currentBalance: 0 },
            { id: 'LED-TDS-PAYABLE', name: 'TDS Payable', groupId: 'GRP-DUTIES', openingBalance: 0, currentBalance: 0 },
            { id: 'LED-DEPRECIATION', name: 'Depreciation Expense', groupId: 'GRP-EXPENSES', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-SERVICE-REV', name: 'Service Revenue', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-SPARES-REV', name: 'Spares Revenue', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-TRAVEL-EXP', name: 'Travelling Expense', groupId: 'GRP-EXPENSES', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-FOOD-EXP', name: 'Food Expense', groupId: 'GRP-EXPENSES', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-OFFICE-EXP', name: 'Office Expense', groupId: 'GRP-EXPENSES', openingBalance: 0, currentBalance: 0 },
            { id: 'LDG-SALARY-ADV', name: 'Salary Advance', groupId: 'GRP-ASSETS', openingBalance: 0, currentBalance: 0 }
        ];

        // Also seed fixed asset / depreciation groups if missing
        if (!accountGroups.find(ag => ag.id === 'GRP-FIXED-ASSETS')) {
            await addAccountGroup({ id: 'GRP-FIXED-ASSETS', name: 'Fixed Assets', parentGroupId: 'GRP-ASSETS', type: 'Asset' });
        }
        if (!accountGroups.find(ag => ag.id === 'GRP-DEPRECIATION')) {
            await addAccountGroup({ id: 'GRP-DEPRECIATION', name: 'Depreciation', parentGroupId: 'GRP-EXPENSES', type: 'Expense' });
        }

        for (const l of defaultLedgers) {
            if (!ledgers.find(lg => lg.id === l.id)) {
                await addLedger(l);
            }
        }
    };

    const syncInventoryFromInvoice = async (newInv: Invoice, oldInv: Invoice | null) => {
        try {
            interface InvoiceItemDetails {
                name: string;
                qty: number;
            }

            const getItems = (inv: Invoice): InvoiceItemDetails[] => {
                if (inv.documentType !== 'Invoice' || inv.status === 'Cancelled' || inv.status === 'Draft') {
                    return [];
                }
                const list: InvoiceItemDetails[] = [];
                if (inv.items && inv.items.length > 0) {
                    inv.items.forEach(item => {
                        list.push({
                            name: item.description || '',
                            qty: Number(item.quantity) || 0
                        });
                    });
                }
                return list;
            };

            let currentProducts = [...products];
            const dateSupply = newInv.date || new Date().toISOString().split('T')[0];

            // 1. Reverse the old invoice items (add back to stock)
            if (oldInv) {
                const oldItems = getItems(oldInv);
                for (const item of oldItems) {
                    if (!item.name) continue;
                    const existingProdIndex = currentProducts.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                    if (existingProdIndex !== -1) {
                        const existingProd = currentProducts[existingProdIndex];
                        const newStock = Number(existingProd.stock || 0) + item.qty;
                        const updatedProduct = { ...existingProd, stock: newStock };
                        currentProducts[existingProdIndex] = updatedProduct;

                        await updateDoc(doc(db, "products", existingProd.id), sanitizeData({ stock: newStock }));
                        await addLog('Inventory', 'Invoice Reversal', `Added back ${item.qty} units of ${existingProd.name} due to invoice change/reversal`);
                        
                        await recordStockMovement({
                            id: `MVT-INV-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: existingProd.id,
                            productName: existingProd.name,
                            type: 'In',
                            quantity: item.qty,
                            date: dateSupply,
                            reference: `Rev: Invoice #${oldInv.invoiceNumber || oldInv.id}`,
                            purpose: 'Restock'
                        });
                    }
                }
            }

            // 2. Apply the new invoice items (subtract from stock)
            const newItems = getItems(newInv);
            for (const item of newItems) {
                if (!item.name) continue;
                const existingProdIndex = currentProducts.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());

                if (existingProdIndex !== -1) {
                    const existingProd = currentProducts[existingProdIndex];
                    const newStock = Math.max(0, Number(existingProd.stock || 0) - item.qty);
                    const updatedProduct = { ...existingProd, stock: newStock };
                    currentProducts[existingProdIndex] = updatedProduct;

                    await updateDoc(doc(db, "products", existingProd.id), sanitizeData({ stock: newStock }));
                    await addLog('Inventory', 'Invoice Deduction', `Subtracted ${item.qty} units of ${existingProd.name} due to invoice sale`);

                    await recordStockMovement({
                        id: `MVT-INV-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: existingProd.id,
                        productName: existingProd.name,
                        type: 'Out',
                        quantity: item.qty,
                        date: dateSupply,
                        reference: `Invoice #${newInv.invoiceNumber || newInv.id}`,
                        purpose: 'Sale'
                    });
                }
            }

            setProducts(currentProducts.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Failed to sync inventory from invoice:", err);
        }
    };

    const updateInvoice = async (id: string, u: Partial<Invoice>, reason?: string) => {
        const existing = invoices.find(i => i.id === id);
        if (!existing) return;

        const wasInventoryAffecting = existing.documentType === 'Invoice' && existing.status !== 'Draft' && existing.status !== 'Cancelled';
        const isInventoryAffecting = (u.documentType || existing.documentType) === 'Invoice' && 
                                     (u.status || existing.status) !== 'Draft' && 
                                     (u.status || existing.status) !== 'Cancelled';

        if (wasInventoryAffecting || isInventoryAffecting) {
            let updatedProductsList: Product[] = [];
            let stockMovementsToCreate: StockMovement[] = [];
            
            await runTransaction(db, async (tx) => {
                const currentProducts = [...products];
                
                // Group new items
                const newGrouped: Record<string, number> = {};
                if (isInventoryAffecting) {
                    const finalItems = u.items !== undefined ? u.items : existing.items;
                    (finalItems || []).forEach(item => {
                        const name = (item.description || '').toUpperCase();
                        if (name) {
                            newGrouped[name] = (newGrouped[name] || 0) + (Number(item.quantity) || 0);
                        }
                    });
                }
                
                // Group old items
                const oldGrouped: Record<string, number> = {};
                if (wasInventoryAffecting) {
                    (existing.items || []).forEach(item => {
                        const name = (item.description || '').toUpperCase();
                        if (name) {
                            oldGrouped[name] = (oldGrouped[name] || 0) + (Number(item.quantity) || 0);
                        }
                    });
                }
                
                // Collect all product names
                const allProductNames = Array.from(new Set([
                    ...Object.keys(newGrouped),
                    ...Object.keys(oldGrouped)
                ]));
                
                const insufficientItems: any[] = [];
                const productsToUpdate: { ref: any, newStock: number, productData: Product }[] = [];
                
                for (const prodName of allProductNames) {
                    const masterProduct = currentProducts.find(p => p.name.toUpperCase() === prodName);
                    let dbProduct: Product | null = null;
                    let ref = null;
                    if (masterProduct) {
                        ref = doc(db, "products", masterProduct.id);
                        const snap = await tx.get(ref);
                        if (snap.exists()) {
                            dbProduct = snap.data() as Product;
                        }
                    }
                    
                    const dbStock = dbProduct ? Number(dbProduct.stock || 0) : 0;
                    const oldQty = oldGrouped[prodName] || 0;
                    const newQty = newGrouped[prodName] || 0;
                    
                    const availableStock = dbStock + oldQty;
                    
                    if (newQty > availableStock) {
                        insufficientItems.push({
                            name: prodName,
                            requested: newQty,
                            available: availableStock
                        });
                    } else if (ref && dbProduct) {
                        const newStock = dbStock + oldQty - newQty;
                        productsToUpdate.push({
                            ref,
                            newStock,
                            productData: { ...dbProduct, stock: newStock }
                        });
                        
                        const netChange = oldQty - newQty;
                        if (netChange > 0) {
                            stockMovementsToCreate.push({
                                id: `MVT-INV-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                                productId: dbProduct.id,
                                productName: dbProduct.name,
                                type: 'In',
                                quantity: netChange,
                                date: u.date || existing.date || new Date().toISOString().split('T')[0],
                                reference: `Rev/Mod: Invoice #${existing.invoiceNumber || existing.id}`,
                                purpose: 'Restock'
                            });
                        } else if (netChange < 0) {
                            stockMovementsToCreate.push({
                                id: `MVT-INV-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                                productId: dbProduct.id,
                                productName: dbProduct.name,
                                type: 'Out',
                                quantity: Math.abs(netChange),
                                date: u.date || existing.date || new Date().toISOString().split('T')[0],
                                reference: `Invoice #${existing.invoiceNumber || existing.id}`,
                                purpose: 'Sale'
                            });
                        }
                    } else {
                        if (newQty > 0) {
                            insufficientItems.push({
                                name: prodName,
                                requested: newQty,
                                available: 0
                            });
                        }
                    }
                }
                
                if (insufficientItems.length > 0) {
                    throw new Error(JSON.stringify({ type: 'INSUFFICIENT_STOCK', items: insufficientItems }));
                }
                
                const auditEntry = createAuditEntry('Modified', existing, { ...existing, ...u }, reason);
                const updatedEditHistory = [auditEntry, ...(existing.editHistory || [])].slice(0, 50);
                
                tx.update(doc(db, "invoices", id), sanitizeData({ ...u, editHistory: updatedEditHistory }));
                
                productsToUpdate.forEach(({ ref, newStock }) => {
                    tx.update(ref, { stock: newStock });
                });
                
                stockMovementsToCreate.forEach(m => {
                    const docData = { ...m, timestamp: new Date().toISOString() };
                    tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
                });
                
                updatedProductsList = currentProducts.map(p => {
                    const update = productsToUpdate.find(u => u.productData.id === p.id);
                    return update ? update.productData : p;
                });
            });
            
            if (updatedProductsList.length > 0) {
                setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
            }
            
            await addLog('Billing', 'Updated Doc', `${existing?.invoiceNumber || id}`, existing, { ...existing, ...u });
        } else {
            const auditEntry = createAuditEntry('Modified', existing, { ...existing, ...u }, reason);
            const updatedEditHistory = [auditEntry, ...(existing.editHistory || [])].slice(0, 50);
            
            await updateDoc(doc(db, "invoices", id), sanitizeData({ ...u, editHistory: updatedEditHistory }));
            await addLog('Billing', 'Updated Doc', `${existing?.invoiceNumber || id}`, existing, { ...existing, ...u });
        }

        const updatedRecord = { ...existing, ...u } as Invoice;
        await checkAndAddInvoiceIncentive(updatedRecord);

        if (existing && existing.documentType !== 'Quotation') {
            const wasValid = existing.status !== 'Draft' && existing.status !== 'Cancelled';
            const isNowValid = (u.status || existing.status) !== 'Draft' && (u.status || existing.status) !== 'Cancelled';
            const type = existing.documentType === 'SupplierPO' ? 'expense' : 'revenue';
            
            if (!wasValid && isNowValid) {
                await updateMonthlySummary(existing.date, u.grandTotal || existing.grandTotal || 0, type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, u.grandTotal || existing.grandTotal || 0);
            } else if (wasValid && isNowValid && u.grandTotal !== undefined && u.grandTotal !== existing.grandTotal) {
                await updateMonthlySummary(existing.date, u.grandTotal - (existing.grandTotal || 0), type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, u.grandTotal - (existing.grandTotal || 0));
            } else if (wasValid && !isNowValid) {
                await updateMonthlySummary(existing.date, -(existing.grandTotal || 0), type);
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, -(existing.grandTotal || 0));
            }
        }

        // Event-driven accounting: status transitions
        if (existing.documentType === 'Invoice') {
            const newStatus = u.status || existing.status;

            // Invoice changed from Draft to non-Draft non-Cancelled -> post Sales Voucher
            if (existing.status === 'Draft' && newStatus !== 'Draft' && newStatus !== 'Cancelled') {
                await postSalesVoucher({ ...existing, ...u } as Invoice);
            }
            // Invoice details updated while it was already active -> reverse and post new Sales Voucher
            else if (existing.status !== 'Draft' && existing.status !== 'Cancelled' && newStatus !== 'Cancelled') {
                const isAmountOrDetailChanged = (u.grandTotal !== undefined && u.grandTotal !== existing.grandTotal) || 
                                                (u.items !== undefined) || 
                                                (u.isRoundOff !== undefined) || 
                                                (u.roundOffAmount !== undefined);
                if (isAmountOrDetailChanged) {
                    const salesVouchers = vouchers.filter(v => v.referenceId === existing.id && v.type === 'Sales' && !v.voucherNumber?.startsWith('REV-'));
                    for (const vch of salesVouchers) {
                        try {
                            await reverseVoucher(vch.id, `Auto-reversed: Invoice ${existing.invoiceNumber} details updated`);
                        } catch (err) {}
                    }
                    await postSalesVoucher({ ...existing, ...u } as Invoice);
                }
            }

            // Invoice marked as Paid or Completed → auto-post Receipt voucher
            if ((u.status === 'Paid' || u.status === 'Completed') && existing.status !== 'Paid' && existing.status !== 'Completed') {
                try {
                    const debtorId = await ensurePartyLedger(existing.customerName, 'GRP-DEBTORS', { gstin: existing.customerGstin, email: existing.email, phone: existing.phone });
                    const bankLdg = ledgers.find(l => l.id === 'LDG-BANK') || ledgers.find(l => l.id === 'LDG-CASH');
                    if (!bankLdg) console.warn('No Bank or Cash ledger found — Receipt entry will have empty ledgerId');
                    const amount = u.paidAmount || existing.paidAmount || existing.grandTotal || 0;
                    if (amount > 0) {
                        await postToLedger({
                            date: new Date().toISOString().split('T')[0],
                            type: 'Receipt',
                            entries: [
                                { id: `${existing.id}-RCV-BANK`, ledgerId: bankLdg?.id || '', ledgerName: bankLdg?.name || 'Bank Account', debit: amount, credit: 0 },
                                { id: `${existing.id}-RCV-DEBTOR`, ledgerId: debtorId, ledgerName: existing.customerName, debit: 0, credit: amount },
                            ],
                            totalAmount: amount,
                            narration: `Auto: Payment received for ${existing.invoiceNumber} — ${existing.customerName}`,
                            referenceId: existing.id,
                            referenceNumber: existing.invoiceNumber
                        });
                        await addLog('Accounting', 'Auto Receipt Entry', `Invoice ${existing.invoiceNumber} → Receipt voucher posted`);
                    }
                } catch (err) {
                    console.warn('Auto-accounting failed for invoice payment:', err);
                    await addLog('Accounting', 'Auto-Entry Failed', `Payment for ${existing.invoiceNumber}: ${err}`);
                }
            }

            // Invoice cancelled → reverse existing vouchers
            if (u.status === 'Cancelled' && existing.status !== 'Cancelled') {
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Invoice ${existing.invoiceNumber} cancelled`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for voucher:', err);
                    }
                }
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

    // --- AUTOMATION HELPERS ---

    // Auto-alert when product stock falls below minLevel
    const checkLowStockAlerts = (productList: typeof products) => {
        productList.forEach(p => {
            const min = p.minLevel || 5;
            if ((p.stock || 0) <= min) {
                addNotification(
                    '⚠️ Low Stock Alert',
                    `${p.name} is at ${p.stock} units (min: ${min}). Please reorder.`,
                    'warning'
                );
            }
        });
    };

    // Auto-create tasks 30 days before AMC expiry (stored in serviceTickets or products)
    const checkAmcReminders = (tickets: typeof serviceTickets) => {
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        tickets.forEach(ticket => {
            if (ticket.dueDate) {
                const dueDate = new Date(ticket.dueDate);
                if (dueDate >= today && dueDate <= thirtyDaysFromNow && ticket.status !== 'Resolved') {
                    addNotification(
                        '📅 AMC Expiry Reminder',
                        `${ticket.customer} — ${ticket.equipment}: Service due on ${ticket.dueDate}. Assign engineer.`,
                        'info'
                    );
                }
            }
        });
    };

    // Remind about GST filing on 7th of each month
    const checkGstFilingReminder = () => {
        const today = new Date();
        if (today.getDate() === 7) {
            addNotification(
                '📋 GST Filing Reminder',
                'Today is the 7th. GSTR-1 or GSTR-3B may be due. Please verify and file on time.',
                'warning'
            );
        }
        // Also alert on 20th for GSTR-3B
        if (today.getDate() === 20) {
            addNotification(
                '📋 GSTR-3B Due',
                'GSTR-3B deadline is today (20th). Ensure tax payment and filing is complete.',
                'warning'
            );
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

        // 1.5 — Auto-close parent task when all subtasks are done
        const merged = { ...existing, ...u } as Task;
        const subTasksList = merged.subTasks || (merged as any).subtasks;
        if (subTasksList && subTasksList.length > 0) {
            const allDone = subTasksList.every((s: any) => s.done);
            if (allDone && merged.status !== 'Done') {
                await updateDoc(doc(db, "tasks", id), sanitizeData({ status: 'Done' }));
                setTaskSnap(prev => prev.map(t => t.id === id ? { ...t, status: 'Done' } as Task : t));
                addNotification('✅ Task Auto-Completed', `All subtasks done — "${merged.title}" marked complete.`, 'success');
                if (currentUser) await updateUserSummary(currentUser.id, currentUser.name, 0, 1);
            }
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

    const addServiceTicket = async (t: ServiceTicket) => {
        await setDoc(doc(db, "serviceTickets", t.id), sanitizeData(t));
        await addLog('System', 'New Ticket', t.issue);
        // 1.6 — Auto-create a Task for the assigned engineer
        if (t.assignedTo) {
            const autoTask: Task = {
                id: `TASK-TKT-${t.id}`,
                title: `[Service] ${t.equipment || 'Equipment'} — ${t.customer}`,
                description: `Auto-created from ticket. Issue: ${t.issue}`,
                status: 'In Progress',
                priority: t.priority === 'Urgent' ? 'High' : (t.priority || 'Medium') as any,
                assignedTo: t.assignedTo,
                submittedBy: 'System',
                dueDate: t.dueDate || new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                ticketId: t.id,
                subtasks: [],
            };
            await setDoc(doc(db, "tasks", autoTask.id), sanitizeData(autoTask));
            setTaskSnap(prev => [autoTask as Task, ...prev]);
            await addLog('Tasks', 'Auto Task from Ticket', `Ticket ${t.id} → Task created for ${t.assignedTo}`);
            addNotification('🔧 Task Auto-Created', `Service task assigned to ${t.assignedTo} for ${t.customer}.`, 'info');
        }
    };
    const updateServiceTicket = async (id: string, u: Partial<ServiceTicket>) => { await updateDoc(doc(db, "serviceTickets", id), sanitizeData(u)); await addLog('System', 'Updated Ticket', id); };

    const addServiceTask = async (t: ServiceTask) => {
        setServiceTasks(prev => [t, ...prev]);
        await setDoc(doc(db, "serviceTasks", t.id), sanitizeData(t));
        await addLog('Tasks', 'New Service Task', `From: ${t.customerName} — ${t.equipment}`);
    };

    const updateServiceTask = async (id: string, u: Partial<ServiceTask>) => {
        setServiceTasks(prev => prev.map(t => t.id === id ? { ...t, ...u } as ServiceTask : t));
        await updateDoc(doc(db, "serviceTasks", id), sanitizeData(u));
        const existing = serviceTasks.find(t => t.id === id);
        await addLog('Tasks', 'Updated Service Task', existing?.customerName || id, existing, { ...existing, ...u });
    };

    const autoPostExpenseVoucher = async (e: ExpenseRecord) => {
        try {
            let expenseLedgerId = 'LDG-OFFICE-EXP';
            let expenseLedgerName = 'Office Expense';
            
            if (e.category === 'Travel') {
                expenseLedgerId = 'LDG-TRAVEL-EXP';
                expenseLedgerName = 'Travelling Expense';
            } else if (e.category === 'Food') {
                expenseLedgerId = 'LDG-FOOD-EXP';
                expenseLedgerName = 'Food Expense';
            }
            
            const bankLdg = ledgers.find(l => l.id === 'LDG-BANK') || ledgers.find(l => l.id === 'LDG-CASH');
            
            await postToLedger({
                date: e.date,
                type: 'Payment',
                entries: [
                    { id: `${e.id}-DR`, ledgerId: expenseLedgerId, ledgerName: expenseLedgerName, debit: e.amount, credit: 0 },
                    { id: `${e.id}-CR`, ledgerId: bankLdg?.id || 'LDG-BANK', ledgerName: bankLdg?.name || 'Bank Account', debit: 0, credit: e.amount }
                ],
                totalAmount: e.amount,
                narration: `Auto: Approved Expense — ${e.category} for ${e.employeeName} — ${e.description}`,
                referenceId: e.id,
                referenceNumber: e.id.slice(-6)
            });
            await addLog('Accounting', 'Auto Expense Entry', `Expense ${e.id} approved → Payment voucher posted`);
        } catch (err) {
            console.warn('Auto-accounting failed for expense:', err);
        }
    };

    const addExpense = async (e: ExpenseRecord) => { 
        await setDoc(doc(db, "expenses", e.id), sanitizeData(e)); 
        await addLog('Billing', 'New Expense', `₹${e.amount}`); 
        
        if (e.status === 'Approved') {
            await updateMonthlySummary(e.date, e.amount, 'expense');
            await autoPostExpenseVoucher(e);
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
                await autoPostExpenseVoucher({ ...existing, ...updates, status: 'Approved' });
            } else if (wasApproved && isNowApproved && updates.amount !== undefined && updates.amount !== existing.amount) {
                await updateMonthlySummary(existing.date, updates.amount - existing.amount, 'expense');
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Expense ${existing.id} details updated`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for expense voucher:', err);
                    }
                }
                await autoPostExpenseVoucher({ ...existing, ...updates, status: 'Approved' });
            } else if (wasApproved && !isNowApproved) {
                await updateMonthlySummary(existing.date, -existing.amount, 'expense');
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Expense ${existing.id} status changed from Approved`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for expense voucher:', err);
                    }
                }
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
                await autoPostExpenseVoucher({ ...existing, status });
            } else if (existing.status === 'Approved' && status !== 'Approved') {
                await updateMonthlySummary(existing.date, -existing.amount, 'expense');
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Expense ${existing.id} status changed from Approved`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for expense voucher:', err);
                    }
                }
            }
        }
    };

    const removeExpense = async (id: string, operator: string) => {
        const existing = expenses.find(e => e.id === id);
        if (!existing) throw new Error('Expense not found');
        
        if (existing.status !== 'Pending') {
            throw new Error('Only Pending expenses can be deleted');
        }

        await deleteDoc(doc(db, "expenses", id));
        await addLog('Billing', 'Expense Deleted', `ID: ${id} by ${operator}`, existing);
        
        // Note: Since it's Pending, it hasn't impacted monthlySummary yet based on addExpense logic.
    };

    const addEmployee = async (e: Employee) => { await setDoc(doc(db, "employees", e.id), sanitizeData(e)); await addLog('System', 'New Employee', e.name); };
    const updateEmployee = async (id: string, u: Partial<Employee>) => {
        const existing = employees.find(e => e.id === id);
        
        // Backend Validation & Authorization Check
        const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com';
        if (!isSystemAdmin && currentUser?.id !== id) {
            throw new Error("Access Denied: Only SYSTEM_ADMIN can update other employee records.");
        }
        if (!isSystemAdmin && currentUser?.id === id) {
            if (u.role !== undefined && u.role !== existing?.role) {
                throw new Error("Access Denied: Cannot modify your own role.");
            }
            if (u.permissions !== undefined) {
                throw new Error("Access Denied: Cannot modify your own permissions.");
            }
        }

        // Detailed Permission Audit Logging
        if (u.permissions && existing) {
            const oldPerms = existing.permissions || {};
            const newPerms = u.permissions;
            const changes: string[] = [];
            
            Object.keys(newPerms).forEach(key => {
                if (newPerms[key] !== oldPerms[key]) {
                    changes.push(`${key}: ${oldPerms[key] || 'None'} -> ${newPerms[key]}`);
                }
            });
            Object.keys(oldPerms).forEach(key => {
                if (newPerms[key] === undefined) {
                    changes.push(`${key}: ${oldPerms[key]} -> None`);
                }
            });

            if (changes.length > 0) {
                const operatorName = currentUser?.name || 'System';
                await addLog('System', 'Permission Changes', `${existing.name} permissions updated by ${operatorName}: ${changes.join(', ')}`, oldPerms, newPerms);
            }
        }

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

    const autoPostServiceReportVouchers = async (r: ServiceReport) => {
        try {
            const visit = r.visitCharges || 0;
            const spares = r.sparesCharges || 0;
            const total = visit + spares;
            if (total <= 0) return;

            const debtorId = await ensurePartyLedger(r.customerName, 'GRP-DEBTORS');
            
            const entries = [];
            entries.push({ id: `${r.id}-DR`, ledgerId: debtorId, ledgerName: r.customerName, debit: total, credit: 0 });
            
            if (visit > 0) {
                const serviceRevLdg = ledgers.find(l => l.id === 'LDG-SERVICE-REV');
                entries.push({ id: `${r.id}-CR-VISIT`, ledgerId: serviceRevLdg?.id || 'LDG-SERVICE-REV', ledgerName: 'Service Revenue', debit: 0, credit: visit });
            }
            if (spares > 0) {
                const sparesRevLdg = ledgers.find(l => l.id === 'LDG-SPARES-REV');
                entries.push({ id: `${r.id}-CR-SPARES`, ledgerId: sparesRevLdg?.id || 'LDG-SPARES-REV', ledgerName: 'Spares Revenue', debit: 0, credit: spares });
            }

            if (r.isRoundOff && r.roundOffAmount) {
                const roAmt = Number(r.roundOffAmount);
                let roundOffLdg = ledgers.find(l => l.name === 'Round Off');
                if (!roundOffLdg) {
                    const roId = 'LED-ROUNDOFF';
                    roundOffLdg = { id: roId, name: 'Round Off', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 };
                    try { await addLedger(roundOffLdg); } catch(e){}
                }
                if (roundOffLdg && roAmt > 0) {
                    entries.push({ id: `${r.id}-RO-CR`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: 0, credit: roAmt });
                } else if (roundOffLdg && roAmt < 0) {
                    entries.push({ id: `${r.id}-RO-DR`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: Math.abs(roAmt), credit: 0 });
                }
            }

            await postToLedger({
                date: r.date || new Date().toISOString().split('T')[0],
                type: 'Sales',
                entries,
                totalAmount: total,
                narration: `Auto: Service Report completed for ${r.customerName} — visit charges: ₹${visit}, spares charges: ₹${spares}`,
                referenceId: r.id,
                referenceNumber: r.reportNumber
            });
            await addLog('Accounting', 'Auto Service Report Sales Entry', `Service report ${r.reportNumber} completed → Sales voucher posted`);

            const received = r.amountReceived || 0;
            if (received > 0) {
                const bankLdg = ledgers.find(l => l.id === 'LDG-BANK') || ledgers.find(l => l.id === 'LDG-CASH');
                await postToLedger({
                    date: r.date || new Date().toISOString().split('T')[0],
                    type: 'Receipt',
                    entries: [
                        { id: `${r.id}-RCV-DR`, ledgerId: bankLdg?.id || 'LDG-BANK', ledgerName: bankLdg?.name || 'Bank Account', debit: received, credit: 0 },
                        { id: `${r.id}-RCV-CR`, ledgerId: debtorId, ledgerName: r.customerName, debit: 0, credit: received }
                    ],
                    totalAmount: received,
                    narration: `Auto: Payment received for Service Report ${r.reportNumber} — ${r.customerName}`,
                    referenceId: r.id,
                    referenceNumber: r.reportNumber
                });
                await addLog('Accounting', 'Auto Service Report Receipt Entry', `Service report ${r.reportNumber} payment → Receipt voucher posted`);
            }
        } catch (err) {
            console.warn('Auto-accounting failed for service report:', err);
        }
    };

    const addServiceReport = async (r: ServiceReport) => { 
        await setDoc(doc(db, "serviceReports", r.id), sanitizeData(r)); 
        await addLog('System', 'Created Service Report', r.reportNumber); 
        
        if (r.status === 'Completed') {
            await autoPostServiceReportVouchers(r);
        }
    };
    const updateServiceReport = async (id: string, u: Partial<ServiceReport>) => {
        const existing = serviceReports.find(r => r.id === id);
        await updateDoc(doc(db, "serviceReports", id), sanitizeData(u));
        await addLog('System', 'Updated Service Report', existing?.reportNumber || id, existing, { ...existing, ...u });

        if (existing) {
            const wasCompleted = existing.status === 'Completed';
            const isNowCompleted = (u.status || existing.status) === 'Completed';
            
            if (!wasCompleted && isNowCompleted) {
                await autoPostServiceReportVouchers({ ...existing, ...u, status: 'Completed' });
            } else if (wasCompleted && isNowCompleted && (u.visitCharges !== undefined || u.sparesCharges !== undefined || u.amountReceived !== undefined)) {
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Service Report details updated`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for service report voucher:', err);
                    }
                }
                await autoPostServiceReportVouchers({ ...existing, ...u, status: 'Completed' });
            } else if (wasCompleted && !isNowCompleted) {
                const existingVouchers = vouchers.filter(v => v.referenceId === existing.id && !v.voucherNumber?.startsWith('REV-'));
                for (const vch of existingVouchers) {
                    try {
                        await reverseVoucher(vch.id, `Auto-reversed: Service Report marked back to Draft`);
                    } catch (err) {
                        console.warn('Auto-reversal failed for service report voucher:', err);
                    }
                }
            }
        }
    };
    const removeServiceReport = async (id: string) => { 
        const existing = serviceReports.find(r => r.id === id);
        await deleteDoc(doc(db, "serviceReports", id)); 
        await addLog('System', 'Removed Service Report', id); 
        
        if (existing && existing.status === 'Completed') {
            const existingVouchers = vouchers.filter(v => v.referenceId === id && !v.voucherNumber?.startsWith('REV-'));
            for (const vch of existingVouchers) {
                try {
                    await reverseVoucher(vch.id, `Auto-reversed: Service Report removed`);
                } catch (err) {
                    console.warn('Auto-reversal failed for service report voucher:', err);
                }
            }
        }
    };

    const addHoliday = async (h: Holiday) => { await setDoc(doc(db, "holidays", h.id), sanitizeData(h)); await addLog('System', 'Added Holiday', h.name); };
    const removeHoliday = async (id: string) => { await deleteDoc(doc(db, "holidays", id)); await addLog('System', 'Removed Holiday', id); };

    const addPoints = async (amount: number, cat: PointHistory['category'], desc: string, target?: string) => {
        const id = `PT-${Date.now()}`;
        const item = { id, userId: target || currentUser?.id || 'sys', points: amount, category: cat, description: desc, date: new Date().toISOString() };
        await setDoc(doc(db, "pointHistory", id), sanitizeData(item));
        await addLog('System', 'Points Gift', `${amount} to ${target || 'User'}`);
    };

    const addLeaveRequest = async (req: LeaveRequest) => {
        setLeaveRequests(prev => [req, ...prev]);
        try {
            await setDoc(doc(db, "leave_requests", req.id), sanitizeData(req));
            await addLog('Attendance', 'Leave Applied', `${req.userName} for ${req.startDate}`);
            addNotification('Leave Applied', 'Your request has been sent for approval.', 'info');
        } catch (e) {
            console.error("Failed to add leave request:", e);
            setLeaveRequests(prev => prev.filter(r => r.id !== req.id));
            addNotification('Error', 'Failed to submit leave request.', 'alert');
        }
    };

    const updateLeaveRequest = async (id: string, updates: Partial<LeaveRequest>) => {
        const existing = leaveRequests.find(r => r.id === id);
        if (!existing) return;
        
        // Optimistic update
        setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

        try {
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
                    
                    const newAtt = {
                        id: rid, userId: existing.userId, userName: existing.userName,
                        date: ds, status: 'OnLeave' as const, leaveReason: existing.reason,
                        checkInTime: null, checkOutTime: null, totalWorkedMs: 0, workMode: 'Office' as const
                    };

                    setAttendanceRecords(prev => {
                        const exists = prev.find(a => a.id === rid);
                        if (exists) return prev.map(a => a.id === rid ? { ...a, ...newAtt } : a);
                        return [...prev, newAtt];
                    });

                    await setDoc(doc(db, "attendance", rid), sanitizeData(newAtt), { merge: true });
                    curr.setDate(curr.getDate() + 1);
                }
                addNotification('Leave Approved', `Request for ${existing.userName} cleared.`, 'success');
            } else if (updates.status === 'Rejected') {
                addNotification('Leave Rejected', `Request for ${existing.userName} declined.`, 'alert');
            }
        } catch (e) {
            console.error("Failed to update leave request:", e);
            // Revert on failure
            setLeaveRequests(prev => prev.map(r => r.id === id ? existing : r));
            addNotification('Error', 'Failed to process leave request.', 'alert');
        }
    };

    const recordStockMovement = async (m: StockMovement) => { 
        const docData = { ...m, timestamp: new Date().toISOString() };
        await setDoc(doc(db, "stockMovements", m.id), sanitizeData(docData)); 
        await addLog('Inventory', 'Stock Movement', `${m.type} ${m.quantity} ${m.productName} for ${m.purpose}`); 
    };

    const updateVendorProcurementVolume = async (vendorName: string) => {
        const vendor = vendors.find(v => v.name.toUpperCase() === vendorName.toUpperCase());
        if (!vendor) return;

        try {
            const q = query(
                collection(db, "purchaseRecords"),
                where("supplier", "==", vendorName.toUpperCase())
            );
            const snap = await getDocs(q);
            let totalVolume = 0;
            snap.forEach(doc => {
                const data = doc.data();
                totalVolume += Number(data.total) || 0;
            });

            // Update local state
            setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, procurementVolume: totalVolume } : v));
            // Update Firestore
            await updateDoc(doc(db, "vendors", vendor.id), { procurementVolume: totalVolume });
        } catch (err) {
            console.error("Failed to update vendor procurement volume:", err);
        }
    };

    const syncInventoryFromPurchase = async (newRecord: PurchaseRecord, oldRecord: PurchaseRecord | null) => {
        try {
            interface PurchaseItemDetails {
                name: string;
                qty: number;
                rate: number;
                unit: string;
                gstPercent: number;
            }

            const getItems = (r: PurchaseRecord): PurchaseItemDetails[] => {
                const list: PurchaseItemDetails[] = [];
                if (r.items && r.items.length > 0) {
                    r.items.forEach(item => {
                        list.push({
                            name: item.equipmentName || '',
                            qty: Number(item.qty) || 0,
                            rate: Number(item.rate) || 0,
                            unit: item.unit || 'nos',
                            gstPercent: Number(item.gstPercent || (item.cgstPercent || 0) + (item.sgstPercent || 0) + (item.igstPercent || 0) || 0)
                        });
                    });
                } else if (r.equipmentName) {
                    list.push({
                        name: r.equipmentName,
                        qty: Number(r.qty) || 0,
                        rate: Number(r.rate) || 0,
                        unit: r.unit || 'nos',
                        gstPercent: Number(r.gstPercent || (r.cgstPercent || 0) + (r.sgstPercent || 0) + (r.igstPercent || 0) || 0)
                    });
                }
                return list;
            };

            let currentProducts = [...products];
            const dateSupply = newRecord.dateSupply || new Date().toISOString().split('T')[0];

            // 1. Reverse the old record if it exists
            if (oldRecord) {
                const oldItems = getItems(oldRecord);
                for (const item of oldItems) {
                    if (!item.name) continue;
                    const existingProdIndex = currentProducts.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                    if (existingProdIndex !== -1) {
                        const existingProd = currentProducts[existingProdIndex];
                        const newStock = Math.max(0, Number(existingProd.stock || 0) - item.qty);
                        const updatedProduct = { ...existingProd, stock: newStock };
                        currentProducts[existingProdIndex] = updatedProduct;

                        await updateDoc(doc(db, "products", existingProd.id), sanitizeData({ stock: newStock }));
                        await addLog('Inventory', 'Purchase Reversal', `Reversed ${item.qty} units of ${existingProd.name}`);
                        
                        await recordStockMovement({
                            id: `MVT-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: existingProd.id,
                            productName: existingProd.name,
                            type: 'Out',
                            quantity: item.qty,
                            date: dateSupply,
                            reference: `Rev: Purchase #${oldRecord.invoiceNo || oldRecord.id}`,
                            purpose: 'Restock'
                        });
                    }
                }
            }

            // 2. Apply the new record if it is not blank (deletion sends empty newRecord.id)
            const newItems = getItems(newRecord);
            for (const item of newItems) {
                if (!item.name) continue;
                const existingProdIndex = currentProducts.findIndex(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());

                if (existingProdIndex !== -1) {
                    const existingProd = currentProducts[existingProdIndex];
                    const newStock = Number(existingProd.stock || 0) + item.qty;
                    const updatedProduct = {
                        ...existingProd,
                        stock: newStock,
                        purchasePrice: item.rate,
                        lastRestocked: dateSupply,
                        supplier: newRecord.supplier || existingProd.supplier
                    };
                    currentProducts[existingProdIndex] = updatedProduct;

                    await updateDoc(doc(db, "products", existingProd.id), sanitizeData({
                        stock: newStock,
                        purchasePrice: item.rate,
                        lastRestocked: dateSupply,
                        supplier: newRecord.supplier || existingProd.supplier
                    }));
                    await addLog('Inventory', 'Updated Product', `Item: ${existingProd.name}`, existingProd, updatedProduct);

                    await recordStockMovement({
                        id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: existingProd.id,
                        productName: existingProd.name,
                        type: 'In',
                        quantity: item.qty,
                        date: dateSupply,
                        reference: `Purchase #${newRecord.invoiceNo || newRecord.id}`,
                        purpose: 'Restock'
                    });
                } else {
                    const newProdId = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    const newProd: Product = {
                        id: newProdId,
                        name: item.name.toUpperCase(),
                        category: 'Equipment',
                        sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        stock: item.qty,
                        unit: item.unit,
                        purchasePrice: item.rate,
                        sellingPrice: item.rate,
                        minLevel: 5,
                        location: 'Warehouse',
                        supplier: newRecord.supplier || '',
                        lastRestocked: dateSupply,
                        taxRate: item.gstPercent,
                        hsn: ''
                    };
                    currentProducts.push(newProd);

                    await setDoc(doc(db, "products", newProdId), sanitizeData(newProd));
                    await addLog('Inventory', 'Added Product', `Item: ${newProd.name}`);

                    await recordStockMovement({
                        id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: newProdId,
                        productName: newProd.name,
                        type: 'In',
                        quantity: item.qty,
                        date: dateSupply,
                        reference: `Purchase #${newRecord.invoiceNo || newRecord.id}`,
                        purpose: 'Restock'
                    });
                }
            }

            setProducts(currentProducts.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Failed to sync inventory from purchase entry:", err);
        }
    };

    const addPurchaseRecord = async (r: PurchaseRecord) => {
        let updatedProductsList: Product[] = [];
        let productsToLog: { isNew: boolean, productData: Product }[] = [];
        
        await runTransaction(db, async (tx) => {
            const currentProducts = [...products];
            
            const getItems = (rec: PurchaseRecord) => {
                const list: { name: string, qty: number, rate: number, unit: string, gstPercent: number }[] = [];
                if (rec.items && rec.items.length > 0) {
                    rec.items.forEach(item => {
                        list.push({
                            name: item.equipmentName || '',
                            qty: Number(item.qty) || 0,
                            rate: Number(item.rate) || 0,
                            unit: item.unit || 'nos',
                            gstPercent: Number(item.gstPercent || (item.cgstPercent || 0) + (item.sgstPercent || 0) + (item.igstPercent || 0) || 0)
                        });
                    });
                } else if (rec.equipmentName) {
                    list.push({
                        name: rec.equipmentName,
                        qty: Number(rec.qty) || 0,
                        rate: Number(rec.rate) || 0,
                        unit: rec.unit || 'nos',
                        gstPercent: Number(rec.gstPercent || (rec.cgstPercent || 0) + (rec.sgstPercent || 0) + (rec.igstPercent || 0) || 0)
                    });
                }
                return list;
            };
            
            const newItems = getItems(r);
            const dateSupply = r.dateSupply || new Date().toISOString().split('T')[0];
            
            const productsToUpdate: { ref: any, isNew: boolean, productData: Product }[] = [];
            const stockMovementsToCreate: StockMovement[] = [];
            
            for (const item of newItems) {
                if (!item.name) continue;
                const masterProduct = currentProducts.find(p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
                let ref = null;
                let dbProduct: Product | null = null;
                
                if (masterProduct) {
                    ref = doc(db, "products", masterProduct.id);
                    const snap = await tx.get(ref);
                    if (snap.exists()) {
                        dbProduct = snap.data() as Product;
                    }
                }
                
                if (dbProduct && ref) {
                    const newStock = Number(dbProduct.stock || 0) + item.qty;
                    const updatedProduct = {
                        ...dbProduct,
                        stock: newStock,
                        purchasePrice: item.rate,
                        lastRestocked: dateSupply,
                        supplier: r.supplier || dbProduct.supplier
                    };
                    productsToUpdate.push({ ref, isNew: false, productData: updatedProduct });
                    
                    stockMovementsToCreate.push({
                        id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: dbProduct.id,
                        productName: dbProduct.name,
                        type: 'In',
                        quantity: item.qty,
                        date: dateSupply,
                        reference: `Purchase #${r.invoiceNo || r.id}`,
                        purpose: 'Restock'
                    });
                } else {
                    const newProdId = masterProduct?.id || `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    ref = doc(db, "products", newProdId);
                    const newProd: Product = {
                        id: newProdId,
                        name: item.name.toUpperCase(),
                        category: 'Equipment',
                        sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        stock: item.qty,
                        unit: item.unit,
                        purchasePrice: item.rate,
                        sellingPrice: item.rate,
                        minLevel: 5,
                        location: 'Warehouse',
                        supplier: r.supplier || '',
                        lastRestocked: dateSupply,
                        taxRate: item.gstPercent,
                        hsn: ''
                    };
                    productsToUpdate.push({ ref, isNew: true, productData: newProd });
                    
                    stockMovementsToCreate.push({
                        id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: newProdId,
                        productName: newProd.name,
                        type: 'In',
                        quantity: item.qty,
                        date: dateSupply,
                        reference: `Purchase #${r.invoiceNo || r.id}`,
                        purpose: 'Restock'
                    });
                }
            }
            
            tx.set(doc(db, "purchaseRecords", r.id), sanitizeData(r));
            
            productsToUpdate.forEach(({ ref, isNew, productData }) => {
                if (isNew) {
                    tx.set(ref, sanitizeData(productData));
                } else {
                    tx.update(ref, {
                        stock: productData.stock,
                        purchasePrice: productData.purchasePrice,
                        lastRestocked: productData.lastRestocked,
                        supplier: productData.supplier
                    });
                }
            });
            
            stockMovementsToCreate.forEach(m => {
                const docData = { ...m, timestamp: new Date().toISOString() };
                tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
            });
            
            const tempProducts = [...currentProducts];
            productsToUpdate.forEach(({ isNew, productData }) => {
                if (isNew) {
                    tempProducts.push(productData);
                } else {
                    const idx = tempProducts.findIndex(p => p.id === productData.id);
                    if (idx !== -1) {
                        tempProducts[idx] = productData;
                    }
                }
            });
            updatedProductsList = tempProducts;
            productsToLog = productsToUpdate.map(u => ({ isNew: u.isNew, productData: u.productData }));
        });
        
        if (updatedProductsList.length > 0) {
            setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
        }
        
        const itemsStr = r.items && r.items.length > 0 ? `${r.items.length} items` : r.equipmentName || 'Unknown items';
        await addLog('Inventory', 'Purchase Entry', `Entry for ${r.supplier} - ${itemsStr}`);
        
        productsToLog.forEach(({ isNew, productData }) => {
            if (isNew) {
                addLog('Inventory', 'Added Product', `Item: ${productData.name}`);
            } else {
                const oldProd = products.find(p => p.id === productData.id);
                addLog('Inventory', 'Updated Product', `Item: ${productData.name}`, oldProd, productData);
            }
        });
        
        if (r.supplier) {
            await updateVendorProcurementVolume(r.supplier);
        }
        await postPurchaseVoucher(r);
    };

    const updatePurchaseRecord = async (id: string, updates: Partial<PurchaseRecord>) => {
        const existing = purchaseRecords.find(r => r.id === id);
        if (!existing) return;
        
        let oldSupplier = existing.supplier;
        let updatedProductsList: Product[] = [];
        
        await runTransaction(db, async (tx) => {
            const currentProducts = [...products];
            
            const getItems = (rec: PurchaseRecord) => {
                const list: { name: string, qty: number, rate: number, unit: string, gstPercent: number }[] = [];
                if (rec.items && rec.items.length > 0) {
                    rec.items.forEach(item => {
                        list.push({
                            name: item.equipmentName || '',
                            qty: Number(item.qty) || 0,
                            rate: Number(item.rate) || 0,
                            unit: item.unit || 'nos',
                            gstPercent: Number(item.gstPercent || (item.cgstPercent || 0) + (item.sgstPercent || 0) + (item.igstPercent || 0) || 0)
                        });
                    });
                } else if (rec.equipmentName) {
                    list.push({
                        name: rec.equipmentName,
                        qty: Number(rec.qty) || 0,
                        rate: Number(rec.rate) || 0,
                        unit: rec.unit || 'nos',
                        gstPercent: Number(rec.gstPercent || (rec.cgstPercent || 0) + (rec.sgstPercent || 0) + (rec.igstPercent || 0) || 0)
                    });
                }
                return list;
            };
            
            const oldItems = getItems(existing);
            const updatedRecord = { ...existing, ...updates } as PurchaseRecord;
            const newItems = getItems(updatedRecord);
            const dateSupply = updatedRecord.dateSupply || new Date().toISOString().split('T')[0];
            
            const oldGrouped: Record<string, { qty: number }> = {};
            oldItems.forEach(item => {
                const name = item.name.trim().toLowerCase();
                if (name) {
                    oldGrouped[name] = { qty: (oldGrouped[name]?.qty || 0) + item.qty };
                }
            });
            
            const newGrouped: Record<string, { qty: number, rate: number, unit: string, gstPercent: number }> = {};
            newItems.forEach(item => {
                const name = item.name.trim().toLowerCase();
                if (name) {
                    newGrouped[name] = {
                        qty: (newGrouped[name]?.qty || 0) + item.qty,
                        rate: item.rate,
                        unit: item.unit,
                        gstPercent: item.gstPercent
                    };
                }
            });
            
            const allProductNames = Array.from(new Set([
                ...Object.keys(oldGrouped),
                ...Object.keys(newGrouped)
            ]));
            
            const productsToUpdate: { ref: any, isNew: boolean, productData: Product }[] = [];
            const stockMovementsToCreate: StockMovement[] = [];
            
            for (const prodName of allProductNames) {
                const masterProduct = currentProducts.find(p => p.name.trim().toLowerCase() === prodName);
                let ref = null;
                let dbProduct: Product | null = null;
                
                if (masterProduct) {
                    ref = doc(db, "products", masterProduct.id);
                    const snap = await tx.get(ref);
                    if (snap.exists()) {
                        dbProduct = snap.data() as Product;
                    }
                }
                
                const oldQty = oldGrouped[prodName]?.qty || 0;
                const newInfo = newGrouped[prodName];
                const newQty = newInfo?.qty || 0;
                
                if (dbProduct && ref) {
                    const newStock = Math.max(0, Number(dbProduct.stock || 0) - oldQty + newQty);
                    const updatedProduct = {
                        ...dbProduct,
                        stock: newStock,
                        purchasePrice: newInfo ? newInfo.rate : dbProduct.purchasePrice,
                        lastRestocked: newInfo ? dateSupply : dbProduct.lastRestocked,
                        supplier: updatedRecord.supplier || dbProduct.supplier
                    };
                    productsToUpdate.push({ ref, isNew: false, productData: updatedProduct });
                    
                    const netChange = newQty - oldQty;
                    if (netChange > 0) {
                        stockMovementsToCreate.push({
                            id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: dbProduct.id,
                            productName: dbProduct.name,
                            type: 'In',
                            quantity: netChange,
                            date: dateSupply,
                            reference: `Purchase #${updatedRecord.invoiceNo || updatedRecord.id}`,
                            purpose: 'Restock'
                        });
                    } else if (netChange < 0) {
                        stockMovementsToCreate.push({
                            id: `MVT-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: dbProduct.id,
                            productName: dbProduct.name,
                            type: 'Out',
                            quantity: Math.abs(netChange),
                            date: dateSupply,
                            reference: `Rev: Purchase #${updatedRecord.invoiceNo || updatedRecord.id}`,
                            purpose: 'Restock'
                        });
                    }
                } else if (newQty > 0 && newInfo) {
                    const newProdId = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    ref = doc(db, "products", newProdId);
                    const newProd: Product = {
                        id: newProdId,
                        name: prodName.toUpperCase(),
                        category: 'Equipment',
                        sku: `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                        stock: newQty,
                        unit: newInfo.unit,
                        purchasePrice: newInfo.rate,
                        sellingPrice: newInfo.rate,
                        minLevel: 5,
                        location: 'Warehouse',
                        supplier: updatedRecord.supplier || '',
                        lastRestocked: dateSupply,
                        taxRate: newInfo.gstPercent,
                        hsn: ''
                    };
                    productsToUpdate.push({ ref, isNew: true, productData: newProd });
                    
                    stockMovementsToCreate.push({
                        id: `MVT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        productId: newProdId,
                        productName: newProd.name,
                        type: 'In',
                        quantity: newQty,
                        date: dateSupply,
                        reference: `Purchase #${updatedRecord.invoiceNo || updatedRecord.id}`,
                        purpose: 'Restock'
                    });
                }
            }
            
            tx.update(doc(db, "purchaseRecords", id), sanitizeData(updates));
            
            productsToUpdate.forEach(({ ref, isNew, productData }) => {
                if (isNew) {
                    tx.set(ref, sanitizeData(productData));
                } else {
                    tx.update(ref, {
                        stock: productData.stock,
                        purchasePrice: productData.purchasePrice,
                        lastRestocked: productData.lastRestocked,
                        supplier: productData.supplier
                    });
                }
            });
            
            stockMovementsToCreate.forEach(m => {
                const docData = { ...m, timestamp: new Date().toISOString() };
                tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
            });
            
            const tempProducts = [...currentProducts];
            productsToUpdate.forEach(({ isNew, productData }) => {
                if (isNew) {
                    tempProducts.push(productData);
                } else {
                    const idx = tempProducts.findIndex(p => p.id === productData.id);
                    if (idx !== -1) {
                        tempProducts[idx] = productData;
                    }
                }
            });
            updatedProductsList = tempProducts;
        });
        
        if (updatedProductsList.length > 0) {
            setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
        }
        
        await addLog('Inventory', 'Updated Purchase Entry', `ID: ${id}`, existing, { ...existing, ...updates });
        
        if (oldSupplier) {
            await updateVendorProcurementVolume(oldSupplier);
        }
        if (updates.supplier && updates.supplier !== oldSupplier) {
            await updateVendorProcurementVolume(updates.supplier);
        }
        
        const purchaseVouchers = vouchers.filter(v => v.referenceId === existing?.id && v.type === 'Purchase' && !v.voucherNumber?.startsWith('REV-'));
        for (const vch of purchaseVouchers) {
            try {
                await reverseVoucher(vch.id, `Auto-reversed: Purchase Record ${existing?.invoiceNo} updated`);
            } catch (err) {}
        }
        await postPurchaseVoucher({ ...existing, ...updates } as PurchaseRecord);
    };

    const removePurchaseRecord = async (id: string) => {
        const existing = purchaseRecords.find(r => r.id === id);
        if (!existing) return;
        
        let supplier = existing.supplier;
        let updatedProductsList: Product[] = [];
        
        await runTransaction(db, async (tx) => {
            const currentProducts = [...products];
            
            const getItems = (rec: PurchaseRecord) => {
                const list: { name: string, qty: number }[] = [];
                if (rec.items && rec.items.length > 0) {
                    rec.items.forEach(item => {
                        list.push({
                            name: item.equipmentName || '',
                            qty: Number(item.qty) || 0
                        });
                    });
                } else if (rec.equipmentName) {
                    list.push({
                        name: rec.equipmentName,
                        qty: Number(rec.qty) || 0
                    });
                }
                return list;
            };
            
            const oldItems = getItems(existing);
            const oldGrouped: Record<string, number> = {};
            oldItems.forEach(item => {
                const name = item.name.trim().toLowerCase();
                if (name) {
                    oldGrouped[name] = (oldGrouped[name] || 0) + item.qty;
                }
            });
            
            const productsToUpdate: { ref: any, newStock: number, productData: Product }[] = [];
            const stockMovementsToCreate: StockMovement[] = [];
            
            for (const [prodName, oldQty] of Object.entries(oldGrouped)) {
                const masterProduct = currentProducts.find(p => p.name.trim().toLowerCase() === prodName);
                if (masterProduct) {
                    const ref = doc(db, "products", masterProduct.id);
                    const snap = await tx.get(ref);
                    if (snap.exists()) {
                        const dbProduct = snap.data() as Product;
                        const newStock = Math.max(0, Number(dbProduct.stock || 0) - oldQty);
                        
                        productsToUpdate.push({ ref, newStock, productData: { ...dbProduct, stock: newStock } });
                        
                        stockMovementsToCreate.push({
                            id: `MVT-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: dbProduct.id,
                            productName: dbProduct.name,
                            type: 'Out',
                            quantity: oldQty,
                            date: new Date().toISOString().split('T')[0],
                            reference: `Rev: Purchase #${existing.invoiceNo || existing.id}`,
                            purpose: 'Restock'
                        });
                    }
                }
            }
            
            tx.delete(doc(db, "purchaseRecords", id));
            
            productsToUpdate.forEach(({ ref, newStock }) => {
                tx.update(ref, { stock: newStock });
            });
            
            stockMovementsToCreate.forEach(m => {
                const docData = { ...m, timestamp: new Date().toISOString() };
                tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
            });
            
            updatedProductsList = currentProducts.map(p => {
                const update = productsToUpdate.find(u => u.productData.id === p.id);
                return update ? update.productData : p;
            });
        });
        
        if (updatedProductsList.length > 0) {
            setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
        }
        
        await addLog('Inventory', 'Removed Purchase Entry', `ID: ${id}`);
        if (supplier) {
            await updateVendorProcurementVolume(supplier);
        }
        
        const purchaseVouchers = vouchers.filter(v => v.referenceId === id && v.type === 'Purchase' && !v.voucherNumber?.startsWith('REV-'));
        for (const vch of purchaseVouchers) {
            try {
                await reverseVoucher(vch.id, `Auto-reversed: Purchase Record removed`);
            } catch (err) {}
        }
    };

    // --- NEW ACCOUNTING METHODS ---

    const addAccountGroup = async (group: AccountGroup) => {
        await setDoc(doc(db, "accountGroups", group.id), sanitizeData(group));
        await addLog('System', 'Accounting Group Created', group.name);
    };

    const removeAccountGroup = async (id: string) => {
        await deleteDoc(doc(db, "accountGroups", id));
        await addLog('System', 'Accounting Group Removed', id);
    };

    const updateAccountGroup = async (id: string, updates: Partial<AccountGroup>) => {
        const existing = accountGroups.find(g => g.id === id);
        await updateDoc(doc(db, "accountGroups", id), sanitizeData(updates));
        await addLog('System', 'Accounting Group Updated', existing?.name || id, existing, { ...existing, ...updates });
    };

    const addLedger = async (l: Ledger) => {
        await setDoc(doc(db, "ledgers", l.id), sanitizeData(l));
        await addLog('System', 'Accounting Ledger Created', l.name);
    };

    const updateLedger = async (id: string, u: Partial<Ledger>) => {
        await updateDoc(doc(db, "ledgers", id), sanitizeData(u));
    };

    const removeLedger = async (id: string) => {
        const l = ledgers.find(x => x.id === id);
        if (l && (l.currentBalance || 0) !== 0) throw new Error('Cannot delete ledger with non-zero balance');
        await deleteDoc(doc(db, "ledgers", id));
        await addLog('System', 'Accounting Ledger Removed', id);
    };

    // Ensure a party (customer/supplier) ledger exists; creates one if missing
    const ensurePartyLedger = async (name: string, groupId: string, contact?: { gstin?: string; email?: string; phone?: string }): Promise<string> => {
        const existing = ledgers.find(l => l.name === name && l.groupId === groupId);
        if (existing) return existing.id;
        const id = `LED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const ledger: Ledger = { id, name, groupId, openingBalance: 0, currentBalance: 0 };
        if (contact?.gstin) ledger.gstin = contact.gstin;
        if (contact?.email) ledger.email = contact.email;
        if (contact?.phone) ledger.phone = contact.phone;
        await addLedger(ledger);
        return id;
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
            if (diff !== 0 && entry.ledgerId && entry.ledgerId.trim() !== '') {
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
                        status: newBalance <= 0 ? 'Completed' : inv.status
                    });
                }
            }
        }

        await addLog('Billing', 'Voucher Generated', `${v.type} - ${v.voucherNumber}`);
    };

    const reverseVoucher = async (id: string, reason: string) => {
        const original = vouchers.find(v => v.id === id);
        if (!original) return;

        // Mark original as cancelled
        const cancelAudit = createAuditEntry('Cancelled', original, { ...original }, reason);
        await updateDoc(doc(db, "vouchers", id), {
            narration: `[CANCELLED] ${original.narration}`,
            editHistory: [cancelAudit, ...(original.editHistory || [])].slice(0, 50)
        });

        // Post a mirror reversal voucher to roll back ledger balances
        const reversalId = `VCH-REV-${Date.now()}`;
        const reversalEntries = original.entries.map(e => ({
            ...e,
            id: `${e.id}-REV`,
            debit: e.credit,
            credit: e.debit
        }));
        const reversalVoucher: AccountingVoucher = {
            id: reversalId,
            voucherNumber: `REV/${original.voucherNumber}`,
            date: new Date().toISOString().split('T')[0],
            type: original.type,
            entries: reversalEntries,
            narration: `Reversal of ${original.voucherNumber} — ${reason}`,
            totalAmount: original.totalAmount,
            settlements: [],
            createdBy: currentUser?.name || 'System'
        };
        await addVoucher(reversalVoucher);
        await addLog('Billing', 'Voucher Reversed', `${original.voucherNumber} — ${reason}`);
    };

    const postToLedger = async (vData: Partial<AccountingVoucher>) => {
        const id = `VCH-${Date.now()}`;
        const vDate = vData.date || new Date().toISOString().split('T')[0];
        const vType = vData.type || 'Journal';

        // FY-aware sequential voucher numbering (Apr-Mar Indian fiscal year)
        const dateObj = new Date(vDate);
        const month = dateObj.getMonth(); // 0=Jan ... 11=Dec
        const year = dateObj.getFullYear();
        const fyStart = month >= 3 ? year : year - 1; // Apr onwards = new FY
        const fyCode = `${String(fyStart).slice(2)}${String(fyStart + 1).slice(2)}`; // e.g. "2425"
        const counterKey = `${vType}_${fyCode}`;

        const prefixMap: Record<string, string> = {
            Journal: 'JV', Contra: 'CON', Payment: 'PV', Receipt: 'RV',
            'Debit Note': 'DN', 'Credit Note': 'CN',
            Sales: 'INV', Purchase: 'PUR'
        };
        const prefix = prefixMap[vType] || 'VCH';

        let voucherNumber = vData.voucherNumber || '';
        if (!voucherNumber) {
            try {
                const counterRef = doc(db, 'settings', 'voucherCounters');
                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(counterRef);
                    const counters = snap.exists() ? snap.data() : {};
                    const next = (counters[counterKey] || 0) + 1;
                    tx.set(counterRef, { ...counters, [counterKey]: next }, { merge: true });
                    voucherNumber = `${prefix}/${fyCode}/${String(next).padStart(4, '0')}`;
                });
            } catch (err) {
                console.warn('Voucher counter transaction failed, using fallback:', err);
                voucherNumber = `${prefix}/${fyCode}/${id.slice(-6)}`;
            }
        }

        // Auto-accounting for Sales / Purchase vouchers
        let entries = (vData.entries || []).map(({ autoGenerated, ...rest }) => rest);
        if (vType === 'Sales' && entries.length === 0) {
            // Auto-debit debtor, credit sales + tax ledgers
            const totalAmount = vData.totalAmount || 0;
            const salesLedger = ledgers.find(l => l.id === 'LDG-SALES');
            const cgstLedger = ledgers.find(l => l.id === 'LDG-CGST-OUT');
            const sgstLedger = ledgers.find(l => l.id === 'LDG-SGST-OUT');
            entries = [
                { id: `${id}-DEBTOR`, ledgerId: '', ledgerName: vData.narration || 'Sundry Debtor', debit: totalAmount, credit: 0 },
                { id: `${id}-SALES`, ledgerId: salesLedger?.id || '', ledgerName: 'Sales Account', debit: 0, credit: totalAmount * 0.82 },
                { id: `${id}-CGST`, ledgerId: cgstLedger?.id || '', ledgerName: 'Output CGST', debit: 0, credit: totalAmount * 0.09 },
                { id: `${id}-SGST`, ledgerId: sgstLedger?.id || '', ledgerName: 'Output SGST', debit: 0, credit: totalAmount * 0.09 },
            ];
        } else if (vType === 'Purchase' && entries.length === 0) {
            const totalAmount = vData.totalAmount || 0;
            entries = [
                { id: `${id}-PUR`, ledgerId: '', ledgerName: 'Purchase Account', debit: totalAmount, credit: 0 },
                { id: `${id}-CREDITOR`, ledgerId: '', ledgerName: vData.narration || 'Sundry Creditor', debit: 0, credit: totalAmount },
            ];
        }

        const voucher: AccountingVoucher = {
            id,
            voucherNumber,
            date: vDate,
            type: vType,
            entries,
            narration: vData.narration || '',
            referenceId: vData.referenceId,
            referenceNumber: vData.referenceNumber,
            totalAmount: vData.totalAmount || 0,
            settlements: vData.settlements || [],
            // BUG-2 FIX: persist all additional fields passed from voucher form
            tdsRate: vData.tdsRate,
            tdsSection: vData.tdsSection,
            chequeNo: vData.chequeNo,
            chequeDate: vData.chequeDate,
            status: vData.status || 'POSTED',
            createdBy: currentUser?.name || 'System',
            createdOn: new Date().toISOString(),
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

    // --- COST CENTRE METHODS ---
    const addCostCentre = async (cc: CostCentre) => {
        await setDoc(doc(db, "costCentres", cc.id), sanitizeData(cc));
        await addLog('System', 'Cost Centre Created', cc.name);
    };
    const updateCostCentre = async (id: string, updates: Partial<CostCentre>) => {
        const existing = costCentres.find(c => c.id === id);
        await updateDoc(doc(db, "costCentres", id), sanitizeData(updates));
        await addLog('System', 'Cost Centre Updated', existing?.name || id, existing, { ...existing, ...updates });
    };
    const removeCostCentre = async (id: string) => {
        await deleteDoc(doc(db, "costCentres", id));
        await addLog('System', 'Cost Centre Removed', id);
    };

    // --- FIXED ASSET METHODS ---
    const addFixedAsset = async (asset: FixedAsset) => {
        await setDoc(doc(db, "fixedAssets", asset.id), sanitizeData(asset));
        await addLog('System', 'Fixed Asset Registered', asset.name);
    };
    const updateFixedAsset = async (id: string, updates: Partial<FixedAsset>) => {
        const existing = fixedAssets.find(a => a.id === id);
        await updateDoc(doc(db, "fixedAssets", id), sanitizeData(updates));
        await addLog('System', 'Fixed Asset Updated', existing?.name || id, existing, { ...existing, ...updates });
    };
    const removeFixedAsset = async (id: string) => {
        await deleteDoc(doc(db, "fixedAssets", id));
        await addLog('System', 'Fixed Asset Removed', id);
    };

    const computeDepreciation = async (assetId: string) => {
        const asset = fixedAssets.find(a => a.id === assetId);
        if (!asset || asset.status === 'Disposed' || asset.status === 'Fully Depreciated') return;

        const purchaseDate = new Date(asset.purchaseDate);
        const now = new Date();
        const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
        if (monthsElapsed <= 0) return;

        const monthsToCompute = Math.min(monthsElapsed, asset.usefulLifeYears * 12);
        const existingEntries = depreciationSchedule.filter(d => d.assetId === assetId);
        const existingMonths = existingEntries.length;

        let accumulatedDep = asset.accumulatedDepreciation || 0;
        let netBookValue = asset.purchaseCost - accumulatedDep;

        for (let m = existingMonths; m < monthsToCompute; m++) {
            let depAmount = 0;
            if (asset.depreciationMethod === 'SLM') {
                depAmount = (asset.purchaseCost - asset.salvageValue) / (asset.usefulLifeYears * 12);
            } else {
                // WDV: 2x straight-line rate on reducing balance
                const wdvRate = (2 / (asset.usefulLifeYears * 12));
                depAmount = netBookValue * wdvRate;
            }

            const entryDate = new Date(purchaseDate);
            entryDate.setMonth(entryDate.getMonth() + m + 1);
            const dateStr = entryDate.toISOString().split('T')[0];

            accumulatedDep += depAmount;
            netBookValue = Math.max(asset.salvageValue, asset.purchaseCost - accumulatedDep);
            if (netBookValue <= asset.salvageValue) {
                depAmount = asset.purchaseCost - asset.salvageValue - (accumulatedDep - depAmount);
                if (depAmount <= 0) break;
                accumulatedDep = asset.purchaseCost - asset.salvageValue;
                netBookValue = asset.salvageValue;
            }

            const scheduleEntry: DepreciationScheduleEntry = {
                id: `DEP-${assetId}-${dateStr}`,
                assetId,
                date: dateStr,
                amount: Math.round(depAmount),
                accumulatedDepreciation: Math.round(accumulatedDep),
                netBookValue: Math.round(netBookValue)
            };

            await setDoc(doc(db, "depreciationSchedule", scheduleEntry.id), sanitizeData(scheduleEntry));
        }

        // Update asset accumulated depreciation
        const lastEntry = depreciationSchedule.filter(d => d.assetId === assetId)
            .sort((a, b) => b.date.localeCompare(a.date))[0];
        const finalAccumulated = lastEntry ? lastEntry.accumulatedDepreciation : accumulatedDep;
        const finalNBV = lastEntry ? lastEntry.netBookValue : (asset.purchaseCost - finalAccumulated);
        const assetStatus: FixedAsset['status'] = finalNBV <= asset.salvageValue ? 'Fully Depreciated' : 'Active';

        await updateDoc(doc(db, "fixedAssets", assetId), sanitizeData({
            accumulatedDepreciation: Math.round(finalAccumulated),
            netBookValue: Math.round(finalNBV),
            status: assetStatus
        }));
    };

    const postDepreciationEntry = async (assetId: string, scheduleEntry: DepreciationScheduleEntry) => {
        const asset = fixedAssets.find(a => a.id === assetId);
        if (!asset) return;

        const voucherId = `VCH-DEP-${Date.now()}`;
        const fyDate = new Date(scheduleEntry.date);
        const fyMonth = fyDate.getMonth();
        const fyYear = fyDate.getFullYear();
        const fyStart = fyMonth >= 3 ? fyYear : fyYear - 1;
        const fyCode = `${String(fyStart).slice(2)}${String(fyStart + 1).slice(2)}`;

        const depVoucher: AccountingVoucher = {
            id: voucherId,
            voucherNumber: `DEP/${fyCode}/${String(depreciationSchedule.filter(d => d.assetId === assetId).length + 1).padStart(4, '0')}`,
            date: scheduleEntry.date,
            type: 'Journal',
            entries: [
                {
                    id: `${voucherId}-DEP`,
                    ledgerId: asset.ledgerId,
                    ledgerName: asset.name,
                    debit: 0,
                    credit: scheduleEntry.amount,
                    narration: `Depreciation for ${asset.name}`
                },
                {
                    id: `${voucherId}-EXP`,
                    ledgerId: 'LED-DEPRECIATION',
                    ledgerName: 'Depreciation Expense',
                    debit: scheduleEntry.amount,
                    credit: 0,
                    narration: `Depreciation for ${asset.name}`
                }
            ],
            narration: `Auto-posted depreciation for ${asset.name} — ${scheduleEntry.date}`,
            totalAmount: scheduleEntry.amount,
            settlements: [],
            createdBy: currentUser?.name || 'System'
        };

        await addVoucher(depVoucher);
        await addLog('System', 'Depreciation Posted', `₹${scheduleEntry.amount} for ${asset.name} on ${scheduleEntry.date}`);
    };

    // --- BANK STATEMENT METHODS ---
    const uploadBankStatement = async (ledgerId: string, entries: BankStatementEntry[]) => {
        for (const entry of entries) {
            await setDoc(doc(db, "bankStatements", entry.id), sanitizeData({ ...entry, ledgerId }));
        }
        await addLog('System', 'Bank Statement Uploaded', `${entries.length} entries for ${ledgerId}`);
    };

    const autoMatchBankEntries = async (ledgerId: string): Promise<number> => {
        const statements = bankStatements.filter(s => (s as any).ledgerId === ledgerId && !s.isMatched);
        const bankVouchers = vouchers.filter(v =>
            (v.entries || []).some(e => e.ledgerId === ledgerId) && !v.bankReconciliationDate
        );

        let matchedCount = 0;

        for (const stmt of statements) {
            // Try exact amount + date proximity match
            const candidates = bankVouchers.filter(v => {
                const entry = v.entries.find(e => e.ledgerId === ledgerId)!;
                const vAmount = (entry.debit || entry.credit || 0);
                if (Math.abs(vAmount - Math.abs(stmt.amount)) > 0.01) return false;

                // Date proximity: within 3 days
                const stmtDate = new Date(stmt.date);
                const vDate = new Date(v.date);
                const diffDays = Math.abs((stmtDate.getTime() - vDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 3;
            });

            if (candidates.length === 1) {
                const match = candidates[0];
                try {
                    await updateDoc(doc(db, "vouchers", match.id), {
                        bankReconciliationDate: new Date().toISOString().split('T')[0]
                    } as any);
                    await updateDoc(doc(db, "bankStatements", stmt.id), {
                        isMatched: true,
                        matchedVoucherId: match.id
                    } as any);
                    matchedCount++;
                } catch (err) {
                    console.warn("Auto-match update failed:", err);
                }
            }
        }

        await addLog('System', 'Auto Bank Reco', `${matchedCount} entries auto-matched for ${ledgerId}`);
        return matchedCount;
    };

    // Post auto-classified voucher drafts approved by the user
    const postAutoVouchers = async (ledgerId: string, approved: AutoVoucherDraft[]): Promise<number> => {
        let posted = 0;
        const today = new Date().toISOString().split('T')[0];
        for (const draft of approved) {
            if (draft.skip) continue;
            const id = `VCH-AUTO-${Date.now()}-${posted}`;
            const dateObj = new Date(draft.date);
            const month = dateObj.getMonth();
            const year = dateObj.getFullYear();
            const fyStart = month >= 3 ? year : year - 1;
            const fyCode = `${String(fyStart).slice(2)}${String(fyStart + 1).slice(2)}`;
            const prefixMap: Record<string, string> = {
                Journal: 'JV', Contra: 'CON', Payment: 'PV', Receipt: 'RV',
                'Debit Note': 'DN', 'Credit Note': 'CN', Sales: 'INV', Purchase: 'PUR'
            };
            const prefix = prefixMap[draft.voucherType] || 'JV';
            let voucherNumber = `${prefix}/${fyCode}/${id.slice(-6)}`;
            try {
                const counterKey = `${draft.voucherType}_${fyCode}`;
                const counterRef = doc(db, 'settings', 'voucherCounters');
                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(counterRef);
                    const counters = snap.exists() ? snap.data() : {};
                    const next = (counters[counterKey] || 0) + 1;
                    tx.set(counterRef, { ...counters, [counterKey]: next }, { merge: true });
                    voucherNumber = `${prefix}/${fyCode}/${String(next).padStart(4, '0')}`;
                });
            } catch { /* fallback number already set */ }

            const voucher: AccountingVoucher = {
                id,
                voucherNumber,
                date: draft.date,
                type: draft.voucherType,
                entries: [
                    {
                        id: `${id}-DR`,
                        ledgerId: draft.drLedgerId,
                        ledgerName: draft.drLedgerName,
                        debit: draft.amount,
                        credit: 0,
                        narration: draft.narration,
                        autoGenerated: true
                    },
                    {
                        id: `${id}-CR`,
                        ledgerId: draft.crLedgerId,
                        ledgerName: draft.crLedgerName,
                        debit: 0,
                        credit: draft.amount,
                        narration: draft.narration,
                        autoGenerated: true
                    }
                ],
                narration: draft.narration,
                totalAmount: draft.amount,
                settlements: [],
                createdBy: currentUser?.name || 'System'
            };
            await addVoucher(voucher);
            // Mark the bank statement entry as matched
            try {
                await updateDoc(doc(db, 'bankStatements', draft.statementEntryId), {
                    isMatched: true,
                    matchedVoucherId: id
                } as any);
            } catch { /* entry may not exist yet */ }
            posted++;
        }
        await addLog('Accounting', 'Auto-Post Bank Statement', `${posted} vouchers posted from bank statement for ledger ${ledgerId} on ${today}`);
        return posted;
    };

    const addVendor = async (v: Vendor) => { 
        setVendors(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "vendors", v.id), sanitizeData(v)); 
        await addLog('System', 'Added Vendor', v.name); 
        try {
            await ensurePartyLedger(v.name, 'GRP-CREDITORS');
        } catch (err) { console.warn('Ledger auto-create failed for vendor:', err); }
    };
    const updateVendor = async (id: string, v: Partial<Vendor>) => {
        const existing = vendors.find(ven => ven.id === id);
        if (existing) setVendors(prev => prev.map(ven => ven.id === id ? { ...ven, ...v } as Vendor : ven).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "vendors", id), sanitizeData(v));
        await addLog('System', 'Updated Vendor', existing?.name || id, existing, { ...existing, ...v });
        
        if (v.name && existing && v.name !== existing.name) {
            try {
                const ldg = ledgers.find(l => l.name === existing.name && l.groupId === 'GRP-CREDITORS');
                if (ldg) await updateLedger(ldg.id, { name: v.name });
            } catch (err) { console.warn('Ledger name update failed:', err); }
        }
    };
    const removeVendor = async (id: string) => { 
        setVendors(prev => prev.filter(v => v.id !== id));
        await deleteDoc(doc(db, "vendors", id)); 
        await addLog('System', 'Removed Vendor', id); 
    };
    const postSalesVoucher = async (i: Invoice) => {
        try {
            const total = i.grandTotal || 0;
            if (total <= 0) return;
            const debtorId = await ensurePartyLedger(i.customerName, 'GRP-DEBTORS', { gstin: i.customerGstin, email: i.email, phone: i.phone });
            const salesLdg = ledgers.find(l => l.id === 'LDG-SALES');
            const cgstLdg = ledgers.find(l => l.id === 'LDG-CGST-OUT');
            const sgstLdg = ledgers.find(l => l.id === 'LDG-SGST-OUT');
            const igstLdg = ledgers.find(l => l.name === 'Output IGST'); // Assuming IGST ledger might exist or need creation
            let roundOffLdg = ledgers.find(l => l.name === 'Round Off');
            if (!roundOffLdg) {
                // Auto-create round off ledger
                const roId = 'LED-ROUNDOFF';
                roundOffLdg = { id: roId, name: 'Round Off', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 };
                try { await addLedger(roundOffLdg); } catch (e) {}
            }

            if (!salesLdg) console.warn('LDG-SALES ledger not found');

            let taxableAmt = 0, cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
            if (i.items && i.items.length > 0) {
                i.items.forEach(it => {
                    const qty = Number(it.quantity) || 0;
                    const rate = Number(it.rate) || 0;
                    const amt = qty * rate;
                    taxableAmt += amt;
                    cgstAmt += amt * ((Number(it.cgstPercent) || 0) / 100);
                    sgstAmt += amt * ((Number(it.sgstPercent) || 0) / 100);
                    igstAmt += amt * ((Number(it.igstPercent) || 0) / 100);
                });
            } else {
                taxableAmt = Math.round(total * 0.82 * 100) / 100;
                cgstAmt = Math.round(total * 0.09 * 100) / 100;
                sgstAmt = Math.round(total * 0.09 * 100) / 100;
            }

            const entries: any[] = [
                { id: `${i.id}-DEBTOR`, ledgerId: debtorId, ledgerName: i.customerName, debit: total, credit: 0 },
                { id: `${i.id}-SALES`, ledgerId: salesLdg?.id || '', ledgerName: 'Sales Account', debit: 0, credit: taxableAmt }
            ];

            if (cgstAmt > 0) entries.push({ id: `${i.id}-CGST`, ledgerId: cgstLdg?.id || '', ledgerName: 'Output CGST', debit: 0, credit: cgstAmt });
            if (sgstAmt > 0) entries.push({ id: `${i.id}-SGST`, ledgerId: sgstLdg?.id || '', ledgerName: 'Output SGST', debit: 0, credit: sgstAmt });
            if (igstAmt > 0) entries.push({ id: `${i.id}-IGST`, ledgerId: igstLdg?.id || '', ledgerName: 'Output IGST', debit: 0, credit: igstAmt });

            if (i.isRoundOff && i.roundOffAmount) {
                const roAmt = Number(i.roundOffAmount);
                if (roAmt > 0) {
                    entries.push({ id: `${i.id}-RO-CR`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: 0, credit: roAmt });
                } else if (roAmt < 0) {
                    entries.push({ id: `${i.id}-RO-DR`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: Math.abs(roAmt), credit: 0 });
                }
            }

            await postToLedger({
                date: i.date,
                type: 'Sales',
                entries,
                totalAmount: total,
                narration: `Auto: Invoice ${i.invoiceNumber} — ${i.customerName}`,
                referenceId: i.id,
                referenceNumber: i.invoiceNumber
            });
            await addLog('Accounting', 'Auto Sales Entry', `Invoice ${i.invoiceNumber} → Sales voucher posted`);
        } catch (err) {
            console.warn('Auto-accounting failed for invoice:', err);
        }
    };

    const postPurchaseVoucher = async (r: PurchaseRecord) => {
        try {
            const total = r.total || 0;
            if (total <= 0 || !r.supplier) return;
            const creditorId = await ensurePartyLedger(r.supplier, 'GRP-CREDITORS');
            const purchaseLdg = ledgers.find(l => l.id === 'LDG-PURCHASE');
            let cgstLdg = ledgers.find(l => l.name === 'Input CGST');
            let sgstLdg = ledgers.find(l => l.name === 'Input SGST');
            let igstLdg = ledgers.find(l => l.name === 'Input IGST');
            let roundOffLdg = ledgers.find(l => l.name === 'Round Off');

            if (!purchaseLdg) console.warn('LDG-PURCHASE ledger not found');

            let taxableAmt = 0, cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
            if (r.items && r.items.length > 0) {
                r.items.forEach(it => {
                    const qty = Number(it.qty) || 0;
                    const rate = Number(it.rate) || 0;
                    const amt = qty * rate;
                    taxableAmt += amt;
                    cgstAmt += amt * ((Number(it.cgstPercent) || 0) / 100);
                    sgstAmt += amt * ((Number(it.sgstPercent) || 0) / 100);
                    igstAmt += amt * ((Number(it.igstPercent) || 0) / 100);
                });
            } else {
                taxableAmt = total;
            }

            const entries: any[] = [
                { id: `${r.id}-CREDITOR`, ledgerId: creditorId, ledgerName: r.supplier, debit: 0, credit: total },
                { id: `${r.id}-PUR`, ledgerId: purchaseLdg?.id || '', ledgerName: 'Purchase Account', debit: taxableAmt, credit: 0 }
            ];

            if (cgstAmt > 0 && cgstLdg) entries.push({ id: `${r.id}-CGST`, ledgerId: cgstLdg.id, ledgerName: 'Input CGST', debit: cgstAmt, credit: 0 });
            if (sgstAmt > 0 && sgstLdg) entries.push({ id: `${r.id}-SGST`, ledgerId: sgstLdg.id, ledgerName: 'Input SGST', debit: sgstAmt, credit: 0 });
            if (igstAmt > 0 && igstLdg) entries.push({ id: `${r.id}-IGST`, ledgerId: igstLdg.id, ledgerName: 'Input IGST', debit: igstAmt, credit: 0 });

            const roValue = r.roundOffAmount ?? r.roundOff;
            if (r.isRoundOff && roValue) {
                const roAmt = Number(roValue);
                if (roAmt > 0) {
                    entries.push({ id: `${r.id}-RO-DR`, ledgerId: roundOffLdg?.id || '', ledgerName: 'Round Off', debit: roAmt, credit: 0 });
                } else if (roAmt < 0) {
                    entries.push({ id: `${r.id}-RO-CR`, ledgerId: roundOffLdg?.id || '', ledgerName: 'Round Off', debit: 0, credit: Math.abs(roAmt) });
                }
            }

            await postToLedger({
                date: r.dateSupply || new Date().toISOString().split('T')[0],
                type: 'Purchase',
                entries,
                totalAmount: total,
                narration: `Auto: Purchase from ${r.supplier} — ${r.invoiceNo}`,
                referenceId: r.id,
                referenceNumber: r.invoiceNo || ''
            });
            await addLog('Accounting', 'Auto Purchase Entry', `Purchase ${r.id} → Purchase voucher posted`);
        } catch (err) {
            console.warn('Auto-accounting failed for purchase:', err);
        }
    };


    const checkAndAddInvoiceIncentive = async (inv: Invoice) => {
        if (!inv.incentivePercentage || inv.incentivePercentage <= 0 || !inv.closedBy) return;
        if (inv.status === 'Draft' || inv.status === 'Cancelled') return;

        const alreadyAwarded = pointHistory.some(p => p.category === 'Sales' && p.description.includes(`(${inv.id})`));
        if (alreadyAwarded) return;

        const incentiveAmount = Math.round((inv.grandTotal || 0) * (inv.incentivePercentage / 100));
        if (incentiveAmount > 0) {
            const matchedEmp = employees.find(e => e.id === inv.closedBy || e.name.trim().toLowerCase() === inv.closedBy.trim().toLowerCase());
            const empId = matchedEmp ? matchedEmp.id : inv.closedBy;
            const empName = matchedEmp ? matchedEmp.name : inv.closedBy;
            await addPoints(
                incentiveAmount,
                'Sales',
                `Sales Incentive for Invoice ${inv.invoiceNumber} (${inv.id}) — closed by ${empName}`,
                empId
            );
            addNotification(
                '💰 Incentive Awarded',
                `${incentiveAmount} points added to ${empName} for Invoice ${inv.invoiceNumber}.`,
                'success'
            );
        }
    };

    const addInvoice = async (i: Invoice) => { 
        const isInventoryAffecting = (i.documentType || 'Invoice') === 'Invoice' && i.status !== 'Draft' && i.status !== 'Cancelled';
        
        if (isInventoryAffecting) {
            let updatedProductsList: Product[] = [];
            let productsToLog: Product[] = [];
            let stockMovementsToCreate: StockMovement[] = [];
            
            await runTransaction(db, async (tx) => {
                const currentProducts = [...products];
                
                // Group new items
                const newGrouped: Record<string, number> = {};
                (i.items || []).forEach(item => {
                    const name = (item.description || '').toUpperCase();
                    if (name) {
                        newGrouped[name] = (newGrouped[name] || 0) + (Number(item.quantity) || 0);
                    }
                });
                
                const insufficientItems: any[] = [];
                const productsToUpdate: { ref: any, newStock: number, productData: Product }[] = [];
                
                for (const [prodName, newQty] of Object.entries(newGrouped)) {
                    const masterProduct = currentProducts.find(p => p.name.toUpperCase() === prodName);
                    let dbProduct: Product | null = null;
                    let ref = null;
                    if (masterProduct) {
                        ref = doc(db, "products", masterProduct.id);
                        const snap = await tx.get(ref);
                        if (snap.exists()) {
                            dbProduct = snap.data() as Product;
                        }
                    }
                    
                    const dbStock = dbProduct ? Number(dbProduct.stock || 0) : 0;
                    const availableStock = dbStock; // New invoice, so oldQty is 0
                    
                    if (newQty > availableStock) {
                        insufficientItems.push({
                            name: prodName,
                            requested: newQty,
                            available: availableStock
                        });
                    } else if (ref && dbProduct) {
                        const newStock = dbStock - newQty;
                        productsToUpdate.push({
                            ref,
                            newStock,
                            productData: { ...dbProduct, stock: newStock }
                        });
                        
                        stockMovementsToCreate.push({
                            id: `MVT-INV-OUT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            productId: dbProduct.id,
                            productName: dbProduct.name,
                            type: 'Out',
                            quantity: newQty,
                            date: i.date || new Date().toISOString().split('T')[0],
                            reference: `Invoice #${i.invoiceNumber || i.id}`,
                            purpose: 'Sale'
                        });
                    } else {
                        insufficientItems.push({
                            name: prodName,
                            requested: newQty,
                            available: 0
                        });
                    }
                }
                
                if (insufficientItems.length > 0) {
                    throw new Error(JSON.stringify({ type: 'INSUFFICIENT_STOCK', items: insufficientItems }));
                }
                
                // Write Invoice
                tx.set(doc(db, "invoices", i.id), sanitizeData(i));
                
                // Update product stocks
                productsToUpdate.forEach(({ ref, newStock }) => {
                    tx.update(ref, { stock: newStock });
                });
                
                // Write stock movements
                stockMovementsToCreate.forEach(m => {
                    const docData = { ...m, timestamp: new Date().toISOString() };
                    tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
                });
                
                productsToLog = productsToUpdate.map(u => u.productData);
                updatedProductsList = currentProducts.map(p => {
                    const update = productsToUpdate.find(u => u.productData.id === p.id);
                    return update ? update.productData : p;
                });
            });
            
            if (updatedProductsList.length > 0) {
                setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
            }
            
            await addLog('Billing', 'Invoice Generated', i.invoiceNumber);
            productsToLog.forEach(productData => {
                const qty = newGrouped[productData.name.toUpperCase()];
                addLog('Inventory', 'Invoice Deduction', `Subtracted ${qty} units of ${productData.name} due to invoice sale`);
            });
        } else {
            // Non-inventory affecting (Draft, Quotation, ServiceOrder, etc.)
            await setDoc(doc(db, "invoices", i.id), sanitizeData(i)); 
            await addLog('Billing', 'Invoice Generated', i.invoiceNumber); 
        }

        await checkAndAddInvoiceIncentive(i);

        if (i.status !== 'Draft' && i.status !== 'Cancelled' && i.documentType !== 'Quotation') {
            const type = i.documentType === 'SupplierPO' ? 'expense' : 'revenue';
            await updateMonthlySummary(i.date, i.grandTotal || 0, type);
            if (currentUser) {
                await updateUserSummary(currentUser.id, currentUser.name, i.grandTotal || 0);
            }
        }

        if (i.documentType === 'Invoice' && i.status !== 'Draft' && i.status !== 'Cancelled') {
            await postSalesVoucher(i);
        }
    };
    const removeInvoice = async (id: string) => {
        const existing = invoices.find(i => i.id === id);
        if (!existing) return;

        const wasInventoryAffecting = existing.documentType === 'Invoice' && existing.status !== 'Draft' && existing.status !== 'Cancelled';
        
        if (wasInventoryAffecting) {
            let updatedProductsList: Product[] = [];
            let stockMovementsToCreate: StockMovement[] = [];
            
            await runTransaction(db, async (tx) => {
                const currentProducts = [...products];
                const oldGrouped: Record<string, number> = {};
                existing.items.forEach(item => {
                    const name = (item.description || '').toUpperCase();
                    if (name) {
                        oldGrouped[name] = (oldGrouped[name] || 0) + (Number(item.quantity) || 0);
                    }
                });
                
                const productsToUpdate: { ref: any, newStock: number, productData: Product }[] = [];
                
                for (const [prodName, oldQty] of Object.entries(oldGrouped)) {
                    const masterProduct = currentProducts.find(p => p.name.toUpperCase() === prodName);
                    if (masterProduct) {
                        const ref = doc(db, "products", masterProduct.id);
                        const snap = await tx.get(ref);
                        if (snap.exists()) {
                            const dbProduct = snap.data() as Product;
                            const dbStock = Number(dbProduct.stock || 0);
                            const newStock = dbStock + oldQty;
                            
                            productsToUpdate.push({
                                ref,
                                newStock,
                                productData: { ...dbProduct, stock: newStock }
                            });
                            
                            stockMovementsToCreate.push({
                                id: `MVT-INV-REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                                productId: dbProduct.id,
                                productName: dbProduct.name,
                                type: 'In',
                                quantity: oldQty,
                                date: new Date().toISOString().split('T')[0],
                                reference: `Rev/Del: Invoice #${existing.invoiceNumber || existing.id}`,
                                purpose: 'Restock'
                            });
                        }
                    }
                }
                
                tx.delete(doc(db, "invoices", id));
                
                productsToUpdate.forEach(({ ref, newStock }) => {
                    tx.update(ref, { stock: newStock });
                });
                
                stockMovementsToCreate.forEach(m => {
                    const docData = { ...m, timestamp: new Date().toISOString() };
                    tx.set(doc(db, "stockMovements", m.id), sanitizeData(docData));
                });
                
                updatedProductsList = currentProducts.map(p => {
                    const update = productsToUpdate.find(u => u.productData.id === p.id);
                    return update ? update.productData : p;
                });
            });
            
            if (updatedProductsList.length > 0) {
                setProducts(updatedProductsList.sort((a, b) => a.name.localeCompare(b.name)));
            }
        } else {
            await deleteDoc(doc(db, "invoices", id));
        }
        
        await addLog('Billing', 'Removed Invoice/Quotation', existing.invoiceNumber || id);

        if (existing.status !== 'Draft' && existing.status !== 'Cancelled' && existing.documentType !== 'Quotation') {
            const type = existing.documentType === 'SupplierPO' ? 'expense' : 'revenue';
            await updateMonthlySummary(existing.date, -(existing.grandTotal || 0), type);
            if (currentUser) {
                await updateUserSummary(currentUser.id, currentUser.name, -(existing.grandTotal || 0));
            }
        }
    };
    const fetchAuditLogs = async (isLoadMore: boolean = false) => {
        try {
            // Auto-cleanup process (Deletes logs older than 5 months)
            if (!isLoadMore) {
                const fiveMonthsAgo = new Date();
                fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
                const cutoffDateStr = fiveMonthsAgo.toISOString().split('T')[0];
                
                try {
                    const oldLogsQuery = query(collection(db, "system_audit"), where(documentId(), "<", cutoffDateStr));
                    const snapshot = await getDocs(oldLogsQuery);
                    snapshot.forEach(d => {
                        deleteDoc(doc(db, "system_audit", d.id)).catch(console.error);
                    });
                } catch (e) {
                    console.error("Failed to cleanup old logs", e);
                }
            }

            let entries: LogEntry[] = [];
            let startDateStr = new Date().toISOString().split('T')[0];
            
            if (isLoadMore && lastLogDoc && typeof lastLogDoc === 'string') {
                const dateObj = new Date(lastLogDoc);
                dateObj.setDate(dateObj.getDate() - 1);
                startDateStr = dateObj.toISOString().split('T')[0];
            } else if (!isLoadMore) {
                // If not loading more, we'll start fresh from today.
            }

            let currentDateObj = new Date(startDateStr);
            
            // Fetch backwards up to 14 days to find logs to minimize read count per batch.
            for (let i = 0; i < 14; i++) {
                const date = currentDateObj.toISOString().split('T')[0];
                const daySnap = await getDoc(doc(db, "system_audit", date));
                if (daySnap.exists()) {
                    const dayEntries = daySnap.data().entries as LogEntry[];
                    entries = [...entries, ...dayEntries];
                }
                
                // Keep moving date backwards for the next potential iteration or for setting lastLogDoc
                currentDateObj.setDate(currentDateObj.getDate() - 1);
                
                // Break early if we've accumulated at least 50 logs to show in this page load
                if (entries.length >= 50) {
                    break;
                }
            }
            
            entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            
            // Use lastLogDoc to store the last searched date as a string cursor.
            const nextCursorStr = currentDateObj.toISOString().split('T')[0];
            setLastLogDoc(nextCursorStr);
            
            if (currentDateObj.getFullYear() < 2024) {
                setHasMoreLogs(false);
            } else {
                setHasMoreLogs(true);
            }
            
            if (isLoadMore) {
                setLogs(prev => {
                    const combined = [...prev, ...entries];
                    const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
                    return unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                });
            } else {
                setLogs(entries);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        }
    };

    const updatePrizePool = async (a: number) => {
        const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com';
        if (!isSystemAdmin) {
            throw new Error("Access Denied: Only SYSTEM_ADMIN can update the prize pool.");
        }
        setPrizePool(a);
        await setDoc(doc(db, "settings", "system"), { prizePool: a }, { merge: true });
        await addLog('System', 'Updated Prize Pool', `New: ${a}`);
    };
    const updateFinancialYear = async (fy: string) => {
        setFinancialYear(fy);
        await setDoc(doc(db, "settings", "system"), { financialYear: fy }, { merge: true });
        await addLog('System', 'Updated Fiscal Period', `New Period: ${fy}`);
    };

    const addBankDetails = async (details: BankDetails) => {
        const updated = [...bankDetailsList, details];
        setBankDetailsList(updated);
        await setDoc(doc(db, "settings", "system"), { bankDetails: updated }, { merge: true });
        await addLog('System', 'Added Bank Details', details.bankName);
    };

    const updateBankDetails = async (id: string, p: Partial<BankDetails>) => {
        const updated = bankDetailsList.map(b => b.id === id ? { ...b, ...p } : b);
        setBankDetailsList(updated);
        await setDoc(doc(db, "settings", "system"), { bankDetails: updated }, { merge: true });
        await addLog('System', 'Updated Bank Details', id);
    };

    const removeBankDetails = async (id: string) => {
        const updated = bankDetailsList.filter(b => b.id !== id);
        setBankDetailsList(updated);
        await setDoc(doc(db, "settings", "system"), { bankDetails: updated }, { merge: true });
        await addLog('System', 'Removed Bank Details', id);
    };

    const addBankRule = async (rule: BankRule) => {
        const updated = [...bankRules, rule];
        setBankRules(updated);
        await setDoc(doc(db, "settings", "system"), { bankRules: updated }, { merge: true });
        await addLog('System', 'Added Bank Rule', rule.ruleLabel);
    };

    const updateBankRule = async (id: string, p: Partial<BankRule>) => {
        const updated = bankRules.map(b => b.id === id ? { ...b, ...p } : b);
        setBankRules(updated);
        await setDoc(doc(db, "settings", "system"), { bankRules: updated }, { merge: true });
        await addLog('System', 'Updated Bank Rule', id);
    };

    const removeBankRule = async (id: string) => {
        const updated = bankRules.filter(b => b.id !== id);
        setBankRules(updated);
        await setDoc(doc(db, "settings", "system"), { bankRules: updated }, { merge: true });
        await addLog('System', 'Removed Bank Rule', id);
    };

    const addCompanyProfile = async (profile: CompanyProfile) => {
        const updated = [...companyProfiles, profile];
        setCompanyProfiles(updated);
        await setDoc(doc(db, "settings", "system"), { companyProfiles: updated }, { merge: true });
        await addLog('System', 'Added Company Profile', profile.companyName);
    };

    const updateCompanyProfile = async (id: string, p: Partial<CompanyProfile>) => {
        const updated = companyProfiles.map(prof => prof.id === id ? { ...prof, ...p } : prof);
        setCompanyProfiles(updated);
        await setDoc(doc(db, "settings", "system"), { companyProfiles: updated }, { merge: true });
        await addLog('System', 'Updated Company Profile', id);
    };

    const removeCompanyProfile = async (id: string) => {
        const updated = companyProfiles.filter(prof => prof.id !== id);
        setCompanyProfiles(updated);
        await setDoc(doc(db, "settings", "system"), { companyProfiles: updated }, { merge: true });
        await addLog('System', 'Removed Company Profile', id);
    };

    // 6.4 — Reconcile all ledger balances from voucher sum
    const reconcileLedgerBalances = async (): Promise<number> => {
        let fixed = 0;
        for (const ledger of ledgers) {
            let balance = ledger.openingBalance || 0;
            const grp = accountGroups.find(g => g.id === ledger.groupId);
            const isDebitNormal = grp?.type === 'Asset' || grp?.type === 'Expense';
            for (const v of vouchers) {
                for (const e of v.entries) {
                    if (e.ledgerId !== ledger.id) continue;
                    balance += isDebitNormal ? (e.debit - e.credit) : (e.credit - e.debit);
                }
            }
            const roundedBalance = Math.round(balance * 100) / 100;
            if (Math.abs(roundedBalance - (ledger.currentBalance || 0)) > 0.5) {
                await updateDoc(doc(db, 'ledgers', ledger.id), sanitizeData({ currentBalance: roundedBalance }));
                fixed++;
            }
        }
        await addLog('Accounting', 'Ledger Reconciliation', `Reconciled ${ledgers.length} ledgers, fixed ${fixed}`);
        return fixed;
    };

    return (
        <DataContext.Provider value={{
            clients, vendors, products, invoices, stockMovements, expenses, employees, notifications, tasks, purchaseRecords, stockBatches, addStockBatch, updateStockBatch, leads, serviceTickets,
            pendingQuoteData, setPendingQuoteData,
            pendingInvoiceData, setPendingInvoiceData,
            pendingServiceReportData, setPendingServiceReportData,
            pendingChallanData, setPendingChallanData,
            pendingSupplierPOData, setPendingSupplierPOData,
            activeTab, setActiveTab,
            showAlert, showConfirm, showPrompt, previewPDF,
            currentUser, isAuthenticated, login, loginWithGoogle, logout, seedDatabase,
            addClient, updateClient, removeClient, addVendor, updateVendor, removeVendor,
            addProduct, updateProduct, removeProduct, addLead, updateLead, removeLead, addServiceTicket, updateServiceTicket,
            serviceTasks, addServiceTask, updateServiceTask,
            addInvoice, updateInvoice, removeInvoice, recordStockMovement, addExpense, updateExpense, removeExpense, updateExpenseStatus,
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
            searchRecords, fetchMoreData, financialYear, updateFinancialYear, bankDetailsList, addBankDetails, updateBankDetails, removeBankDetails,
            bankRules, addBankRule, updateBankRule, removeBankRule,
            companyProfiles, addCompanyProfile, updateCompanyProfile, removeCompanyProfile,
            addPurchaseRecord, updatePurchaseRecord, removePurchaseRecord,
            ledgers, accountGroups, vouchers, stockTransfers, expenseStats,
            costCentres, fixedAssets, depreciationSchedule, bankStatements,
            addLedger, updateLedger, removeLedger, addAccountGroup, removeAccountGroup, updateAccountGroup, addVoucher, updateVoucher, reverseVoucher, postToLedger, addStockTransfer, reconcileLedgerBalances,
            addCostCentre, updateCostCentre, removeCostCentre,
            addFixedAsset, updateFixedAsset, removeFixedAsset, computeDepreciation, postDepreciationEntry,
            uploadBankStatement, autoMatchBankEntries, postAutoVouchers,
            isSystemAdmin
        }}>
            {children}
            
            {/* Custom Dialog Overlay */}
            {dialogConfig && dialogConfig.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-100">
 <h3 className="text-xl font-bold tracking-tight text-teal-400 mb-2">{dialogConfig.title}</h3>
                        <p className="text-slate-300 text-sm mb-6 whitespace-pre-wrap">{dialogConfig.message}</p>
                        
                        {dialogConfig.type === 'prompt' && (
                            <input
                                key={dialogConfig.message + '_' + (dialogConfig.defaultValue || '')}
                                id="custom-dialog-input"
                                type="text"
                                defaultValue={dialogConfig.defaultValue}
                                className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] px-4 py-3 text-slate-100 focus:outline-none focus:border-teal-500 mb-6 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        dialogConfig.resolve((e.target as HTMLInputElement).value);
                                    }
                                }}
                            />
                        )}
                        
                        <div className="flex justify-end gap-3">
                            {dialogConfig.type !== 'alert' && (
                                <button
                                    onClick={() => dialogConfig.resolve(null)}
                                    className="px-5 py-2.5 rounded-[2rem] text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (dialogConfig.type === 'prompt') {
                                        const input = document.getElementById('custom-dialog-input') as HTMLInputElement;
                                        dialogConfig.resolve(input ? input.value : '');
                                    } else {
                                        dialogConfig.resolve(true);
                                    }
                                }}
                                className="px-5 py-2.5 rounded-[2rem] bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 text-sm font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                            >
                                {dialogConfig.type === 'alert' ? 'OK' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-6 py-4 rounded-t-2xl w-full max-w-5xl mx-auto mt-4">
 <h3 className="text-lg font-bold tracking-tight text-teal-400 truncate">{pdfPreviewUrl.filename}</h3>
                        <div className="flex gap-3">
                            <a
                                href={pdfPreviewUrl.url}
                                download={pdfPreviewUrl.filename}
                                className="px-4 py-2 rounded-[2rem] bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-teal-300 text-sm font-medium transition-all"
                            >
                                Download PDF
                            </a>
                            <button
                                onClick={() => {
                                    URL.revokeObjectURL(pdfPreviewUrl.url);
                                    setPdfPreviewUrl(null);
                                }}
                                className="px-4 py-2 rounded-[2rem] bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 text-sm font-medium transition-all border border-rose-900/30"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-900 rounded-b-2xl overflow-hidden w-full max-w-5xl mx-auto mb-4 p-2">
                        <iframe
                            src={pdfPreviewUrl.url}
                            className="w-full h-full border-none rounded-[2rem] bg-white"
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
};
