import React, { useState, useMemo } from 'react';
import { useData } from './DataContext';
import { FixedAsset, Product } from '../types';
import { 
  Building2, Plus, Search, TrendingDown, DollarSign, 
  Layers, Tag, MapPin, Trash2, Edit3, X, Eye, 
  Sparkles, RefreshCw, Calculator, Clock, PackageCheck, 
  TrendingUp, ShieldCheck, Archive
} from 'lucide-react';

// Helper function to calculate real-time live depreciation & financial valuation metrics
export const calculateAssetDepreciation = (asset: {
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  salvageValue?: number;
  depreciationMethod?: 'SLM' | 'WDV' | 'SYD' | 'NONE';
  lifetimeType?: 'Predictable' | 'Unpredictable' | 'Indefinite';
  customDepRatePercent?: number;
  condition?: string;
  priorUsageMonths?: number;
}) => {
  const purchaseCost = Math.max(0, Number(asset.purchaseCost || 0));
  const salvageValue = Math.max(0, Number(asset.salvageValue || 0));
  const usefulLifeYears = Math.max(0, Number(asset.usefulLifeYears || 0));
  const lifetimeType = asset.lifetimeType || (usefulLifeYears === 0 ? 'Indefinite' : 'Predictable');
  const method = asset.depreciationMethod || (lifetimeType === 'Indefinite' ? 'NONE' : 'SLM');

  if (purchaseCost <= 0) {
    return {
      monthsElapsed: 0,
      yearsElapsed: 0,
      annualDepRatePercent: 0,
      monthlyDepAmount: 0,
      currentAccumulatedDep: 0,
      currentNetBookValue: 0,
      retentionPercent: 100,
      valueNextYear: 0,
      valueIn3Years: 0,
      isFullyDepreciated: false,
      schedule: []
    };
  }

  // Calculate elapsed months from purchase date to current date
  const pDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
  const now = new Date();
  let monthsElapsed = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
  if (now.getDate() < pDate.getDate()) monthsElapsed = Math.max(0, monthsElapsed - 1);
  if (monthsElapsed < 0) monthsElapsed = 0;

  const usefulLifeMonths = usefulLifeYears * 12;
  const totalMonthsForStatus = monthsElapsed + Number(asset.priorUsageMonths || 0);

  // Non-Depreciating / Indefinite / Unpredictable Lifetime
  if (lifetimeType === 'Indefinite' || lifetimeType === 'Unpredictable' || method === 'NONE' || usefulLifeYears <= 0) {
    return {
      monthsElapsed,
      yearsElapsed: Math.round((monthsElapsed / 12) * 10) / 10,
      annualDepRatePercent: 0,
      monthlyDepAmount: 0,
      currentAccumulatedDep: 0,
      currentNetBookValue: purchaseCost,
      retentionPercent: 100,
      valueNextYear: purchaseCost,
      valueIn3Years: purchaseCost,
      isFullyDepreciated: false,
      schedule: []
    };
  }

  let annualDepRatePercent = 0;
  let monthlyDepAmount = 0;
  let currentAccumulatedDep = 0;
  let currentNetBookValue = purchaseCost;
  const schedule: { month: number; dateStr: string; depAmount: number; accumulatedDep: number; netBookValue: number }[] = [];

  if (method === 'SLM') {
    // Straight Line Method: (Cost - Salvage) / Useful Life
    const depreciableAmount = Math.max(0, purchaseCost - salvageValue);
    annualDepRatePercent = asset.customDepRatePercent || (usefulLifeYears > 0 ? (100 / usefulLifeYears) : 0);
    monthlyDepAmount = usefulLifeMonths > 0 ? depreciableAmount / usefulLifeMonths : 0;

    let runningAccum = 0;
    let runningNBV = purchaseCost;
    const maxMonths = Math.ceil(usefulLifeMonths);

    for (let m = 1; m <= maxMonths; m++) {
      const entryDate = new Date(pDate);
      entryDate.setMonth(entryDate.getMonth() + m);
      const dateStr = entryDate.toISOString().split('T')[0];

      let monthDep = monthlyDepAmount;
      if (runningNBV - monthDep < salvageValue) {
        monthDep = Math.max(0, runningNBV - salvageValue);
      }

      runningAccum += monthDep;
      runningNBV = Math.max(salvageValue, purchaseCost - runningAccum);

      schedule.push({
        month: m,
        dateStr,
        depAmount: Math.round(monthDep),
        accumulatedDep: Math.round(runningAccum),
        netBookValue: Math.round(runningNBV)
      });

      if (runningNBV <= salvageValue) break;
    }

    const effectiveMonths = Math.min(monthsElapsed, schedule.length);
    if (effectiveMonths > 0 && schedule[effectiveMonths - 1]) {
      currentAccumulatedDep = schedule[effectiveMonths - 1].accumulatedDep;
      currentNetBookValue = schedule[effectiveMonths - 1].netBookValue;
    } else {
      currentAccumulatedDep = 0;
      currentNetBookValue = purchaseCost;
    }

  } else if (method === 'SYD') {
    // Sum of Years Digits Method
    const depreciableAmount = Math.max(0, purchaseCost - salvageValue);
    const n = Math.ceil(usefulLifeYears);
    const sydSum = (n * (n + 1)) / 2;
    annualDepRatePercent = usefulLifeYears > 0 ? (100 / usefulLifeYears) : 0;

    let runningAccum = 0;
    let runningNBV = purchaseCost;
    const maxMonths = Math.ceil(usefulLifeMonths);

    for (let m = 1; m <= maxMonths; m++) {
      const currentYearIndex = Math.floor((m - 1) / 12) + 1;
      const remainingYears = Math.max(1, n - currentYearIndex + 1);
      const annualDepForYear = (remainingYears / sydSum) * depreciableAmount;
      const monthDep = annualDepForYear / 12;

      runningAccum += monthDep;
      runningNBV = Math.max(salvageValue, purchaseCost - runningAccum);

      const entryDate = new Date(pDate);
      entryDate.setMonth(entryDate.getMonth() + m);
      schedule.push({
        month: m,
        dateStr: entryDate.toISOString().split('T')[0],
        depAmount: Math.round(monthDep),
        accumulatedDep: Math.round(runningAccum),
        netBookValue: Math.round(runningNBV)
      });
    }

    const effectiveMonths = Math.min(monthsElapsed, schedule.length);
    if (effectiveMonths > 0 && schedule[effectiveMonths - 1]) {
      currentAccumulatedDep = schedule[effectiveMonths - 1].accumulatedDep;
      currentNetBookValue = schedule[effectiveMonths - 1].netBookValue;
    }
    monthlyDepAmount = schedule[0]?.depAmount || 0;

  } else {
    // Written Down Value (WDV / Reducing Balance)
    if (asset.customDepRatePercent && asset.customDepRatePercent > 0) {
      annualDepRatePercent = asset.customDepRatePercent;
    } else if (salvageValue > 0 && purchaseCost > salvageValue && usefulLifeYears > 0) {
      const calcRate = (1 - Math.pow(salvageValue / purchaseCost, 1 / usefulLifeYears)) * 100;
      annualDepRatePercent = Math.min(95, Math.max(5, calcRate));
    } else if (usefulLifeYears > 0) {
      annualDepRatePercent = Math.min(95, (2 / usefulLifeYears) * 100);
    } else {
      annualDepRatePercent = 15;
    }

    const monthlyRate = 1 - Math.pow(1 - (annualDepRatePercent / 100), 1 / 12);
    let runningAccum = 0;
    let runningNBV = purchaseCost;

    const maxMonths = Math.ceil(usefulLifeMonths * 1.5);
    for (let m = 1; m <= maxMonths; m++) {
      const entryDate = new Date(pDate);
      entryDate.setMonth(entryDate.getMonth() + m);
      const dateStr = entryDate.toISOString().split('T')[0];

      let monthDep = runningNBV * monthlyRate;
      if (runningNBV - monthDep < salvageValue) {
        monthDep = Math.max(0, runningNBV - salvageValue);
      }

      runningAccum += monthDep;
      runningNBV = Math.max(salvageValue, purchaseCost - runningAccum);

      schedule.push({
        month: m,
        dateStr,
        depAmount: Math.round(monthDep),
        accumulatedDep: Math.round(runningAccum),
        netBookValue: Math.round(runningNBV)
      });

      if (m === 1) monthlyDepAmount = monthDep;
      if (runningNBV <= salvageValue + 1) break;
    }

    const effectiveMonths = Math.min(monthsElapsed, schedule.length);
    if (effectiveMonths > 0 && schedule[effectiveMonths - 1]) {
      currentAccumulatedDep = schedule[effectiveMonths - 1].accumulatedDep;
      currentNetBookValue = schedule[effectiveMonths - 1].netBookValue;
    } else {
      currentAccumulatedDep = 0;
      currentNetBookValue = purchaseCost;
    }
  }

  const retentionPercent = purchaseCost > 0 ? Math.round((currentNetBookValue / purchaseCost) * 100) : 0;
  
  // Future forecast values
  const next12MIdx = Math.min(monthsElapsed + 12, schedule.length - 1);
  const next36MIdx = Math.min(monthsElapsed + 36, schedule.length - 1);
  const valueNextYear = schedule[next12MIdx]?.netBookValue ?? Math.max(salvageValue, currentNetBookValue);
  const valueIn3Years = schedule[next36MIdx]?.netBookValue ?? Math.max(salvageValue, currentNetBookValue);

  const isFullyDepreciated = currentNetBookValue <= salvageValue + 5 || totalMonthsForStatus >= usefulLifeMonths;

  return {
    monthsElapsed,
    yearsElapsed: Math.round((monthsElapsed / 12) * 10) / 10,
    annualDepRatePercent: Math.round(annualDepRatePercent * 100) / 100,
    monthlyDepAmount: Math.round(monthlyDepAmount),
    currentAccumulatedDep: Math.round(currentAccumulatedDep),
    currentNetBookValue: Math.round(currentNetBookValue),
    retentionPercent,
    valueNextYear: Math.round(valueNextYear),
    valueIn3Years: Math.round(valueIn3Years),
    isFullyDepreciated,
    schedule
  };
};

