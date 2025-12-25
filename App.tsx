
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  Receipt, ShoppingCart, 
  Menu, LogOut, Clock, CheckSquare, Truck, Contact, Trophy, PieChart, ShieldCheck, ShoppingBag, ClipboardList, Briefcase, UserCheck, ShieldAlert, ChevronRight, HelpCircle, Search, Bell, Settings, X, Info, AlertTriangle, CheckCircle2, Trash2
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
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
import { ExpenseModule } from './components/ExpenseModule';
import { PerformanceModule } from './components/PerformanceModule';
import { TabView, Task, AppNotification } from './types';
import { useData } from './components/DataContext';

const INITIAL_TASKS: Task[] = [
  { id: 'T-1', title: 'Site Visit: Apollo Clinic', description: 'Perform routine maintenance check on MRI machine.', assignedTo: 'Rahul Sharma', priority: 'High', status: 'To Do', dueDate: '2023-10-28', relatedTo: 'Apollo Clinic', locationName: 'Apollo Clinic, Indiranagar', coords: { lat: 12.9716, lng: 77.5946 } },
  { id: 'T-2', title: 'Deliver Consumables', description: 'Deliver 50 boxes of syringes to Westview Clinic.', assignedTo: 'Rahul Sharma', priority: 'Medium', status: 'In Progress', dueDate: '2023-10-27', relatedTo: 'Westview Clinic', locationName: 'Westview Clinic, Koramangala', coords: { lat: 12.9352, lng: 77.6245 } },
];

