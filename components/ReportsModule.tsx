
import React, { useState } from 'react';
import { 
  ComposedChart, Line, Area, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  FileText, Download, Calendar, TrendingUp, TrendingDown, 
  DollarSign, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, 
  Filter, MoreHorizontal, Users 
} from 'lucide-react';

// Helper for Indian Number Formatting (K, L, Cr)
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  }
  if (num >= 100000) {
    return (num / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  }
  return num.toString();
};

// Mock Data for Charts
const MONTHLY_PERFORMANCE = [
  { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
  { month: 'Feb', revenue: 52000, expenses: 34000, profit: 18000 },
  { month: 'Mar', revenue: 48000, expenses: 31000, profit: 17000 },
  { month: 'Apr', revenue: 61000, expenses: 42000, profit: 19000 },
  { month: 'May', revenue: 55000, expenses: 38000, profit: 17000 },
  { month: 'Jun', revenue: 67000, expenses: 44000, profit: 23000 },
  { month: 'Jul', revenue: 72000, expenses: 46000, profit: 26000 },
  { month: 'Aug', revenue: 69000, expenses: 45000, profit: 24000 },
  { month: 'Sep', revenue: 78000, expenses: 49000, profit: 29000 },
  { month: 'Oct', revenue: 85000, expenses: 52000, profit: 33000 },
];

const CATEGORY_DATA = [
  { name: 'Medical Equipment', value: 45 },
  { name: 'Consumables', value: 30 },
  { name: 'Spare Parts', value: 15 },
  { name: 'Service & AMC', value: 10 },
];

const TOP_PRODUCTS = [
  { name: 'Philips MRI Coil', sales: 120, revenue: 1800000 },
  { name: 'Ultrasound Gel', sales: 850, revenue: 212500 },
  { name: 'ECG Monitor X12', sales: 45, revenue: 540000 },
  { name: 'Surgical Gloves', sales: 2000, revenue: 300000 },
];

const LEAD_SOURCE_DATA = [
  { source: 'Website', leads: 150, converted: 45 },
  { source: 'Referral', leads: 80, converted: 50 },
  { source: 'IndiaMART', leads: 200, converted: 20 },
  { source: 'Walk-in', leads: 40, converted: 15 },
  { source: 'Social Media', leads: 90, converted: 10 },
];

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6'];

export const ReportsModule: React.FC = () => {
  const [dateRange, setDateRange] = useState('This Year');
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit'>('revenue');

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-2">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                    <FileText size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Analytics & Reports</h2>
                    <p className="text-xs text-slate-500 font-medium">Financial performance and operational insights</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="relative hidden sm:block">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select 
                        className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                    >
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Quarter</option>
                        <option>This Year</option>
                    </select>
                 </div>
                 <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors group">
                    <Download size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" /> 
                    <span className="hidden sm:inline">Export Report</span>
                </button>
            </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
             {/* Total Revenue */}
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-emerald-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                        <DollarSign size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                        <TrendingUp size={12} /> +12.5%
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Revenue</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(632000)}</h3>
                </div>
             </div>

             {/* Net Profit */}
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-indigo-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <TrendingUp size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                        <TrendingUp size={12} /> +8.2%
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Net Profit</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(218000)}</h3>
                </div>
             </div>

             {/* Total Expenses */}
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-rose-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg">
                        <TrendingDown size={12} /> -2.4%
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Expenses</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(414000)}</h3>
                </div>
             </div>

             {/* Sales Growth */}
             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-amber-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                        <PieChartIcon size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">
                        Yearly
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sales Growth</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">24.5%</h3>
                </div>
             </div>
        </div>

        {/* Charts Section */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
            
            {/* Main Financial Chart */}
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Financial Performance</h3>
                        <p className="text-xs text-slate-500 font-medium">Revenue vs Expenses & Profit Trend (Year to Date)</p>
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveChart('revenue')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChart === 'revenue' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Combined View
                        </button>
                        <button 
                            onClick={() => setActiveChart('profit')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeChart === 'profit' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Profit Trend
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={MONTHLY_PERFORMANCE} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickFormatter={(value) => `₹${formatIndianNumber(value)}`}
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}
                                formatter={(value: number) => [`₹${formatIndianNumber(value)}`, '']}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            
                            {activeChart === 'revenue' ? (
                                <>
                                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
                                    <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#6366f1" strokeWidth={3} dot={{r: 4, strokeWidth: 0, fill: '#6366f1'}} />
                                </>
                            ) : (
                                <Area 
                                    type="monotone" 
                                    dataKey="profit" 
                                    name="Net Profit"
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fillOpacity={0.2} 
                                    fill="#6366f1" 
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Side Column: Pie Chart & Top Products */}
            <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0">
                
                {/* Category Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[300px]">
                    <h3 className="font-bold text-lg text-slate-800 mb-2">Sales by Category</h3>
                    <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={CATEGORY_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {CATEGORY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-2xl font-black text-slate-800">100%</span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Distribution</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs mt-2">
                        {CATEGORY_DATA.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                                <span className="font-medium text-slate-600">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800">Top Products</h3>
                        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {TOP_PRODUCTS.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{product.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium">{product.sales} units sold</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800">₹{formatIndianNumber(product.revenue)}</p>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full" 
                                            style={{ width: `${(product.revenue / 1800000) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Lead Source & Conversion Graph */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[400px] shrink-0">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        Lead Source & Conversion
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Tracking channel effectiveness: Leads vs Customers</p>
                </div>
                <div className="flex gap-2">
                     <button className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                        View Details
                     </button>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={LEAD_SOURCE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="source" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                            dy={10} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar dataKey="leads" name="Total Leads" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                        <Bar dataKey="converted" name="Converted Clients" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        {/* Spacer for bottom scrolling */}
        <div className="h-4 shrink-0"></div>
    </div>
  );
};
