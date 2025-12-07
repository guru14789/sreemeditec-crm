
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  UserCheck, Receipt, ShoppingCart, Headset, BarChart3, 
  Menu, Bell, LogOut, Clock, PlusCircle, CheckSquare, ChevronDown, Check, X, AlertCircle, Info, CheckCircle2, ExternalLink, Truck, Contact, Trophy, PieChart
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { LeadsModule } from './components/LeadsModule';
import { ServiceModule } from './components/ServiceModule';
import { InventoryModule } from './components/InventoryModule';
import { AttendanceModule } from './components/AttendanceModule';
import { HRModule } from './components/HRModule';
import { TaskModule } from './components/TaskModule';
import { ProfileModule } from './components/ProfileModule';
import { BillingModule } from './components/BillingModule';
import { DeliveryChallanModule } from './components/DeliveryChallanModule';
import { ReportsModule } from './components/ReportsModule';
import { ClientModule } from './components/ClientModule';
import { ExpenseModule } from './components/ExpenseModule';
import { PerformanceModule } from './components/PerformanceModule';
import { TabView, Task, AppNotification } from './types';

// Placeholder for unimplemented modules
const PlaceholderModule: React.FC<{title: string, desc: string}> = ({title, desc}) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 bg-white/50 rounded-3xl border border-slate-200/60 m-2">
        <div className="bg-slate-50 p-6 rounded-full mb-4 shadow-inner">
            <Wrench size={48} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-600 text-center">{title}</h2>
        <p className="max-w-md text-center mt-2 text-slate-500">{desc}</p>
        <p className="text-xs mt-8 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full font-medium border border-amber-100">Coming Soon in Full Version</p>
    </div>
);

type UserRole = 'Admin' | 'Employee';

