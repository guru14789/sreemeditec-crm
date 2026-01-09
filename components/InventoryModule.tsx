
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, StockMovement } from '../types';
import { Package, AlertTriangle, Search, BellRing, X, ShoppingCart, CheckCircle, Plus, Save, Wallet, History, ArrowUpRight, ArrowDownLeft, Send, MapPin, ScanBarcode, Trash2, Building2, RefreshCw, Edit2 } from 'lucide-react';
import { useData } from './DataContext';

// Helper for Indian Number Formatting (K, L, Cr)
const formatIndianNumber = (num: number) => {
  const n = num || 0;
  if (n >= 10000000) {
    return (n / 10000000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  }
  if (n >= 100000) {
    return (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(2).replace(/\.00$/, '') + 'K';
  }
  return n.toLocaleString('en-IN');
};

export const InventoryModule: React.FC = () => {
  const { products, addProduct, updateProduct, removeProduct, stockMovements, recordStockMovement, bulkReplenishStock, clients, addClient, addNotification } = useData();
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [showNotification, setShowNotification] = useState(true);
  const [showPOModal, setShowPOModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{id: string, name: string} | null>(null);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: 'Equipment',
    stock: 0,
    unit: 'nos',
    minLevel: 5,
    location: 'Warehouse A',
    purchasePrice: 0,
    sellingPrice: 0
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  const [scanStatus, setScanStatus] = useState<'found' | 'not-found' | 'idle'>('idle');
  const [scanOperation, setScanOperation] = useState<'In' | 'Out'>('In'); // Toggle for Add/Remove
  const [quickStockAmount, setQuickStockAmount] = useState<number>(1);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const low = products.filter(p => (p.stock || 0) < (p.minLevel || 0));
    setLowStockItems(low);
    if (low.length > 0) {
        setShowNotification(true);
    }
  }, [products]);

  // Filtered Products for Search
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.supplier && p.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  // Auto-focus input when scan modal opens and is in idle state
  useEffect(() => {
      if (showScanModal && scanStatus === 'idle' && scanInputRef.current) {
          setTimeout(() => {
              scanInputRef.current?.focus();
          }, 100);
      }
  }, [showScanModal, scanStatus]);

  const handleGeneratePO = async () => {
    setProcessingOrder(true);
    try {
        const idsToReplenish = products
            .filter(p => (p.stock || 0) < (p.minLevel || 0))
            .map(p => p.id);
        
        if (idsToReplenish.length > 0) {
            // Optimized bulk operation
            await bulkReplenishStock(idsToReplenish, 10);
        }
        
        setProcessingOrder(false);
        setShowPOModal(false);
        setShowNotification(false);
        addNotification('Inventory Updated', `Successfully replenished ${idsToReplenish.length} low-stock items via batch sync.`, 'success');
    } catch (err) {
        setProcessingOrder(false);
        addNotification('Restock Failed', 'Batch operation encountered an error.', 'alert');
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.sku || newProduct.purchasePrice === undefined || newProduct.sellingPrice === undefined) {
        alert("Please fill Name, SKU, Purchase Price and Selling Price.");
        return;
    }
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const productToAdd: Product = {
        id: `P-${Date.now()}-${shortId}`, 
        name: newProduct.name!,
        category: newProduct.category as 'Equipment' | 'Consumable' | 'Spare Part' || 'Equipment',
        sku: newProduct.sku!,
        stock: Number(newProduct.stock) || 0,
        unit: newProduct.unit || 'nos',
        purchasePrice: Number(newProduct.purchasePrice) || 0,
        sellingPrice: Number(newProduct.sellingPrice) || 0,
        minLevel: Number(newProduct.minLevel) || 5,
        location: newProduct.location || 'Unassigned',
        hsn: newProduct.hsn || '',
        taxRate: newProduct.taxRate || 18,
        model: newProduct.model || '',
        description: newProduct.description || '',
        supplier: newProduct.supplier || '',
        lastRestocked: (newProduct.stock || 0) > 0 ? new Date().toISOString().split('T')[0] : ''
    };
    await addProduct(productToAdd);
    
    if ((newProduct.stock || 0) > 0) {
        await recordStockMovement({
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
    addNotification('Product Indexed', `"${productToAdd.name}" successfully added to registry.`, 'success');
    setNewProduct({ category: 'Equipment', stock: 0, unit: 'nos', minLevel: 5, location: 'Warehouse A', name: '', sku: '', purchasePrice: 0, sellingPrice: 0, hsn: '', taxRate: 18, model: '', description: '', supplier: '' });
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setShowEditProductModal(true);
  };

  const handleUpdateSubmit = async () => {
    if (!editingProduct) return;
    if (!editingProduct.name || !editingProduct.sku) {
        alert("Name and SKU are required.");
        return;
    }

    const originalProduct = products.find(p => p.id === editingProduct.id);
    const stockDiff = (editingProduct.stock || 0) - (originalProduct?.stock || 0);

    await updateProduct(editingProduct.id, {
        ...editingProduct,
        stock: Number(editingProduct.stock || 0),
        purchasePrice: Number(editingProduct.purchasePrice || 0),
        sellingPrice: Number(editingProduct.sellingPrice || 0),
        minLevel: Number(editingProduct.minLevel || 0)
    });

    if (stockDiff !== 0) {
        await recordStockMovement({
            id: `MOV-MANUAL-${Date.now()}`,
            productId: editingProduct.id,
            productName: editingProduct.name,
            type: stockDiff > 0 ? 'In' : 'Out',
            quantity: Math.abs(stockDiff),
            date: new Date().toISOString().split('T')[0],
            reference: 'Manual Adjustment',
            purpose: stockDiff > 0 ? 'Restock' : 'Sale'
        });
    }

    setShowEditProductModal(false);
    setEditingProduct(null);
    addNotification('Record Updated', `"${editingProduct.name}" modified successfully.`, 'success');
  };

  const performDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
        await removeProduct(pendingDelete.id);
        addNotification('Registry Updated', `"${pendingDelete.name}" has been removed from cloud.`, 'warning');
        setPendingDelete(null);
    } catch (err) {
        console.error("Delete product error:", err);
        addNotification('Database Error', 'Could not remove item.', 'alert');
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSendForDemo = () => {
      if (!demoData.productId || demoData.quantity <= 0 || !demoData.clientName) {
          alert("Please fill all details.");
          return;
      }
      
      const product = products.find(p => p.id === demoData.productId);
      if(!product) return;

      if((product.stock || 0) < demoData.quantity) {
          alert("Insufficient stock for this operation.");
          return;
      }

      const existingClient = clients.find(c => c.name === demoData.clientName);
      if (!existingClient) {
          addClient({
              id: `CLI-${Date.now()}`,
              name: demoData.clientName,
              hospital: demoData.location || '',
              address: demoData.location || '',
              gstin: ''
          });
      }

      updateProduct(product.id, { stock: (product.stock || 0) - demoData.quantity });

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
      addNotification('Demo Dispatch', `"${product.name}" units sent to ${demoData.clientName}.`, 'info');
      setDemoData({ productId: '', quantity: 1, clientName: '', date: new Date().toISOString().split('T')[0], location: '' });
      setActiveTab('history');
  };

  const handleScanSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!scanQuery.trim()) return;

      const foundProduct = products.find(p => p.sku.toLowerCase() === scanQuery.toLowerCase());
      
      if (foundProduct) {
          setScannedProduct(foundProduct);
          setScanStatus('found');
          setScanOperation('In');
          setQuickStockAmount(1);
      } else {
          // IF SKU NOT FOUND: Automatically transition to Registration Form with SKU pre-filled
          setShowScanModal(false);
          setNewProduct({
              category: 'Equipment',
              stock: 0,
              unit: 'nos',
              minLevel: 5,
              location: 'Warehouse A',
              sku: scanQuery, // Pre-fill the SKU field
              name: '',
              purchasePrice: 0,
              sellingPrice: 0
          });
          setShowAddProductModal(true);
          addNotification('SKU Not Found', `Initializing registry for SKU: ${scanQuery}`, 'info');
          setScanQuery('');
          setScanStatus('idle');
      }
  };

  const handleStockUpdate = () => {
      if (!scannedProduct || quickStockAmount <= 0) return;

      let newStock = scannedProduct.stock || 0;
      let lastRestocked = scannedProduct.lastRestocked;
      
      if (scanOperation === 'In') {
          newStock += quickStockAmount;
          lastRestocked = new Date().toISOString().split('T')[0];
      } else {
          if ((scannedProduct.stock || 0) < quickStockAmount) {
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
      addNotification('Stock Updated', `${quickStockAmount} units of ${scannedProduct.name} ${scanOperation === 'In' ? 'received' : 'dispatched'}.`, 'success');
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

  // --- REVISED CALCULATION LOGIC ---
  // Equipment (Cost) - sum of Purchase Price * available stock for all products
  const equipmentCostAll = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.purchasePrice || 0)), 0);
  
  // Asset Valuation (Cost) - sum of Selling Price * available stock for all products
  const assetValuationAll = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.sellingPrice || 0)), 0);

  // Consumables (Cost) - remains specific to category for more detail
  const consumableValue = products.filter(p => p.category === 'Consumable').reduce((acc, p) => acc + ((p.stock || 0) * (p.purchasePrice || 0)), 0);

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
                      <Wallet size={14} /> Asset Valuation (Selling Value)
                  </p>
                  <h3 className="text-3xl font-black tracking-tight mt-1">₹{formatIndianNumber(assetValuationAll)}</h3>
                  <p className="text-xs text-emerald-100/60 mt-2 font-medium">Total market value of all stock</p>
              </div>
          </div>
          
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Equipment (Purchase Cost)</p>
                  <h3 className="text-xl font-black text-slate-800">₹{formatIndianNumber(equipmentCostAll)}</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tighter">Total inventory investment</p>
              </div>
               <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                  <Building2 size={24} />
              </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all h-full">
              <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Consumables (Cost)</p>
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
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPOModal(true); }}
                    className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    <ShoppingCart size={16} /> Bulk Restock
                </button>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowNotification(false); }}
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
                        type="button"
                        onClick={() => setActiveTab('stock')}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'stock' ? 'bg-white shadow-md text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Package size={14} /> Stock Registry
                    </button>
                     <button 
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow-md text-medical-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <History size={14} /> Movement Logs
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                {activeTab === 'stock' && (
                    <>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="text-slate-400 group-focus-within:text-medical-600 transition-colors" size={16} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search inventory..." 
                                className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 sm:w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowScanModal(true); handleResetScan(); }}
                            className="bg-slate-800 text-white hover:bg-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-500/20 active:scale-95">
                            <ScanBarcode size={16} /> Scan
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowDemoModal(true); }}
                            className="bg-white border border-slate-200 text-slate-600 hover:border-medical-300 hover:text-medical-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                            <Send size={16} /> Demo
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowAddProductModal(true); }}
                            className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                            <Plus size={16} /> Register Item
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
            {activeTab === 'stock' ? (
                <table className="w-full text-left text-sm text-slate-600 min-w-[1200px] table-fixed">
                    <thead className="bg-[#fcfdfd] text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-100 shadow-[0_1px_0_0_#f1f5f9]">
                        <tr>
                            <th className="px-6 py-5 w-[20%] bg-[#fcfdfd]">Product Master</th>
                            <th className="px-6 py-5 w-[12%] bg-[#fcfdfd]">Category & SKU</th>
                            <th className="px-6 py-5 w-[12%] bg-[#fcfdfd]">Supplier</th>
                            <th className="px-6 py-5 text-right w-[10%] bg-[#fcfdfd]">Available Stock</th>
                            <th className="px-6 py-5 text-right w-[10%] bg-[#fcfdfd]">Purchase Price</th>
                            <th className="px-6 py-5 text-right w-[10%] bg-[#fcfdfd]">Selling Price</th>
                            <th className="px-6 py-5 w-[10%] bg-[#fcfdfd]">Warehouse</th>
                            <th className="px-6 py-5 w-[10%] bg-[#fcfdfd]">Status</th>
                            <th className="px-6 py-5 text-right w-[100px] bg-[#fcfdfd]">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 relative z-10">
                        {filteredProducts.map((product) => {
                            const stock = product.stock || 0;
                            const minLevel = product.minLevel || 0;
                            const isLowStock = stock < minLevel;
                            const purchasePrice = product.purchasePrice || 0;
                            const sellingPrice = product.sellingPrice || 0;

                            return (
                                <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-red-50/20' : ''}`}>
                                    <td className="px-6 py-5">
                                        <div className="font-black text-slate-800 truncate" title={product.name}>{product.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 truncate">{product.model || 'Standard Model'}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-xs font-black text-indigo-600 uppercase truncate">{product.category}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{product.sku}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold truncate">
                                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0"><Building2 size={12}/></div>
                                            <span className="truncate">{product.supplier || 'Not set'}</span>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-5 text-right font-black ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                        <span className="text-lg">{stock}</span>
                                        <span className="text-[10px] text-slate-400 ml-1 uppercase">{product.unit || 'nos'}</span>
                                        <div className="text-[9px] text-slate-300 font-bold">Min: {minLevel}</div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-slate-400 italic">₹{purchasePrice.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-5 text-right font-black text-teal-700">₹{sellingPrice.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 truncate">
                                            <MapPin size={12} className="shrink-0" /> <span className="truncate">{product.location}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {isLowStock ? (
                                            <div className="flex items-center gap-1.5 text-red-600 text-[10px] font-black uppercase bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse w-fit">
                                                <AlertTriangle size={12} className="shrink-0" /> <span>Low Stock</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 w-fit">
                                                <CheckCircle size={12} className="shrink-0" /> <span>Optimal</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button 
                                                onClick={() => handleOpenEdit(product)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Edit Product"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setPendingDelete({id: product.id, name: product.name}); }}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group/btn"
                                                title="Remove from Inventory"
                                            >
                                                <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                    <thead className="bg-[#fcfdfd] text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-100 shadow-[0_1px_0_0_#f1f5f9]">
                        <tr>
                            <th className="px-6 py-5 bg-[#fcfdfd]">Transaction Date</th>
                            <th className="px-6 py-5 bg-[#fcfdfd]">Nature of Movement</th>
                            <th className="px-6 py-5 bg-[#fcfdfd]">Product Master</th>
                            <th className="px-6 py-5 text-right bg-[#fcfdfd]">Quantity</th>
                            <th className="px-6 py-5 bg-[#fcfdfd]">Reference / Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 relative z-10">
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

      {/* Confirmation Modal */}
      {pendingDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
                      <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Purge Item?</h3>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                      Permanently remove <b>{pendingDelete.name}</b> from master inventory? This will impact all stock reports.
                  </p>
                  <div className="flex gap-3 mt-8">
                      <button onClick={() => setPendingDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                      <button onClick={performDelete} disabled={isDeleting} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2">
                          {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : "Delete Item"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Product Modal */}
      {showEditProductModal && editingProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Edit Registry Item</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Inventory Adjustment</p>
                    </div>
                    <button onClick={() => setShowEditProductModal(false)}><X size={28} className="text-slate-400 hover:text-slate-600 transition-colors"/></button>
                </div>
                <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name *</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Model *</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none" value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Type (nos/pkt)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none uppercase" value={editingProduct.unit || ''} onChange={e => setEditingProduct({...editingProduct, unit: e.target.value.toLowerCase()})} placeholder="nos" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purchase Cost (₹)</label>
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none text-rose-600" value={editingProduct.purchasePrice || 0} onChange={e => setEditingProduct({...editingProduct, purchasePrice: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selling Rate (₹)</label>
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none text-emerald-600" value={editingProduct.sellingPrice || 0} onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Stock</label>
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none text-indigo-600" value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Alert Level</label>
                            <input type="number" className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none" value={editingProduct.minLevel || 0} onChange={e => setEditingProduct({...editingProduct, minLevel: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Manufacturer</label>
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none" value={editingProduct.supplier || ''} onChange={e => setEditingProduct({...editingProduct, supplier: e.target.value})} />
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                    <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400">Discard</button>
                    <button onClick={handleUpdateSubmit} className="flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-medical-500/20 active:scale-95 transition-all">Commit Registry Changes</button>
                </div>
            </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Register New Item</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Registry Entry</p>
                    </div>
                    <button onClick={() => setShowAddProductModal(false)}><X size={28} className="text-slate-400"/></button>
                </div>
                <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-medical-500" placeholder="Product Name *" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-5">
                        <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold outline-none" placeholder="SKU / Unique ID *" value={newProduct.sku || ''} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                        <select className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-black outline-none appearance-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}>
                            <option>Equipment</option><option>Consumable</option><option>Spare Part</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Purchase Cost (₹)</label>
                            <input type="number" className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-3 text-sm font-black outline-none" placeholder="0.00" value={newProduct.purchasePrice || ''} onChange={e => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Selling Rate (₹)</label>
                            <input type="number" className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-3 text-sm font-black outline-none" placeholder="0.00" value={newProduct.sellingPrice || ''} onChange={e => setNewProduct({...newProduct, sellingPrice: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <input type="number" className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-3 text-sm font-black outline-none" placeholder="Initial Stock" value={newProduct.stock || ''} onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})} />
                        <input type="text" className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-3 text-sm font-black outline-none uppercase" placeholder="Unit (nos, pkt, mtr)" value={newProduct.unit || ''} onChange={e => setNewProduct({...newProduct, unit: e.target.value.toLowerCase()})} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <input type="number" className="w-full border border-slate-200 bg-white rounded-2xl px-5 py-3 text-sm font-black outline-none" placeholder="Min Alert Level" value={newProduct.minLevel || ''} onChange={e => setNewProduct({...newProduct, minLevel: Number(e.target.value)})} />
                        <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold outline-none" placeholder="Warehouse Location" value={newProduct.location || ''} onChange={e => setNewProduct({...newProduct, location: e.target.value})} />
                    </div>
                    <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold outline-none" placeholder="Default Supplier / Manufacturer" value={newProduct.supplier || ''} onChange={e => setNewProduct({...newProduct, supplier: e.target.value})} />
                </div>
                <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                    <button onClick={() => setShowAddProductModal(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
                    <button onClick={handleSaveProduct} className="flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Initialize Item</button>
                </div>
            </div>
        </div>
      )}

      {/* Scan Barcode Modal */}
      {showScanModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Barcode Scanner</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual SKU Entry / Scan Simulation</p>
                      </div>
                      <button onClick={() => setShowScanModal(false)}><X size={28} className="text-slate-400"/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      {scanStatus === 'idle' && (
                          <form onSubmit={handleScanSubmit} className="space-y-4">
                              <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                  <ScanBarcode size={64} className="mb-4 opacity-40 animate-pulse" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Awaiting SKU Signal...</p>
                              </div>
                              <input 
                                  ref={scanInputRef}
                                  type="text" 
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-center text-lg font-black tracking-widest outline-none focus:border-medical-500" 
                                  placeholder="ENTER SKU MANUALLY"
                                  value={scanQuery}
                                  onChange={e => setScanQuery(e.target.value)}
                                  autoFocus
                              />
                              <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">Verify SKU</button>
                          </form>
                      )}

                      {scanStatus === 'found' && scannedProduct && (
                          <div className="space-y-6 animate-in slide-in-from-bottom-2">
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800 flex items-center gap-4">
                                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg"><Package size={24} /></div>
                                  <div className="min-w-0">
                                      <h4 className="font-black text-emerald-900 dark:text-emerald-100 truncate text-sm uppercase">{scannedProduct.name}</h4>
                                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Stock: {scannedProduct.stock || 0} {scannedProduct.unit}</p>
                                  </div>
                              </div>

                              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                                  <button onClick={() => setScanOperation('In')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scanOperation === 'In' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>Stock In</button>
                                  <button onClick={() => setScanOperation('Out')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scanOperation === 'Out' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400'}`}>Stock Out</button>
                              </div>

                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                                  <div className="flex items-center gap-3">
                                      <button onClick={() => setQuickStockAmount(Math.max(1, quickStockAmount - 1))} className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black">-</button>
                                      <input type="number" className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-center font-black text-xl" value={quickStockAmount} onChange={e => setQuickStockAmount(Number(e.target.value))} />
                                      <button onClick={() => setQuickStockAmount(quickStockAmount + 1)} className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black">+</button>
                                  </div>
                              </div>

                              <div className="flex gap-3">
                                  <button onClick={handleResetScan} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Reset</button>
                                  <button onClick={handleStockUpdate} className={`flex-[2] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-lg ${scanOperation === 'In' ? 'bg-emerald-600' : 'bg-orange-600'}`}>Process {scanOperation}</button>
                              </div>
                          </div>
                      )}

                      {scanStatus === 'not-found' && (
                          <div className="text-center py-10 space-y-6 animate-in zoom-in-95">
                              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm"><AlertTriangle size={40} /></div>
                              <div>
                                  <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-lg">Unrecognized SKU</h4>
                                  <p className="text-xs text-slate-400 font-bold mt-2 px-6">The scanned identifier "{scanQuery}" does not match any items in the master registry.</p>
                              </div>
                              <button onClick={handleResetScan} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Retry Scan</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Send for Demo Modal */}
      {showDemoModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Demo Dispatch</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Temporary Equipment Assignment</p>
                      </div>
                      <button onClick={() => setShowDemoModal(false)}><X size={28} className="text-slate-400"/></button>
                  </div>
                  <div className="p-8 space-y-5">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Equipment *</label>
                          <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none appearance-none" value={demoData.productId} onChange={e => setDemoData({...demoData, productId: e.target.value})}>
                              <option value="">Choose item from stock...</option>
                              {products.filter(p => (p.stock || 0) > 0).map(p => (
                                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock || 0} {p.unit})</option>
                              ))}
                          </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Units</label>
                              <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-black outline-none" value={demoData.quantity} onChange={e => setDemoData({...demoData, quantity: Number(e.target.value)})} min={1} />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Date</label>
                              <input type="date" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none" value={demoData.date} onChange={e => setDemoData({...demoData, date: e.target.value})} />
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Client / Hospital *</label>
                          <input type="text" list="demo-clients" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-black outline-none" placeholder="Search customer index..." value={demoData.clientName} onChange={e => setDemoData({...demoData, clientName: e.target.value})} />
                          <datalist id="demo-clients">{clients.map(c => <option key={c.id} value={c.name}>{c.hospital}</option>)}</datalist>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Location</label>
                          <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-bold outline-none" placeholder="Installation Point" value={demoData.location} onChange={e => setDemoData({...demoData, location: e.target.value})} />
                      </div>
                  </div>
                  <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                      <button onClick={() => setShowDemoModal(false)} className="flex-1 py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400">Cancel</button>
                      <button onClick={handleSendForDemo} className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all">Authorize Dispatch</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
