
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  Receipt, ShoppingCart, 
  Menu, LogOut, Clock, CheckSquare, Truck, Contact, Trophy, PieChart, ShieldCheck, ShoppingBag, ClipboardList, Briefcase, UserCheck, ShieldAlert, ChevronRight, HelpCircle, Search, Bell, Settings, X, Info, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
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
import { ReportsModule } from './components/ReportsModule';
import { ClientModule } from './components/ClientModule';
import { VendorModule } from './components/VendorModule';
import { ExpenseModule } from './components/ExpenseModule';
import { PerformanceModule } from './components/PerformanceModule';
import { Login } from './components/Login';
import { TabView, Task, AppNotification } from './types';
import { useData } from './components/DataContext';

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

  // AUTH GUARD: If not logged in, show Login screen
  if (!isAuthenticated || !currentUser) {
      return <Login />;
  }

  const userRole = currentUser.department === 'Administration' ? 'Admin' : 'Employee';
  const currentUserName = currentUser.name;

  const hasAccess = (tab: TabView) => {
    if (userRole === 'Admin') return true;
    if (tab === TabView.DASHBOARD || tab === TabView.PROFILE) return true;
    return currentUser.permissions?.includes(tab);
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

  const NavItem: React.FC<{ tab: TabView; icon: any; label: string }> = ({ tab, icon: Icon, label }) => {
    const isActive = activeTab === tab;
    return (
        <button 
          onClick={() => {
              setActiveTab(tab);
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
          }}
          className={`group w-full flex items-center transition-all relative mb-1.5 ${
              isActive 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20' 
              : 'text-emerald-50/50 hover:text-white hover:bg-white/5'
          } ${isSidebarOpen ? 'px-4 py-3 rounded-2xl gap-3.5' : 'justify-center p-3 rounded-2xl w-14 h-14 mx-auto'}`}
        >
          <Icon size={isSidebarOpen ? 18 : 24} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
          {isSidebarOpen && <span className="truncate flex-1 text-left font-bold tracking-tight text-sm">{label}</span>}
        </button>
    );
  };

  const SectionHeading = ({ children }: { children?: React.ReactNode }) => {
    if (!isSidebarOpen) return <div className="h-px bg-white/5 my-6 mx-4" />;
    return (
      <div className="px-5 mb-3 mt-6 text-[10px] font-black text-emerald-100/20 uppercase tracking-[0.25em] flex items-center gap-3">
        <span className="shrink-0">{children}</span>
        <div className="h-[1px] bg-white/5 flex-1"></div>
      </div>
    );
  };

  const renderContent = () => {
    if (!hasAccess(activeTab)) return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-4">
                <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Module Locked</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-[280px] text-center">Contact HR for access.</p>
            <button onClick={() => setActiveTab(TabView.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-sm font-bold">Go to Dashboard</button>
        </div>
    );

    switch (activeTab) {
      case TabView.DASHBOARD: 
        return userRole === 'Admin' ? <Dashboard /> : <EmployeeDashboard currentUser={currentUserName} tasks={tasks} />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.QUOTES: return <QuotationModule />;
      case TabView.PO_BUILDER: return <PurchaseOrderModule />;
      case TabView.SUPPLIER_PO: return <SupplierPOModule />;
      case TabView.SERVICE_ORDERS: return <ServiceOrderModule />;
      case TabView.SERVICE_REPORTS: return <ServiceReportModule />;
      case TabView.INSTALLATION_REPORTS: return <InstallationReportModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} currentUser={currentUserName} userRole={userRole} />;
      case TabView.TASKS: return <TaskModule tasks={tasks} setTasks={setTasks} currentUser={currentUserName} isAdmin={userRole === 'Admin'} />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={userRole} setUserRole={() => {}} currentUser={currentUserName} />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.VENDORS: return <VendorModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.EXPENSES: return <ExpenseModule userRole={userRole} currentUser={currentUserName} />;
      case TabView.PERFORMANCE: return <PerformanceModule userRole={userRole} />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      default: return userRole === 'Admin' ? <Dashboard /> : <EmployeeDashboard currentUser={currentUserName} tasks={tasks} />;
    }
  };

  const getNotifIcon = (type: AppNotification['type']) => {
    switch(type) {
      case 'alert': return <AlertTriangle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'success': return <CheckCircle2 size={18} className="text-emerald-500" />;
      default: return <Info size={18} className="text-blue-500" />;
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
      {/* Toast Layer */}
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 animate-in slide-in-from-right pointer-events-auto">
            <div className={`p-2.5 rounded-xl shrink-0 ${toast.type === 'alert' ? 'bg-rose-50 dark:bg-rose-900/20' : toast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              {getNotifIcon(toast.type)}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">{toast.title}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 self-start"><X size={14} /></button>
          </div>
        ))}
      </div>

      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <aside className={`bg-[#01261d] text-slate-100 flex flex-col z-[70] transition-all duration-300 border-r border-white/5 
        ${isSidebarOpen 
          ? 'w-72 translate-x-0' 
          : 'w-24 -translate-x-full lg:translate-x-0'} 
        fixed lg:relative h-full shadow-2xl overflow-hidden`}>
        
        {/* Branding Header */}
        <div className={`p-6 h-24 flex items-center shrink-0 bg-black/10 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen ? (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-4">
                <span className="font-black text-white text-2xl tracking-tighter uppercase leading-none">Sree Meditec</span>
                <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-[0.4em] ml-0.5 mt-1">Enterprise</span>
              </div>
            ) : null}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-2xl text-white transition-all transform active:scale-90"><Menu size={28} /></button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className={`flex-1 overflow-y-auto py-4 custom-scrollbar ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
          {sidebarSections.map((section, idx) => {
            const accessibleItems = section.items.filter(item => hasAccess(item.tab));
            if (accessibleItems.length === 0) return null;
            return (
              <React.Fragment key={idx}>
                <SectionHeading>{section.title}</SectionHeading>
                {accessibleItems.map((item, itemIdx) => (
                  <NavItem key={itemIdx} tab={item.tab} icon={item.icon} label={item.label} />
                ))}
              </React.Fragment>
            );
          })}
        </div>

        {/* Session Controls */}
        <div className={`p-4 border-t border-white/5 shrink-0 bg-black/10 relative z-[100] ${!isSidebarOpen && 'flex flex-col items-center'}`}>
            <button 
                onClick={handleSignOut}
                type="button"
                className={`group w-full flex items-center transition-all text-rose-300 hover:text-white hover:bg-rose-500/10 cursor-pointer pointer-events-auto relative active:scale-95 ${isSidebarOpen ? 'px-4 py-3 rounded-2xl gap-4' : 'justify-center p-3 rounded-2xl w-14 h-14'}`}
            >
                <LogOut size={isSidebarOpen ? 20 : 26} className="shrink-0 transition-transform group-hover:scale-110" />
                {isSidebarOpen && (
                    <div className="flex-1 min-w-0 pointer-events-none">
                        <span className="block truncate text-left font-black tracking-widest text-[10px] uppercase opacity-40 leading-none mb-1">Session Control</span>
                        <span className="block truncate text-left font-bold tracking-tight text-sm">Sign Out</span>
                    </div>
                )}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/30 dark:bg-slate-900/30">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center shrink-0 h-20 md:h-24 z-50 sticky top-0 shadow-sm transition-colors duration-300">
            <div className="w-12 lg:hidden">
              {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all"><Menu size={22} /></button>}
            </div>
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0 px-2">
              <h2 className="text-lg md:text-[24px] font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-tight truncate">
                {activeTab.replace(/_/g, ' ')}
              </h2>
              <div className="flex items-center gap-1.5 md:mt-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                 <span className="text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">Live Workspace</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-3 relative">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900 animate-in zoom-in">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute top-full right-0 mt-3 w-[320px] sm:w-[420px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                       <h3 className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-100">System Alerts</h3>
                       <div className="flex gap-3">
                         <button onClick={clearAllNotifications} className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-tighter">Clear All</button>
                       </div>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-800">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => markNotificationRead(notif.id)}
                              className={`px-5 py-6 flex items-start gap-5 transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${notif.read ? 'opacity-60' : 'bg-emerald-50/10 dark:bg-emerald-500/5'}`}
                            >
                              <div className={`p-3 rounded-2xl shrink-0 ${
                                notif.type === 'alert' ? 'bg-rose-100 text-rose-600' : 
                                notif.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                                notif.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {getNotifIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="font-black text-slate-800 dark:text-slate-100 text-[12px] leading-none uppercase tracking-tight">{notif.title}</p>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0 whitespace-nowrap ml-4">{notif.time}</span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                                {!notif.read && (
                                  <div className="mt-3 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></div>
                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">New Update</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-16 flex flex-col items-center justify-center opacity-30 text-center px-10">
                           <Bell size={48} className="mb-4 text-slate-300" />
                           <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">No Active Notifications</p>
                           <p className="text-[10px] font-medium mt-1 text-slate-500 dark:text-slate-400">Smart scanner is monitoring system health</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-50 dark:border-slate-700 text-center bg-slate-50/20 dark:bg-slate-900/50">
                       <button onClick={() => setShowNotifications(false)} className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] hover:underline">Close Terminal</button>
                    </div>
                  </div>
                )}
              </div>

              <div onClick={() => setActiveTab(TabView.PROFILE)} className="ml-1 cursor-pointer group"><div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black">{currentUserName.charAt(0)}</div></div>
            </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-hidden bg-slate-50/40 dark:bg-slate-950">
          <div className="h-full w-full animate-in fade-in duration-500">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