export const CapitalAssetsTab: React.FC = () => {
  const { 
    fixedAssets = [], 
    addFixedAsset, 
    updateFixedAsset, 
    removeFixedAsset, 
    products = [], 
    vendors = [],
    addNotification,
    showConfirm
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [viewScheduleAsset, setViewScheduleAsset] = useState<FixedAsset | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  // Form State
  const initialForm: Partial<FixedAsset> = {
    name: '',
    productId: '',
    assetTag: '',
    serialNumber: '',
    category: 'Equipment',
    condition: 'Brand New',
    priorUsageMonths: 0,
    location: 'Head Office',
    department: 'Operations',
    vendorName: '',
    invoiceRef: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0,
    usefulLifeYears: 3,
    salvageValue: 0,
    depreciationMethod: 'SLM',
    customDepRatePercent: 0,
    status: 'Active',
    notes: ''
  };

  const [formData, setFormData] = useState<Partial<FixedAsset>>(initialForm);
  const [selectedProductSearch, setSelectedProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Categories
  const categories = ['Equipment', 'Computers & IT', 'Machinery', 'Furniture & Fixtures', 'Vehicles', 'Office Appliances', 'Medical Device'];

  // Handle selecting an inventory/catalog product to auto-fill asset values
  const handleSelectProduct = (product: Product) => {
    let bestPurchaseCost = Number(product.purchasePrice || 0);
    let vendorName = product.supplier || '';

    if (product.brands && product.brands.length > 0) {
      for (const b of product.brands) {
        if (b.models) {
          for (const m of b.models) {
            if (m.vendors && m.vendors.length > 0) {
              const pv = m.vendors[0];
              if (pv.purchasePrice) bestPurchaseCost = Number(pv.purchasePrice);
              if (pv.vendorName) vendorName = pv.vendorName;
              break;
            }
          }
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      productId: product.id,
      name: product.name,
      category: product.category || prev.category || 'Equipment',
      purchaseCost: bestPurchaseCost > 0 ? bestPurchaseCost : prev.purchaseCost,
      vendorName: vendorName || prev.vendorName,
      location: product.location || prev.location || 'Warehouse A'
    }));

    setSelectedProductSearch(`${product.name} (${product.sku})`);
    setShowProductPicker(false);
    addNotification('Product Linked', `Auto-filled details from "${product.name}"`, 'success');
  };

  // Real-time calculation for form preview
  const livePreview = useMemo(() => {
    return calculateAssetDepreciation({
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(formData.purchaseCost || 0),
      usefulLifeYears: Number(formData.usefulLifeYears ?? 3),
      lifetimeType: formData.lifetimeType || (formData.usefulLifeYears === 0 ? 'Indefinite' : 'Predictable'),
      salvageValue: Number(formData.salvageValue || 0),
      depreciationMethod: (formData.depreciationMethod as any) || 'SLM',
      customDepRatePercent: Number(formData.customDepRatePercent || 0),
      condition: formData.condition,
      priorUsageMonths: Number(formData.priorUsageMonths || 0)
    });
  }, [formData]);

  // Handle Save
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      addNotification('Validation Error', 'Please provide an Asset Name.', 'warning');
      return;
    }
    if (Number(formData.purchaseCost || 0) <= 0) {
      addNotification('Validation Error', 'Please enter a valid Purchase Cost greater than 0.', 'warning');
      return;
    }

    const calculated = calculateAssetDepreciation({
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(formData.purchaseCost || 0),
      usefulLifeYears: Number(formData.usefulLifeYears ?? 3),
      lifetimeType: formData.lifetimeType || (formData.usefulLifeYears === 0 ? 'Indefinite' : 'Predictable'),
      salvageValue: Number(formData.salvageValue || 0),
      depreciationMethod: (formData.depreciationMethod as any) || 'SLM',
      customDepRatePercent: Number(formData.customDepRatePercent || 0),
      condition: formData.condition,
      priorUsageMonths: Number(formData.priorUsageMonths || 0)
    });

    const statusValue = calculated.isFullyDepreciated ? 'Fully Depreciated' : (formData.status || 'Active');

    const assetPayload: FixedAsset = {
      id: editingAssetId || `ASSET-${Date.now()}`,
      name: formData.name.trim(),
      productId: formData.productId || '',
      assetTag: formData.assetTag?.trim() || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      serialNumber: formData.serialNumber?.trim() || '',
      category: formData.category || 'Equipment',
      condition: formData.condition || 'Brand New',
      priorUsageMonths: Number(formData.priorUsageMonths || 0),
      location: formData.location || 'Head Office',
      department: formData.department || 'General',
      vendorName: formData.vendorName || '',
      invoiceRef: formData.invoiceRef || '',
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(formData.purchaseCost || 0),
      usefulLifeYears: Number(formData.usefulLifeYears || 3),
      salvageValue: Number(formData.salvageValue || 0),
      depreciationMethod: formData.depreciationMethod || 'SLM',
      customDepRatePercent: Number(formData.customDepRatePercent || 0),
      accumulatedDepreciation: calculated.currentAccumulatedDep,
      netBookValue: calculated.currentNetBookValue,
      status: statusValue,
      notes: formData.notes || ''
    };

    try {
      if (editingAssetId) {
        await updateFixedAsset(editingAssetId, assetPayload);
        addNotification('Asset Updated', `Capital asset "${assetPayload.name}" updated successfully.`, 'success');
      } else {
        await addFixedAsset(assetPayload);
        addNotification('Asset Created', `New capital asset "${assetPayload.name}" registered with live depreciation schedule.`, 'success');
      }
      setShowModal(false);
      setEditingAssetId(null);
      setFormData(initialForm);
      setSelectedProductSearch('');
    } catch (err: any) {
      addNotification('Save Failed', err?.message || 'Could not save asset record.', 'warning');
    }
  };

  const handleEditClick = (asset: FixedAsset) => {
    setEditingAssetId(asset.id);
    setFormData({ ...asset });
    if (asset.productId) {
      const match = products.find(p => p.id === asset.productId);
      if (match) setSelectedProductSearch(`${match.name} (${match.sku})`);
    } else {
      setSelectedProductSearch('');
    }
    setShowModal(true);
  };

  const handleDeleteClick = async (asset: FixedAsset) => {
    const ok = await showConfirm(`Are you sure you want to delete "${asset.name}" (${asset.assetTag || asset.id})? This will remove its capital registry.`);
    if (ok) {
      await removeFixedAsset(asset.id);
      addNotification('Deleted', `Asset "${asset.name}" removed.`, 'warning');
    }
  };

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return fixedAssets.filter(asset => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery || 
        (asset.name && asset.name.toLowerCase().includes(q)) ||
        (asset.assetTag && asset.assetTag.toLowerCase().includes(q)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(q)) ||
        (asset.category && asset.category.toLowerCase().includes(q)) ||
        (asset.location && asset.location.toLowerCase().includes(q)) ||
        (asset.vendorName && asset.vendorName.toLowerCase().includes(q));

      const matchCategory = filterCategory === 'All' || asset.category === filterCategory;
      const matchCondition = filterCondition === 'All' || asset.condition === filterCondition;
      const matchStatus = filterStatus === 'All' || asset.status === filterStatus;

      return matchSearch && matchCategory && matchCondition && matchStatus;
    });
  }, [fixedAssets, searchQuery, filterCategory, filterCondition, filterStatus]);

  // Top Metric Cards Summary
  const metrics = useMemo(() => {
    let totalGrossPurchase = 0;
    let totalAccumDep = 0;
    let totalCurrentNBV = 0;
    let brandNewCount = 0;
    let secondHandCount = 0;

    fixedAssets.forEach(a => {
      const calc = calculateAssetDepreciation(a);
      totalGrossPurchase += Number(a.purchaseCost || 0);
      totalAccumDep += calc.currentAccumulatedDep;
      totalCurrentNBV += calc.currentNetBookValue;
      if (a.condition === 'Second Hand / Used') secondHandCount++;
      else brandNewCount++;
    });

    return {
      totalGrossPurchase,
      totalAccumDep,
      totalCurrentNBV,
      totalCount: fixedAssets.length,
      brandNewCount,
      secondHandCount
    };
  }, [fixedAssets]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Header Banner */}
      <div className="shrink-0 p-6 md:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                Capital & Fixed Assets
                <span className="text-[10px] uppercase font-black tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Depreciation Engine
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Track company equipment, vehicles, IT assets (New / Second-hand) with real-time dynamic SLM & WDV valuation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingAssetId(null);
              setFormData(initialForm);
              setSelectedProductSearch('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus size={16} /> Add Capital Asset
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="shrink-0 p-6 md:px-8 pb-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Capital Assets</span>
            <Building2 size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-white">
            {metrics.totalCount} <span className="text-xs font-bold text-slate-400 uppercase">Assets</span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">
            {metrics.brandNewCount} New • {metrics.secondHandCount} Second-Hand
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Purchase Value</span>
            <DollarSign size={16} className="text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-white">
            ₹{metrics.totalGrossPurchase.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">Gross Acquisition Cost</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Accumulated Depreciation</span>
            <TrendingDown size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">
            - ₹{metrics.totalAccumDep.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">Current Depreciated Value Off</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Current Net Book Value</span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{metrics.totalCurrentNBV.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">Current Realized Balance Sheet Value</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="shrink-0 px-6 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by asset name, tag, serial, vendor, location..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Condition Filter */}
          <select
            value={filterCondition}
            onChange={e => setFilterCondition(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Conditions</option>
            <option value="Brand New">Brand New</option>
            <option value="Second Hand / Used">Second Hand / Used</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Fully Depreciated">Fully Depreciated</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
      </div>

      {/* Asset Table Container */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 custom-scrollbar">
        {filteredAssets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center p-8">
            <Archive size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">No Capital Assets Registered</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Add machinery, vehicles, computers, or office appliances to track accurate company asset values and depreciation.
            </p>
            <button
              onClick={() => {
                setEditingAssetId(null);
                setFormData(initialForm);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors"
            >
              Add First Asset
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">Asset Details</th>
                    <th className="py-3 px-4">Category & Tag</th>
                    <th className="py-3 px-4">Condition & Age</th>
                    <th className="py-3 px-4 text-right">Purchase Cost</th>
                    <th className="py-3 px-4 text-center">Method & Rate</th>
                    <th className="py-3 px-4 text-right">Depreciation to Date</th>
                    <th className="py-3 px-4 text-right">Current Net Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssets.map(asset => {
                    const metrics = calculateAssetDepreciation(asset);
                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors group">
                        {/* Name & Location */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-800 dark:text-slate-100 text-xs">
                            {asset.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-semibold">
                            {asset.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin size={10} className="text-indigo-500" /> {asset.location}
                              </span>
                            )}
                            {asset.vendorName && <span>• {asset.vendorName}</span>}
                          </div>
                        </td>

                        {/* Category & Asset Tag */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-black text-[9px] uppercase tracking-wider block w-fit mb-0.5">
                            {asset.category || 'Equipment'}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {asset.assetTag || asset.id}
                          </span>
                        </td>

                        {/* Condition & Age */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              asset.condition === 'Second Hand / Used'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {asset.condition || 'Brand New'}
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            {metrics.monthsElapsed} mos in service {asset.priorUsageMonths ? `(+${asset.priorUsageMonths}m prior)` : ''}
                          </div>
                        </td>

                        {/* Purchase Cost */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-slate-800 dark:text-slate-200">
                            ₹{Number(asset.purchaseCost || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {asset.purchaseDate}
                          </div>
                        </td>

                        {/* Method & Rate */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-black text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {asset.depreciationMethod || 'SLM'} ({metrics.annualDepRatePercent}%/yr)
                          </span>
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                            Life: {asset.usefulLifeYears || 3} yrs • ₹{metrics.monthlyDepAmount}/mo
                          </div>
                        </td>

                        {/* Accumulated Depreciation */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-rose-600 dark:text-rose-400">
                            - ₹{metrics.currentAccumulatedDep.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400">
                            {asset.purchaseCost ? Math.round((metrics.currentAccumulatedDep / asset.purchaseCost) * 100) : 0}% Depreciated
                          </div>
                        </td>

                        {/* Net Book Value */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{metrics.currentNetBookValue.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold">
                            Salvage: ₹{Number(asset.salvageValue || 0).toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            metrics.isFullyDepreciated || asset.status === 'Fully Depreciated'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : asset.status === 'Disposed'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}>
                            {metrics.isFullyDepreciated ? 'Fully Depreciated' : (asset.status || 'Active')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewScheduleAsset(asset)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                              title="View Depreciation Schedule"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleEditClick(asset)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Asset"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(asset)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Delete Asset"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT ASSET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    {editingAssetId ? 'Edit Capital Asset' : 'Register Capital / Fixed Asset'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    Company equipment registration with automated dynamic depreciation
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingAssetId(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveAsset} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 custom-scrollbar">
              {/* Product Catalog Auto-Fill Linker */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Sparkles size={12} /> Auto-fill from Product Catalog / Inventory
                  </label>
                  {formData.productId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, productId: '' }));
                        setSelectedProductSearch('');
                      }}
                      className="text-[9px] font-bold text-rose-500 hover:underline"
                    >
                      Clear Link
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={selectedProductSearch}
                    onChange={e => {
                      setSelectedProductSearch(e.target.value);
                      setShowProductPicker(true);
                    }}
                    onFocus={() => setShowProductPicker(true)}
                    placeholder="Search product from inventory to collect specs & purchase price..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />

                  {/* Dropdown for products */}
                  {showProductPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100 dark:divide-slate-800">
                      {products
                        .filter(p => !selectedProductSearch || p.name.toLowerCase().includes(selectedProductSearch.toLowerCase()) || p.sku?.toLowerCase().includes(selectedProductSearch.toLowerCase()))
                        .slice(0, 8)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer flex justify-between items-center transition-colors text-xs"
                          >
                            <div>
                              <span className="font-black text-slate-800 dark:text-slate-100 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku} • {p.category || 'General'}</span>
                            </div>
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                              ₹{Number(p.purchasePrice || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      {products.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">No products found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dell Precision Workstation 3660"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Asset Category
                  </label>
                  <select
                    value={formData.category || 'Equipment'}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Condition: Brand New vs Second Hand */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Asset Condition at Acquisition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: 'Brand New', priorUsageMonths: 0 })}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                      formData.condition !== 'Second Hand / Used'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <PackageCheck size={15} /> Brand New
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: 'Second Hand / Used' })}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                      formData.condition === 'Second Hand / Used'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw size={15} /> Second Hand / Used
                  </button>
                </div>

                {formData.condition === 'Second Hand / Used' && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                        Prior Age / Usage (Months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.priorUsageMonths || 0}
                        onChange={e => setFormData({ ...formData, priorUsageMonths: Number(e.target.value) })}
                        placeholder="e.g. 12 months used"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-4 leading-tight">
                        * Used assets apply depreciation based on actual acquired cost and remaining life.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase Cost, Date & Salvage Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Purchase Cost (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.purchaseCost || ''}
                    onChange={e => setFormData({ ...formData, purchaseCost: Number(e.target.value) })}
                    placeholder="e.g. 75000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate || ''}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Salvage / Scrap Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salvageValue || 0}
                    onChange={e => setFormData({ ...formData, salvageValue: Number(e.target.value) })}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Lifetime Predictability & Useful Life Selector */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo-500" /> Lifetime Predictability & Depreciation Engine
                  </label>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    {formData.lifetimeType === 'Indefinite' || formData.lifetimeType === 'Unpredictable' || formData.depreciationMethod === 'NONE'
                      ? 'Indefinite (Non-Depreciating)'
                      : `${formData.usefulLifeYears ?? 3} Years (${((Number(formData.usefulLifeYears ?? 3)) * 12).toFixed(0)} Months)`}
                  </span>
                </div>

                {/* Predictability Selector Mode */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      lifetimeType: 'Predictable', 
                      usefulLifeYears: prev.usefulLifeYears || 3, 
                      depreciationMethod: prev.depreciationMethod === 'NONE' ? 'SLM' : (prev.depreciationMethod || 'SLM') 
                    }))}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      formData.lifetimeType !== 'Indefinite' && formData.lifetimeType !== 'Unpredictable' && formData.depreciationMethod !== 'NONE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock size={14} /> Predictable Lifetime
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      lifetimeType: 'Indefinite', 
                      usefulLifeYears: 0, 
                      depreciationMethod: 'NONE' 
                    }))}
                    className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      formData.lifetimeType === 'Indefinite' || formData.lifetimeType === 'Unpredictable' || formData.depreciationMethod === 'NONE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck size={14} /> Unpredictable / Indefinite
                  </button>
                </div>

                {/* Predictable Useful Life Inputs */}
                {formData.lifetimeType !== 'Indefinite' && formData.lifetimeType !== 'Unpredictable' && formData.depreciationMethod !== 'NONE' ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Quick Presets:</span>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 5, 7, 10, 15, 20].map(yr => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, usefulLifeYears: yr }))}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${
                              Number(formData.usefulLifeYears) === yr
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-black'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {yr}Y
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Useful Life (Years) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          value={formData.usefulLifeYears ?? 3}
                          onChange={e => setFormData({ ...formData, usefulLifeYears: parseFloat(e.target.value) || 0 })}
                          placeholder="Type custom years (e.g. 2.5, 4, 12)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Depreciation Method
                        </label>
                        <select
                          value={formData.depreciationMethod || 'SLM'}
                          onChange={e => setFormData({ ...formData, depreciationMethod: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="SLM">SLM (Straight Line Method)</option>
                          <option value="WDV">WDV (Written Down Value / Reducing Balance)</option>
                          <option value="SYD">SYD (Sum of Years Digits)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-black uppercase text-[10px] text-emerald-700 dark:text-emerald-400 mb-0.5">
                      <ShieldCheck size={14} /> Non-Depreciating Capital Asset / Indefinite Life
                    </div>
                    <p className="text-[11px] font-medium">
                      This entry is flagged with <b>Unpredictable / Indefinite Useful Life</b>. Net Book Value will remain 100% equal to the initial investment cost without automated depreciation deductions.
                    </p>
                  </div>
                )}
              </div>

              {/* Asset Tag, Serial, Location, Supplier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Asset Tag / ID
                  </label>
                  <input
                    type="text"
                    value={formData.assetTag || ''}
                    onChange={e => setFormData({ ...formData, assetTag: e.target.value })}
                    placeholder="e.g. AST-4029"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g. SN-98234-X"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Location / Office
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Chennai Office Room 3"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* LIVE VALUATION PREVIEW & FUTURE FORECAST BOX */}
              <div className="bg-slate-900 text-white p-4.5 rounded-2xl space-y-3 shadow-xl border border-slate-800">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Calculator size={14} /> Live Calculated Valuation & Financial Forecast
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {livePreview.monthsElapsed} Months ({livePreview.yearsElapsed} Yrs) in service
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Annual Dep Rate</span>
                    <span className="text-sm font-black text-indigo-300 mt-0.5 block">{livePreview.annualDepRatePercent}%</span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Monthly Expense</span>
                    <span className="text-sm font-black text-slate-200 mt-0.5 block">₹{livePreview.monthlyDepAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[9px] font-black uppercase text-rose-400 block">Total Depreciated</span>
                    <span className="text-sm font-black text-rose-400 mt-0.5 block">- ₹{livePreview.currentAccumulatedDep.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                    <span className="text-[9px] font-black uppercase text-emerald-400 block">Current Net Book Value</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5 block">₹{livePreview.currentNetBookValue.toLocaleString('en-IN')}</span>
                    <span className="text-[8px] font-extrabold text-emerald-500/80 block mt-0.5">{livePreview.retentionPercent}% Retained</span>
                  </div>
                </div>

                {/* Future Valuation Forecast Bar */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap justify-between items-center text-[10px] font-bold text-slate-400 gap-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-400" />
                    <span>1-Yr Forecast: <b className="text-slate-200">₹{livePreview.valueNextYear.toLocaleString('en-IN')}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-amber-400" />
                    <span>3-Yr Forecast: <b className="text-slate-200">₹{livePreview.valueIn3Years.toLocaleString('en-IN')}</b></span>
                  </div>
                  {formData.productId && (
                    <div className="text-[9px] text-indigo-300 font-mono">
                      Catalog Product Linked
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingAssetId(null); }}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all"
                >
                  {editingAssetId ? 'Update Asset' : 'Save Capital Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE FORECAST MODAL */}
      {viewScheduleAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850/50">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  Depreciation Schedule Forecast
                </h3>
                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {viewScheduleAsset.name} ({viewScheduleAsset.assetTag || viewScheduleAsset.id}) • {viewScheduleAsset.depreciationMethod}
                </p>
              </div>
              <button
                onClick={() => setViewScheduleAsset(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {(() => {
                const metrics = calculateAssetDepreciation(viewScheduleAsset);
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Purchase Cost</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                          ₹{Number(viewScheduleAsset.purchaseCost || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Useful Life</span>
                        <span className="font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                          {viewScheduleAsset.usefulLifeYears || 3} Years
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Current Net Value</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                          ₹{metrics.currentNetBookValue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 px-3">Month</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Depreciation</th>
                            <th className="py-2.5 px-3 text-right">Accumulated</th>
                            <th className="py-2.5 px-3 text-right">Net Book Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {metrics.schedule.map(entry => (
                            <tr
                              key={entry.month}
                              className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] ${
                                entry.month === metrics.monthsElapsed ? 'bg-indigo-50/50 dark:bg-indigo-950/30 font-black' : ''
                              }`}
                            >
                              <td className="py-2 px-3">
                                Month {entry.month}
                                {entry.month === metrics.monthsElapsed && (
                                  <span className="ml-1 text-[8px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                                    Current
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500">{entry.dateStr}</td>
                              <td className="py-2 px-3 text-right text-rose-500 font-bold">₹{entry.depAmount.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300 font-semibold">₹{entry.accumulatedDep.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">₹{entry.netBookValue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-850/50">
              <button
                onClick={() => setViewScheduleAsset(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
