import React, { useEffect, useReducer } from 'react';
import JSZip from 'jszip';
import { db } from './firebase';
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore';
import { PDFService } from './services/PDFService';
import {
  LayoutDashboard, Users, FileText, Package, Wrench,
  Receipt, ShoppingCart, Wallet, Search,
  Menu, LogOut, Clock, CheckSquare, Truck, Contact, Trophy, ShieldCheck, ShoppingBag, ClipboardList, ShieldAlert, CheckCircle2, Activity, Building2, User, AlertCircle, XCircle, Zap, Target, Edit2, CheckCircle, Lock, Settings, QrCode
} from 'lucide-react';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './components/Dashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { LeadsModule } from './components/LeadsModule';
import { InventoryModule } from './components/InventoryModule';
import { AttendanceModule } from './components/AttendanceModule';
import { HRModule } from './components/HRModule';
import { TaskModule } from './components/TaskModule';
import { ProfileModule } from './components/ProfileModule';
import { BillingModule } from './components/BillingModule';
import { QuotationModule } from './components/QuotationModule';
import { PurchaseOrderModule } from './components/PurchaseOrderModule';
import { SupplierPOModule } from './components/SupplierPOModule';
import { ServiceOrderModule } from './components/ServiceOrderModule';
import { ServiceReportModule } from './components/ServiceReportModule';
import { InstallationReportModule } from './components/InstallationReportModule';
import { DeliveryChallanModule } from './components/DeliveryChallanModule';
import { PurchaseRecordModule } from './components/PurchaseRecordModule';
import { ReportsModule } from './components/ReportsModule';
import { ClientModule } from './components/ClientModule';
import { VendorModule } from './components/VendorModule';
import { ExpenseModule } from './components/ExpenseModule';
import { PerformanceModule } from './components/PerformanceModule';
import { LogsModule } from './components/LogsModule';
import { CatalogModule } from './components/CatalogModule';
import { PayrollModule } from './components/PayrollModule';
import { ArchiveModule } from './components/ArchiveModule';
import { AccountingModule } from './components/AccountingModule';
import { ComplianceModule } from './components/ComplianceModule';
import { ServiceTaskModule } from './components/ServiceTaskModule';
import { BarcodeCreatorModule } from './components/BarcodeCreatorModule';
import { PublicServiceForm } from './components/PublicServiceForm';
import { WinnerPopup } from './components/WinnerPopup';
import { Login } from './components/Login';
import { SystemConfigModule } from './components/SystemConfigModule';
import { TabView, Invoice, ServiceReport, DeliveryChallan, Lead, ExpenseRecord, PurchaseRecord } from './types';
import { useData } from './components/DataContext';

const NavItem: React.FC<{
  tab: TabView;
  icon: any;
  label: string;
  activeTab: TabView;
  isSidebarOpen: boolean;
  onSelect: (tab: TabView) => void;
}> = ({ tab, icon: Icon, label, activeTab, isSidebarOpen, onSelect }) => {
  const isActive = activeTab === tab;
  return (
    <button type="button"
      onClick={() => onSelect(tab)}
      title={!isSidebarOpen ? label : undefined}
      className={`group w-full flex items-center transition-all relative mb-1 ${isActive
        ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20'
        : 'text-emerald-50/50 hover:text-white hover:bg-white/5'
        } ${isSidebarOpen ? 'px-3 py-2 md:py-2.5 rounded-xl md:rounded-2xl gap-2.5 md:gap-3' : 'justify-center p-2 rounded-xl w-12 h-12 mx-auto'}`}
    >
      <Icon size={isSidebarOpen ? 16 : 20} className={`shrink-0 transition-all ${isActive ? 'scale-110 !stroke-white' : 'group-hover:scale-110 stroke-[url(#gold-grad)] group-hover:!stroke-white'}`} />
      {isSidebarOpen && <span className="truncate flex-1 text-left font-playfair font-bold tracking-wide text-xs md:text-sm">{label}</span>}
    </button>
  );
};

const SectionHeading = ({ children, isSidebarOpen }: { children?: React.ReactNode; isSidebarOpen: boolean }) => {
  if (!isSidebarOpen) return <div className="h-px bg-white/5 my-4 mx-4" />;
  return (
    <div className="px-4 mb-2 mt-4 text-[9px] font-playfair font-bold text-emerald-100/20 uppercase tracking-[0.15em] flex items-center gap-2">
      <span className="shrink-0">{children}</span>
      <div className="h-[1px] bg-white/5 flex-1"></div>
    </div>
  );
};

