import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Line, Area, Bar, BarChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FileText, Download, Calendar, TrendingUp, TrendingDown,
  DollarSign, PieChart as PieChartIcon, ArrowDownRight,
  MoreHorizontal, Users, ArrowLeft, Search, Package,
  ShoppingCart, Award, ChevronRight, X, Truck,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatIndianNumber = (num: number) => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#0ea5e9', '#f97316', '#14b8a6', '#a855f7'];

const GRADIENT_COLORS = [
  'url(#grad-0)', 'url(#grad-1)', 'url(#grad-2)', 'url(#grad-3)', 'url(#grad-4)',
  'url(#grad-5)', 'url(#grad-6)', 'url(#grad-7)', 'url(#grad-8)', 'url(#grad-9)'
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800/80 p-3 rounded-[2rem] shadow-2xl text-white min-w-[150px] z-[999]">
        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-800">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const val = entry.value;
            const displayVal = typeof val === 'number'
              ? (entry.name.toLowerCase().includes('unit') || entry.name.toLowerCase().includes('lead') || entry.name.toLowerCase().includes('client') || entry.name.toLowerCase().includes('closure')
                ? val.toLocaleString('en-IN')
                : `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`)
              : val;
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-tight">{entry.name}</span>
                </div>
                <span className="text-[9px] font-black text-white">{displayVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const GlobalChartDefs: React.FC = () => (
  <svg className="w-0 h-0 absolute pointer-events-none" aria-hidden="true">
    <defs>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.25" />
      </filter>
      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#be123c" />
      </linearGradient>
      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="grad-0" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="grad-1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="grad-2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="grad-3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
      <linearGradient id="grad-4" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#be185d" />
      </linearGradient>
      <linearGradient id="grad-5" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#4338ca" />
      </linearGradient>
      <linearGradient id="grad-6" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="grad-7" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <linearGradient id="grad-8" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
      <linearGradient id="grad-9" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#7e22ce" />
      </linearGradient>
    </defs>
  </svg>
);

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
  const { invoices, expenses, leads, products, purchaseRecords, employees, deliveryChallans, serviceReports, installationReports, previewPDF, clients } = useData();
  const [dateRange, setDateRange] = useState('This Year');
  const [activeChart, setActiveChart] = useState<'revenue' | 'profit'>('revenue');
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'overall'>('year');
  const [summaries, setSummaries] = useState<any[]>([]);

  // ── View state machine ──────────────────────────────────────────────────
  type ViewState = 'main' | 'topProducts' | 'productDetail' | 'customerSegments';
  const [view, setView] = useState<ViewState>('main');
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<'revenue' | 'units' | 'invoices'>('revenue');

  // Segmentation state
  type SegmentSubView = 'overview' | 'customers' | 'product-buyers';
  const [segmentSubView, setSegmentSubView] = useState<SegmentSubView>('overview');
  const [segmentSearch, setSegmentSearch] = useState('');
  const [segmentSort, setSegmentSort] = useState<'spend' | 'orders' | 'lastOrder' | 'ltv' | 'aov' | 'name' | 'rfm'>('spend');
  const [segmentSortDir, setSegmentSortDir] = useState<'asc' | 'desc'>('desc');
  const [segmentFilters, setSegmentFilters] = useState({ income: 'All', orders: 'All', region: 'All', churn: 'All', rfm: 'All', salesRep: 'All', minSpend: '' });
  const [segmentPage, setSegmentPage] = useState(1);
  const [selectedSegmentCustomer, setSelectedSegmentCustomer] = useState<any | null>(null);
  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [productBuyerSearch, setProductBuyerSearch] = useState('');
  const [productBuyerPage, setProductBuyerPage] = useState(1);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [deadStockCategoryFilter, setDeadStockCategoryFilter] = useState('All');
  const [reportsTab, setReportsTab] = useState<'overview' | 'analytics'>('overview');
  const [selectedSupplier, setSelectedSupplier] = useState<{ name: string; transactions: any[] } | null>(null);
  const [selectedEmployeeForClosures, setSelectedEmployeeForClosures] = useState<{ id: string; name: string } | null>(null);

  const filingStats = useMemo(() => {
    let filed = 0;
    let notFiled = 0;
    let notUpdated = 0;

    const checkStatus = (status?: string) => {
      if (!status || status === 'Not Updated') notUpdated++;
      else if (status === 'Filed') filed++;
      else if (status === 'Not Filed') notFiled++;
    };

    invoices.forEach(i => checkStatus(i.filedStatus));
    purchaseRecords.forEach(r => checkStatus(r.filedStatus));
    (deliveryChallans || []).forEach(c => checkStatus(c.filedStatus));
    (serviceReports || []).forEach(r => checkStatus(r.filedStatus));
    (installationReports || []).forEach(r => checkStatus(r.filedStatus));

    const total = filed + notFiled + notUpdated;
    const filedRatio = total > 0 ? (filed / total) * 100 : 0;
    const notFiledRatio = total > 0 ? (notFiled / total) * 100 : 0;
    const notUpdatedRatio = total > 0 ? (notUpdated / total) * 100 : 0;

    return { total, filed, notFiled, notUpdated, filedRatio, notFiledRatio, notUpdatedRatio };
  }, [invoices, purchaseRecords, deliveryChallans, serviceReports, installationReports]);

  const getCardClasses = (sectionId: string, defaultSpan: string) => {
    const isExpanded = expandedSection === sectionId;
    const hasExpanded = expandedSection !== null;

    if (isExpanded) {
      return `col-span-full md:col-span-6 bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border-2 border-medical-500 shadow-lg ring-4 ring-medical-500/5 flex flex-col min-h-[300px] md:min-h-[420px] transition-all duration-300 transform scale-[1.005] cursor-pointer`;
    }
    if (hasExpanded) {
      return `col-span-full md:col-span-2 bg-white p-3 md:p-4 rounded-[1.25rem] md:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-[140px] md:h-[180px] overflow-hidden opacity-50 hover:opacity-95 transition-all duration-300 cursor-pointer`;
    }
    return `col-span-full ${defaultSpan} bg-white p-3 md:p-4 rounded-[1.25rem] md:rounded-[2rem] border border-slate-300 shadow-sm flex flex-col transition-all duration-300 cursor-pointer hover:border-slate-400 hover:shadow-md`;
  };

  const filterByDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    
    if (dateRange === 'Today') {
      return d.toDateString() === now.toDateString();
    }
    if (dateRange === 'This Week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      return d >= startOfWeek;
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

  const analyticsData = useMemo(() => {
    // 1. Top Customers (based on invoiced amounts)
    const customerMap: Record<string, number> = {};
    let totalSales = 0;
    invoices.forEach((inv) => {
      if (inv.documentType !== 'Invoice' || inv.status === 'Draft' || inv.status === 'Cancelled') return;
      if (!(inv.invoiceNumber || '').startsWith('SM/')) return;
      if (!filterByDateRange(inv.date)) return;
      const name = inv.customerName || (inv as any).clientName || 'Unknown Customer';
      const amt = inv.grandTotal || 0;
      customerMap[name] = (customerMap[name] || 0) + amt;
      totalSales += amt;
    });

    const topCustomers = Object.entries(customerMap)
      .map(([name, total]) => ({
        name,
        total,
        percentage: totalSales > 0 ? (total / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 1b. Employee Sales Performance (based on closedBy)
    const employeeSalesMap: Record<string, { total: number; invoices: number; name: string }> = {};
    invoices.forEach((inv) => {
      if (inv.documentType !== 'Invoice' || inv.status === 'Draft' || inv.status === 'Cancelled') return;
      if (!(inv.invoiceNumber || '').startsWith('SM/')) return;
      if (!filterByDateRange(inv.date)) return;
      if (inv.closedBy && inv.closedBy !== 'Direct') {
        const emp = (employees || []).find(e => e.id === inv.closedBy || e.name === inv.closedBy);
        const name = emp ? emp.name : inv.closedBy;
        const id = emp ? emp.id : inv.closedBy;
        const amt = inv.grandTotal || 0;
        if (!employeeSalesMap[id]) employeeSalesMap[id] = { total: 0, invoices: 0, name };
        employeeSalesMap[id].total += amt;
        employeeSalesMap[id].invoices += 1;
      }
    });

    const topEmployees = Object.entries(employeeSalesMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        total: data.total,
        invoices: data.invoices,
        percentage: totalSales > 0 ? (data.total / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    // 2. Expenses Breakdown
    const expenseMap: Record<string, number> = {};
    expenses.forEach((exp) => {
      if (exp.status !== 'Approved') return;
      if (!filterByDateRange(exp.date)) return;
      const cat = exp.category || 'Other';
      expenseMap[cat] = (expenseMap[cat] || 0) + (exp.amount || 0);
    });

    // Add purchase records as "Procurement" expense
    let procurementTotal = 0;
    (purchaseRecords || []).forEach((rec: any) => {
      if (!filterByDateRange(rec.dateSupply || rec.materialReceivedDate)) return;
      procurementTotal += rec.total || 0;
    });
    if (procurementTotal > 0) {
      expenseMap['Procurement'] = (expenseMap['Procurement'] || 0) + procurementTotal;
    }

    const expenseCategories = Object.entries(expenseMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. Supplier Volume
    const supplierMap: Record<string, { total: number; transactions: number; osAmount: number }> = {};
    (purchaseRecords || []).forEach((rec: any) => {
      if (!filterByDateRange(rec.dateSupply || rec.materialReceivedDate)) return;
      const name = rec.supplier || 'Unknown Supplier';
      if (!supplierMap[name]) {
        supplierMap[name] = { total: 0, transactions: 0, osAmount: 0 };
      }
      supplierMap[name].total += rec.total || 0;
      supplierMap[name].transactions += 1;
    });
    // Supplier volume (only from purchase records)

    const topSuppliers = Object.entries(supplierMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 4. Product Line Analysis
    const productMap: Record<string, { qty: number; total: number }> = {};
    invoices.forEach((inv) => {
      if (!(inv.invoiceNumber || '').startsWith('SM/') || inv.status === 'Draft' || inv.status === 'Cancelled') return;
      if (!filterByDateRange(inv.date)) return;
      (inv.items || []).forEach((item: any) => {
        const name = item.description || 'Unknown Product';
        if (!productMap[name]) {
          productMap[name] = { qty: 0, total: 0 };
        }
        productMap[name].qty += item.quantity || 0;
        productMap[name].total += item.amount || 0;
      });
    });

    const topProducts = Object.entries(productMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 5. Receivables Aging
    const outstandingInvoices = invoices.filter(inv => 
      (inv.documentType === 'Invoice' || (inv.invoiceNumber || '').startsWith('SM/')) &&
      inv.status !== 'Cancelled' && inv.status !== 'Draft' &&
      (inv.grandTotal - (inv.paidAmount || 0)) > 1
    );

    const agingBuckets = [
      { name: 'Current (< 30d)', min: 0, max: 30, value: 0, count: 0 },
      { name: '31 - 60 Days', min: 31, max: 60, value: 0, count: 0 },
      { name: '61 - 90 Days', min: 61, max: 90, value: 0, count: 0 },
      { name: '90+ Days', min: 91, max: Infinity, value: 0, count: 0 }
    ];

    outstandingInvoices.forEach(inv => {
      const date = new Date(inv.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const balance = inv.grandTotal - (inv.paidAmount || 0);

      const bucket = agingBuckets.find(b => days >= b.min && days <= b.max) || agingBuckets[3];
      bucket.value += balance;
      bucket.count += 1;
    });

    // 6. Freight Charges Analysis
    const freightByCustomer: Record<string, { freight: number; gst: number; invoices: number }> = {};
    let totalFreightAmount = 0;
    let totalFreightGst = 0;
    invoices.forEach((inv) => {
      if (inv.status === 'Draft' || inv.status === 'Cancelled') return;
      if (!filterByDateRange(inv.date)) return;
      const amt = Number(inv.freightAmount) || 0;
      const rate = Number(inv.freightTaxRate) || 0;
      const gst = (amt * rate) / 100;
      if (amt > 0) {
        const name = inv.customerName || 'Unknown Customer';
        if (!freightByCustomer[name]) freightByCustomer[name] = { freight: 0, gst: 0, invoices: 0 };
        freightByCustomer[name].freight += amt;
        freightByCustomer[name].gst += gst;
        freightByCustomer[name].invoices += 1;
        totalFreightAmount += amt;
        totalFreightGst += gst;
      }
    });
    const topFreightCustomers = Object.entries(freightByCustomer)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.freight - a.freight)
      .slice(0, 10);

    return {
      topCustomers,
      topEmployees,
      expenseCategories,
      topSuppliers,
      topProducts,
      agingBuckets,
      totalSales,
      totalFreightAmount,
      totalFreightGst,
      topFreightCustomers,
    };
  }, [invoices, expenses, purchaseRecords, dateRange]);
 
  const deadStockData = useMemo(() => {
    const today = new Date();
    const deadThresholdDays = 180;
    
    // 1. Build map of last sold date for each product name
    const productLastSaleMap: Record<string, string> = {};
    invoices.forEach(inv => {
      if (inv.documentType !== 'Invoice' || inv.status === 'Draft' || inv.status === 'Cancelled') return;
      const date = inv.date;
      if (!date) return;
      (inv.items || []).forEach((item: any) => {
        const pName = (item.description || '').trim().toLowerCase();
        if (!pName) return;
        if (!productLastSaleMap[pName] || date > productLastSaleMap[pName]) {
          productLastSaleMap[pName] = date;
        }
      });
    });

    // 2. Identify products with stock > 0 and (no sales in last 180 days OR never sold)
    const deadProducts = (products || []).filter(prod => {
      if (prod.stock <= 0) return false;
      const pName = (prod.name || '').trim().toLowerCase();
      const lastSaleDateStr = productLastSaleMap[pName];
      if (!lastSaleDateStr) return true; // Never sold
      
      const lastSaleDate = new Date(lastSaleDateStr);
      const diffTime = today.getTime() - lastSaleDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= deadThresholdDays;
    }).map(prod => {
      const pName = (prod.name || '').trim().toLowerCase();
      const lastSaleDateStr = productLastSaleMap[pName];
      const diffDays = lastSaleDateStr 
        ? Math.ceil((today.getTime() - new Date(lastSaleDateStr).getTime()) / (1000 * 60 * 60 * 24))
        : 9999;
      return {
        ...prod,
        lastSaleDate: lastSaleDateStr || 'Never Sold',
        daysInactive: diffDays,
        totalCostValue: prod.stock * (prod.purchasePrice || 0),
        totalSaleValue: prod.stock * (prod.sellingPrice || 0)
      };
    }).sort((a, b) => b.totalCostValue - a.totalCostValue);

    const totalCostValue = deadProducts.reduce((sum, p) => sum + p.totalCostValue, 0);
    const totalItemsCount = deadProducts.reduce((sum, p) => sum + p.stock, 0);

    return {
      items: deadProducts,
      totalCostValue,
      totalItemsCount
    };
  }, [products, invoices]);

  const filteredDeadStockItems = useMemo(() => {
    return deadStockData.items.filter(p => 
      deadStockCategoryFilter === 'All' || p.category === deadStockCategoryFilter
    );
  }, [deadStockData.items, deadStockCategoryFilter]);

  const filteredDeadStockCostValue = useMemo(() => {
    return filteredDeadStockItems.reduce((sum, p) => sum + p.totalCostValue, 0);
  }, [filteredDeadStockItems]);

  const filteredDeadStockItemsCount = useMemo(() => {
    return filteredDeadStockItems.reduce((sum, p) => sum + p.stock, 0);
  }, [filteredDeadStockItems]);

  const deadStockCategories = useMemo(() => {
    return ['All', ...new Set(deadStockData.items.map(p => p.category).filter(Boolean))];
  }, [deadStockData.items]);

  const customerSegmentsData = useMemo(() => {
    const customerMap: Record<string, any> = {};
    const today = new Date();

    const getRegion = (addr: string, gstin?: string) => {
      const gst = (gstin || '').trim();
      
      // Match via GST State Code (first two digits of GSTIN in India)
      if (gst && /^\d{2}/.test(gst)) {
        const code = gst.substring(0, 2);
        if (['33', '29', '32', '37', '36', '34'].includes(code)) return 'South';
        if (['07', '06', '03', '09', '05', '02', '01', '04'].includes(code)) return 'North';
        if (['27', '24', '08', '30', '23', '22'].includes(code)) return 'West/Central';
        if (['19', '10', '21', '20', '18', '11', '17', '16', '12', '14', '15', '13'].includes(code)) return 'East/North-East';
      }

      if (!addr) return 'Unknown';
      const s = addr.toLowerCase().trim();
      
      // Match South
      if (
        ['tamil nadu', 'tamilnadu', 'kerala', 'karnataka', 'andhra pradesh', 'telangana', 'puducherry', 'pondicherry', 'chennai', 'bengaluru', 'bangalore', 'hyderabad', 'kochi', 'coimbatore', 'madurai', 'trichy', 'trivandrum', 'vizag', 'vijayawada'].some(st => s.includes(st)) ||
        /\b(tn|kl|ka|ap|ts)\b/.test(s)
      ) return 'South';
      
      // Match North
      if (
        ['delhi', 'new delhi', 'ncr', 'haryana', 'punjab', 'uttar pradesh', 'uttarakhand', 'himachal pradesh', 'jammu', 'kashmir', 'chandigarh', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'lucknow', 'kanpur', 'amritsar', 'ludhiana', 'dehradun'].some(st => s.includes(st)) ||
        /\b(dl|hr|pb|up|uk|hp|jk)\b/.test(s)
      ) return 'North';
      
      // Match West/Central
      if (
        ['maharashtra', 'gujarat', 'rajasthan', 'goa', 'madhya pradesh', 'chhattisgarh', 'mumbai', 'pune', 'nagpur', 'ahmedabad', 'surat', 'vadodara', 'jaipur', 'jodhpur', 'indore', 'bhopal', 'raipur'].some(st => s.includes(st)) ||
        /\b(mh|gj|rj|mp|cg)\b/.test(s)
      ) return 'West/Central';
      
      // Match East/North-East
      if (
        ['west bengal', 'kolkata', 'calcutta', 'bihar', 'patna', 'odisha', 'orissa', 'bhubaneswar', 'jharkhand', 'ranchi', 'assam', 'guwahati', 'sikkim', 'meghalaya', 'shillong', 'tripura', 'arunachal', 'manipur', 'mizoram', 'nagaland'].some(st => s.includes(st)) ||
        /\b(wb|jh|or|as)\b/.test(s)
      ) return 'East/North-East';

      return 'Unknown';
    };

    invoices.forEach(inv => {
      if (inv.documentType !== 'Invoice' || inv.status === 'Draft' || inv.status === 'Cancelled') return;
      if (!(inv.invoiceNumber || '').startsWith('SM/')) return;
      if (!filterByDateRange(inv.date)) return;

      const name = inv.customerName || (inv as any).clientName || 'Unknown Customer';
      const clientObj = (clients || []).find(c => {
        const cName = c.name?.trim().toLowerCase() || '';
        const cHosp = c.hospital?.trim().toLowerCase() || '';
        const invName = name?.trim().toLowerCase() || '';
        return (
          cName === invName || 
          cHosp === invName ||
          (cName && invName.includes(cName)) ||
          (cHosp && invName.includes(cHosp)) ||
          (cName && cName.includes(invName))
        );
      });
      const email = inv.email || clientObj?.email || '';
      const phone = inv.phone || clientObj?.phone || '';
      const address = inv.customerAddress || clientObj?.address || '';
      const gstin = inv.customerGstin || (inv as any).buyerGstin || clientObj?.gstin || '';
      const amt = inv.grandTotal || 0;
      const date = inv.date || '';
      const salesRep = (() => {
        if (!inv.closedBy || inv.closedBy === 'Direct') return 'Direct';
        const emp = (employees || []).find(e => e.id === inv.closedBy || e.name?.trim().toLowerCase() === inv.closedBy?.trim().toLowerCase());
        return emp ? emp.name : inv.closedBy;
      })();

      if (!customerMap[name]) {
        customerMap[name] = {
          id: name, name, email, phone,
          location: address,
          region: getRegion(address, gstin),
          totalOrders: 0, totalSpend: 0, aov: 0,
          lastOrderDate: date, customerSince: date,
          incomeCategory: '', orderCategory: '',
          churnRisk: 'Low', rfmScore: 0, rfmLabel: 'New',
          rfmR: 0, rfmF: 0, rfmM: 0,
          ltv: 0, daysSinceLastOrder: 0, avgOrderGapDays: 0,
          salesRep,
          purchasedProducts: {} as Record<string, { name: string; qty: number; revenue: number; lastDate: string }>,
        };
      }

      const c = customerMap[name];
      c.totalOrders += 1;
      c.totalSpend += amt;
      if (date > c.lastOrderDate) { c.lastOrderDate = date; c.salesRep = salesRep; }
      if (c.customerSince === '' || date < c.customerSince) c.customerSince = date;

      // Track products per customer
      (inv.items || []).forEach((item: any) => {
        const pName = item.description || 'Unknown Product';
        if (!c.purchasedProducts[pName]) {
          c.purchasedProducts[pName] = { name: pName, qty: 0, revenue: 0, lastDate: date };
        }
        c.purchasedProducts[pName].qty += item.quantity || 0;
        c.purchasedProducts[pName].revenue += item.amount || 0;
        if (date > c.purchasedProducts[pName].lastDate) c.purchasedProducts[pName].lastDate = date;
      });
    });

    return Object.values(customerMap).map((c: any) => {
      c.aov = c.totalOrders > 0 ? c.totalSpend / c.totalOrders : 0;
      c.ltv = c.totalSpend;

      // Income category
      if (c.totalSpend >= 500000) c.incomeCategory = 'Premium';
      else if (c.totalSpend >= 100000) c.incomeCategory = 'High';
      else if (c.totalSpend >= 50000) c.incomeCategory = 'Medium';
      else c.incomeCategory = 'Low';

      // Order category
      if (c.totalOrders >= 10) c.orderCategory = 'Loyal';
      else if (c.totalOrders >= 4) c.orderCategory = 'Repeat';
      else if (c.totalOrders >= 2) c.orderCategory = 'Occasional';
      else c.orderCategory = 'First-time';

      // Days since last order & avg gap
      const lastDate = new Date(c.lastOrderDate);
      const sinceDate = new Date(c.customerSince);
      c.daysSinceLastOrder = Math.max(0, Math.floor((today.getTime() - lastDate.getTime()) / 86400000));
      if (c.totalOrders > 1) {
        const span = Math.floor((lastDate.getTime() - sinceDate.getTime()) / 86400000);
        c.avgOrderGapDays = span / (c.totalOrders - 1);
      } else {
        c.avgOrderGapDays = 0;
      }

      // Churn risk
      if (c.totalOrders >= 2 && c.avgOrderGapDays > 0) {
        if (c.daysSinceLastOrder > c.avgOrderGapDays * 2) c.churnRisk = 'High';
        else if (c.daysSinceLastOrder > c.avgOrderGapDays * 1.5) c.churnRisk = 'Medium';
        else c.churnRisk = 'Low';
      } else {
        if (c.daysSinceLastOrder > 180) c.churnRisk = 'High';
        else if (c.daysSinceLastOrder > 90) c.churnRisk = 'Medium';
        else c.churnRisk = 'Low';
      }

      // RFM Scoring (each dimension 1-5)
      const r = c.daysSinceLastOrder <= 30 ? 5 : c.daysSinceLastOrder <= 60 ? 4 : c.daysSinceLastOrder <= 90 ? 3 : c.daysSinceLastOrder <= 180 ? 2 : 1;
      const f = c.totalOrders >= 10 ? 5 : c.totalOrders >= 7 ? 4 : c.totalOrders >= 4 ? 3 : c.totalOrders >= 2 ? 2 : 1;
      const m = c.totalSpend >= 500000 ? 5 : c.totalSpend >= 100000 ? 4 : c.totalSpend >= 50000 ? 3 : c.totalSpend >= 20000 ? 2 : 1;
      c.rfmR = r; c.rfmF = f; c.rfmM = m;
      c.rfmScore = r + f + m;

      // RFM Label
      if (r >= 4 && f >= 4 && m >= 4) c.rfmLabel = 'Champions';
      else if (r >= 3 && f >= 3 && m >= 3) c.rfmLabel = 'Loyal';
      else if (r >= 4 && f <= 2) c.rfmLabel = 'Promising';
      else if (r <= 2 && (f + m) >= 6) c.rfmLabel = 'At Risk';
      else if (r === 1 && (f + m) < 6) c.rfmLabel = 'Dormant';
      else c.rfmLabel = 'New';

      // Flatten products to sorted array
      c.purchasedProductsList = Object.values(c.purchasedProducts)
        .sort((a: any, b: any) => b.revenue - a.revenue);
      delete c.purchasedProducts;

      return c;
    }).sort((a: any, b: any) => b.totalSpend - a.totalSpend);
  }, [invoices, employees, clients, dateRange]);

  const employeeClosuresList = useMemo(() => {
    if (!selectedEmployeeForClosures) return [];
    return invoices.filter(inv => {
      if (inv.documentType !== 'Invoice' || inv.status === 'Draft' || inv.status === 'Cancelled') return false;
      if (!(inv.invoiceNumber || '').startsWith('SM/')) return false;
      if (!filterByDateRange(inv.date)) return false;
      if (!inv.closedBy || inv.closedBy === 'Direct') return false;
      
      const emp = (employees || []).find(e => e.id === inv.closedBy || e.name === inv.closedBy);
      const name = emp ? emp.name : inv.closedBy;
      const id = emp ? emp.id : inv.closedBy;
      
      return id === selectedEmployeeForClosures.id || name === selectedEmployeeForClosures.name;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedEmployeeForClosures, invoices, dateRange, employees]);

  const handleViewInvoicePDF = async (invId: string) => {
    const fullInvoice = invoices.find(i => i.id === invId || i.invoiceNumber === invId);
    if (fullInvoice) {
      try {
        const isQuotation = fullInvoice.documentType === 'Quotation';
        const blob = await PDFService.generateInvoicePDF(fullInvoice, isQuotation, fullInvoice.selectedBank);
        previewPDF(blob, `${fullInvoice.invoiceNumber || 'Document'}.pdf`);
      } catch (err) {
        console.error("Failed to generate PDF:", err);
        alert("Error generating PDF.");
      }
    } else {
      alert("Invoice details not found.");
    }
  };

  const supplierTransactions = useMemo(() => {
    const map: Record<string, any[]> = {};
    (purchaseRecords || []).forEach((rec: any) => {
      if (!filterByDateRange(rec.dateSupply || rec.materialReceivedDate)) return;
      const name = rec.supplier || 'Unknown Supplier';
      if (!map[name]) map[name] = [];
      map[name].push({ type: 'Purchase Entry', date: rec.dateSupply || rec.materialReceivedDate, ref: rec.invoiceNo || rec.id, amount: rec.total || 0, items: rec.items, status: rec.status, id: rec.id });
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return map;
  }, [purchaseRecords, dateRange]);

  const procurementMonthly = useMemo(() => {
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const m = now.getMonth() - 11 + i;
      const date = new Date(now.getFullYear(), m, 1);
      return { label: monthsShort[date.getMonth()], month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, total: 0, count: 0 };
    });
    (purchaseRecords || []).forEach((rec: any) => {
      const d = rec.dateSupply || rec.materialReceivedDate;
      if (!d) return;
      const monthKey = d.substring(0, 7);
      const entry = data.find(e => e.month === monthKey);
      if (entry) {
        entry.total += rec.total || 0;
        entry.count += 1;
      }
    });
    return data;
  }, [purchaseRecords]);

  const freightMonthly = useMemo(() => {
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const data = Array.from({ length: 12 }, (_, i) => {
      const m = now.getMonth() - 11 + i;
      const date = new Date(now.getFullYear(), m, 1);
      return { label: monthsShort[date.getMonth()], month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, freight: 0, gst: 0, invoices: 0 };
    });
    invoices.forEach((inv) => {
      if (inv.status === 'Draft' || inv.status === 'Cancelled') return;
      const d = inv.date;
      if (!d) return;
      const monthKey = d.substring(0, 7);
      const entry = data.find(e => e.month === monthKey);
      if (entry) {
        const amt = Number(inv.freightAmount) || 0;
        const rate = Number(inv.freightTaxRate) || 0;
        entry.freight += amt;
        entry.gst += (amt * rate) / 100;
        if (amt > 0) entry.invoices += 1;
      }
    });
    return data;
  }, [invoices]);

  useEffect(() => {
    const q = query(collection(db, 'summaries'), orderBy('month', 'desc'), limit(60));
    const unsub = onSnapshot(q, (snap) => setSummaries(snap.docs.map((d) => d.data())));
    return () => unsub();
  }, []);

  // ── Chart Data ──────────────────────────────────────────────────────────
  const PERFORMANCE_DATA = useMemo(() => {
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (viewMode === 'month') {
      const daysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`, revenue: 0, expenses: 0, profit: 0,
        raw: `${currentMonthStr}-${String(i + 1).padStart(2, '0')}`,
      }));
      invoices.forEach((inv) => {
        if (inv.status === 'Draft' || !inv.date.startsWith(currentMonthStr)) return;
        const day = parseInt(inv.date.split('-')[2]);
        if (day && dailyData[day - 1]) {
          if ((inv as any).documentType !== 'Quotation' && (inv as any).documentType !== 'PO') dailyData[day - 1].revenue += inv.grandTotal || 0;
        }
      });
      expenses.forEach((exp) => {
        if (exp.status !== 'Approved' || !exp.date.startsWith(currentMonthStr)) return;
        const day = parseInt(exp.date.split('-')[2]);
        if (day && dailyData[day - 1]) dailyData[day - 1].expenses += exp.amount || 0;
      });
      (purchaseRecords || []).forEach((rec: any) => {
        const dStr = rec.dateSupply || rec.materialReceivedDate || '';
        if (!dStr.startsWith(currentMonthStr)) return;
        const day = parseInt(dStr.split('-')[2]);
        if (day && dailyData[day - 1]) dailyData[day - 1].expenses += rec.total || 0;
      });
      return dailyData.map((d) => ({ ...d, profit: d.revenue - d.expenses }));
    }

    if (viewMode === 'year') {
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        label: monthsShort[i], revenue: 0, expenses: 0, profit: 0,
        raw: `${currentYear}-${String(i + 1).padStart(2, '0')}`,
      }));
      invoices.forEach((inv) => {
        if (inv.status === 'Draft' || !inv.date.startsWith(`${currentYear}-`)) return;
        const month = parseInt(inv.date.split('-')[1]);
        if (month && monthlyData[month - 1]) {
          if ((inv as any).documentType !== 'Quotation' && (inv as any).documentType !== 'PO') monthlyData[month - 1].revenue += inv.grandTotal || 0;
        }
      });
      expenses.forEach((exp) => {
        if (exp.status !== 'Approved' || !exp.date.startsWith(`${currentYear}-`)) return;
        const month = parseInt(exp.date.split('-')[1]);
        if (month && monthlyData[month - 1]) monthlyData[month - 1].expenses += exp.amount || 0;
      });
      (purchaseRecords || []).forEach((rec: any) => {
        const dStr = rec.dateSupply || rec.materialReceivedDate || '';
        if (!dStr.startsWith(`${currentYear}-`)) return;
        const month = parseInt(dStr.split('-')[1]);
        if (month && monthlyData[month - 1]) monthlyData[month - 1].expenses += rec.total || 0;
      });
      return monthlyData.map((d) => ({ ...d, profit: d.revenue - d.expenses }));
    }

    // viewMode === 'overall'
    const yearMap: Record<string, any> = {};
    const addYearData = (dateStr: string, rev: number, exp: number) => {
      if (!dateStr) return;
      const year = dateStr.split('-')[0];
      if (!year || year.length !== 4) return;
      if (!yearMap[year]) yearMap[year] = { label: year, revenue: 0, expenses: 0, profit: 0, raw: year };
      yearMap[year].revenue += rev;
      yearMap[year].expenses += exp;
    };
    invoices.forEach((inv) => {
      if (inv.status === 'Draft') return;
      if ((inv as any).documentType !== 'Quotation' && (inv as any).documentType !== 'PO') addYearData(inv.date, inv.grandTotal || 0, 0);
    });
    expenses.forEach((exp) => {
      if (exp.status === 'Approved') addYearData(exp.date, 0, exp.amount || 0);
    });
    (purchaseRecords || []).forEach((rec: any) => {
      addYearData(rec.dateSupply || rec.materialReceivedDate, 0, rec.total || 0);
    });
    return Object.values(yearMap)
      .map((d: any) => ({ ...d, profit: d.revenue - d.expenses }))
      .sort((a: any, b: any) => a.raw.localeCompare(b.raw));
      
  }, [viewMode, invoices, expenses, purchaseRecords]);

  const CATEGORY_DATA = useMemo(() => {
    const catMap: Record<string, number> = {};
    const normalize = (cat: string) => {
      const c = cat.toLowerCase().trim();
      if (c === 'consumable') return 'Consumable';
      if (c === 'pipe line') return 'Pipe Line';
      if (c === 'equipment') return 'Equipment';
      if (c === 'spare part') return 'Spare Part';
      if (c === 'furniture') return 'Furniture';
      return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
    };
    (products || []).forEach((p) => {
      const category = p.category ? normalize(p.category) : 'Miscellaneous';
      catMap[category] = (catMap[category] || 0) + 1;
    });
    const result = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return result.length > 0 ? result : [{ name: 'No Data', value: 1 }];
  }, [products]);

  // ── All Products Detail (expanded from TOP_PRODUCTS) ─────────────────────
  const ALL_PRODUCTS_DETAIL = useMemo((): ProductDetail[] => {
    const prodMap: Record<string, ProductDetail> = {};

    invoices.forEach((inv) => {
      if (!(inv.invoiceNumber || '').startsWith('SM/') || inv.status === 'Draft' || inv.status === 'Cancelled') return;
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
          customer: (inv as any).clientName || 'Unknown',
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

  const filteredInvoices = invoices.filter(inv => filterByDateRange(inv.date));
  const filteredExpenses = expenses.filter(exp => filterByDateRange(exp.date));
  const filteredPurchaseRecords = (purchaseRecords || []).filter((rec: any) => filterByDateRange(rec.dateSupply || rec.materialReceivedDate));

  const totalRevenue = filteredInvoices.reduce((sum, inv) => {
    if (inv.status === 'Draft' || (inv as any).documentType === 'Quotation' || (inv as any).documentType === 'PO' || (inv as any).documentType === 'SupplierPO') return sum;
    return sum + (inv.grandTotal || 0);
  }, 0);
  const totalPurchaseRecords = filteredPurchaseRecords.reduce((sum: number, rec: any) => sum + (rec.total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => exp.status === 'Approved' ? sum + (exp.amount || 0) : sum, 0);
  const totalProfit = totalRevenue - (totalExpenses + totalPurchaseRecords);
  const growthRate = 24.5;

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
    
    // Pre-calculate filing status categories
    const filingCategoriesList = ['Invoices', 'Purchase Records', 'Delivery Challans', 'Service Reports', 'Installation Reports'].map((type) => {
      let filed = 0, pending = 0, notUpdated = 0;
      const check = (status?: string) => {
        if (!status || status === 'Not Updated') notUpdated++;
        else if (status === 'Filed') filed++;
        else if (status === 'Not Filed') pending++;
      };
      if (type === 'Invoices') invoices.forEach(i => check(i.filedStatus));
      else if (type === 'Purchase Records') purchaseRecords.forEach(r => check(r.filedStatus));
      else if (type === 'Delivery Challans') (deliveryChallans || []).forEach(c => check(c.filedStatus));
      else if (type === 'Service Reports') (serviceReports || []).forEach(r => check(r.filedStatus));
      else if (type === 'Installation Reports') (installationReports || []).forEach(r => check(r.filedStatus));
      return ['FILING TRACKER', type, `Filed: ${filed}`, `Pending: ${pending}`, `Not Updated: ${notUpdated}`];
    });

    const summaryRows = [
      ['SUMMARY', 'Total Sales', totalRevenue, '', ''],
      ['SUMMARY', 'Net Profit', totalProfit, '', ''],
      ['SUMMARY', 'Total Expense (PO + Exp)', totalExpenses, '', ''],
      ['', '', '', '', ''],
      ['TOP PRODUCTS', 'Product Name', 'Units', 'Revenue', ''],
      ...TOP_PRODUCTS.map((p) => ['TOP PRODUCTS', `"${p.name.replace(/"/g, '""')}"`, p.totalQty, p.totalRevenue.toFixed(2), '']),
      ['', '', '', '', ''],
      ['FILING TRACKER', 'Document Type', 'Filed Count', 'Pending Count', 'Not Updated Count'],
      ...filingCategoriesList
    ];
    const csv = [headers, ...summaryRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Enterprise_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportDeadStockCSV = () => {
    const headers = ['Product Name', 'Category', 'SKU', 'Stock Qty', 'Unit', 'Purchase Price (₹)', 'Selling Price (₹)', 'Total Cost Value (₹)', 'Last Sale Date', 'Days Inactive'];
    const rows = filteredDeadStockItems.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      `"${p.sku || ''}"`,
      p.stock,
      p.unit,
      (p.purchasePrice || 0).toFixed(2),
      (p.sellingPrice || 0).toFixed(2),
      p.totalCostValue.toFixed(2),
      p.lastSaleDate,
      p.daysInactive === 9999 ? 'Never Sold' : p.daysInactive
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Dead_Stock_Inventory_${deadStockCategoryFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: CUSTOMER INTELLIGENCE (3-TAB)
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'customerSegments') {
    // ─ Derived lists ──────────────────────────────────────────────────────────────────────
    const allProductNamesFromSegments = [...new Set(
      customerSegmentsData.flatMap(c => (c.purchasedProductsList || []).map((p: any) => p.name))
    )].sort() as string[];

    const allSalesRepsFromSegments = [...new Set(
      customerSegmentsData.map(c => c.salesRep).filter(Boolean)
    )].sort() as string[];

    // ─ Customer List filtered & sorted (AND logic for all filters) ─────────────────────
    const minSpendNum = parseFloat(segmentFilters.minSpend) || 0;
    const filteredSegments = customerSegmentsData.filter(c => {
      const q = segmentSearch.toLowerCase();
      const matchesSearch = !segmentSearch || c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(segmentSearch) || c.id.toLowerCase().includes(q);
      const matchesIncome   = segmentFilters.income   === 'All' || c.incomeCategory === segmentFilters.income;
      const matchesOrders   = segmentFilters.orders   === 'All' || c.orderCategory  === segmentFilters.orders;
      const matchesRegion   = segmentFilters.region   === 'All' || c.region         === segmentFilters.region;
      const matchesChurn    = segmentFilters.churn    === 'All' || c.churnRisk      === segmentFilters.churn;
      const matchesRfm      = segmentFilters.rfm      === 'All' || c.rfmLabel       === segmentFilters.rfm;
      const matchesSalesRep = segmentFilters.salesRep === 'All' || c.salesRep       === segmentFilters.salesRep;
      const matchesMinSpend = minSpendNum === 0 || c.totalSpend >= minSpendNum;
      return matchesSearch && matchesIncome && matchesOrders && matchesRegion && matchesChurn && matchesRfm && matchesSalesRep && matchesMinSpend;
    }).sort((a, b) => {
      let av: any, bv: any;
      if (segmentSort === 'orders')    { av = a.totalOrders;  bv = b.totalOrders; }
      else if (segmentSort === 'lastOrder') { av = a.lastOrderDate; bv = b.lastOrderDate; }
      else if (segmentSort === 'ltv')  { av = a.ltv;  bv = b.ltv; }
      else if (segmentSort === 'aov')  { av = a.aov;  bv = b.aov; }
      else if (segmentSort === 'name') { av = a.name; bv = b.name; }
      else if (segmentSort === 'rfm')  { av = a.rfmScore; bv = b.rfmScore; }
      else                             { av = a.totalSpend; bv = b.totalSpend; }
      if (typeof av === 'string') return segmentSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return segmentSortDir === 'asc' ? av - bv : bv - av;
    });

    const PAGE_SIZE = 20;
    const totalPages = Math.ceil(filteredSegments.length / PAGE_SIZE) || 1;
    const paginatedSegments = filteredSegments.slice((segmentPage - 1) * PAGE_SIZE, segmentPage * PAGE_SIZE);
    const totalFilteredSpend = filteredSegments.reduce((sum, c) => sum + c.totalSpend, 0);

    // ─ Product Buyers ───────────────────────────────────────────────────────────────────
    const productBuyerRaw = selectedProductFilter
      ? customerSegmentsData
          .filter(c => (c.purchasedProductsList || []).some((p: any) => p.name === selectedProductFilter))
          .map(c => {
            const prod = (c.purchasedProductsList || []).find((p: any) => p.name === selectedProductFilter);
            const clientObj = (clients || []).find(cl => {
              const clName = cl.name?.trim().toLowerCase() || '';
              const clHosp = cl.hospital?.trim().toLowerCase() || '';
              const cName = c.name?.trim().toLowerCase() || '';
              return (
                clName === cName ||
                clHosp === cName ||
                (clName && cName.includes(clName)) ||
                (clHosp && cName.includes(clHosp)) ||
                (clName && clName.includes(cName))
              );
            });
            return { 
              ...c, 
              email: c.email || clientObj?.email || '',
              phone: c.phone || clientObj?.phone || '',
              prodQty: prod?.qty || 0, 
              prodRevenue: prod?.revenue || 0, 
              prodLastDate: prod?.lastDate || '' 
            };
          })
      : [];
    const productBuyerFiltered = productBuyerRaw.filter(c => {
      if (!productBuyerSearch) return true;
      const q = productBuyerSearch.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(productBuyerSearch);
    }).sort((a, b) => b.prodRevenue - a.prodRevenue);
    const PB_PAGE = 20;
    const totalPbPages = Math.ceil(productBuyerFiltered.length / PB_PAGE) || 1;
    const paginatedBuyers = productBuyerFiltered.slice((productBuyerPage - 1) * PB_PAGE, productBuyerPage * PB_PAGE);

    // ─ RFM & Churn summaries ────────────────────────────────────────────────────────
    const rfmGroups = [
      { label: 'Champions',  color: 'bg-amber-50 border-amber-200 text-amber-800',   count: customerSegmentsData.filter(c => c.rfmLabel === 'Champions').length,  desc: 'Buy often, spend high, very recent' },
      { label: 'Loyal',      color: 'bg-emerald-50 border-emerald-200 text-emerald-800', count: customerSegmentsData.filter(c => c.rfmLabel === 'Loyal').length,  desc: 'Regular buyers with good spend' },
      { label: 'Promising',  color: 'bg-blue-50 border-blue-200 text-blue-800',      count: customerSegmentsData.filter(c => c.rfmLabel === 'Promising').length,  desc: 'Recent buyers, low frequency yet' },
      { label: 'At Risk',    color: 'bg-orange-50 border-orange-200 text-orange-800',count: customerSegmentsData.filter(c => c.rfmLabel === 'At Risk').length,    desc: 'Once loyal, gone quiet recently' },
      { label: 'Dormant',    color: 'bg-rose-50 border-rose-200 text-rose-800',      count: customerSegmentsData.filter(c => c.rfmLabel === 'Dormant').length,    desc: 'Long inactive, low value history' },
      { label: 'New',        color: 'bg-indigo-50 border-indigo-200 text-indigo-800',count: customerSegmentsData.filter(c => c.rfmLabel === 'New').length,        desc: 'First-time or very early stage' },
    ];
    const churnHighList = customerSegmentsData.filter(c => c.churnRisk === 'High').slice(0, 6);
    const churnHighCount = customerSegmentsData.filter(c => c.churnRisk === 'High').length;

    // ─ KPIs ───────────────────────────────────────────────────────────────────────
    const totalRevFromSeg = customerSegmentsData.reduce((s, c) => s + c.totalSpend, 0);
    const avgAovAll = customerSegmentsData.length > 0 ? customerSegmentsData.reduce((s, c) => s + c.aov, 0) / customerSegmentsData.length : 0;
    const avgLtvAll = customerSegmentsData.length > 0 ? totalRevFromSeg / customerSegmentsData.length : 0;
    const totalOrdersAll = customerSegmentsData.reduce((s, c) => s + c.totalOrders, 0);

    // ─ Donut chart data ───────────────────────────────────────────────────────────────
    const DONUT_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#94a3b8'];
    const donutData = ['Premium', 'High', 'Medium', 'Low'].map((cat, i) => ({
      name: cat, value: customerSegmentsData.filter(c => c.incomeCategory === cat).length
    })).filter(d => d.value > 0);

    // ─ Export helpers ─────────────────────────────────────────────────────────────────
    const handleExportSegmentsCSV = () => {
      const headers = ['Customer', 'Email', 'Phone', 'Location', 'Region', 'Income', 'Order Cat.', 'RFM', 'Churn', 'Orders', 'Spend (₹)', 'AOV (₹)', 'LTV (₹)', 'Days Since', 'Last Order', 'Since', 'Sales Rep'];
      const rows = filteredSegments.map(c => [
        `"${c.name.replace(/"/g, '""')}"`, `"${c.email}"`, `"${c.phone}"`, `"${c.location.replace(/"/g, '""')}"`,
        c.region, c.incomeCategory, c.orderCategory, c.rfmLabel, c.churnRisk,
        c.totalOrders, c.totalSpend.toFixed(2), c.aov.toFixed(2), c.ltv.toFixed(2),
        c.daysSinceLastOrder, c.lastOrderDate, c.customerSince, c.salesRep
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = `Customer_Segments_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    };

    const handleExportProductBuyersCSV = () => {
      if (!selectedProductFilter) return;
      const headers = ['Customer', 'Email', 'Phone', 'Region', 'Income', 'RFM', 'Units Bought', 'Revenue (₹)', 'Last Purchase'];
      const rows = productBuyerFiltered.map(c => [
        `"${c.name.replace(/"/g, '""')}"`, `"${c.email}"`, `"${c.phone}"`,
        c.region, c.incomeCategory, c.rfmLabel, c.prodQty, c.prodRevenue.toFixed(2), c.prodLastDate
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = `Buyers_${selectedProductFilter.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    };

    const toggleSort = (col: string) => {
      if (segmentSort === col) setSegmentSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSegmentSort(col as any); setSegmentSortDir('desc'); }
      setSegmentPage(1);
    };
    const sortIcon = (col: string) => segmentSort === col ? (segmentSortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

    // Customer invoices for modal
    const customerInvoices = selectedSegmentCustomer
      ? invoices.filter(inv =>
          (inv.customerName === selectedSegmentCustomer.name || (inv as any).clientName === selectedSegmentCustomer.name) &&
          inv.documentType === 'Invoice' && inv.status !== 'Draft' && inv.status !== 'Cancelled' &&
          (inv.invoiceNumber || '').startsWith('SM/')
        ).sort((a, b) => b.date.localeCompare(a.date))
      : [];

    const rfmBadge = (label: string) => {
      if (label === 'Champions') return 'bg-amber-100 text-amber-800';
      if (label === 'Loyal')     return 'bg-emerald-100 text-emerald-800';
      if (label === 'Promising') return 'bg-blue-100 text-blue-800';
      if (label === 'At Risk')   return 'bg-orange-100 text-orange-700';
      if (label === 'Dormant')   return 'bg-rose-100 text-rose-700';
      return 'bg-indigo-50 text-indigo-700';
    };
    const churnBadge = (risk: string) => {
      if (risk === 'High')   return 'bg-rose-100 text-rose-700';
      if (risk === 'Medium') return 'bg-yellow-100 text-yellow-700';
      return 'bg-green-50 text-green-700';
    };
    const incomeBadge = (cat: string) => {
      if (cat === 'Premium') return 'bg-amber-100 text-amber-800';
      if (cat === 'High')    return 'bg-emerald-100 text-emerald-800';
      if (cat === 'Medium')  return 'bg-blue-100 text-blue-800';
      return 'bg-slate-100 text-slate-600';
    };

    const TAB_LABELS: Record<string, string> = { overview: 'Overview', customers: 'Customer List', 'product-buyers': 'Product Buyers' };

    return (
      <div className="h-full flex flex-col gap-3 overflow-y-auto p-1.5 custom-scrollbar">
        <GlobalChartDefs />

        {/* ── HEADER + TAB BAR ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 bg-white p-3 px-4 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('main'); setSegmentSearch(''); setSegmentSubView('overview'); }}
              className="p-2 rounded-[2rem] bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
            ><ArrowLeft size={16} /></button>
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Customer Intelligence</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">{customerSegmentsData.length} Customers · {dateRange}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {(['overview', 'customers', 'product-buyers'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSegmentSubView(tab)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${segmentSubView === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >{TAB_LABELS[tab]}</button>
            ))}
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {segmentSubView === 'overview' && (
          <div className="flex flex-col gap-4">

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Customers', value: customerSegmentsData.length, cls: 'text-slate-800', bg: 'bg-white' },
                { label: 'Total Revenue',   value: `₹${formatIndianNumber(totalRevFromSeg)}`, cls: 'text-emerald-600', bg: 'bg-white' },
                { label: 'Avg AOV',         value: `₹${formatIndianNumber(avgAovAll)}`, cls: 'text-blue-600', bg: 'bg-white' },
                { label: 'Avg LTV',         value: `₹${formatIndianNumber(avgLtvAll)}`, cls: 'text-indigo-600', bg: 'bg-white' },
                { label: 'Total Orders',    value: totalOrdersAll, cls: 'text-amber-600', bg: 'bg-white' },
                { label: 'Churn High Risk', value: churnHighCount, cls: 'text-rose-600', bg: 'bg-rose-50' },
              ].map((kpi, i) => (
                <div key={i} className={`${kpi.bg} p-3 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col gap-1`}>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                  <span className={`text-[14px] font-black leading-tight ${kpi.cls}`}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-4">
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">Income Distribution</h3>
                <div className="flex items-center gap-4">
                  <div className="h-[180px] flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {donutData.map((_,i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {donutData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <div>
                          <div className="text-[10px] font-black text-slate-700">{d.name}</div>
                          <div className="text-[9px] text-slate-400">{d.value} customers</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-4">
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">Order Category Breakdown</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={['Loyal','Repeat','Occasional','First-time'].map(cat => ({ name: cat, value: customerSegmentsData.filter(c => c.orderCategory === cat).length }))} margin={{ left: -20, right: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 8 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="url(#colorRev)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RFM Grid */}
            <div className="bg-white border border-slate-200 rounded-[1.5rem] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">RFM Segmentation Grid</h3>
                <span className="text-[8px] text-slate-400 font-bold">Recency · Frequency · Monetary — Click to filter</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {rfmGroups.map((g, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-[1rem] border cursor-pointer hover:scale-[1.02] transition-transform ${g.color}`}
                    onClick={() => { setSegmentFilters(f => ({ ...f, rfm: g.label })); setSegmentSubView('customers'); setSegmentPage(1); }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase">{g.label}</span>
                      <span className="text-[20px] font-black leading-none">{g.count}</span>
                    </div>
                    <p className="text-[8px] opacity-70 font-bold">{g.desc}</p>
                    <p className="text-[8px] font-black mt-1 opacity-50 uppercase">View customers →</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Churn Alert */}
            {churnHighList.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-rose-500" />
                    <h3 className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{churnHighCount} Customers at High Churn Risk</h3>
                  </div>
                  <button
                    onClick={() => { setSegmentFilters(f => ({ ...f, churn: 'High' })); setSegmentSubView('customers'); setSegmentPage(1); }}
                    className="text-[9px] font-black text-rose-600 underline uppercase hover:text-rose-800"
                  >View All →</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {churnHighList.map((c, i) => (
                    <div key={i} className="bg-white border border-rose-200 rounded-xl px-3 py-1.5">
                      <div className="text-[10px] font-black text-rose-800">{c.name}</div>
                      <div className="text-[8px] text-rose-500">{c.daysSinceLastOrder}d since last order · {formatCurrency(c.totalSpend)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CUSTOMER LIST ── */}
        {segmentSubView === 'customers' && (
          <div className="flex flex-col gap-3 flex-1">

            {/* Filters Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-3 flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[180px] relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Name, email, phone, ID..." value={segmentSearch}
                  onChange={e => { setSegmentSearch(e.target.value); setSegmentPage(1); }}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all" />
              </div>
              <select value={segmentFilters.income} onChange={e => { setSegmentFilters(f => ({ ...f, income: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All Incomes</option><option value="Premium">Premium</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
              </select>
              <select value={segmentFilters.orders} onChange={e => { setSegmentFilters(f => ({ ...f, orders: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All Order Types</option><option value="Loyal">Loyal (10+)</option><option value="Repeat">Repeat (4-9)</option><option value="Occasional">Occasional (2-3)</option><option value="First-time">First-time (1)</option>
              </select>
              <select value={segmentFilters.region} onChange={e => { setSegmentFilters(f => ({ ...f, region: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All Regions</option><option value="North">North</option><option value="South">South</option><option value="West/Central">West/Central</option><option value="East/North-East">East/North-East</option><option value="Unknown">Unknown</option>
              </select>
              <select value={segmentFilters.churn} onChange={e => { setSegmentFilters(f => ({ ...f, churn: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All Churn</option><option value="High">High Risk</option><option value="Medium">Medium Risk</option><option value="Low">Low Risk</option>
              </select>
              <select value={segmentFilters.rfm} onChange={e => { setSegmentFilters(f => ({ ...f, rfm: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All RFM</option><option value="Champions">Champions</option><option value="Loyal">Loyal</option><option value="Promising">Promising</option><option value="At Risk">At Risk</option><option value="Dormant">Dormant</option><option value="New">New</option>
              </select>
              <select value={segmentFilters.salesRep} onChange={e => { setSegmentFilters(f => ({ ...f, salesRep: e.target.value })); setSegmentPage(1); }} className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none">
                <option value="All">All Sales Reps</option>
                {allSalesRepsFromSegments.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">Min ₹</span>
                <input type="number" placeholder="0" value={segmentFilters.minSpend}
                  onChange={e => { setSegmentFilters(f => ({ ...f, minSpend: e.target.value })); setSegmentPage(1); }}
                  className="w-24 px-2 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold text-slate-700 outline-none" />
              </div>
              <button onClick={() => { setSegmentFilters({ income: 'All', orders: 'All', region: 'All', churn: 'All', rfm: 'All', salesRep: 'All', minSpend: '' }); setSegmentSearch(''); setSegmentPage(1); }}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-100 transition-all">Reset</button>
              <button onClick={handleExportSegmentsCSV}
                className="px-3 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-[10px] font-black text-white flex items-center gap-1.5 hover:bg-indigo-700 transition-all">
                <Download size={12} /> Export ({filteredSegments.length})
              </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
              {[
                { label: 'Customers', value: filteredSegments.length, cls: 'text-slate-800' },
                { label: 'Total Spend', value: `₹${formatIndianNumber(totalFilteredSpend)}`, cls: 'text-emerald-600' },
                { label: 'Avg LTV', value: `₹${formatIndianNumber(filteredSegments.length > 0 ? totalFilteredSpend / filteredSegments.length : 0)}`, cls: 'text-indigo-600' },
                { label: 'Avg Orders', value: filteredSegments.length > 0 ? (filteredSegments.reduce((s,c)=>s+c.totalOrders,0)/filteredSegments.length).toFixed(1) : 0, cls: 'text-amber-600' },
                { label: 'Champions', value: filteredSegments.filter(c=>c.rfmLabel==='Champions').length, cls: 'text-amber-700' },
                { label: 'Churn High', value: filteredSegments.filter(c=>c.churnRisk==='High').length, cls: 'text-rose-600' },
              ].map((k,i) => (
                <div key={i} className="bg-white p-2 rounded-[1rem] border border-slate-200 text-center">
                  <div className={`text-[13px] font-black ${k.cls}`}>{k.value}</div>
                  <div className="text-[8px] font-bold text-slate-400 uppercase">{k.label}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th onClick={() => toggleSort('name')}    className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600">Customer{sortIcon('name')}</th>
                      <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Region</th>
                      <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Tags</th>
                      <th onClick={() => toggleSort('orders')}  className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-indigo-600">Orders{sortIcon('orders')}</th>
                      <th onClick={() => toggleSort('spend')}   className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-indigo-600">Spend{sortIcon('spend')}</th>
                      <th onClick={() => toggleSort('aov')}     className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-indigo-600">AOV{sortIcon('aov')}</th>
                      <th onClick={() => toggleSort('ltv')}     className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-indigo-600">LTV{sortIcon('ltv')}</th>
                      <th onClick={() => toggleSort('lastOrder')} className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-indigo-600">Last Order{sortIcon('lastOrder')}</th>
                      <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Sales Rep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSegments.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => setSelectedSegmentCustomer(c)}>
                        <td className="p-3">
                          <div className="font-black text-[11px] text-slate-800">{c.name}</div>
                          <div className="text-[8px] text-slate-400">Since {c.customerSince}</div>
                        </td>
                        <td className="p-3 text-[10px] text-slate-600"><div>{c.email||'—'}</div><div>{c.phone||'—'}</div></td>
                        <td className="p-3">
                          <div className="text-[10px] font-bold text-slate-700">{c.region}</div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[140px]">{c.location||'—'}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${incomeBadge(c.incomeCategory)}`}>{c.incomeCategory}</span>
                            <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-indigo-50 text-indigo-700">{c.orderCategory}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${rfmBadge(c.rfmLabel)}`}>{c.rfmLabel}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${churnBadge(c.churnRisk)}`}>{c.churnRisk === 'High' ? '🔴' : c.churnRisk === 'Medium' ? '🟡' : '🟢'} {c.churnRisk}</span>
                          </div>
                        </td>
                        <td className="p-3 text-[11px] font-bold text-slate-700 text-right">{c.totalOrders}</td>
                        <td className="p-3 text-[11px] font-black text-emerald-700 text-right">₹{formatIndianNumber(c.totalSpend)}</td>
                        <td className="p-3 text-[10px] font-bold text-slate-600 text-right">₹{formatIndianNumber(c.aov)}</td>
                        <td className="p-3 text-[10px] font-bold text-indigo-600 text-right">₹{formatIndianNumber(c.ltv)}</td>
                        <td className="p-3 text-[10px] text-slate-500 text-right">
                          <div>{c.lastOrderDate}</div>
                          <div className="text-[8px] text-slate-400">{c.daysSinceLastOrder}d ago</div>
                        </td>
                        <td className="p-3 text-[9px] text-slate-600 font-bold">{c.salesRep || '—'}</td>
                      </tr>
                    ))}
                    {paginatedSegments.length === 0 && (
                      <tr><td colSpan={10} className="p-10 text-center text-slate-400 text-sm font-bold">No customers match the active filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-slate-500">Showing {(segmentPage-1)*PAGE_SIZE+1}–{Math.min(segmentPage*PAGE_SIZE,filteredSegments.length)} of {filteredSegments.length}</span>
                  <div className="flex items-center gap-1">
                    <button disabled={segmentPage===1} onClick={() => setSegmentPage(1)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">«</button>
                    <button disabled={segmentPage===1} onClick={() => setSegmentPage(p=>p-1)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">‹</button>
                    <span className="px-3 text-[10px] font-bold text-slate-700">{segmentPage} / {totalPages}</span>
                    <button disabled={segmentPage===totalPages} onClick={() => setSegmentPage(p=>p+1)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">›</button>
                    <button disabled={segmentPage===totalPages} onClick={() => setSegmentPage(totalPages)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">»</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: PRODUCT BUYERS ── */}
        {segmentSubView === 'product-buyers' && (
          <div className="flex flex-col gap-3 flex-1">
            <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-4">
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Package size={13} className="text-indigo-500" /> Select a Product to see all customers who bought it
              </h3>
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={selectedProductFilter}
                  onChange={e => { setSelectedProductFilter(e.target.value); setProductBuyerSearch(''); setProductBuyerPage(1); }}
                  className="flex-1 min-w-[260px] px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                >
                  <option value="">— Select a product —</option>
                  {allProductNamesFromSegments.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {selectedProductFilter && (
                  <>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search buyers..." value={productBuyerSearch}
                        onChange={e => { setProductBuyerSearch(e.target.value); setProductBuyerPage(1); }}
                        className="pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 outline-none w-[200px]" />
                    </div>
                    <button onClick={handleExportProductBuyersCSV}
                      className="px-3 py-2 bg-indigo-600 border border-indigo-700 rounded-xl text-[10px] font-black text-white flex items-center gap-1.5 hover:bg-indigo-700 transition-all">
                      <Download size={12} /> Export Buyers ({productBuyerFiltered.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {selectedProductFilter ? (
              <div className="flex flex-col gap-3 flex-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Buyers', value: productBuyerFiltered.length },
                    { label: 'Total Units', value: productBuyerFiltered.reduce((s,c)=>s+c.prodQty,0).toLocaleString('en-IN') },
                    { label: 'Total Revenue', value: `₹${formatIndianNumber(productBuyerFiltered.reduce((s,c)=>s+c.prodRevenue,0))}` },
                    { label: 'Avg Rev/Buyer', value: `₹${formatIndianNumber(productBuyerFiltered.length>0 ? productBuyerFiltered.reduce((s,c)=>s+c.prodRevenue,0)/productBuyerFiltered.length : 0)}` },
                  ].map((k,i) => (
                    <div key={i} className="bg-white p-3 rounded-[1.5rem] border border-slate-200 shadow-sm text-center">
                      <div className="text-[14px] font-black text-indigo-600">{k.value}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{k.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Customer</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Phone</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Region</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider">Segment Tags</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right">Units</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                          <th className="p-3 text-[9px] font-black text-slate-500 uppercase tracking-wider text-right">Last Purchase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBuyers.map((c, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                            <td className="p-3"><div className="font-black text-[11px] text-slate-800">{c.name}</div><div className="text-[8px] text-slate-400">{c.totalOrders} total orders</div></td>
                            <td className="p-3 text-[10px] text-slate-600 font-medium">{c.email || '—'}</td>
                            <td className="p-3 text-[10px] text-slate-700 font-bold">{c.phone || '—'}</td>
                            <td className="p-3"><div className="text-[10px] font-bold text-slate-700">{c.region}</div><div className="text-[9px] text-slate-400 truncate max-w-[130px]">{c.location||'—'}</div></td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${incomeBadge(c.incomeCategory)}`}>{c.incomeCategory}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${rfmBadge(c.rfmLabel)}`}>{c.rfmLabel}</span>
                              </div>
                            </td>
                            <td className="p-3 text-[12px] font-black text-slate-700 text-right">{c.prodQty}</td>
                            <td className="p-3 text-[12px] font-black text-emerald-700 text-right">₹{formatIndianNumber(c.prodRevenue)}</td>
                            <td className="p-3 text-[10px] text-slate-500 text-right">{c.prodLastDate}</td>
                          </tr>
                        ))}
                        {paginatedBuyers.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400 font-bold">No buyers found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {totalPbPages > 1 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-slate-500">{productBuyerFiltered.length} total buyers</span>
                      <div className="flex items-center gap-1">
                        <button disabled={productBuyerPage===1} onClick={() => setProductBuyerPage(p=>p-1)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">‹</button>
                        <span className="px-3 text-[10px] font-bold text-slate-700">{productBuyerPage} / {totalPbPages}</span>
                        <button disabled={productBuyerPage===totalPbPages} onClick={() => setProductBuyerPage(p=>p+1)} className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold disabled:opacity-40">›</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] flex items-center justify-center">
                <div className="text-center">
                  <Package size={48} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-[12px] font-black text-slate-400 uppercase">Select a product above to see its buyers</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMER INVOICE MODAL ── */}
        {selectedSegmentCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSegmentCustomer(null)}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div>
                  <h3 className="font-black text-[14px] text-slate-800">{selectedSegmentCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[9px] text-slate-400 font-bold">{customerInvoices.length} Invoices</span>
                    <span className="text-[9px] font-black text-emerald-600">₹{formatIndianNumber(selectedSegmentCustomer.totalSpend)} Total</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${rfmBadge(selectedSegmentCustomer.rfmLabel)}`}>{selectedSegmentCustomer.rfmLabel}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${churnBadge(selectedSegmentCustomer.churnRisk)}`}>{selectedSegmentCustomer.churnRisk === 'High' ? '🔴' : selectedSegmentCustomer.churnRisk === 'Medium' ? '🟡' : '🟢'} Churn: {selectedSegmentCustomer.churnRisk}</span>
                    <span className="text-[9px] text-slate-400">{selectedSegmentCustomer.daysSinceLastOrder}d since last order</span>
                  </div>
                </div>
                <button onClick={() => setSelectedSegmentCustomer(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><X size={18} className="text-slate-400" /></button>
              </div>
              {(selectedSegmentCustomer.purchasedProductsList || []).length > 0 && (
                <div className="px-5 pt-4 pb-2 border-b border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Products Purchased</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedSegmentCustomer.purchasedProductsList || []).slice(0, 8).map((p: any, i: number) => (
                      <span key={i} className="bg-indigo-50 text-indigo-800 px-2 py-1 rounded-lg text-[9px] font-bold">{p.name} <span className="text-indigo-400">×{p.qty} · ₹{formatIndianNumber(p.revenue)}</span></span>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-y-auto flex-1 custom-scrollbar p-5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Invoice #</th>
                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerInvoices.map((inv, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 text-[11px] font-bold text-indigo-600">{inv.invoiceNumber}</td>
                        <td className="py-2.5 text-[10px] text-slate-600">{inv.date}</td>
                        <td className="py-2.5">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${inv.status==='Paid'?'bg-emerald-100 text-emerald-700':inv.status==='Pending'?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
                        </td>
                        <td className="py-2.5 text-[11px] font-black text-emerald-700 text-right">₹{formatIndianNumber(inv.grandTotal)}</td>
                      </tr>
                    ))}
                    {customerInvoices.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-400 font-bold">No invoices found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: TOP PRODUCTS DETAIL PAGE
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'topProducts' || view === 'productDetail') {
    const totalUnits = ALL_PRODUCTS_DETAIL.reduce((s, p) => s + p.totalQty, 0);
    const totalProductRevenue = ALL_PRODUCTS_DETAIL.reduce((s, p) => s + p.totalRevenue, 0);
    const uniqueSKUs = ALL_PRODUCTS_DETAIL.length;

    return (
      <div className="h-full flex flex-col gap-4 overflow-y-auto p-1.5 custom-scrollbar">
        <GlobalChartDefs />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0 bg-white p-2 px-3 rounded-[2rem] border border-slate-300 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView('main'); setSelectedProduct(null); setProductSearch(''); }}
              className="p-2 rounded-[2rem] bg-slate-50 border border-slate-200 text-slate-500 hover:text-medical-600 hover:bg-medical-50 hover:border-medical-200 transition-all active:scale-95"
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
          ].map(({ label, value, sub, icon: Icon, color }, index) => {
            const gradients = [
              'bg-gradient-to-br from-emerald-950 to-green-900 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)]',
              'bg-gradient-to-br from-emerald-800 to-emerald-600 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)]',
              'bg-gradient-to-br from-[#c5a059] to-[#e5c185] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)]',
              'bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_25px_45px_-5px_rgba(15,23,42,0.6)]'
            ];
            const iconBgs = [
              'bg-emerald-900/50 text-emerald-100',
              'bg-emerald-700/50 text-emerald-50',
              'bg-amber-900/10 text-amber-950',
              'bg-slate-800/50 text-slate-100'
            ];
            const textColsPrimary = [
              'text-emerald-100/80',
              'text-emerald-100/80',
              'text-amber-950/80',
              'text-slate-400'
            ];
            const textColsSecondary = [
              'text-white',
              'text-white',
              'text-amber-950',
              'text-white'
            ];
            const subCols = [
              'text-emerald-200/60',
              'text-emerald-200/60',
              'text-amber-950/60',
              'text-slate-500'
            ];

            return (
            <div key={label} className={`${gradients[index % 4]} p-3 rounded-[2rem] flex flex-col justify-between group hover:scale-[1.02] transition-all duration-300`}>
              <div className="flex justify-between items-start mb-1">
                <div className={`p-1.5 ${iconBgs[index % 4]} rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={14} />
                </div>
              </div>
              <div>
                <p className={`text-[9px] font-black ${textColsPrimary[index % 4]} uppercase tracking-widest`}>{label}</p>
                <h3 className={`text-sm font-black ${textColsSecondary[index % 4]} mt-0.5`}>{value}</h3>
                <p className={`text-[8px] ${subCols[index % 4]} font-bold truncate mt-0.5`}>{sub}</p>
              </div>
            </div>
          )})}
        </div>

        {/* Bar Chart: Top 10 by Revenue */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm shrink-0 min-h-[240px]">
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} barSize={22} animationDuration={1200}>
                  {topProductsByRevenue.map((_, i) => (
                    <Cell key={i} fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Detail Drawer (when a product is selected) */}
        {selectedProduct && (
          <div className="bg-gradient-to-br from-violet-50 to-medical-50 border border-violet-200 rounded-[2rem] p-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
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
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-[2rem] transition-all border border-transparent hover:border-slate-200">
                <X size={16} />
              </button>
            </div>

            {/* Invoice History Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                <span>Invoice</span>
                <span>Date</span>
                <span>Customer</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                {selectedProduct.invoiceList.sort((a, b) => b.date.localeCompare(a.date)).map((inv, i) => (
                  <div key={i} className="grid grid-cols-4 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <span 
                      onClick={() => handleViewInvoicePDF(inv.id)} 
                      className="text-[9px] font-black text-violet-600 truncate cursor-pointer hover:underline"
                    >
                      {inv.id}
                    </span>
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
        <div className="bg-white rounded-[2rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col shrink-0">
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
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-0 md:p-1.5">
      <GlobalChartDefs />

      {/* Header Toolbar */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 pt-6 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none rounded-b-[1.5rem] md:rounded-[2rem]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none rounded-b-[1.5rem] md:rounded-[2rem]"></div>
        
        {/* Top Row: Title & Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
            <div className="flex items-center gap-3 md:gap-4 group">
                <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                    <FileText size={20} className="hidden xl:block" />
                    <FileText size={16} className="xl:hidden" />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Analytics & Reports</h2>
                    <p className="text-emerald-100/80 text-[10px] md:text-xs font-semibold leading-relaxed">Financial Performance</p>
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                    <TrendingUp size={16} />
                </div>
                <div className="flex flex-col truncate">
                    <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Total Revenue</p>
                    <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                        {formatCurrency(totalRevenue)}
                    </p>
                </div>
            </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
            <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full sm:w-fit shrink-0 flex gap-1">
                <button
                onClick={() => { setReportsTab('overview'); setExpandedSection(null); }}
                className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${reportsTab === 'overview' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}
                >
                Overview
                </button>
                <button
                onClick={() => { setReportsTab('analytics'); setExpandedSection(null); }}
                className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${reportsTab === 'analytics' ? 'bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 shadow-[0_10px_20px_-5px_rgba(197,160,89,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}
                >
                Analytics <span className={`${reportsTab === 'analytics' ? 'bg-amber-950 text-amber-100' : 'bg-emerald-900 text-emerald-300'} px-1 rounded-sm text-[7px]`}>BETA</span>
                </button>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-200" size={14} />
                    <select className="pl-9 pr-6 py-2 bg-emerald-900/40 border border-emerald-700/50 text-emerald-100 text-[10px] font-black uppercase rounded-[2rem] outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer hover:bg-emerald-800/50 transition-colors appearance-none"
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
                    className="bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 text-amber-950 px-4 py-2 rounded-[2rem] text-[10px] font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_5px_15px_-3px_rgba(212,175,55,0.4)] hover:shadow-[0_8px_20px_-3px_rgba(212,175,55,0.5)]"
                >
                    <Download size={14} className="text-amber-900" />
                    <span className="hidden sm:inline">Export</span>
                </button>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-3 md:gap-4 shrink-0 pb-2 px-2 md:px-0 [&::-webkit-scrollbar]:hidden snap-x">
        {/* Card 1: Total Sales */}
        <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[140px] md:min-w-0 flex-1 snap-start">
          <div className="flex justify-between items-start mb-2">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-emerald-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-300 group-hover:scale-110 transition-transform">
              <DollarSign size={14} className="md:w-[15px] md:h-[15px]" />
            </div>
            <span className="flex items-center gap-1 text-[6px] md:text-[7px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              <TrendingUp size={8} /> +12.5%
            </span>
          </div>
          <div>
            <p className="text-[7px] md:text-[8px] font-extrabold text-emerald-300/80 uppercase tracking-widest leading-none">Total Sales</p>
            <h3 className="text-sm md:text-base font-black text-white mt-1">₹{formatIndianNumber(totalRevenue)}</h3>
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[140px] md:min-w-0 flex-1 snap-start">
          <div className="flex justify-between items-start mb-2">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-emerald-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-emerald-100 group-hover:scale-110 transition-transform">
              <TrendingUp size={14} className="md:w-[15px] md:h-[15px]" />
            </div>
            <span className="flex items-center gap-1 text-[6px] md:text-[7px] font-black bg-emerald-300/20 text-emerald-100 border border-emerald-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              <TrendingUp size={8} /> +8.2%
            </span>
          </div>
          <div>
            <p className="text-[7px] md:text-[8px] font-extrabold text-emerald-100/80 uppercase tracking-widest leading-none">Net Profit</p>
            <h3 className="text-sm md:text-base font-black text-white mt-1">₹{formatIndianNumber(totalProfit)}</h3>
          </div>
        </div>

        {/* Card 3: Expense */}
        <div className="p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(75,54,33,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(75,54,33,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[140px] md:min-w-0 flex-1 snap-start" style={{ background: 'linear-gradient(135deg, #4b3621 0%, #6f4e37 100%)' }}>
          <div className="flex justify-between items-start mb-2">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-amber-950/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),_0_1px_2px_rgba(255,255,255,0.1)] text-amber-200 group-hover:scale-110 transition-transform">
              <ArrowDownRight size={14} className="md:w-[15px] md:h-[15px]" />
            </div>
            <span className="flex items-center gap-1 text-[6px] md:text-[7px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              <TrendingDown size={8} /> -2.4%
            </span>
          </div>
          <div>
            <p className="text-[7px] md:text-[8px] font-extrabold text-amber-200/80 uppercase tracking-widest leading-none">Expense</p>
            <h3 className="text-sm md:text-base font-black text-white mt-1">₹{formatIndianNumber(totalExpenses)}</h3>
          </div>
        </div>

        {/* Card 4: Procurement */}
        <div className="p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(109,40,217,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(109,40,217,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[140px] md:min-w-0 flex-1 snap-start" style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' }}>
          <div className="flex justify-between items-start mb-2">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-violet-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),_0_1px_2px_rgba(255,255,255,0.1)] text-violet-200 group-hover:scale-110 transition-transform">
              <ShoppingCart size={14} className="md:w-[15px] md:h-[15px]" />
            </div>
            <span className="flex items-center gap-1 text-[6px] md:text-[7px] font-black bg-violet-300/20 text-violet-200 border border-violet-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              <Package size={8} /> {filteredPurchaseRecords.length}
            </span>
          </div>
          <div>
            <p className="text-[7px] md:text-[8px] font-extrabold text-violet-200/80 uppercase tracking-widest leading-none">Procurement</p>
            <h3 className="text-sm md:text-base font-black text-white mt-1">₹{formatIndianNumber(totalPurchaseRecords)}</h3>
          </div>
        </div>

        {/* Card 5: Growth */}
        <div className="p-3 md:p-4 rounded-2xl md:rounded-[28px] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300 min-h-[90px] md:min-h-[120px] min-w-[140px] md:min-w-0 flex-1 snap-start" style={{ background: 'linear-gradient(135deg, #c5a059 0%, #e5c185 100%)' }}>
          <div className="flex justify-between items-start mb-2">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-amber-900/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_1px_2px_rgba(255,255,255,0.2)] text-amber-950 group-hover:scale-110 transition-transform">
              <PieChartIcon size={14} className="md:w-[15px] md:h-[15px]" />
            </div>
            <span className="flex items-center gap-1 text-[6px] md:text-[7px] font-black bg-amber-950/25 text-amber-950 px-1.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
              Annual
            </span>
          </div>
          <div>
            <p className="text-[7px] md:text-[8px] font-extrabold text-amber-950/80 uppercase tracking-widest leading-none">Growth</p>
            <h3 className="text-sm md:text-base font-black text-amber-950 mt-1">{growthRate}%</h3>
          </div>
        </div>
      </div>

      {reportsTab === 'overview' ? (
        <>
          {/* Charts Section */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4 lg:min-h-[500px]">
            {/* Main Financial Chart */}
            <div className="flex-1 bg-white p-4 md:p-6 rounded-[32px] border border-emerald-950/5 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[250px] md:min-h-[350px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
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

              <div className="flex-1 w-full min-h-[180px] md:min-h-[220px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 900 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '20px' }} />
                    {activeChart === 'revenue' ? (
                      <>
                        <Bar dataKey="revenue" name="Inflow" fill="url(#colorRev)" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                        <Bar dataKey="expenses" name="Outflow" fill="url(#colorExp)" radius={[4, 4, 0, 0]} barSize={viewMode === 'month' ? 6 : 16} animationDuration={1500} />
                        <Line type="monotone" dataKey="profit" name="Profit Delta" stroke="#6366f1" strokeWidth={3} filter="url(#shadow)" dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#4f46e5' }} animationDuration={2000} />
                      </>
                    ) : (
                      <Area type="monotone" dataKey="profit" name="Net Earnings" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" filter="url(#shadow)" animationDuration={2000} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side Column */}
            <div className="w-full lg:w-[260px] flex flex-col gap-4 shrink-0">
              {/* Category Pie */}
              <div className="bg-white p-4 rounded-[28px] border border-emerald-950/5 shadow-[0_20px_40px_-10px_rgba(15,32,23,0.12)] flex flex-col h-[220px]">
                <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest mb-2">Categories</h3>
                <div className="flex-1 w-full min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={CATEGORY_DATA} cx="50%" cy="45%" innerRadius={40} outerRadius={60} stroke="none" dataKey="value">
                        {CATEGORY_DATA.map((_, index) => (<Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
                    <div className="text-center">
 <span className="text-lg font-bold tracking-tight text-slate-800">{CATEGORY_DATA.length}</span>
                      <p className="text-[7px] text-slate-400 font-black uppercase">Categories</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mt-1">
                  {CATEGORY_DATA.slice(0, 5).map((entry, index) => {
                    const total = CATEGORY_DATA.reduce((s, e) => s + e.value, 0);
                    const pct = total > 0 ? (entry.value / total) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-2 text-[7px] font-black uppercase tracking-tight">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-500 w-16 truncate">{entry.name}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                        </div>
                        <span className="text-slate-700 w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Products (Clickable) */}
              <button
                onClick={() => setView('topProducts')}
                className="bg-white p-3 md:p-4 rounded-[28px] border border-emerald-950/5 shadow-[0_20px_40px_-10px_rgba(15,32,23,0.12)] min-h-[180px] md:min-h-[220px] flex flex-col flex-1 text-left cursor-pointer hover:border-emerald-700/35 hover:shadow-[0_25px_50px_-12px_rgba(6,78,59,0.18)] transition-all duration-300 group active:scale-[0.99]"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest group-hover:text-emerald-800 transition-colors">Top Products</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">View All</span>
                    <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div className="space-y-2 overflow-y-hidden flex-1">
                  {TOP_PRODUCTS.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <div className="flex-1 pr-3">
                        <h4 className="text-[9px] font-black text-slate-700 uppercase leading-tight group-hover:text-emerald-800 transition-colors line-clamp-1">{product.name}</h4>
                        <p className="text-[7px] text-slate-400 font-black uppercase mt-0.5">{product.totalQty} units</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-800">₹{formatIndianNumber(product.totalRevenue)}</p>
                        <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden ml-auto">
                          <div className="h-full bg-gradient-to-r from-emerald-800 to-emerald-500 rounded-full" style={{ width: `${(product.totalRevenue / (TOP_PRODUCTS[0]?.totalRevenue || 1)) * 100}%` }} />
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
          <div className="bg-white p-4 md:p-6 rounded-[32px] border border-emerald-950/5 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] flex flex-col min-h-[200px] md:min-h-[280px] shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
              <div>
                <h3 className="font-black text-[10px] text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),_0_1px_2px_rgba(0,0,0,0.05)] text-emerald-800">
                    <Users size={14} />
                  </div>
                  Lead Source & Conversion
                </h3>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest pl-11">Leads vs Converted Clients</p>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LEAD_SOURCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 900 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', paddingBottom: '15px' }} />
                  <Bar dataKey="leads" name="Total Leads" fill="url(#colorLeads)" radius={[4, 4, 0, 0]} barSize={16} animationDuration={1500} />
                  <Bar dataKey="converted" name="Converted Clients" fill="url(#colorConverted)" radius={[4, 4, 0, 0]} barSize={16} animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        /* Detailed Analytics Tab with click-to-zoom sections */
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

          {/* Customer Intelligence Card */}
          <div
            onClick={() => { setView('customerSegments'); setSegmentSubView('overview'); }}
            className={getCardClasses('segmentation', 'md:col-span-2 min-h-[350px]')}
          >
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Customer Intelligence</h3>
                <p className="text-[7px] text-slate-400 font-bold uppercase">RFM · Churn · Segments</p>
              </div>
              <Users size={12} className="text-indigo-400" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex-1 min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={['Premium','High','Medium','Low'].map((cat,i) => ({ name: cat, value: customerSegmentsData.filter(c => c.incomeCategory === cat).length })).filter(d=>d.value>0)}
                      cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={2}
                    >
                      {['#f59e0b','#10b981','#3b82f6','#94a3b8'].map((col,i) => <Cell key={i} fill={col} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-amber-50 rounded-xl p-1.5 text-center">
                  <div className="text-[12px] font-black text-amber-700">{customerSegmentsData.filter(c=>c.rfmLabel==='Champions').length}</div>
                  <div className="text-[7px] text-amber-500 font-black uppercase">Champions</div>
                </div>
                <div className="bg-rose-50 rounded-xl p-1.5 text-center">
                  <div className="text-[12px] font-black text-rose-700">{customerSegmentsData.filter(c=>c.churnRisk==='High').length}</div>
                  <div className="text-[7px] text-rose-500 font-black uppercase">Churn Risk</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-1.5 text-center">
                  <div className="text-[12px] font-black text-indigo-700">{customerSegmentsData.length}</div>
                  <div className="text-[7px] text-indigo-500 font-black uppercase">Customers</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[8px] font-bold text-slate-400">Click to explore →</span>
                <ChevronRight size={12} className="text-indigo-400" />
              </div>
            </div>
          </div>
          
          {/* 1. Top Clients */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'clients' ? null : 'clients')}
            className={getCardClasses('clients', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Top Clients</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Share of Sales Revenue</p>
                </div>
                <Users size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'clients' ? (
                <div className="space-y-2 flex-1 overflow-hidden">
                  {analyticsData.topCustomers.slice(0, 3).map((cust, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-600">
                        <span className="truncate max-w-[120px] md:max-w-[100px]">{cust.name}</span>
                        <span>{formatCurrency(cust.total)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cust.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                  {analyticsData.topCustomers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No client data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col justify-between">
                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                      {analyticsData.topCustomers.map((cust, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-[2rem] bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">#{idx+1}</span>
                            <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[140px] md:max-w-[130px]">{cust.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-slate-800">{formatCurrency(cust.total)}</span>
                            <span className="block text-[7px] font-bold text-emerald-600">{cust.percentage.toFixed(1)}% of total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={analyticsData.topCustomers} margin={{ left: -10, right: 10 }}>
                        <XAxis type="number" tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fontWeight: 'bold' }} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="url(#colorRev)" radius={[0, 6, 6, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 1b. Sales Leaderboard */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'employees' ? null : 'employees')}
            className={getCardClasses('employees', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Sales Leaderboard</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Employee Performance</p>
                </div>
                <Users size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'employees' ? (
                <div className="space-y-2 flex-1 overflow-hidden">
                  {analyticsData.topEmployees.slice(0, 3).map((emp, idx) => (
                    <div 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployeeForClosures({ id: emp.id, name: emp.name });
                      }}
                      className="flex flex-col gap-0.5 cursor-pointer group"
                    >
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-600 group-hover:text-indigo-600 transition-colors">
                        <span className="truncate max-w-[120px] md:max-w-[100px] group-hover:underline">{emp.name}</span>
                        <span>{formatCurrency(emp.total)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${emp.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                  {analyticsData.topEmployees.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No employee sales data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col justify-between">
                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                      {analyticsData.topEmployees.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-[2rem] bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">#{idx+1}</span>
                            <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[140px] md:max-w-[130px]">{emp.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-slate-800">{formatCurrency(emp.total)}</span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployeeForClosures({ id: emp.id, name: emp.name });
                              }}
                              className="block text-[7px] font-bold text-indigo-600 cursor-pointer hover:underline hover:text-indigo-800 transition-colors"
                            >
                              {emp.invoices} Closures
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={analyticsData.topEmployees} margin={{ left: -10, right: 10 }}>
                        <XAxis type="number" tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 7, fontWeight: 'bold' }} width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="url(#colorProfit)" radius={[0, 6, 6, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 2. Expense Breakdown */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'expenses' ? null : 'expenses')}
            className={getCardClasses('expenses', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Expense Breakdown</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Outflow categories</p>
                </div>
                <DollarSign size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'expenses' ? (
                <div className="space-y-2 flex-1 overflow-hidden">
                  {analyticsData.expenseCategories.slice(0, 3).map((exp, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-black uppercase text-slate-600 py-0.5 border-b border-slate-50">
                      <span>{exp.name}</span>
                      <span className="text-rose-600">{formatCurrency(exp.value)}</span>
                    </div>
                  ))}
                  {analyticsData.expenseCategories.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No expense data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {analyticsData.expenseCategories.map((exp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-[2rem] bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-black text-slate-700 uppercase">{exp.name}</span>
                        <span className="text-[10px] font-black text-rose-600">{formatCurrency(exp.value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2 flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie data={analyticsData.expenseCategories} cx="50%" cy="50%" innerRadius={40} outerRadius={60} stroke="none" dataKey="value">
                          {analyticsData.expenseCategories.map((_, idx) => (
                            <Cell key={idx} fill={GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[7px] font-black uppercase">
                      {analyticsData.expenseCategories.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-slate-500">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* 3. Freight Charges */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'freight' ? null : 'freight')}
            className={getCardClasses('freight', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Freight Charges</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Collected</p>
                </div>
                <Truck size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'freight' ? (
                <div className="space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 rounded-[2rem] p-2 text-center">
                      <span className="text-[16px] font-black text-amber-700 block">{formatCurrency(analyticsData.totalFreightAmount)}</span>
                      <span className="text-[7px] font-bold text-amber-500 uppercase">Freight Amount</span>
                    </div>
                    <div className="bg-amber-50 rounded-[2rem] p-2 text-center">
                      <span className="text-[16px] font-black text-amber-700 block">{formatCurrency(analyticsData.totalFreightGst)}</span>
                      <span className="text-[7px] font-bold text-amber-500 uppercase">GST Collected</span>
                    </div>
                  </div>
                  {analyticsData.topFreightCustomers.slice(0, 3).map((cust, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-black uppercase text-slate-600 py-0.5 border-b border-slate-50">
                      <span className="truncate max-w-[120px] md:max-w-[100px]">{cust.name}</span>
                      <span className="text-amber-700">{formatCurrency(cust.freight)}</span>
                    </div>
                  ))}
                  {analyticsData.totalFreightAmount === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No freight data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-amber-50 rounded-[2rem] p-3 text-center border border-amber-100">
                        <span className="text-lg font-playfair font-bold tracking-tight text-amber-700 block">{formatCurrency(analyticsData.totalFreightAmount)}</span>
                        <span className="text-[7px] font-bold text-amber-400 uppercase">Freight Amount</span>
                      </div>
                      <div className="bg-amber-50 rounded-[2rem] p-3 text-center border border-amber-100">
                        <span className="text-lg font-playfair font-bold tracking-tight text-amber-700 block">{formatCurrency(analyticsData.totalFreightGst)}</span>
                        <span className="text-[7px] font-bold text-amber-400 uppercase">GST Collected</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Top Customers by Freight</h4>
                      {analyticsData.topFreightCustomers.map((cust, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <span className="text-[9px] font-black text-slate-600 uppercase truncate max-w-[140px] md:max-w-[130px]">{cust.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] font-black text-amber-700">{formatCurrency(cust.freight)}</span>
                            <span className="text-[7px] font-bold text-slate-400">{cust.invoices} inv</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Trend</h4>
                      {freightMonthly.filter(m => m.freight > 0).map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <span className="text-[9px] font-black text-slate-600 uppercase">{m.label}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(m.freight / Math.max(...freightMonthly.filter(x => x.freight > 0).map(x => x.freight), 1)) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-black text-slate-700 w-20 text-right">{formatCurrency(m.freight)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={freightMonthly} margin={{ left: -10, right: 10 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="freight" fill="url(#colorExp)" radius={[6, 6, 0, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 4. Supplier Volume */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'suppliers' ? null : 'suppliers')}
            className={getCardClasses('suppliers', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Supplier Volume</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Procurement Totals</p>
                </div>
                <ShoppingCart size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'suppliers' ? (
                <div className="space-y-2 flex-1 overflow-hidden">
                  {analyticsData.topSuppliers.slice(0, 3).map((sup, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-black uppercase text-slate-600 py-0.5 border-b border-slate-50 cursor-pointer hover:text-violet-700" onClick={(e) => { e.stopPropagation(); setSelectedSupplier({ name: sup.name, transactions: supplierTransactions[sup.name] || [] }); }}>
                      <span className="truncate max-w-[100px]">{sup.name}</span>
                      <span className="text-violet-600">{formatCurrency(sup.total)}</span>
                    </div>
                  ))}
                  {analyticsData.topSuppliers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No supplier data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {analyticsData.topSuppliers.map((sup, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-[2rem] bg-slate-50 border border-slate-100 cursor-pointer hover:bg-violet-50 hover:border-violet-200 transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedSupplier({ name: sup.name, transactions: supplierTransactions[sup.name] || [] }); }}>
                        <div>
                          <span className="text-[10px] font-black text-slate-700 uppercase block">{sup.name}</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase">{sup.transactions} transactions</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black text-slate-800 block">{formatCurrency(sup.total)}</span>
                          {sup.osAmount > 0 && (
                            <span className="text-[7px] font-black text-rose-500 uppercase">O/S: {formatCurrency(sup.osAmount)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topSuppliers} margin={{ left: -10, right: 10 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="url(#colorProfit)" radius={[6, 6, 0, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 5. Procurement Overview */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'procurement' ? null : 'procurement')}
            className={getCardClasses('procurement', 'md:col-span-2 min-h-[350px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Procurement</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Purchase Overview</p>
                </div>
                <Package size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'procurement' ? (
                <div className="space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-[2rem] p-2 text-center">
                      <span className="text-[16px] font-black text-slate-800 block">{formatCurrency(totalPurchaseRecords)}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase">Total Procurement</span>
                    </div>
                    <div className="bg-slate-50 rounded-[2rem] p-2 text-center">
                      <span className="text-[16px] font-black text-slate-800 block">{filteredPurchaseRecords.length}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase">Transactions</span>
                    </div>
                  </div>
                  {procurementMonthly.filter(m => m.total > 0).slice(0, 3).map((m, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-black uppercase text-slate-600 py-0.5 border-b border-slate-50">
                      <span>{m.label}</span>
                      <span className="text-indigo-600">{formatCurrency(m.total)}</span>
                    </div>
                  ))}
                  {filteredPurchaseRecords.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No procurement data</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-indigo-50 rounded-[2rem] p-3 text-center border border-indigo-100">
                        <span className="text-lg font-playfair font-bold tracking-tight text-indigo-700 block">{formatCurrency(totalPurchaseRecords)}</span>
                        <span className="text-[7px] font-bold text-indigo-400 uppercase">Total Procurement</span>
                      </div>
                      <div className="bg-indigo-50 rounded-[2rem] p-3 text-center border border-indigo-100">
 <span className="text-lg font-bold tracking-tight text-indigo-700 block">{filteredPurchaseRecords.length}</span>
                        <span className="text-[7px] font-bold text-indigo-400 uppercase">Transactions</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Trend</h4>
                      {procurementMonthly.filter(m => m.total > 0).map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <span className="text-[9px] font-black text-slate-600 uppercase">{m.label}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(m.total / Math.max(...procurementMonthly.filter(x => x.total > 0).map(x => x.total))) * 100}%` }} />
                            </div>
                            <span className="text-[9px] font-black text-slate-700 w-20 text-right">{formatCurrency(m.total)}</span>
                            <span className="text-[7px] font-bold text-slate-400 w-8 text-right">{m.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={procurementMonthly} margin={{ left: -10, right: 10 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 7, fontWeight: 'bold' }} />
                        <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="url(#colorProfit)" radius={[6, 6, 0, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 6. Product Line Analysis */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'products' ? null : 'products')}
            className={getCardClasses('products', 'md:col-span-3 min-h-[250px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Product Line Analysis</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Units and revenue</p>
                </div>
                <Package size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'products' ? (
                <div className="space-y-2 flex-1 overflow-hidden">
                  {analyticsData.topProducts.slice(0, 2).map((prod, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-black uppercase text-slate-600 py-0.5 border-b border-slate-50">
                      <span className="truncate max-w-[140px] md:max-w-[130px]">{prod.name}</span>
                      <span>{formatCurrency(prod.total)} ({prod.qty} units)</span>
                    </div>
                  ))}
                  {analyticsData.topProducts.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-[8px] text-slate-300 font-black uppercase">No product sales</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {analyticsData.topProducts.map((prod, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-[2rem] bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-[10px] font-black text-slate-700 uppercase block truncate max-w-[200px]">{prod.name}</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase">{prod.qty} units sold</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-800">{formatCurrency(prod.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topProducts} margin={{ left: -10, right: 10 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 7 }} />
                        <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `₹${formatIndianNumber(v)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="total" fill="url(#grad-2)" radius={[6, 6, 0, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

          {/* 7. Receivables Aging */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'aging' ? null : 'aging')}
            className={getCardClasses('aging', 'md:col-span-3 min-h-[250px]')}
          >
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <div>
                  <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Receivables Aging (Sales Ledger)</h3>
                  <p className="text-[7px] text-slate-400 font-bold uppercase">Outstanding Ledger Terms</p>
                </div>
                <Calendar size={12} className="text-slate-400" />
              </div>

              {expandedSection !== 'aging' ? (
                <div className="grid grid-cols-4 gap-2 text-center my-auto">
                  {analyticsData.agingBuckets.map((bucket, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-1">{bucket.name.split(' ')[0]}</p>
                      <span className="text-[9px] font-black text-slate-700">{formatCurrency(bucket.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {analyticsData.agingBuckets.map((bucket, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-[2rem] bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-[10px] font-black text-slate-700 uppercase block">{bucket.name}</span>
                          <span className="text-[7px] font-bold text-slate-400 uppercase">{bucket.count} outstanding invoices</span>
                        </div>
                        <span className="text-[10px] font-black text-rose-600">{formatCurrency(bucket.value)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2 flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie data={analyticsData.agingBuckets} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                          {analyticsData.agingBuckets.map((_, idx) => (
                            <Cell key={idx} fill={GRADIENT_COLORS[(idx + 2) % GRADIENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[7px] font-black uppercase">
                      {analyticsData.agingBuckets.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                          <span className="text-slate-500">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          {/* 8. Filing Status Tracker */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'filing' ? null : 'filing')}
            className={getCardClasses('filing', 'md:col-span-2 min-h-[350px]')}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <div>
                <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Document Filing Tracker</h3>
                <p className="text-[7px] text-slate-400 font-bold uppercase">Physical Archive Audits</p>
              </div>
              <FileText size={12} className="text-slate-400" />
            </div>

            {expandedSection !== 'filing' ? (
              <div className="space-y-4 my-auto">
                <div className="flex justify-between items-baseline">
 <span className="text-2xl font-bold tracking-tight text-slate-800">{filingStats.filed}</span>
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {filingStats.filedRatio.toFixed(1)}% Filed
                  </span>
                </div>
                <div className="space-y-2 text-[9px] font-black uppercase">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Filed</span>
                      <span>{filingStats.filed}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${filingStats.filedRatio}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Pending Filing</span>
                      <span>{filingStats.notFiled}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${filingStats.notFiledRatio}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1">
                      <span>Not Updated</span>
                      <span>{filingStats.notUpdated}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-200 rounded-full" style={{ width: `${filingStats.notUpdatedRatio}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  {[
                    { label: 'Physically Filed', count: filingStats.filed, ratio: filingStats.filedRatio, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    { label: 'Pending Filing', count: filingStats.notFiled, ratio: filingStats.notFiledRatio, color: 'text-slate-600 bg-slate-50 border-slate-200' },
                    { label: 'Not Yet Updated', count: filingStats.notUpdated, ratio: filingStats.notUpdatedRatio, color: 'text-slate-400 bg-transparent border-slate-100 border-dashed animate-pulse' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-[2rem] bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[10px] font-black text-slate-700 uppercase block">{item.label}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase">{item.count} total records</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${item.color}`}>
                        {item.ratio.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-2 flex flex-col justify-center">
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Filed', value: filingStats.filed },
                          { name: 'Pending', value: filingStats.notFiled },
                          { name: 'Not Updated', value: filingStats.notUpdated }
                        ]} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={40} 
                        outerRadius={60} 
                        paddingAngle={2} 
                        dataKey="value"
                      >
                        <Cell fill="url(#colorRev)" />
                        <Cell fill="url(#colorLeads)" />
                        <Cell fill="url(#grad-8)" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-[7px] font-black uppercase">
                    {[
                      { name: 'Filed', color: '#10b981' },
                      { name: 'Pending', color: '#64748b' },
                      { name: 'Not Updated', color: '#cbd5e1' }
                    ].map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-500">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
 
          {/* 9. Dead Stock Inventory */}
          <div
            onClick={() => setExpandedSection(expandedSection === 'deadStock' ? null : 'deadStock')}
            className={getCardClasses('deadStock', 'md:col-span-2 min-h-[350px]')}
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b">
              <div>
                <h3 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Dead Stock Inventory</h3>
                <p className="text-[7px] text-slate-400 font-bold uppercase">180+ Days Static Stock</p>
              </div>
              <AlertTriangle size={12} className="text-rose-500" />
            </div>

            {expandedSection !== 'deadStock' ? (
              <div className="space-y-4 my-auto">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold tracking-tight text-rose-600">₹{formatIndianNumber(Math.round(deadStockData.totalCostValue))}</span>
                  <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    {deadStockData.items.length} Items
                  </span>
                </div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Locked Capital Cost</div>
                
                <div className="space-y-2 text-[9px] font-black uppercase">
                  {deadStockData.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                      <span className="truncate max-w-[130px] text-slate-600">{item.name}</span>
                      <span className="text-slate-400 font-bold">{item.stock} {item.unit} · {item.daysInactive === 9999 ? 'Never Sold' : `${item.daysInactive}d`}</span>
                    </div>
                  ))}
                  {deadStockData.items.length === 0 && (
                    <div className="text-center text-slate-400 py-4">Zero Dead Stock in Inventory</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 p-3 rounded-[1.5rem] border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl">
                      <span className="text-lg font-playfair font-bold tracking-tight text-rose-600 block">₹{formatIndianNumber(Math.round(filteredDeadStockCostValue))}</span>
                      <span className="text-[8px] font-bold text-rose-400 uppercase">Locked Capital</span>
                    </div>
                    <div className="text-center bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl">
                      <span className="text-lg font-bold tracking-tight text-slate-700 block">{Math.round(filteredDeadStockItemsCount * 100) / 100}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Total Units</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={deadStockCategoryFilter}
                      onChange={(e) => { e.stopPropagation(); setDeadStockCategoryFilter(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-700 outline-none"
                    >
                      {deadStockCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExportDeadStockCSV(); }}
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                      <Download size={12} className="text-slate-400" /> Export List
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden flex flex-col shadow-inner">
                  <div className="overflow-y-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                        <tr>
                          <th className="p-3">Product Description</th>
                          <th className="p-3 text-right">In Stock</th>
                          <th className="p-3 text-right">Cost Price</th>
                          <th className="p-3 text-right">Locked Capital</th>
                          <th className="p-3 text-right">Last Sold</th>
                          <th className="p-3 text-right">Inactivity</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] divide-y divide-slate-100 font-bold uppercase">
                        {filteredDeadStockItems.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-black text-slate-800 text-[11px]">{p.name}</div>
                              <div className="text-[7px] text-slate-400 font-bold tracking-widest mt-0.5">SKU: {p.sku || '---'} · {p.category}</div>
                            </td>
                            <td className="p-3 text-right text-slate-700">{p.stock} {p.unit}</td>
                            <td className="p-3 text-right text-slate-600">₹{formatIndianNumber(p.purchasePrice || 0)}</td>
                            <td className="p-3 text-right text-rose-600 font-black">₹{formatIndianNumber(p.totalCostValue)}</td>
                            <td className="p-3 text-right text-slate-500">{p.lastSaleDate}</td>
                            <td className="p-3 text-right text-slate-500">{p.daysInactive === 9999 ? 'Never Sold' : `${p.daysInactive} days`}</td>
                          </tr>
                        ))}
                        {filteredDeadStockItems.length === 0 && (
                          <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No dead stock found matching category.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
 
        </div>
      )}

      {selectedEmployeeForClosures && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEmployeeForClosures(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">{selectedEmployeeForClosures.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{employeeClosuresList.length} closures (invoices)</p>
              </div>
              <button onClick={() => setSelectedEmployeeForClosures(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {employeeClosuresList.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-slate-300 font-black uppercase">No closures found for selected period</p>
                </div>
              ) : (
                employeeClosuresList.map((inv, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black uppercase bg-emerald-50 text-emerald-600">
                        INV
                      </div>
                      <div>
                        <span 
                          onClick={() => handleViewInvoicePDF(inv.invoiceNumber || inv.id)} 
                          className="text-[11px] font-black text-indigo-600 uppercase block cursor-pointer hover:underline"
                        >
                          {inv.invoiceNumber || inv.id}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          {inv.date} · {inv.customerName || (inv as any).clientName || 'Unknown Customer'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-slate-800 block">{formatCurrency(inv.grandTotal || 0)}</span>
                      <span className={`inline-block text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSupplier(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">{selectedSupplier.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedSupplier.transactions.length} transactions</p>
              </div>
              <button onClick={() => setSelectedSupplier(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedSupplier.transactions.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-slate-300 font-black uppercase">No transactions found</p>
                </div>
              ) : (
                selectedSupplier.transactions.map((txn, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-[2rem] bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black uppercase bg-indigo-50 text-indigo-600">
                        PR
                      </div>
                      <div>
                        <span className="text-[11px] font-black text-slate-700 uppercase block">{txn.ref}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{txn.date}{txn.status ? ` · ${txn.status}` : ''}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-slate-800">{formatCurrency(txn.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-4 shrink-0" />
    </div>
  );
};
