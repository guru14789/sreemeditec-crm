
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, DollarSign, Activity, Calendar, Receipt, ArrowUpRight } from 'lucide-react';

const dataSales = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
  { name: 'Sun', sales: 3490 },
];

const dataTickets = [
  { name: 'Open', value: 5 },
  { name: 'In Progress', value: 3 },
  { name: 'Resolved', value: 12 },
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const Dashboard: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-4">
      
      {/* Revenue Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <DollarSign size={16} /> Revenue Snapshot
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Day Revenue */}
            <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-emerald-300 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Activity size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        <TrendingUp size={12} /> +4.2%
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider">Today's Revenue</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹4.25K</h3>
                    <p className="text-xs text-emerald-200/60 mt-1 font-medium">vs ₹3.8K yesterday</p>
                </div>
            </div>

            {/* Week Revenue */}
            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-3xl shadow-lg shadow-blue-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-blue-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Calendar size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-blue-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        <TrendingUp size={12} /> +12%
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-200/80 uppercase tracking-wider">This Week</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹28.4K</h3>
                    <p className="text-xs text-blue-200/60 mt-1 font-medium">Oct 22 - Oct 28</p>
                </div>
            </div>

            {/* Month Revenue */}
            <div className="bg-gradient-to-br from-violet-800 to-purple-900 p-6 rounded-3xl shadow-lg shadow-purple-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-purple-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Wallet size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-purple-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        <TrendingUp size={12} /> +8.5%
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-purple-200/80 uppercase tracking-wider">This Month</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹1.25L</h3>
                    <p className="text-xs text-purple-200/60 mt-1 font-medium">Target: ₹1.1L</p>
                </div>
            </div>
        </div>
      </div>

      {/* Expense Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Receipt size={16} /> Expense Tracking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Day Expense */}
            <div className="bg-gradient-to-br from-rose-800 to-red-900 p-6 rounded-3xl shadow-lg shadow-rose-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Receipt size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                     <div className="bg-white/10 p-3 rounded-2xl text-rose-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Receipt size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm uppercase">
                        High Vol
                    </span>
                </div>
                <div className="relative z-10">
                     <p className="text-xs font-bold text-rose-200/80 uppercase tracking-wider">Today's Expense</p>
                     <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹850.00</h3>
                     <p className="text-xs text-rose-200/60 mt-1 font-medium">Logistics & Fuel</p>
                </div>
            </div>

            {/* Month Expense */}
            <div className="bg-gradient-to-br from-orange-700 to-amber-800 p-6 rounded-3xl shadow-lg shadow-orange-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CreditCard size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                     <div className="bg-white/10 p-3 rounded-2xl text-orange-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <CreditCard size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-100 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        <TrendingDown size={12} /> Stable
                    </span>
                </div>
                <div className="relative z-10">
                     <p className="text-xs font-bold text-orange-200/80 uppercase tracking-wider">Monthly Expenses</p>
                     <h3 className="text-3xl font-black text-white mt-1 tracking-tight">₹38.2K</h3>
                     <p className="text-xs text-orange-200/60 mt-1 font-medium">Salaries, Stock, Utilities</p>
                </div>
            </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-80 flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-bold text-lg text-slate-700">Week Performance</h3>
                <select className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 outline-none">
                    <option>Revenue</option>
                    <option>Orders</option>
                </select>
            </div>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSales}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                        <Tooltip 
                            cursor={{fill: '#f0fdf4'}}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} 
                        />
                        <Bar dataKey="sales" fill="url(#colorSales)" radius={[6, 6, 6, 6]}>
                            {
                                dataSales.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 6 ? '#059669' : '#0284c7'} />
                                ))
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-80 flex flex-col">
            <h3 className="font-bold text-lg mb-4 text-slate-700 shrink-0">Service Ticket Status</h3>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dataTickets}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {dataTickets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
             <div className="flex flex-wrap justify-center gap-6 text-xs mt-2 shrink-0">
                {dataTickets.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: COLORS[index]}}></div>
                        <span className="font-medium text-slate-600">{entry.name} <span className="text-slate-400">({entry.value})</span></span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
