
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Package, AlertTriangle, Search, Filter, BellRing, X, ShoppingCart, CheckCircle, FileText, ArrowRight, Plus, Save, Wallet } from 'lucide-react';

const MOCK_INVENTORY: Product[] = [
  { id: 'P-1', name: 'MRI Coil (Head)', category: 'Spare Part', sku: 'MRI-H-001', stock: 2, price: 15000, minLevel: 3, location: 'Shelf A1' },
  { id: 'P-2', name: 'Ultrasound Gel (5L)', category: 'Consumable', sku: 'USG-GEL-5L', stock: 150, price: 25, minLevel: 50, location: 'Warehouse B' },
  { id: 'P-3', name: 'Patient Monitor X12', category: 'Equipment', sku: 'PM-X12', stock: 8, price: 1200, minLevel: 5, location: 'Showroom' },
  { id: 'P-4', name: 'X-Ray Tube Housing', category: 'Spare Part', sku: 'XR-TB-99', stock: 1, price: 4500, minLevel: 2, location: 'Shelf C4' },
];

export const InventoryModule: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(MOCK_INVENTORY);
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

  useEffect(() => {
    const low = products.filter(p => p.stock < p.minLevel);
    setLowStockItems(low);
    if (low.length > 0) {
        setShowNotification(true);
    }
  }, [products]);

  const handleGeneratePO = () => {
    setProcessingOrder(true);
    setTimeout(() => {
        setProcessingOrder(false);
        setShowPOModal(false);
        const updatedProducts = products.map(p => {
            if (p.stock < p.minLevel) {
                return { ...p, stock: p.minLevel + 10 }; 
            }
            return p;
        });
        setProducts(updatedProducts);
        setShowNotification(false);
        alert("Purchase Orders generated and sent to vendors!");
    }, 1500);
  };

  const handleSaveProduct = () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.price) {
        alert("Please fill in Name, SKU and Price.");
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
        location: newProduct.location || 'Unassigned'
    };
    setProducts([productToAdd, ...products]);
    setShowAddProductModal(false);
    setNewProduct({ category: 'Equipment', stock: 0, minLevel: 5, location: 'Warehouse A', name: '', sku: '', price: 0 });
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
                  <h3 className="text-3xl font-black tracking-tight mt-1">${totalInventoryValue.toLocaleString()}</h3>
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
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-medical-50 text-medical-600 rounded-lg"><Package size={20} /></div> Inventory List
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search SKU or Name..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 w-full sm:w-64 transition-all"
                    />
                </div>
                <button className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm font-bold transition-colors">
                    <Filter size={16} /> Filter
                </button>
                 <button 
                    onClick={() => setShowAddProductModal(true)}
                    className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-medical-500/30 transition-transform active:scale-95">
                    <Plus size={18} /> Add Product
                </button>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-4 border-b border-slate-100">Product Name</th>
                        <th className="px-6 py-4 border-b border-slate-100">SKU</th>
                        <th className="px-6 py-4 border-b border-slate-100">Category</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-right">Stock</th>
                        <th className="px-6 py-4 border-b border-slate-100 text-right">Price</th>
                        <th className="px-6 py-4 border-b border-slate-100">Location</th>
                        <th className="px-6 py-4 border-b border-slate-100">Status</th>
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
                                <td className="px-6 py-4 text-right font-medium text-slate-800">${product.price.toLocaleString()}</td>
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
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

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
                                        <td className="px-4 py-3 text-right font-medium text-slate-600">${(qty * item.price).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t border-slate-200 bg-slate-50/50">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-600">Total Estimated Cost:</td>
                                <td className="px-4 py-3 text-right text-medical-700 font-black text-lg">${poTotalCost.toLocaleString()}</td>
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">SKU *</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                placeholder="e.g. EQ-001"
                                value={newProduct.sku || ''}
                                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Price ($) *</label>
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
