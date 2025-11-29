
import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Package, Wrench, 
  UserCheck, Receipt, ShoppingCart, Headset, BarChart3, 
  Menu, Bell, LogOut, Clock, PlusCircle, CheckSquare
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { LeadsModule } from './components/LeadsModule';
import { ServiceModule } from './components/ServiceModule';
import { InventoryModule } from './components/InventoryModule';
import { AttendanceModule } from './components/AttendanceModule';
import { HRModule } from './components/HRModule';
import { TaskModule } from './components/TaskModule';
import { TabView } from './types';

// Placeholder for unimplemented modules
const PlaceholderModule: React.FC<{title: string, desc: string}> = ({title, desc}) => (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
        <div className="bg-slate-100 p-6 rounded-full mb-4">
            <Wrench size={48} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-600 text-center">{title}</h2>
        <p className="max-w-md text-center mt-2">{desc}</p>
        <p className="text-xs mt-8 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">Coming Soon in Full Version</p>
    </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabView, icon: React.ElementType, label: string }) => (
    <button 
      onClick={() => {
        setActiveTab(tab);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
        activeTab === tab 
          ? 'bg-medical-900/50 text-white border-medical-500' 
          : 'text-slate-300 hover:bg-medical-900/30 hover:text-white border-transparent'
      }`}
      title={!isSidebarOpen ? label : ''}
    >
      <Icon size={20} className={activeTab === tab ? 'text-medical-500' : ''} />
      {isSidebarOpen && <span>{label}</span>}
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case TabView.DASHBOARD: return <Dashboard />;
      case TabView.LEADS: return <LeadsModule />;
      case TabView.SERVICE: return <ServiceModule />;
      case TabView.INVENTORY: return <InventoryModule />;
      case TabView.ATTENDANCE: return <AttendanceModule />;
      case TabView.TASKS: return <TaskModule />;
      case TabView.HR: return <HRModule />;
      case TabView.QUOTES: return <PlaceholderModule title="Quotations" desc="Create and manage multi-version quotations with tax calculation and PDF export." />;
      case TabView.BILLING: return <PlaceholderModule title="Billing & GST" desc="Generate GST compliant invoices, track payments, and manage expenses." />;
      case TabView.SUPPORT: return <PlaceholderModule title="Support Tickets" desc="Customer support portal for ticket management and resolution tracking." />;
      case TabView.REPORTS: return <PlaceholderModule title="Reports & Analytics" desc="Deep dive analytics into sales performance, service efficiency, and financial health." />;
      default: return <Dashboard />;
    }
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden relative">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
            bg-[#022c22] text-white flex flex-col z-30 transition-all duration-300 ease-in-out border-r border-emerald-900
            ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}
            fixed md:relative h-full
        `}>
          {/* Sidebar Header */}
          <div className="p-4 h-16 flex items-center gap-3 border-b border-emerald-900">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="text-slate-400 hover:text-white transition-colors"
                title="Toggle Menu"
             >
                <Menu size={24} />
             </button>
             
             {isSidebarOpen && (
                <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
                    <div className="bg-medical-600 p-1.5 rounded-lg">
                        <PlusCircle size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">MedEquip</span>
                </div>
             )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-1">
            {isSidebarOpen && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales</div>}
            <NavItem tab={TabView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem tab={TabView.LEADS} icon={Users} label="Lead CRM" />
            <NavItem tab={TabView.QUOTES} icon={FileText} label="Quotations" />
            
            {isSidebarOpen && <div className="px-4 mb-2 mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations</div>}
            <NavItem tab={TabView.TASKS} icon={CheckSquare} label="Task Manager" />
            <NavItem tab={TabView.INVENTORY} icon={Package} label="Inventory" />
            <NavItem tab={TabView.SERVICE} icon={Wrench} label="Service & AMC" />
            <NavItem tab={TabView.ATTENDANCE} icon={Clock} label="Attendance" />
            
            {isSidebarOpen && <div className="px-4 mb-2 mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</div>}
            <NavItem tab={TabView.HR} icon={UserCheck} label="HR & Payroll" />
            <NavItem tab={TabView.BILLING} icon={Receipt} label="Billing" />
            <NavItem tab={TabView.SUPPORT} icon={Headset} label="Support" />
            <NavItem tab={TabView.REPORTS} icon={BarChart3} label="Reports" />
          </div>

          <div className="p-4 border-t border-emerald-900">
            <button className="flex items-center gap-3 text-slate-400 hover:text-white w-full px-2 py-2 rounded-lg hover:bg-emerald-900 transition-colors">
              <LogOut size={20} />
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 h-16">
             <div className="flex items-center gap-4">
                {/* Mobile Menu Button (Only visible when sidebar is fully hidden on mobile) */}
                <button 
                    onClick={() => setIsSidebarOpen(true)} 
                    className={`text-slate-500 hover:text-slate-700 md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}
                >
                    <Menu size={24} />
                </button>
                <h2 className="text-xl font-semibold text-slate-800">
                    {activeTab === TabView.DASHBOARD && 'Dashboard'}
                    {activeTab === TabView.LEADS && 'Lead Management'}
                    {activeTab === TabView.SERVICE && 'Service & Maintenance'}
                    {activeTab === TabView.INVENTORY && 'Inventory Management'}
                    {activeTab === TabView.ATTENDANCE && 'Attendance & Field Tracking'}
                    {activeTab === TabView.TASKS && 'Task Manager'}
                    {activeTab === TabView.HR && 'HR & Payroll Management'}
                    {![TabView.DASHBOARD, TabView.LEADS, TabView.SERVICE, TabView.INVENTORY, TabView.ATTENDANCE, TabView.TASKS, TabView.HR].includes(activeTab) && 'Module'}
                </h2>
             </div>
             
             <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-700">Admin User</p>
                        <p className="text-xs text-slate-500">Manager</p>
                    </div>
                    <div className="w-9 h-9 bg-medical-100 text-medical-700 rounded-full flex items-center justify-center font-bold border-2 border-medical-50">
                        A
                    </div>
                </div>
             </div>
          </header>

          {/* Module Content Area */}
          <div className="flex-1 p-4 md:p-6 overflow-hidden">
             {renderContent()}
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
