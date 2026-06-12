import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Line, Area, Bar, BarChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  DollarSign, PieChart as PieChartIcon, ArrowDownRight,
  MoreHorizontal, Users, ArrowLeft, Search, Package,
  ShoppingCart, Award, ChevronRight, X,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from './DataContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatIndianNumber = (num: number) => {
  if (num >= 10000000) return (num / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
  if (num >= 1000) return (num / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  return num.toLocaleString('en-IN');
};

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#0ea5e9', '#f97316', '#14b8a6', '#a855f7'];

type ProductDetail = {
  name: string;
  totalQty: number;
  totalRevenue: number;
  invoiceCount: number;
  avgPrice: number;
  invoiceList: { id: string; date: string; customer: string; qty: number; amount: number }[];
  monthlyRevenue: { month: string; revenue: number; qty: number }[];
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ReportsModule: React.FC = () => {
  const { invoices, expenses, leads, products, purchaseRecords = [] } = useData();
  const [dateRange, setDateRange] = useState('This Year');
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit'>('revenue');
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'overall'>('year');
  const [summaries, setSummaries] = useState<any[]>([]);

  // ── View state machine ──────────────────────────────────────────────────
  type ViewState = 'main' | 'topProducts' | 'productDetail';
  const [view, setView] = useState<ViewState>('main');
  const [reportsTab, setReportsTab] = useState<'overview' | 'analytics'>('overview');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'revenue' | 'units' | 'invoices'>('revenue');

  const getCardClasses = (sectionId: string, defaultSpan: string) => {
    const isExpanded = expandedSection === sectionId;
    const hasExpanded = expandedSection !== null;

    if (isExpanded) {
      return `col-span-full md:col-span-6 bg-white p-5 rounded-2xl border-2 border-medical-500 shadow-lg ring-4 ring-medical-500/5 flex flex-col min-h-[420px] transition-all duration-300 transform scale-[1.005] cursor-pointer`;
    }
    if (hasExpanded) {
      return `col-span-full md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[180px] overflow-hidden opacity-50 hover:opacity-95 transition-all duration-300 cursor-pointer`;
    }
    return `col-span-full ${defaultSpan} bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-col transition-all duration-300 cursor-pointer hover:border-slate-400 hover:shadow-md`;
  };

  useEffect(() => {
    const q = query(collection(db, 'summaries'), orderBy('month', 'desc'), limit(60));
    const unsub = onSnapshot(q, (snap) => setSummaries(snap.docs.map((d) => d.data())));
    return () => unsub();
  }, []);

  // ── Chart Data ──────────────────────────────────────────────────────────
  const PERFORMANCE_DATA = useMemo(() => {
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (viewMode === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`, revenue: 0, expenses: 0, profit: 0,
        raw: `${currentMonthStr}-${String(i + 1).padStart(2, '0')}`,
      }));
      invoices.forEach((inv) => {
        if (inv.status === 'Draft' || !inv.date.startsWith(currentMonthStr)) return;
        const day = parseInt(inv.date.split('-')[2]);
        if (day && dailyData[day - 1]) dailyData[day - 1].revenue += inv.grandTotal || 0;
      });
      expenses.forEach((exp) => {
        if (exp.status !== 'Approved' || !exp.date.startsWith(currentMonthStr)) return;
        const day = parseInt(exp.date.split('-')[2]);
        if (day && dailyData[day - 1]) dailyData[day - 1].expenses += exp.amount || 0;
      });
      return dailyData.map((d) => ({ ...d, profit: d.revenue - d.expenses }));
    }

    if (viewMode === 'year') {
      return summaries.slice(0, 12).map((s) => {
        const [, month] = s.month.split('-');
        return { label: monthsShort[parseInt(month) - 1], revenue: s.revenue || 0, expenses: s.expense || 0, profit: (s.revenue || 0) - (s.expense || 0), raw: s.month };
      }).sort((a, b) => a.raw.localeCompare(b.raw));
    }

    const yearMap: Record<string, any> = {};
    summaries.forEach((s) => {
      const year = s.month.split('-')[0];
      if (!yearMap[year]) yearMap[year] = { label: year, revenue: 0, expenses: 0, profit: 0, raw: year };
      yearMap[year].revenue += s.revenue || 0;
      yearMap[year].expenses += s.expense || 0;
      yearMap[year].profit += (s.revenue || 0) - (s.expense || 0);
    });
    return Object.values(yearMap).sort((a, b) => a.label.localeCompare(b.label));
  }, [summaries, viewMode, invoices, expenses]);

  const CATEGORY_DATA = useMemo(() => {
    const catMap: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.status === 'Draft') return;
      inv.items.forEach((item) => {
        const product = products.find((p) => p.name === item.description);
        const category = product?.category || 'Miscellaneous';
        catMap[category] = (catMap[category] || 0) + (item.amount || 0);
      });
    });
    const result = Object.entries(catMap).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'No Data', value: 1 }];
  }, [invoices, products]);

  // ── All Products Detail (expanded from TOP_PRODUCTS) ─────────────────────
  const ALL_PRODUCTS_DETAIL = useMemo((): ProductDetail[] => {
    const prodMap: Record<string, ProductDetail> = {};

    invoices.forEach((inv) => {
      if (inv.status === 'Draft') return;
      const invId = (inv as any).invoiceNumber || inv.id || '';
      const monthKey = (inv.date || '').substring(0, 7);

      inv.items.forEach((item) => {
        const key = item.description;
        if (!key) return;
        if (!prodMap[key]) {
          prodMap[key] = { name: key, totalQty: 0, totalRevenue: 0, invoiceCount: 0, avgPrice: 0, invoiceList: [], monthlyRevenue: [] };
        }
        const p = prodMap[key];
        p.totalQty += item.quantity || 0;
        p.totalRevenue += item.amount || 0;

        // Track unique invoices
        if (!p.invoiceList.find((i) => i.id === invId)) p.invoiceCount++;
        p.invoiceList.push({
          id: invId,
          date: inv.date || '',
          customer: inv.customerName || (inv as any).clientName || 'Unknown',
          qty: item.quantity || 0,
          amount: item.amount || 0,
        });

        // Monthly
        const existing = p.monthlyRevenue.find((m) => m.month === monthKey);
        if (existing) { existing.revenue += item.amount || 0; existing.qty += item.quantity || 0; }
        else p.monthlyRevenue.push({ month: monthKey, revenue: item.amount || 0, qty: item.quantity || 0 });
      });
    });

    return Object.values(prodMap)
      .map((p) => ({ ...p, avgPrice: p.totalQty > 0 ? p.totalRevenue / p.totalQty : 0, monthlyRevenue: p.monthlyRevenue.sort((a, b) => a.month.localeCompare(b.month)) }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [invoices]);

  const TOP_PRODUCTS = useMemo(() => ALL_PRODUCTS_DETAIL.slice(0, 5), [ALL_PRODUCTS_DETAIL]);

  const LEAD_SOURCE_DATA = useMemo(() => {
    const sourceMap: Record<string, { leads: number; converted: number }> = {};
    leads.forEach((l) => {
      const src = l.source || 'Other';
      if (!sourceMap[src]) sourceMap[src] = { leads: 0, converted: 0 };
      sourceMap[src].leads++;
      if (l.status === 'Won') sourceMap[src].converted++;
    });
    return Object.entries(sourceMap).map(([source, stats]) => ({ source, ...stats }));
  }, [leads]);

"  const totalRevenue = invoices.reduce((sum, inv) => {
    if (inv.status === 'Draft' || (inv as any).documentType === 'Quotation' || (inv as any).documentType === 'SupplierPO') return sum;
    return sum + (inv.grandTotal || 0);
  }, 0);
  const totalPurchases = invoices.reduce((sum, inv) => {
    if (inv.status !== 'Draft' && (inv as any).documentType === 'SupplierPO') return sum + (inv.grandTotal || 0);
    return sum;
  }, 0);
  const totalExpenses = expenses.reduce((sum, exp) => exp.status === 'Approved' ? sum + (exp.amount || 0) : sum, 0) + totalPurchases;
  const totalProfit = totalRevenue - totalExpenses;
  const growthRate = 24.5;

  // ── Detailed Analytics Calculations ──────────────────────────────────────
  const analyticsData = useMemo(() => {
    // 1. Helper to filter by dateRange state ('Today' | 'This Week' | 'This Month' | 'This Quarter' | 'This Year')
    const filterByDateRange = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const now = new Date();
      if (isNaN(d.getTime())) return false;

      const diffTime = now.getTime() - d.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (dateRange === 'Today') {
        return d.toDateString() === now.toDateString();
      }
      if (dateRange === 'This Week') {
        return diffDays <= 7;
      }
      if (dateRange === 'This Month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'This Quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const itemQuarter = Math.floor(d.getMonth() / 3);
        return currentQuarter === itemQuarter && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'This Year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    // Filters for li
<truncated 7008 bytes>

  // ── Filtered & Sorted Products for Detail Page ──────────────────────────
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    const filtered = q ? ALL_PRODUCTS_DETAIL.filter((p) => p.name.toLowerCase().includes(q)) : ALL_PRODUCTS_DETAIL;
    return [...filtered].sort((a, b) => {
      if (productSort === 'units') return b.totalQty - a.totalQty;
      if (productSort === 'invoices') return b.invoiceCount - a.invoiceCount;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [ALL_PRODUCTS_DETAIL, productSearch, productSort]);

  const topProductsByRevenue = ALL_PRODUCTS_DETAIL.slice(0, 10).map((p) => ({ name: p.name.length > 18 ? p.name.substring(0, 16) + '…' : p.name, revenue: p.totalRevenue, units: p.totalQty }));
  const maxRevenue = ALL_PRODUCTS_DETAIL[0]?.totalRevenue || 1;

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (view === 'topProducts' || view === 'productDetail') {
      const headers = ['Rank', 'Product', 'Units Sold', 'Revenue (₹)', 'Avg Price (₹)', 'Invoice Count'];
      const rows = filteredProducts.map((p, i) => [
        i + 1, `"${p.name.replace(/"/g, '""')}"`, p.totalQty, p.totalRevenue.toFixed(2), p.avgPrice.toFixed(2), p.invoiceCount,
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Top_Products_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      return;
    }

    const headers = ['Section', 'Metric/Month', 'Value 1 (Revenue)', 'Value 2 (Expense)', 'Value 3 (Net Profit)'];
    const summaryRows = [
      ['SUMMARY', 'Total Sales', totalRevenue, '', ''],
      ['SUMMARY', 'Net Profit', totalProfit, '', ''],
      ['SUMMARY', 'Total Loss (PO + Exp)', totalExpenses, '', ''],
      ['', '', '', '', ''],
      ['TOP PRODUCTS', 'Product Name', 'Units', 'Revenue', ''],
      ...TOP_PRODUCTS.map((p) => ['TOP PRODUCTS', `"${p.name.replace(/"/g, '""')}"`, p.totalQty, p.totalRevenue.toFixed(2), '']),
    ];
    const csv = [headers, ...summaryRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Enterprise_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: TOP PRODUCTS DETAIL PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'topProducts' || view === 'productDetail') {
    const totalUnits = ALL_PRODUCTS_DETAIL.reduce((s, p) => s + p.totalQty, 0);
    const totalProductRevenue = ALL_PRODUCTS_DETAIL.reduce((s, p) => s + p.totalRevenue, 0);
    const uniqueSKUs = ALL_PRODUCTS_DETAIL.length;

    return (
      <div className="h-full flex flex-col gap-4 overflow-y-auto p-1.5 custom-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0 bg-white p-2 px-3 rounded-xl border border-slate-300 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('main'); setSelectedProduct(null); setProductSearch(''); }}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-medical-600 hover:bg-medical-50 hover:border-medical-200 transition-all active:scale-95"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="p-1.5 bg-gradient-to-br from-violet-600 to-medical-600 rounded-lg text-white shadow-lg shadow-violet-500/20">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Top Products Analysis</h2>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none">Based on Invoice Data · {uniqueSKUs} SKUs</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <Download size={12} className="text-slate-400" /> Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[
            { label: 'Unique SKUs', value: uniqueSKUs.toString(), sub: 'Distinct products', icon: Package, color: 'violet' },
            { label: 'Total Units Sold', value: totalUnits.toLocaleString('en-IN'), sub: 'Across all invoices', icon: ShoppingCart, color: 'emerald' },
            { label: 'Product Revenue', value: `₹${formatIndianNumber(totalProductRevenue)}`, sub: 'From invoiced items', icon: DollarSign, color: 'medical' },
            { label: 'Top Product Share', value: `${ALL_PRODUCTS_DETAIL[0] ? ((ALL_PRODUCTS_DETAIL[0].totalRevenue / totalProductRevenue) * 100).toFixed(1) : 0}%`, sub: ALL_PRODUCTS_DETAIL[0]?.name?.substring(0, 16) || '—', icon: Award, color: 'amber' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className={`bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-${color}-100 transition-all`}>
              <div className="flex justify-between items-start mb-1">
                <div className={`p-1.5 bg-${color}-50 text-${color}-600 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={14} />
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <h3 className="text-sm font-black text-slate-800 mt-0.5">{value}</h3>
                <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart: Top 10 by Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 min-h-[240px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-tight">Revenue by Product — Top 10</h3>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Ranked by invoice revenue</p>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsByRevenue} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '10px', background: 'rgba(255,255,255,0.97)' }}
                  formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name === 'revenue' ? 'Revenue' : 'Units']}
                  labelStyle={{ fontSize: '9px', fontWeight: 900, color: '#6366f1', marginBottom: '6px', textTransform: 'uppercase' }}
                />
                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} barSize={22} animationDuration={1200}>
                  {topProductsByRevenue.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Detail Drawer (when a product is selected) */}
        {selectedProduct && (
          <div className="bg-gradient-to-br from-violet-50 to-medical-50 border border-violet-200 rounded-2xl p-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[8px] font-black text-violet-500 uppercase tracking-widest mb-1">Product Detail</p>
                <h3 className="font-black text-slate-800 text-sm uppercase leading-tight">{selectedProduct.name}</h3>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">{selectedProduct.totalQty} units sold</span>
                  <span className="text-[8px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 uppercase">₹{formatIndianNumber(selectedProduct.totalRevenue)} revenue</span>
                  <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase">Avg ₹{selectedProduct.avgPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/unit</span>
                  <span className="text-[8px] font-black text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 uppercase">{selectedProduct.invoiceCount} invoices</span>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200">
                <X size={16} />
              </button>
            </div>

            {/* Invoice History Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                <span>Invoice</span>
                <span>Date</span>
                <span>Customer</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {selectedProduct.invoiceList.sort((a, b) => b.date.localeCompare(a.date)).map((inv, i) => (
                  <div key={i} className="grid grid-cols-4 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <span className="text-[9px] font-black text-violet-600 truncate">{inv.id}</span>
                    <span className="text-[9px] font-bold text-slate-500">{inv.date ? new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>
                    <span className="text-[9px] font-bold text-slate-700 truncate">{inv.customer}</span>
                    <span className="text-[9px] font-black text-slate-800 text-right">{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
                {selectedProduct.invoiceList.length === 0 && (
                  <div className="py-8 text-center text-slate-300 text-[9px] font-black uppercase tracking-widest">No Invoice Data</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full Product Table */}
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden flex flex-col shrink-0">
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/40">
            <div>
              <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-tight">All Products Ranked</h3>
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{filteredProducts.length} products · Click any row for invoice history</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg shadow-inner">
                {(['revenue', 'units', 'invoices'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setProductSort(s)}
                    className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${productSort === s ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={11} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-medical-400 transition-all w-44"
                />
              </div>
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-12 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <span className="col-span-1">#</span>
            <span className="col-span-4">Product</span>
            <span className="col-span-2 text-right">Units</span>
            <span className="col-span-2 text-right">Revenue</span>
            <span className="col-span-1 text-right">Avg ₹</span>
            <span className="col-span-1 text-center">Inv</span>
            <span className="col-span-1"></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto custom-scrollbar">
            {filteredProducts.map((product, idx) => {
              const rank = ALL_PRODUCTS_DETAIL.findIndex((p) => p.name === product.name) + 1;
              const barWidth = (product.totalRevenue / maxRevenue) * 100;
              const isSelected = selectedProduct?.name === product.name;
              return (
                <div
                  key={product.name}
                  onClick={() => { setSelectedProduct(isSelected ? null : product); setView('productDetail'); }}
                  className={`grid grid-cols-12 items-center px-5 py-3 cursor-pointer transition-all group ${isSelected ? 'bg-violet-50 border-l-2 border-violet-500' : 'hover:bg-slate-50 border-l-2 border-transparent'}`}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    <span className={`text-[10px] font-black ${rank <= 3 ? 'text-amber-500' : 'text-slate-300'}`}>
                      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                    </span>
                  </div>

                  {/* Name + bar */}
                  <div className="col-span-4 pr-3">
                    <p className={`text-[9px] font-black uppercase leading-tight line-clamp-1 transition-colors ${isSelected ? 'text-violet-700' : 'text-slate-700 group-hover:text-medical-600'}`}>
                      {product.name}
                    </p>
                    <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-medical-500 to-violet-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>

                  {/* Units */}
                  <div className="col-span-2 text-right">
                    <span className="text-[9px] font-black text-slate-700">{product.totalQty.toLocaleString('en-IN')}</span>
                    <p className="text-[7px] text-slate-400 font-bold">units</p>
                  </div>

                  {/* Revenue */}
                  <div className="col-span-2 text-right">
                    <span className="text-[9px] font-black text-slate-800">₹{formatIndianNumber(product.totalRevenue)}</span>
                    <p className="text-[7px] text-slate-400 font-bold">{((product.totalRevenue / maxRevenue) * 100).toFixed(0)}% of #1</p>
                  </div>

                  {/* Avg Price */}
                  <div className="col-span-1 text-right">
                    <span className="text-[8px] font-black text-slate-600">₹{formatIndianNumber(product.avgPrice)}</span>
                  </div>

                  {/* Invoice Count */}
                  <div className="col-span-1 text-center">
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">{product.invoiceCount}</span>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-end">
                    <ChevronRight size={12} className={`transition-all ${isSelected ? 'text-violet-500 rotate-90' : 'text-slate-300 group-hover:text-medical-500 group-hover:translate-x-0.5'}`} />
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.4em] text-[9px]">No Products Found</div>
            )}
          </div>
        </div>

        <div className="h-4 shrink-0" />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: MAIN REPORTS DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-1.5">

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 shrink-0 bg-white p-2 px-3 rounded-xl border border-slate-300 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-gradient-to-br from-medical-600 to-violet-600 rounded-lg text-white shadow-lg shadow-medical-500/20">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Analytics & Reports</h2>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setReportsTab('overview')}
                className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all ${reportsTab === 'overview' ? 'bg-medical-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setReportsTab('analytics')}
                className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all ${reportsTab === 'analytics' ? 'bg-medical-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Detailed Analytics
              </button>
            </div>
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
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 group shadow-sm"
          >
            <Download size={12} className="text-slate-400 group-hover:text-medical-600 transition-colors" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-emerald-100 transition-all">
          <div className="flex justify-between items-start mb-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><DollarSign size={14} /></div>
            <span className="flex items-center gap-1 text-[8px] font-black bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded-md uppercase"><TrendingUp size={8} /> +12.5%</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Sales</p>
            <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalRevenue)}</h3>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-medical-100 transition-all">
          <div className="flex justify-between items-start mb-1">
            <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg group-hover:scale-110 transition-transform"><TrendingUp size={14} /></div>
            <span className="flex items-center gap-1 text-[8px] font-black bg-medical-50 text-medical-700 px-1 py-0.5 rounded-md uppercase"><TrendingUp size={8} /> +8.2%</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
            <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalProfit)}</h3>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-rose-100 transition-all">
          <div className="flex justify-between items-start mb-1">
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform"><ArrowDownRight size={14} /></div>
            <span className="flex items-center gap-1 text-[8px] font-black bg-rose-50 text-rose-700 px-1 py-0.5 rounded-md uppercase"><TrendingDown size={8} /> -2.4%</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loss</p>
            <h3 className="text-sm font-black text-slate-800 mt-0.5">₹{formatIndianNumber(totalExpenses)}</h3>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between group hover:shadow-lg hover:border-amber-100 transition-all">
          <div className="flex justify-between items-start mb-1">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><PieChartIcon size={14} /></div>
            <span className="flex items-center gap-1 text-[8px] font-black bg-amber-50 text-amber-700 px-1 py-0.5 rounded-md uppercase">Annual</span>
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-medical-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
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
                  <button key={mode} onClick={() => setViewMode(mode)} className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === mode ? 'bg-white text-medical-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{mode}</button>
                ))}
              </div>
              <div className="flex bg-medical-50 p-0.5 rounded-lg">
                <button onClick={() => setActiveChart('revenue')} className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${activeChart === 'revenue' ? 'bg-medical-600 text-white shadow-md shadow-medical-200' : 'text-medical-400'}`}>Composed</button>
                <button onClick={() => setActiveChart('profit')} className={`px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${activeChart === 'profit' ? 'bg-medical-600 text-white shadow-md shadow-medical-200' : 'text-medical-400'}`}>Profit</button>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[220px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                <Tooltip
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  labelStyle={{ fontSize: '9px', fontWeight: '900', color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '20px' }} />
                {activeChart === 'revenue' ? (
                  <>
                    <Bar dataKey="revenue" name="Inflow" fill="url(#colorRev)" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                    <Bar dataKey="expenses" name="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                    <Line type="monotone" dataKey="profit" name="Profit Delta" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} activeDot={{ r: 5, strokeWidth: 0 }} animationDuration={2000} />
                  </>
                ) : (
                  <Area type="monotone" dataKey="profit" name="Net Earnings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" animationDuration={2000} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Column */}
        <div className="w-full lg:w-[260px] flex flex-col gap-4 shrink-0">
          {/* Category Pie */}
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex flex-col h-[220px]">
            <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest mb-2">Categories</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={CATEGORY_DATA} cx="50%" cy="45%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {CATEGORY_DATA.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
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
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products (Clickable) */}
          <button
            onClick={() => setView('topProducts')}
            className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm min-h-[220px] flex flex-col flex-1 text-left cursor-pointer hover:border-medical-300 hover:shadow-lg hover:shadow-medical-500/5 transition-all group active:scale-[0.99]"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest group-hover:text-medical-600 transition-colors">Top Products</h3>
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-medical-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">View All</span>
                <ChevronRight size={12} className="text-slate-300 group-hover:text-medical-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            <div className="space-y-2 overflow-y-hidden flex-1">
              {TOP_PRODUCTS.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                  <div className="flex-1 pr-3">
                    <h4 className="text-[9px] font-black text-slate-700 uppercase leading-tight group-hover:text-medical-600 transition-colors line-clamp-1">{product.name}</h4>
                    <p className="text-[7px] text-slate-400 font-black uppercase mt-0.5">{product.totalQty} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-800">₹{formatIndianNumber(product.totalRevenue)}</p>
                    <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden ml-auto">
                      <div className="h-full bg-medical-500 rounded-full" style={{ width: `${(product.totalRevenue / (TOP_PRODUCTS[0]?.totalRevenue || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {TOP_PRODUCTS.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-6">
                  <p className="text-[8px] text-slate-300 font-black uppercase tracking-widest">No product data yet</p>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">{ALL_PRODUCTS_DETAIL.length} total products</span>
              <span className="text-[7px] text-medical-500 font-black uppercase tracking-widest flex items-center gap-1">Click to expand <ChevronRight size={9} /></span>
            </div>
          </button>
        </div>
      </div>

      {/* Lead Source & Conversion */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-col min-h-[280px] shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div>
            <h3 className="font-black text-[10px] text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Users size={16} className="text-medical-600" /> Lead Source & Conversion
            </h3>
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Leads vs Converted Clients</p>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LEAD_SOURCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
                itemStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                labelStyle={{ fontSize: '8px', fontWeight: '900', color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '15px' }} />
              <Bar dataKey="leads" name="Total Leads" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={12} animationDuration={1500} />
              <Bar dataKey="converted" name="Converted Clients" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="h-4 shrink-0" />
    </div>
  );
};
