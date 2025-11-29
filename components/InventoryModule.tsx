import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Package, AlertTriangle, Search, Filter, BellRing, X, ShoppingCart, CheckCircle, FileText, ArrowRight, Plus, Save } from 'lucide-react';

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

  // Add Product State
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
    // Simulate API call
    setTimeout(() => {
        setProcessingOrder(false);
        setShowPOModal(false);
        
        // Restock items for demo purposes
        const updatedProducts = products.map(p => {
            if (p.stock < p.minLevel) {
                return { ...p, stock: p.minLevel + 10 }; // Restock to safe level
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
        id: `P-${Date.now()}`, // Generate temp ID
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
    setNewProduct({
        category: 'Equipment',
        stock: 0,
        minLevel: 5,
        location: 'Warehouse A',
        name: '',
        sku: '',
        price: 0
    });
  };

  // Calculate total estimated cost for PO
  const poTotalCost = lowStockItems.reduce((acc, item) => {
      const quantityNeeded = item.minLevel + 10 - item.stock;
      return acc + (quantityNeeded * item.price);
  }, 0);

  return (
    <div className="h-full flex flex-col gap-6 relative overflow-y-auto lg:overflow-hidden p-1">
      {/* Low Stock Alert Banner */}
      {showNotification && lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 shrink-0">
            <div className="flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                    <BellRing size={20} />
                </div>
                <div>
                    <h4 className="font-semibold text-red-900">Low Stock Alert</h4>
                    <p className="text-sm text-red-700 mt-1">
                        {lowStockItems.length} items are below minimum levels. 
                        <span className="hidden sm:inline"> Immediate restocking required.</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
                 <button 
                    onClick={() => setShowPOModal(true)}
                    className="flex-1 sm:flex-none whitespace-nowrap bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm flex items-center justify-center gap-2">
                    <ShoppingCart size={16} /> Order Stock
                </button>
                <button 
                    onClick={() => setShowNotification(false)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-100">
                    <X size={18} />
                </button>
            </div>
        </div>
      )}

      {/* Main Inventory Section */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
                <Package size={20} className="text-medical-600" /> Inventory List
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search SKU or Name..." 
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 w-full sm:w-64"
                    />
                </div>
                <button className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm">
                    <Filter size={16} /> Filter
                </button>
                 <button 
                    onClick={() => setShowAddProductModal(true)}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm shadow-medical-500/30">
                    <Plus size={16} /> Add Product
                </button>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 border-b border-slate-100">Product Name</th>
                        <th className="px-6 py-3 border-b border-slate-100">SKU</th>
                        <th className="px-6 py-3 border-b border-slate-100">Category</th>
                        <th className="px-6 py-3 border-b border-slate-100 text-right">Stock</th>
                        <th className="px-6 py-3 border-b border-slate-100 text-right">Price</th>
                        <th className="px-6 py-3 border-b border-slate-100">Location</th>
                        <th className="px-6 py-3 border-b border-slate-100">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                        const isLowStock = product.stock < product.minLevel;
                        return (
                            <tr key={product.id} className={`hover:bg-slate-50 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                                <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                        {product.category}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-medium ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                                    {product.stock} <span className="text-xs font-normal text-slate-400">/ {product.minLevel}</span>
                                </td>
                                <td className="px-6 py-4 text-right">${product.price.toLocaleString()}</td>
                                <td className="px-6 py-4 text-xs text-slate-500">{product.location}</td>
                                <td className="px-6 py-4">
                                    {isLowStock ? (
                                        <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                                            <AlertTriangle size={14} /> Low Stock
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-medical-600" /> Generate Purchase Order
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Review items to be ordered based on stock shortage.</p>
                    </div>
                    <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Item</th>
                                <th className="px-4 py-2 text-right">Current</th>
                                <th className="px-4 py-2 text-right">Required</th>
                                <th className="px-4 py-2 text-right">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStockItems.map(item => {
                                const qty = item.minLevel + 10 - item.stock;
                                return (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                        <td className="px-4 py-3 text-right text-red-600">{item.stock}</td>
                                        <td className="px-4 py-3 text-right font-medium">{qty}</td>
                                        <td className="px-4 py-3 text-right">${(qty * item.price).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right">Total Estimated Cost:</td>
                                <td className="px-4 py-3 text-right text-medical-700">${poTotalCost.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button 
                        onClick={() => setShowPOModal(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleGeneratePO}
                        disabled={processingOrder}
                        className="px-6 py-2 bg-medical-600 text-white font-medium rounded-lg hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all">
                        {processingOrder ? 'Processing...' : <><ShoppingCart size={18} /> Confirm Order</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Plus className="text-medical-600" /> Add New Product
                    </h3>
                    <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                            placeholder="e.g. ECG Machine Lead"
                            value={newProduct.name || ''}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value as any})}
                            >
                                <option value="Equipment">Equipment</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Spare Part">Spare Part</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                placeholder="e.g. EQ-001"
                                value={newProduct.sku || ''}
                                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Price ($) *</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                value={newProduct.price || 0}
                                onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                             <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                placeholder="e.g. Shelf A"
                                value={newProduct.location || ''}
                                onChange={(e) => setNewProduct({...newProduct, location: e.target.value})}
                             />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                value={newProduct.stock || 0}
                                onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                             />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Min. Level</label>
                             <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 focus:outline-none"
                                value={newProduct.minLevel || 0}
                                onChange={(e) => setNewProduct({...newProduct, minLevel: parseInt(e.target.value)})}
                             />
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                    <button 
                        onClick={() => setShowAddProductModal(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveProduct}
                        className="px-6 py-2 bg-medical-600 text-white font-medium rounded-lg hover:bg-medical-700 shadow-sm flex items-center gap-2 transition-all">
                        <Save size={18} /> Save Product
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};