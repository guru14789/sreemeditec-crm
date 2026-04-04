
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText, Package, Wrench,
  Receipt, ShoppingCart,
  Menu, LogOut, Clock, CheckSquare, Truck, Contact, Trophy, ShieldCheck, ShoppingBag, ClipboardList, ShieldAlert, CheckCircle2, Activity, Building2, User, AlertCircle, XCircle, Zap, Target, Edit2, CheckCircle
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
import { LogsModule } from './components/LogsModule';
import { ArchiveModule } from './components/ArchiveModule';
import { WinnerPopup } from './components/WinnerPopup';
import { Login } from './components/Login';
import { TabView } from './types';
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
    <button
      onClick={() => onSelect(tab)}
      className={`group w-full flex items-center transition-all relative mb-1.5 ${isActive
        ? 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20'
        : 'text-emerald-50/50 hover:text-white hover:bg-white/5'
        } ${isSidebarOpen ? 'px-4 py-3 rounded-2xl gap-3.5' : 'justify-center p-3 rounded-2xl w-14 h-14 mx-auto'}`}
    >
      <Icon size={isSidebarOpen ? 18 : 24} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
      {isSidebarOpen && <span className="truncate flex-1 text-left font-bold tracking-tight text-sm">{label}</span>}
    </button>
  );
};

const SectionHeading = ({ children, isSidebarOpen }: { children?: React.ReactNode; isSidebarOpen: boolean }) => {
  if (!isSidebarOpen) return <div className="h-px bg-white/5 my-6 mx-4" />;
  return (
    <div className="px-5 mb-3 mt-6 text-[10px] font-black text-emerald-100/20 uppercase tracking-[0.25em] flex items-center gap-3">
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
    <div className={`hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm transition-all hover:border-${colorClass.split('-')[1]}-200 group`}>
        <div className={`p-1.5 rounded-xl ${colorClass} text-white group-hover:scale-110 transition-transform`}>
            <Icon size={14} />
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

export const App: React.FC = () => {
    const { isAuthenticated, currentUser, logout, tasks, products, expenses, prizePool, updatePrizePool, userStats } = useData();
    const [isEditingPrize, setIsEditingPrize] = useState(false);
    const [tempPrize, setTempPrize] = useState(prizePool.toString());

  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // AUTH GUARD: If not logged in, show Login screen
  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  const userRole = (currentUser.department === 'Administration' || currentUser.role === 'SYSTEM_ADMIN') ? 'Admin' : 'Employee';
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
        { tab: TabView.REPORTS, icon: ClipboardList, label: 'Reports Centre' },
        { tab: TabView.LOGS, icon: Activity, label: 'Audit Logs' },
        { tab: TabView.ARCHIVE, icon: FileText, label: 'Finance Archive' },
      ]
    }
  ];



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
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} />;
      case TabView.TASKS: return <TaskModule />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={userRole} setUserRole={() => { }} currentUser={currentUserName} />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.VENDORS: return <VendorModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.LOGS: return <LogsModule />;
      case TabView.EXPENSES: return <ExpenseModule userRole={userRole} currentUser={currentUserName} />;
      case TabView.PERFORMANCE: return <PerformanceModule />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      case TabView.ARCHIVE: return <ArchiveModule />;
      default: return userRole === 'Admin' ? <Dashboard /> : <EmployeeDashboard currentUser={currentUserName} tasks={tasks} />;
    }
  };

  /* Notifications icons removed */

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    setActiveTab(TabView.DASHBOARD);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden relative">
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
          
          {activeTab === TabView.INVENTORY && (
            <div className="hidden lg:flex items-center gap-3 mx-6 animate-in fade-in slide-in-from-top-4 duration-500">
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
            <div className="hidden lg:flex items-center gap-3 mx-6 animate-in fade-in slide-in-from-top-4 duration-500">
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

          {activeTab === TabView.EXPENSES && (
            <div className="hidden lg:flex items-center gap-3 mx-6 animate-in fade-in slide-in-from-top-4 duration-500">
               {(() => {
                 const userRole = (currentUser?.department === 'Administration' || currentUser?.role === 'SYSTEM_ADMIN') ? 'Admin' : 'Employee';
                 const visibleExpenses = userRole === 'Admin' ? expenses : expenses.filter(e => e.employeeName === currentUser?.name);
                 
                 const totalApproved = visibleExpenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0);
                 const pendingAmount = visibleExpenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0);
                 const totalRejected = visibleExpenses.filter(e => e.status === 'Rejected').reduce((sum, e) => sum + e.amount, 0);
                 
                 return (
                   <>
                     <HeaderStatCard 
                        label="Approved" 
                        value={`₹${formatIndianNumber(totalApproved)}`} 
                        icon={CheckCircle2} 
                        colorClass="bg-emerald-500"
                        subText="Cleared"
                     />
                     <HeaderStatCard 
                        label="Pending" 
                        value={`₹${formatIndianNumber(pendingAmount)}`} 
                        icon={Clock} 
                        colorClass="bg-amber-500"
                        subText="Awaiting"
                     />
                     <HeaderStatCard 
                        label="Rejected" 
                        value={`₹${formatIndianNumber(totalRejected)}`} 
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
            <div className="hidden lg:flex items-center gap-3 mx-6 animate-in fade-in slide-in-from-top-4 duration-500">
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
               
               <div className={`hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-500/10 transition-all group relative overflow-hidden`}>
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
                            {(currentUser?.department === 'Administration' || currentUser?.role === 'SYSTEM_ADMIN') && (
                              <button onClick={() => { setTempPrize(prizePool.toString()); setIsEditingPrize(true); }} className="p-0.5 hover:bg-white/20 rounded ml-1 transition-colors"><Edit2 size={10} /></button>
                            )}
                          </div>
                        )}
                      </div>
                  </div>
               </div>
            </div>
          )}

          <div className="flex items-center gap-1 md:gap-3 relative">
            {/* System Alerts Removed */}

            <div onClick={() => setActiveTab(TabView.PROFILE)} className="ml-1 cursor-pointer group"><div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black">{currentUserName.charAt(0)}</div></div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-hidden bg-slate-50/40 dark:bg-slate-950">
          <div className="h-full w-full animate-in fade-in duration-500">{renderContent()}</div>
        </div>
      </main>
      <WinnerPopup />
    </div>
  );
};

export default App;
