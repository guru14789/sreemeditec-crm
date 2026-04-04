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

  // Dynamic Data Processing
  const MONTHLY_PERFORMANCE = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const data = months.map(m => ({ month: m, revenue: 0, expenses: 0, profit: 0 }));

    invoices.forEach(inv => {
      if (inv.status === 'Draft' || inv.documentType === 'Quotation') return;
      const date = new Date(inv.date);
      const mIdx = date.getMonth();
      
      if (inv.documentType === 'SupplierPO') {
        data[mIdx].expenses += (inv.grandTotal || 0);
      } else {
        data[mIdx].revenue += (inv.grandTotal || 0);
      }
    });

    expenses.forEach(exp => {
      if (exp.status !== 'Approved') return;
      const date = new Date(exp.date);
      const mIdx = date.getMonth();
      data[mIdx].expenses += (exp.amount || 0);
    });

    data.forEach(d => {
      d.profit = d.revenue - d.expenses;
    });
    
    // Return last 10 months or up to current
    return data.slice(Math.max(0, currentMonthIdx - 9), currentMonthIdx + 1);
  }, [invoices, expenses]);

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
    
    const performanceRows = MONTHLY_PERFORMANCE.map(d => [
      "MONTHLY PERFORMANCE",
      d.month,
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

    const csvContent = [
      headers.join(","),
      ...summaryRows.map(r => r.join(",")),
      ...performanceRows.map(r => r.join(",")),
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
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-2">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl border border-slate-300 shadow-sm">
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
                        className="pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
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
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 group shadow-sm">
                    <Download size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" /> 
                    <span className="hidden sm:inline">Export Report</span>
                </button>
            </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
             {/* Total Revenue */}
             <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-emerald-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                        <DollarSign size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                        <TrendingUp size={12} /> +12.5%
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Sales (Profit)</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(totalRevenue)}</h3>
                </div>
             </div>

             {/* Net Profit */}
             <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-indigo-100 transition-all">
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
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(totalProfit)}</h3>
                </div>
             </div>

             {/* Total Expenses */}
             <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-rose-100 transition-all">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={20} />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg">
                        <TrendingDown size={12} /> -2.4%
                    </span>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Loss (PO + Expense)</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{formatIndianNumber(totalExpenses)}</h3>
                </div>
             </div>

             {/* Sales Growth */}
             <div className="bg-white p-5 rounded-3xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-amber-100 transition-all">
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
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{growthRate}%</h3>
                </div>
             </div>
        </div>

        {/* Charts Section */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
            
            {/* Main Financial Chart */}
            <div className="flex-1 bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Financial Performance</h3>
                        <p className="text-xs text-slate-500 font-medium">Profit (Invoices) vs Loss (Supplier PO + Vouchers)</p>
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
                                    <Bar dataKey="revenue" name="Sales (Profit)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                                    <Bar dataKey="expenses" name="Loss (Purchases + Exp)" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
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
                <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col h-[300px]">
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
                <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex-1 flex flex-col">
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
        <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col h-[400px] shrink-0">
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
