
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  Receipt, ShoppingCart, 
  Menu, LogOut, Clock, CheckSquare, Truck, Contact, Trophy, PieChart, ShieldCheck, ShoppingBag, ClipboardList, Briefcase, UserCheck, ShieldAlert, ChevronRight, HelpCircle, Search, Bell, Settings, X, Info, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { EmployeeDashboard } from './EmployeeDashboard';
import { LeadsModule } from './LeadsModule';
import { InventoryModule } from './InventoryModule';
import { AttendanceModule } from './AttendanceModule';
import { HRModule } from './HRModule';
import { TaskModule } from './TaskModule';
import { ProfileModule } from './ProfileModule';
import { BillingModule } from './BillingModule';
import { QuotationModule } from './QuotationModule';
import { PurchaseOrderModule } from './PurchaseOrderModule';
import { SupplierPOModule } from './SupplierPOModule';
import { ServiceOrderModule } from './ServiceOrderModule';
import { ServiceReportModule } from './ServiceReportModule';
import { InstallationReportModule } from './InstallationReportModule';
import { DeliveryChallanModule } from './DeliveryChallanModule';
import { ReportsModule } from './ReportsModule';
import { ClientModule } from './ClientModule';
import { VendorModule } from './VendorModule';
import { ExpenseModule } from './ExpenseModule';
import { PerformanceModule } from './PerformanceModule';
import { Login } from './Login';
import { TabView, Task, AppNotification } from '../types';
import { useData } from './DataContext';