// Reliable public notification sound URL
const NOTIF_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const App: React.FC = () => {
  const { employees, notifications, markNotificationRead, clearAllNotifications } = useData();
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<'Admin' | 'Employee'>('Admin');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUser = userRole === 'Admin' ? 'Admin User' : 'Rahul Sharma';
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

  // Handle Sounds and Toasts
  useEffect(() => {
    const latestNotif = notifications[0];
    if (latestNotif && latestNotif.isNewToast) {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIF_SOUND_URL);
      }
      audioRef.current.play().catch(() => {
        console.log("Audio play blocked by browser policy. Interaction needed.");
      });

      setToasts(prev => [latestNotif, ...prev]);
      
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== latestNotif.id));
        markNotificationRead(latestNotif.id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const hasAccess = (tab: TabView) => {
    if (userRole === 'Admin') return true;
    const currentEmp = employees.find(e => e.name === currentUser);
    if (!currentEmp) {
        const employeeAllowedTabs = [TabView.TASKS, TabView.ATTENDANCE, TabView.EXPENSES, TabView.PERFORMANCE, TabView.PROFILE];
        return employeeAllowedTabs.includes(tab);
    }
    return currentEmp.permissions?.includes(tab) || tab === TabView.PROFILE;
  };

  const sidebarSections = [
    {
      title: 'Main Modules',
      items: [
        { tab: TabView.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
        { tab: TabView.LEADS, icon: Users, label: 'Lead CRM' },
        { tab: TabView.CLIENTS, icon: Contact, label: 'Client Database' },
        { tab: TabView.INVENTORY, icon: Package, label: 'Inventory' },
      ]
    },
    {
      title: 'Doc Maker',
      items: [
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

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabView, icon: React.ElementType, label: string }) => {
    const isActive = activeTab === tab;
    return (
        <button 
          onClick={() => {
              setActiveTab(tab);
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
          }}
          title={!isSidebarOpen ? label : ''}
          className={`group w-full flex items-center transition-all relative mb-2 ${
              isActive 
              ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20' 
              : 'text-emerald-50/50 hover:text-white hover:bg-white/5'
          } ${isSidebarOpen ? 'px-5 py-3 rounded-2xl gap-4' : 'justify-center p-3 rounded-2xl w-14 h-14 mx-auto'}`}
        >
          <Icon size={isSidebarOpen ? 20 : 26} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
          {isSidebarOpen && <span className="truncate flex-1 text-left font-bold tracking-tight text-sm">{label}</span>}
        </button>
    );
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => {
    if (!isSidebarOpen) return <div className="h-px bg-white/5 my-6 mx-4" />;
    return (
      <div className="px-5 mb-4 mt-8 text-[10px] font-black text-emerald-100/20 uppercase tracking-[0.25em] flex items-center gap-3">
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
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-[280px] text-center">Your administrator has not granted you access to this module. Please contact HR.</p>
            <button onClick={() => setActiveTab(TabView.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-sm font-bold">Go to Dashboard</button>
        </div>
    );

    switch (activeTab) {
      case TabView.DASHBOARD: return <Dashboard />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.QUOTES: return <QuotationModule />;
      case TabView.PO_BUILDER: return <PurchaseOrderModule />;
      case TabView.SUPPLIER_PO: return <SupplierPOModule />;
      case TabView.SERVICE_ORDERS: return <ServiceOrderModule />;
      case TabView.SERVICE_REPORTS: return <ServiceReportModule />;
      case TabView.INSTALLATION_REPORTS: return <InstallationReportModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} currentUser={currentUser} userRole={userRole} />;
      case TabView.TASKS: return <TaskModule tasks={tasks} setTasks={setTasks} currentUser={currentUser} isAdmin={userRole === 'Admin'} />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={userRole} setUserRole={setUserRole} currentUser={currentUser} />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.EXPENSES: return <ExpenseModule userRole={userRole} currentUser={currentUser} />;
      case TabView.PERFORMANCE: return <PerformanceModule />;
      default: return <Dashboard />;
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

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* Toast Overlays */}
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="w-80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex gap-4 animate-in slide-in-from-right pointer-events-auto transform transition-all hover:scale-105">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              toast.type === 'alert' ? 'bg-rose-50 dark:bg-rose-900/20' : 
              toast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 
              toast.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
            }`}>
              {getNotifIcon(toast.type)}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight">{toast.title}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-slate-600 self-start">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <aside className={`bg-[#01261d] text-slate-100 flex flex-col z-[70] transition-all duration-300 border-r border-white/5 
        ${isSidebarOpen 
          ? 'w-72 translate-x-0' 
          : 'w-24 -translate-x-full lg:translate-x-0'} 
        fixed lg:relative h-full shadow-2xl overflow-hidden`}>
        
        {/* Branding Area with Toggle */}
        <div className={`p-6 h-24 flex items-center shrink-0 bg-black/10 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen ? (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-4">
                <span className="font-black text-white text-2xl tracking-tighter uppercase leading-none">Sree Meditec</span>
                <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-[0.4em] ml-0.5 mt-1">Enterprise</span>
              </div>
            ) : null}
            
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className={`p-2 hover:bg-white/10 rounded-2xl text-white transition-all transform active:scale-90 ${!isSidebarOpen && 'scale-110'}`}
            >
                <Menu size={28} />
            </button>
        </div>

        {/* Navigation Items */}
        <div className={`flex-1 overflow-y-auto py-6 custom-scrollbar ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
          {sidebarSections.map((section, sectionIdx) => {
            const accessibleItems = section.items.filter(item => hasAccess(item.tab));
            
            if (accessibleItems.length === 0) return null;

            return (
              <React.Fragment key={sectionIdx}>
                <SectionHeading>{section.title}</SectionHeading>
                {accessibleItems.map((item, itemIdx) => (
                  <NavItem 
                    key={itemIdx} 
                    tab={item.tab} 
                    icon={item.icon} 
                    label={item.label} 
                  />
                ))}
              </React.Fragment>
            );
          })}
          <div className="h-10 shrink-0"></div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
          <button 
            onClick={() => { if(confirm('Sign out from Sree Meditec?')) window.location.reload(); }}
            className={`w-full flex items-center gap-4 px-5 py-4 text-sm font-bold text-emerald-100/50 hover:text-white hover:bg-rose-500/20 rounded-2xl transition-all ${!isSidebarOpen && 'justify-center p-0 h-14 w-14 mx-auto'}`}
          >
            <LogOut size={22} className="shrink-0" />
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/30 dark:bg-slate-900/30">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center shrink-0 h-20 md:h-24 z-50 sticky top-0 shadow-sm transition-colors duration-300">
            {/* Left Column: Menu Button (Mobile) or Placeholder (Desktop) */}
            <div className="w-12 md:hidden">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)} 
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                >
                  <Menu size={22} />
                </button>
              )}
            </div>

            {/* Center Column: Title and Status */}
            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0 px-2">
              <h2 className="text-lg md:text-[24px] font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-tight truncate">
                {activeTab.replace(/_/g, ' ')}
              </h2>
              <div className="flex items-center gap-1.5 md:mt-1">
                 <div className="w-2 h-2 rounded-full bg-medical-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                 <span className="text-[10px] md:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">Live Workspace</span>
              </div>
            </div>

            {/* Right Column: Actions and Profile */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Notification Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-medical-50 dark:bg-medical-900/20 text-medical-600 dark:text-medical-400' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`} 
                  title="Notifications"
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-4 w-72 sm:w-96 bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100] animate-in slide-in-from-top-4">
                    <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-xs">Notification Center</h4>
                      <button 
                        onClick={clearAllNotifications}
                        className="text-[9px] font-black text-slate-400 dark:text-slate-500 hover:text-rose-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                        <Trash2 size={10}/> Clear
                      </button>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => markNotificationRead(notif.id)}
                            className={`p-4 flex gap-3 border-b border-slate-50 dark:border-slate-700 transition-colors cursor-pointer ${notif.read ? 'opacity-50' : 'bg-medical-50/20 dark:bg-medical-900/10 hover:bg-medical-50/40 dark:hover:bg-medical-900/20'}`}>
                            <div className={`p-2 rounded-lg h-fit ${
                              notif.type === 'alert' ? 'bg-rose-50 dark:bg-rose-900/20' : 
                              notif.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 
                              notif.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
                            }`}>
                              {getNotifIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-800 dark:text-slate-100 text-[13px] tracking-tight">{notif.title}</p>
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-300 dark:text-slate-600">
                          <p className="text-[10px] font-black uppercase tracking-widest">Inbox is empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar (Mini on Mobile) */}
              <div onClick={() => setActiveTab(TabView.PROFILE)} className="ml-1 cursor-pointer group">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black shadow-sm group-hover:bg-medical-600 group-hover:text-white group-hover:border-medical-700 transition-all transform active:scale-95">
                  {currentUser.charAt(0)}
                </div>
              </div>
            </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-hidden bg-slate-50/40 dark:bg-slate-950 transition-colors duration-300">
          <div className="h-full w-full animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
