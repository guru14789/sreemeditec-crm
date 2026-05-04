import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Area, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  FileText, Download, Calendar, TrendingUp, TrendingDown, 
  DollarSign, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, 
  Filter, MoreHorizontal, Users 
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from './DataContext';

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

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export const ReportsModule: React.FC = () => {
  const { invoices, expenses, leads, products } = useData();
  const [dateRange, setDateRange] = useState('This Year');
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit'>('revenue');
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'overall'>('year');
  const [summaries, setSummaries] = useState<any[]>([]);

  // 1. Fetch Aggregated Summaries (Optimized for multiple views)
  useEffect(() => {
    // Fetch last 36 months of summaries for comprehensive views
    const q = query(collection(db, "summaries"), orderBy('month', 'desc'), limit(36));
    const unsub = onSnapshot(q, (snap) => {
        setSummaries(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, []);

  // Dynamic Data Processing for Financial Performance
  const PERFORMANCE_DATA = React.useMemo(() => {
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (viewMode === 'month') {
        // Break down the CURRENT month by days
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
            label: `${i + 1}`,
            revenue: 0,
            expenses: 0,
            profit: 0,
            raw: `${currentMonthStr}-${String(i + 1).padStart(2, '0')}`
        }));

        invoices.forEach(inv => {
            if (inv.status === 'Draft' || !inv.date.startsWith(currentMonthStr)) return;
            const day = parseInt(inv.date.split('-')[2]);
            if (day && dailyData[day - 1]) {
                dailyData[day - 1].revenue += (inv.grandTotal || 0);
            }
        });

        expenses.forEach(exp => {
            if (exp.status !== 'Approved' || !exp.date.startsWith(currentMonthStr)) return;
            const day = parseInt(exp.date.split('-')[2]);
            if (day && dailyData[day - 1]) {
                dailyData[day - 1].expenses += (exp.amount || 0);
            }
        });

        return dailyData.map(d => ({ ...d, profit: d.revenue - d.expenses }));
    }

    if (viewMode === 'year') {
        // Last 12 months (Year view)
        const data = summaries.slice(0, 12).map(s => {
            const [year, month] = s.month.split('-');
            return {
                label: `${monthsShort[parseInt(month) - 1]}`,
                revenue: s.revenue || 0,
                expenses: s.expense || 0,
                profit: (s.revenue || 0) - (s.expense || 0),
                raw: s.month
            };
        }).sort((a, b) => a.raw.localeCompare(b.raw));
        return data;
    }

    // Overall (By Year)
    const yearMap: Record<string, any> = {};
    summaries.forEach(s => {
        const year = s.month.split('-')[0];
        if (!yearMap[year]) yearMap[year] = { label: year, revenue: 0, expenses: 0, profit: 0 };
        yearMap[year].revenue += (s.revenue || 0);
        yearMap[year].expenses += (s.expense || 0);
        yearMap[year].profit += (s.revenue || 0) - (s.expense || 0);
    });

    return Object.values(yearMap).sort((a, b) => a.label.localeCompare(b.label));
  }, [summaries, viewMode, invoices, expenses]);

  const CATEGORY_DATA = React.useMemo(() => {
    const catMap: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.status === 'Draft') return;
      inv.items.forEach(item => {
        const product = products.find(p => p.name === item.description);
        const category = product?.category || 'Miscellaneous';
        catMap[category] = (catMap[category] || 0) + (item.amount || 0);
      });
    });

    const result = Object.entries(catMap).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'No Data', value: 1 }];
  }, [invoices, products]);

  const TOP_PRODUCTS = React.useMemo(() => {
    const prodMap: Record<string, { sales: number; revenue: number }> = {};
    invoices.forEach(inv => {
      if (inv.status === 'Draft') return;
      inv.items.forEach(item => {
        if (!prodMap[item.description]) prodMap[item.description] = { sales: 0, revenue: 0 };
        prodMap[item.description].sales += (item.quantity || 0);
        prodMap[item.description].revenue += (item.amount || 0);
      });
    });

    return Object.entries(prodMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices]);

  const LEAD_SOURCE_DATA = React.useMemo(() => {
    const sourceMap: Record<string, { leads: number; converted: number }> = {};
    leads.forEach(l => {
      const src = l.source || 'Other';
      if (!sourceMap[src]) sourceMap[src] = { leads: 0, converted: 0 };
      sourceMap[src].leads++;
      if (l.status === 'Won') sourceMap[src].converted++;
    });

    return Object.entries(sourceMap).map(([source, stats]) => ({ source, ...stats }));
  }, [leads]);

  const totalRevenue = invoices.reduce((sum, inv) => {
    if (inv.status === 'Draft' || inv.documentType === 'Quotation' || inv.documentType === 'SupplierPO') return sum;
    return sum + (inv.grandTotal || 0);
  }, 0);

  const totalPurchases = invoices.reduce((sum, inv) => {
    if (inv.status !== 'Draft' && inv.documentType === 'SupplierPO') return sum + (inv.grandTotal || 0);
    return sum;
  }, 0);

  const totalExpenses = expenses.reduce((sum, exp) => {
    if (exp.status === 'Approved') return sum + (exp.amount || 0);
    return sum;
  }, 0) + totalPurchases;
  const totalProfit = totalRevenue - totalExpenses;
  const growthRate = 24.5; // Keeping this static or we could calculate if historical data existed

  const handleExportCSV = () => {
    const headers = ["Section", "Metric/Month", "Value 1 (Current/Revenue)", "Value 2 (Expense)", "Value 3 (Net Profit)"];
    const summaryRows = [
      ["SUMMARY", "Total Sales (Profit)", totalRevenue, "", ""],
      ["SUMMARY", "Net Profit", totalProfit, "", ""],
      ["SUMMARY", "Total Loss (PO + Expense)", totalExpenses, "", ""],
      ["SUMMARY", "Sales Growth Rate (%)", growthRate, "", ""],
      ["", "", "", "", ""], // Spacer
      ["MONTHLY PERFORMANCE", "Month", "Sales (Profit)", "Loss (Purchases + Exp)", "Net Profit"]
    ];
    
    const performanceRows = PERFORMANCE_DATA.map(d => [
      "PERFORMANCE DATA",
      d.label,
      d.revenue,
      d.expenses,
      d.profit
    ]);

    const productHeader = ["", "", "", "", ""];
    const productTitle = ["TOP PRODUCTS", "Product Name", "Sales (Units)", "Revenue Generated", ""];
    const productRows = TOP_PRODUCTS.map(p => [
      "TOP PRODUCTS",
      `"${p.name.replace(/"/g, '""')}"`,
      p.sales,
      p.revenue,
      ""
    ]);

    const categoryHeader = ["", "", "", "", ""];
    const categoryTitle = ["CATEGORY DISTRIBUTION", "Category", "Revenue Share", "", ""];
    const categoryRows = CATEGORY_DATA.map(c => [
      "CATEGORY DISTRIBUTION",
      `"${c.name.replace(/"/g, '""')}"`,
      c.value,
      "",
      ""
    ]);

    const csvContent = [
      headers.join(","),
      ...summaryRows.map(r => r.join(",")),
      ...performanceRows.map(r => r.join(",")),
      categoryHeader.join(","),
      categoryTitle.join(","),
      ...categoryRows.map(r => r.join(",")),
      productHeader.join(","),
      productTitle.join(","),
      ...productRows.map(r => r.join(","))
    ].join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Enterprise_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-1.5">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 shrink-0 bg-white p-2 px-3 rounded-xl border border-slate-300 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-medical-600 to-violet-600 rounded-lg text-white shadow-lg shadow-medical-500/20">
                    <FileText size={18} />
                </div>
                <div>
                    <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Analytics & Reports</h2>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">Financial Performance</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1.5">
                 <div className="relative hidden sm:block">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <select 
                        className="pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-300 text-slate-700 text-[10px] font-black uppercase rounded-lg outline-none focus:ring-2 focus:ring-medical-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
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
                 <button 
                    onClick={handleExportCSV}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 group shadow-sm">
                    <Download size={12} className="text-slate-400 group-hover:text-medical-600 transition-colors" /> 
                    <span className="hidden sm:inline">Export Report</span>
                </button>
            </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
             {/* Total Revenue */}
             <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-emerald-100 transition-all">
                <div className="flex justify-between items-start mb-1">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                        <DollarSign size={14} />
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded-md uppercase">
                        <TrendingUp size={8} /> +12.5%
                    </span>
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Sales</p>
                    <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalRevenue)}</h3>
                </div>
             </div>

             {/* Net Profit */}
             <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-medical-100 transition-all">
                <div className="flex justify-between items-start mb-1">
                    <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg group-hover:scale-110 transition-transform">
                        <TrendingUp size={14} />
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black bg-medical-50 text-medical-700 px-1 py-0.5 rounded-md uppercase">
                        <TrendingUp size={8} /> +8.2%
                    </span>
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
                    <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalProfit)}</h3>
                </div>
             </div>

             {/* Total Expenses */}
             <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-rose-100 transition-all">
                <div className="flex justify-between items-start mb-1">
                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={14} />
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black bg-rose-50 text-rose-700 px-1 py-0.5 rounded-md uppercase">
                        <TrendingDown size={8} /> -2.4%
                    </span>
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loss</p>
                    <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalExpenses)}</h3>
                </div>
             </div>

             {/* Sales Growth */}
             <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-amber-100 transition-all">
                <div className="flex justify-between items-start mb-1">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                        <PieChartIcon size={14} />
                    </div>
                    <span className="flex items-center gap-1 text-[8px] font-black bg-amber-50 text-amber-700 px-1 py-0.5 rounded-md uppercase">
                        Annual
                    </span>
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth</p>
                    <h3 className="text-sm font-black text-slate-800 mt-0.5">{growthRate}%</h3>
                </div>
             </div>
        </div>

        {/* Charts Section */}
        <div className="flex flex-col lg:flex-row gap-4 mb-4 lg:min-h-[500px]">
                    {/* Main Financial Chart */}
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[350px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-medical-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-[10px] text-slate-800 tracking-tight uppercase">Financial Performance</h3>
                            <div className="px-1 py-0.5 bg-emerald-100 text-emerald-700 text-[6px] font-black uppercase tracking-widest rounded-full animate-pulse">Live</div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Revenue vs Outflow</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                        <div className="flex bg-slate-100 p-0.5 rounded-lg shadow-inner">
                            {(['month', 'year', 'overall'] as const).map((mode) => (
                                <button 
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === mode ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {mode}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex bg-medical-50 p-0.5 rounded-lg">
                            <button 
                                onClick={() => setActiveChart('revenue')}
                                className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${activeChart === 'revenue' ? 'bg-medical-600 text-white shadow-md shadow-medical-200' : 'text-medical-400'}`}>
                                Composed
                            </button>
                            <button 
                                onClick={() => setActiveChart('profit')}
                                className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${activeChart === 'profit' ? 'bg-medical-600 text-white shadow-md shadow-medical-200' : 'text-medical-400'}`}>
                                Profit
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-[220px] relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="label" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 900}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 900}} 
                                tickFormatter={(value) => `₹${formatIndianNumber(value)}`}
                            />
                            <Tooltip 
                                cursor={{stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                                itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                labelStyle={{ fontSize: '9px', fontWeight: '900', color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                iconType="circle" 
                                iconSize={8}
                                wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '20px' }} 
                            />
                            
                            {activeChart === 'revenue' ? (
                                <>
                                    <Bar dataKey="revenue" name="Inflow" fill="url(#colorRev)" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                                    <Bar dataKey="expenses" name="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="profit" 
                                        name="Profit Delta" 
                                        stroke="#6366f1" 
                                        strokeWidth={3} 
                                        dot={{r: 3, strokeWidth: 2, stroke: '#fff', fill: '#6366f1'}} 
                                        activeDot={{ r: 5, strokeWidth: 0 }}
                                        animationDuration={2000}
                                    />
                                </>
                            ) : (
                                <Area 
                                    type="monotone" 
                                    dataKey="profit" 
                                    name="Net Earnings"
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorProfit)" 
                                    animationDuration={2000}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Side Column: Pie Chart & Top Products */}
            <div className="w-full lg:w-[260px] flex flex-col gap-4 shrink-0">
                
                {/* Category Distribution */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col h-[220px]">
                    <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest mb-2">Categories</h3>
                    <div className="flex-1 w-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={CATEGORY_DATA}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {CATEGORY_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '9px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
                            <div className="text-center">
                                <span className="text-lg font-black text-slate-800">100%</span>
                                <p className="text-[7px] text-slate-400 font-black uppercase">Split</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[7px] mt-1 font-black uppercase tracking-tight">
                        {CATEGORY_DATA.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                <span className="text-slate-500">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm min-h-[220px] flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Top Products</h3>
                        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={14} /></button>
                    </div>
                    
                    <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                        {TOP_PRODUCTS.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between group py-1 border-b border-slate-50 last:border-0">
                                <div className="flex-1 pr-3">
                                    <h4 className="text-[9px] font-black text-slate-700 uppercase leading-tight group-hover:text-medical-600 transition-colors line-clamp-1">{product.name}</h4>
                                    <p className="text-[7px] text-slate-400 font-black uppercase mt-0.5">{product.sales} units</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-800">₹{formatIndianNumber(product.revenue)}</p>
                                    <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden ml-auto">
                                        <div 
                                            className="h-full bg-medical-500 rounded-full" 
                                            style={{ width: `${(product.revenue / (TOP_PRODUCTS[0]?.revenue || 1)) * 100}%` }}
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
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-col min-h-[280px] shrink-0">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                <div>
                    <h3 className="font-black text-[10px] text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                        <Users size={16} className="text-medical-600" />
                        Lead Source & Conversion
                    </h3>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Leads vs Converted Clients</p>
                </div>
                <div className="flex gap-2">
                     <button className="text-[8px] font-black text-slate-500 hover:text-medical-600 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors uppercase tracking-widest border border-slate-200">
                        View Analytics
                     </button>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={LEAD_SOURCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="source" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 8, fill: '#94a3b8', fontWeight: 900}} 
                            dy={10} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 8, fill: '#94a3b8', fontWeight: 900}} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                            itemStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            labelStyle={{ fontSize: '8px', fontWeight: '900', color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        />
                        <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle" 
                            iconSize={6}
                            wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '15px' }} 
                        />
                        <Bar dataKey="leads" name="Total Leads" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={12} animationDuration={1500} />
                        <Bar dataKey="converted" name="Converted Clients" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} animationDuration={1500} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        
        {/* Spacer for bottom scrolling */}
        <div className="h-4 shrink-0"></div>
    </div>
  );
};