const NOTIF_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const App: React.FC = () => {
  const { employees, notifications, markNotificationRead, clearAllNotifications, isAuthenticated, currentUser, logout, tasks, setTasks } = useData();
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifications]);

  useEffect(() => {
    const latestNotif = notifications[0];
    if (latestNotif && latestNotif.isNewToast) {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIF_SOUND_URL);
      }
      audioRef.current.play().catch(() => {});
      setToasts(prev => [latestNotif, ...prev]);
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== latestNotif.id));
        markNotificationRead(latestNotif.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // AUTH GUARD
  if (!isAuthenticated || !currentUser) {
      return <Login />;
  }

  // --- TWO-ROLE PERMISSION ENGINE ---
  // 1. SYSTEM_ADMIN: Full bypass for everything
  // 2. SYSTEM_STAFF: Strictly restricted to permissions array
  const isGlobalAdmin = currentUser.role === 'SYSTEM_ADMIN';
  const isAdminView = currentUser.department === 'Administration';

  const hasAccess = (tab: TabView) => {
    if (isGlobalAdmin) return true;
    return currentUser.permissions?.includes(tab) || false;
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
      ]
    },
    {
      title: 'Workspace',
      items: [
        { tab: TabView.TASKS, icon: CheckSquare, label: 'Task Manager' },
        { tab: TabView.ATTENDANCE, icon: Clock, label: 'Check-in/Out' },
        { tab: TabView.EXPENSES, icon: Receipt, label: 'Vouchers' },
        { tab: TabView.PERFORMANCE, icon: Trophy, label: 'Leaderboard' },
      ]
    },
    {
      title: 'Control',
      items: [
        { tab: TabView.HR, icon: ShieldCheck, label: 'Staff Management' },
      ]
    }
  ];

  const getNotifIcon = (type: AppNotification['type']) => {
    switch(type) {
      case 'alert': return <AlertTriangle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'success': return <CheckCircle2 size={18} className="text-emerald-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const renderContent = () => {
    if (!hasAccess(activeTab)) return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-8 text-center animate-in fade-in">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-6 shadow-inner">
                <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm leading-relaxed">
              Your profile does not have security clearance for the <b>{activeTab.replace(/_/g, ' ')}</b> module. 
              Only explicitly granted modules are accessible for System Staff.
            </p>
            <button onClick={() => setActiveTab(TabView.DASHBOARD)} className="mt-8 px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Return Home</button>
        </div>
    );

    switch (activeTab) {
      case TabView.DASHBOARD: 
        return isAdminView ? <Dashboard /> : <EmployeeDashboard currentUser={currentUser.name} tasks={tasks} />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.QUOTES: return <QuotationModule />;
      case TabView.PO_BUILDER: return <PurchaseOrderModule />;
      case TabView.SUPPLIER_PO: return <SupplierPOModule />;
      case TabView.SERVICE_ORDERS: return <ServiceOrderModule />;
      case TabView.SERVICE_REPORTS: return <ServiceReportModule />;
      case TabView.INSTALLATION_REPORTS: return <InstallationReportModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} currentUser={currentUser.name} userRole={isAdminView ? 'Admin' : 'Employee'} />;
      case TabView.TASKS: return <TaskModule tasks={tasks} setTasks={setTasks} currentUser={currentUser.name} isAdmin={isAdminView} />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={isAdminView ? 'Admin' : 'Employee'} setUserRole={() => {}} currentUser={currentUser.name} />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.VENDORS: return <VendorModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.EXPENSES: return <ExpenseModule userRole={isAdminView ? 'Admin' : 'Employee'} currentUser={currentUser.name} />;
      case TabView.PERFORMANCE: return <PerformanceModule userRole={isAdminView ? 'Admin' : 'Employee'} />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      default: return isAdminView ? <Dashboard /> : <EmployeeDashboard currentUser={currentUser.name} tasks={tasks} />;
    }
  };

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    setActiveTab(TabView.DASHBOARD);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden relative">
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 animate-in slide-in-from-right pointer-events-auto">
            <div className={`p-2.5 rounded-xl shrink-0 ${toast.type === 'alert' ? 'bg-rose-50' : toast.type === 'warning' ? 'bg-amber-50' : toast.type === 'success' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
              {getNotifIcon(toast.type)}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">{toast.title}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <aside className={`bg-[#01261d] text-slate-100 flex flex-col z-[70] transition-all duration-300 border-r border-white/5 ${isSidebarOpen ? 'w-72' : 'w-24'} fixed lg:relative h-full shadow-2xl overflow-hidden`}>
        <div className={`p-6 h-24 flex items-center shrink-0 bg-black/10 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-4">
                <span className="font-black text-white text-2xl tracking-tighter uppercase leading-none">Sree Meditec</span>
                <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-[0.4em] ml-0.5 mt-1">Enterprise</span>
              </div>
            )}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-2xl text-white transition-all transform active:scale-90"><Menu size={28} /></button>
        </div>

        <div className={`flex-1 overflow-y-auto py-4 custom-scrollbar ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
          {sidebarSections.map((section, idx) => {
            const accessibleItems = section.items.filter(item => hasAccess(item.tab));
            if (accessibleItems.length === 0) return null;
            return (
              <React.Fragment key={idx}>
                {isSidebarOpen && (
                    <div className="px-5 mb-3 mt-6 text-[10px] font-black text-emerald-100/20 uppercase tracking-[0.25em] flex items-center gap-3">
                        <span className="shrink-0">{section.title}</span>
                        <div className="h-[1px] bg-white/5 flex-1"></div>
                    </div>
                )}
                {!isSidebarOpen && <div className="h-px bg-white/5 my-6 mx-4" />}
                {accessibleItems.map((item, iIdx) => (
                  <button 
                    key={iIdx}
                    onClick={() => setActiveTab(item.tab)}
                    className={`group w-full flex items-center transition-all mb-1.5 ${activeTab === item.tab ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg' : 'text-emerald-50/50 hover:text-white hover:bg-white/5'} ${isSidebarOpen ? 'px-4 py-3 rounded-2xl gap-3.5' : 'justify-center p-3 rounded-2xl w-14 h-14 mx-auto'}`}
                  >
                    <item.icon size={isSidebarOpen ? 18 : 24} className="shrink-0" />
                    {isSidebarOpen && <span className="truncate flex-1 text-left font-bold tracking-tight text-sm">{item.label}</span>}
                  </button>
                ))}
              </React.Fragment>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 shrink-0 bg-black/10">
            <button onClick={handleSignOut} className={`group w-full flex items-center transition-all text-rose-300 hover:text-white hover:bg-rose-500/10 active:scale-95 ${isSidebarOpen ? 'px-4 py-3 rounded-2xl gap-4' : 'justify-center p-3 rounded-2xl w-14 h-14 mx-auto'}`}>
                <LogOut size={isSidebarOpen ? 20 : 26} />
                {isSidebarOpen && <span className="font-bold tracking-tight text-sm">Sign Out</span>}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/30 dark:bg-slate-900/30">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3 flex items-center shrink-0 h-24 z-50 sticky top-0 shadow-sm transition-colors duration-300">
            <div className="flex-1 flex flex-col items-start min-w-0">
              <h2 className="text-[24px] font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-tight truncate">
                {activeTab.replace(/_/g, ' ')}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Security Terminal Connected</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 relative">
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>
                  <Bell size={22} />
                  {unreadCount > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white animate-in zoom-in">{unreadCount}</span>}
                </button>
              </div>
              <div onClick={() => setActiveTab(TabView.PROFILE)} className="cursor-pointer group">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black transition-transform group-hover:scale-105">{currentUser.name.charAt(0)}</div>
              </div>
            </div>
        </header>

        <div className="flex-1 p-8 overflow-hidden bg-slate-50/40 dark:bg-slate-950">
          <div className="h-full w-full animate-in fade-in duration-500">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
