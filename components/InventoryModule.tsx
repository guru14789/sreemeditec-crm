


import React, { useState, useEffect, useRef } from 'react';
import { Product, StockMovement } from '../types';
import { Package, AlertTriangle, Search, Filter, BellRing, X, ShoppingCart, CheckCircle, FileText, ArrowRight, Plus, Save, Wallet, History, ArrowUpRight, ArrowDownLeft, Send, MapPin, Calendar, Briefcase, ScanBarcode, Zap, PackagePlus, MinusCircle, PlusCircle, Trash2 } from 'lucide-react';
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
                 updateProduct(p.id, { stock: p.stock + qtyToAdd });
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
        description: newProduct.description || ''
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
    setNewProduct({ category: 'Equipment', stock: 0, minLevel: 5, location: 'Warehouse A', name: '', sku: '', price: 0, hsn: '', taxRate: 18, model: '', description: '' });
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
              hospital: demoData.location || '', // Using location as potential hospital/company name or address
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
      
      if (scanOperation === 'In') {
          newStock += quickStockAmount;
      } else {
          if (scannedProduct.stock < quickStockAmount) {
              alert(`Insufficient stock! Current stock is ${scannedProduct.stock}.`);
              return;
          }
          newStock -= quickStockAmount;
      }

      updateProduct(scannedProduct.id, { stock: newStock });
      
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
      // Use a subtle notification instead of alert for smoother flow? Alert is fine for now.
      alert(`Successfully ${scanOperation === 'In' ? 'Added' : 'Removed'} ${quickStockAmount} units.`);
  };

  const handleCreateFromScan = () => {
      setShowScanModal(false);
      // Pre-fill the SKU in the new product form
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
      // Timeout to allow UI render before focus
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
  const totalStockCount = products.reduce((acc, product) => acc + product.stock, 0);

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-y-auto lg:overflow-hidden p-2">
      
      {/* Inventory Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden group h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet size={100} />
              </div>
              <div className="relative z-10">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Wallet size={14} /> Total Inventory Value
                  </p>
                  <h3 className="text-3xl font-black tracking-tight mt-1">₹{formatIndianNumber(totalInventoryValue)}</h3>
                  <p className="text-xs text-emerald-100/60 mt-2 font-medium">Estimated asset value</p>
              </div>
          </div>
          
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Products</p>
                  <h3 className="text-2xl font-black text-slate-800">{products.length}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">{totalStockCount} units in stock</p>
              </div>
               <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 group-hover:scale-110 transition-transform">
                  <Package size={24} />
              </div>
          </div>

           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Low Stock Items</p>
                  <h3 className={`text-2xl font-black ${lowStockItems.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockItems.length}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Requires re-ordering</p>
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
                    <h4 className="font-bold text-red-900">Low Stock Alert</h4>
                    <p className="text-sm font-medium text-red-700/80 mt-0.5">
                        {lowStockItems.length} items are below minimum levels. 
                        <span className="hidden sm:inline"> Immediate restocking required.</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                 <button 
                    onClick={() => setShowPOModal(true)}
                    className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    <ShoppingCart size={18} /> Order Stock
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
                 <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Package size={20} /></div> Inventory Management
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setActiveTab('stock')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-white shadow-sm text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Package size={14} /> In Office (Stock)
                    </button>
                     <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-sm text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <History size={14} /> Went Out (History)
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
                                placeholder="Search SKU or Name..." 
                                className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 w-full sm:w-64 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => { setShowScanModal(true); handleResetScan(); }}
                            className="bg-slate-800 text-white hover:bg-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-500/20 active:scale-95">
                            <ScanBarcode size={16} /> Scan Barcode
                        </button>
                        <button 
                            onClick={() => setShowDemoModal(true)}
                            className="bg-white border border-slate-200 text-slate-600 hover:border-medical-300 hover:text-medical-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                            <Send size={16} /> Send for Demo
                        </button>
                        <button 
                            onClick={() => setShowAddProductModal(true)}
                            className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                            <Plus size={18} /> Add Product
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            {activeTab === 'stock' ? (
                /* IN OFFICE / CURRENT STOCK TABLE */
                <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 border-b border-slate-100">Product Name</th>
                            <th className="px-6 py-4 border-b border-slate-100">SKU</th>
                            <th className="px-6 py-4 border-b border-slate-100">Category</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-right">Stock</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-right">Price</th>
                            <th className="px-6 py-4 border-b border-slate-100">Location</th>
                            <th className="px-6 py-4 border-b border-slate-100">Status</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {products.map((product) => {
                            const isLowStock = product.stock < product.minLevel;
                            return (
                                <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-4 font-bold text-slate-800">{product.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                        {product.stock} <span className="text-xs font-medium text-slate-400">/ {product.minLevel}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-800">₹{product.price.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{product.location}</td>
                                    <td className="px-6 py-4">
                                        {isLowStock ? (
                                            <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                                                <AlertTriangle size={14} /> Low Stock
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                                <CheckCircle size={14} /> In Stock
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleDeleteProduct(product.id, product.name)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Product"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                /* WENT OUT / HISTORY TABLE */
                <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 border-b border-slate-100">Date</th>
                            <th className="px-6 py-4 border-b border-slate-100">Purpose / Status</th>
                            <th className="px-6 py-4 border-b border-slate-100">Product Name</th>
                            <th className="px-6 py-4 border-b border-slate-100 text-right">Quantity</th>
                            <th className="px-6 py-4 border-b border-slate-100">Reference / Location</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stockMovements.length > 0 ? (
                            stockMovements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((movement) => (
                                <tr key={movement.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-500 font-medium">{movement.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                            movement.type === 'In' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : movement.purpose === 'Demo' 
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                        }`}>
                                            {movement.type === 'In' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                            {movement.type === 'In' ? 'Restock (In Office)' : movement.purpose === 'Demo' ? 'Sent for Demo' : 'Sold (Out)'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{movement.productName}</td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                                        {movement.quantity}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                        {movement.reference}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-400 italic">No stock movement history available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                  <div className={`p-6 text-white text-center relative transition-colors duration-300 ${scanStatus === 'not-found' ? 'bg-orange-500' : scanStatus === 'found' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                      <button onClick={() => { setShowScanModal(false); handleResetScan(); }} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                      <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                          {scanStatus === 'not-found' ? <PackagePlus size={32} /> : scanStatus === 'found' ? <CheckCircle size={32} /> : <ScanBarcode size={32} />}
                      </div>
                      <h3 className="text-xl font-bold">
                          {scanStatus === 'idle' && 'Scan Mode Active'}
                          {scanStatus === 'found' && 'Product Found'}
                          {scanStatus === 'not-found' && 'Product Not Found'}
                      </h3>
                      <p className="text-white/70 text-sm mt-1">
                          {scanStatus === 'idle' && 'Ready for input. Scan a barcode now.'}
                          {scanStatus === 'found' && 'Product detected in inventory.'}
                          {scanStatus === 'not-found' && 'This item is not in your inventory.'}
                      </p>
                  </div>
                  
                  <div className="p-8">
                      {scanStatus === 'idle' && (
                          <form onSubmit={handleScanSubmit} className="space-y-4">
                              <input 
                                  ref={scanInputRef}
                                  type="text" 
                                  className="w-full text-center text-2xl font-mono font-bold py-4 border-b-2 border-slate-200 outline-none focus:border-medical-500 bg-transparent placeholder-slate-300"
                                  placeholder="Waiting for scan..."
                                  value={scanQuery}
                                  onChange={(e) => setScanQuery(e.target.value)}
                                  autoFocus
                              />
                              <p className="text-xs text-center text-slate-400">
                                  Use your scanner or type SKU manually and press Enter.
                              </p>
                          </form>
                      )}

                      {scanStatus === 'found' && scannedProduct && (
                          <div className="space-y-6 animate-in slide-in-from-bottom-4">
                              <div className="text-center">
                                  <h4 className="text-xl font-bold text-slate-800">{scannedProduct.name}</h4>
                                  <p className="text-slate-500 font-mono text-sm mt-1">{scannedProduct.sku}</p>
                              </div>
                              
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-center">
                                  <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase">Current Stock</p>
                                      <p className="text-xl font-black text-slate-800">{scannedProduct.stock}</p>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold text-slate-400 uppercase">Price</p>
                                      <p className="text-xl font-black text-slate-800">₹{scannedProduct.price}</p>
                                  </div>
                              </div>

                              {/* Operation Toggle */}
                              <div className="flex bg-slate-100 p-1 rounded-xl">
                                  <button 
                                      onClick={() => setScanOperation('In')}
                                      className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${scanOperation === 'In' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                      <PlusCircle size={16} /> Stock In (Add)
                                  </button>
                                  <button 
                                      onClick={() => setScanOperation('Out')}
                                      className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${scanOperation === 'Out' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                      <MinusCircle size={16} /> Stock Out (Remove)
                                  </button>
                              </div>

                              <div className="space-y-3">
                                  <label className="text-xs font-bold text-slate-500 uppercase block text-center">
                                      {scanOperation === 'In' ? 'Quantity to Add' : 'Quantity to Remove'}
                                  </label>
                                  <div className="flex items-center justify-center gap-4">
                                      <button onClick={() => setQuickStockAmount(Math.max(1, quickStockAmount - 1))} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600">-</button>
                                      <input 
                                          type="number" 
                                          className="w-20 text-center font-bold text-xl border-none outline-none bg-transparent"
                                          value={quickStockAmount}
                                          onChange={(e) => setQuickStockAmount(parseInt(e.target.value) || 0)}
                                      />
                                      <button onClick={() => setQuickStockAmount(quickStockAmount + 1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600">+</button>
                                  </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                  <button 
                                      onClick={handleResetScan}
                                      className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                                      Scan Next
                                  </button>
                                  <button 
                                      onClick={handleStockUpdate}
                                      className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-colors ${
                                          scanOperation === 'In' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'
                                      }`}>
                                      <Zap size={18} /> Confirm {scanOperation}
                                  </button>
                              </div>
                          </div>
                      )}

                      {scanStatus === 'not-found' && (
                          <div className="text-center animate-in slide-in-from-bottom-4">
                              <p className="text-slate-600 mb-6 text-sm">
                                  The barcode <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded mx-1">{scanQuery}</span> does not exist in the system.
                              </p>
                              
                              <div className="flex flex-col gap-3">
                                   <button 
                                      onClick={handleCreateFromScan}
                                      className="w-full py-4 text-white font-bold bg-orange-500 rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                      <PackagePlus size={20} /> Create New Product
                                   </button>
                                   <button 
                                      onClick={handleResetScan}
                                      className="w-full py-3 text-slate-600 font-bold bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">
                                      Scan Again
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-medical-600" size={24} /> Generate Purchase Order
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">Review items to be ordered based on stock shortage.</p>
                    </div>
                    <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 rounded-lg text-xs uppercase text-slate-500 font-bold">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Item</th>
                                <th className="px-4 py-3 text-right">Current</th>
                                <th className="px-4 py-3 text-right">Required</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStockItems.map(item => {
                                const qty = item.minLevel + 10 - item.stock;
                                return (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                                        <td className="px-4 py-3 text-right text-red-600 font-bold">{item.stock}</td>
                                        <td className="px-4 py-3 text-right font-medium">{qty}</td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-600">₹{(qty * item.price).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t border-slate-200 bg-slate-50/50">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-600">Total Estimated Cost:</td>
                                <td className="px-4 py-3 text-right text-medical-700 font-black text-lg">₹{formatIndianNumber(poTotalCost)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                    <button 
                        onClick={() => setShowPOModal(false)}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleGeneratePO}
                        disabled={processingOrder}
                        className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                        {processingOrder ? 'Processing...' : <><ShoppingCart size={18} /> Confirm Order</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Send for Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col scale-100 animate-in zoom-in-95">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white rounded-t-3xl">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Send className="text-purple-600" size={20} /> Send for Demo
                    </h3>
                    <button onClick={() => setShowDemoModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                     <p className="text-xs text-slate-500">Items sent for demo will be deducted from "In Office" stock but tracked in history.</p>
                     
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Product</label>
                        <select 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none appearance-none"
                            value={demoData.productId}
                            onChange={(e) => setDemoData({...demoData, productId: e.target.value})}
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                            ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Quantity</label>
                            <input 
                                type="number"
                                min="1"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                value={demoData.quantity}
                                onChange={(e) => setDemoData({...demoData, quantity: parseInt(e.target.value)})}
                            />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                             <input 
                                type="date"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                value={demoData.date}
                                onChange={(e) => setDemoData({...demoData, date: e.target.value})}
                            />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Client / Prospect</label>
                        <div className="relative">
                            <input 
                                type="text"
                                list="demo-clients"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                placeholder="Client Name"
                                value={demoData.clientName}
                                onChange={(e) => setDemoData({...demoData, clientName: e.target.value})}
                            />
                            <Briefcase size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <datalist id="demo-clients">
                                {clients.map(c => <option key={c.id} value={c.name}>{c.hospital}</option>)}
                            </datalist>
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location / Notes</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                placeholder="e.g. Apollo Hospital, Indiranagar"
                                value={demoData.location}
                                onChange={(e) => setDemoData({...demoData, location: e.target.value})}
                            />
                            <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                     </div>
                </div>
                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                    <button 
                        onClick={() => setShowDemoModal(false)}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors text-sm">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSendForDemo}
                        className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all active:scale-95 text-sm">
                        Confirm Transfer
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                     <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Plus className="text-medical-600" size={24} /> Add New Product
                    </h3>
                    <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Product Name *</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                            placeholder="e.g. ECG Machine Lead"
                            value={newProduct.name || ''}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                            <select 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none appearance-none"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value as any})}
                            >
                                <option value="Equipment">Equipment</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Spare Part">Spare Part</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">SKU / Barcode *</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                    placeholder="e.g. EQ-001"
                                    value={newProduct.sku || ''}
                                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                                />
                                <button 
                                    onClick={triggerScanForAddProduct}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    title="Scan Barcode">
                                    <ScanBarcode size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Additional Details for Centralized Usage */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Model</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                placeholder="Model Name"
                                value={newProduct.model || ''}
                                onChange={(e) => setNewProduct({...newProduct, model: e.target.value})}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">GST Rate (%)</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                value={newProduct.taxRate || 0}
                                onChange={(e) => setNewProduct({...newProduct, taxRate: parseInt(e.target.value)})}
                             />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Price (₹) *</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                value={newProduct.price || 0}
                                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                placeholder="e.g. Shelf A"
                                value={newProduct.location || ''}
                                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                             />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Stock</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                value={newProduct.stock || 0}
                                onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Min. Level</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                value={newProduct.minLevel || 0}
                                onChange={(e) => setNewProduct({...newProduct, minLevel: parseInt(e.target.value)})}
                             />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                    <button 
                        onClick={() => setShowAddProductModal(false)}
                        className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveProduct}
                        className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                        <Save size={18} /> Save Product
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};