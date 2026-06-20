import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Wallet, DollarSign, Activity, Calendar, ArrowUpRight, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { useData } from './DataContext';

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const Dashboard: React.FC = () => {
  const { tasks, serviceTickets, pointHistory, invoices, expenseStats, currentUser: authUser } = useData();

  const isAdmin = authUser?.role === 'SYSTEM_ADMIN' || authUser?.department === 'Administration';

  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks;
    if (!authUser?.name) return [];
    const authName = authUser.name.trim().toLowerCase();
    return tasks.filter(t => (t.assignedTo || '').trim().toLowerCase() === authName);
  }, [tasks, isAdmin, authUser]);

  const visibleTickets = useMemo(() => {
    if (isAdmin) return serviceTickets;
    if (!authUser?.name) return [];
    const authName = authUser.name.trim().toLowerCase();
    return serviceTickets.filter(t => (t.assignedTo || '').trim().toLowerCase() === authName);
  }, [serviceTickets, isAdmin, authUser]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseInvoices = isAdmin 
        ? invoices 
        : invoices.filter(inv => inv.createdBy === authUser?.name);

    const validInvoices = baseInvoices.filter(inv => 
        (inv.documentType === 'Invoice' || !inv.documentType) && 
        inv.status !== 'Draft' && 
        inv.status !== 'Cancelled'
    );

    const todayRevenue = validInvoices.filter(inv => inv.date === today).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const weekRevenue = validInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startOfWeek && invDate <= now;
    }).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const monthRevenue = validInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startOfMonth && invDate <= now;
    }).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const dailySales = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayRev = validInvoices
        .filter(inv => inv.date === dStr)
        .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      dailySales.push({ name: dayName, sales: dayRev });
    }

    return { todayRevenue, weekRevenue, monthRevenue, dailySales };
  }, [invoices, isAdmin, authUser?.name]);

  const dataTickets = useMemo(() => [
    { name: 'Open', value: visibleTickets.filter(t => t.status === 'Open').length },
    { name: 'In Progress', value: visibleTickets.filter(t => t.status === 'In Progress').length },
    { name: 'Resolved', value: visibleTickets.filter(t => t.status === 'Resolved').length },
  ], [visibleTickets]);

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`;
    if (val >= 1000) return `₹${(val / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
    return `₹${val.toFixed(0)}`;
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 md:space-y-7 px-3 sm:px-4 md:px-6 pb-4 custom-scrollbar bg-[#F3F0E8]">
      
      {/* Revenue Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={13} className="text-emerald-600" /> Sales Snapshot
          </h3>
          <span className="text-[7px] font-bold text-slate-400 uppercase">This Period</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 min-h-[120px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-300 group-hover:scale-110 transition-transform">
                <Activity size={15} />
              </div>
              <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <TrendingUp size={8} /> Today
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-emerald-300/80 uppercase tracking-widest leading-none">Today's Sales</p>
 <h3 className="text-lg font-bold tracking-tight text-white mt-1">{formatCurrency(stats.todayRevenue)}</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-4 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 min-h-[120px]">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-100 group-hover:scale-110 transition-transform">
                <Calendar size={15} />
              </div>
              <span className="flex items-center gap-1 text-[7px] font-black bg-emerald-300/20 text-emerald-100 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <TrendingUp size={8} /> {((stats.weekRevenue / (stats.monthRevenue || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-emerald-100/80 uppercase tracking-widest leading-none">Weekly Goal</p>
 <h3 className="text-lg font-bold tracking-tight text-white mt-1">{formatCurrency(stats.weekRevenue)}</h3>
            </div>
          </div>

          <div className="p-4 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300 min-h-[120px]" style={{ background: 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)' }}>
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_1px_2px_rgba(255,255,255,0.2)] text-amber-950 group-hover:scale-110 transition-transform">
                <Wallet size={15} />
              </div>
              <span className="flex items-center gap-1 text-[7px] font-black bg-amber-950/25 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Monthly
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-amber-950/80 uppercase tracking-widest leading-none">Monthly Intake</p>
 <h3 className="text-lg font-bold tracking-tight text-amber-950 mt-1">{formatCurrency(stats.monthRevenue)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Snapshot */}
      <div className="space-y-3">
        <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
          <Wallet size={13} className="text-emerald-600" /> Live Workspace Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-3 rounded-[2rem] shadow-[0_15px_30px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 min-h-[100px]">
            <div className="flex justify-between items-start mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-300 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={12} />
              </div>
              <span className="flex items-center gap-1 text-[6.5px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <CheckCircle2 size={8} /> CLEARED
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-emerald-300/80 uppercase tracking-widest leading-none">Approved</p>
 <h3 className="text-base font-bold tracking-tight text-white mt-1">{formatCurrency(expenseStats?.approved || 0)}</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-3 rounded-[2rem] shadow-[0_15px_30px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 min-h-[100px]">
            <div className="flex justify-between items-start mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-100 group-hover:scale-110 transition-transform">
                <Clock size={12} />
              </div>
              <span className="flex items-center gap-1 text-[6.5px] font-black bg-emerald-300/20 text-emerald-100 border border-emerald-400/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Clock size={8} /> AWAITING
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-emerald-100/80 uppercase tracking-widest leading-none">Pending</p>
 <h3 className="text-base font-bold tracking-tight text-white mt-1">{formatCurrency(expenseStats?.pending || 0)}</h3>
            </div>
          </div>

          <div className="p-3 rounded-[2rem] shadow-[0_15px_30px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all duration-300 min-h-[100px]" style={{ background: 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)' }}>
            <div className="flex justify-between items-start mb-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_1px_2px_rgba(255,255,255,0.2)] text-amber-950 group-hover:scale-110 transition-transform">
                <XCircle size={12} />
              </div>
              <span className="flex items-center gap-1 text-[6.5px] font-black bg-amber-950/25 text-amber-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <XCircle size={8} /> DECLINED
              </span>
            </div>
            <div>
              <p className="text-[8px] font-extrabold text-amber-950/80 uppercase tracking-widest leading-none">Rejected</p>
 <h3 className="text-base font-bold tracking-tight text-amber-950 mt-1">{formatCurrency(expenseStats?.rejected || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-emerald-950/5 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[280px] md:min-h-[400px]">
          <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> Field Terminal
              </h3>
            </div>
            <span className="text-[7px] font-bold text-slate-400 uppercase">{visibleTasks.slice(0, 8).length} tasks</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {visibleTasks.slice(0, 8).map(task => (
              <div key={task.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-[2rem] text-[10px] ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400 shadow-sm border border-slate-200'}`}><Clock size={14} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{task.assignedTo}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{task.status}</span>
                    </div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-emerald-950/5 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[280px] md:min-h-[400px]">
          <div className="flex justify-between items-center mb-4 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Recognition
              </h3>
            </div>
            <span className="text-[7px] font-bold text-slate-400 uppercase">{pointHistory.slice(0, 8).length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {pointHistory.slice(0, 8).map(log => (
              <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-sm transition-all duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[2rem]"><Zap size={14} fill="currentColor" /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">{log.description}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Asset ID: {log.userId}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg shrink-0">+{log.points}</span>
              </div>
            ))}
            {pointHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                <Zap size={48} className="mb-4 text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Recent Milestones</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-emerald-950/5 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[250px] md:min-h-[350px]">
          <div className="flex justify-between items-center mb-5 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest">Internal Forecast</h3>
              <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Revenue Trend</p>
            </div>
            <select className="text-[9px] font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-600 dark:text-slate-300 outline-none uppercase">
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip cursor={{fill: '#f0fdf4'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                <Bar dataKey="sales" radius={[8, 8, 8, 8]}>
                  {stats.dailySales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-emerald-950/5 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[250px] md:min-h-[350px]">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5 shrink-0">
            <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-widest">Field Service Status</h3>
            <p className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Ticket Distribution</p>
          </div>
          <div className="flex-1 min-h-0 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataTickets} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  {dataTickets.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
 <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">{serviceTickets.length}</span>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Total Jobs</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[10px] mt-5 shrink-0">
            {dataTickets.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: COLORS[index]}}></div>
                <span className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{entry.name} <span className="opacity-40">({entry.value})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
