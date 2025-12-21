import React, { useState, useEffect, useRef } from 'react';
import { Product, StockMovement } from '../types';
import { Package, AlertTriangle, Search, Filter, BellRing, X, ShoppingCart, CheckCircle, FileText, ArrowRight, Plus, Save, Wallet, History, ArrowUpRight, ArrowDownLeft, Send, MapPin, Calendar, Briefcase, ScanBarcode, Zap, PackagePlus, MinusCircle, PlusCircle, Trash2, Building2 } from 'lucide-react';
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

export const InventoryModule: React.FC = () => {
  const { products, addProduct, updateProduct, removeProduct, stockMovements, recordStockMovement, clients, addClient } = useData();
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [showNotification, setShowNotification] = useState(true);
  const [showPOModal, setShowPOModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: 'Equipment',
    stock: 0,
    minLevel: 5,
    location: 'Warehouse A'
  });

  // Send for Demo Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoData, setDemoData] = useState({
      productId: '',
      quantity: 1,
      clientName: '',
      date: new Date().toISOString().split('T')[0],
      location: ''
  });

  // Barcode Scanner State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const [scanOperation, setScanOperation] = useState<'In' | 'Out'>('In'); // Toggle for Add/Remove
  const [quickStockAmount, setQuickStockAmount] = useState<number>(1);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const low = products.filter(p => p.stock < p.minLevel);
    setLowStockItems(low);
    if (low.length > 0) {
        setShowNotification(true);
    }
  }, [products]);

  // Auto-focus input when scan modal opens and is in idle state
  useEffect(() => {
      if (showScanModal && scanStatus === 'idle' && scanInputRef.current) {
          // Small timeout to ensure modal render
          setTimeout(() => {
              scanInputRef.current?.focus();
          }, 100);
      }
  }, [showScanModal, scanStatus]);

  const handleGeneratePO = () => {
    setProcessingOrder(true);
    setTimeout(() => {
        setProcessingOrder(false);
        setShowPOModal(false);
        
        // Update stock levels in central store and record movement
        products.forEach(p => {
             if (p.stock < p.minLevel) {
                 const qtyToAdd = 10;
                 updateProduct(p.id, { stock: p.stock + qtyToAdd, lastRestocked: new Date().toISOString().split('T')[0] });
                 recordStockMovement({
                     id: `MOV-${Date.now()}-${p.id}`,
                     productId: p.id,
                     productName: p.name,
                     type: 'In',
                     quantity: qtyToAdd,
                     date: new Date().toISOString().split('T')[0],
                     reference: `PO-${Date.now().toString().slice(-4)}`,
                     purpose: 'Restock'
                 });
             }
        });
        
        setShowNotification(false);
        alert("Purchase Orders generated! Stock has been replenished.");
    }, 1500);
  };

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.price) {
        alert("Please fill Name, SKU and Price.");
        return;
    }
    const productToAdd: Product = {
        id: `P-${Date.now()}`, 
        name: newProduct.name!,
        category: newProduct.category as 'Equipment' | 'Consumable' | 'Spare Part' || 'Equipment',
        sku: newProduct.sku!,
        stock: Number(newProduct.stock) || 0,
        price: Number(newProduct.price) || 0,
        minLevel: Number(newProduct.minLevel) || 5,
        location: newProduct.location || 'Unassigned',
        hsn: newProduct.hsn || '',
        taxRate: newProduct.taxRate || 18,
        model: newProduct.model || '',
        description: newProduct.description || '',
        supplier: newProduct.supplier || '',
        lastRestocked: newProduct.stock && newProduct.stock > 0 ? new Date().toISOString().split('T')[0] : ''
    };
    addProduct(productToAdd);
    
    // Record initial stock as movement
    if ((newProduct.stock || 0) > 0) {
        recordStockMovement({
             id: `MOV-INIT-${Date.now()}`,
             productId: productToAdd.id,
             productName: productToAdd.name,
             type: 'In',
             quantity: productToAdd.stock,
             date: new Date().toISOString().split('T')[0],
             reference: 'Opening Stock',
             purpose: 'Restock'
        });
    }

    setShowAddProductModal(false);
    setNewProduct({ category: 'Equipment', stock: 0, minLevel: 5, location: 'Warehouse A', name: '', sku: '', price: 0, hsn: '', taxRate: 18, model: '', description: '', supplier: '' });
  };

  const handleDeleteProduct = (id: string, name: string) => {
      if (confirm(`Are you sure you want to delete "${name}" from inventory? This action cannot be undone.`)) {
          removeProduct(id);
      }
  };

  const handleSendForDemo = () => {
      if (!demoData.productId || demoData.quantity <= 0 || !demoData.clientName) {
          alert("Please fill all details.");
          return;
      }
      
      const product = products.find(p => p.id === demoData.productId);
      if(!product) return;

      if(product.stock < demoData.quantity) {
          alert("Insufficient stock for this operation.");
          return;
      }

      // Check for new client
      const existingClient = clients.find(c => c.name === demoData.clientName);
      if (!existingClient) {
          addClient({
              id: `CLI-${String(clients.length + 1).padStart(3, '0')}`,
              name: demoData.clientName,
              hospital: demoData.location || '',
              address: demoData.location || '',
              gstin: ''
          });
      }

      // 1. Deduct Stock
      updateProduct(product.id, { stock: product.stock - demoData.quantity });

      // 2. Record Movement
      recordStockMovement({
          id: `MOV-DEMO-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          type: 'Out',
          quantity: demoData.quantity,
          date: demoData.date,
          reference: `Demo: ${demoData.clientName} ${demoData.location ? `(${demoData.location})` : ''}`,
          purpose: 'Demo'
      });

      setShowDemoModal(false);
      setDemoData({ productId: '', quantity: 1, clientName: '', date: new Date().toISOString().split('T')[0], location: '' });
      setActiveTab('history'); // Switch to history to show the action
  };

  const handleScanSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!scanQuery.trim()) return;

      const foundProduct = products.find(p => p.sku.toLowerCase() === scanQuery.toLowerCase());
      
      if (foundProduct) {
          setScannedProduct(foundProduct);
          setScanStatus('found');
          setScanOperation('In'); // Default to adding stock
          setQuickStockAmount(1);
      } else {
          setScanStatus('not-found');
      }
  };

  const handleStockUpdate = () => {
      if (!scannedProduct || quickStockAmount <= 0) return;

      let newStock = scannedProduct.stock;
      let lastRestocked = scannedProduct.lastRestocked;
      
      if (scanOperation === 'In') {
          newStock += quickStockAmount;
          lastRestocked = new Date().toISOString().split('T')[0];
      } else {
          if (scannedProduct.stock < quickStockAmount) {
              alert(`Insufficient stock! Current stock is ${scannedProduct.stock}.`);
              return;
          }
          newStock -= quickStockAmount;
      }

      updateProduct(scannedProduct.id, { stock: newStock, lastRestocked });
      
      recordStockMovement({
          id: `MOV-SCAN-${Date.now()}`,
          productId: scannedProduct.id,
          productName: scannedProduct.name,
          type: scanOperation,
          quantity: quickStockAmount,
          date: new Date().toISOString().split('T')[0],
          reference: 'Barcode Scan',
          purpose: scanOperation === 'In' ? 'Restock' : 'Sale'
      });

      handleResetScan();
      alert(`Successfully ${scanOperation === 'In' ? 'Added' : 'Removed'} ${quickStockAmount} units.`);
  };

  const handleCreateFromScan = () => {
      setShowScanModal(false);
      setNewProduct(prev => ({ 
          ...prev, 
          sku: scanQuery,
          stock: 0,
          category: 'Equipment',
          location: 'Warehouse A'
      }));
      setShowAddProductModal(true);
      handleResetScan();
  };

  const handleResetScan = () => {
      setScannedProduct(null);
      setScanStatus('idle');
      setScanQuery('');
      setQuickStockAmount(1);
      setTimeout(() => {
          if (scanInputRef.current) scanInputRef.current.focus();
      }, 50);
  };

  const triggerScanForAddProduct = () => {
      setShowAddProductModal(false);
      setShowScanModal(true);
  };

  const poTotalCost = lowStockItems.reduce((acc, item) => {
      const quantityNeeded = item.minLevel + 10 - item.stock;
      return acc + (quantityNeeded * item.price);
  }, 0);

  // Calculate Stats
  const totalInventoryValue = products.reduce((acc, product) => acc + (product.stock * product.price), 0);
  const equipmentValue = products.filter(p => p.category === 'Equipment').reduce((acc, p) => acc + (p.stock * p.price), 0);
  const consumableValue = products.filter(p => p.category === 'Consumable').reduce((acc, p) => acc + (p.stock * p.price), 0);
  const totalStockCount = products.reduce((acc, product) => acc + product.stock, 0);

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Inventory Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden group h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet size={100} />
              </div>
              <div className="relative z-10">
                  <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Wallet size={14} /> Asset Valuation
                  </p>
                  <h3 className="text-3xl font-black tracking-tight mt-1">₹{formatIndianNumber(totalInventoryValue)}</h3>
                  <p className="text-xs text-emerald-100/60 mt-2 font-medium">Total stock value</p>
              </div>
          </div>
          
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Equipment</p>
                  <h3 className="text-xl font-black text-slate-800">₹{formatIndianNumber(equipmentValue)}</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">High value assets</p>
              </div>
               <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                  <Building2 size={24} />
              </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Consumables</p>
                  <h3 className="text-xl font-black text-slate-800">₹{formatIndianNumber(consumableValue)}</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Gels, Spares, etc.</p>
              </div>
               <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
                  <Package size={24} />
              </div>
          </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Shortage Items</p>
                  <h3 className={`text-xl font-black ${lowStockItems.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockItems.length}</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Below Min level</p>
              </div>
               <div className={`p-3 rounded-2xl group-hover:scale-110 transition-transform ${lowStockItems.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                  <AlertTriangle size={24} />
              </div>
          </div>
      </div>

      {/* Low Stock Alert Banner */}
      {showNotification && lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 shrink-0 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="bg-red-100 p-2.5 rounded-full text-red-600 shrink-0 shadow-sm">
                    <BellRing size={20} />
                </div>
                <div>
                    <h4 className="font-black text-red-900">Procurement Needed</h4>
                    <p className="text-sm font-medium text-red-700/80 mt-0.5">
                        {lowStockItems.length} items are running low. 
                        <span className="hidden sm:inline"> Replenish inventory to avoid service disruptions.</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                 <button 
                    onClick={() => setShowPOModal(true)}
                    className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    <ShoppingCart size={16} /> Bulk Restock
                </button>
                <button 
                    onClick={() => setShowNotification(false)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>
      )}

      {/* Main Inventory Section */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        
        {/* Toolbar with Tabs */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-3">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                    <button 
                        onClick={() => setActiveTab('stock')}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-white shadow-md text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Package size={14} /> Stock Registry
                    </button>
                     <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-md text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <History size={14} /> Movement Logs
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                {activeTab === 'stock' && (
                    <>
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search inventory..." 
                                className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-medical-500/5 w-full sm:w-64 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => { setShowScanModal(true); handleResetScan(); }}
                            className="bg-slate-800 text-white hover:bg-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-500/20 active:scale-95">
                            <ScanBarcode size={16} /> Scan
                        </button>
                        <button 
                            onClick={() => setShowDemoModal(true)}
                            className="bg-white border border-slate-200 text-slate-600 hover:border-medical-300 hover:text-medical-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                            <Send size={16} /> Demo
                        </button>
                        <button 
                            onClick={() => setShowAddProductModal(true)}
                            className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                            <Plus size={16} /> Register Item
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            {activeTab === 'stock' ? (
                <table className="w-full text-left text-sm text-slate-600 min-w-[1000px]">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5">Product Master</th>
                            <th className="px-6 py-5">Category & SKU</th>
                            <th className="px-6 py-5">Supplier</th>
                            <th className="px-6 py-5 text-right">Available Stock</th>
                            <th className="px-6 py-5 text-right">Unit Price</th>
                            <th className="px-6 py-5">Warehouse</th>
                            <th className="px-6 py-5">Status</th>
                            <th className="px-6 py-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products.map((product) => {
                            const isLowStock = product.stock < product.minLevel;
                            return (
                                <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-red-50/20' : ''}`}>
                                    <td className="px-6 py-5">
                                        <div className="font-black text-slate-800">{product.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{product.model || 'Standard Model'}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-xs font-black text-indigo-600 uppercase">{product.category}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{product.sku}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold">
                                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"><Building2 size={12}/></div>
                                            {product.supplier || 'Not set'}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-5 text-right font-black ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                        <span className="text-lg">{product.stock}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">/ {product.minLevel}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-teal-700">₹{product.price.toLocaleString()}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400">
                                            <MapPin size={12} /> {product.location}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {isLowStock ? (
                                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse">
                                                <AlertTriangle size={12} /> Low Stock
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                                <CheckCircle size={12} /> Optimal
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={() => handleDeleteProduct(product.id, product.name)}
                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Archive Product"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-5">Transaction Date</th>
                            <th className="px-6 py-5">Nature of Movement</th>
                            <th className="px-6 py-5">Product Master</th>
                            <th className="px-6 py-5 text-right">Quantity</th>
                            <th className="px-6 py-5">Reference / Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stockMovements.length > 0 ? (
                            stockMovements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((movement) => (
                                <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-5 text-slate-500 font-bold">{movement.date}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${
                                            movement.type === 'In' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : movement.purpose === 'Demo' 
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                        }`}>
                                            {movement.type === 'In' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                            {movement.type === 'In' ? 'Stock Receipt' : movement.purpose === 'Demo' ? 'Demo Dispatch' : 'Sales Dispatch'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 font-black text-slate-800">{movement.productName}</td>
                                    <td className="px-6 py-5 text-right font-black text-lg text-slate-700">
                                        {movement.quantity}
                                    </td>
                                    <td className="px-6 py-5 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                                        {movement.reference}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-20 text-slate-300 italic font-black uppercase tracking-widest opacity-30">No activity logged in registry</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className={`p-8 text-white text-center relative transition-colors duration-300 ${scanStatus === 'not-found' ? 'bg-orange-600' : scanStatus === 'found' ? 'bg-emerald-700' : 'bg-[#022c22]'}`}>
                      <button onClick={() => { setShowScanModal(false); handleResetScan(); }} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                          <X size={28} />
                      </button>
                      <div className="bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white/10">
                          {scanStatus === 'not-found' ? <PackagePlus size={40} /> : scanStatus === 'found' ? <CheckCircle size={40} /> : <ScanBarcode size={40} className="animate-pulse" />}
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">
                          {scanStatus === 'idle' && 'Registry Scan'}
                          {scanStatus === 'found' && 'Inventory Match'}
                          {scanStatus === 'not-found' && 'Unknown Product'}
                      </h3>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">
                          {scanStatus === 'idle' && 'Waiting for hardware input...'}
                          {scanStatus === 'found' && 'Item confirmed in local database'}
                          {scanStatus === 'not-found' && 'This SKU is not currently indexed'}
                      </p>
                  </div>
                  
                  <div className="p-8">
                      {scanStatus === 'idle' && (
                          <form onSubmit={handleScanSubmit} className="space-y-6">
                              <div className="relative">
                                <input 
                                    ref={scanInputRef}
                                    type="text" 
                                    className="w-full text-center text-3xl font-mono font-black py-6 border-b-4 border-slate-100 outline-none focus:border-medical-500 bg-transparent placeholder-slate-200 transition-all uppercase"
                                    placeholder="Enter SKU..."
                                    value={scanQuery}
                                    onChange={(e) => setScanQuery(e.target.value)}
                                    autoFocus
                                />
                                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-12 bg-medical-500/10 rounded-full animate-pulse"></div>
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-12 bg-medical-500/10 rounded-full animate-pulse"></div>
                              </div>
                              <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">
                                  Registry auto-detect active
                              </p>
                          </form>
                      )}

                      {scanStatus === 'found' && scannedProduct && (
                          <div className="space-y-8 animate-in slide-in-from-bottom-4">
                              <div className="text-center">
                                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">{scannedProduct.name}</h4>
                                  <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-1">{scannedProduct.sku}</p>
                              </div>
                              
                              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-2 gap-8 text-center shadow-inner">
                                  <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Registry</p>
                                      <p className="text-2xl font-black text-slate-800 mt-1">{scannedProduct.stock}</p>
                                  </div>
                                  <div>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Price</p>
                                      <p className="text-2xl font-black text-slate-800 mt-1">₹{scannedProduct.price}</p>
                                  </div>
                              </div>

                              <div className="flex bg-slate-100 p-2 rounded-2xl">
                                  <button 
                                      onClick={() => setScanOperation('In')}
                                      className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all ${scanOperation === 'In' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>
                                      <PlusCircle size={16} /> Receipt
                                  </button>
                                  <button 
                                      onClick={() => setScanOperation('Out')}
                                      className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all ${scanOperation === 'Out' ? 'bg-orange-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-200'}`}>
                                      <MinusCircle size={16} /> Dispatch
                                  </button>
                              </div>

                              <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">
                                      Registry Adjustment Units
                                  </label>
                                  <div className="flex items-center justify-center gap-6">
                                      <button onClick={() => setQuickStockAmount(Math.max(1, quickStockAmount - 1))} className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-xl text-slate-600 shadow-sm border border-slate-200">-</button>
                                      <input 
                                          type="number" 
                                          className="w-24 text-center font-black text-4xl border-none outline-none bg-transparent text-slate-800"
                                          value={quickStockAmount}
                                          onChange={(e) => setQuickStockAmount(parseInt(e.target.value) || 0)}
                                      />
                                      <button onClick={() => setQuickStockAmount(quickStockAmount + 1)} className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-xl text-slate-600 shadow-sm border border-slate-200">+</button>
                                  </div>
                              </div>

                              <div className="flex gap-4 pt-4">
                                  <button 
                                      onClick={handleResetScan}
                                      className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200">
                                      New Scan
                                  </button>
                                  <button 
                                      onClick={handleStockUpdate}
                                      className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                          scanOperation === 'In' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
                                      }`}>
                                      <Zap size={18} /> Update Log
                                  </button>
                              </div>
                          </div>
                      )}

                      {scanStatus === 'not-found' && (
                          <div className="text-center animate-in slide-in-from-bottom-4">
                              <p className="text-slate-600 mb-8 text-sm font-bold">
                                  SKU <span className="font-mono font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg mx-1 border border-orange-100">{scanQuery}</span> is not found.
                              </p>
                              
                              <div className="flex flex-col gap-4">
                                   <button 
                                      onClick={handleCreateFromScan}
                                      className="w-full py-5 text-white font-black uppercase tracking-widest bg-orange-600 rounded-[2rem] hover:bg-orange-700 shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transition-all active:scale-95 text-xs">
                                      <PackagePlus size={20} /> New Registration
                                   </button>
                                   <button 
                                      onClick={handleResetScan}
                                      className="w-full py-4 text-slate-500 font-black uppercase tracking-widest bg-slate-50 rounded-[2rem] hover:bg-slate-100 transition-all border border-slate-200 text-[10px]">
                                      Try Another SKU
                                   </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Purchase Order Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                            <ShoppingCart className="text-medical-600" size={28} /> Procurement Order
                        </h3>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Automated Stock Replenishment</p>
                    </div>
                    <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 rounded-2xl text-[10px] uppercase text-slate-500 font-black tracking-widest">
                            <tr>
                                <th className="px-5 py-4 rounded-l-2xl">Item Master</th>
                                <th className="px-5 py-4 text-right">Registry</th>
                                <th className="px-5 py-4 text-right">Order Qty</th>
                                <th className="px-5 py-4 text-right rounded-r-2xl">Est. Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStockItems.map(item => {
                                const qty = item.minLevel + 10 - item.stock;
                                return (
                                    <tr key={item.id}>
                                        <td className="px-5 py-5 font-black text-slate-700">{item.name}</td>
                                        <td className="px-5 py-5 text-right text-red-600 font-black">{item.stock}</td>
                                        <td className="px-5 py-5 text-right font-black text-lg text-slate-800">{qty}</td>
                                        <td className="px-5 py-5 text-right font-black text-teal-700">₹{(qty * item.price).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50/50">
                            <tr>
                                <td colSpan={3} className="px-5 py-6 text-right font-black text-slate-400 uppercase tracking-widest">Total Procurement Value:</td>
                                <td className="px-5 py-6 text-right text-emerald-800 font-black text-2xl">₹{formatIndianNumber(poTotalCost)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50 rounded-b-[2.5rem]">
                    <button 
                        onClick={() => setShowPOModal(false)}
                        className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-200 rounded-2xl text-xs transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleGeneratePO}
                        disabled={processingOrder}
                        className="px-10 py-4 bg-medical-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center gap-3 transition-all active:scale-95 text-xs">
                        {processingOrder ? 'Syncing...' : <><ShoppingCart size={18} /> Confirm Procurement</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        <Plus className="text-medical-600" size={28} /> New Registration
                    </h3>
                    <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                        <X size={28} />
                    </button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description *</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                            placeholder="e.g. ECG Machine Lead"
                            value={newProduct.name || ''}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Item Category</label>
                            <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all appearance-none"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value as any})}
                            >
                                <option value="Equipment">Equipment</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Spare Part">Spare Part</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Registry No *</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 pr-12 text-sm font-mono font-black focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 outline-none transition-all uppercase"
                                    placeholder="EQ-001"
                                    value={newProduct.sku || ''}
                                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                                />
                                <button 
                                    onClick={triggerScanForAddProduct}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-medical-600 transition-colors"
                                    title="Scan Hardware">
                                    <ScanBarcode size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manufacturer Model</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                placeholder="Model Name"
                                value={newProduct.model || ''}
                                onChange={(e) => setNewProduct({...newProduct, model: e.target.value})}
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authorized Supplier</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                placeholder="Company Name"
                                value={newProduct.supplier || ''}
                                onChange={(e) => setNewProduct({...newProduct, supplier: e.target.value})}
                             />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Rate (₹) *</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                value={newProduct.price || 0}
                                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Warehouse Location</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                placeholder="e.g. Shelf A1"
                                value={newProduct.location || ''}
                                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                             />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Registry Units</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                value={newProduct.stock || 0}
                                onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                             />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Safe Level</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 focus:border-medical-500 transition-all"
                                value={newProduct.minLevel || 0}
                                onChange={(e) => setNewProduct({...newProduct, minLevel: parseInt(e.target.value)})}
                             />
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50/50 rounded-b-[2.5rem]">
                    <button 
                        onClick={() => setShowAddProductModal(false)}
                        className="px-8 py-4 text-slate-500 font-black uppercase tracking-widest hover:bg-slate-200 rounded-2xl text-xs transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveProduct}
                        className="px-10 py-4 bg-medical-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-medical-500/30 hover:bg-medical-700 transition-all active:scale-95 text-xs flex items-center justify-center gap-2">
                        <Save size={20} /> Register Item
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};