// Initial Mock Tasks with Geolocation Data
const INITIAL_TASKS: Task[] = [
  { 
    id: 'T-1', 
    title: 'Site Visit: Apollo Clinic', 
    description: 'Perform routine maintenance check on MRI machine.', 
    assignedTo: 'Rahul Sharma', 
    priority: 'High', 
    status: 'To Do', 
    dueDate: '2023-10-28', 
    relatedTo: 'Apollo Clinic',
    locationName: 'Apollo Clinic, Indiranagar',
    coords: { lat: 12.9716, lng: 77.5946 } // Example: Bangalore Central
  },
  { 
    id: 'T-2', 
    title: 'Deliver Consumables', 
    description: 'Deliver 50 boxes of syringes to Westview Clinic.', 
    assignedTo: 'Rahul Sharma', 
    priority: 'Medium', 
    status: 'In Progress', 
    dueDate: '2023-10-27', 
    relatedTo: 'Westview Clinic',
    locationName: 'Westview Clinic, Koramangala',
    coords: { lat: 12.9352, lng: 77.6245 } 
  },
  { 
    id: 'T-3', 
    title: 'Inventory Audit', 
    description: 'Count physical stock of consumables in Warehouse B.', 
    assignedTo: 'David Kim', 
    priority: 'Low', 
    status: 'Done', 
    dueDate: '2023-10-25',
    locationName: 'Main Warehouse'
  },
  { 
    id: 'T-4', 
    title: 'Client Follow-up', 
    description: 'Call Dr. Smith regarding the new X-Ray inquiry.', 
    assignedTo: 'Rahul Sharma', 
    priority: 'High', 
    status: 'To Do', 
    dueDate: '2023-10-29', 
    relatedTo: 'Dr. Sarah Smith',
    locationName: 'Remote / Phone'
  },
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
    { id: '1', title: 'New Lead Assigned', message: 'Dr. Sarah Smith has been assigned to you.', time: '10 min ago', type: 'info', read: false },
    { id: '2', title: 'Low Stock Alert', message: 'MRI Coil inventory is below minimum level.', time: '1 hour ago', type: 'alert', read: false },
    { id: '3', title: 'Task Due Soon', message: 'Prepare Quote for Apollo is due in 2 hours.', time: '2 hours ago', type: 'warning', read: false },
    { id: '4', title: 'Leave Approved', message: 'Your leave request for Nov 10 has been approved.', time: '1 day ago', type: 'success', read: true },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  
  // Shared Task State
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Determine Current User Name based on Role (Simulated Login)
  const currentUser = userRole === 'Admin' ? 'Admin User' : 'Rahul Sharma';

  // Update default tab based on role change
  useEffect(() => {
      if (userRole === 'Employee' && !employeeAllowedTabs.includes(activeTab)) {
          setActiveTab(TabView.TASKS);
      } else if (userRole === 'Admin' && activeTab === TabView.PERFORMANCE) {
          setActiveTab(TabView.DASHBOARD);
      }
  }, [userRole]);

  // Auto-close sidebar on mobile on initial load
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    };
    
    // Set initial state
    if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
    }

    // Add listener
    window.addEventListener('resize', handleResize);
    
    // Click outside listener for notifications
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Notification Helpers
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
      switch(type) {
          case 'alert': return <AlertCircle size={16} className="text-rose-500" />;
          case 'warning': return <Clock size={16} className="text-amber-500" />;
          case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  // Define permissions - STRICT LIST FOR EMPLOYEES
  const employeeAllowedTabs = [
    TabView.TASKS,
    TabView.ATTENDANCE,
    TabView.EXPENSES,
    TabView.PERFORMANCE,
    TabView.PROFILE
  ];

  const hasAccess = (tab: TabView) => {
    if (userRole === 'Admin') return true;
    return employeeAllowedTabs.includes(tab);
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
            ? 'bg-gradient-to-r from-medical-600 to-teal-500 text-white shadow-lg shadow-medical-900/20' 
            : 'text-slate-400 hover:bg-emerald-900/40 hover:text-white'
        }`}
        title={!isSidebarOpen ? label : ''}
        >
        <Icon size={20} className={activeTab === tab ? 'text-white' : ''} />
        {isSidebarOpen && <span>{label}</span>}
        </button>
    );
  };

  const renderContent = () => {
    // Security check for content rendering
    if (!hasAccess(activeTab)) {
        return <div className="p-10 text-center text-slate-500">Access Denied</div>;
    }

    switch (activeTab) {
      case TabView.DASHBOARD: return <Dashboard />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.SERVICE: return <ServiceModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule tasks={tasks} currentUser={currentUser} userRole={userRole} />;
      case TabView.TASKS: return <TaskModule tasks={tasks} setTasks={setTasks} currentUser={currentUser} isAdmin={userRole === 'Admin'} />;
      case TabView.HR: return <HRModule />;
      case TabView.PROFILE: return <ProfileModule userRole={userRole} setUserRole={setUserRole} currentUser={currentUser} />;
      case TabView.QUOTES: return <BillingModule variant="quotes" />;
      case TabView.BILLING: return <BillingModule variant="billing" />;
      case TabView.CLIENTS: return <ClientModule />;
      case TabView.DELIVERY: return <DeliveryChallanModule />;
      case TabView.REPORTS: return <ReportsModule />;
      case TabView.EXPENSES: return <ExpenseModule />;
      case TabView.PERFORMANCE: return <PerformanceModule />;
      case TabView.SUPPORT: return <PlaceholderModule title="Support Tickets" desc="Customer support portal for ticket management and resolution tracking." />;
      default: return <Dashboard />;
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden relative font-sans">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
            bg-gradient-to-b from-[#022c22] to-emerald-950 text-white flex flex-col z-30 transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
            ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}
            fixed md:relative h-full shadow-2xl
        `}>
          {/* Sidebar Header */}
          <div className="p-6 h-20 flex items-center gap-3">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="text-slate-400 hover:text-white transition-colors"
                title="Toggle Menu"
             >
                <Menu size={24} />
             </button>
             
             {isSidebarOpen && (
                <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                    <div className="bg-gradient-to-br from-medical-500 to-teal-400 p-1.5 rounded-xl shadow-lg shadow-medical-500/20">
                        <PlusCircle size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">MedEquip</span>
                </div>
             )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
            {/* Common Items / Employee View */}
            {isSidebarOpen && userRole === 'Employee' && <div className="px-6 mb-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">My Work</div>}
            
            {/* Admin Items */}
            {userRole === 'Admin' && (
                <>
                    {isSidebarOpen && <div className="px-6 mb-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sales & CRM</div>}
                    <NavItem tab={TabView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
                    <NavItem tab={TabView.LEADS} icon={Users} label="Lead CRM" />
                    <NavItem tab={TabView.QUOTES} icon={FileText} label="Quotations" />
                    <NavItem tab={TabView.CLIENTS} icon={Contact} label="Client Database" />
                    
                    {isSidebarOpen && <div className="px-6 mb-3 mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operations</div>}
                </>
            )}

            <NavItem tab={TabView.TASKS} icon={CheckSquare} label="Task Manager" />
            <NavItem tab={TabView.ATTENDANCE} icon={Clock} label="Attendance" />
            <NavItem tab={TabView.EXPENSES} icon={Receipt} label="My Expenses" />
            <NavItem tab={TabView.PERFORMANCE} icon={Trophy} label="Performance" />

            {userRole === 'Admin' && (
                <>
                    <NavItem tab={TabView.INVENTORY} icon={Package} label="Inventory" />
                    <NavItem tab={TabView.DELIVERY} icon={Truck} label="Delivery Challan" />
                    <NavItem tab={TabView.SERVICE} icon={Wrench} label="Service & AMC" />
                    
                    {isSidebarOpen && <div className="px-6 mb-3 mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin</div>}
                    <NavItem tab={TabView.HR} icon={UserCheck} label="HR & Payroll" />
                    <NavItem tab={TabView.BILLING} icon={PieChart} label="Billing" />
                    <NavItem tab={TabView.REPORTS} icon={BarChart3} label="Reports" />
                    <NavItem tab={TabView.SUPPORT} icon={Headset} label="Support" />
                </>
            )}
          </div>

          <div className="p-4">
            <button className="flex items-center gap-3 text-slate-400 hover:text-rose-200 hover:bg-rose-900/30 w-full px-4 py-3 rounded-2xl transition-all group">
              <LogOut size={20} className="group-hover:text-rose-400" />
              {isSidebarOpen && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-slate-50/50">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-3 flex items-center justify-between shrink-0 h-20 sticky top-0 z-10">
             <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button 
                    onClick={() => setIsSidebarOpen(true)} 
                    className={`text-slate-500 hover:text-slate-700 md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}
                >
                    <Menu size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {activeTab === TabView.DASHBOARD && 'Dashboard'}
                        {activeTab === TabView.LEADS && 'Lead Management'}
                        {activeTab === TabView.SERVICE && 'Service & Maintenance'}
                        {activeTab === TabView.INVENTORY && 'Inventory Management'}
                        {activeTab === TabView.ATTENDANCE && 'Attendance & Field Tracking'}
                        {activeTab === TabView.TASKS && 'Task Manager'}
                        {activeTab === TabView.HR && 'HR & Payroll Management'}
                        {activeTab === TabView.PROFILE && 'User Profile'}
                        {activeTab === TabView.QUOTES && 'Quotation Builder'}
                        {activeTab === TabView.BILLING && 'Invoices & Billing'}
                        {activeTab === TabView.DELIVERY && 'Delivery Challans'}
                        {activeTab === TabView.REPORTS && 'Analytics & Reports'}
                        {activeTab === TabView.CLIENTS && 'Client Management'}
                        {activeTab === TabView.EXPENSES && 'Expense Management'}
                        {activeTab === TabView.PERFORMANCE && 'My Performance'}
                        {![TabView.DASHBOARD, TabView.LEADS, TabView.SERVICE, TabView.INVENTORY, TabView.ATTENDANCE, TabView.TASKS, TabView.HR, TabView.PROFILE, TabView.QUOTES, TabView.BILLING, TabView.DELIVERY, TabView.REPORTS, TabView.CLIENTS, TabView.EXPENSES, TabView.PERFORMANCE].includes(activeTab) && 'Module'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium hidden sm:block">Overview and updates</p>
                </div>
             </div>
             
             <div className="flex items-center gap-5">
                {/* Notification Bell with Dropdown */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2.5 rounded-full transition-all ${showNotifications ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    Notifications <span className="bg-medical-100 text-medical-600 px-2 py-0.5 rounded-full text-xs">{unreadCount}</span>
                                </h4>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-[10px] font-bold text-medical-600 hover:text-medical-700 hover:underline flex items-center gap-1">
                                        <Check size={12} /> Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {notifications.length > 0 ? (
                                    notifications.map(notification => (
                                        <div 
                                            key={notification.id} 
                                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 relative group ${!notification.read ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className={`mt-1 p-1.5 rounded-full h-fit shrink-0 ${!notification.read ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100 text-slate-400'}`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 pr-4">
                                                <h5 className={`text-xs font-bold mb-0.5 ${!notification.read ? 'text-slate-800' : 'text-slate-600'}`}>{notification.title}</h5>
                                                <p className="text-xs text-slate-500 leading-relaxed mb-1.5">{notification.message}</p>
                                                <span className="text-[10px] text-slate-400 font-medium">{notification.time}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => dismissNotification(notification.id, e)}
                                                className="absolute top-3 right-3 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                <X size={14} />
                                            </button>
                                            {!notification.read && (
                                                <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                        <Bell size={24} className="mb-2 opacity-50" />
                                        <p className="text-xs font-medium">No new notifications</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                                <button className="text-xs font-bold text-slate-500 hover:text-medical-600 transition-colors">View All Activity</button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* User Profile / Role Switcher */}
                <div 
                    onClick={() => setActiveTab(TabView.PROFILE)}
                    className={`flex items-center gap-3 pl-5 border-l border-slate-200 cursor-pointer group select-none ${activeTab === TabView.PROFILE ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                    title="Manage Profile & Settings"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-medical-600 transition-colors">
                            {userRole === 'Admin' ? 'Admin User' : 'Rahul Sharma'}
                        </p>
                        <p className="text-xs text-slate-400 font-medium group-hover:text-slate-500">
                            {userRole === 'Admin' ? 'Manager' : 'Employee ID: EMP001'}
                        </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border border-white shadow-sm ring-2 transition-all ${
                        userRole === 'Admin' 
                        ? 'bg-gradient-to-br from-medical-100 to-teal-100 text-medical-700 ring-medical-50' 
                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 ring-slate-50'
                    }`}>
                        {userRole === 'Admin' ? 'A' : 'R'}
                    </div>
                    <ChevronDown size={14} className="text-slate-300 group-hover:text-medical-500" />
                </div>
             </div>
          </header>

          {/* Module Content Area */}
          <div className="flex-1 p-3 md:p-6 overflow-hidden">
             {renderContent()}
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
