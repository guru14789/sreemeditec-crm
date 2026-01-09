import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, DollarSign, Activity, Calendar, Receipt, ArrowUpRight, Clock, User, Zap } from 'lucide-react';
import { useData } from './DataContext';

const dataSales = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const Dashboard: React.FC = () => {
  const { tasks, serviceTickets, pointHistory } = useData();

  const dataTickets = [
    { name: 'Open', value: serviceTickets.filter(t => t.status === 'Open').length || 5 },
    { name: 'In Progress', value: serviceTickets.filter(t => t.status === 'In Progress').length || 3 },
    { name: 'Resolved', value: serviceTickets.filter(t => t.status === 'Resolved').length || 12 },
  ];

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-4 custom-scrollbar">
      
      {/* Revenue Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2 ml-1">
            <DollarSign size={14} /> Revenue Snapshot
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-[2.5rem] shadow-lg shadow-emerald-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={100} /></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-emerald-300 backdrop-blur-sm group-hover:scale-110 transition-transform"><Activity size={24} /></div>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={12} /> +4.2%</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-200/80 uppercase tracking-widest">Today's Revenue</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹4.25K</h3>
                    <p className="text-xs text-emerald-200/60 mt-1 font-medium">vs ₹3.8K yesterday</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-[2.5rem] shadow-lg shadow-blue-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Calendar size={100} /></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-blue-200 backdrop-blur-sm group-hover:scale-110 transition-transform"><Calendar size={24} /></div>
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={12} /> +12%</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-blue-200/80 uppercase tracking-widest">This Week</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹28.4K</h3>
                    <p className="text-xs text-blue-200/60 mt-1 font-medium">Oct 22 - Oct 28</p>
                </div>
            </div>

            <div className="bg-gradient-to-br from-violet-800 to-purple-900 p-6 rounded-[2.5rem] shadow-lg shadow-purple-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet size={100} /></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-purple-200 backdrop-blur-sm group-hover:scale-110 transition-transform"><Wallet size={24} /></div>
                    <span className="flex items-center gap-1 text-xs font-bold text-purple-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm"><TrendingUp size={12} /> +8.5%</span>
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-purple-200/80 uppercase tracking-widest">This Month</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹1.25L</h3>
                    <p className="text-xs text-purple-200/60 mt-1 font-medium">Target: ₹1.1L</p>
                </div>
            </div>
        </div>
      </div>

      {/* Operations & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Field Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[420px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100 uppercase tracking-[0.25em] flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div> Live Field Terminal
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {tasks.slice(0, 8).map(task => (
                    <div key={task.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:bg-white transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}><Clock size={16} /></div>
                            <div>
                                <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{task.assignedTo}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{task.status}</span>
                                </div>
                            </div>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                ))}
            </div>
        </div>

        {/* Performance Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-[420px]">
             <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100 uppercase tracking-[0.25em] flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Recognition Feed
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {pointHistory.slice(0, 8).map(log => (
                    <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Zap size={16} fill="currentColor" /></div>
                            <div>
                                <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight leading-tight">{log.description}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Awarded to Registry ID: {log.userId}</p>
                            </div>
                         </div>
                         <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">+{log.points}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 h-96 flex flex-col">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest">Revenue Forecast</h3>
                <select className="text-[10px] font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-600 dark:text-slate-300 outline-none uppercase">
                    <option>Quarterly</option>
                    <option>Monthly</option>
                </select>
            </div>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSales}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                        <Tooltip cursor={{fill: '#f0fdf4'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                        <Bar dataKey="sales" fill="url(#colorSales)" radius={[8, 8, 8, 8]}>
                            {dataSales.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 h-96 flex flex-col">
            <h3 className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-widest mb-8 shrink-0">Field Service Status</h3>
            <div className="flex-1 min-h-0 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataTickets} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                            {dataTickets.map((entry, index) => (
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