const formatIndianNumber = (num: number) => {
    const n = num || 0;
    if (n >= 10000000) {
        return (n / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
    }
    if (n >= 100000) {
        return (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
    }
    if (n >= 1000) {
        return (n / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
    }
    return n.toLocaleString('en-IN');
};

const HeaderStatCard = ({ label, value, icon: Icon, colorClass, subText }: { label: string, value: string, icon: any, colorClass: string, subText?: string }) => (
    <div className={`flex shrink-0 items-center gap-2 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm transition-all hover:border-${colorClass.split('-')[1]}-200 group`}>
        <div className={`p-1 rounded-lg ${colorClass} text-white group-hover:scale-110 transition-transform`}>
            <Icon size={12} />
        </div>
        <div>
            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 leading-none mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-tight leading-none">{value}</span>
                {subText && <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none">{subText}</span>}
            </div>
        </div>
    </div>
);


type AppUIState = {
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  taskReadOnlyUnlocked: boolean;
  isEditingPrize: boolean;
  tempPrize: string;
};

type AppUIAction =
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_COMMAND_PALETTE_OPEN'; payload: boolean }
  | { type: 'SET_TASK_READONLY_UNLOCKED'; payload: boolean }
  | { type: 'SET_EDITING_PRIZE'; payload: boolean }
  | { type: 'SET_TEMP_PRIZE'; payload: string };

const uiReducer = (state: AppUIState, action: AppUIAction): AppUIState => {
  switch (action.type) {
    case 'SET_SIDEBAR_OPEN': return { ...state, isSidebarOpen: action.payload };
    case 'TOGGLE_SIDEBAR': return { ...state, isSidebarOpen: !state.isSidebarOpen };
    case 'SET_COMMAND_PALETTE_OPEN': return { ...state, isCommandPaletteOpen: action.payload };
    case 'SET_TASK_READONLY_UNLOCKED': return { ...state, taskReadOnlyUnlocked: action.payload };
    case 'SET_EDITING_PRIZE': return { ...state, isEditingPrize: action.payload };
    case 'SET_TEMP_PRIZE': return { ...state, tempPrize: action.payload };
    default: return state;
  }
};


const AppContent: React.FC<{
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  hasAccess: (tab: TabView) => boolean;
  isCheckedInToday: boolean;
  userRole: 'Admin' | 'Employee';
  tabRole: 'Admin' | 'Employee';
  taskReadOnlyUnlocked: boolean;
  setTaskReadOnlyUnlocked: (val: boolean) => void;
  currentUserName: string;
  tasks: any[];
  financialYear: string;
  updateFinancialYear: (val: string) => void;
  handleFullBackup: () => void;
  handleMigratePermissions: () => void;
  isSuperAdmin: boolean;
  currentUser: any;
}> = (props) => {
  const {
    activeTab, setActiveTab, hasAccess, isCheckedInToday, userRole, tabRole,
    taskReadOnlyUnlocked, setTaskReadOnlyUnlocked, currentUserName, tasks,
    financialYear, updateFinancialYear, handleFullBackup, handleMigratePermissions,
    isSuperAdmin, currentUser
  } = props;
  
  const { showAlert, showConfirm, showPrompt } = useData();

      const render = () => {
    if (!hasAccess(activeTab)) return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-4">
          <ShieldCheck size={40} />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Module Locked</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-[280px] text-center">Contact HR for access.</p>
        <button type="button" onClick={() => setActiveTab(TabView.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-sm font-bold">Go to Dashboard</button>
      </div>
    );

    // GATING: Lock tasks and dashboard if not checked in (except for Admin)
    const isTaskOrDashboard = activeTab === TabView.TASKS || activeTab === TabView.DASHBOARD;
    const isTaskReadOnlyBypass = activeTab === TabView.TASKS && taskReadOnlyUnlocked;
    if (isTaskOrDashboard && !isCheckedInToday && userRole !== 'Admin' && !isTaskReadOnlyBypass) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-500 mb-6 animate-pulse border-4 border-amber-200">
                    <Lock size={48} />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Day Not Started</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm max-w-[320px] text-center font-medium">Tasks are synchronized only after a successful check-in. Please log your attendance to continue.</p>
                <div className="flex gap-4 mt-8">
                    <button type="button" onClick={() => setActiveTab(TabView.ATTENDANCE)} className="px-8 py-3 bg-medical-600 hover:bg-medical-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-medical-500/20 transition-all active:scale-95">Go to Check-In</button>
                    {activeTab === TabView.TASKS && (
                        <button type="button" onClick={() => setTaskReadOnlyUnlocked(true)} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-700 shadow-lg transition-all active:scale-95">View Tasks (Read-Only)</button>
                    )}
                </div>
            </div>
        );
    }

    switch (activeTab) {
      case TabView.DASHBOARD:
        return tabRole === 'Admin' ? <Dashboard /> : <EmployeeDashboard currentUser={currentUserName} tasks={tasks} />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.QUOTES: return <QuotationModule />;
      case TabView.PO_BUILDER: return <PurchaseOrderModule />;
      case TabView.SUPPLIER_PO: return <SupplierPOModule />;
      case TabView.SERVICE_ORDERS: return <ServiceOrderModule />;
      case TabView.SERVICE_REPORTS: return <ServiceReportModule />;
      case TabView.INSTALLATION_REPORTS: return <InstallationReportModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} userRole={tabRole} />;
      case TabView.TASKS: return <TaskModule userRole={tabRole} readOnly={taskReadOnlyUnlocked && !isCheckedInToday && userRole !== 'Admin'} />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={userRole} setUserRole={() => { }} currentUser={currentUserName} />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.VENDORS: return <VendorModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.PURCHASE_REGISTER: return <PurchaseRecordModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.LOGS: return <LogsModule />;
      case TabView.EXPENSES: return <ExpenseModule userRole={tabRole} currentUser={currentUserName} />;
      case TabView.PERFORMANCE: return <PerformanceModule />;
      case TabView.SERVICE_TASK: return <ServiceTaskModule userRole={tabRole} />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      case TabView.CATALOG: return <CatalogModule />;
      case TabView.BARCODE_CREATOR: return <BarcodeCreatorModule />;
      case TabView.PAYROLL: return <PayrollModule />;
      case TabView.ARCHIVE: return <ArchiveModule />;
      case TabView.ACCOUNTING: return <AccountingModule userRole={tabRole} onClose={() => setActiveTab(TabView.DASHBOARD)} />;
      case TabView.COMPLIANCE: return <ComplianceModule userRole={tabRole} />;
      case TabView.CONFIG: return (
        <SystemConfigModule
          financialYear={financialYear}
          updateFinancialYear={updateFinancialYear}
          handleFullBackup={handleFullBackup}
          handleMigratePermissions={handleMigratePermissions}
          isSuperAdmin={isSuperAdmin}
          userRole={tabRole}
          currentUser={currentUser}
          showAlert={showAlert}
          showConfirm={showConfirm}
          showPrompt={showPrompt}
          setActiveTab={setActiveTab}
        />
      );
      default: return tabRole === 'Admin' ? <Dashboard /> : <EmployeeDashboard currentUser={currentUserName} tasks={tasks} />;
    }
  };

  return render();
};


const AppSidebar: React.FC<{
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  setIsCommandPaletteOpen: (val: boolean) => void;
  sidebarSections: any[];
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  hasAccess: (tab: TabView) => boolean;
  handleSignOut: (e: any) => void;
}> = ({ isSidebarOpen, setIsSidebarOpen, setIsCommandPaletteOpen, sidebarSections, activeTab, setActiveTab, hasAccess, handleSignOut }) => {
  return (
    <aside className={`print:hidden bg-[#01261d] text-slate-100 flex flex-col z-[70] transition-all duration-300 border-r border-white/5 
            ${isSidebarOpen
              ? 'w-64 translate-x-0'
              : 'w-20 -translate-x-full lg:translate-x-0'} 
            fixed lg:relative h-full shadow-2xl`}>
            
            <svg width="0" height="0" className="absolute pointer-events-none">
              <defs>
                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop stopColor="#b8944f" offset="0%" />
                  <stop stopColor="#d0ad74" offset="100%" />
                </linearGradient>
              </defs>
            </svg>
    
            {/* Branding Header */}
            <div className={`p-4 md:p-5 flex items-center shrink-0 bg-black/10 pt-[max(env(safe-area-inset-top,24px),24px)] md:pt-[max(env(safe-area-inset-top,20px),20px)] min-h-[4.5rem] ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
              {isSidebarOpen ? (
                <div className="flex flex-col animate-in fade-in slide-in-from-left-4">
                  <span className="flex items-center gap-2">
                    <img src="/images/sreemeditec-logo.png" alt="Logo" className="h-6 md:h-7 w-auto object-contain" />
                    <span className="font-playfair font-black text-white text-xl md:text-2xl tracking-tight leading-none">Sreemeditec</span>
                  </span>
                  <span className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-[0.3em] ml-0.5 mt-1">Enterprise</span>
                </div>
              ) : null}
              <button type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-xl md:rounded-2xl text-white transition-all transform active:scale-90"><Menu size={24} /></button>
            </div>
    
            {/* Global Ctrl+K Search Pill */}
            <div className="px-4 mb-2 shrink-0">
              <button type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className={`w-full flex items-center justify-between bg-black/20 hover:bg-black/35 text-emerald-50/55 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all ${
                  isSidebarOpen ? 'px-3.5 py-2' : 'p-2 justify-center'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="shrink-0 text-emerald-400" />
                  {isSidebarOpen && <span className="text-xs font-semibold">Search...</span>}
                </div>
                {isSidebarOpen && (
                  <span className="text-[9px] font-black opacity-40 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">⌘K</span>
                )}
              </button>
            </div>
    
            {/* Scrollable Navigation Area */}
            <div className={`flex-1 overflow-y-auto py-4 custom-scrollbar ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
              {sidebarSections.map((section, idx) => {
                const accessibleItems = section.items.filter(item => hasAccess(item.tab));
                if (accessibleItems.length === 0) return null;
                return (
                  <React.Fragment key={idx}>
                    <SectionHeading isSidebarOpen={isSidebarOpen}>{section.title}</SectionHeading>
                    {accessibleItems.map((item, itemIdx) => (
                      <NavItem
                        key={itemIdx}
                        tab={item.tab}
                        icon={item.icon}
                        label={item.label}
                        activeTab={activeTab}
                        isSidebarOpen={isSidebarOpen}
                        onSelect={(t) => {
                          setActiveTab(t);
                          if (window.innerWidth < 1024) setIsSidebarOpen(false);
                        }}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
    
            {/* Session Controls */}
            <div className={`p-4 pb-safe border-t border-white/5 shrink-0 bg-black/10 relative z-[100] ${!isSidebarOpen && 'flex flex-col items-center'}`}>
              <button
                onClick={handleSignOut}
                type="button"
                className={`group w-full flex items-center transition-all cursor-pointer pointer-events-auto relative active:scale-95 ${isSidebarOpen ? 'px-4 py-3 rounded-[1.25rem] gap-4 bg-rose-500/10 hover:bg-gradient-to-r hover:from-rose-500/20 hover:to-rose-600/10 border border-rose-500/20 hover:border-rose-500/40 shadow-[0_0_20px_-10px_rgba(244,63,94,0.2)] hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.4)]' : 'justify-center p-3 rounded-[1.25rem] w-14 h-14 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20'}`}
              >
                <div className={`flex items-center justify-center bg-rose-500/20 text-rose-400 group-hover:text-rose-200 group-hover:bg-rose-500/40 transition-colors shadow-inner shadow-rose-950/50 ${isSidebarOpen ? 'w-10 h-10 rounded-xl' : 'w-full h-full rounded-[1rem]'}`}>
                  <LogOut size={isSidebarOpen ? 16 : 20} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0 pointer-events-none text-left">
                    <span className="block truncate font-black tracking-[0.2em] text-[8px] uppercase text-rose-300/60 leading-none mb-1">Session Control</span>
                    <span className="block truncate font-bold tracking-tight text-rose-100 group-hover:text-white text-sm">Secure Sign Out</span>
                  </div>
                )}
              </button>
            </div>
          </aside>
  );
};

export const App: React.FC = () => {
    const { 
        isAuthenticated, currentUser, logout, tasks, products, expenses, prizePool, updatePrizePool, 
        userStats, attendanceRecords, invoices, financialYear, updateFinancialYear,
        clients, vendors, leads, serviceReports, deliveryChallans, purchaseRecords, holidays, installationReports,
        addNotification, expenseStats, updateEmployee, activeTab, setActiveTab,
        showAlert, showConfirm, showPrompt
    } = useData();

    const [uiState, dispatchUI] = useReducer(uiReducer, {
        isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
        isCommandPaletteOpen: false,
        taskReadOnlyUnlocked: false,
        isEditingPrize: false,
        tempPrize: prizePool.toString()
    });
    const { isSidebarOpen, isCommandPaletteOpen, taskReadOnlyUnlocked, isEditingPrize, tempPrize } = uiState;

    // Setters bound to dispatch
    const setIsSidebarOpen = (val: boolean) => dispatchUI({ type: 'SET_SIDEBAR_OPEN', payload: val });
    const setIsCommandPaletteOpen = (val: boolean) => dispatchUI({ type: 'SET_COMMAND_PALETTE_OPEN', payload: val });
    const setTaskReadOnlyUnlocked = (val: boolean) => dispatchUI({ type: 'SET_TASK_READONLY_UNLOCKED', payload: val });
    const setIsEditingPrize = (val: boolean) => dispatchUI({ type: 'SET_EDITING_PRIZE', payload: val });
    const setTempPrize = (val: string) => dispatchUI({ type: 'SET_TEMP_PRIZE', payload: val });

    // Anti-Gravity Safety Effect: Auto-normalize currentUser permissions if they arrive as Array
    useEffect(() => {
        if (currentUser && Array.isArray(currentUser.permissions)) {
            console.warn("Legacy Permission Array detected for user:", currentUser.name, ". Normalizing...");
            const normalized = currentUser.permissions.reduce((acc: any, tab: string) => ({ ...acc, [tab]: 'Employee' }), {});
            updateEmployee(currentUser.id, { permissions: normalized });
        }
    }, [currentUser?.permissions, currentUser?.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isSuperAdmin = currentUser?.email?.toLowerCase() === 'sreekumar.career@gmail.com';

    const handleMigratePermissions = async () => {
      if (!isSuperAdmin) return;
      const confirmed = await showConfirm("CRITICAL: This will migrate ALL employees to the new granular permission structure. This is required to resolve legacy Array issues. Continue?");
      if (!confirmed) return;
      
      try {
        const q = query(collection(db, "employees"));
        const snap = await getDocs(q);
        let count = 0;
        
        for (const d of snap.docs) {
          const data = d.data();
          if (Array.isArray(data.permissions)) {
            const normalized = data.permissions.reduce((acc: any, tab: string) => ({ ...acc, [tab]: 'Employee' }), {});
            await updateDoc(doc(db, "employees", d.id), { permissions: normalized });
            count++;
          }
        }
        await showAlert(`Security Maintenance Complete: ${count} employees normalized to Record structure.`, "Migration Success");
      } catch (err) {
        console.error("Migration failed:", err);
        await showAlert("Maintenance Error: System was unable to write to the employee registry. Check Firestore rules.", "Migration Error");
      }
    };

    const handleFullBackup = async () => {
        const zip = new JSZip();
        
        // 1. Create Master Snapshot
        const fullSnapshot = {
            timestamp: new Date().toISOString(),
            version: "3.0.0",
            financialYear,
            data: {
                clients, vendors, products, invoices, expenses, tasks, leads,
                attendance: attendanceRecords, serviceReports, deliveryChallans,
                purchaseRecords, holidays, installationReports
            }
        };
        zip.file("MASTER_SNAPSHOT.json", JSON.stringify(fullSnapshot, null, 2));

        // 2. Organized Folders for Doc Makers
        const folders = {
            invoices: zip.folder("1_INVOICES"),
            quotes: zip.folder("2_QUOTATIONS"),
            customerPOs: zip.folder("3_CUSTOMER_POS"),
            supplierPOs: zip.folder("4_SUPPLIER_POS"),
            serviceOrders: zip.folder("5_SERVICE_ORDERS"),
            serviceReports: zip.folder("6_SERVICE_REPORTS"),
            installReports: zip.folder("07_INSTALLATION_REPORTS"),
            challans: zip.folder("08_DELIVERY_CHALLANS"),
            purchaseEntries: zip.folder("09_PURCHASE_ENTRY"),
            leads: zip.folder("10_LEADS"),
            inventory: zip.folder("11_INVENTORY"),
            expenses: zip.folder("12_EXPENSES"),
            crm: zip.folder("13_CRM"),
            hr: zip.folder("14_HR")
        };

        // 3. Fetch ALL Data from Firestore (Not just limited local state)
        addNotification('Backup Started', 'Fetching full database records...', 'info');
        
        try {
            const allInvoices = (await getDocs(collection(db, "invoices"))).docs.map(d => ({ ...d.data(), id: d.id } as Invoice));
            const allServiceReports = (await getDocs(collection(db, "serviceReports"))).docs.map(d => ({ ...d.data(), id: d.id } as ServiceReport));
            const allChallans = (await getDocs(collection(db, "deliveryChallans"))).docs.map(d => ({ ...d.data(), id: d.id } as DeliveryChallan));
            const allInstallReports = (await getDocs(collection(db, "installationReports"))).docs.map(d => ({ ...d.data(), id: d.id } as any));
            const allLeads = (await getDocs(collection(db, "leads"))).docs.map(d => ({ ...d.data(), id: d.id } as Lead));
            const allExpenses = (await getDocs(collection(db, "expenses"))).docs.map(d => ({ ...d.data(), id: d.id } as ExpenseRecord));
            const allPurchases = (await getDocs(collection(db, "purchaseRecords"))).docs.map(d => ({ ...d.data(), id: d.id } as PurchaseRecord));
            
            // 3.1 Fetch Archive Collections
            const archivedDocs = (await getDocs(collection(db, "archives"))).docs.map(d => ({ ...d.data(), id: d.id }));
            const archiveCSV = (await getDocs(collection(db, "archived_reports"))).docs.map(d => ({ ...d.data(), id: d.id }));

            // Merge archived docs into main arrays for processing
            archivedDocs.forEach((d: any) => {
                if (d.originalCollection === 'invoices') allInvoices.push(d);
                else if (d.originalCollection === 'serviceReports') allServiceReports.push(d);
                else if (d.originalCollection === 'deliveryChallans') allChallans.push(d);
                else if (d.originalCollection === 'installationReports') allInstallReports.push(d);
                else if (d.originalCollection === 'leads') allLeads.push(d);
                else if (d.originalCollection === 'expenses') allExpenses.push(d);
                else if (d.originalCollection === 'purchaseRecords') allPurchases.push(d);
            });

            // Save Archive CSVs to CRM/Compliance folder
            archiveCSV.forEach((rep: any) => {
                const fileName = `${rep.id}.csv`;
                folders.crm?.file(`Financial_Archives/${fileName}`, rep.csvContent || '');
            });

            // Populate Invoices & Docs (PDF FORMAT)
            for (const doc of allInvoices) {
                try {
                    // Smart Type Detection (Corrects mislabeled 'PO' tags from BillingModule bug)
                    let type: string = doc.documentType || 'Invoice';
                    const invNum = (doc.invoiceNumber || '').toUpperCase();
                    if (invNum.startsWith('SM/')) type = 'Invoice';
                    else if (invNum.startsWith('SMQ/')) type = 'Quotation';
                    else if (invNum.startsWith('SMCPO/')) type = 'CustomerPO';
                    else if (invNum.startsWith('SMSPO/')) type = 'SupplierPO';

                    const fileName = `${(doc.invoiceNumber || doc.id).replace(/\//g, '_')}.pdf`;
                    let pdfBlob;
                    
                    if (type === 'Invoice') pdfBlob = await PDFService.generateInvoicePDF(doc);
                    else if (type === 'Quotation') pdfBlob = await PDFService.generateInvoicePDF(doc, true);
                    else if (type === 'CustomerPO' || type === 'PO') pdfBlob = await PDFService.generatePurchaseOrderPDF(doc, true);
                    else if (type === 'SupplierPO') pdfBlob = await PDFService.generatePurchaseOrderPDF(doc, false);
                    
                    if (pdfBlob) {
                        switch(type) {
                            case 'Invoice': folders.invoices?.file(fileName, pdfBlob); break;
                            case 'Quotation': folders.quotes?.file(fileName, pdfBlob); break;
                            case 'CustomerPO': 
                            case 'PO': folders.customerPOs?.file(fileName, pdfBlob); break;
                            case 'SupplierPO': folders.supplierPOs?.file(fileName, pdfBlob); break;
                        }
                    }
                } catch (err) {
                    console.error("Failed PDF for:", doc.id, err);
                }
            }

            // Service Reports
            for (const r of allServiceReports) {
                try {
                    const pdfBlob = await PDFService.generateServiceReportPDF(r);
                    folders.serviceReports?.file(`${(r.reportNumber || r.id).replace(/\//g, '_')}.pdf`, pdfBlob);
                } catch (err) {}
            }

            // Delivery Challans
            for (const c of allChallans) {
                try {
                    const pdfBlob = await PDFService.generateDeliveryChallanPDF(c);
                    folders.challans?.file(`${(c.challanNumber || c.id).replace(/\//g, '_')}.pdf`, pdfBlob);
                } catch (err) {}
            }

            // Installation Reports
            for (const r of allInstallReports) {
                try {
                    const pdfBlob = await PDFService.generateInstallationReportPDF(r);
                    folders.installReports?.file(`${(r.smirNo || r.id).replace(/\//g, '_')}.pdf`, pdfBlob);
                } catch (err) {}
            }


            // Populate JSON Backups (RAW DATA)
            allInvoices.forEach(doc => {
                let type: string = doc.documentType || 'Invoice';
                const invNum = (doc.invoiceNumber || '').toUpperCase();
                if (invNum.startsWith('SM/')) type = 'Invoice';
                else if (invNum.startsWith('SMQ/')) type = 'Quotation';

                const fileName = `${(doc.invoiceNumber || doc.id).replace(/\//g, '_')}.json`;
                if (type === 'Invoice') folders.invoices?.file(`JSON/${fileName}`, JSON.stringify(doc, null, 2));
                else if (type === 'Quotation') folders.quotes?.file(`JSON/${fileName}`, JSON.stringify(doc, null, 2));
                else if (type === 'CustomerPO' || type === 'PO') folders.customerPOs?.file(`JSON/${fileName}`, JSON.stringify(doc, null, 2));
                else if (type === 'SupplierPO') folders.supplierPOs?.file(`JSON/${fileName}`, JSON.stringify(doc, null, 2));
            });

            allServiceReports.forEach(r => folders.serviceReports?.file(`JSON/${(r.reportNumber || r.id).replace(/\//g, '_')}.json`, JSON.stringify(r, null, 2)));
            allChallans.forEach(c => folders.challans?.file(`JSON/${(c.challanNumber || c.id).replace(/\//g, '_')}.json`, JSON.stringify(c, null, 2)));
            allInstallReports.forEach(r => folders.installReports?.file(`JSON/${(r.smirNo || r.id).replace(/\//g, '_')}.json`, JSON.stringify(r, null, 2)));
            
            allLeads.forEach(l => folders.leads?.file(`${l.hospital || l.name}.json`, JSON.stringify(l, null, 2)));
            allExpenses.forEach(e => folders.expenses?.file(`${e.date}_${e.id}.json`, JSON.stringify(e, null, 2)));
            allPurchases.forEach(p => folders.purchaseEntries?.file(`${p.invoiceNo || p.id}.json`, JSON.stringify(p, null, 2)));

            // Master Records
            clients.forEach(c => folders.crm?.file(`Clients/${c.name}.json`, JSON.stringify(c, null, 2)));
            vendors.forEach(v => folders.crm?.file(`Vendors/${v.name}.json`, JSON.stringify(v, null, 2)));
            products.forEach(p => folders.inventory?.file(`${p.name}.json`, JSON.stringify(p, null, 2)));
            attendanceRecords.forEach(a => folders.hr?.file(`Attendance/${a.date}_${a.userName}.json`, JSON.stringify(a, null, 2)));

        } catch (err) {
            console.error("Full fetch failed:", err);
            addNotification('Backup Failed', 'Could not reach cloud database.', 'alert');
        }

        
        // Generate and Download
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SREE_MEDITEC_VAULT_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


  // PUBLIC FORM: If ?form=service param is present, show public service request form
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  if (searchParams.get('form') === 'service') {
    return <PublicServiceForm />;
  }

  // AUTH GUARD: If not logged in, show Login screen
  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  // ─── RBAC: System-level role (immutable, always based on account role) ───────
  // NEVER derived from per-tab permissions — prevents privilege escalation
  const isSystemAdmin = isSuperAdmin || currentUser.role === 'SYSTEM_ADMIN';

  // userRole: governs Dashboard routing, check-in gates, and system-level guards
  const userRole: 'Admin' | 'Employee' = isSystemAdmin ? 'Admin' : 'Employee';

  // tabRole: governs per-module feature access (e.g., Expense admin sees ALL employees' records)
  // SYSTEM_ADMIN and Super Admin are always unrestricted Admins.
  // Explicit per-tab setting governs access for SYSTEM_STAFF.
  const tabRole: 'Admin' | 'Employee' = (() => {
    if (isSuperAdmin || currentUser.role === 'SYSTEM_ADMIN') return 'Admin'; // Admins are always unrestricted
    const explicit = currentUser.permissions?.[activeTab] as 'Admin' | 'Employee' | undefined;
    if (explicit) return explicit; // Respect Access Grid setting (Admin OR Employee)
    return 'Employee'; // Fallback for staff
  })();

  const currentUserName = currentUser.name;

  const hasAccess = (tab: TabView) => {
    if (isSuperAdmin) return true;
    // SYSTEM_ADMIN always has full sidebar access
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    if (tab === TabView.DASHBOARD || tab === TabView.PROFILE) return true;
    return !!(currentUser.permissions?.[tab]);
  };

  const sidebarSections = [
    {
      title: 'Main Modules',
      items: [
        { tab: TabView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
        { tab: TabView.LEADS, icon: Users, label: 'Lead CRM' },
        { tab: TabView.CLIENTS, icon: Contact, label: 'Client Database' },
        { tab: TabView.VENDORS, icon: Truck, label: 'Vendor Database' },
        { tab: TabView.INVENTORY, icon: Package, label: 'Inventory' },
        { tab: TabView.BARCODE_CREATOR, icon: QrCode, label: 'Barcode Creator' },
        { tab: TabView.CATALOG, icon: ShoppingBag, label: 'Product Catalog' },
      ]
    },
    {
      title: 'Doc Maker',
      items: [
        { tab: TabView.BILLING, icon: Receipt, label: 'Invoice Maker' },
        { tab: TabView.QUOTES, icon: FileText, label: 'Quotation Maker' },
        { tab: TabView.PO_BUILDER, icon: ShoppingCart, label: 'Customer PO Maker' },
        { tab: TabView.SUPPLIER_PO, icon: ShoppingBag, label: 'Supplier PO Maker' },
        { tab: TabView.SERVICE_ORDERS, icon: Wrench, label: 'Service Order Maker' },
        { tab: TabView.SERVICE_REPORTS, icon: ClipboardList, label: 'Service Report Maker' },
        { tab: TabView.INSTALLATION_REPORTS, icon: ShieldAlert, label: 'Install Report Maker' },
        { tab: TabView.DELIVERY, icon: Truck, label: 'Delivery Challan' },
        { tab: TabView.PURCHASE_REGISTER, icon: ShoppingCart, label: 'Purchase Entry' },
      ]
    },
    {
      title: 'Workspace',
      items: [
        { tab: TabView.TASKS, icon: CheckSquare, label: 'Task Manager' },
        { tab: TabView.ATTENDANCE, icon: Clock, label: 'Check-in/Out' },
        { tab: TabView.PAYROLL, icon: Receipt, label: 'Payroll portal' },
        { tab: TabView.EXPENSES, icon: Receipt, label: 'Vouchers' },
        { tab: TabView.PERFORMANCE, icon: Trophy, label: 'Leaderboard' },
        { tab: TabView.SERVICE_TASK, icon: QrCode, label: 'Service Task' },
      ]
    },
    {
      title: 'Control',
      items: [
        { tab: TabView.HR, icon: ShieldCheck, label: 'Staff Management' },
        { tab: TabView.REPORTS, icon: ClipboardList, label: 'Reports Centre' },
        { tab: TabView.ARCHIVE, icon: FileText, label: 'Finance Archive' },
        { tab: TabView.ACCOUNTING, icon: Wallet, label: 'Accounts (TallyPrime)' },
        { tab: TabView.COMPLIANCE, icon: ShieldCheck, label: 'Compliance Terminal' },
        { tab: TabView.CONFIG, icon: Settings, label: 'System Config' },
      ]
    }
  ];



    const todayStr = new Date().toISOString().split('T')[0];
    const isCheckedInToday = attendanceRecords.some(r => r.userId === currentUser?.id && r.date === todayStr && (r.status === 'CheckedIn' || r.status === 'Completed'));




  /* Notifications icons removed */

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    setActiveTab(TabView.DASHBOARD);
  };

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-slate-950 overflow-hidden relative">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      <AppSidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsCommandPaletteOpen={setIsCommandPaletteOpen}
        sidebarSections={sidebarSections}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasAccess={hasAccess}
        handleSignOut={handleSignOut}
      />

      <main className={`flex-1 flex flex-col min-w-0 h-full relative bg-[#F3F0E8] ${activeTab === TabView.ACCOUNTING ? 'overflow-hidden' : ''}`}>
        <header className={`print:hidden bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent border-b border-slate-200 dark:border-slate-800 lg:border-none px-3 md:px-5 py-2 md:py-3 lg:p-0 flex items-center shrink-0 z-50 sticky lg:absolute top-0 lg:top-5 lg:right-5 lg:w-auto shadow-sm lg:shadow-none pointer-events-auto lg:pointer-events-none transition-colors duration-300 pt-[max(env(safe-area-inset-top,32px),32px)] md:pt-[max(env(safe-area-inset-top,16px),16px)] lg:pt-0 min-h-[4rem] md:min-h-[4.5rem] lg:min-h-0 ${activeTab === TabView.ACCOUNTING ? 'hidden' : ''}`}>
          <div className="w-12 lg:hidden">
            {!isSidebarOpen && <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all"><Menu size={22} /></button>}
          </div>
          <div className="flex flex-col items-start text-left min-w-0 px-1 sm:px-2 shrink-0 max-w-[100px] sm:max-w-none lg:hidden">
            <h2 className="text-sm sm:text-base md:text-[20px] font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-tight truncate w-full">
              {activeTab.replace(/_/g, ' ')}
            </h2>
            <div className="hidden sm:flex items-center gap-1.5 md:mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
              <span className="text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">Live Workspace</span>
            </div>
          </div>
          
          {activeTab === TabView.BILLING && tabRole === 'Admin' && (
            <div className="flex sm:hidden items-center gap-2 mx-2 sm:mx-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto custom-scrollbar flex-1 min-w-0">
               {(() => {
                 const outstanding = invoices
                    .filter(i => (i.invoiceNumber || '').startsWith('SM/') && i.status !== 'Cancelled')
                    .reduce((sum, i) => sum + ((i.grandTotal || 0) - (i.paidAmount || 0)), 0);
                 
                 return (
                   <HeaderStatCard 
                      label="Pending Balance" 
                      value={`₹${formatIndianNumber(outstanding)}`} 
                      icon={Wallet} 
                      colorClass="bg-rose-500"
                      subText="Outstanding"
                   />
                 );
                })()}
            </div>
          )}

          {activeTab === TabView.INVENTORY && (
            <div className="flex items-center sm:justify-end gap-2 mx-2 sm:mx-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto custom-scrollbar flex-1 min-w-0">
               {/* Valuation Calculations */}
               {(() => {
                 const equipmentCostAll = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.purchasePrice || 0)), 0);
                 const assetValuationAll = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.sellingPrice || 0)), 0);
                 const consumableValue = products.filter(p => p.category === 'Consumable').reduce((acc, p) => acc + ((p.stock || 0) * (p.purchasePrice || 0)), 0);
                 
                 return (
                   <>
                     <HeaderStatCard 
                        label="Asset Value" 
                        value={`₹${formatIndianNumber(assetValuationAll)}`} 
                        icon={Activity} 
                        colorClass="bg-emerald-500"
                        subText="(Market)"
                     />
                     <HeaderStatCard 
                        label="Investment" 
                        value={`₹${formatIndianNumber(equipmentCostAll)}`} 
                        icon={Building2} 
                        colorClass="bg-indigo-500"
                        subText="(Purchase)"
                     />
                     <HeaderStatCard 
                        label="Consumables" 
                        value={`₹${formatIndianNumber(consumableValue)}`} 
                        icon={Package} 
                        colorClass="bg-purple-500"
                        subText="(Current)"
                     />
                   </>
                 );
               })()}
            </div>
          )}

          {activeTab === TabView.ATTENDANCE && currentUser && (
            <div className="flex sm:hidden items-center gap-2 mx-2 sm:mx-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto custom-scrollbar flex-1 min-w-0">
               {(() => {
                 const workMode = (currentUser.department === 'Service' || currentUser.department === 'Sales' || currentUser.department === 'Support') ? 'Field' : (currentUser.department === 'Remote' ? 'Remote' : 'Office');
                 const goal = workMode === 'Field' ? 'Complete Tasks' : '7 Hours Work';
                 
                 return (
                   <>
                     <HeaderStatCard 
                        label="Authenticated" 
                        value={currentUser.name} 
                        icon={User} 
                        colorClass="bg-indigo-500"
                        subText={`(${currentUser.role})`}
                     />
                     <HeaderStatCard 
                        label="Work Mode" 
                        value={`${workMode} Profile`} 
                        icon={ShieldCheck} 
                        colorClass="bg-medical-600"
                        subText="Live"
                     />
                     <HeaderStatCard 
                        label="Shift Goal" 
                        value={goal} 
                        icon={AlertCircle} 
                        colorClass="bg-amber-500"
                        subText="Target"
                     />
                   </>
                 );
               })()}
            </div>
          )}

          {activeTab === TabView.EXPENSES && userRole === 'Admin' && (
            <div className="flex sm:hidden items-center gap-2 mx-2 sm:mx-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto custom-scrollbar flex-1 min-w-0">
               {(() => {
                 return (
                   <>
                     <HeaderStatCard 
                        label="Approved" 
                        value={`₹${formatIndianNumber(expenseStats?.approved || 0)}`} 
                        icon={CheckCircle2} 
                        colorClass="bg-emerald-500"
                        subText="Cleared"
                     />
                     <HeaderStatCard 
                        label="Pending" 
                        value={`₹${formatIndianNumber(expenseStats?.pending || 0)}`} 
                        icon={Clock} 
                        colorClass="bg-amber-500"
                        subText="Awaiting"
                     />
                     <HeaderStatCard 
                        label="Rejected" 
                        value={`₹${formatIndianNumber(expenseStats?.rejected || 0)}`} 
                        icon={XCircle} 
                        colorClass="bg-rose-500"
                        subText="Declined"
                     />
                   </>
                 );
               })()}
            </div>
          )}

          {activeTab === TabView.PERFORMANCE && (
            <div className="flex sm:hidden items-center gap-2 mx-2 sm:mx-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-x-auto custom-scrollbar flex-1 min-w-0">
               <HeaderStatCard 
                  label="My Points" 
                  value={userStats.points.toString()} 
                  icon={Zap} 
                  colorClass="bg-indigo-500"
                  subText="Earned"
               />
               <HeaderStatCard 
                  label="Tasks Done" 
                  value={userStats.tasksCompleted.toString()} 
                  icon={Target} 
                  colorClass="bg-blue-500"
                  subText="Total"
               />
               <HeaderStatCard 
                  label="Streak" 
                  value={`${userStats.attendanceStreak}D`} 
                  icon={CheckCircle} 
                  colorClass="bg-emerald-500"
                  subText="Active"
               />
               
               <div className={`flex shrink-0 items-center gap-2.5 px-4 py-1.5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-500/10 transition-all group relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 p-1 opacity-20"><Trophy size={24} /></div>
                  <div className="text-white relative z-10 flex items-center gap-3">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.15em] text-amber-100 leading-none mb-1">Prize Pool</p>
                        {isEditingPrize ? (
                          <div className="flex items-center gap-1">
                             <span className="text-xs font-black">₹</span>
                             <input 
                                autoFocus
                                type="number" 
                                className="bg-white/20 border-b border-white/40 text-xs font-black outline-none w-16 text-white placeholder:text-white/50"
                                value={tempPrize}
                                onChange={(e) => setTempPrize(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { updatePrizePool(Number(tempPrize)); setIsEditingPrize(false); }
                                    if (e.key === 'Escape') setIsEditingPrize(false);
                                }}
                             />
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black tracking-tight leading-none">₹{formatIndianNumber(prizePool)}</span>
                            {isSystemAdmin && (
                              <button type="button" onClick={() => { setTempPrize(prizePool.toString()); setIsEditingPrize(true); }} className="p-0.5 hover:bg-white/20 rounded ml-1 transition-colors"><Edit2 size={10} /></button>
                            )}
                          </div>
                        )}
                      </div>
                  </div>
               </div>
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-3 relative shrink-0 ml-auto lg:pointer-events-auto">
            {/* System Alerts Removed */}

            <div onClick={() => setActiveTab(TabView.PROFILE)} className="ml-1 cursor-pointer group"><div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs">{currentUserName.charAt(0)}</div></div>
          </div>
        </header>

        <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/40 dark:bg-slate-950 ${activeTab === TabView.ACCOUNTING ? '!p-0' : ''}`}>
          <div className={`flex-1 flex flex-col min-h-0 w-full animate-in fade-in duration-500 overflow-hidden ${activeTab === TabView.ACCOUNTING ? '!p-0' : 'p-2.5 lg:p-5'}`}><AppContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              hasAccess={hasAccess}
              isCheckedInToday={isCheckedInToday}
              userRole={userRole}
              tabRole={tabRole}
              taskReadOnlyUnlocked={taskReadOnlyUnlocked}
              setTaskReadOnlyUnlocked={setTaskReadOnlyUnlocked}
              currentUserName={currentUserName}
              tasks={tasks}
              financialYear={financialYear}
              updateFinancialYear={updateFinancialYear}
              handleFullBackup={handleFullBackup}
              handleMigratePermissions={handleMigratePermissions}
              isSuperAdmin={isSuperAdmin}
              currentUser={currentUser}
            /></div>
        </div>
      </main>
      <WinnerPopup />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
};

export default App;
