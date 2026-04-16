import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Wallet, DollarSign, Activity, Calendar, ArrowUpRight, Clock, Zap } from 'lucide-react';
import { useData } from './DataContext';

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const Dashboard: React.FC = () => {
  const { tasks, serviceTickets, pointHistory, invoices } = useData();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter valid sales (Invoices) - including all non-quote/non-supplier-po documents to find missing value
    const validInvoices = invoices.filter(inv => 
        inv.documentType !== 'Quotation' && 
        inv.documentType !== 'SupplierPO' &&
        inv.status !== 'Draft' && 
        inv.status !== 'Cancelled'
    );

    const todayInvoices = validInvoices.filter(inv => inv.date === today);
    const todayRevenue = todayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const weekInvoices = validInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startOfWeek && invDate <= now;
    });
    const weekRevenue = weekInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const monthInvoices = validInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      return invDate >= startOfMonth && invDate <= now;
    });
    const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    // Calculate daily sales for last 7 days for the bar chart
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
  }, [invoices]);

  const dataTickets = [
    { name: 'Open', value: serviceTickets.filter(t => t.status === 'Open').length },
    { name: 'In Progress', value: serviceTickets.filter(t => t.status === 'In Progress').length },
    { name: 'Resolved', value: serviceTickets.filter(t => t.status === 'Resolved').length },
  ];

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(2)}K`;
    return `₹${val.toFixed(0)}`;
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 md:space-y-5 pr-1 pb-4 custom-scrollbar">
      
      {/* Revenue Section */}
      <div className="space-y-2.5">
        <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
            <DollarSign size={13} /> Sales Snapshot
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg shadow-emerald-900/10 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={80} /></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="bg-white/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl text-emerald-300 backdrop-blur-sm group-hover:scale-110 transition-transform"><Activity size={20} /></div>
                    <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-emerald-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={11} /> Live</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] md:text-[10px] font-black text-emerald-200/80 uppercase tracking-widest">Today's Sales</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white mt-0.5 md:mt-1 tracking-tight">{formatCurrency(stats.todayRevenue)}</h3>
                    <p className="text-[10px] md:text-xs text-emerald-200/60 mt-0.5 md:mt-1 font-medium italic underline decoration-emerald-500/30">Synced with Registry</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg shadow-blue-900/10 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar size={80} /></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="bg-white/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl text-blue-200 backdrop-blur-sm group-hover:scale-110 transition-transform"><Calendar size={20} /></div>
                    <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-blue-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={11} /> {((stats.weekRevenue / (stats.monthRevenue || 1)) * 100).toFixed(0)}%</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] md:text-[10px] font-black text-blue-200/80 uppercase tracking-widest">Weekly Goal</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white mt-0.5 md:mt-1 tracking-tight">{formatCurrency(stats.weekRevenue)}</h3>
                    <p className="text-[10px] md:text-xs text-blue-200/60 mt-0.5 md:mt-1 font-medium italic tracking-tighter">Current Week Cycle</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-violet-800 to-purple-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg shadow-purple-900/10 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={80} /></div>
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="bg-white/10 p-2 md:p-2.5 rounded-xl md:rounded-2xl text-purple-200 backdrop-blur-sm group-hover:scale-110 transition-transform"><Wallet size={20} /></div>
                    <span className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-purple-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={11} /> Monthly</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] md:text-[10px] font-black text-purple-200/80 uppercase tracking-widest">Monthly Intake</p>
                    <h3 className="text-2xl md:text-3xl font-black text-white mt-0.5 md:mt-1 tracking-tight">{formatCurrency(stats.monthRevenue)}</h3>
                    <p className="text-[10px] md:text-xs text-purple-200/60 mt-0.5 md:mt-1 font-medium italic underline decoration-purple-500/30">MOM Growth Engine</p>
                </div>
            </div>
        </div>
      </div>

      {/* Operations & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Real-time Field Feed */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col h-[380px] md:h-[400px]">
            <div className="flex justify-between items-center mb-4 md:mb-5 shrink-0">
                <h3 className="font-black text-[10px] md:text-xs text-slate-800 dark:text-slate-100 uppercase tracking-[0.25em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> Field Terminal
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 custom-scrollbar pr-1">
                {tasks.slice(0, 8).map(task => (
                    <div key={task.id} className="p-3 md:p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl md:rounded-2xl border border-slate-300 dark:border-slate-800 flex items-center justify-between group hover:bg-white transition-all shadow-sm shadow-slate-200/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl text-[10px] ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}><Clock size={14} /></div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">{task.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[7.5px] md:text-[8px] font-black text-indigo-500 uppercase tracking-widest">{task.assignedTo}</span>
                                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                                    <span className="text-[7.5px] md:text-[8px] font-bold text-slate-400 uppercase">{task.status}</span>
                                </div>
                            </div>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                ))}
            </div>
        </div>

        {/* Performance Feed */}
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col h-[380px] md:h-[400px]">
             <div className="flex justify-between items-center mb-4 md:mb-5 shrink-0">
                <h3 className="font-black text-[10px] md:text-xs text-slate-800 dark:text-slate-100 uppercase tracking-[0.25em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Recognition
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 custom-scrollbar pr-1">
                {pointHistory.slice(0, 8).map(log => (
                    <div key={log.id} className="p-3 md:p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl md:rounded-2xl border border-slate-300 dark:border-slate-800 flex items-center justify-between shadow-sm shadow-slate-200/50 hover:bg-white transition-all">
                         <div className="flex items-center gap-3">
                            <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl"><Zap size={14} fill="currentColor" /></div>
                            <div>
                                <p className="text-[10px] md:text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight leading-tight">{log.description}</p>
                                <p className="text-[7.5px] md:text-[8px] font-bold text-slate-400 uppercase mt-0.5">Asset ID: {log.userId}</p>
                            </div>
                         </div>
                         <span className="text-[9px] md:text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">+{log.points}</span>
                    </div>
                ))}
                {pointHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                        <Zap size={48} className="mb-4 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Recent Milestones</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 h-80 md:h-96 flex flex-col">
            <div className="flex justify-between items-center mb-5 md:mb-8 shrink-0">
                <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-[10px] md:text-xs tracking-widest">Internal Forecast</h3>
                <select className="text-[9px] md:text-[10px] font-black bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg md:rounded-xl px-2.5 py-1 text-slate-600 dark:text-slate-300 outline-none uppercase">
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
                        <Bar dataKey="sales" fill="url(#colorSales)" radius={[8, 8, 8, 8]}>
                            {stats.dailySales.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-300 dark:border-slate-800 h-96 flex flex-col">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest mb-8 shrink-0">Field Service Status</h3>
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
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{serviceTickets.length}</span>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Jobs</p>
                    </div>
                </div>
            </div>
             <div className="flex flex-wrap justify-center gap-6 text-[10px] mt-4 shrink-0">
                {dataTickets.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: COLORS[index]}}></div>
                        <span className="font-black uppercase text-slate-500 dark:text-slate-400 tracking-tighter">{entry.name} <span className="opacity-40">({entry.value})</span></span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};