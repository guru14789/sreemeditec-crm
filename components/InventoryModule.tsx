
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, StockMovement } from '../types';
import { Package, AlertTriangle, Search, BellRing, X, ShoppingCart, CheckCircle, Plus, Save, Wallet, History, ArrowUpRight, ArrowDownLeft, Send, MapPin, ScanBarcode, Trash2, Building2, RefreshCw } from 'lucide-react';
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
  const { products, addProduct, updateProduct, removeProduct, stockMovements, recordStockMovement, clients, addClient, addNotification } = useData();
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [showNotification, setShowNotification] = useState(true);
  const [showPOModal, setShowPOModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{id: string, name: string} | null>(null);

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

  const handleGeneratePO = () => {
    setProcessingOrder(true);
    setTimeout(() => {
        setProcessingOrder(false);
        setShowPOModal(false);
        
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
        addNotification('Inventory Updated', `Successfully replenished ${lowStockItems.length} low-stock items.`, 'success');
    }, 1500);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.price) {
        alert("Please fill Name, SKU and Price.");
        return;
    }
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const productToAdd: Product = {
        id: `P-${Date.now()}-${shortId}`, 
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
    setNewProduct({ category: 'Equipment', stock: 0, minLevel: 5, location: 'Warehouse A', name: '', sku: '', price: 0, hsn: '', taxRate: 18, model: '', description: '', supplier: '' });
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

      if(product.stock < demoData.quantity) {
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

      updateProduct(product.id, { stock: product.stock - demoData.quantity });

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

  const totalInventoryValue = products.reduce((acc, product) => acc + (product.stock * product.price), 0);
  const equipmentValue = products.filter(p => p.category === 'Equipment').reduce((acc, p) => acc + (p.stock * p.price), 0);
  const consumableValue = products.filter(p => p.category === 'Consumable').reduce((acc, p) => acc + (p.stock * p.price), 0);

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
                    type="button"
                    onClick={() => setShowPOModal(true)}
                    className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                    <ShoppingCart size={16} /> Bulk Restock
                </button>
                <button 
                    type="button"
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
                            onClick={() => { setShowScanModal(true); handleResetScan(); }}
                            className="bg-slate-800 text-white hover:bg-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-500/20 active:scale-95">
                            <ScanBarcode size={16} /> Scan
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowDemoModal(true)}
                            className="bg-white border border-slate-200 text-slate-600 hover:border-medical-300 hover:text-medical-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                            <Send size={16} /> Demo
                        </button>
                        <button 
                            type="button"
                            onClick={() => setShowAddProductModal(true)}
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
                <table className="w-full text-left text-sm text-slate-600 min-w-[1100px] table-fixed">
                    <thead className="bg-[#fcfdfd] text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-20 border-b border-slate-100 shadow-[0_1px_0_0_#f1f5f9]">
                        <tr>
                            <th className="px-6 py-5 w-[22%] bg-[#fcfdfd]">Product Master</th>
                            <th className="px-6 py-5 w-[15%] bg-[#fcfdfd]">Category & SKU</th>
                            <th className="px-6 py-5 w-[15%] bg-[#fcfdfd]">Supplier</th>
                            <th className="px-6 py-5 text-right w-[12%] bg-[#fcfdfd]">Available Stock</th>
                            <th className="px-6 py-5 text-right w-[12%] bg-[#fcfdfd]">Unit Price</th>
                            <th className="px-6 py-5 w-[12%] bg-[#fcfdfd]">Warehouse</th>
                            <th className="px-6 py-5 w-[12%] bg-[#fcfdfd]">Status</th>
                            <th className="px-6 py-5 text-right w-[80px] bg-[#fcfdfd]">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 relative z-10">
                        {filteredProducts.map((product) => {
                            const isLowStock = product.stock < product.minLevel;
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
                                        <span className="text-lg">{product.stock}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">/ {product.minLevel}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-black text-teal-700">₹{product.price.toLocaleString()}</td>
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
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setPendingDelete({id: product.id, name: product.name}); }}
                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 group/btn"
                                            title="Remove from Inventory"
                                        >
                                            <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                                        </button>
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

    </div>
  );
};
