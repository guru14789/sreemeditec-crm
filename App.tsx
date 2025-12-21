
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  Receipt, ShoppingCart, 
  Menu, Bell, LogOut, Clock, CheckSquare, ExternalLink, Truck, Contact, Trophy, PieChart, ShieldCheck, ShoppingBag
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

const INITIAL_NOTIFICATIONS: AppNotification[] = [
    { id: '1', title: 'New Lead Assigned', message: 'Dr. Sarah Smith has been assigned to you.', time: '10 min ago', type: 'info', read: false },
    { id: '2', title: 'Low Stock Alert', message: 'MRI Coil inventory is below minimum level.', time: '1 hour ago', type: 'alert', read: false },
];

const App: React.FC = () => {
  const { employees } = useData();
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<'Admin' | 'Employee'>('Admin');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  
  const currentUser = userRole === 'Admin' ? 'Admin User' : 'Rahul Sharma';

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasAccess = (tab: TabView) => {
    if (userRole === 'Admin') return true;
    const currentEmp = employees.find(e => e.name === currentUser);
    if (!currentEmp) {
        const employeeAllowedTabs = [TabView.TASKS, TabView.ATTENDANCE, TabView.EXPENSES, TabView.PERFORMANCE, TabView.PROFILE];
        return employeeAllowedTabs.includes(tab);
    }
    return currentEmp.permissions?.includes(tab) || tab === TabView.PROFILE;
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabView, icon: React.ElementType, label: string }) => {
    if (!hasAccess(tab)) return null;
    return (
        <button 
        onClick={() => {
            setActiveTab(tab);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        className={`w-[90%] mx-auto flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-2xl mb-1 ${
            activeTab === tab 
            ? 'bg-gradient-to-r from-medical-600 to-teal-500 text-white shadow-lg' 
            : 'text-slate-400 hover:bg-emerald-900/40 hover:text-white'
        }`}
        >
        <Icon size={20} />
        {isSidebarOpen && <span>{label}</span>}
        </button>
    );
  };

  const renderContent = () => {
    if (!hasAccess(activeTab)) return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-4">
                <ShieldCheck size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Module Locked</h3>
            <p className="text-slate-500 mt-2 text-sm max-w-[280px] text-center">Your administrator has not granted you access to this module. Please contact HR.</p>
            <button onClick={() => setActiveTab(TabView.DASHBOARD)} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold">Go to Dashboard</button>
        </div>
    );

    switch (activeTab) {
      case TabView.DASHBOARD: return <Dashboard />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.QUOTES: return <QuotationModule />;
      case TabView.PO_BUILDER: return <PurchaseOrderModule />;
      case TabView.SUPPLIER_PO: return <SupplierPOModule />;
      case TabView.SERVICE_ORDERS: return <ServiceOrderModule />;
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

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden relative">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`bg-gradient-to-b from-[#022c22] to-emerald-950 text-white flex flex-col z-30 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'} fixed md:relative h-full shadow-2xl`}>
          <div className="p-6 h-20 flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-white transition-colors"><Menu size={24} /></button>
             {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-white">Sree Meditec</span>}
          </div>
          <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
            {isSidebarOpen && <div className="px-6 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Modules</div>}
            <NavItem tab={TabView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem tab={TabView.LEADS} icon={Users} label="Lead CRM" />
            <NavItem tab={TabView.QUOTES} icon={FileText} label="Quotation Maker" />
            <NavItem tab={TabView.PO_BUILDER} icon={ShoppingCart} label="Customer PO Maker" />
            <NavItem tab={TabView.SUPPLIER_PO} icon={ShoppingBag} label="Supplier PO Maker" />
            <NavItem tab={TabView.CLIENTS} icon={Contact} label="Client Database" />
            <NavItem tab={TabView.SERVICE_ORDERS} icon={Wrench} label="Service Order Maker" />
            <NavItem tab={TabView.INVENTORY} icon={Package} label="Inventory" />
            <NavItem tab={TabView.DELIVERY} icon={Truck} label="Delivery Challan" />
            
            {isSidebarOpen && <div className="px-6 mb-3 mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace</div>}
            <NavItem tab={TabView.TASKS} icon={CheckSquare} label="Task Manager" />
            <NavItem tab={TabView.ATTENDANCE} icon={Clock} label="Attendance" />
            <NavItem tab={TabView.EXPENSES} icon={Receipt} label="Expenses" />
            <NavItem tab={TabView.PERFORMANCE} icon={Trophy} label="Performance" />
            
            {userRole === 'Admin' && (
                <>
                    {isSidebarOpen && <div className="px-6 mb-3 mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administration</div>}
                    <NavItem tab={TabView.HR} icon={ShieldCheck} label="HR & Permissions" />
                    <NavItem tab={TabView.BILLING} icon={PieChart} label="Financial Reports" />
                </>
            )}
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 h-full">
          <header className="bg-white/80 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between shrink-0 h-20 z-10">
             <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className={`text-slate-500 md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}><Menu size={24} /></button>
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">{activeTab.replace('_', ' ')}</h2>
             </div>
             <div onClick={() => setActiveTab(TabView.PROFILE)} className="flex items-center gap-3 pl-5 border-l cursor-pointer opacity-80 hover:opacity-100">
                <div className="text-right hidden sm:block"><p className="text-sm font-bold text-slate-700">{currentUser}</p><p className="text-[10px] text-slate-400 font-black uppercase">{userRole}</p></div>
                <div className="w-10 h-10 rounded-full bg-mint-200 text-teal-900 flex items-center justify-center font-bold">{currentUser.charAt(0)}</div>
             </div>
          </header>
          <div className="flex-1 p-3 md:p-6 overflow-hidden">{renderContent()}</div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
